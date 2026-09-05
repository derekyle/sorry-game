import Phaser from "phaser";
import { TILE_SIZE } from "./config";
import type { PlayerFacing } from "./Player";
import type { TileCoord } from "./pathfinding";

export const GIRL_WALK_SHEET = "girl-walk";
export const GIRL_IDLE_SHEET = "girl-idle";

// Same row order as the player's own sheets (down, up, side) and the same
// frame counts (6 walk frames, 4 idle frames per row) - unlike Derek's
// sheets, which use a different row order (see Npc.ts).
const ROW_FOR_FACING: Record<PlayerFacing, number> = { down: 0, up: 1, side: 2 };
export const GIRL_WALK_FRAMES_PER_ROW = 6;
export const GIRL_IDLE_FRAMES_PER_ROW = 4;

export function girlRowForFacing(facing: PlayerFacing): number {
  return ROW_FOR_FACING[facing];
}

export function girlWalkAnimKey(facing: PlayerFacing): string {
  return `girl-walk-${facing}`;
}

export function girlIdleAnimKey(facing: PlayerFacing): string {
  return `girl-idle-${facing}`;
}

// The idle sheet's frames are natively larger (597px) than the walk sheet's
// (480px), so scaling to the frame size directly would render her taller
// than the player while idle. Scale to TILE_SIZE instead, same fix as
// Derek's NPC in Npc.ts.
const GIRL_IDLE_FRAME_SIZE = 597;
const GIRL_IDLE_SCALE = TILE_SIZE / GIRL_IDLE_FRAME_SIZE;

/** A stationary character that stands in place, idling. */
export class Girl {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, tile: TileCoord) {
    // Anchored to the tile's bottom edge, matching Player's convention, so
    // depth sorting against the grass fringe and buildings lines up.
    const x = tile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = (tile.y + 1) * TILE_SIZE;

    this.sprite = scene.add.sprite(x, y, GIRL_IDLE_SHEET, 0);
    this.sprite.setOrigin(0.5, 0.81);
    this.sprite.setScale(GIRL_IDLE_SCALE);
    this.sprite.play(girlIdleAnimKey("down"), true);
  }
}
