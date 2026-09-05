import Phaser from "phaser";
import { CAMERA_ZOOM, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, TileType } from "../game/config";
import {
  idleAnimKey,
  Player,
  PLAYER_IDLE_SHEET,
  PLAYER_WALK_SHEET,
  walkAnimKey,
  type PlayerFacing,
} from "../game/Player";
import { findPath, isWalkable, type TileCoord } from "../game/pathfinding";
import { generateTileTextures, GRASS_FRINGE_KEY, hasGrassFringe, textureKeyForTile } from "../game/textures";
import { houseAnchors, PLAYER_START, townGrid, type HouseVariant } from "../game/townMap";

const GROUND_DEPTH = -1000;
const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const HOUSE_TEXTURE_KEYS: Record<HouseVariant, string> = {
  a: "house-a",
  b: "house-b",
};

// Footprint is HOUSE_TILE_WIDTH x 3 tiles (see townMap.buildHouse); the
// sprite is scaled to fill that width and its native aspect ratio decides
// how far the roof rises above the footprint.
const HOUSE_TILE_WIDTH = 4;

export class TownScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super("TownScene");
  }

  preload() {
    generateTileTextures(this);
    this.load.spritesheet(PLAYER_WALK_SHEET, `${ASSET_BASE}character-walk.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(PLAYER_IDLE_SHEET, `${ASSET_BASE}character-idle.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("tree", `${ASSET_BASE}tree.png`);
    this.load.image("house-a", `${ASSET_BASE}house-a.png`);
    this.load.image("house-b", `${ASSET_BASE}house-b.png`);
  }

  create() {
    this.createPlayerAnims();
    this.buildMap();
    this.buildHouses();

    this.player = new Player(this, PLAYER_START);
    this.player.sprite.setDepth((PLAYER_START.y + 1) * TILE_SIZE);

    const worldWidth = MAP_WIDTH * TILE_SIZE;
    const worldHeight = MAP_HEIGHT * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.input.on("pointerdown", this.handleTap, this);
  }

  update() {
    this.player.sprite.setDepth(this.player.sprite.y);
  }

  private createPlayerAnims() {
    const facings: Array<{ facing: PlayerFacing; row: number }> = [
      { facing: "down", row: 0 },
      { facing: "up", row: 1 },
      { facing: "side", row: 2 },
    ];

    for (const { facing, row } of facings) {
      this.anims.create({
        key: walkAnimKey(facing),
        frames: this.anims.generateFrameNumbers(PLAYER_WALK_SHEET, {
          start: row * 6,
          end: row * 6 + 5,
        }),
        frameRate: 12,
        repeat: -1,
      });
      this.anims.create({
        key: idleAnimKey(facing),
        frames: this.anims.generateFrameNumbers(PLAYER_IDLE_SHEET, {
          start: row * 4,
          end: row * 4 + 3,
        }),
        frameRate: 5,
        repeat: -1,
      });
    }
  }

  private buildMap() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = townGrid[y][x];
        const key = textureKeyForTile(tile);
        const image = this.add.image(x * TILE_SIZE, y * TILE_SIZE, key);
        image.setOrigin(0, 0);
        image.setDepth(GROUND_DEPTH);

        if (tile === TileType.Tree) {
          const tree = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, (y + 1) * TILE_SIZE, "tree");
          tree.setOrigin(0.5, 1);
          tree.setDepth((y + 1) * TILE_SIZE);
        }

        if (hasGrassFringe(tile, x, y)) {
          // Depth is the tile's bottom edge plus a hair, so a player
          // standing exactly on this tile (whose depth is also that bottom
          // edge, per Player's tile-bottom anchor) reliably renders behind
          // the blades instead of depending on insertion-order tie-breaking.
          const fringe = this.add.image(x * TILE_SIZE, y * TILE_SIZE, GRASS_FRINGE_KEY);
          fringe.setOrigin(0, 0);
          fringe.setDepth((y + 1) * TILE_SIZE + 1);
        }
      }
    }
  }

  private buildHouses() {
    for (const house of houseAnchors) {
      const key = HOUSE_TEXTURE_KEYS[house.variant];
      const footprintBottom = (house.y0 + 3) * TILE_SIZE;
      const centerX = (house.x0 + HOUSE_TILE_WIDTH / 2) * TILE_SIZE;

      const sprite = this.add.image(centerX, footprintBottom, key);
      sprite.setOrigin(0.5, 1);
      const displayWidth = HOUSE_TILE_WIDTH * TILE_SIZE;
      const scale = displayWidth / sprite.width;
      sprite.setDisplaySize(displayWidth, sprite.height * scale);
      // Depth is pinned to the top of the door row (not the sprite's own
      // bottom) so a player standing at the door — whose depth is their
      // tile's vertical center — still sorts in front of the building.
      const doorRowTop = (house.y0 + 2) * TILE_SIZE;
      sprite.setDepth(doorRowTop);
    }
  }

  private handleTap(pointer: Phaser.Input.Pointer) {
    if (this.player.isMoving) return;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const targetTile: TileCoord = {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };

    if (!isWalkable(townGrid, targetTile.x, targetTile.y)) return;

    const path = findPath(townGrid, this.player.tile, targetTile);
    if (!path || path.length === 0) return;

    this.showTapMarker(targetTile);
    this.player.walkTo(path);
  }

  private showTapMarker(tile: TileCoord) {
    const marker = this.add.circle(
      tile.x * TILE_SIZE + TILE_SIZE / 2,
      tile.y * TILE_SIZE + TILE_SIZE / 2,
      5,
      0xffffff,
      0.8,
    );
    marker.setDepth(1_000_000);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 1.8,
      duration: 350,
      onComplete: () => marker.destroy(),
    });
  }
}
