export const TITLE_SPLASH_FADE_MS = 700;

interface ShowTitleSplashOptions {
  onDismiss: () => void;
}

// Dissolves the splash by progressively downscaling it onto a hidden
// low-res canvas and redrawing that unsmoothed at full size, so the
// blocks get coarser as the image fades rather than blurring smoothly.
function drawDissolveFrame(
  ctx: CanvasRenderingContext2D,
  tempCtx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  pixelScale: number,
  alpha: number,
) {
  const tempCanvas = tempCtx.canvas;
  const smallWidth = Math.max(1, Math.round(width * pixelScale));
  const smallHeight = Math.max(1, Math.round(height * pixelScale));

  tempCanvas.width = smallWidth;
  tempCanvas.height = smallHeight;
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.drawImage(image, 0, 0, smallWidth, smallHeight);

  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height);
  ctx.globalAlpha = 1;
}

export function showTitleSplash(imageUrl: string, { onDismiss }: ShowTitleSplashOptions): void {
  const overlay = document.createElement("div");
  overlay.className = "title-splash";

  const canvas = document.createElement("canvas");
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);

  const ctx = canvas.getContext("2d");
  const tempCtx = document.createElement("canvas").getContext("2d");
  if (!ctx || !tempCtx) {
    overlay.remove();
    onDismiss();
    return;
  }

  const image = new Image();
  let naturalWidth = 0;
  let naturalHeight = 0;

  const layout = () => {
    if (!naturalWidth) return;
    const maxWidth = Math.min(naturalWidth, window.innerWidth * 0.85);
    const maxHeight = window.innerHeight * 0.6;
    const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
    const width = Math.round(naturalWidth * scale);
    const height = Math.round(naturalHeight * scale);

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    drawDissolveFrame(ctx, tempCtx, image, width, height, 1, 1);
  };

  image.onload = () => {
    naturalWidth = image.naturalWidth;
    naturalHeight = image.naturalHeight;
    layout();
  };
  image.src = imageUrl;

  window.addEventListener("resize", layout);

  const dismiss = () => {
    window.removeEventListener("resize", layout);
    onDismiss();

    const width = canvas.width;
    const height = canvas.height;
    const start = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / TITLE_SPLASH_FADE_MS);
      const eased = t * t;
      const pixelScale = Math.max(0.02, 1 - eased * 0.95);
      drawDissolveFrame(ctx, tempCtx, image, width, height, pixelScale, 1 - t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        overlay.remove();
      }
    };

    requestAnimationFrame(animate);
  };

  overlay.addEventListener("pointerdown", dismiss, { once: true });
}
