"use client";

import { createContext, use, useMemo, useSyncExternalStore } from "react";
import { BASE_BANNERS, BASE_GIFT_OPTIONS, BASE_SETTINGS, BASE_TEAM } from "./content";
import { getWorld } from "./world";
import {
  getOverlay,
  getServerOverlay,
  subscribeOverlay,
  updateOverlay,
} from "./overlay-store";

/**
 * The prototype's data, for client screens: the generated world as of the
 * request, with the user's own edits layered on top.
 *
 * `nowIso` comes from the server layout so server and client generate the
 * same world and hydration matches. It does not advance while the tab stays
 * open — the live-view card ticks on its own.
 */
const MockStoreContext = createContext(null);

export function MockStoreProvider({ nowIso, children }) {
  const overlay = useSyncExternalStore(subscribeOverlay, getOverlay, getServerOverlay);
  const world = getWorld(nowIso);

  const value = useMemo(() => {
    const products = mergeProducts(world.products, overlay);
    const productById = new Map(products.map((p) => [p.id, p]));

    const inventory = products
      .filter((p) => p.fulfillment === "in_stock" && p.status !== "archived")
      .map((p) => {
        const committed = world.committedBySku.get(p.sku) ?? 0;
        const saved = overlay.inventory[p.id];
        // Base stock is "available" in the catalogue, so committed units sit
        // on top of it: a product listed with 12 has 12 left to sell.
        const onHand = saved?.onHand ?? (p.isNew ? p.onHand : p.onHand + committed);
        return {
          productId: p.id,
          product: p,
          sku: p.sku,
          warehouse: p.warehouse,
          committed,
          onHand,
          available: onHand - committed,
          lowStockThreshold: saved?.lowStockThreshold ?? p.lowStockThreshold,
        };
      });
    const inventoryById = new Map(inventory.map((row) => [row.productId, row]));

    const orders = world.orders.map((order) =>
      overlay.orderStatus[order.id] ? { ...order, status: overlay.orderStatus[order.id] } : order
    );
    const inquiries = world.inquiries.map((inquiry) =>
      overlay.inquiryStatus[inquiry.id]
        ? { ...inquiry, status: overlay.inquiryStatus[inquiry.id] }
        : inquiry
    );

    return {
      world,
      overlay,
      banners: mergeRecords(BASE_BANNERS, overlay.records?.banners),
      giftOptions: mergeRecords(BASE_GIFT_OPTIONS, overlay.records?.giftOptions),
      team: mergeRecords(BASE_TEAM, overlay.records?.team),
      settings: { ...BASE_SETTINGS, ...(overlay.settings ?? {}) },
      products,
      productById,
      inventory,
      inventoryById,
      orders,
      inquiries,
      importedIds: new Set(overlay.importedIds),
    };
  }, [world, overlay]);

  return <MockStoreContext value={value}>{children}</MockStoreContext>;
}

function mergeProducts(base, overlay) {
  const added = overlay.newProductIds
    .map((id) => overlay.products[id])
    .filter(Boolean);
  const existing = base.map((p) => overlay.products[p.id] ?? p);
  return [...added, ...existing].filter((p) => !p.deleted);
}

/** Base list with saved edits applied and saved additions appended. */
function mergeRecords(base, saved = {}) {
  const baseIds = new Set(base.map((record) => record.id));
  const merged = base.map((record) => saved[record.id] ?? record);
  const added = Object.values(saved).filter((record) => !baseIds.has(record.id));
  return [...merged, ...added].filter((record) => !record.deleted);
}

/** The mock data, or null outside mock mode (no provider mounted). */
export function useMockStoreOptional() {
  return use(MockStoreContext);
}

export function useMockStore() {
  const store = use(MockStoreContext);
  if (!store) throw new Error("useMockStore needs <MockStoreProvider> (NEXT_PUBLIC_ADMIN_MOCK=1)");
  return store;
}

/* ---------- Writes ---------- */

let idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * Create or update a product and, for in-stock pieces, its inventory record
 * at Main Warehouse in the same step. Returns the product id.
 */
