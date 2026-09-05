import Phaser from "phaser";
import { TILE_SIZE } from "./config";
import type { TileCoord } from "./pathfinding";

export const NPC_SHEET = "npc-derek";

// The sheet is a 4x4 grid: each row is a facing (down, left, right, up) and
// each column one frame of that facing's walk cycle. The NPC stays put and
// always faces the camera, so only the down row's animation is used.
export const NPC_WALK_ANIM_KEY = "npc-walk-down";
export const NPC_WALK_ROW = 0;
export const NPC_FRAMES_PER_ROW = 4;

// The character art within each 512x512 frame leaves far less margin than
// the player's 32x32 sheet does (its drawn body fills ~87% of the frame
// height vs. the player's ~59%), so matching *frame* size would render the
// NPC visibly taller than the player. Scaling down by that ratio instead
// matches their drawn height on screen. The origin is pinned to the bottom
// of the drawn body (not the frame) so its feet still land on the tile's
// bottom edge, same as Player.
const NPC_CONTENT_HEIGHT_FRACTION = 448 / 512;
const PLAYER_CONTENT_HEIGHT_FRACTION = 19 / 32;
const NPC_DISPLAY_SIZE = TILE_SIZE * (PLAYER_CONTENT_HEIGHT_FRACTION / NPC_CONTENT_HEIGHT_FRACTION);
const NPC_ORIGIN_Y = 480 / 512;

/** A stationary NPC, standing at a fixed idle frame. */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, tile: TileCoord) {
    // Anchored to the tile's bottom edge, matching Player's convention, so
    // depth sorting against the grass fringe and buildings lines up.
    const x = tile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = (tile.y + 1) * TILE_SIZE;

    this.sprite = scene.add.sprite(x, y, NPC_SHEET, NPC_WALK_ROW * NPC_FRAMES_PER_ROW);
    this.sprite.setOrigin(0.5, NPC_ORIGIN_Y);
    this.sprite.setDisplaySize(NPC_DISPLAY_SIZE, NPC_DISPLAY_SIZE);
  }
}
