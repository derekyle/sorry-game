// Files in public/assets/ are copied into the build verbatim, without the
// content hash that Vite gives the JS/CSS bundle. So when a sprite or audio
// file is replaced its URL doesn't change, and browsers (mobile Safari/Chrome
// especially) go on serving a stale cached copy.
//
// Appending ?v=<BUILD_ID> makes every deploy's asset URLs unique. __BUILD_ID__
// is injected by vite.config.ts and changes on every build; it falls back to
// "dev" when that define isn't present.
declare const __BUILD_ID__: string;

const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

/** URL for a file in public/assets/, cache-busted per build. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}?v=${BUILD_ID}`;
}
