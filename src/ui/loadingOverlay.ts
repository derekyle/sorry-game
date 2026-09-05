export interface LoadingOverlay {
  /** Fill the progress bar; `fraction` is 0..1. */
  setProgress(fraction: number): void;
  /** Fade the overlay out and remove it from the DOM. */
  remove(): void;
}

function build(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.innerHTML =
    '<div class="loading-overlay__blocks"><span></span><span></span><span></span></div>' +
    '<div class="loading-overlay__track"><div class="loading-overlay__bar"></div></div>';
  document.body.appendChild(overlay);
  return overlay;
}

// Shows an animated loading screen. The first call adopts the #boot-loader
// markup already in index.html (so it's up from the very first paint); later
// calls — e.g. the town → fight transition — build a fresh one.
export function showLoadingOverlay(): LoadingOverlay {
  const overlay = document.getElementById("boot-loader") ?? build();
  overlay.removeAttribute("id");
  overlay.classList.remove("loading-overlay--hidden");

  const bar = overlay.querySelector<HTMLElement>(".loading-overlay__bar");
  let removed = false;

  return {
    setProgress(fraction) {
      if (bar) bar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    },
    remove() {
      if (removed) return;
      removed = true;
      overlay.classList.add("loading-overlay--hidden");
      const drop = () => overlay.remove();
      overlay.addEventListener("transitionend", drop, { once: true });
      // Fallback in case the transition never fires (e.g. reduced motion).
      setTimeout(drop, 500);
    },
  };
}
