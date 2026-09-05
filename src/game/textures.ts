import Phaser from "phaser";
import { TILE_SIZE, TileType } from "./config";

// Tree/Wall/Roof/Door tiles are covered by real sprite art drawn on top
// (see TownScene) — their grid texture only needs to look like plain ground.
const TILE_TEXTURE_KEYS: Record<TileType, string> = {
  [TileType.Grass]: "tile-grass",
  [TileType.GrassAlt]: "tile-grass-alt",
  [TileType.Flower]: "tile-flower",
  [TileType.Path]: "tile-path",
  [TileType.Tree]: "tile-grass",
  [TileType.Water]: "tile-water",
  [TileType.Wall]: "tile-grass",
  [TileType.Roof]: "tile-grass",
  [TileType.Door]: "tile-path",
};

export function textureKeyForTile(tile: TileType): string {
  return TILE_TEXTURE_KEYS[tile];
}

function rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
}

function px(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, 1, 1);
}

function finish(g: Phaser.GameObjects.Graphics, key: string) {
  g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

const GRASS_BASE = 0x4cb85c;
const GRASS_DARK = 0x379147;
const GRASS_LIGHT = 0x74d382;

function drawGrassTufts(g: Phaser.GameObjects.Graphics) {
  const tufts: Array<[number, number]> = [
    [4, 6],
    [21, 4],
    [10, 18],
    [25, 22],
    [6, 26],
    [27, 10],
    [16, 9],
  ];
  for (const [x, y] of tufts) {
    px(g, x, y, GRASS_DARK);
    px(g, x + 1, y, GRASS_DARK);
    px(g, x, y - 1, GRASS_LIGHT);
  }
  for (const [x, y] of [
    [14, 4],
    [23, 15],
    [3, 20],
    [19, 27],
  ]) {
    px(g, x, y, GRASS_LIGHT);
  }
}

function drawGrass(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassTufts(g);
  finish(g, TILE_TEXTURE_KEYS[TileType.Grass]);
}

function drawGrassAlt(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassTufts(g);
  for (const [cx, cy] of [
    [8, 10],
    [22, 20],
    [14, 25],
  ]) {
    for (const [ox, oy] of [
      [0, 0],
      [-2, 0],
      [2, 0],
      [0, -2],
    ]) {
      px(g, cx + ox, cy + oy, GRASS_DARK);
    }
  }
  finish(g, TILE_TEXTURE_KEYS[TileType.GrassAlt]);
}

function drawFlower(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassTufts(g);

  const patches: Array<[number, number, number]> = [
    [10, 12, 0xff6f9c],
    [21, 9, 0xffe66d],
    [17, 22, 0xff6f9c],
  ];
  for (const [cx, cy, petal] of patches) {
    px(g, cx - 1, cy, petal);
    px(g, cx + 1, cy, petal);
    px(g, cx, cy - 1, petal);
    px(g, cx, cy + 1, petal);
    px(g, cx, cy, 0xffffff);
    px(g, cx - 1, cy + 2, GRASS_DARK);
  }
  finish(g, TILE_TEXTURE_KEYS[TileType.Flower]);
}

function drawPath(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const base = 0xd9bb7f;
  const dark = 0xb8965c;
  const darker = 0x9c7c49;
  const pebble = 0x8f8266;
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, base);

  for (const [x, y] of [
    [3, 4],
    [22, 6],
    [8, 16],
    [26, 18],
    [14, 24],
    [18, 10],
    [5, 27],
  ]) {
    rect(g, x, y, 2, 1, dark);
  }
  for (const [x, y] of [
    [24, 9],
    [6, 21],
    [15, 6],
  ]) {
    px(g, x, y, darker);
  }
  for (const [x, y] of [
    [11, 20],
    [20, 27],
  ]) {
    rect(g, x, y, 2, 2, pebble);
  }
  finish(g, TILE_TEXTURE_KEYS[TileType.Path]);
}

function drawWater(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const base = 0x3a7fe0;
  const deep = 0x2c63c2;
  const wave = 0x7cb8f9;
  const sparkle = 0xe8f5ff;
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, base);
  rect(g, 0, 24, TILE_SIZE, 8, deep);
  for (const [x, y, w] of [
    [3, 6, 6],
    [17, 8, 7],
    [6, 20, 5],
    [20, 22, 6],
  ] as const) {
    rect(g, x, y, w, 2, wave);
  }
  px(g, 22, 4, sparkle);
  px(g, 9, 15, sparkle);
  finish(g, TILE_TEXTURE_KEYS[TileType.Water]);
}

export function generateTileTextures(scene: Phaser.Scene) {
  drawGrass(scene);
  drawGrassAlt(scene);
  drawFlower(scene);
  drawPath(scene);
  drawWater(scene);
}
