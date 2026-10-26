"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { inviteAdminUser } from "@/features/auth/actions/invite-admin-user";
import { ADMIN_ROLE } from "@/constants/enums";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

const INITIAL_STATE = { error: "", inviteUrl: "" };

/** Super admin is seeded, never invited, so it is not offered here. */
const ROLE_OPTIONS = [
  { value: ADMIN_ROLE.ADMIN, label: "Admin — full catalogue and orders" },
  { value: ADMIN_ROLE.STAFF, label: "Staff — day-to-day fulfilment" },
];

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(
    inviteAdminUser,
    INITIAL_STATE
  );

  return (
    <div className="flex flex-col gap-5 px-5 pb-5 pt-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="invite-fullName"
            name="fullName"
            label="Full name"
            placeholder="Anita Singh"
            required
            disabled={isPending}
          />
          <TextField
            id="invite-email"
            name="email"
            type="email"
            label="Email"
            placeholder="anita@atulyakarigari.com"
            required
            disabled={isPending}
          />
        </div>

        <SelectField
          id="invite-role"
          name="role"
          label="Role"
          options={ROLE_OPTIONS}
          defaultValue={ADMIN_ROLE.STAFF}
          disabled={isPending}
        />

        <FormError message={state?.error} />

        <Button type="submit" size="sm" className="self-start" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating invite
            </>
          ) : (
            "Create invite"
          )}
        </Button>
      </form>

      {state?.inviteUrl ? <InviteLink url={state.inviteUrl} /> : null}
    </div>
  );
}

/**
 * The link is shown once and never stored in readable form, so the copy
 * button is the whole point of this block.
 */
function InviteLink({ url }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked (insecure origin, denied permission) — the input
      // below still holds the link for a manual select-and-copy.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-brand-soft p-4">
      <p className="text-xs font-semibold text-brand">
        Send this link to them — it is shown only once
      </p>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-brand/20 bg-surface px-2.5 text-xs text-foreground outline-none"
        />
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-brand/70">
        The link expires in 7 days and can only be used once.
      </p>
    </div>
  );
}
