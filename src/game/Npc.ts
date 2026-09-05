import Phaser from "phaser";
import { TILE_SIZE } from "./config";
import type { PlayerFacing } from "./Player";
import type { TileCoord } from "./pathfinding";

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

// The idle sheet's frames are natively larger (597px) than the walk sheet's
// (480px), so scaling to the frame size directly would render him taller
// than the player while idle. Scale to TILE_SIZE instead.
const NPC_IDLE_FRAME_SIZE = 597;
const NPC_IDLE_SCALE = TILE_SIZE / NPC_IDLE_FRAME_SIZE;

/** A stationary character that stands in place, idling. */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, tile: TileCoord) {
    // Anchored to the tile's bottom edge, matching Player's convention, so
    // depth sorting against the grass fringe and buildings lines up.
    const x = tile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = (tile.y + 1) * TILE_SIZE;

    this.sprite = scene.add.sprite(x, y, NPC_IDLE_SHEET, 0);
    this.sprite.setOrigin(0.5, 0.81);
    this.sprite.setScale(NPC_IDLE_SCALE);
    this.sprite.play(npcIdleAnimKey("down"), true);
  }
}
