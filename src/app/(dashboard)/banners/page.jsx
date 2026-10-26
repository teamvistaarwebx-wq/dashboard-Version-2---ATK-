import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getBanners } from "@/features/banners/queries/get-banners";
import { BannerRowActions } from "@/features/banners/components/banner-row-actions";
import { CATALOG_DESTRUCTIVE_ROLES } from "@/constants/enums";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";
import { BannersScreen } from "@/features/banners/components/banners-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Banners | AKT Gifting Admin" };

/**
 * The homepage hero, and any drafts beside it.
 *
 * Cards rather than a table: a banner IS its artwork, and a row of text about
 * one tells you nothing you can act on. Calls the query directly — it runs
 * inside the app that owns the model, so a network round trip would buy
 * nothing (same convention as Orders and Inquiries).
 */
export default async function BannersPage() {
  if (MOCK_MODE) return <BannersScreen />;

  const session = await requireAdmin();

  const banners = await getBanners();
  const canDelete = CATALOG_DESTRUCTIVE_ROLES.includes(session.role);

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="The hero shown on the storefront home page."
      >
        <Link
          href="/banners/new"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          New banner
        </Link>
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        {banners.length === 0 ? (
          <EmptyState
            title="No banners yet"
            description="Upload a desktop and a mobile image, then publish one to replace the storefront's built-in hero."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {banners.map((banner) => (
              <li
                key={banner.id}
                className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:gap-5"
              >
                <BannerThumb image={banner.desktop} label="Desktop" />
                <BannerThumb image={banner.mobile} label="Mobile" narrow />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/banners/${banner.id}/edit`}
                      className="font-medium text-brand underline-offset-2 hover:underline"
                    >
                      {banner.name}
                    </Link>

                    {banner.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-nunito text-xs font-medium text-emerald-800">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 font-nunito text-xs font-medium text-gray-500">
                        Draft
                      </span>
                    )}
                  </div>

                  <p className="mt-1 font-nunito text-xs text-muted">
                    Updated {formatDateTime(banner.updatedAt)}
                  </p>

                  {banner.desktop?.width ? (
                    <p className="mt-0.5 font-nunito text-xs text-muted">
                      Desktop {banner.desktop.width} × {banner.desktop.height}
                      {banner.mobile?.width
                        ? ` · Mobile ${banner.mobile.width} × ${banner.mobile.height}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <BannerRowActions
                  id={banner.id}
                  name={banner.name}
                  isActive={banner.isActive}
                  canDelete={canDelete}
                  /* Already-rendered so lucide-react stays in the server
                     bundle — the same trick DeleteProductButton uses. */
                  deleteIcon={
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function BannerThumb({ image, label, narrow = false }) {
  return (
    <figure className="shrink-0">
      <div
        className={`overflow-hidden rounded-md border border-border bg-surface ${
          narrow ? "h-20 w-16" : "h-20 w-44"
        }`}
      >
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <figcaption className="mt-1 text-center font-nunito text-[0.625rem] uppercase tracking-wide text-muted">
        {label}
      </figcaption>
    </figure>
  );
}
