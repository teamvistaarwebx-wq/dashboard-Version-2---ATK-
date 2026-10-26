import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { Product } from "@/models/product.model";
import { Reservation } from "@/models/reservation.model";
import { StockMovement } from "@/models/stock-movement.model";
import { Warehouse } from "@/models/warehouse.model";
import { MOVEMENT_REASON, RESERVATION_STATUS } from "@/constants/enums";
import { STOCK_HOLD_MS } from "@/constants/inventory";

/**
 * The only code in the app allowed to change stock.
 *
 * Checkout, the payment webhook, the admin's adjust form and the product
 * drawer all come through here. Scattering `$inc` calls across features is how
 * a ledger drifts from its audit log, and once it has drifted there is no way
 * to tell which number was right.
 *
 * Three collections, three jobs:
 *
 *   Inventory      what is on the shelf now (onHand) and what is spoken for
 *                  (reserved). `available` is onHand - reserved and is NEVER
 *                  stored — see models/README.md.
 *   Reservation    a hold with an expiry. Taken at checkout, consumed on
 *                  payment, released on failure or timeout.
 *   StockMovement  an immutable log of every change to onHand.
 *
 * The invariant worth protecting: for any SKU, sum(movement.delta) === onHand.
 * That is what makes "where did those four sarees go" answerable.
 *
 * It follows that **movements record onHand changes only**. Taking a hold does
 * not move onHand, so reserving writes no movement — the Reservation row is
 * that record. This leaves MOVEMENT_REASON.RESERVATION and .RELEASE unused on
 * purpose; writing them would break the invariant above, because their deltas
 * would not correspond to any stock actually moving.
 */

/**
 * Stock lives against a warehouse, and there is exactly one today. Resolved
 * once per request rather than per line item.
 */
export const getDefaultWarehouseId = cache(async function getDefaultWarehouseId() {
  await connectDb();

  const warehouse =
    (await Warehouse.findOne({ isActive: true, isDefault: true })
      .select("_id")
      .lean()) ??
    (await Warehouse.findOne({ isActive: true }).select("_id").lean());

  if (!warehouse) throw new Error("No active warehouse — run npm run seed:catalog");

  return warehouse._id;
});

/**
 * Holds stock for a checkout.
 *
 * Returns `{ reservationIds, expiresAt }` on success, or `{ error }` naming
 * the product that has gone. Called BEFORE the order is written, so a box we
 * cannot fulfil never becomes an order at all.
 *
 * `orderId` is attached afterwards by the caller, because the order does not
 * exist yet at the moment the stock has to be secured.
 */
export async function reserveStock({ items, actor = null }) {
  await connectDb();

  const warehouse = await getDefaultWarehouseId();

  // Product flags decide whether a line needs a hold at all, so read them
  // once rather than per line.
  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  })
    .select("title sku trackInventory allowBackorder")
    .lean();

  const byId = new Map(products.map((doc) => [String(doc._id), doc]));

  /**
   * Sweep first. Correctness must not depend on the cron being alive — if a
   * hold from 20 minutes ago is still sitting on the last saree, this is the
   * moment it matters.
   */
  await releaseExpired({
    skus: items.map((item) => item.sku).filter(Boolean),
  });

  const held = [];

  for (const item of items) {
    const product = byId.get(String(item.productId));

    if (!product) {
      await rollback(held, warehouse);
      return { error: "A product in your box is no longer available." };
    }

    // Nothing is being counted for this product, so there is nothing to hold.
    if (product.trackInventory === false) continue;

    const sku = item.sku || product.sku;
    if (!sku) {
      await rollback(held, warehouse);
      return { error: `"${product.title}" is not set up for stock tracking.` };
    }

    const taken = await takeHold({
      productId: item.productId,
      sku,
      warehouse,
      quantity: item.quantity,
      allowBackorder: Boolean(product.allowBackorder),
    });

    if (!taken) {
      // Give back everything already held for this box. A compensating
      // rollback rather than a transaction: it needs no replica set, and its
      // worst case is a hold that expires on its own in fifteen minutes.
      await rollback(held, warehouse);
      return {
        error: `"${product.title}" has just sold out. Please remove it and try again.`,
      };
    }

    held.push({ productId: item.productId, sku, quantity: item.quantity });
  }

  if (held.length === 0) return { reservationIds: [], expiresAt: null };

  const expiresAt = new Date(Date.now() + STOCK_HOLD_MS);

  const created = await Reservation.insertMany(
    held.map((row) => ({
      ...row,
      warehouse,
      expiresAt,
      status: RESERVATION_STATUS.ACTIVE,
      sessionId: actor ? String(actor) : "",
    }))
  );

  return { reservationIds: created.map((row) => row._id), expiresAt };
}

