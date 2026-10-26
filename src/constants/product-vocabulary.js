/**
 * The fabric types and colours the product drawer suggests.
 *
 * Kept here rather than aggregated back out of the catalogue, which is what
 * this replaced. Deriving the menus from what people had already typed had two
 * costs. The obvious one was speed: every drawer open scanned every product,
 * unwound its specification rows and grouped them, to rebuild two short lists
 * that barely change.
 *
 * The quieter one mattered more. A typo entered once became a permanent
 * suggestion — "Banarsi Silk" would sit in the menu beside "Banarasi Silk"
 * forever, and the next person would pick whichever they landed on first. Two
 * spellings of one fabric then split every filter, every search and every
 * storefront listing that touched it. A vocabulary decided once cannot drift
 * that way.
 *
 * Both lists are SUGGESTIONS, not a closed set. The fields behind them are
 * ordinary text inputs, so anything can still be typed and saved — nobody is
 * stuck at eleven at night because a colour is missing from this file. Add it
 * here afterwards and it joins the menu for everyone.
 *
 * Sorted alphabetically, because that is the order the browser shows them in
 * and the form does no sorting of its own.
 */

/** Fabric or material. Covers jewellery and footwear as well as cloth. */
export const PRODUCT_TYPES = [
  "Art Silk",
  "Banarasi Silk",
  "Beaded",
  "Bhagalpuri Silk",
  "Chanderi Silk",
  "Chiffon",
  "Crepe",
  "Georgette",
  "Handloom Cotton",
  "Handloom Linen",
  "Jacquard",
  "Jute Silk",
  "Kanjivaram Silk",
  "Khadi Cotton",
  "Kota Doria",
  "Kundan",
  "Leather",
  "Maheshwari Silk",
  "Meenakari",
  "Muslin",
  "Mysore Silk",
  "Organza",
  "Oxidised Silver",
  "Sambalpuri Cotton",
  "Satin",
  "Terracotta",
  "Tussar Silk",
];

/**
 * Named shades rather than a colour picker: this ends up as a specification
 * row a customer reads, and "Rust Orange" tells them something "#B7410E" does
 * not.
 */
export const PRODUCT_COLOURS = [
  "Beige",
  "Black",
  "Bottle Green",
  "Cream",
  "Gold",
  "Indigo",
  "Ivory",
  "Lavender",
  "Maroon",
  "Mint Green",
  "Mustard Yellow",
  "Navy Blue",
  "Off White",
  "Olive",
  "Peach",
  "Pink",
  "Powder Blue",
  "Purple",
  "Red",
  "Rust Orange",
  "Sea Green",
  "Silver",
  "Sky Blue",
  "Teal",
  "Turquoise",
  "White",
  "Wine",
  "Yellow",
];
