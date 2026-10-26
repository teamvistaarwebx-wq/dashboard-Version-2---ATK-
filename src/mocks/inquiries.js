import { addDays, dayStart, daysBetween, festiveLift } from "./calendar";
import { MADE_TO_ORDER_PRODUCTS } from "./catalog";
import { COMPANIES, makePhone, OCCASIONS, pickState } from "./people";
import { pick, pickWeighted, randInt, rngFor, roundTo } from "./rng";

/**
 * Corporate gifting and made-to-order enquiries, 1–4 a day with a festive
 * lift. Same fields as the Inquiry model; budget in paise.
 */

const EPOCH = "2024-09-01";

const CONTACTS = [
  "Neha Kulkarni", "Rajiv Menon", "Shalini Iyer", "Arvind Rao", "Fatima Sheikh",
  "Deepak Chopra", "Kiran Bedi", "Sunita Hegde", "Mohan Pillai", "Ayesha Khan",
  "Rakesh Agarwal", "Preeti Malhotra", "Sanjay Ghosh", "Leena D'Souza", "Vivek Saxena",
  "Anita Banerjee", "Harish Nair", "Swati Desai", "Imran Qureshi", "Geeta Reddy",
];

/** Corporate enquiries cluster where the offices are. */
const CORPORATE_STATE_WEIGHTS = [
  ["Maharashtra", 20], ["Karnataka", 18], ["Delhi", 16], ["Haryana", 9],
  ["Telangana", 9], ["Tamil Nadu", 8], ["Uttar Pradesh", 6], ["Gujarat", 5],
  ["West Bengal", 4], ["Kerala", 2], ["Rajasthan", 2], ["Punjab", 1],
];

function statusForAge(rng, age) {
  if (age < 2) return pickWeighted(rng, [["new", 82], ["contacted", 18]]);
  if (age < 7) return pickWeighted(rng, [["new", 18], ["contacted", 45], ["quoted", 37]]);
  if (age < 30) return pickWeighted(rng, [["contacted", 12], ["quoted", 33], ["won", 33], ["lost", 22]]);
  return pickWeighted(rng, [["won", 56], ["lost", 44]]);
}

function makeInquiry(key, index, age) {
  const rng = rngFor("inquiry", key, index);
  const madeToOrder = rng() < 0.25;
  const [companyName, homeState] = pick(rng, COMPANIES);
  const state = rng() < 0.7 ? homeState : pickState(rng, CORPORATE_STATE_WEIGHTS);
  const contactName = pick(rng, CONTACTS);
  const domain = `${companyName.toLowerCase().replace(/[^a-z]+/g, "")}.in`;

  const product = madeToOrder ? pick(rng, MADE_TO_ORDER_PRODUCTS) : null;
  const headcount = madeToOrder ? randInt(rng, 10, 120) : roundTo(randInt(rng, 20, 500), 5);
  const perHead = madeToOrder
    ? product.price / 100
    : pickWeighted(rng, [[1200, 3], [2000, 4], [3500, 3], [5000, 1.5]]);
  const budget = roundTo(headcount * perHead * (0.8 + rng() * 0.4), 5000) * 100;

  const hour = randInt(rng, 9, 21);
  const createdAt = new Date(dayStart(key).getTime() + (hour * 60 + randInt(rng, 0, 59)) * 60000);
  const year = key.slice(0, 4);

  return {
    id: `ENQ-${year}-${200000 + daysBetween(EPOCH, key) * 8 + index}`,
    inquiryNumber: `AKT-ENQ-${year}-${200000 + daysBetween(EPOCH, key) * 8 + index}`,
    dayKey: key,
    createdAt: createdAt.toISOString(),
    source: madeToOrder ? "made_to_order" : "corporate_form",
    type: madeToOrder ? "Made to order" : "Corporate box",
    companyName,
    contactName,
    email: `${contactName.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}@${domain}`,
    phone: makePhone(rng),
    state,
    headcount,
    budget,
    occasion: pickWeighted(rng, OCCASIONS),
    neededBy: addDays(key, randInt(rng, 14, 60)),
    product: product ? { id: product.id, title: product.title, sku: product.sku } : null,
    message: madeToOrder
      ? `We'd like ${headcount} pieces of the ${product.title} with our logo woven into the border. Can you share lead time and pricing?`
      : `Looking for ${headcount} gift boxes for ${companyName}. Mix of sarees and ties preferred, with a printed card carrying our logo.`,
    status: statusForAge(rng, age),
  };
}

export function inquiryCountForDay(key) {
  const rng = rngFor("inquiry-count", key);
  const base = pickWeighted(rng, [[1, 3], [2, 4], [3, 2.5], [4, 1]]);
  return Math.min(6, Math.round(base * festiveLift(key)));
}

export function inquiriesForDay(key, age, until) {
  const list = [];
  const count = inquiryCountForDay(key);

  for (let index = 0; index < count; index += 1) {
    const inquiry = makeInquiry(key, index, age);
    if (until && new Date(inquiry.createdAt) > until) continue;
    list.push(inquiry);
  }

  return list;
}
