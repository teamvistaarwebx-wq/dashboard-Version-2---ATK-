"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  House,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Scissors,
  Settings,
  ShoppingBag,
  Warehouse,
} from "lucide-react";
import { useMockStoreOptional } from "@/mocks/store";

/**
 * The left navigation. Badges show unfulfilled orders and new inquiries; they
 * come from the mock store in mock mode and are omitted otherwise (there is no
 * count endpoint to read them from yet).
 */
const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/orders", label: "Orders", icon: ShoppingBag, badge: "orders" },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/made-to-order", label: "Made to order", icon: Scissors },
  { href: "/inquiries", label: "Inquiries", icon: MessageSquare, badge: "inquiries" },
  { href: "/banners", label: "Banners", icon: ImageIcon },
  { href: "/gift-options", label: "Gift options", icon: Gift },
];

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

export function AdminNav({ onNavigate }) {
  const pathname = usePathname();
  const badges = useBadges();

  return (
    <nav aria-label="Admin sections" className="flex h-full w-full flex-col bg-background">
      <ul className="scrollbar-subtle flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} count={item.badge ? badges[item.badge] : undefined} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>

      <div className="border-t border-border p-3">
        <NavLink item={{ href: "/settings", label: "Settings", icon: Settings }} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function NavLink({ item, pathname, count, onNavigate }) {
  const Icon = item.icon;
  // Exact match for Home, prefix match for the rest, so /orders/AKT-… keeps
  // Orders lit.
  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors ${
        active ? "bg-brand-tint font-medium text-brand-text" : "text-foreground hover:bg-neutral-bg"
      }`}
    >
      <Icon className={`size-[18px] shrink-0 ${active ? "" : "text-muted"}`} strokeWidth={2} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {count ? (
        <span
          className={`min-w-5 rounded-md px-1.5 text-center font-mono text-xs leading-5 ${
            active ? "bg-surface text-brand-text" : "bg-neutral-bg text-muted"
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
