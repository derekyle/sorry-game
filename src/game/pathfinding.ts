import { MAP_HEIGHT, MAP_WIDTH, TileType, WALKABLE_TILES } from "./config";

export interface TileCoord {
  x: number;
  y: number;
}

const NEIGHBOR_OFFSETS: TileCoord[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

export function isWalkable(grid: TileType[][], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return false;
  return WALKABLE_TILES.has(grid[y][x]);
}

/**
 * Breadth-first search on the tile grid. Returns the list of tiles to walk
 * through (excluding the start tile) or null if the target is unreachable.
 */
export function findPath(
  grid: TileType[][],
  start: TileCoord,
  goal: TileCoord,
): TileCoord[] | null {
  if (!isWalkable(grid, goal.x, goal.y)) return null;
  if (start.x === goal.x && start.y === goal.y) return [];

  const key = (c: TileCoord) => `${c.x},${c.y}`;
  const visited = new Set<string>([key(start)]);
  const cameFrom = new Map<string, TileCoord>();
  const queue: TileCoord[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      const path: TileCoord[] = [];
      let node: TileCoord = current;
      while (key(node) !== key(start)) {
        path.unshift(node);
        node = cameFrom.get(key(node))!;
      }
      return path;
    }

    for (const offset of NEIGHBOR_OFFSETS) {
      const next: TileCoord = { x: current.x + offset.x, y: current.y + offset.y };
      const nextKey = key(next);
      if (visited.has(nextKey)) continue;
      if (!isWalkable(grid, next.x, next.y)) continue;
      visited.add(nextKey);
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  return null;
}
