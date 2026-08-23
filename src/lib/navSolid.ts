/**
 * Whether the fixed header should draw its solid bar.
 *
 * The hero pins for one and a half viewports while the model builds itself,
 * so a bar that turns solid at the usual 60px sits on top of the building for
 * that whole stretch — and its darker fill draws a visible band across the
 * hero. It stays transparent until the hero has finished.
 */

/** Fallback threshold for pages without a pinned hero. */
const PLAIN_THRESHOLD = 60;

export function shouldNavBeSolid(scrollY: number, heroScrollEnd: number | null): boolean {
  if (heroScrollEnd === null) return scrollY > PLAIN_THRESHOLD;
  return scrollY >= heroScrollEnd;
}
