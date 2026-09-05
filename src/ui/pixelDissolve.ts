// Renders one frame of a "coarse pixelation" dissolve: the image is drawn
// small onto a hidden low-res canvas and then blown back up unsmoothed, so the
// blocks get chunkier as `pixelScale` drops toward 0. `alpha` fades it out.
export function drawDissolveFrame(
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
