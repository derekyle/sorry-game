import Phaser from "phaser";
import { TILE_SIZE, TileType } from "./config";

const TILE_TEXTURE_KEYS: Record<TileType, string> = {
  [TileType.Grass]: "tile-grass",
  [TileType.GrassAlt]: "tile-grass-alt",
  [TileType.Flower]: "tile-flower",
  [TileType.Path]: "tile-path",
  [TileType.Tree]: "tile-tree",
  [TileType.Water]: "tile-water",
  [TileType.Wall]: "tile-wall",
  [TileType.Roof]: "tile-roof",
  [TileType.Door]: "tile-door",
};

export function textureKeyForTile(tile: TileType): string {
  return TILE_TEXTURE_KEYS[tile];
}

function rect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
}

function px(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, 1, 1);
}

function finish(g: Phaser.GameObjects.Graphics, key: string) {
  g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

const GRASS_BASE = 0x3fa34d;
const GRASS_DARK = 0x2f8a3e;
const GRASS_LIGHT = 0x57bf66;

function drawGrassDots(g: Phaser.GameObjects.Graphics) {
  for (const [x, y] of [
    [2, 3],
    [10, 2],
    [5, 9],
    [12, 11],
    [3, 13],
    [13, 6],
  ]) {
    px(g, x, y, GRASS_DARK);
  }
  for (const [x, y] of [
    [7, 5],
    [13, 4],
    [9, 12],
  ]) {
    px(g, x, y, GRASS_LIGHT);
  }
}

function drawGrass(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassDots(g);
  finish(g, TILE_TEXTURE_KEYS[TileType.Grass]);
}

function drawGrassAlt(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassDots(g);
  for (const [cx, cy] of [
    [4, 5],
    [11, 9],
    [7, 13],
  ]) {
    px(g, cx, cy, GRASS_DARK);
    px(g, cx - 1, cy, GRASS_DARK);
    px(g, cx + 1, cy, GRASS_DARK);
  }
  finish(g, TILE_TEXTURE_KEYS[TileType.GrassAlt]);
}

function drawFlower(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassDots(g);
  const petal = 0xff8fc7;
  const center = 0xffe66d;
  px(g, 7, 7, petal);
  px(g, 9, 7, petal);
  px(g, 7, 9, petal);
  px(g, 9, 9, petal);
  px(g, 8, 8, center);
  px(g, 6, 10, GRASS_DARK);
  finish(g, TILE_TEXTURE_KEYS[TileType.Flower]);
}

function drawPath(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 0xcdb27a);
  const dark = 0xb3945a;
  const pebble = 0x8f8266;
  for (const [x, y] of [
    [2, 2],
    [11, 3],
    [4, 8],
    [13, 9],
    [7, 12],
    [9, 5],
  ]) {
    px(g, x, y, dark);
  }
  px(g, 12, 6, pebble);
  px(g, 3, 12, pebble);
  finish(g, TILE_TEXTURE_KEYS[TileType.Path]);
}

function drawWater(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 0x3b6fd6);
  const wave = 0x6fa8f5;
  rect(g, 2, 4, 2, 1, wave);
  rect(g, 9, 4, 2, 1, wave);
  rect(g, 5, 11, 2, 1, wave);
  rect(g, 12, 11, 2, 1, wave);
  px(g, 11, 8, 0xdff0ff);
  finish(g, TILE_TEXTURE_KEYS[TileType.Water]);
}

function drawTree(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  const trunk = 0x5b3a29;
  rect(g, 6, 12, 4, 4, trunk);
  const canopy = 0x1f6b34;
  rect(g, 5, 0, 6, 1, canopy);
  rect(g, 3, 1, 10, 2, canopy);
  rect(g, 2, 3, 12, 4, canopy);
  rect(g, 3, 7, 10, 3, canopy);
  rect(g, 4, 10, 8, 2, canopy);
  const highlight = 0x2f8a3e;
  rect(g, 4, 2, 3, 3, highlight);
  finish(g, TILE_TEXTURE_KEYS[TileType.Tree]);
}

const WALL_BASE = 0xe4d2a0;
const WALL_TRIM = 0x6b4a2b;
const WALL_LINE = 0xcdb27a;

