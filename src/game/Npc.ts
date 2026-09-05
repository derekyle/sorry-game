import Phaser from "phaser";
import { MOVE_DURATION_MS, TILE_SIZE, TileType } from "./config";
import type { PlayerFacing } from "./Player";
import { findPath, type TileCoord } from "./pathfinding";
import { townGrid } from "./townMap";

export const NPC_WALK_SHEET = "npc-derek-walk";
export const NPC_IDLE_SHEET = "npc-derek-idle";

// Both sheets are a 3-row grid, but the two were generated separately and
// don't agree on row order: the walk sheet is (side, up, down), while the
// idle sheet is (down, up, side) - matching the player's own convention.
// 6 walk frames and 4 idle frames per row, same as the player's.
const WALK_ROW_FOR_FACING: Record<PlayerFacing, number> = { side: 0, up: 1, down: 2 };
const IDLE_ROW_FOR_FACING: Record<PlayerFacing, number> = { down: 0, up: 1, side: 2 };
export const NPC_WALK_FRAMES_PER_ROW = 6;
export const NPC_IDLE_FRAMES_PER_ROW = 4;

export function npcWalkRowForFacing(facing: PlayerFacing): number {
  return WALK_ROW_FOR_FACING[facing];
}

export function npcIdleRowForFacing(facing: PlayerFacing): number {
  return IDLE_ROW_FOR_FACING[facing];
}

export function npcWalkAnimKey(facing: PlayerFacing): string {
  return `npc-walk-${facing}`;
}

export function npcIdleAnimKey(facing: PlayerFacing): string {
  return `npc-idle-${facing}`;
}

// The walk and idle sheets were generated separately at different native
// resolutions (480px vs 597px frames), so a single fixed scale would make
// the NPC visibly change size when it switches between them. Scaling each
// to TILE_SIZE individually keeps it a consistent size on screen, matching
// the player's own on-screen size (its frames are already tile-sized).
const NPC_WALK_FRAME_SIZE = 480;
const NPC_IDLE_FRAME_SIZE = 597;
const NPC_WALK_SCALE = TILE_SIZE / NPC_WALK_FRAME_SIZE;
const NPC_IDLE_SCALE = TILE_SIZE / NPC_IDLE_FRAME_SIZE;

const WANDER_RADIUS = 3;
const MIN_PAUSE_MS = 1500;
const MAX_PAUSE_MS = 4000;
const WANDERABLE_TILES = new Set<TileType>([TileType.Grass, TileType.GrassAlt, TileType.Flower]);

/** Tile-grid NPC that idles, then strolls to a random nearby grass tile, on repeat. */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  tile: TileCoord;
  private readonly home: TileCoord;
  private facing: PlayerFacing = "down";
  private path: TileCoord[] = [];
  private moving = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, homeTile: TileCoord) {
    this.scene = scene;
    this.tile = { ...homeTile };
    this.home = { ...homeTile };
    const worldPos = this.tileToWorld(homeTile);

    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, NPC_IDLE_SHEET, 0);
    this.sprite.setOrigin(0.5, 0.81);
    this.playIdle();
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

  get isMoving(): boolean {
    return this.moving;
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

  private playIdle() {
    this.sprite.setScale(NPC_IDLE_SCALE);
    this.sprite.play(npcIdleAnimKey(this.facing), true);
  }

  private playWalk() {
    this.sprite.setScale(NPC_WALK_SCALE);
    this.sprite.play(npcWalkAnimKey(this.facing), true);
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
      this.playIdle();
      this.scheduleNextWander();
      return;
    }

    this.moving = true;
    const dx = next.x - this.tile.x;
    const dy = next.y - this.tile.y;
    this.setFacing(dx, dy);
    this.playWalk();

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
