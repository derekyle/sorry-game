const STREAM_INTERVAL_MS = 35;
const CHOICES_DELAY_MS = 300;
const CLOSE_DELAY_MS = 400;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface DialogChoice {
  text: string;
}

export interface ShowDialogOptions {
  npcMessage: string;
  choices: DialogChoice[];
  /** Called once per revealed non-space character, for a text-blip sound. */
  onCharacterRevealed?: () => void;
  onChoiceSelected?: (index: number) => void;
  /** Called once both bubbles have been removed from the page. */
  onClosed?: () => void;
}

export interface DialogSession {
  /** Screen-space anchor point (just above the NPC's head), updated every frame. */
  updateNpcAnchor(anchor: ScreenPoint): void;
  readonly active: boolean;
}

function positionBubble(bubble: HTMLDivElement, anchor: ScreenPoint) {
  bubble.style.left = `${anchor.x}px`;
  bubble.style.top = `${anchor.y}px`;
}

export function showDialog(options: ShowDialogOptions): DialogSession {
  const { npcMessage, choices, onCharacterRevealed, onChoiceSelected, onClosed } = options;

  let active = true;

  const npcBubble = document.createElement("div");
  npcBubble.className = "dialog-bubble dialog-bubble--npc";
  const npcText = document.createElement("p");
  npcBubble.appendChild(npcText);
  document.body.appendChild(npcBubble);

  // The player's choices are a fixed bottom-of-screen menu rather than a
  // bubble tracking his position: he's always adjacent to the NPC to trigger
  // this at all, so a floating bubble at his position would frequently
  // collide with (and get covered by) hers.
  let playerMenu: HTMLDivElement | null = null;

  let revealedCount = 0;
  let streamTimer: ReturnType<typeof setInterval> | null = null;

  const revealNextChar = () => {
    revealedCount += 1;
    const ch = npcMessage[revealedCount - 1];
    npcText.textContent = npcMessage.slice(0, revealedCount);
    if (ch && ch !== " ") {
      onCharacterRevealed?.();
    }
    if (revealedCount >= npcMessage.length) {
      finishStreaming();
    }
  };

  const finishStreaming = () => {
    if (streamTimer !== null) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
    npcText.textContent = npcMessage;
    setTimeout(showChoices, CHOICES_DELAY_MS);
  };

  streamTimer = setInterval(revealNextChar, STREAM_INTERVAL_MS);

  // Clicking the NPC bubble while it's still streaming skips straight to the
  // full message, matching standard dialog-box UX.
  npcBubble.addEventListener("pointerdown", () => {
    if (streamTimer !== null) finishStreaming();
  });

  function showChoices() {
    playerMenu = document.createElement("div");
    playerMenu.className = "dialog-bubble dialog-bubble--player";
    for (const [index, choice] of choices.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.text;
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        onChoiceSelected?.(index);
        close();
      });
      playerMenu.appendChild(button);
    }
    document.body.appendChild(playerMenu);
  }

  function close() {
    active = false;
    setTimeout(() => {
      npcBubble.remove();
      playerMenu?.remove();
      onClosed?.();
    }, CLOSE_DELAY_MS);
  }

  return {
    get active() {
      return active;
    },
    updateNpcAnchor(anchor) {
      positionBubble(npcBubble, anchor);
    },
  };
}
