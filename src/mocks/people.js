import { pick, pickWeighted, randInt } from "./rng";

/**
 * Who buys, who enquires, and where they are. Every name and company here is
 * made up.
 */

/** Share of traffic by state. The tail is grouped as everything after Kerala. */
export const STATE_WEIGHTS = [
  ["Maharashtra", 18],
  ["Delhi", 14],
  ["Karnataka", 12],
  ["Uttar Pradesh", 8.5],
  ["Tamil Nadu", 8],
  ["Telangana", 7],
  ["West Bengal", 6],
  ["Gujarat", 5.5],
  ["Rajasthan", 4],
  ["Haryana", 4],
  ["Kerala", 3.5],
  ["Punjab", 2.2],
  ["Madhya Pradesh", 2],
  ["Andhra Pradesh", 1.6],
  ["Odisha", 1.1],
  ["Bihar", 0.9],
  ["Assam", 0.7],
  ["Goa", 0.6],
  ["Chandigarh", 0.4],
];

export const STATES = STATE_WEIGHTS.map(([state]) => state);

export const CITIES = {
  Maharashtra: [["Mumbai", 6], ["Pune", 3], ["Nagpur", 1]],
  Delhi: [["New Delhi", 1]],
  Karnataka: [["Bengaluru", 8], ["Mysuru", 1]],
  "Uttar Pradesh": [["Noida", 3], ["Lucknow", 3], ["Varanasi", 1]],
  "Tamil Nadu": [["Chennai", 5], ["Coimbatore", 2]],
  Telangana: [["Hyderabad", 1]],
  "West Bengal": [["Kolkata", 1]],
  Gujarat: [["Ahmedabad", 3], ["Surat", 2], ["Vadodara", 1]],
  Rajasthan: [["Jaipur", 3], ["Udaipur", 1]],
  Haryana: [["Gurugram", 4], ["Faridabad", 1]],
  Kerala: [["Kochi", 2], ["Thiruvananthapuram", 1]],
  Punjab: [["Ludhiana", 1], ["Amritsar", 1]],
  "Madhya Pradesh": [["Indore", 2], ["Bhopal", 1]],
  "Andhra Pradesh": [["Visakhapatnam", 1], ["Vijayawada", 1]],
  Odisha: [["Bhubaneswar", 1]],
  Bihar: [["Patna", 1]],
  Assam: [["Guwahati", 1]],
  Goa: [["Panaji", 1]],
  Chandigarh: [["Chandigarh", 1]],
};

const PINCODE_PREFIX = {
  Maharashtra: "4", Delhi: "110", Karnataka: "56", "Uttar Pradesh": "2",
  "Tamil Nadu": "60", Telangana: "50", "West Bengal": "70", Gujarat: "38",
  Rajasthan: "30", Haryana: "12", Kerala: "68", Punjab: "14",
  "Madhya Pradesh": "45", "Andhra Pradesh": "52", Odisha: "75", Bihar: "80",
  Assam: "78", Goa: "403", Chandigarh: "160",
};

const FIRST_NAMES = [
  "Aarav", "Ananya", "Vihaan", "Diya", "Arjun", "Isha", "Kabir", "Meera",
  "Rohan", "Priya", "Aditya", "Kavya", "Siddharth", "Nisha", "Rahul", "Sneha",
  "Vikram", "Pooja", "Karan", "Riya", "Nikhil", "Tanvi", "Aman", "Shreya",
  "Varun", "Neha", "Harsh", "Aditi", "Manish", "Lakshmi", "Suresh", "Divya",
  "Farhan", "Zoya", "Gurpreet", "Simran", "Joseph", "Anjali", "Pranav", "Ira",
];

const LAST_NAMES = [
  "Sharma", "Iyer", "Patel", "Reddy", "Nair", "Gupta", "Menon", "Singh",
  "Kulkarni", "Banerjee", "Rao", "Mehta", "Chatterjee", "Joshi", "Pillai",
  "Agarwal", "Desai", "Khan", "Verma", "Bhat", "Das", "Kapoor", "Mishra",
  "Shetty", "Fernandes", "Ghosh", "Saxena", "Chopra", "Hegde", "Malhotra",
];

const EMAIL_DOMAINS = [["gmail.com", 7], ["yahoo.co.in", 1], ["outlook.com", 2], ["hotmail.com", 0.5]];

const STREETS = [
  "MG Road", "Station Road", "Main Road", "Civil Lines", "Ashok Nagar",
  "Model Town", "Gandhi Nagar", "Nehru Road", "Lake View Road", "Temple Street",
  "Church Road", "Market Road", "2nd Cross Road", "Sector 21", "Park Avenue",
];

