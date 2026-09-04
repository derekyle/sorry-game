import Phaser from "phaser";
import { MOVE_DURATION_MS, TILE_SIZE } from "./config";
import type { TileCoord } from "./pathfinding";
import { playerTextureKey, type PlayerFacing } from "./textures";

/** Tile-grid character controller: walks a queued path one tile at a time. */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  tile: TileCoord;
  private facing: PlayerFacing = "down";
  private flipX = false;
  private path: TileCoord[] = [];
  private moving = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, startTile: TileCoord) {
    this.scene = scene;
    this.tile = { ...startTile };
    const worldPos = this.tileToWorld(startTile);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, playerTextureKey("down", 0));
    this.sprite.setOrigin(0.5, 0.6);
  }

  private tileToWorld(tile: TileCoord): { x: number; y: number } {
    return {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: tile.y * TILE_SIZE + TILE_SIZE / 2,
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
      this.flipX = true;
    } else if (dx > 0) {
      this.facing = "side";
      this.flipX = false;
    } else if (dy < 0) {
      this.facing = "up";
    } else if (dy > 0) {
      this.facing = "down";
    }
    this.sprite.setFlipX(this.flipX);
  }

  private setFrame(phase: 0 | 1) {
    this.sprite.setTexture(playerTextureKey(this.facing, phase));
  }

  private advance() {
    const next = this.path.shift();
    if (!next) {
      this.moving = false;
      this.setFrame(0);
      return;
    }

    this.moving = true;
    const dx = next.x - this.tile.x;
    const dy = next.y - this.tile.y;
    this.setFacing(dx, dy);

    const dest = this.tileToWorld(next);
    let frameToggle: 0 | 1 = 1;
    const walkTimer = this.scene.time.addEvent({
      delay: MOVE_DURATION_MS / 2,
      loop: true,
      callback: () => {
        this.setFrame(frameToggle);
        frameToggle = frameToggle === 0 ? 1 : 0;
      },
    });

    this.scene.tweens.add({
      targets: this.sprite,
      x: dest.x,
      y: dest.y,
      duration: MOVE_DURATION_MS,
      ease: "Linear",
      onComplete: () => {
        walkTimer.remove();
        this.tile = { ...next };
        this.advance();
      },
    });
  }
}
