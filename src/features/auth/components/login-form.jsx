"use client";

import { useActionState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/features/auth/actions/sign-in";
import { AuthButton, AuthError, AuthField } from "./auth-field";

const INITIAL_STATE = { error: "" };

export function LoginForm({ from = "" }) {
  const [state, formAction] = useActionState(signIn, INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          formAction(formData);
        });
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="from" value={from} />

      <AuthField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="username"
        required
        disabled={isPending}
      />

      <AuthField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        disabled={isPending}
      />

      <AuthError message={state?.error} />

      <AuthButton disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </AuthButton>

      <p className="-mt-1 text-xs leading-relaxed text-muted">
        Accounts are created by invitation. Ask your super admin if you need
        access.
      </p>
    </form>
  );
}
