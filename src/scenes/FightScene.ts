import Phaser from "phaser";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const BACKGROUND_KEY = "fight-background";
const DEREK_PORTRAIT_KEY = "derek-fight-portrait";
const NAIGLE_PORTRAIT_KEY = "naigle-fight-portrait";
const BATTLE_MUSIC_KEY = "battle-music";
const BATTLE_MUSIC_VOLUME = 0.5;

const PORTRAIT_HEIGHT = 260;

const HEALTH_BAR_WIDTH = 180;
const HEALTH_BAR_HEIGHT = 18;
const MAX_HEALTH = 100;

const TURN_DELAY_MS = 900;

interface Move {
  name: string;
  minDamage: number;
  maxDamage: number;
}

// Placeholder move set - damage numbers and flavor are a first pass, easy to
// retune once real combat design is decided.
const NAIGLE_MOVES: Move[] = [
  { name: "Jab", minDamage: 8, maxDamage: 14 },
  { name: "Kick", minDamage: 12, maxDamage: 18 },
  { name: "Haymaker", minDamage: 18, maxDamage: 28 },
];

const DEREK_COUNTER: Move = { name: "Derek swings back", minDamage: 10, maxDamage: 20 };

function randomDamage(move: Move): number {
  return Math.round(move.minDamage + Math.random() * (move.maxDamage - move.minDamage));
}

