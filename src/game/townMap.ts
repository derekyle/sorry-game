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

function buildHouse(grid: TileType[][], x0: number, y0: number) {
  // 4x2 roof with a 4x2 wall row below it, door in the middle of the wall row.
  fillRect(grid, x0, y0, 4, 2, TileType.Roof);
  fillRect(grid, x0, y0 + 2, 4, 1, TileType.Wall);
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
  buildHouse(grid, 4, 1); // House A (top-left)
  buildHouse(grid, 15, 1); // House B (top-right)
  buildHouse(grid, 4, 9); // House C (bottom-left)
  buildHouse(grid, 15, 9); // House D (bottom-right)

  return grid;
}

export const townGrid: TileType[][] = buildGrid();

export const PLAYER_START = { x: 6, y: 8 };
