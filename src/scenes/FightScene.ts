import Phaser from "phaser";
import { showPixelSplash, type PixelSplashHandle } from "../ui/pixelSplash";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
const BACKGROUND_KEY = "fight-background";
const DEREK_PORTRAIT_KEY = "derek-fight-portrait";
const NAIGLE_PORTRAIT_KEY = "naigle-fight-portrait";
const BATTLE_MUSIC_KEY = "battle-music";
const VICTORY_MUSIC_KEY = "victory-music";
const BATTLE_MUSIC_VOLUME = 0.5;
const WIN_SIGN_URL = `${ASSET_BASE}you-win-sign.png`;
const WIN_SIGN_HOLD_MS = 5000;

const PORTRAIT_HEIGHT = 260;
// Naigle is drawn larger and anchored into the bottom-left corner, so a slice
// of him is deliberately cropped by the viewport (see create()).
const NAIGLE_PORTRAIT_HEIGHT = 560;
const NAIGLE_OFFSCREEN_LEFT = 0.35;
const NAIGLE_OFFSCREEN_BOTTOM = 0.3;

const HEALTH_BAR_WIDTH = 225;
const HEALTH_BAR_HEIGHT = 18;
const MAX_HEALTH = 100;

const TURN_DELAY_MS = 900;

// How fast the narration bubble reveals characters, matching the town dialog.
const NARRATION_STREAM_MS = 35;
// How long the finished narration stays on screen, as a multiple of the time it
// took to stream out (2 = lingers for one extra stream-length after completing).
const NARRATION_LINGER = 3;

interface Move {
  name: string;
  minDamage: number;
  maxDamage: number;
  /** Shown (streamed) in the top narration bubble when this move lands. */
  narration?: string;
}

// Placeholder move set - damage numbers and flavor are a first pass, easy to
// retune once real combat design is decided.
const NAIGLE_MOVES: Move[] = [
  {
    name: "Silent Treatment",
    minDamage: 20,
    maxDamage: 20,
    narration: "Naigle gives Derek the silent treatment and knocks him back on his heels.",
  },
  {
    name: "Jui-jitsu sneak attack",
    minDamage: 10,
    maxDamage: 12,
    narration: "You grab Derek in a choke hold but he taps out before massive damage is dealt.",
  },
  {
    name: "Subtly hint that you aren't in the mood.",
    minDamage: 0,
    maxDamage: 0,
    narration: "It has no effect! Derek seems oblivious.",
  },
  {
    name: "Go on a date with someone else",
    minDamage: 35,
    maxDamage: 35,
    narration: "You go on a date with someone else. Derek is devastated!",
  },
  {
    name: "Be cold to Derek",
    minDamage: 15,
    maxDamage: 15,
    narration: "Good hit! You were cold to Derek and now he seems really sad.",
  },
  {
    name: "Tell him that you went to your ex and he was more supportive",
    minDamage: 20,
    maxDamage: 20,
    narration: "Ouch, that one hurt a bit. But Derek says he's ok.",
  },
];

const DEREK_COUNTER: Move[] = [
  {
  name: "Too much touching",
  minDamage: 10,
  maxDamage: 10,
  narration: "Derek smothers you with too much touching while you are just trying to get something done. Minimal damage.",
  },
  {
  name: "Turns off emotions",
  minDamage: 20,
  maxDamage: 20,
  narration: "Derek turns off his emotions when you need him. Direct hit!",
  },
  {
  name: "Flirts with twink",
  minDamage: 15,
  maxDamage: 15,
  narration: "You see some twink slut talking to Derek at the gym. You took some damage.",
  },
  {
  name: "Apology",
  minDamage: 0,
  maxDamage: 0,
  narration: "Derek apologizes to you for not taking your feelings into account. It has no effect!",
  },
  {
  name: "Explanation",
  minDamage: 5,
  maxDamage: 5,
  narration: "Derek tries to explain to you that he loves you for who you are and that is the real reason he wants to be with you. It has some minimal effect.",
  }
];

