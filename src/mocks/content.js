/**
 * Storefront content for the prototype: banners, gift options, the team and
 * store settings. Small, hand-written lists — the screens edit them through
 * the overlay store like everything else.
 */

export const BANNER_PLACEMENTS = [
  { value: "home_hero", label: "Home · hero" },
  { value: "home_strip", label: "Home · strip" },
  { value: "category", label: "Category page" },
];

export const BANNER_COLOURS = ["#7e0917", "#1f5c3f", "#2e3a7a", "#c99a2e", "#1d1716", "#b7410e"];

export const BASE_BANNERS = [
  { id: "b-1", name: "Diwali Gifting 2026", headline: "Gifts woven for Diwali", placement: "home_hero", link: "/collections/diwali-gifting", colour: "#7e0917", startsOn: "2026-10-01", endsOn: "2026-11-10", published: true, order: 1 },
  { id: "b-2", name: "Corporate gift boxes", headline: "Corporate boxes from 20 to 500 people", placement: "home_strip", link: "/corporate-gifting", colour: "#1d1716", startsOn: "", endsOn: "", published: true, order: 2 },
  { id: "b-3", name: "Wedding season sarees", headline: "Kanjivaram and Banarasi for the wedding season", placement: "home_hero", link: "/collections/wedding-season", colour: "#c99a2e", startsOn: "2026-11-15", endsOn: "2027-01-31", published: true, order: 3 },
  { id: "b-4", name: "Ikat ties for him", headline: "Handwoven ties, gift-boxed", placement: "category", link: "/men/tie", colour: "#2e3a7a", startsOn: "", endsOn: "", published: true, order: 4 },
  { id: "b-5", name: "Raksha Bandhan 2026", headline: "Rakhi gifts for every sibling", placement: "home_hero", link: "/collections/raksha-bandhan", colour: "#b7410e", startsOn: "2026-08-01", endsOn: "2026-08-29", published: true, order: 5 },
  { id: "b-6", name: "New arrivals: Kota Doria", headline: "Air-light Kota Doria for summer", placement: "home_strip", link: "/women/saree?fabric=kota-doria", colour: "#1f5c3f", startsOn: "", endsOn: "", published: false, order: 6 },
];

/** Live, scheduled, ended or draft — from the dates and the publish switch. */
export function bannerState(banner, today) {
  if (!banner.published) return "draft";
  if (banner.startsOn && banner.startsOn > today) return "scheduled";
  if (banner.endsOn && banner.endsOn < today) return "ended";
  return "live";
}

export const BASE_GIFT_OPTIONS = [
  { id: "g-1", type: "packaging", name: "Handwoven jute box", description: "Natural jute box with a cotton tie", price: 25000, colour: "#a67c2e", active: true },
  { id: "g-2", type: "packaging", name: "Silk-lined keepsake box", description: "Hard box lined in raw silk, magnetic lid", price: 45000, colour: "#7e0917", active: true },
  { id: "g-3", type: "packaging", name: "Kalamkari cloth wrap", description: "Reusable hand-painted cotton wrap", price: 18000, colour: "#2e3a7a", active: true },
  { id: "g-4", type: "packaging", name: "Sheesham wood chest", description: "Brass-clasp wooden chest for heirloom pieces", price: 120000, colour: "#5c3a1e", active: false },
  { id: "g-5", type: "card-design", name: "Diwali diyas", description: "Row of lit diyas on maroon", price: 15000, colour: "#7e0917", active: true },
  { id: "g-6", type: "card-design", name: "Marigold toran", description: "Marigold garland across the top", price: 15000, colour: "#e8a33b", active: true },
  { id: "g-7", type: "card-design", name: "Minimal ivory", description: "Plain ivory card with a gold rule", price: 0, colour: "#e9dfc7", active: true },
  { id: "g-8", type: "card-design", name: "Ikat thank you", description: "Ikat pattern band, for corporate gifts", price: 15000, colour: "#1f5f7a", active: true },
  { id: "g-9", type: "card-design", name: "Wedding shehnai", description: "Shehnai and paisley, gold foil", price: 25000, colour: "#c99a2e", active: false },
];

export const BASE_TEAM = [
  { id: "t-1", name: "Ananya Rao", email: "ananya.rao@atulyakarigari.com", role: "super_admin", status: "active" },
  { id: "t-2", name: "Vikram Menon", email: "vikram.menon@atulyakarigari.com", role: "admin", status: "active" },
  { id: "t-3", name: "Pooja Kulkarni", email: "pooja.kulkarni@atulyakarigari.com", role: "staff", status: "active" },
  { id: "t-4", name: "Harsh Gupta", email: "harsh.gupta@atulyakarigari.com", role: "staff", status: "invited" },
];

export const ROLE_LABELS = { super_admin: "Super admin", admin: "Admin", staff: "Staff" };

export const BASE_SETTINGS = {
  storeName: "Atulya Karigari",
  contactEmail: "hello@atulyakarigari.com",
  phone: "+91 98200 41275",
  gstin: "27AAKCA4821M1Z6",
  address: "Unit 14, Weavers' Court, Andheri East, Mumbai, Maharashtra 400069",
  lowStockEmail: true,
  newInquiryEmail: true,
  dailySummary: false,
};
