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
import { SelectField } from "@/components/ui/select-field";
import { Tabs } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { formatIstDate } from "@/lib/format";
import { BANNER_COLOURS, BANNER_PLACEMENTS, bannerState } from "@/mocks/content";
import { saveMockRecord, useMockStore } from "@/mocks/store";

const STATE_BADGE = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "warning" },
  ended: { label: "Ended", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ended", label: "Ended" },
  { value: "draft", label: "Draft" },
];

function placementLabel(value) {
  return BANNER_PLACEMENTS.find((p) => p.value === value)?.label ?? value;
}

function schedule(banner) {
  if (!banner.startsOn && !banner.endsOn) return "Always on";
  return `${banner.startsOn ? formatIstDate(banner.startsOn) : "Now"} – ${banner.endsOn ? formatIstDate(banner.endsOn) : "No end"}`;
}

/** Dark text on light backgrounds (gold), white on the rest. */
function isLight(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function BannerTile({ banner, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex items-end overflow-hidden rounded-lg px-2 py-1.5 font-medium leading-tight ${
        isLight(banner.colour) ? "text-[#1c1a19]" : "text-white"
      } ${className}`}
      style={{ backgroundColor: banner.colour }}
    >
      <span className="line-clamp-2">{banner.headline}</span>
    </span>
  );
}

export function BannersScreen() {
  const store = useMockStore();
  const [tab, setTab] = useState("all");
  const [editing, setEditing] = useState(null);
  const today = store.world.todayKey;

  const withState = store.banners.map((banner) => ({ ...banner, state: bannerState(banner, today) }));
  const tabs = TABS.map((t) => ({ ...t, count: t.value === "all" ? withState.length : withState.filter((b) => b.state === t.value).length }));
  const rows = tab === "all" ? withState : withState.filter((b) => b.state === tab);

  return (
    <Page
      title="Banners"
      actions={
        <Button onClick={() => setEditing({ name: "", headline: "", placement: "home_hero", link: "", colour: BANNER_COLOURS[0], startsOn: "", endsOn: "", published: false })}>
          <Plus aria-hidden="true" />
          Add banner
        </Button>
      }
    >
      <Card>
        <div className="border-b border-border px-4">
          <Tabs label="Banner state" tabs={tabs} value={tab} controls="banners-table" onChange={setTab} />
        </div>
        <div id="banners-table">
          <TableScroll minWidth="46rem">
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Banner</th>
                <th scope="col" className={TH}>Placement</th>
                <th scope="col" className={TH}>Schedule</th>
                <th scope="col" className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {rows.map((banner) => {
                const badge = STATE_BADGE[banner.state];
                return (
                  <tr key={banner.id} onClick={() => setEditing(banner)} className={ROW_LINK}>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <BannerTile banner={banner} className="h-10 w-20 shrink-0 text-[10px]" />
                        <div className="min-w-0">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(banner); }} className="block truncate text-left font-medium hover:underline">
                            {banner.name}
                          </button>
                          <span className="block truncate font-mono text-xs text-muted">{banner.link || "No link"}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} text-muted`}>{placementLabel(banner.placement)}</td>
                    <td className={`${TD} whitespace-nowrap text-muted`}>{schedule(banner)}</td>
                    <td className={TD}>
                      <Badge tone={badge.tone} dot>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableScroll>
        </div>
      </Card>

      {editing ? <BannerDrawer banner={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  );
}

function BannerDrawer({ banner, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(banner);
  const [error, setError] = useState("");
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function save(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.headline.trim()) {
      setError("Give the banner a name and a headline");
      return;
    }
    if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
      setError("The end date is before the start date");
      return;
    }
    saveMockRecord("banners", { ...form, name: form.name.trim(), headline: form.headline.trim() });
    toast(banner.id ? "Banner saved" : "Banner added");
    onClose();
  }

  return (
    <Drawer title={banner.id ? "Edit banner" : "Add banner"} onClose={onClose}>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <BannerTile banner={form.headline ? form : { ...form, headline: "Headline preview" }} className="h-28 w-full px-4 py-3 text-lg" />
          <TextField id="banner-name" label="Name" required value={form.name} onChange={(e) => set("name", e.target.value)} hint="Only staff see this" />
          <TextField id="banner-headline" label="Headline" required value={form.headline} onChange={(e) => set("headline", e.target.value)} />
          <SelectField id="banner-placement" label="Placement" value={form.placement} onValueChange={(value) => set("placement", value)} options={BANNER_PLACEMENTS} />
          <TextField id="banner-link" label="Link" value={form.link} placeholder="/collections/diwali-gifting" onChange={(e) => set("link", e.target.value)} inputClassName="font-mono" />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="banner-start" label="Starts" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} inputClassName="font-mono" />
            <TextField id="banner-end" label="Ends" type="date" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} inputClassName="font-mono" />
          </div>
          <fieldset>
            <legend className="mb-2 text-13 font-medium">Background</legend>
            <div className="flex flex-wrap gap-2">
              {BANNER_COLOURS.map((colour) => (
                <label key={colour} className="cursor-pointer">
                  <input type="radio" name="banner-colour" value={colour} checked={form.colour === colour} onChange={() => set("colour", colour)} className="peer sr-only" />
                  <span
                    className="block size-8 rounded-lg border border-border ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring)]"
                    style={{ backgroundColor: colour }}
                  />
                  <span className="sr-only">{colour}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2.5 text-13">
            <Checkbox checked={form.published} onChange={(e) => set("published", e.target.checked)} className="mt-0.5" />
            <span>
              Published
              <span className="block text-xs text-muted">Shows on the storefront between the dates above.</span>
            </span>
          </label>
          {error ? <p role="alert" className="text-13 text-critical">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{banner.id ? "Save banner" : "Add banner"}</Button>
        </div>
      </form>
    </Drawer>
  );
}
