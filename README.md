# Sorry Town

A mobile-first, browser-based game with pixel art styled after the Game Boy
Advance-era Pokémon titles.

**Phase 1** ships a small pixel art town you can explore: tap anywhere
walkable and your character pathfinds and walks there, tile by tile.

## Stack

- **[Phaser 3/4](https://phaser.io/)** — the game engine. It's purpose-built
  for exactly this kind of 2D tile game (tilemaps, camera-follow, tweened
  movement, pointer/touch input) and ships a small, fast static bundle —
  a good fit for GitHub Pages.
- **[Vite](https://vitejs.dev/)** + **TypeScript** — dev server and bundler.
- No external art assets: the pixel art (tiles + character) is generated at
  runtime from `Phaser.Graphics`, so there's nothing to author in an image
  editor to get started — see `src/game/textures.ts`.

## Project layout

```
src/
  game/
    config.ts        tile size, map size, tile type enum, movement tuning
    townMap.ts        the town's tile grid layout
    textures.ts       procedural pixel art (tiles + player walk frames)
    pathfinding.ts    grid BFS used for tap-to-move
    Player.ts         tile-by-tile movement/animation controller
    createGame.ts      Phaser game bootstrap
  scenes/
    TownScene.ts       builds the map, player, camera, and tap input
  main.ts
  style.css            mobile-first full-viewport styling
```

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL — resize your browser or use device emulation to
check the mobile layout. Tap/click a walkable tile (grass, path, flowers,
doorway) to walk there; obstacles (trees, water, walls) block movement and
are routed around automatically.

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages
on every push to `main`. In the repo settings, set **Pages → Source** to
**GitHub Actions** once.

`vite.config.ts` sets `base: "/sorry-game/"` to match this repo's Pages URL
(`https://<user>.github.io/sorry-game/`). If the repo is ever renamed, update
`base` to match.
