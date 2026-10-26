import Link from "next/link";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { AcceptInviteForm } from "@/features/auth/components/accept-invite-form";

export const metadata = { title: "Accept invite | ATK Gifting Admin" };

/**
 * The token is only shape-checked here. Validating it against the database
 * would tell a stranger which links are live, so the real check happens when
 * the form is submitted in `acceptInvite`.
 */
export default async function AcceptInvitePage({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.token ?? "");
  const email = String(params?.email ?? "").toLowerCase();

  if (!token || !email) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-medium text-brand-text">
          Invite link incomplete
        </h1>
        <p className="text-base leading-relaxed text-muted">
          This link is missing part of its address. Ask your super admin to
          send a fresh invite.
        </p>
        <Link href="/login" className="text-sm font-medium text-brand-text hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-medium text-brand-text">
          Welcome aboard
        </h1>
        <p className="text-base text-muted">
          Set a password to finish setting up your account.
        </p>
      </header>

      <AcceptInviteForm token={token} email={email} minLength={MIN_PASSWORD_LENGTH} />
    </div>
  );
}
