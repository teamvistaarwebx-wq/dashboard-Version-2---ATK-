import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MOCK_AUTH_BYPASS, hostedDemoBlocker } from "@/lib/mock-mode";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Sign in | ATK Gifting Admin" };

export default async function LoginPage({ searchParams }) {
  if (await getSession()) redirect("/");

  const params = await searchParams;
  const demoBlocker = hostedDemoBlocker();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-medium text-brand-text">Sign in</h1>
        <p className="text-base text-muted">Use the email your account was created with.</p>
      </header>

      <LoginForm from={params?.from ?? ""} />

      {MOCK_AUTH_BYPASS ? (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-13 text-muted">
          Prototype mode skips sign-in.{" "}
          <Link href="/" className="font-medium text-brand-text hover:underline">
            Open the admin
          </Link>
        </p>
      ) : null}

      {demoBlocker ? (
        <p role="status" className="rounded-2xl bg-warning-bg px-4 py-3 text-13 text-warning">
          Demo mode is off. {demoBlocker}
        </p>
      ) : null}
    </div>
  );
}
