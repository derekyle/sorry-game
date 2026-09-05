import Phaser from "phaser";
import { TownScene } from "../scenes/TownScene";
import { FightScene } from "../scenes/FightScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  // Dev-only shortcut: load http://localhost:5173/?fight to boot straight into
  // the fight scene on every Vite refresh (?win goes further — see FightScene —
  // jumping straight to the victory splash). Phaser auto-starts whichever scene
  // is first in this array; TownScene stays registered so "Back to town" works.
  const params = new URLSearchParams(window.location.search);
  const bootFight = import.meta.env.DEV && (params.has("fight") || params.has("win"));

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1a1a2e",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: bootFight ? [FightScene, TownScene] : [TownScene, FightScene],
  });
}