/**
 * The oversell guard, and the reason any of this works.
 *
 * The availability check and the increment are ONE operation. MongoDB
 * guarantees single-document atomicity, so two people clicking Pay on the last
 * saree at the same instant cannot both pass — the loser matches nothing.
 */
async function takeHold({
  productId,
  sku,
  warehouse,
  quantity,
  allowBackorder,
}) {
  const filter = { productId, sku, warehouse };

  if (!allowBackorder) {
    filter.$expr = {
      $gte: [{ $subtract: ["$onHand", "$reserved"] }, quantity],
    };
  }

  const result = await Inventory.updateOne(filter, {
    $inc: { reserved: quantity },
  });

  if (result.matchedCount === 1) return true;

  /**
   * A backorderable product may have no inventory row at all. Upsert one
   * holding nothing but the reservation — `onHand: 0` has to be explicit or
   * the availability expression above would compare against a missing field.
   *
   * Never done for a tracked product: no row means no stock, and inventing
   * one would turn "we do not have this" into "take as many as you like".
   */
  if (allowBackorder) {
    await Inventory.updateOne(
      { productId, sku, warehouse },
      { $inc: { reserved: quantity }, $setOnInsert: { onHand: 0 } },
      { upsert: true }
    );
    return true;
  }

  return false;
}

/** Undo the holds taken so far for a box that turned out to be unfulfillable. */
async function rollback(held, warehouse) {
  for (const row of held) {
    await giveBackHold({ ...row, warehouse });
  }
}

/**
 * Returns a hold to the shelf.
 *
 * Guarded so `reserved` can never go negative: a negative would INFLATE
 * availability (onHand minus a negative is more than onHand), which is the one
 * direction this system must never drift in.
 */
async function giveBackHold({ productId, sku, warehouse, quantity }) {
  await Inventory.updateOne(
    { productId, sku, warehouse, reserved: { $gte: quantity } },
    { $inc: { reserved: -quantity } }
  );
}

/**
 * Payment succeeded — the stock actually leaves.
 *
 * Idempotent: a webhook that fires twice consumes once, because only
 * reservations that are not already `consumed` are touched.
 *
 * The late-payment case is the interesting one. If the hold already expired
 * and someone else took the stock, we decrement anyway and let availability go
 * negative, flagging it for a human. Refusing money that has already been
 * taken is worse than owing somebody a saree — a person can ring the customer
 * and offer a swap, a wait or a refund. A robot cannot.
 */
export async function consumeReservations({ orderId, actor = null }) {
  await connectDb();

  const reservations = await Reservation.find({
    orderId,
    status: { $ne: RESERVATION_STATUS.CONSUMED },
  }).lean();

  if (reservations.length === 0) return { consumed: 0, oversold: [] };

  const oversold = [];
  const movements = [];
  const soldByProduct = new Map();

  for (const row of reservations) {
    const stillHeld = row.status === RESERVATION_STATUS.ACTIVE;

    // The stock leaves either way. The hold is only given back if it is still
    // ours to give back — releasing an already-released one would credit the
    // shelf twice.
    await Inventory.updateOne(
      { productId: row.productId, sku: row.sku, warehouse: row.warehouse },
      {
        $inc: stillHeld
          ? { onHand: -row.quantity, reserved: -row.quantity }
          : { onHand: -row.quantity },
      }
    );

    if (!stillHeld) oversold.push(row.sku);

    movements.push({
      sku: row.sku,
      warehouse: row.warehouse,
      productId: row.productId,
      delta: -row.quantity,
      reason: MOVEMENT_REASON.SALE,
      note: stillHeld
        ? ""
        : "Paid after the hold had expired — stock may be oversold.",
      refType: "order",
      refId: String(orderId),
      actor,
    });

    const key = String(row.productId);
    soldByProduct.set(key, (soldByProduct.get(key) ?? 0) + row.quantity);
  }

  await Reservation.updateMany(
    { orderId, status: { $ne: RESERVATION_STATUS.CONSUMED } },
    { $set: { status: RESERVATION_STATUS.CONSUMED } }
  );

  // Independent writes — the log and the counters do not wait on each other.
  await Promise.all([
    StockMovement.insertMany(movements),
    ...[...soldByProduct].map(([productId, quantity]) =>
      Product.updateOne({ _id: productId }, { $inc: { salesCount: quantity } })
    ),
  ]);

  return { consumed: movements.length, oversold };
}

