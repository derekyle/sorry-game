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

const INK = 0x2b2013;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

function rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
}

function px(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(color, 1).fillRect(x, y, 1, 1);
}

/** Draws each box inflated by 1px in black first, then the true box on top —
 * a cheap way to get a clean outline around a silhouette built from rects. */
function drawOutlined(g: Phaser.GameObjects.Graphics, boxes: Box[], outline = INK) {
  for (const b of boxes) rect(g, b.x - 1, b.y - 1, b.w + 2, b.h + 2, outline);
  for (const b of boxes) rect(g, b.x, b.y, b.w, b.h, b.color);
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

function drawTree(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, GRASS_BASE);
  drawGrassTufts(g);

  const trunk = 0x6b4326;
  const trunkDark = 0x4d2f19;
  const canopyBoxes: Box[] = [
    { x: 10, y: 0, w: 12, h: 2, color: 0x2b8a45 },
    { x: 6, y: 2, w: 20, h: 4, color: 0x2b8a45 },
    { x: 3, y: 6, w: 26, h: 9, color: 0x2b8a45 },
    { x: 5, y: 15, w: 22, h: 6, color: 0x2b8a45 },
    { x: 8, y: 21, w: 16, h: 4, color: 0x2b8a45 },
  ];
  drawOutlined(g, canopyBoxes);

  rect(g, 13, 22, 6, 8, trunk);
  rect(g, 13, 22, 2, 8, trunkDark);

  const highlight = 0x49b868;
  rect(g, 7, 8, 7, 6, highlight);
  const shadowLeaf = 0x1e6f37;
  rect(g, 18, 16, 7, 5, shadowLeaf);
  finish(g, TILE_TEXTURE_KEYS[TileType.Tree]);
}

const WALL_BASE = 0xefe0b0;
const WALL_TRIM = 0x7a5330;
const WALL_LINE = 0xd6bd85;

function drawWall(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, WALL_BASE);
  rect(g, 0, 0, TILE_SIZE, 2, WALL_TRIM);
  rect(g, 0, 0, 3, TILE_SIZE, WALL_TRIM);
  rect(g, TILE_SIZE - 3, 0, 3, TILE_SIZE, WALL_TRIM);
  rect(g, 3, 11, TILE_SIZE - 6, 2, WALL_LINE);
  rect(g, 3, 22, TILE_SIZE - 6, 2, WALL_LINE);

  // small shuttered window
  drawOutlined(g, [{ x: 11, y: 13, w: 10, h: 8, color: 0x5b8fd6 }]);
  rect(g, 15, 13, 2, 8, WALL_TRIM);
  rect(g, 11, 16, 10, 2, WALL_TRIM);
  finish(g, TILE_TEXTURE_KEYS[TileType.Wall]);
}

function drawRoof(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const base = 0xc23b3b;
  const ridge = 0xe06666;
  const shingle = 0x8e2a2a;
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, base);
  rect(g, 0, 0, TILE_SIZE, 2, ridge);
  for (const y of [6, 13, 20, 27]) {
    rect(g, 0, y, TILE_SIZE, 2, shingle);
  }
  for (let x = 0; x < TILE_SIZE; x += 8) {
    rect(g, x, 6, 1, 2, ridge);
    rect(g, x + 4, 20, 1, 2, ridge);
  }
  finish(g, TILE_TEXTURE_KEYS[TileType.Roof]);
}

function drawDoor(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, WALL_BASE);
  rect(g, 0, 0, TILE_SIZE, 2, WALL_TRIM);
  drawOutlined(g, [{ x: 6, y: 5, w: 20, h: 27, color: 0x5a3822 }]);
  rect(g, 15, 5, 2, 27, 0x432714);
  rect(g, 6, 5, 20, 3, 0x6b4429);
  px(g, 20, 19, 0xf1c453);
  px(g, 19, 19, 0xc9922f);
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

const CAP = 0xe8443c;
const CAP_DARK = 0xb52e28;
const CAP_BILL = 0x8f231f;
const SKIN = 0xffd8ab;
const SKIN_SHADE = 0xf0b986;
const HAIR_BACK = 0x5b3a29;
const SHIRT = 0x4a7fe0;
const SHIRT_DARK = 0x3560b8;
const SHIRT_LIGHT = 0x6fa0f2;
const PANTS = 0x2a3a63;
const PANTS_DARK = 0x1c2747;
const SHOE = 0x3a2a1e;
const EYE = 0x241a12;

export type PlayerFacing = "down" | "up" | "side";

export function playerTextureKey(facing: PlayerFacing, phase: 0 | 1): string {
  return `player-${facing}-${phase}`;
}

function drawPlayerFrame(scene: Phaser.Scene, facing: PlayerFacing, phase: 0 | 1) {
  const g = scene.add.graphics();

  // ground shadow, drawn first so the outlined body sits on top of it
  g.fillStyle(0x000000, 0.28).fillEllipse(16, 29, 16, 6);

  const bodyBoxes: Box[] = [
    { x: 9, y: 12, w: 14, h: 9, color: SHIRT },
    { x: 11, y: 19, w: 10, h: 6, color: PANTS },
  ];

  if (facing === "down") {
    bodyBoxes.push(
      { x: 10, y: 1, w: 12, h: 3, color: CAP },
      { x: 8, y: 3, w: 16, h: 2, color: CAP_BILL },
      { x: 9, y: 5, w: 14, h: 7, color: SKIN },
    );
  } else if (facing === "up") {
    bodyBoxes.push(
      { x: 10, y: 1, w: 12, h: 4, color: CAP },
      { x: 9, y: 5, w: 14, h: 6, color: HAIR_BACK },
    );
  } else {
    bodyBoxes.push(
      { x: 11, y: 1, w: 10, h: 3, color: CAP },
      { x: 11, y: 4, w: 11, h: 2, color: CAP_BILL },
      { x: 12, y: 6, w: 8, h: 6, color: SKIN },
    );
  }

  drawOutlined(g, bodyBoxes);

  // shading details drawn after the outline pass, on top of the flat fills
  rect(g, 9, 12, 14, 2, SHIRT_LIGHT);
  rect(g, 9, 18, 14, 3, SHIRT_DARK);
  rect(g, 11, 22, 10, 3, PANTS_DARK);

  if (facing === "down") {
    rect(g, 9, 10, 14, 1, CAP_DARK);
    px(g, 12, 8, EYE);
    px(g, 13, 8, EYE);
    px(g, 18, 8, EYE);
    px(g, 19, 8, EYE);
    rect(g, 9, 10, 14, 1, SKIN_SHADE);
  } else if (facing === "up") {
    rect(g, 10, 3, 12, 1, CAP_DARK);
  } else {
    rect(g, 11, 3, 10, 1, CAP_DARK);
    px(g, 17, 8, EYE);
    px(g, 18, 8, EYE);
  }

  const shoeY = phase === 0 ? [24, 23] : [23, 24];
  drawOutlined(g, [
    { x: 10, y: shoeY[0], w: 5, h: 4, color: SHOE },
    { x: 17, y: shoeY[1], w: 5, h: 4, color: SHOE },
  ]);

  finish(g, playerTextureKey(facing, phase));
}

export function generatePlayerTextures(scene: Phaser.Scene) {
  const facings: PlayerFacing[] = ["down", "up", "side"];
  for (const facing of facings) {
    drawPlayerFrame(scene, facing, 0);
    drawPlayerFrame(scene, facing, 1);
  }
}
