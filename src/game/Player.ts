import Phaser from "phaser";
import { MOVE_DURATION_MS, TILE_SIZE } from "./config";
import type { TileCoord } from "./pathfinding";

export type PlayerFacing = "down" | "up" | "side";

export const PLAYER_WALK_SHEET = "player-walk";
export const PLAYER_IDLE_SHEET = "player-idle";

export function walkAnimKey(facing: PlayerFacing): string {
  return `walk-${facing}`;
}

export function idleAnimKey(facing: PlayerFacing): string {
  return `idle-${facing}`;
}

// The player's sprite sheet draws its body a bit smaller within its 32x32
// frame than Derek's and the girl's sheets draw theirs within their own
// frames, so at matching frame-to-tile sizing the player reads slightly
// smaller. Nudging it up a bit closes that gap.
const PLAYER_SCALE = 1.1;

/** Tile-grid character controller: walks a queued path one tile at a time. */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  tile: TileCoord;
  private facing: PlayerFacing = "down";
  private path: TileCoord[] = [];
  private moving = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, startTile: TileCoord) {
    this.scene = scene;
    this.tile = { ...startTile };
    const worldPos = this.tileToWorld(startTile);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, PLAYER_IDLE_SHEET, 0);
    this.sprite.setOrigin(0.5, 0.81);
    this.sprite.setScale(PLAYER_SCALE);
    this.sprite.play(idleAnimKey("down"), true);
  }

  // Anchored to the tile's bottom edge (not its center) so the player's feet
  // line up with the grass-fringe overlay and tall sprites drawn on that
  // same bottom-edge convention (see TownScene).
  private tileToWorld(tile: TileCoord): { x: number; y: number } {
    return {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: (tile.y + 1) * TILE_SIZE,
    };
  }

  get isMoving(): boolean {
    return this.moving;
  }

  /** Replace the current walk queue with a freshly computed path. */
  walkTo(path: TileCoord[]) {
    this.path = path;
    if (!this.moving) {
      this.advance();
    }
  }

  private setFacing(dx: number, dy: number) {
    if (dx < 0) {
      this.facing = "side";
      this.sprite.setFlipX(true);
    } else if (dx > 0) {
      this.facing = "side";
      this.sprite.setFlipX(false);
    } else if (dy < 0) {
      this.facing = "up";
    } else if (dy > 0) {
      this.facing = "down";
    }
  }

  private advance() {
    const next = this.path.shift();
    if (!next) {
      this.moving = false;
      this.sprite.play(idleAnimKey(this.facing), true);
      return;
    }

    this.moving = true;
    const dx = next.x - this.tile.x;
    const dy = next.y - this.tile.y;
    this.setFacing(dx, dy);
    this.sprite.play(walkAnimKey(this.facing), true);

    const dest = this.tileToWorld(next);
    this.scene.tweens.add({
      targets: this.sprite,
      x: dest.x,
      y: dest.y,
      duration: MOVE_DURATION_MS,
      ease: "Linear",
      onComplete: () => {
        this.tile = { ...next };
        this.advance();
      },
    });
  }
}