/**
 * Gives an order's holds back — payment failed, or somebody cancelled.
 *
 * Only `active` reservations are touched, which is what makes calling this
 * twice safe. No movement is written: onHand never moved.
 */
export async function releaseReservations({
  orderId,
  status = RESERVATION_STATUS.RELEASED,
}) {
  await connectDb();

  const active = await Reservation.find({
    orderId,
    status: RESERVATION_STATUS.ACTIVE,
  }).lean();

  for (const row of active) {
    await giveBackHold(row);
  }

  await Reservation.updateMany(
    { orderId, status: RESERVATION_STATUS.ACTIVE },
    { $set: { status } }
  );

  return { released: active.length };
}

/**
 * Frees holds whose fifteen minutes are up.
 *
 * Called two ways: narrowed to a handful of SKUs from `reserveStock` (so a
 * checkout is never blocked by a stale hold even if nothing is scheduled), and
 * unnarrowed from the cron, which also moves those orders to `expired`.
 *
 * Returns the order ids it touched so the caller can decide what to do about
 * them — this function deliberately does not change order status itself.
 */
export async function releaseExpired({ before = new Date(), skus } = {}) {
  await connectDb();

  const filter = {
    status: RESERVATION_STATUS.ACTIVE,
    expiresAt: { $lte: before },
  };

  // The lazy path only cares about the SKUs it is about to reserve; sweeping
  // the whole catalogue on every checkout would be a scan nobody asked for.
  if (skus?.length) filter.sku = { $in: skus };

  const expired = await Reservation.find(filter).lean();
  if (expired.length === 0) return { released: 0, orderIds: [] };

  for (const row of expired) {
    await giveBackHold(row);
  }

  await Reservation.updateMany(
    { _id: { $in: expired.map((row) => row._id) } },
    { $set: { status: RESERVATION_STATUS.EXPIRED } }
  );

  const orderIds = [
    ...new Set(expired.map((row) => String(row.orderId)).filter(Boolean)),
  ];

  return { released: expired.length, orderIds };
}

/**
 * A deliberate change to what is on the shelf — a delivery arrived, something
 * broke, a recount disagreed with the system, or a product was just created
 * with opening stock.
 *
 * Always a delta, never a target figure: two admins editing at once should add
 * up, and a `$set` would let the slower one silently undo the faster one.
 */
export async function adjustStock({
  productId,
  sku,
  warehouse,
  delta,
  reason,
  note = "",
  actor = null,
}) {
  if (!Number.isInteger(delta) || delta === 0) {
    return { error: "Enter a quantity." };
  }

  await connectDb();

  const target = warehouse ?? (await getDefaultWarehouseId());
  const filter = { productId, sku, warehouse: target };

  // A typo must not drive the shelf below empty. Reserved stock is excluded
  // from the check: it is still physically here, just spoken for.
  if (delta < 0) filter.onHand = { $gte: -delta };

  const result = await Inventory.updateOne(
    filter,
    { $inc: { onHand: delta }, $setOnInsert: { reserved: 0 } },
    // Only a positive adjustment may create the row — that is what opening
    // stock on a new product is.
    { upsert: delta > 0 }
  );

  if (result.matchedCount === 0 && !result.upsertedId) {
    return { error: "Not enough stock on hand for that reduction." };
  }

  await StockMovement.create({
    sku,
    warehouse: target,
    productId,
    delta,
    reason,
    note,
    actor,
  });

  return { ok: true };
}

/**
 * Puts a paid order's stock back — a cancellation after the money came in.
 *
 * A `return` movement rather than reversing the sale, because the sale did
 * happen: the log tells the story of what occurred, not a tidied-up version
 * where it never did.
 */
export async function restockOrder({ orderId, items, actor = null }) {
  await connectDb();

  const warehouse = await getDefaultWarehouseId();

  for (const item of items) {
    if (!item.sku || !item.quantity) continue;

    await adjustStock({
      productId: item.productId,
      sku: item.sku,
      warehouse,
      delta: item.quantity,
      reason: MOVEMENT_REASON.RETURN,
      note: "Order cancelled after payment.",
      actor,
    });
  }

  return { ok: true };
}
