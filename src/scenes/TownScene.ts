import Phaser from "phaser";
import {
  CAMERA_ZOOM,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_SIZE,
  TileType,
} from "../game/config";
import { Player } from "../game/Player";
import { findPath, isWalkable, type TileCoord } from "../game/pathfinding";
import { generatePlayerTextures, generateTileTextures, textureKeyForTile } from "../game/textures";
import { PLAYER_START, townGrid } from "../game/townMap";

const TALL_TILES = new Set<TileType>([TileType.Tree, TileType.Roof]);
const GROUND_DEPTH = -1000;

export class TownScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super("TownScene");
  }

  preload() {
    generateTileTextures(this);
    generatePlayerTextures(this);
  }

  create() {
    this.buildMap();

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

  private buildMap() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = townGrid[y][x];
        const key = textureKeyForTile(tile);
        const image = this.add.image(x * TILE_SIZE, y * TILE_SIZE, key);
        image.setOrigin(0, 0);
        image.setDepth(TALL_TILES.has(tile) ? (y + 1) * TILE_SIZE : GROUND_DEPTH);
      }
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
      3,
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
