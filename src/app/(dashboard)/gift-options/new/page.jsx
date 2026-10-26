import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { GiftOptionForm } from "@/features/gift-options/components/gift-option-form";
import { GIFT_OPTION_TYPE, GIFT_OPTION_TYPE_VALUES } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "New gift option | AKT Gifting Admin" };

/** `?type=` comes from the list's two New buttons. */
export default async function NewGiftOptionPage({ searchParams }) {
  // The redesign edits these in a drawer on the list.
  if (MOCK_MODE) redirect("/gift-options");

  await requireAdmin();

  const params = await searchParams;
  const type = params?.type;

  // A bare or tampered URL has no form to show — back to the list's buttons.
  if (!GIFT_OPTION_TYPE_VALUES.includes(type)) redirect("/gift-options");

  const isCard = type === GIFT_OPTION_TYPE.CARD_DESIGN;

  return (
    <>
      <PageHeader
        title={isCard ? "New card design" : "New packaging"}
        subtitle="Shown on the storefront cart as soon as you save it as active."
      />

      <div className="px-6 py-6 sm:px-8">
        <Link
          href="/gift-options"
          className="font-nunito text-sm text-muted underline-offset-2 hover:underline"
        >
          ← All gift options
        </Link>

        <div className="mt-6 max-w-4xl">
          <GiftOptionForm type={type} />
        </div>
      </div>
    </>
  );
}
