import { drawDissolveFrame } from "./pixelDissolve";

const FADE_MS = 700;

interface PixelSplashOptions {
  /** How long the image stays fully visible before fading out (ms). */
  holdMs: number;
  /** Called once the fade-out finishes and the overlay is removed. */
  onDone?: () => void;
}

export interface PixelSplashHandle {
  /** Tear the splash down immediately, with no fade-out and no onDone. */
  destroy(): void;
}

// Centered full-screen image that fades in with a coarse pixelation dissolve,
// holds, then fades back out the same way — after `holdMs` or on a screen tap,
// whichever comes first.
export function showPixelSplash(imageUrl: string, { holdMs, onDone }: PixelSplashOptions): PixelSplashHandle {
  const overlay = document.createElement("div");
  overlay.className = "pixel-splash";
  const canvas = document.createElement("canvas");
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext("2d");
  const tempCtx = document.createElement("canvas").getContext("2d");

  let rafId = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  const remove = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(rafId);
    if (holdTimer !== null) clearTimeout(holdTimer);
    if (watchdog !== null) clearTimeout(watchdog);
    window.removeEventListener("resize", layout);
    overlay.remove();
  };

  // Called on any exit path except destroy(): tear down, then hand control back.
  const finish = () => {
    if (done) return;
    remove();
    onDone?.();
  };

  if (!ctx || !tempCtx) {
    finish();
    return { destroy: remove };
  }

  const image = new Image();
  let width = 0;
  let height = 0;

  function layout() {
    if (!image.naturalWidth) return;
    const scale = Math.min(
      (window.innerWidth * 0.85) / image.naturalWidth,
      (window.innerHeight * 0.6) / image.naturalHeight,
      1,
    );
    width = Math.max(1, Math.round(image.naturalWidth * scale));
    height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  // eased 0..1 -> pixelScale: 1 = crisp, ~0.02 = a handful of huge blocks.
  const pixelScaleFor = (progress: number) => Math.max(0.02, 1 - progress * 0.95);

  const runPhase = (fadingIn: boolean, after: () => void) => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      const shown = fadingIn ? t : 1 - t;
      const eased = shown * shown;
      try {
        drawDissolveFrame(ctx, tempCtx, image, width, height, pixelScaleFor(1 - eased), shown);
      } catch (err) {
        // A bad draw shouldn't strand the game on a frozen overlay.
        console.error("pixel splash draw failed", err);
        after();
        return;
      }
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        after();
      }
    };
    rafId = requestAnimationFrame(step);
  };

  const fadeOut = () => {
    if (done) return;
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    overlay.removeEventListener("pointerdown", fadeOut);
    runPhase(false, finish);
  };

  const begin = () => {
    layout();
    runPhase(true, () => {
      if (done) return;
      overlay.addEventListener("pointerdown", fadeOut, { once: true });
      holdTimer = setTimeout(fadeOut, holdMs);
    });
  };

  image.onload = begin;
  image.onerror = () => {
    console.error("pixel splash image failed to load:", imageUrl);
    finish();
  };
  image.src = imageUrl;

  window.addEventListener("resize", layout);

  // Last-resort guarantee that the splash never outlives its natural length,
  // even if the image never fires load/error or an animation frame is dropped.
  watchdog = setTimeout(finish, FADE_MS * 2 + holdMs + 2000);

  return { destroy: remove };
}