function randomDamage(move: Move): number {
  return Math.round(move.minDamage + Math.random() * (move.maxDamage - move.minDamage));
}

export class FightScene extends Phaser.Scene {
  private naigleHealth = MAX_HEALTH;
  private derekHealth = MAX_HEALTH;
  private naigleSprite!: Phaser.GameObjects.Image;
  private derekSprite!: Phaser.GameObjects.Image;
  private naigleHealthBar!: Phaser.GameObjects.Graphics;
  private derekHealthBar!: Phaser.GameObjects.Graphics;
  private naigleBar = { x: 0, y: 0, w: HEALTH_BAR_WIDTH };
  private derekBar = { x: 0, y: 0, w: HEALTH_BAR_WIDTH };
  private menuEl: HTMLDivElement | null = null;
  private noteEl: HTMLDivElement | null = null;
  private narrationEl: HTMLDivElement | null = null;
  private narrationTimer: ReturnType<typeof setInterval> | null = null;
  private narrationHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private turnLocked = false;
  private music: Phaser.Sound.BaseSound | null = null;
  private winSplash: PixelSplashHandle | null = null;

  // Naigle sees at most two moves at once, drawn at random. Each move is
  // single-use within a round: when one is played it's dropped from the hand and
  // the next move from the round's pool (if any) slides in. When the pool and
  // hand are both empty the round resets and every move is available again.
  private hand: Move[] = [];
  private roundPool: Move[] = [];

  // Derek cycles through his counters in order, wrapping back to the start.
  private derekCounterIndex = 0;

  constructor() {
    super("FightScene");
  }

  preload() {
    this.load.image(BACKGROUND_KEY, `${ASSET_BASE}sprites/backgrounds/background1.png`);
    this.load.image(DEREK_PORTRAIT_KEY, `${ASSET_BASE}derek-fight.png`);
    this.load.image(NAIGLE_PORTRAIT_KEY, `${ASSET_BASE}naigle-fight.png`);
    this.load.audio(BATTLE_MUSIC_KEY, `${ASSET_BASE}battle-music2.mp3`);
    this.load.audio(VICTORY_MUSIC_KEY, `${ASSET_BASE}victory-music.mp3`);
    // The win sign is shown by the HTML pixel-splash overlay, which loads the
    // image itself — no Phaser texture needed.
  }

