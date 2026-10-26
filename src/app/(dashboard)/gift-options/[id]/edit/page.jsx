import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { GiftOptionForm } from "@/features/gift-options/components/gift-option-form";
import { getGiftOptionForAdmin } from "@/features/gift-options/queries/get-gift-options-admin";
import { GIFT_OPTION_TYPE } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { MOCK_MODE } from "@/lib/mock-mode";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const option = await getGiftOptionForAdmin(id);

  return { title: `${option?.name ?? "Gift option"} | AKT Gifting Admin` };
}

export default async function EditGiftOptionPage({ params }) {
  // The redesign edits these in a drawer on the list.
  if (MOCK_MODE) redirect("/gift-options");

  await requireAdmin();

  const { id } = await params;
  const option = await getGiftOptionForAdmin(id);

  if (!option) notFound();

  const kind =
    option.type === GIFT_OPTION_TYPE.CARD_DESIGN ? "Card design" : "Packaging";

  return (
    <>
      <PageHeader
        title={option.name}
        subtitle={
          option.isActive
            ? `${kind} — live on the cart. Changes show as soon as you save.`
            : `${kind} — inactive, so shoppers don't see it.`
        }
      />

      <div className="px-6 py-6 sm:px-8">
        <Link
          href="/gift-options"
          className="font-nunito text-sm text-muted underline-offset-2 hover:underline"
        >
          ← All gift options
        </Link>

        <div className="mt-6 max-w-4xl">
          <GiftOptionForm option={option} type={option.type} />
        </div>
      </div>
    </>
  );
}
