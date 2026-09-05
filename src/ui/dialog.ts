const STREAM_INTERVAL_MS = 35;
const CHOICES_DELAY_MS = 300;
const CLOSE_DELAY_MS = 400;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface DialogChoice {
  text: string;
  /** Called when this choice is picked. */
  onSelect?: () => void;
  /** The next node to show, or omit to end the conversation. */
  next?: DialogNode;
}

export interface DialogNode {
  npcMessage: string;
  /**
   * The player's replies. Omit (or leave empty) for a terminal node: the NPC
   * says their line and the conversation closes on its own.
   */
  choices?: DialogChoice[];
}

export interface ShowDialogOptions {
  /** Called once per revealed non-space character, for a text-blip sound. */
  onCharacterRevealed?: () => void;
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

export function showDialog(root: DialogNode, options: ShowDialogOptions = {}): DialogSession {
  const { onCharacterRevealed, onClosed } = options;

  let active = true;

  const npcBubble = document.createElement("div");
  npcBubble.className = "dialog-bubble dialog-bubble--npc";
  const npcText = document.createElement("p");
  npcBubble.appendChild(npcText);
  document.body.appendChild(npcBubble);

  // The player's choices are a fixed bottom-of-screen menu rather than a
  // bubble tracking his position: he's necessarily adjacent to the NPC to
  // trigger this at all, so a floating bubble there would frequently
  // collide with (and get covered by) hers.
  let playerMenu: HTMLDivElement | null = null;

  let activeNode: DialogNode = root;
  let revealedCount = 0;
  let streamTimer: ReturnType<typeof setInterval> | null = null;

  function runNode(node: DialogNode) {
    playerMenu?.remove();
    playerMenu = null;
    activeNode = node;
    revealedCount = 0;
    npcText.textContent = "";
    streamTimer = setInterval(revealNextChar, STREAM_INTERVAL_MS);
  }

  const revealNextChar = () => {
    revealedCount += 1;
    const ch = activeNode.npcMessage[revealedCount - 1];
    npcText.textContent = activeNode.npcMessage.slice(0, revealedCount);
    if (ch && ch !== " ") {
      onCharacterRevealed?.();
    }
    if (revealedCount >= activeNode.npcMessage.length) {
      finishStreaming();
    }
  };

  const finishStreaming = () => {
    if (streamTimer !== null) {
      clearInterval(streamTimer);
      streamTimer = null;
    }
    npcText.textContent = activeNode.npcMessage;
    if (activeNode.choices && activeNode.choices.length > 0) {
      setTimeout(() => showChoices(activeNode), CHOICES_DELAY_MS);
    } else {
      setTimeout(close, CHOICES_DELAY_MS);
    }
  };

  // Clicking the NPC bubble while it's still streaming skips straight to the
  // full message, matching standard dialog-box UX.
  npcBubble.addEventListener("pointerdown", () => {
    if (streamTimer !== null) finishStreaming();
  });

  function showChoices(node: DialogNode) {
    playerMenu = document.createElement("div");
    playerMenu.className = "dialog-bubble dialog-bubble--player";
    for (const choice of node.choices ?? []) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.text;
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        choice.onSelect?.();
        if (choice.next) {
          runNode(choice.next);
        } else {
          close();
        }
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

  runNode(root);

  return {
    get active() {
      return active;
    },
    updateNpcAnchor(anchor) {
      positionBubble(npcBubble, anchor);
    },
  };
}