  create() {
    const { width, height } = this.scale;

    // Reset per-fight state so a rematch starts clean (the scene instance is
    // reused between fights).
    this.naigleHealth = MAX_HEALTH;
    this.derekHealth = MAX_HEALTH;
    this.turnLocked = false;
    this.derekCounterIndex = 0;
    this.winSplash?.destroy();
    this.winSplash = null;
    this.startRound();

    const background = this.add.image(width / 2, height / 2, BACKGROUND_KEY);
    background.setDisplaySize(width, height);

    this.playBattleMusic();

    const derekSprite = (this.derekSprite = this.addPortrait(
      DEREK_PORTRAIT_KEY,
      width * 0.78,
      height * 0.28,
    ));

    // Naigle sits in the bottom-left corner with his origin on that corner, then
    // nudged past the edges so ~15% of his width runs off the left and ~30% of
    // his height off the bottom of the screen.
    const naigleSprite = (this.naigleSprite = this.add.image(0, 0, NAIGLE_PORTRAIT_KEY).setOrigin(0, 1));
    naigleSprite.setScale(NAIGLE_PORTRAIT_HEIGHT / naigleSprite.height);
    naigleSprite.setPosition(
      -naigleSprite.displayWidth * NAIGLE_OFFSCREEN_LEFT,
      height + naigleSprite.displayHeight * NAIGLE_OFFSCREEN_BOTTOM,
    );

    // Derek's meter sits just off his left shoulder, level with his head.
    const derekLeft = derekSprite.x - derekSprite.displayWidth / 2;
    const derekHead = derekSprite.y - derekSprite.displayHeight / 2;
    this.derekBar = {
      x: Math.max(16, derekLeft - 24 - HEALTH_BAR_WIDTH),
      y: derekHead + derekSprite.displayHeight * 0.12,
      w: HEALTH_BAR_WIDTH,
    };

    // Naigle's meter stretches along the bottom edge, from his right side to
    // ~20px shy of the right edge, but never narrower than HEALTH_BAR_WIDTH.
    const naigleBarX = Phaser.Math.Clamp(
      naigleSprite.x + naigleSprite.displayWidth + 28,
      16,
      width - 20 - HEALTH_BAR_WIDTH,
    );
    this.naigleBar = {
      x: naigleBarX,
      y: height - HEALTH_BAR_HEIGHT - 18,
      w: width - 20 - naigleBarX,
    };

    this.addNameLabel("Derek", this.derekBar);
    this.addNameLabel("Naigle", this.naigleBar);

    this.derekHealthBar = this.add.graphics();
    this.naigleHealthBar = this.add.graphics();
    this.redrawHealthBars();

    // Dev-only shortcut: /?win jumps straight to the victory splash so it can be
    // inspected without playing out a whole fight.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("win")) {
      this.derekHealth = 0;
      this.redrawHealthBars();
      this.knockOut(this.derekSprite);
      this.onNaigleWins();
    } else {
      this.showMoveMenu();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeMenu();
      this.clearNarration();
      this.noteEl?.remove();
      this.noteEl = null;
      this.winSplash?.destroy();
      this.winSplash = null;
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
    this.drawHealthBar(this.derekHealthBar, this.derekBar, this.derekHealth);
    this.drawHealthBar(this.naigleHealthBar, this.naigleBar, this.naigleHealth);
  }

  private drawHealthBar(
    graphics: Phaser.GameObjects.Graphics,
    bar: { x: number; y: number; w: number },
    health: number,
  ) {
    const pct = Phaser.Math.Clamp(health, 0, MAX_HEALTH) / MAX_HEALTH;
    graphics.clear();
    graphics.fillStyle(0x000000, 0.35);
    graphics.fillRect(bar.x - 2, bar.y - 2, bar.w + 4, HEALTH_BAR_HEIGHT + 4);
    graphics.fillStyle(0x3a2a1a, 1);
    graphics.fillRect(bar.x, bar.y, bar.w, HEALTH_BAR_HEIGHT);
    const fillColor = pct > 0.5 ? 0x4caf50 : pct > 0.2 ? 0xffb300 : 0xe53935;
    graphics.fillStyle(fillColor, 1);
    graphics.fillRect(bar.x, bar.y, bar.w * pct, HEALTH_BAR_HEIGHT);
    graphics.lineStyle(2, 0x2b2118, 1);
    graphics.strokeRect(bar.x, bar.y, bar.w, HEALTH_BAR_HEIGHT);
  }

  private closeMenu() {
    this.menuEl?.remove();
    this.menuEl = null;
  }

