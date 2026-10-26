/**
 * Shared by the server layout and the client theme switch, so it lives in a
 * plain module: a constant exported from a "use client" file would reach the
 * server as a client reference, not as the string.
 */
export const THEME_STORAGE_KEY = "atk-admin-theme";

/** Inline in <head>; applies a saved Light/Dark choice before first paint. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
