import { defineConfig } from "vite";

// Served from https://<user>.github.io/sorry-game/ by the GitHub Pages
// workflow, so assets need to resolve under that subpath.
export default defineConfig({
  base: "/sorry-game/",
  define: {
    // Changes on every build, so per-build asset URLs are unique (see
    // src/game/assets.ts) and mobile browsers can't serve stale public/ files.
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
});