  // The struck character wobbles and flashes lighter a few times; the amplitude
  // and pulse count scale with how hard the hit landed (damage / the move's max).
  private hitReaction(sprite: Phaser.GameObjects.Image, damage: number, maxDamage: number) {
    // A no-damage move (maxDamage 0) gets no reaction rather than a NaN one.
    if (damage <= 0 || maxDamage <= 0) return;
    const intensity = Phaser.Math.Clamp(damage / maxDamage, 0, 1);
    const angleAmp = 1.5 + intensity * 9;
    const shiftAmp = 1 + intensity * 8;
    const pulses = 2 + Math.round(intensity * 3);
    const step = 55;

    const baseAngle = sprite.angle;
    const baseX = sprite.x;

    this.tweens.killTweensOf(sprite);
    this.tweens.add({
      targets: sprite,
      angle: { from: baseAngle - angleAmp, to: baseAngle + angleAmp },
      x: { from: baseX - shiftAmp, to: baseX + shiftAmp },
      duration: step,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: pulses,
      onComplete: () => {
        sprite.setAngle(baseAngle);
        sprite.x = baseX;
      },
    });

    // Additive tint so the sprite brightens rather than turning into a
    // silhouette; a harder hit washes it out further toward white.
    const g = Math.round((0.35 + intensity * 0.5) * 255);
    const flashColor = (g << 16) | (g << 8) | g;
    const applyFlash = () => sprite.setTint(flashColor).setTintMode(Phaser.TintModes.ADD);

    let flip = 0;
    const total = pulses * 2;
    applyFlash();
    this.time.addEvent({
      delay: step,
      repeat: total - 1,
      callback: () => {
        flip += 1;
        if (flip >= total || flip % 2 === 1) {
          sprite.clearTint();
        } else {
          applyFlash();
        }
      },
    });
  }

  // Fight narration lives in a bubble across the top of the screen, shown only
  // while there's something to say. The text streams in character by character,
  // the same as the town dialog, then lingers so it stays on screen for
  // NARRATION_LINGER times as long as it took to stream. Returns that total
  // on-screen duration in ms so callers can pace the turn to it.
  private showNarration(text: string): number {
    if (!this.narrationEl) {
      this.narrationEl = document.createElement("div");
      this.narrationEl.className = "dialog-bubble dialog-bubble--narration";
      document.body.appendChild(this.narrationEl);
    }

    this.stopNarrationStream();
    const streamMs = text.length * NARRATION_STREAM_MS;
    const holdMs = streamMs * (NARRATION_LINGER - 1);
    const el = this.narrationEl;
    el.textContent = "";
    let revealed = 0;
    this.narrationTimer = setInterval(() => {
      revealed += 1;
      const ch = text[revealed - 1];
      el.textContent = text.slice(0, revealed);
      if (ch && ch !== " ") this.playNarrationBlip();
      if (revealed >= text.length) {
        this.stopNarrationStream();
        this.narrationHoldTimer = setTimeout(() => this.clearNarration(), holdMs);
      }
    }, NARRATION_STREAM_MS);

    return streamMs * NARRATION_LINGER;
  }

  private stopNarrationStream() {
    if (this.narrationTimer !== null) {
      clearInterval(this.narrationTimer);
      this.narrationTimer = null;
    }
    if (this.narrationHoldTimer !== null) {
      clearTimeout(this.narrationHoldTimer);
      this.narrationHoldTimer = null;
    }
  }

  private clearNarration() {
    this.stopNarrationStream();
    this.narrationEl?.remove();
    this.narrationEl = null;
  }

