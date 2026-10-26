import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/features/orders/queries/get-orders";
import { OrderStatusControls } from "@/features/orders/components/order-status-controls";
import { ORDER_TRANSITIONS } from "@/constants/inventory";
import { formatPrice, formatDateTime } from "@/lib/format";
import { CardLogoPreview } from "@/features/gifting/components/card-logo-preview";
import { OrderDetailScreen } from "@/features/orders/components/order-detail-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `${id} | AKT Gifting Admin` };
}

/** Everything staff need to pack and dispatch one gift box. */
export default async function OrderDetailPage({ params }) {
  if (MOCK_MODE) return <OrderDetailScreen orderNumber={(await params).id} />;

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link
        href="/orders"
        className="text-sm text-gray-500 underline-offset-2 hover:underline"
      >
        ← All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
        <span className="text-sm text-gray-500">
          Placed {formatDateTime(order.createdAt)} · {order.status.replace(/_/g, " ")}
        </span>
      </header>

      {/* Set when a payment landed after its stock hold had expired, so the
          item may already have gone to somebody else. Loud on purpose: this
          is a customer who has paid and needs a phone call. */}
      {order.needsReview ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3"
        >
          <p className="text-sm font-semibold text-danger">
            This order needs attention
          </p>
          <p className="mt-0.5 text-sm text-danger/90">
            {order.reviewNote ||
              "Something about this order could not be settled automatically."}
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <OrderStatusControls
          orderId={order.id}
          allowed={ORDER_TRANSITIONS[order.status] ?? []}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Panel title="Contact">
          <Row label="Name" value={order.contact.fullName} />
          <Row label="Phone" value={order.contact.phone} />
          <Row label="Email" value={order.contact.email} />
          {order.verifiedPhone ? (
            <Row label="OTP verified" value={order.verifiedPhone} />
          ) : null}
        </Panel>

        <Panel title="Delivery address">
          <p className="text-sm leading-relaxed">
            {order.address.line1}
            <br />
            {order.address.city}, {order.address.state}
            <br />
            {order.address.pincode}
          </p>
        </Panel>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
          Items
        </h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>
                {item.title}
                <span className="ml-2 text-gray-500">× {item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Panel title="Packaging &amp; card">
          <Row label="Packaging" value={order.packaging?.name || "—"} />
          <Row label="Card" value={order.card?.name || "—"} />
          {order.cardMessage ? (
            <div className="pt-2">
              <p className="text-xs text-gray-500">Message to print</p>
              <p className="mt-1 rounded-md bg-gray-50 px-3 py-2 text-sm italic">
                “{order.cardMessage}”
              </p>
            </div>
          ) : null}
          <CardLogoPreview logo={order.cardLogo} />
        </Panel>

        <Panel title="Amounts">
          <Row label="Subtotal" value={formatPrice(order.amounts.subtotal)} />
          <Row label="Packaging" value={formatPrice(order.amounts.packaging)} />
          <Row label="Card" value={formatPrice(order.amounts.card)} />
          <Row label="Shipping" value={formatPrice(order.amounts.shipping)} />
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.amounts.total)}</span>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
