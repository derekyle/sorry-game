import { defineConfig } from "vite";

// Served from https://<user>.github.io/sorry-game/ by the GitHub Pages
// workflow, so assets need to resolve under that subpath.
export default defineConfig({
  base: "/sorry-game/",
});
