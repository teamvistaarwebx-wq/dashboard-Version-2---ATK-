/** @type {import('next').NextConfig} */
const nextConfig = {
  // Off the bottom-left, where it covered the Settings link in the nav.
  devIndicators: { position: "bottom-right" },
  experimental: {
    // Lets `forbidden()` from next/navigation render `src/app/forbidden.jsx`.
    authInterrupts: true,
  },
};

export default nextConfig;
