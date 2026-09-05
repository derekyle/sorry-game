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
import { GIRL_HOME, houseAnchors, NPC_HOME, PLAYER_START, townGrid, type HouseVariant } from "../game/townMap";
import {
  Npc,
  npcIdleAnimKey,
  npcIdleRowForFacing,
  npcWalkAnimKey,
  npcWalkRowForFacing,
  NPC_IDLE_FRAMES_PER_ROW,
  NPC_IDLE_SHEET,
  NPC_WALK_FRAMES_PER_ROW,
  NPC_WALK_SHEET,
} from "../game/Npc";
import {
  Girl,
  girlIdleAnimKey,
  girlRowForFacing,
  girlWalkAnimKey,
  GIRL_IDLE_FRAMES_PER_ROW,
  GIRL_IDLE_SHEET,
  GIRL_WALK_FRAMES_PER_ROW,
  GIRL_WALK_SHEET,
} from "../game/Girl";
import { TITLE_DISMISSED_EVENT } from "../game/events";
import { TITLE_SPLASH_FADE_MS } from "../ui/titleSplash";
import { showDialog, type DialogNode, type ScreenPoint, type DialogSession } from "../ui/dialog";

const GROUND_DEPTH = -1000;
const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const THEME_MUSIC_KEY = "town-theme";
const THEME_MUSIC_VOLUME = 0.3;
const FOOTSTEP_GRAVEL_KEY = "footstep-gravel";
const FOOTSTEP_GRASS_KEY = "footstep-grass";
const FOOTSTEP_GRAVEL_VOLUME = 0.65;
const FOOTSTEP_GRASS_VOLUME = FOOTSTEP_GRAVEL_VOLUME * 1.25;

const HOUSE_TEXTURE_KEYS: Record<HouseVariant, string> = {
  a: "house-a",
  b: "house-b",
};

// this.sound.add() actually returns whichever concrete sound type matches
// the active manager, and only those (not the BaseSound interface) declare
// setVolume/volume — so anything that adjusts volume directly needs this.
type Sound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

// Footprint is HOUSE_TILE_WIDTH x 3 tiles (see townMap.buildHouse); the
// sprite is scaled to fill that width and its native aspect ratio decides
// how far the roof rises above the footprint.
const HOUSE_TILE_WIDTH = 4;

const GIRL_DIALOG_ROOT: DialogNode = {
  npcMessage: "Oh, hi... you must be Naigle... it's nice to meet you. Are you looking for Derek?",
  choices: [
    { text: "Nope, don't know who that is, don't care." },
    {
      text: "Ya, where is he? I'm gonna beat him up.",
      next: {
        npcMessage:
          "Well... hmm, he seemed pretty sad earlier, I saw him heading to the south east part of town.",
        choices: [{ text: "Thanks." }],
      },
    },
  ],
};

