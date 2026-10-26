"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  Gift,
  House,
  Image as ImageIcon,
  LogOut,
  MessageSquare,
  Package,
  Scissors,
  Settings,
  ShoppingBag,
  Warehouse,
  X,
} from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { useMockStoreOptional } from "@/mocks/store";

/**
 * The sidebar: wordmark, the sections in labelled groups, and the signed-in
 * admin at the foot. Badges show unfulfilled orders and new inquiries; they
 * come from the mock store in mock mode and are omitted otherwise (there is no
 * count endpoint to read them from yet).
 */
export const NAV_GROUPS = [
  {
    items: [{ href: "/", label: "Home", icon: House }],
  },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingBag, badge: "orders" },
      { href: "/inquiries", label: "Inquiries", icon: MessageSquare, badge: "inquiries" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Warehouse },
      { href: "/made-to-order", label: "Made to order", icon: Scissors },
      { href: "/gift-options", label: "Gift options", icon: Gift },
    ],
  },
  {
    label: "Storefront",
    items: [{ href: "/banners", label: "Banners", icon: ImageIcon }],
  },
];

export const SETTINGS_ITEM = { href: "/settings", label: "Settings", icon: Settings };

/** Exact match for Home, prefix match for the rest, so /orders/AKT-… keeps Orders lit. */
export function isActive(href, pathname) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function useBadges() {
  const store = useMockStoreOptional();
  if (!store) return {};

  let orders = 0;
  for (const order of store.orders) {
    if (order.status === "paid" || order.status === "confirmed") orders += 1;
  }
  const inquiries = store.inquiries.filter((inquiry) => inquiry.status === "new").length;
  return { orders, inquiries };
}

export function AdminNav({ session, storeName, signOutAction, onNavigate, onClose }) {
  const pathname = usePathname();
  const badges = useBadges();

  return (
    <nav aria-label="Admin sections" className="flex h-full w-full flex-col bg-canvas">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-md"
          aria-label={`${storeName} admin home`}
        >
          <span aria-hidden="true" className="logo-mark block h-7 w-[124px] shrink-0" />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="rounded-md border border-border-strong/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Admin
          </span>
        )}
      </div>

      <div className="scrollbar-subtle flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-3 pt-2">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label ? (
              <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle">{group.label}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    pathname={pathname}
                    count={item.badge ? badges[item.badge] : undefined}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-3 pb-3">
        <NavLink item={SETTINGS_ITEM} pathname={pathname} onNavigate={onNavigate} />
        {session ? <AccountMenu session={session} signOutAction={signOutAction} /> : null}
      </div>
    </nav>
  );
}

function NavLink({ item, pathname, count, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(item.href, pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`group flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition-colors ${
        active
          ? "bg-surface font-medium text-foreground shadow-raised"
          : "text-muted hover:bg-neutral-bg hover:text-foreground"
      }`}
    >
      <Icon
        className={`size-[18px] shrink-0 ${active ? "text-brand-text" : "text-subtle group-hover:text-foreground"}`}
        strokeWidth={active ? 2.1 : 1.9}
        aria-hidden="true"
      />
      <span className="flex-1 truncate">{item.label}</span>
      {count ? (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums ${
            active ? "bg-brand text-white" : "bg-brand-tint text-brand-text"
          }`}
        >
          <span className="sr-only">, </span>
          {count}
          <span className="sr-only"> {item.badge === "orders" ? "unfulfilled" : "new"}</span>
        </span>
      ) : null}
    </Link>
  );
}

function AccountMenu({ session, signOutAction }) {
  const name = session.name || session.email;
  const role = session.role.replace(/_/g, " ");

  return (
    <Menu
      label="Account"
      align="start"
      placement="top"
      menuClassName="w-full"
      rootClassName="w-full"
      buttonClassName="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface p-2 text-left shadow-card transition hover:border-border-strong"
      buttonContent={
        <>
          <Avatar name={name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-13 font-medium text-foreground">{name}</span>
            <span className="block truncate text-xs capitalize text-muted">{role}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-subtle" aria-hidden="true" />
        </>
      }
      header={
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted">{session.email}</p>
          </div>
        </div>
      }
      items={[
        { separator: true },
        { label: "Account settings", href: "/settings", icon: <Settings aria-hidden="true" /> },
        { separator: true },
        signOutAction
          ? { label: "Log out", action: signOutAction, icon: <LogOut aria-hidden="true" />, tone: "critical" }
          : { label: "Log out", disabled: true, hint: "Mock mode", icon: <LogOut aria-hidden="true" />, tone: "critical" },
      ]}
    />
  );
}

export function Avatar({ name, className = "" }) {
  const initials = String(name)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <span
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-semibold text-gold-foreground ring-2 ring-surface ${className}`}
    >
      {initials}
    </span>
  );
}