function drawWall(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, WALL_BASE);
  rect(g, 0, 0, TILE_SIZE, 1, WALL_TRIM);
  rect(g, 0, 0, 2, TILE_SIZE, WALL_TRIM);
  rect(g, TILE_SIZE - 2, 0, 2, TILE_SIZE, WALL_TRIM);
  rect(g, 2, 6, TILE_SIZE - 4, 1, WALL_LINE);
  rect(g, 2, 11, TILE_SIZE - 4, 1, WALL_LINE);
  finish(g, TILE_TEXTURE_KEYS[TileType.Wall]);
}

function drawRoof(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 0x9c3b3b);
  rect(g, 0, 0, TILE_SIZE, 1, 0xb85454);
  const shingle = 0x7a2c2c;
  rect(g, 0, 3, TILE_SIZE, 1, shingle);
  rect(g, 0, 7, TILE_SIZE, 1, shingle);
  rect(g, 0, 11, TILE_SIZE, 1, shingle);
  finish(g, TILE_TEXTURE_KEYS[TileType.Roof]);
}

function drawDoor(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, WALL_BASE);
  rect(g, 0, 0, TILE_SIZE, 1, WALL_TRIM);
  rect(g, 3, 2, 10, 14, 0x4a2f1c);
  rect(g, 8, 2, 1, 14, 0x3a2214);
  px(g, 10, 9, 0xf1c453);
  finish(g, TILE_TEXTURE_KEYS[TileType.Door]);
}

export function generateTileTextures(scene: Phaser.Scene) {
  drawGrass(scene);
  drawGrassAlt(scene);
  drawFlower(scene);
  drawPath(scene);
  drawWater(scene);
  drawTree(scene);
  drawWall(scene);
  drawRoof(scene);
  drawDoor(scene);
}

const CAP = 0xd6423c;
const CAP_DARK = 0xb32f2a;
const SKIN = 0xffd3a0;
const HAIR_BACK = 0x5b3a29;
const SHIRT = 0x3f6fd1;
const SHIRT_DARK = 0x2f56ab;
const PANTS = 0x27345c;
const SHOE = 0x3a2a1e;
const EYE = 0x2b2320;

export type PlayerFacing = "down" | "up" | "side";

export function playerTextureKey(facing: PlayerFacing, phase: 0 | 1): string {
  return `player-${facing}-${phase}`;
}

function drawPlayerFrame(
  scene: Phaser.Scene,
  facing: PlayerFacing,
  phase: 0 | 1,
) {
  const g = scene.add.graphics();

  rect(g, 3, 6, 10, 5, SHIRT);
  rect(g, 3, 6, 10, 1, SHIRT_DARK);
  rect(g, 4, 11, 8, 3, PANTS);

  if (facing === "down") {
    rect(g, 3, 1, 10, 2, CAP);
    rect(g, 3, 3, 10, 1, CAP_DARK);
    rect(g, 4, 4, 8, 3, SKIN);
    px(g, 6, 5, EYE);
    px(g, 9, 5, EYE);
  } else if (facing === "up") {
    rect(g, 3, 1, 10, 3, CAP);
    rect(g, 3, 4, 10, 2, HAIR_BACK);
  } else {
    rect(g, 4, 1, 8, 2, CAP);
    rect(g, 4, 3, 9, 1, CAP_DARK);
    rect(g, 5, 4, 6, 3, SKIN);
    rect(g, 10, 4, 2, 2, CAP_DARK);
    px(g, 10, 5, EYE);
  }

  if (phase === 0) {
    rect(g, 3, 14, 3, 2, SHOE);
    rect(g, 10, 13, 3, 2, SHOE);
  } else {
    rect(g, 3, 13, 3, 2, SHOE);
    rect(g, 10, 14, 3, 2, SHOE);
  }

  finish(g, playerTextureKey(facing, phase));
}

export function generatePlayerTextures(scene: Phaser.Scene) {
  const facings: PlayerFacing[] = ["down", "up", "side"];
  for (const facing of facings) {
    drawPlayerFrame(scene, facing, 0);
    drawPlayerFrame(scene, facing, 1);
  }
}
