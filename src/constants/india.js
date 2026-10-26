/**
 * States and union territories of India.
 *
 * Duplicated from aktgifting/src/constants/india.js on purpose: the admin
 * validates what it stores rather than trusting the storefront's dropdown,
 * and static reference data is a fair thing to copy. Keep the two in sync.
 *
 * Original note, alphabetical within each group.
 *
 * Kept as plain strings because that is what the Order schema stores — a
 * shipping label needs the name, not a code. Grouped so the dropdown puts
 * the 28 states ahead of the 8 union territories.
 */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const INDIAN_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/** Flat list for validating whatever the form submits. */
export const ALL_INDIAN_STATES = [
  ...INDIAN_STATES,
  ...INDIAN_UNION_TERRITORIES,
];
