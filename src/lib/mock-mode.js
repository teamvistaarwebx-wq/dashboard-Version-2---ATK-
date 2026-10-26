/**
 * `NEXT_PUBLIC_ADMIN_MOCK=1` swaps every redesigned screen onto the seeded
 * data in `src/mocks/` so the admin can be clicked through with no database.
 *
 * NEXT_PUBLIC_ so the same flag is readable in client components; Next inlines
 * it at build time, so flipping it needs a restart of `next dev`.
 */
export const MOCK_MODE = process.env.NEXT_PUBLIC_ADMIN_MOCK === "1";

/**
 * Skipping sign-in is honoured in development only. A NEXT_PUBLIC_ flag is
 * baked into the bundle, so honouring it in a production build would leave a
 * deployed admin open to anyone who found the URL.
 */
export const MOCK_AUTH_BYPASS =
  MOCK_MODE && process.env.NODE_ENV !== "production";

/** Who the prototype is signed in as. Same shape as `getSession()`. */
export const MOCK_SESSION = {
  adminId: "mock-admin",
  email: "ananya.rao@atulyakarigari.com",
  name: "Ananya Rao",
  role: "super_admin",
};

export const STORE_NAME = "Atulya Karigari";
