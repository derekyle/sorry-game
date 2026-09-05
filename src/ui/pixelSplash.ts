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
  let done = false;

  const teardown = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(rafId);
    if (holdTimer !== null) clearTimeout(holdTimer);
    window.removeEventListener("resize", layout);
    overlay.remove();
  };

  if (!ctx || !tempCtx) {
    teardown();
    onDone?.();
    return { destroy: () => {} };
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
    width = Math.round(image.naturalWidth * scale);
    height = Math.round(image.naturalHeight * scale);
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
      drawDissolveFrame(ctx, tempCtx, image, width, height, pixelScaleFor(1 - eased), shown);
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
    runPhase(false, () => {
      teardown();
      onDone?.();
    });
  };

  image.onload = () => {
    layout();
    runPhase(true, () => {
      if (done) return;
      overlay.addEventListener("pointerdown", fadeOut, { once: true });
      holdTimer = setTimeout(fadeOut, holdMs);
    });
  };
  image.src = imageUrl;

  window.addEventListener("resize", layout);

  return { destroy: teardown };
}
