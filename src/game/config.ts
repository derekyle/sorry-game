export const TILE_SIZE = 32;

export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 18;

export const CAMERA_ZOOM = 2;

export const MOVE_DURATION_MS = 170;

export const TileType = {
  Grass: 0,
  GrassAlt: 1,
  Flower: 2,
  Path: 3,
  Tree: 4,
  Water: 5,
  Wall: 6,
  Roof: 7,
  Door: 8,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export const WALKABLE_TILES = new Set<TileType>([
  TileType.Grass,
  TileType.GrassAlt,
  TileType.Flower,
  TileType.Path,
  TileType.Door,
]);

export type Direction = "down" | "up" | "left" | "right";