  // A short square-wave tick per revealed character (mirrors TownScene's blip).
  private playNarrationBlip() {
    const soundManager = this.sound;
    if (!(soundManager instanceof Phaser.Sound.WebAudioSoundManager)) return;

    const ctx = soundManager.context;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(320 + Math.random() * 50, ctx.currentTime);
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    oscillator.connect(gain).connect(soundManager.masterVolumeNode);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.05);
  }

  // Shuffle every move back into play and deal a fresh random hand of two.
  private startRound() {
    this.roundPool = Phaser.Utils.Array.Shuffle([...NAIGLE_MOVES]);
    this.hand = this.roundPool.splice(0, 2);
  }

  private showMoveMenu() {
    this.closeMenu();

    // Out of moves: reset the round so everything is available again.
    if (this.hand.length === 0) this.startRound();

    const menu = document.createElement("div");
    menu.className = "dialog-bubble dialog-bubble--player dialog-bubble--fight-menu";

    const heading = document.createElement("p");
    heading.className = "dialog-bubble--menu-heading";
    heading.textContent = "Choose your attack:";
    menu.appendChild(heading);

    for (const move of this.hand) {
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

    // Spend the move: drop it from the hand and pull in the next from the pool.
    this.hand = this.hand.filter((m) => m !== move);
    const next = this.roundPool.shift();
    if (next) this.hand.push(next);

    const damage = randomDamage(move);
    this.derekHealth = Math.max(0, this.derekHealth - damage);
    this.redrawHealthBars();
    this.hitReaction(this.derekSprite, damage, move.maxDamage);
    const playerBeat = Math.max(
      TURN_DELAY_MS,
      this.showNarration(move.narration ?? `Naigle lands a ${move.name}!`),
    );

    if (this.derekHealth <= 0) {
      this.time.delayedCall(playerBeat, () => {
        this.knockOut(this.derekSprite);
        this.onNaigleWins();
      });
      return;
    }

    this.time.delayedCall(playerBeat, () => {
      const counter = DEREK_COUNTER[this.derekCounterIndex];
      this.derekCounterIndex = (this.derekCounterIndex + 1) % DEREK_COUNTER.length;
      const counterDamage = randomDamage(counter);
      this.naigleHealth = Math.max(0, this.naigleHealth - counterDamage);
      this.redrawHealthBars();
      this.hitReaction(this.naigleSprite, counterDamage, counter.maxDamage);
      const derekBeat = Math.max(
        TURN_DELAY_MS,
        this.showNarration(counter.narration ?? "Derek swings back!"),
      );

      if (this.naigleHealth <= 0) {
        this.time.delayedCall(derekBeat, () => {
          this.knockOut(this.naigleSprite);
          this.endFight();
        });
        return;
      }

      this.time.delayedCall(derekBeat, () => {
        this.turnLocked = false;
        this.showMoveMenu();
      });
    });
  }

  // Sink a knocked-out character to near-black.
  private knockOut(sprite: Phaser.GameObjects.Image) {
    this.tweens.killTweensOf(sprite);
    sprite.setTint(0x0a0a0a).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  private onNaigleWins() {
    this.clearNarration();

    // Swap battle music for the victory track; it loops until the SHUTDOWN
    // handler stops it on the way back to town.
    this.music?.stop();
    if (this.cache.audio.exists(VICTORY_MUSIC_KEY)) {
      this.music = this.sound.add(VICTORY_MUSIC_KEY, { loop: true, volume: BATTLE_MUSIC_VOLUME });
      this.music.play();
    }

    // The win sign fades in over the battlefield, holds, then fades out (on a
    // tap or after WIN_SIGN_HOLD_MS) — then the note bubble appears.
    this.winSplash = showPixelSplash(WIN_SIGN_URL, {
      holdMs: WIN_SIGN_HOLD_MS,
      onDone: () => {
        this.winSplash = null;
        this.endFight();
      },
    });
  }

  private endFight() {
    this.closeMenu();
    this.clearNarration();

    const note = document.createElement("div");
    note.className = "dialog-bubble dialog-bubble--note";
    const noteHeading = document.createElement("p");
    noteHeading.className = "dialog-bubble--menu-heading";
    noteHeading.textContent = "Derek hands you a note.";
    const noteBody = document.createElement("p");
    noteBody.textContent = "Naigle, I love you so much and I'm really sorry that I hurt you. I spend so much time thinking about what I can do to help you and show my love for you, but sometimes I forget about what I shouldn't do, to show my love. I shouldn't have kept going when I could tell you weren't in the mood. I should have found something else to do with you. And to make things worse, it only happened because you are so kind and feel bad about telling me no. I don't want you to feel bad about telling me no. I want you to feel respected and loved for who you are, because I really do love and respect you for who you are. Please don't distance yourself from me. The physical distance is already so much. Please give me another chance. And most of all, please know that you are loved for who you are.";
    note.append(noteHeading, noteBody);
    document.body.appendChild(note);
    this.noteEl = note;

    // No "Back to town" for now — the game just rests on Derek's note.
  }
}
