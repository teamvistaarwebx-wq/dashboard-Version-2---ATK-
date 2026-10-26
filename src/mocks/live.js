import { CITIES, STATE_WEIGHTS } from "./people";
import { randFloat, rngFor } from "./rng";
import { hourlyVisitors } from "./traffic";

/**
 * The "Live" card: people on the storefront right now.
 *
 * The first frame is derived from the hour's traffic and seeded, so the
 * server render and the browser agree. After that the card nudges each number
 * with a small random walk every few seconds — enough to look alive, never
 * enough to jump.
 */

const CITY_WEIGHTS = (() => {
  const list = [];
  for (const [state, stateWeight] of STATE_WEIGHTS) {
    const cities = CITIES[state] ?? [];
    const total = cities.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [city, weight] of cities) list.push([city, (stateWeight * weight) / total]);
  }
  return list.toSorted((a, b) => b[1] - a[1]);
})();

export function initialLive(world) {
  const { todayKey, clock } = world;
  const rng = rngFor("live", todayKey, clock.hour, clock.minute);
  const perMinute = hourlyVisitors(todayKey)[clock.hour] / 60;

  // Sessions active in the last half hour count as "right now".
  const visitors = Math.max(6, Math.round(perMinute * 30 * randFloat(rng, 1, 1.25)));
  const since = world.now.getTime() - 30 * 60 * 1000;
  const purchased = (world.ordersByDay.get(todayKey) ?? []).filter(
    (order) => new Date(order.createdAt).getTime() >= since && order.status !== "pending_payment"
  ).length;

  const history = [];
  let level = visitors * 0.85;
  for (let index = 0; index < 29; index += 1) {
    level = Math.max(3, level + randFloat(rng, -2, 2.4));
    history.push(Math.round(level));
  }
  history.push(visitors);

  return {
    visitors,
    carts: Math.max(1, Math.round(visitors * randFloat(rng, 0.18, 0.26))),
    checkout: Math.max(1, Math.round(visitors * randFloat(rng, 0.05, 0.09))),
    purchased: Math.max(purchased, 1),
    history,
    cities: splitCities(visitors, rng),
  };
}

function splitCities(visitors, rng) {
  return CITY_WEIGHTS.slice(0, 8)
    .map(([city, weight]) => [city, Math.round((visitors * weight * randFloat(rng, 0.75, 1.25)) / 100)])
    .filter(([, count]) => count > 0)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function walk(value, step, min) {
  const delta = Math.round((Math.random() - 0.5) * 2 * step);
  return Math.max(min, value + delta);
}

/** One tick of the random walk. Uses Math.random — client-side only. */
export function stepLive(state) {
  const visitors = walk(state.visitors, Math.max(1, state.visitors * 0.08), 3);
  const carts = Math.min(visitors, walk(state.carts, 1, 0));
  const checkout = Math.min(carts, walk(state.checkout, 1, 0));
  const purchased = Math.random() < 0.12 ? state.purchased + 1 : state.purchased;

  return {
    visitors,
    carts,
    checkout,
    purchased,
    history: [...state.history.slice(1), visitors],
    cities: splitCities(visitors, Math.random),
  };
}