const BUILDINGS = [
  "Sunrise Residency", "Lotus Apartments", "Green Acres", "Shanti Kunj",
  "Palm Grove", "Sai Darshan", "Prestige Towers", "Silver Oak", "Kaveri Enclave",
];

export function pickState(rng, weights = STATE_WEIGHTS) {
  return pickWeighted(rng, weights);
}

export function pickCity(rng, state) {
  return pickWeighted(rng, CITIES[state] ?? [[state, 1]]);
}

export function makePincode(rng, state) {
  const prefix = PINCODE_PREFIX[state] ?? "1";
  let code = prefix;
  while (code.length < 6) code += String(randInt(rng, 0, 9));
  return code;
}

export function makePhone(rng) {
  const first = pick(rng, ["98", "99", "97", "96", "95", "93", "91", "88", "87", "70", "81"]);
  const rest = String(randInt(rng, 10000000, 99999999));
  return `+91 ${first}${rest.slice(0, 3)} ${rest.slice(3)}`;
}

export function makePerson(rng) {
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const handle = `${first}.${last}`.toLowerCase();
  const suffix = rng() > 0.5 ? String(randInt(rng, 1, 99)) : "";

  return {
    fullName: `${first} ${last}`,
    firstName: first,
    email: `${handle}${suffix}@${pickWeighted(rng, EMAIL_DOMAINS)}`,
    phone: makePhone(rng),
  };
}

export function makeAddress(rng, state) {
  const city = pickCity(rng, state);
  return {
    line1: `${randInt(rng, 1, 18) * 100 + randInt(rng, 1, 12)}, ${pick(rng, BUILDINGS)}`,
    line2: pick(rng, STREETS),
    city,
    state,
    pincode: makePincode(rng, state),
  };
}

/** Companies that ask for corporate gift boxes. All fictional. */
export const COMPANIES = [
  ["Northwind Infotech", "Karnataka"], ["Sahyadri Capital", "Maharashtra"],
  ["Kaveri Pharma", "Karnataka"], ["Indus Ledger Bank", "Maharashtra"],
  ["Lotus Lane Hotels", "Rajasthan"], ["Brightpath Learning", "Delhi"],
  ["Meridian Steelworks", "West Bengal"], ["Ganga Logistics", "Uttar Pradesh"],
  ["Coromandel Textiles", "Tamil Nadu"], ["Deccan Cloudworks", "Telangana"],
  ["Arabian Sea Shipping", "Gujarat"], ["Aravalli Motors", "Haryana"],
  ["Malabar Spice Co.", "Kerala"], ["Nilgiri Tea Estates", "Tamil Nadu"],
  ["Peacock Media", "Maharashtra"], ["Vertex Analytics", "Karnataka"],
  ["Saffron Realty", "Delhi"], ["Konkan Foods", "Maharashtra"],
  ["Bluefin Fintech", "Karnataka"], ["Charminar Health", "Telangana"],
  ["Hooghly Paper Mills", "West Bengal"], ["Sabarmati Chemicals", "Gujarat"],
  ["Pink City Jewels", "Rajasthan"], ["Cyber Gurgaon Labs", "Haryana"],
  ["Marina Consulting", "Tamil Nadu"], ["Yamuna Power", "Delhi"],
  ["Shivalik Ventures", "Punjab"], ["Narmada Cement", "Madhya Pradesh"],
  ["Bay of Bengal Seafoods", "Odisha"], ["Western Ghats Coffee", "Karnataka"],
  ["Orchid Wealth Partners", "Maharashtra"], ["Tirupati Infra", "Andhra Pradesh"],
  ["Kamrup Silk House", "Assam"], ["Seashell Resorts", "Goa"],
  ["Capital Law Associates", "Delhi"], ["Monsoon Design Studio", "Maharashtra"],
  ["Silicon Plateau Systems", "Karnataka"], ["Golden Temple Exports", "Punjab"],
  ["Lucknow Chikan Works", "Uttar Pradesh"], ["Kutch Salt & Minerals", "Gujarat"],
];

export const OCCASIONS = [
  ["Diwali gifting", 5], ["Year-end client gifts", 3], ["Employee onboarding kits", 2],
  ["Annual day", 1.5], ["Client appreciation", 2], ["Wedding favours", 1.5],
  ["Raksha Bandhan", 1], ["Leadership offsite", 1],
];