export function saveMockProduct(product, { quantity, lowStockThreshold, imported = false } = {}) {
  const id = product.id ?? newId("p");
  const isNew = !product.id;
  const saved = { ...product, id, isNew: product.isNew ?? isNew };

  updateOverlay((overlay) => {
    const next = {
      ...overlay,
      products: { ...overlay.products, [id]: saved },
      newProductIds: isNew ? [id, ...overlay.newProductIds] : overlay.newProductIds,
      importedIds: imported && isNew ? [id, ...overlay.importedIds] : overlay.importedIds,
    };

    if (saved.fulfillment === "in_stock" && quantity !== undefined) {
      next.inventory = {
        ...overlay.inventory,
        [id]: { onHand: quantity, lowStockThreshold: lowStockThreshold ?? 5 },
      };
      next.movements = [
        {
          id: newId("m"),
          productId: id,
          delta: quantity,
          reason: isNew ? "restock" : "adjustment",
          note: isNew ? (imported ? "Imported from CSV" : "Opening stock") : "Set on product page",
          at: new Date().toISOString(),
        },
        ...overlay.movements,
      ];
    }

    return next;
  });

  return id;
}

/** Bulk write used by the CSV importer — one storage write for the batch. */
export function importMockProducts(entries) {
  updateOverlay((overlay) => {
    const products = { ...overlay.products };
    const inventory = { ...overlay.inventory };
    const newIds = [];
    const movements = [];
    const at = new Date().toISOString();

    for (const { product, quantity, lowStockThreshold } of entries) {
      const id = product.id ?? newId("p");
      const isNew = !product.id;
      products[id] = { ...product, id, isNew: product.isNew ?? isNew };
      if (isNew) newIds.push(id);

      if (product.fulfillment === "in_stock") {
        inventory[id] = { onHand: quantity, lowStockThreshold: lowStockThreshold ?? 5 };
        movements.push({ id: newId("m"), productId: id, delta: quantity, reason: "restock", note: "Imported from CSV", at });
      }
    }

    return {
      ...overlay,
      products,
      inventory,
      newProductIds: [...newIds, ...overlay.newProductIds],
      importedIds: [...newIds, ...overlay.importedIds],
      movements: [...movements, ...overlay.movements],
    };
  });
}

/** `changes`: [{ productId, onHand, previous }] from the inventory table. */
export function adjustMockInventory(changes, current) {
  updateOverlay((overlay) => {
    const inventory = { ...overlay.inventory };
    const at = new Date().toISOString();
    const movements = [];

    for (const change of changes) {
      const row = current.get(change.productId);
      inventory[change.productId] = {
        onHand: change.onHand,
        lowStockThreshold: row?.lowStockThreshold ?? 5,
      };
      movements.push({
        id: newId("m"),
        productId: change.productId,
        delta: change.onHand - (row?.onHand ?? 0),
        reason: "adjustment",
        note: "Edited on Inventory",
        at,
      });
    }

    return { ...overlay, inventory, movements: [...movements, ...overlay.movements] };
  });
}

export function setMockOrderStatus(orderId, status) {
  updateOverlay((overlay) => ({
    ...overlay,
    orderStatus: { ...overlay.orderStatus, [orderId]: status },
  }));
}

export function setMockInquiryStatus(inquiryId, status) {
  updateOverlay((overlay) => ({
    ...overlay,
    inquiryStatus: { ...overlay.inquiryStatus, [inquiryId]: status },
  }));
}

/** Create or update a banner, gift option or team member. Returns its id. */
export function saveMockRecord(collection, record) {
  const id = record.id ?? newId(collection.slice(0, 1));
  updateOverlay((overlay) => ({
    ...overlay,
    records: {
      ...overlay.records,
      [collection]: { ...(overlay.records?.[collection] ?? {}), [id]: { ...record, id } },
    },
  }));
  return id;
}

export function saveMockSettings(settings) {
  updateOverlay((overlay) => ({ ...overlay, settings }));
}
