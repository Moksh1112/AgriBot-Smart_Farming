export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (t: number) => t * t * (3 - 2 * t);

/** Opacity for a progress range [a, b] with soft edges. */
export function band(p: number, a: number, b: number, edge = 0.025) {
  return clamp01((p - a) / edge) * clamp01((b - p) / edge);
}

/** 0..1 progress of a tall pinned section through the viewport. */
export function sectionProgress(el: HTMLElement) {
  const span = el.offsetHeight - window.innerHeight;
  return span > 0 ? clamp01(-el.getBoundingClientRect().top / span) : 0;
}

export const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
