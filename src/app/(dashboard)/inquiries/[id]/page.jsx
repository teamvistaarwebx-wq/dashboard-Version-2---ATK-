import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getInquiry } from "@/features/inquiries/queries/get-inquiries";
import { InquiryStatusPill } from "@/features/inquiries/components/inquiry-status-pill";
import { InquiryStatusForm } from "@/features/inquiries/components/inquiry-status-form";
import { formatDate, formatPrice, formatDateTime } from "@/lib/format";
import { INQUIRY_SOURCE, INQUIRY_SOURCE_LABEL } from "@/constants/enums";
import { resolveImageUrl } from "@/lib/storefront";
import { requireAdmin } from "@/lib/auth/dal";
import { CardLogoPreview } from "@/features/gifting/components/card-logo-preview";
import { InquiryDetailScreen } from "@/features/inquiries/components/inquiry-detail-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  return {
    title: `${inquiry?.inquiryNumber ?? "Enquiry"} | AKT Gifting Admin`,
  };
}

/** Everything sales need to call one company back and build a quote. */
export default async function InquiryDetailPage({ params }) {
  if (MOCK_MODE) return <InquiryDetailScreen inquiryId={(await params).id} />;

  await requireAdmin();

  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) notFound();

  const limits = Object.entries(inquiry.categoryLimits ?? {});
  const hasAddress = Boolean(inquiry.address?.line1);
  const madeToOrder = inquiry.source === INQUIRY_SOURCE.MADE_TO_ORDER;

  return (
    <>
      <PageHeader
        title={inquiry.inquiryNumber ?? inquiry.companyName}
        subtitle={`Received ${formatDateTime(inquiry.createdAt)}`}
      >
        <InquiryStatusPill status={inquiry.status} />
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        <Link
          href="/inquiries"
          className="font-nunito text-sm text-muted underline-offset-2 hover:underline"
        >
          ← All enquiries
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Panel title="Contact">
                <Row label="Name" value={inquiry.contactName} />
                <Row label="Company" value={inquiry.companyName || "—"} />
                <Row label="Phone" value={inquiry.phone || "—"} />
                <Row label="Email" value={inquiry.email || "—"} />
              </Panel>

              {madeToOrder ? (
                <MadeToOrderAsk inquiry={inquiry} />
              ) : (
                <Panel title="The ask">
                  <Row label="Occasion" value={inquiry.occasion || "—"} />
                  {/* The storefront no longer asks for a date; only older
                      enquiries carry one. */}
                  {inquiry.neededBy ? (
                    <Row
                      label="Needed by"
                      value={formatDateTime(inquiry.neededBy)}
                    />
                  ) : null}
                  <Row
                    label="People"
                    value={inquiry.headcount ? String(inquiry.headcount) : "—"}
                  />
                  {limits.length > 0 ? (
                    <Row
                      label="Split"
                      value={limits
                        .map(([category, count]) => `${category} ${count}`)
                        .join(" · ")}
                    />
                  ) : null}
                </Panel>
              )}
            </div>

            {/* Only rendered when there is a real address. The form makes it
                optional, and an empty block would read as "no delivery
                target" rather than "not asked". */}
            {hasAddress ? (
              <Panel title="Delivery address">
                <p className="font-nunito text-sm leading-relaxed text-foreground">
                  {inquiry.address.line1}
                  <br />
                  {inquiry.address.city}, {inquiry.address.state}
                  <br />
                  {inquiry.address.pincode}
                </p>
              </Panel>
            ) : null}

            {inquiry.message ? (
              <Panel title="Their message">
                <p className="whitespace-pre-line font-nunito text-sm leading-relaxed text-foreground">
                  {inquiry.message}
                </p>
              </Panel>
            ) : null}

            {inquiry.items.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-border">
                <h2 className="border-b border-border bg-surface px-4 py-3 font-nunito text-xs font-semibold uppercase tracking-wide text-muted">
                  {madeToOrder
                    ? `${inquiry.items.length === 1 ? "Piece" : "Pieces"} requested (${inquiry.itemCount} units)`
                    : `Products they picked (${inquiry.itemCount})`}
                </h2>

                <ul className="divide-y divide-border">
                  {inquiry.items.map((item) => (
                    <InquiryItemRow key={item.productId} item={item} />
                  ))}
                </ul>

                <dl className="flex flex-col gap-1.5 border-t border-border px-4 py-3 font-nunito text-sm">
                  {inquiry.packaging?.name ? (
                    <Line
                      label={`Packaging — ${inquiry.packaging.name}`}
                      value={formatPrice(inquiry.packaging.price)}
                    />
                  ) : null}
                  {inquiry.card?.name ? (
                    <Line
                      label={`Card — ${inquiry.card.name}`}
                      value={formatPrice(inquiry.card.price)}
                    />
                  ) : null}
                  {inquiry.cardMessage ? (
                    <Line label="Card message" value={inquiry.cardMessage} />
                  ) : null}
                </dl>

                {inquiry.cardLogo ? (
                  <div className="border-t border-border px-4 py-3">
                    <CardLogoPreview logo={inquiry.cardLogo} />
                  </div>
                ) : null}

                {/*
                  Labelled "Indicative value", never "Total": these are catalog
                  prices for a sample box, and the headcount above is usually
                  far larger than what they picked. Reading it as a quote is
                  the one mistake this screen must not invite.
                */}
                <div className="flex items-end justify-between gap-3 border-t border-border bg-surface px-4 py-3">
                  <p className="font-nunito text-sm font-semibold text-muted">
                    {madeToOrder
                      ? "Indicative value at catalogue price"
                      : "Indicative value of the selection"}
                  </p>
                  <p className="shrink-0 text-lg font-semibold text-brand">
                    {formatPrice(inquiry.amounts?.total ?? inquiry.budget)}
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Panel title="Pipeline">
              <InquiryStatusForm
                id={inquiry.id}
                status={inquiry.status}
                internalNotes={inquiry.internalNotes}
              />
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

/**
 * One product they picked.
 *
 * The image is the snapshot stored on the enquiry, not a live catalog read:
 * sales needs to see what was on screen when they asked, and a product
 * re-shot or deleted six weeks later must not change that. Same reasoning as
 * the stored title and price beside it.
 *
 * A plain <img> rather than next/image — these are 48px thumbnails on an
 * internal page, and next/image would need every storefront host allow-listed
 * in next.config.mjs to render them.
 */
function InquiryItemRow({ item }) {
  const imageUrl = resolveImageUrl(item.image?.url);

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.image?.alt || item.title}
            width={48}
            height={48}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{item.title}</p>
        <p className="font-nunito text-xs text-muted">
          {formatPrice(item.price)} × {item.quantity}
        </p>
      </div>

      <span className="shrink-0 font-medium text-foreground">
        {formatPrice(item.price * item.quantity)}
      </span>
    </li>
  );
}

/**
 * What a made-to-order request asks for: how many, and the delivery estimate
 * the customer was shown. The estimate is a snapshot from when they asked —
 * it is what they will have in mind when sales calls, not a commitment.
 */
function MadeToOrderAsk({ inquiry }) {
  const days = inquiry.leadTimeDays;
  const estimate = days
    ? `About ${days} days (around ${formatDate(addDays(inquiry.createdAt, days))})`
    : "To be confirmed with them";

  return (
    <Panel title="The ask">
      <Row label="Type" value={INQUIRY_SOURCE_LABEL[inquiry.source]} />
      <Row label="Units" value={String(inquiry.units)} />
      <Row label="Customer was shown" value={estimate} />
    </Panel>
  );
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-border p-4 sm:p-5">
      <h2 className="mb-3 font-nunito text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1 font-nunito text-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] text-right text-foreground">{value}</span>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] text-right text-foreground">{value}</dd>
    </div>
  );
}
