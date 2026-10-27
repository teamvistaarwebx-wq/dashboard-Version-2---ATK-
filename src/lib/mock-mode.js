/**
 * `NEXT_PUBLIC_ADMIN_MOCK=1` swaps every redesigned screen onto the seeded
 * data in `src/mocks/` so the admin can be clicked through with no database.
 *
 * NEXT_PUBLIC_ so the same flag is readable in client components; Next inlines
 * it at build time, so flipping it needs a restart of `next dev`.
 */
export const MOCK_MODE = process.env.NEXT_PUBLIC_ADMIN_MOCK === "1";

/**
 * A hosted click-through demo (a Vercel preview for a designer or a client):
 * a production build that skips sign-in like `next dev` does.
 *
 * It takes a second, server-only flag on top of mock mode, and it refuses to
 * switch on while a database is configured — with no MONGODB_URI there is no
 * real data or account behind the open door, only the seeded mocks.
 */
const HOSTED_DEMO =
  MOCK_MODE && process.env.ADMIN_PUBLIC_DEMO === "1" && !process.env.MONGODB_URI;

/**
 * Skipping sign-in is honoured in development, or in a hosted demo as above.
 * A NEXT_PUBLIC_ flag alone is baked into the bundle, so honouring it in an
 * ordinary production build would leave a deployed admin open to anyone who
 * found the URL.
 */
export const MOCK_AUTH_BYPASS =
  MOCK_MODE && (process.env.NODE_ENV !== "production" || HOSTED_DEMO);

/**
 * Why a hosted demo someone asked for is not running, for the sign-in page —
 * the Vercel settings are out of reach from the app, so the deployment says
 * which condition failed. Null when no demo was asked for, so an ordinary
 * production admin shows nothing. Names settings, never their values.
 */
export function hostedDemoBlocker() {
  if (process.env.NODE_ENV !== "production" || MOCK_AUTH_BYPASS) return null;

  const demoAsked = process.env.ADMIN_PUBLIC_DEMO === "1";
  if (!MOCK_MODE && !demoAsked) return null;

  if (process.env.MONGODB_URI) {
    return "MONGODB_URI is set on this deployment. Remove it from the Vercel project, then redeploy.";
  }
  if (!MOCK_MODE) {
    return "NEXT_PUBLIC_ADMIN_MOCK=1 was not set when this deployment was built. Add it for Production, then redeploy without the build cache.";
  }
  return "ADMIN_PUBLIC_DEMO=1 is not set for this deployment. Add it for Production, then redeploy.";
}

/** Who the prototype is signed in as. Same shape as `getSession()`. */
export const MOCK_SESSION = {
  adminId: "mock-admin",
  email: "ananya.rao@atulyakarigari.com",
  name: "Ananya Rao",
  role: "super_admin",
};

export const STORE_NAME = "Atulya Karigari";