export class FightScene extends Phaser.Scene {
  private naigleHealth = MAX_HEALTH;
  private derekHealth = MAX_HEALTH;
  private naigleHealthBar!: Phaser.GameObjects.Graphics;
  private derekHealthBar!: Phaser.GameObjects.Graphics;
  private naigleBarPos = { x: 0, y: 0 };
  private derekBarPos = { x: 0, y: 0 };
  private menuEl: HTMLDivElement | null = null;
  private turnLocked = false;
  private music: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super("FightScene");
  }

  preload() {
    this.load.image(BACKGROUND_KEY, `${ASSET_BASE}sprites/backgrounds/background1.png`);
    this.load.image(DEREK_PORTRAIT_KEY, `${ASSET_BASE}derek-fight.png`);
    this.load.image(NAIGLE_PORTRAIT_KEY, `${ASSET_BASE}naigle-fight.png`);
    this.load.audio(BATTLE_MUSIC_KEY, `${ASSET_BASE}battle-music.mp3`);
  }

  create() {
    const { width, height } = this.scale;

    const background = this.add.image(width / 2, height / 2, BACKGROUND_KEY);
    background.setDisplaySize(width, height);

    this.playBattleMusic();

    const derekSprite = this.addPortrait(DEREK_PORTRAIT_KEY, width * 0.78, height * 0.28);
    const naigleSprite = this.addPortrait(NAIGLE_PORTRAIT_KEY, width * 0.22, height * 0.75);

    this.derekBarPos = { x: derekSprite.x - HEALTH_BAR_WIDTH / 2, y: derekSprite.y - derekSprite.displayHeight / 2 - 40 };
    this.naigleBarPos = {
      x: naigleSprite.x - HEALTH_BAR_WIDTH / 2,
      y: naigleSprite.y - naigleSprite.displayHeight / 2 - 40,
    };

    this.addNameLabel("Derek", this.derekBarPos);
    this.addNameLabel("Naigle", this.naigleBarPos);

    this.derekHealthBar = this.add.graphics();
    this.naigleHealthBar = this.add.graphics();
    this.redrawHealthBars();

    this.showMoveMenu();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeMenu();
      this.music?.stop();
    });
  }

  private playBattleMusic() {
    // Guards against a missing/failed-to-load audio file: without this,
    // sound.add() throws on a key the loader never populated and the whole
    // fight scene would fail to start.
    if (!this.cache.audio.exists(BATTLE_MUSIC_KEY)) return;

    this.music = this.sound.add(BATTLE_MUSIC_KEY, { loop: true, volume: BATTLE_MUSIC_VOLUME });

    // The town's footsteps/dialog interactions have already unlocked audio
    // by the time a fight can start, but guard the same way TownScene does
    // in case this scene is ever reachable before any user interaction.
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.music?.play());
    } else {
      this.music.play();
    }
  }

  private addPortrait(key: string, x: number, y: number): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, key);
    image.setScale(PORTRAIT_HEIGHT / image.height);
    return image;
  }

  private addNameLabel(text: string, pos: { x: number; y: number }) {
    this.add.text(pos.x, pos.y - 22, text, {
      fontFamily: '"Patrick Hand", sans-serif',
      fontSize: "20px",
      color: "#2b2118",
    });
  }

  private redrawHealthBars() {
    this.drawHealthBar(this.derekHealthBar, this.derekBarPos, this.derekHealth);
    this.drawHealthBar(this.naigleHealthBar, this.naigleBarPos, this.naigleHealth);
  }

  private drawHealthBar(graphics: Phaser.GameObjects.Graphics, pos: { x: number; y: number }, health: number) {
    const pct = Phaser.Math.Clamp(health, 0, MAX_HEALTH) / MAX_HEALTH;
    graphics.clear();
    graphics.fillStyle(0x000000, 0.35);
    graphics.fillRect(pos.x - 2, pos.y - 2, HEALTH_BAR_WIDTH + 4, HEALTH_BAR_HEIGHT + 4);
    graphics.fillStyle(0x3a2a1a, 1);
    graphics.fillRect(pos.x, pos.y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    const fillColor = pct > 0.5 ? 0x4caf50 : pct > 0.2 ? 0xffb300 : 0xe53935;
    graphics.fillStyle(fillColor, 1);
    graphics.fillRect(pos.x, pos.y, HEALTH_BAR_WIDTH * pct, HEALTH_BAR_HEIGHT);
    graphics.lineStyle(2, 0x2b2118, 1);
    graphics.strokeRect(pos.x, pos.y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
  }

  private closeMenu() {
    this.menuEl?.remove();
    this.menuEl = null;
  }

  private showMoveMenu() {
    this.closeMenu();

    const menu = document.createElement("div");
    menu.className = "dialog-bubble dialog-bubble--player";
    for (const move of NAIGLE_MOVES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = move.name;
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        this.playTurn(move);
      });
      menu.appendChild(button);
    }
    document.body.appendChild(menu);
    this.menuEl = menu;
  }

  private playTurn(move: Move) {
    if (this.turnLocked) return;
    this.turnLocked = true;
    this.closeMenu();

    this.derekHealth = Math.max(0, this.derekHealth - randomDamage(move));
    this.redrawHealthBars();

    if (this.derekHealth <= 0) {
      this.time.delayedCall(TURN_DELAY_MS, () => this.endFight("You beat Derek!"));
      return;
    }

    this.time.delayedCall(TURN_DELAY_MS, () => {
      this.naigleHealth = Math.max(0, this.naigleHealth - randomDamage(DEREK_COUNTER));
      this.redrawHealthBars();

      if (this.naigleHealth <= 0) {
        this.time.delayedCall(TURN_DELAY_MS, () => this.endFight("Derek beat you..."));
        return;
      }

      this.turnLocked = false;
      this.showMoveMenu();
    });
  }

  private endFight(message: string) {
    this.closeMenu();

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, message, {
        fontFamily: '"Patrick Hand", sans-serif',
        fontSize: "32px",
        color: "#fdf6e6",
        stroke: "#2b2118",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const menu = document.createElement("div");
    menu.className = "dialog-bubble dialog-bubble--player";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Back to town";
    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      // Stop (not sleep) this scene so a rematch starts from a clean state,
      // and wake (not start) TownScene so it resumes exactly where the
      // player left off rather than resetting position/quest progress.
      // Goes through the manager directly (see TownScene.updateDerekEncounter)
      // rather than this.scene.stop()/wake(), which queue but don't reliably
      // get flushed here.
      const manager = this.game.scene;
      manager.stop(this.scene.key);
      manager.wake("TownScene");
    });
    menu.appendChild(button);
    document.body.appendChild(menu);
    this.menuEl = menu;
  }
}
