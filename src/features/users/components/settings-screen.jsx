"use client";

import { useState } from "react";
import { RotateCcw, UserPlus } from "lucide-react";
import { useSaveBar } from "@/components/layout/save-bar";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast";
import { useHydrated } from "@/hooks/use-hydrated";
import { ROLE_LABELS } from "@/mocks/content";
import { resetOverlay } from "@/mocks/overlay-store";
import { saveMockRecord, saveMockSettings, useMockStore } from "@/mocks/store";

export function SettingsScreen() {
  const hydrated = useHydrated();
  const store = useMockStore();
  // Keyed on the saved settings so the form starts from them once loaded.
  return <SettingsForm key={hydrated ? "ready" : "loading"} settings={store.settings} />;
}

function SettingsForm({ settings }) {
  const store = useMockStore();
  const toast = useToast();
  const [initial, setInitial] = useState(settings);
  const [form, setForm] = useState(settings);
  const [inviting, setInviting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState({});

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function save() {
    const found = {};
    if (!form.storeName.trim()) found.storeName = "Enter the store name";
    if (!/^\S+@\S+\.\S+$/.test(form.contactEmail)) found.contactEmail = "Enter a valid email";
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin)) found.gstin = "A GSTIN is 15 letters and digits";
    setError(found);
    if (Object.keys(found).length) return;
    saveMockSettings(form);
    setInitial(form);
    toast("Settings saved");
  }

  useSaveBar({ dirty, onSave: save, onDiscard: () => setForm(initial) });

  return (
    <Page title="Settings" narrow>
      <div className="flex flex-col gap-4">
        <Card title="Store details">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <TextField id="store-name" label="Store name" value={form.storeName} error={error.storeName} onChange={(e) => set("storeName", e.target.value)} />
            <TextField id="store-email" label="Contact email" type="email" value={form.contactEmail} error={error.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            <TextField id="store-phone" label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} inputClassName="font-mono" />
            <TextField id="store-gstin" label="GSTIN" value={form.gstin} error={error.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} inputClassName="font-mono" />
            <TextareaField id="store-address" label="Registered address" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} className="sm:col-span-2" />
          </div>
        </Card>

        <Card title="Email notifications">
          <div className="flex flex-col gap-3 p-4 pt-3 text-13">
            {[
              ["lowStockEmail", "Low stock", "When a product drops below its alert level"],
              ["newInquiryEmail", "New inquiries", "When a corporate or made-to-order request arrives"],
              ["dailySummary", "Daily summary", "Yesterday's orders, revenue and visitors at 9 am IST"],
            ].map(([field, label, hint]) => (
              <label key={field} className="flex items-start gap-2.5">
                <Checkbox checked={form[field]} onChange={(e) => set(field, e.target.checked)} className="mt-0.5" />
                <span>
                  {label}
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card
          title="Team"
          action={
            <Button variant="secondary" size="sm" onClick={() => setInviting(true)}>
              <UserPlus aria-hidden="true" />
              Invite
            </Button>
          }
        >
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {store.team.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-13">
                <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-bg text-xs font-medium" aria-hidden="true">
                  {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{member.name}</span>
                  <span className="block truncate text-xs text-muted">{member.email}</span>
                </span>
                {member.status === "invited" ? <Badge tone="warning">Invited</Badge> : null}
                <Badge tone={member.role === "super_admin" ? "brand" : "neutral"}>{ROLE_LABELS[member.role]}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Prototype data">
          <div className="flex flex-col items-start gap-3 p-4 pt-2 text-13 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">Products you added or imported, stock edits and status changes are kept in this browser. Reset to start from the seeded data again.</p>
            <Button variant="secondary" onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden="true" />
              Reset prototype data
            </Button>
          </div>
        </Card>
      </div>

      {inviting ? <InviteModal onClose={() => setInviting(false)} /> : null}

      {confirmReset ? (
        <Modal
          title="Reset prototype data?"
          size="sm"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="critical"
                onClick={() => {
                  resetOverlay();
                  setConfirmReset(false);
                  toast("Prototype data reset");
                }}
              >
                Reset data
              </Button>
            </>
          }
        >
          <p className="p-4 text-sm">Everything you changed in this prototype will be removed from this browser. The seeded orders, products and inquiries stay.</p>
        </Modal>
      ) : null}
    </Page>
  );
}

function InviteModal({ onClose }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");

  function invite() {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a name and a valid email");
      return;
    }
    saveMockRecord("team", { name: name.trim(), email: email.trim().toLowerCase(), role, status: "invited" });
    toast(`Invite sent to ${email.trim()}`);
    onClose();
  }

  return (
    <Modal
      title="Invite a team member"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={invite}>Send invite</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <TextField id="invite-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField id="invite-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <SelectField
          id="invite-role"
          label="Role"
          value={role}
          onValueChange={setRole}
          options={[
            { value: "admin", label: "Admin · catalogue, orders and inquiries" },
            { value: "staff", label: "Staff · day-to-day fulfilment" },
          ]}
        />
        {error ? <p role="alert" className="text-13 text-critical">{error}</p> : null}
      </div>
    </Modal>
  );
}
