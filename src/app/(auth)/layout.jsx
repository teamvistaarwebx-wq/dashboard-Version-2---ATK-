import Image from "next/image";
import { Newsreader } from "next/font/google";

/**
 * Split shell for the two signed-out screens, from the Figma frame: the
 * artisan photograph on the left, the form centred on the right.
 *
 * The photograph has the logo and headline set into it, so it is never
 * cropped on desktop — the panel keeps the image's own proportions and is
 * sized to whichever of half the width or the full height runs out first.
 * The same words are repeated as real text for screen readers.
 *
 * Below `lg` the photograph becomes a short banner above the form, anchored
 * to the top so the logo and the face stay in view.
 *
 * Newsreader is loaded here only: the serif headings are part of the
 * sign-in design, and the rest of the admin is Geist throughout.
 */
const newsreader = Newsreader({
  variable: "--newsreader",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const PHOTO = "/images/auth/sign-in-artisan.jpg";
const PHOTO_RATIO = 1529 / 1960;

export default function AuthLayout({ children }) {
  return (
    <div className={`${newsreader.variable} min-h-dvh bg-surface lg:flex lg:h-dvh lg:items-center lg:p-5`}>
      <div className="sr-only">
        <p>Atulya Karigari</p>
        <p>Gifts woven from the heart of artisans.</p>
        <p>Manage the catalogue, banners, orders and corporate gifting enquiries behind the Karigari storefront.</p>
      </div>

      <aside
        aria-hidden="true"
        className="relative hidden shrink-0 overflow-hidden rounded-[1.75rem] lg:block"
        style={{
          width: `min(calc(50vw - 2.5rem), calc((100dvh - 2.5rem) * ${PHOTO_RATIO}))`,
          aspectRatio: "1529 / 1960",
        }}
      >
        <Image src={PHOTO} alt="" fill priority sizes="(min-width: 1024px) 50vw, 1px" className="object-cover" />
      </aside>

      <div aria-hidden="true" className="px-4 pt-4 sm:px-6 sm:pt-6 lg:hidden">
        <div className="relative h-60 overflow-hidden rounded-3xl sm:h-80">
          <Image src={PHOTO} alt="" fill priority sizes="(min-width: 1024px) 1px, 100vw" className="object-cover object-top" />
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12 lg:py-0">
        <div className="w-full max-w-[23rem]">{children}</div>
      </main>
    </div>
  );
}
