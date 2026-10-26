import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getGiftOptionsForAdmin } from "@/features/gift-options/queries/get-gift-options-admin";
import { GiftOptionRowActions } from "@/features/gift-options/components/gift-option-row-actions";
import { GIFT_OPTION_TYPE } from "@/constants/enums";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";
import { GiftOptionsScreen } from "@/features/gift-options/components/gift-options-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Gift Options | AKT Gifting Admin" };

/**
 * Packaging and card designs — the box-level add-ons on the storefront cart.
 *
 * Two short lists rather than one table: the kinds differ by a field, and
 * staff think of them separately. Inactive options stay listed so they can
 * be brought back. Calls the query directly, like Banners.
 */
export default async function GiftOptionsPage() {
  if (MOCK_MODE) return <GiftOptionsScreen />;

  await requireAdmin();

  const { packaging, cardDesigns } = await getGiftOptionsForAdmin();

  return (
    <>
      <PageHeader
        title="Gift Options"
        subtitle="Packaging and card designs shoppers choose on the cart."
      />

      <div className="flex flex-col gap-10 px-6 py-6 sm:px-8">
        <OptionSection
          title="Packaging"
          type={GIFT_OPTION_TYPE.PACKAGING}
          newLabel="New packaging"
          options={packaging}
          emptyWarning="No active packaging — the cart hides the packaging choice and charges ₹0 for it."
        />

        <OptionSection
          title="Card designs"
          type={GIFT_OPTION_TYPE.CARD_DESIGN}
          newLabel="New card design"
          options={cardDesigns}
          emptyWarning="No active card design — the cart hides the design choice."
        />
      </div>
    </>
  );
}

function OptionSection({ title, type, newLabel, options, emptyWarning }) {
  const hasActive = options.some((option) => option.isActive);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-nunito text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>

        <Link
          href={`/gift-options/new?type=${type}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          {newLabel}
        </Link>
      </div>

      {/* Not a block: an empty section is a valid choice, but nobody should
          make it without knowing what the cart does about it. */}
      {options.length > 0 && !hasActive ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 font-nunito text-sm text-danger">
          {emptyWarning}
        </p>
      ) : null}

      {options.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description={emptyWarning}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {options.map((option) => (
            <OptionRow key={option.id} option={option} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OptionRow({ option }) {
  const detail =
    option.type === GIFT_OPTION_TYPE.CARD_DESIGN
      ? `${option.maxMessageLength ?? 200} characters`
      : option.capacity
        ? `Holds ${option.capacity}`
        : null;

  return (
    <li
      className={`flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:gap-5 ${
        option.isActive ? "" : "opacity-70"
      }`}
    >
      {/* The cart's own 4:3 crop, so a bad crop shows up here first. */}
      <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        {option.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/gift-options/${option.id}/edit`}
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            {option.name}
          </Link>

          {option.isDefault ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-nunito text-xs font-medium text-emerald-800">
              Default
            </span>
          ) : null}

          {option.isActive ? null : (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-nunito text-xs font-medium text-gray-500">
              Inactive
            </span>
          )}

          {option.image ? null : (
            <span className="rounded-full bg-danger/10 px-2.5 py-1 font-nunito text-xs font-medium text-danger">
              No image
            </span>
          )}
        </div>

        <p className="mt-1 font-nunito text-xs text-muted">
          {[
            option.price > 0 ? formatPrice(option.price) : "Free",
            detail,
            `Position ${option.order}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <GiftOptionRowActions
        id={option.id}
        isActive={option.isActive}
        isDefault={option.isDefault}
      />
    </li>
  );
}