export class TownScene extends Phaser.Scene {
  private player!: Player;
  private npc!: Npc;
  private girl!: Girl;
  private music!: Phaser.Sound.BaseSound;
  private footstepGravel!: Sound;
  private footstepGrass!: Sound;
  private activeFootstepSound: Sound | null = null;
  private dialogSession: DialogSession | null = null;
  private nearGirl = false;

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
    this.load.spritesheet(NPC_WALK_SHEET, `${ASSET_BASE}derek-walk.png`, {
      frameWidth: 480,
      frameHeight: 480,
    });
    this.load.spritesheet(NPC_IDLE_SHEET, `${ASSET_BASE}derek-idle.png`, {
      frameWidth: 597,
      frameHeight: 597,
    });
    this.load.spritesheet(GIRL_WALK_SHEET, `${ASSET_BASE}girl-walk.png`, {
      frameWidth: 480,
      frameHeight: 480,
    });
    this.load.spritesheet(GIRL_IDLE_SHEET, `${ASSET_BASE}girl-idle.png`, {
      frameWidth: 597,
      frameHeight: 597,
    });
    this.load.audio(THEME_MUSIC_KEY, `${ASSET_BASE}town-theme.mp3`);
    this.load.audio(FOOTSTEP_GRAVEL_KEY, `${ASSET_BASE}footsteps-gravel.mp3`);
    this.load.audio(FOOTSTEP_GRASS_KEY, `${ASSET_BASE}footsteps-grass.mp3`);
  }

  create() {
    this.createPlayerAnims();
    this.createNpcAnims();
    this.createGirlAnims();
    this.buildMap();
    this.buildHouses();
    this.playThemeMusic();
    this.setupFootsteps();

    this.player = new Player(this, PLAYER_START);
    this.player.sprite.setDepth((PLAYER_START.y + 1) * TILE_SIZE);

    this.npc = new Npc(this, NPC_HOME);
    this.npc.sprite.setDepth((NPC_HOME.y + 1) * TILE_SIZE);

    this.girl = new Girl(this, GIRL_HOME);
    this.girl.sprite.setDepth((GIRL_HOME.y + 1) * TILE_SIZE);

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
    this.updateFootstepSound();
    this.updateGirlDialog();
  }

  private updateGirlDialog() {
    if (this.dialogSession) {
      this.dialogSession.updateNpcAnchor(this.toScreenAnchor(this.girl.sprite));
      if (!this.dialogSession.active) this.dialogSession = null;
      return;
    }

    const dx = Math.abs(this.player.tile.x - GIRL_HOME.x);
    const dy = Math.abs(this.player.tile.y - GIRL_HOME.y);
    const adjacent = dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);

    if (adjacent && !this.nearGirl) {
      this.startGirlDialog();
    }
    this.nearGirl = adjacent;
  }

  private toScreenAnchor(sprite: Phaser.GameObjects.Sprite): ScreenPoint {
    const cam = this.cameras.main;
    return {
      x: (sprite.x - cam.worldView.x) * cam.zoom,
      y: (sprite.y - sprite.displayHeight - cam.worldView.y) * cam.zoom,
    };
  }

  private startGirlDialog() {
    this.dialogSession = showDialog(GIRL_DIALOG_ROOT, {
      onCharacterRevealed: () => this.playDialogBlip(),
    });
  }

  private playDialogBlip() {
    const soundManager = this.sound;
    if (!(soundManager instanceof Phaser.Sound.WebAudioSoundManager)) return;

    const ctx = soundManager.context;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(520 + Math.random() * 60, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    oscillator.connect(gain).connect(soundManager.masterVolumeNode);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.05);
  }

  private playThemeMusic() {
    // Starts silent: the title splash controls when it becomes audible, by
    // fading the volume in as it dismisses (see TITLE_DISMISSED_EVENT below).
    this.music = this.sound.add(THEME_MUSIC_KEY, { loop: true, volume: 0 });

    // Browsers block audio until the user has interacted with the page, so
    // Phaser's sound manager may report "locked" at this point. Play
    // immediately when unlocked, otherwise wait for the unlock event that
    // fires on the first pointer/keyboard input.
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.music.play());
    } else {
      this.music.play();
    }

    this.game.events.once(TITLE_DISMISSED_EVENT, () => {
      this.tweens.add({
        targets: this.music,
        volume: THEME_MUSIC_VOLUME,
        duration: TITLE_SPLASH_FADE_MS,
      });
    });
  }

  private setupFootsteps() {
    // Both loop continuously in the background at volume 0 so switching
    // surfaces is just a volume swap, not a restart — no popping or
    // playing from the start of the loop mid-stride.
    this.footstepGravel = this.sound.add(FOOTSTEP_GRAVEL_KEY, { loop: true, volume: 0 });
    this.footstepGrass = this.sound.add(FOOTSTEP_GRASS_KEY, { loop: true, volume: 0 });

    const startLooping = () => {
      this.footstepGravel.play();
      this.footstepGrass.play();
    };
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, startLooping);
    } else {
      startLooping();
    }
  }

  private footstepSoundForTile(tile: TileCoord): Sound {
    return townGrid[tile.y][tile.x] === TileType.Path ? this.footstepGravel : this.footstepGrass;
  }

  private updateFootstepSound() {
    const surfaceSound = this.player.isMoving ? this.footstepSoundForTile(this.player.tile) : null;
    if (surfaceSound === this.activeFootstepSound) return;

    this.activeFootstepSound?.setVolume(0);
    const volume = surfaceSound === this.footstepGravel ? FOOTSTEP_GRAVEL_VOLUME : FOOTSTEP_GRASS_VOLUME;
    surfaceSound?.setVolume(volume);
    this.activeFootstepSound = surfaceSound;
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

  private createNpcAnims() {
    const facings: PlayerFacing[] = ["down", "up", "side"];

    for (const facing of facings) {
      const walkRow = npcWalkRowForFacing(facing);
      this.anims.create({
        key: npcWalkAnimKey(facing),
        frames: this.anims.generateFrameNumbers(NPC_WALK_SHEET, {
          start: walkRow * NPC_WALK_FRAMES_PER_ROW,
          end: walkRow * NPC_WALK_FRAMES_PER_ROW + (NPC_WALK_FRAMES_PER_ROW - 1),
        }),
        frameRate: 12,
        repeat: -1,
      });
      const idleRow = npcIdleRowForFacing(facing);
      this.anims.create({
        key: npcIdleAnimKey(facing),
        frames: this.anims.generateFrameNumbers(NPC_IDLE_SHEET, {
          start: idleRow * NPC_IDLE_FRAMES_PER_ROW,
          end: idleRow * NPC_IDLE_FRAMES_PER_ROW + (NPC_IDLE_FRAMES_PER_ROW - 1),
        }),
        frameRate: 5,
        repeat: -1,
      });
    }
  }

  private createGirlAnims() {
    const facings: PlayerFacing[] = ["down", "up", "side"];

    for (const facing of facings) {
      const row = girlRowForFacing(facing);
      this.anims.create({
        key: girlWalkAnimKey(facing),
        frames: this.anims.generateFrameNumbers(GIRL_WALK_SHEET, {
          start: row * GIRL_WALK_FRAMES_PER_ROW,
          end: row * GIRL_WALK_FRAMES_PER_ROW + (GIRL_WALK_FRAMES_PER_ROW - 1),
        }),
        frameRate: 12,
        repeat: -1,
      });
      this.anims.create({
        key: girlIdleAnimKey(facing),
        frames: this.anims.generateFrameNumbers(GIRL_IDLE_SHEET, {
          start: row * GIRL_IDLE_FRAMES_PER_ROW,
          end: row * GIRL_IDLE_FRAMES_PER_ROW + (GIRL_IDLE_FRAMES_PER_ROW - 1),
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
    if (this.player.isMoving || this.dialogSession) return;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const targetTile: TileCoord = {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };

    if (!isWalkable(townGrid, targetTile.x, targetTile.y)) return;
    if (targetTile.x === GIRL_HOME.x && targetTile.y === GIRL_HOME.y) return;

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
