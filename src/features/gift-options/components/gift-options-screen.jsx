"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ROW_LINK, TableScroll, TBODY, TD, TH, THEAD } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/format";
import { saveMockRecord, useMockStore } from "@/mocks/store";

/**
 * Box-level add-ons offered at checkout: packaging and greeting-card designs.
 */
const TABS = [
  { value: "packaging", label: "Packaging" },
  { value: "card-design", label: "Card designs" },
];

export function GiftOptionsScreen() {
  const store = useMockStore();
  const [type, setType] = useState("packaging");
  const [editing, setEditing] = useState(null);

  const tabs = TABS.map((t) => ({ ...t, count: store.giftOptions.filter((g) => g.type === t.value).length }));
  const rows = store.giftOptions.filter((g) => g.type === type);

  return (
    <Page
      title="Gift options"
      actions={
        <Button onClick={() => setEditing({ type, name: "", description: "", price: 0, colour: "#7e0917", active: true })}>
          <Plus aria-hidden="true" />
          Add {type === "packaging" ? "packaging" : "card design"}
        </Button>
      }
    >
      <Card>
        <div className="border-b border-border px-4">
          <Tabs label="Gift option type" tabs={tabs} value={type} controls="gift-options-table" onChange={setType} />
        </div>
        <div id="gift-options-table">
          <TableScroll minWidth="40rem">
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Option</th>
                <th scope="col" className={`${TH} text-right`}>Price</th>
                <th scope="col" className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {rows.map((option) => (
                <tr key={option.id} onClick={() => setEditing(option)} className={ROW_LINK}>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="size-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: option.colour }} />
                      <div className="min-w-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(option); }} className="block truncate text-left font-medium hover:underline">
                          {option.name}
                        </button>
                        <span className="block truncate text-xs text-muted">{option.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className={`${TD} text-right font-mono tabular-nums`}>{option.price ? formatINR(option.price) : "Free"}</td>
                  <td className={TD}>
                    <Badge tone={option.active ? "success" : "neutral"} dot>{option.active ? "Offered" : "Hidden"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableScroll>
        </div>
      </Card>

      {editing ? <GiftOptionDrawer option={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  );
}

function GiftOptionDrawer({ option, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...option, price: option.price ? String(option.price / 100) : "0" });
  const [error, setError] = useState("");
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function save(event) {
    event.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) return setError("Enter a name");
    if (!Number.isFinite(price) || price < 0) return setError("Enter a price of ₹0 or more");
    saveMockRecord("giftOptions", { ...form, name: form.name.trim(), price: Math.round(price * 100) });
    toast(option.id ? "Gift option saved" : "Gift option added");
    onClose();
  }

  return (
    <Drawer title={option.id ? "Edit gift option" : "Add gift option"} onClose={onClose}>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <TextField id="gift-name" label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          <TextareaField id="gift-description" label="Description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          <TextField id="gift-price" label="Price" prefix="₹" inputMode="decimal" value={form.price} hint="₹0 shows as Free at checkout" onChange={(e) => set("price", e.target.value)} inputClassName="font-mono" />
          <label className="flex items-start gap-2.5 text-13">
            <Checkbox checked={form.active} onChange={(e) => set("active", e.target.checked)} className="mt-0.5" />
            <span>
              Offer at checkout
              <span className="block text-xs text-muted">Hidden options stay on past orders.</span>
            </span>
          </label>
          {error ? <p role="alert" className="text-13 text-critical">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Drawer>
  );
}
