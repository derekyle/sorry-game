import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// Served from https://<user>.github.io/sorry-game/ by the GitHub Pages
// workflow, so assets need to resolve under that subpath.
export default defineConfig({
  base: "/sorry-game/",
  define: {
    // Changes on every build, so per-build asset URLs are unique (see
    // src/game/assets.ts) and mobile browsers can't serve stale public/ files.
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  plugins: [
    // Recompresses images at build time (dist/ only — dev serves the originals
    // untouched). Runs over both bundled assets and everything in public/.
    // Anything that doesn't actually get smaller is left as-is.
    ViteImageOptimizer({
      // PNGs only — leaves favicon.svg alone (SVG would need the `svgo` package).
      test: /\.png$/i,
      png: {
        // Palette quantisation + max zlib effort. Near-lossless for the flat
        // colours and hard edges in this game's art, but big wins on the
        // 24-bit title/win signs.
        palette: true,
        quality: 90,
        compressionLevel: 9,
        effort: 10,
      },
    }),
  ],
});
