import { formatDate } from "@/lib/format";
import { subcategoryLabel } from "./catalog";

/**
 * Global search over the mock store: products by title or SKU, orders by
 * number, customer, phone or email, inquiries by company, contact or number.
 */
const PER_GROUP = 4;

export function searchMock(store, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const digits = query.replace(/\D/g, "");
  const results = [];

  const products = store.products
    .filter((p) => p.title.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
    .slice(0, PER_GROUP);
  for (const p of products) {
    results.push({
      group: "Products",
      id: `product-${p.id}`,
      href: `/products/${p.id}`,
      title: p.title,
      meta: `${p.sku} · ${subcategoryLabel(p.subcategory)}`,
      product: p,
    });
  }

  const orders = [];
  for (const order of store.orders) {
    if (orders.length >= PER_GROUP) break;
    const phoneDigits = order.contact.phone.replace(/\D/g, "");
    if (
      order.orderNumber.toLowerCase().includes(query) ||
      order.contact.fullName.toLowerCase().includes(query) ||
      order.contact.email.includes(query) ||
      (digits.length >= 4 && phoneDigits.includes(digits))
    ) {
      orders.push(order);
    }
  }
  for (const order of orders) {
    results.push({
      group: "Orders",
      id: `order-${order.id}`,
      href: `/orders/${order.orderNumber}`,
      title: order.orderNumber,
      meta: `${order.contact.fullName} · ${order.address.city}`,
      mono: true,
    });
  }

  const inquiries = [];
  for (const inquiry of store.inquiries) {
    if (inquiries.length >= PER_GROUP) break;
    if (
      inquiry.companyName.toLowerCase().includes(query) ||
      inquiry.contactName.toLowerCase().includes(query) ||
      inquiry.inquiryNumber.toLowerCase().includes(query)
    ) {
      inquiries.push(inquiry);
    }
  }
  for (const inquiry of inquiries) {
    results.push({
      group: "Inquiries",
      id: `inquiry-${inquiry.id}`,
      href: `/inquiries/${inquiry.id}`,
      title: inquiry.companyName,
      meta: `${inquiry.contactName} · ${inquiry.type} · ${formatDate(inquiry.createdAt)}`,
    });
  }

  return results;
}
