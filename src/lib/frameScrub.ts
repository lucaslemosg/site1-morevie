/**
 * Maps hero scroll progress to a frame in the construction sequence.
 *
 * The hero is not a <video>: Safari and iOS will not seek an MP4 smoothly
 * enough to tie playback to the scrollbar, so the frames ship decoded and get
 * painted to an <img>. Kept DOM-free so the mapping can be tested — this is
 * where the off-by-one and the divide-by-zero live.
 */

export const HERO_FRAME_COUNT = 120;

/** Acima desta largura a hero mostra a maquete; abaixo, só marca e botões. */
export const MOBILE_BREAKPOINT = 768;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Frame index (0-based) for a given progress, never out of bounds. */
export function frameIndexFromProgress(progress: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return Math.round(clamp01(progress) * (frameCount - 1));
}

/** Public path for a frame. Files are 1-based and zero padded to three digits. */
export function framePath(index: number): string {
  return `/hero-frames/f_${String(index + 1).padStart(3, "0")}.webp`;
}

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Geometry for drawing a source image into a canvas with `object-fit: contain`.
 *
 * Contain, not cover: the video was composed with the model to one side and
 * deliberate empty space beside it. Cover would crop away exactly that margin.
 */
export function containRect(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Rect {
  const scale = Math.min(dstWidth / srcWidth, dstHeight / srcHeight);
  const width = srcWidth * scale;
  const height = srcHeight * scale;
  return { x: (dstWidth - width) / 2, y: (dstHeight - height) / 2, width, height };
}

/**
 * Slides a rect horizontally by a fraction of the destination width.
 *
 * The video composes the model on one side with deliberate empty space beside
 * it. Sliding the drawn frame moves the model to the other half without
 * re-rendering the video — the exposed strip is background either way.
 */
export function shiftRect(rect: Rect, dstWidth: number, fraction: number): Rect {
  return { ...rect, x: rect.x + dstWidth * fraction };
}

/** Scales a rect about its own centre, keeping its aspect ratio. */
export function scaleRect(rect: Rect, factor: number): Rect {
  const width = rect.width * factor;
  const height = rect.height * factor;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/**
 * Whether the hero should render the model at all.
 *
 * On a narrow screen the side-by-side composition has nowhere to go, so the
 * hero is just the wordmark and the buttons — and the phone never downloads
 * the frame sequence. Reduced motion opts out for the same reason the scrub
 * exists: the whole point of the sequence is the movement.
 */
export function shouldRenderModel(viewportWidth: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  return viewportWidth > MOBILE_BREAKPOINT;
}

/**
 * Opacity of the "scroll to build" hint for a given scrub progress.
 *
 * The hero opens on an empty plot: without a prompt there is nothing telling
 * the visitor that the building is theirs to raise, and a still photo of dirt
 * is a poor first impression. The hint therefore starts fully visible and
 * clears out as soon as the construction is under way — it has done its job
 * by then, and would only compete with the model.
 */
export function scrollHintOpacity(progress: number): number {
  const FIM = 0.14;
  if (progress <= 0) return 1;
  if (progress >= FIM) return 0;
  return 1 - progress / FIM;
}
