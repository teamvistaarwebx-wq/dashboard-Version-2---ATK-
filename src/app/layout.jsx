import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { THEME_SCRIPT } from "@/lib/theme-script";

/**
 * Geist for the interface, Geist Mono for figures, SKUs and order numbers.
 *
 * The variable names deliberately avoid `--font-*`: globals.css maps these
 * into Tailwind theme keys called `--font-sans` / `--font-mono`, and a key
 * cannot reference a variable of its own name.
 */
const geist = Geist({
  variable: "--geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "ATK Gifting Admin",
  description: "Catalogue, inventory, banners and orders for Atulya Karigari.",
  icons: {
    icon: "/images/icon/ATK-New-logos_1.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      // THEME_SCRIPT sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint so a saved dark theme never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background font-sans text-sm text-foreground">
        {children}
      </body>
    </html>
  );
}
