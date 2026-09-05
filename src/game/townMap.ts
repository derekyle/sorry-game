import { MAP_HEIGHT, MAP_WIDTH, TileType } from "./config";

function fillRect(
  grid: TileType[][],
  x0: number,
  y0: number,
  w: number,
  h: number,
  tile: TileType,
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
        grid[y][x] = tile;
      }
    }
  }
}

export type HouseVariant = "a" | "b";

export interface HouseAnchor {
  x0: number;
  y0: number;
  variant: HouseVariant;
}

/**
 * Marks a 4-wide x 3-tall footprint as impassable (door cells excepted). The
 * actual roof/wall art is a single overlaid sprite drawn by TownScene — the
 * grid only needs to know what's walkable, so every non-door cell here is
 * just TileType.Wall regardless of whether it's visually "roof" or "wall".
 */
function buildHouse(grid: TileType[][], x0: number, y0: number) {
  fillRect(grid, x0, y0, 4, 3, TileType.Wall);
  grid[y0 + 2][x0 + 1] = TileType.Door;
  grid[y0 + 2][x0 + 2] = TileType.Door;
}

function buildGrid(): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    grid.push(new Array(MAP_WIDTH).fill(TileType.Grass));
  }

  // Sprinkle a bit of alternate grass / flowers for texture. Kept clear of
  // where the houses and paths will be carved in below.
  const decorations: Array<[number, number, TileType]> = [
    [9, 2, TileType.GrassAlt],
    [2, 2, TileType.GrassAlt],
    [2, 4, TileType.Flower],
    [20, 4, TileType.Flower],
    [21, 9, TileType.GrassAlt],
    [21, 15, TileType.GrassAlt],
    [3, 12, TileType.Flower],
    [20, 12, TileType.Flower],
    [2, 16, TileType.Flower],
  ];
  for (const [x, y, tile] of decorations) grid[y][x] = tile;

  // Border trees.
  fillRect(grid, 0, 0, MAP_WIDTH, 1, TileType.Tree);
  fillRect(grid, 0, MAP_HEIGHT - 1, MAP_WIDTH, 1, TileType.Tree);
  fillRect(grid, 0, 0, 1, MAP_HEIGHT, TileType.Tree);
  fillRect(grid, MAP_WIDTH - 1, 0, 1, MAP_HEIGHT, TileType.Tree);

  // A few scattered interior trees.
  const trees: Array<[number, number]> = [
    [11, 1],
    [11, 4],
    [11, 7],
    [9, 16],
    [18, 16],
  ];
  for (const [x, y] of trees) grid[y][x] = TileType.Tree;

  // Pond in the top-right corner.
  fillRect(grid, 21, 2, 3, 3, TileType.Water);

  // Path network: a horizontal main street and two vertical branches.
  fillRect(grid, 1, 8, MAP_WIDTH - 2, 1, TileType.Path); // main horizontal street
  fillRect(grid, 5, 3, 1, 5, TileType.Path); // branch up to house A
  fillRect(grid, 5, 9, 1, 6, TileType.Path); // branch down to house C
  fillRect(grid, 16, 3, 1, 5, TileType.Path); // branch up to house B
  fillRect(grid, 16, 9, 1, 6, TileType.Path); // branch down to house D

  // Houses, each fronted by a path tile so the door is reachable.
  for (const house of houseAnchors) {
    buildHouse(grid, house.x0, house.y0);
  }

  return grid;
}

export const houseAnchors: HouseAnchor[] = [
  { x0: 4, y0: 1, variant: "a" }, // House A (top-left)
  { x0: 15, y0: 1, variant: "b" }, // House B (top-right)
  { x0: 4, y0: 9, variant: "b" }, // House C (bottom-left)
  { x0: 15, y0: 9, variant: "a" }, // House D (bottom-right)
];

export const townGrid: TileType[][] = buildGrid();

// Middle of the main street, clear of every house's tall roof overhang
// (houses A-D sit under columns 4-7 and 15-18) so the player spawns visible.
export const PLAYER_START = { x: 11, y: 8 };

// Open grass near the right edge of the map (column 22, one in from the
// border trees at column 23), clear of the pond (columns 21-23, rows 2-4)
// and the main street (row 8). One row further up than his first spot so
// the grass fringe overlay doesn't cover his feet.
export const NPC_HOME = { x: 22, y: 12 };

// Top-middle of the map, on open grass just east of the trees down column 11.
export const GIRL_HOME = { x: 12, y: 3 };
