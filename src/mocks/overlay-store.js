/**
 * Changes made while clicking through the prototype — products added or
 * imported, stock counts edited, statuses moved — kept in localStorage on top
 * of the generated data, so they survive navigation and refresh.
 *
 * A tiny external store for useSyncExternalStore: the server snapshot is
 * always empty, so the first client render matches the server HTML and the
 * saved changes apply on the render straight after hydration.
 */

const STORAGE_KEY = "atk-admin-mock-v1";

export const EMPTY_OVERLAY = Object.freeze({
  products: {},
  newProductIds: [],
  importedIds: [],
  inventory: {},
  movements: [],
  orderStatus: {},
  inquiryStatus: {},
  /** Edited or added banners, gift options and team members, by collection then id. */
  records: {},
  settings: null,
});

let snapshot = null;
const listeners = new Set();

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_OVERLAY, ...JSON.parse(raw) } : EMPTY_OVERLAY;
  } catch {
    return EMPTY_OVERLAY;
  }
}

export function getOverlay() {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getServerOverlay() {
  return EMPTY_OVERLAY;
}

export function subscribeOverlay(listener) {
  listeners.add(listener);

  // Another tab editing the same prototype.
  function onStorage(event) {
    if (event.key !== STORAGE_KEY) return;
    snapshot = read();
    listener();
  }
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateOverlay(updater) {
  snapshot = updater(getOverlay());

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked (private window): the change still applies for
    // this session, it just will not survive a refresh.
  }

  for (const listener of listeners) listener();
}

export function resetOverlay() {
  updateOverlay(() => EMPTY_OVERLAY);
}
