import Phaser from "phaser";
import { MOVE_DURATION_MS, TILE_SIZE, TileType } from "./config";
import { findPath, type TileCoord } from "./pathfinding";
import { townGrid } from "./townMap";

export type NpcFacing = "down" | "left" | "right" | "up";

export const NPC_SHEET = "npc-derek";

// The sheet is a 4x4 grid: each row is a facing (down, left, right, up) and
// each column one frame of that facing's walk cycle.
const FACING_ROWS: Record<NpcFacing, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
const FRAMES_PER_ROW = 4;

export function npcWalkAnimKey(facing: NpcFacing): string {
  return `npc-walk-${facing}`;
}

export function npcIdleFrame(facing: NpcFacing): number {
  return FACING_ROWS[facing] * FRAMES_PER_ROW;
}

const WANDER_RADIUS = 3;
const MIN_PAUSE_MS = 1500;
const MAX_PAUSE_MS = 4000;
// A bit slower than the player's brisk tap-to-move pace, for a casual stroll.
const NPC_MOVE_DURATION_MS = MOVE_DURATION_MS * 1.4;

const WANDERABLE_TILES = new Set<TileType>([TileType.Grass, TileType.GrassAlt, TileType.Flower]);

/** Tile-grid NPC that idles, then strolls to a random nearby grass tile, on repeat. */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  tile: TileCoord;
  private readonly home: TileCoord;
  private facing: NpcFacing = "down";
  private path: TileCoord[] = [];
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, homeTile: TileCoord) {
    this.scene = scene;
    this.tile = { ...homeTile };
    this.home = { ...homeTile };
    const worldPos = this.tileToWorld(homeTile);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, NPC_SHEET, npcIdleFrame(this.facing));
    this.sprite.setOrigin(0.5, 0.81);
    this.sprite.setDisplaySize(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
    this.scheduleNextWander();
  }

  // Anchored to the tile's bottom edge, matching Player's convention, so
  // depth sorting against the grass fringe and buildings lines up.
  private tileToWorld(tile: TileCoord): { x: number; y: number } {
    return {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: (tile.y + 1) * TILE_SIZE,
    };
  }

  private scheduleNextWander() {
    const delay = Phaser.Math.Between(MIN_PAUSE_MS, MAX_PAUSE_MS);
    this.scene.time.delayedCall(delay, () => this.wanderStep());
  }

  private wanderStep() {
    const target = this.pickWanderTarget();
    const path = target && findPath(townGrid, this.tile, target);
    if (!path || path.length === 0) {
      this.scheduleNextWander();
      return;
    }

    this.path = path;
    this.advance();
  }

  private pickWanderTarget(): TileCoord | null {
    const candidates: TileCoord[] = [];
    for (let dy = -WANDER_RADIUS; dy <= WANDER_RADIUS; dy++) {
      for (let dx = -WANDER_RADIUS; dx <= WANDER_RADIUS; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = this.home.x + dx;
        const y = this.home.y + dy;
        if (WANDERABLE_TILES.has(townGrid[y]?.[x])) {
          candidates.push({ x, y });
        }
      }
    }
    return candidates.length > 0 ? Phaser.Utils.Array.GetRandom(candidates) : null;
  }

  private setFacing(dx: number, dy: number) {
    if (dx < 0) this.facing = "left";
    else if (dx > 0) this.facing = "right";
    else if (dy < 0) this.facing = "up";
    else if (dy > 0) this.facing = "down";
  }

  private advance() {
    const next = this.path.shift();
    if (!next) {
      this.sprite.anims.stop();
      this.sprite.setFrame(npcIdleFrame(this.facing));
      this.scheduleNextWander();
      return;
    }

    const dx = next.x - this.tile.x;
    const dy = next.y - this.tile.y;
    this.setFacing(dx, dy);
    this.sprite.play(npcWalkAnimKey(this.facing), true);

    const dest = this.tileToWorld(next);
    this.scene.tweens.add({
      targets: this.sprite,
      x: dest.x,
      y: dest.y,
      duration: NPC_MOVE_DURATION_MS,
      ease: "Linear",
      onComplete: () => {
        this.tile = { ...next };
        this.advance();
      },
    });
  }
}
