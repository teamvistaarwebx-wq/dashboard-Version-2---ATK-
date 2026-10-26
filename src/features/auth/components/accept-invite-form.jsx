"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { acceptInvite } from "@/features/auth/actions/accept-invite";
import { AuthButton, AuthError, AuthField } from "./auth-field";

const INITIAL_STATE = { error: "" };

/**
 * `minLength` comes in from the server page: lib/auth/password.js hashes with
 * node:crypto, and importing it here pulled that into the browser bundle,
 * where it crashed the page.
 */
export function AcceptInviteForm({ token, email, minLength }) {
  const [state, formAction, isPending] = useActionState(
    acceptInvite,
    INITIAL_STATE
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <AuthField
        id="invited-email"
        label="Email"
        value={email}
        readOnly
        disabled
      />

      <AuthField
        id="password"
        name="password"
        type="password"
        label="Choose a password"
        placeholder="••••••••••"
        autoComplete="new-password"
        minLength={minLength}
        required
        disabled={isPending}
        hint={`At least ${minLength} characters, with letters and a number.`}
      />

      <AuthField
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        placeholder="••••••••••"
        autoComplete="new-password"
        required
        disabled={isPending}
      />

      <AuthError message={state?.error} />

      <AuthButton disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Setting up
          </>
        ) : (
          "Set password and sign in"
        )}
      </AuthButton>
    </form>
  );
}
