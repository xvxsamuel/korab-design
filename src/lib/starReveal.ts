import starSvg from '../assets/star.svg?raw';

// Geometry for the works panel's entrance: the presented star zooms up from
// its exact on-screen pose and the project page grows out of its core. The
// mark's compound path lists its contours outermost first — the same outline
// and inlay WorkStar draws.
const starD = starSvg.match(/\sd="([^"]+)"/)![1];
export const [STAR_OUTLINE, STAR_INLAY] = starD.match(/M[^Z]+Z/g)!;
/** The whole mark — outline, its cut-outs and the rings inside — as the
 *  orbit inks it, so a reveal starts out looking exactly like that star. */
export const STAR_PATH = starD;

// viewBox 191×200. Radii below are in units of the half-height, which is
// also how a rendered star is measured (the SVG fits its box by height).
export const STAR_CX = 95.5;
export const STAR_CY = 100;
const HALF = 100;
// The outline's deepest valley sits 65.6 units out (sampled along its
// curves). A star covers a rectangle once that inscribed circle clears the
// farthest corner, so this is the ratio the cover radius divides by.
const INSCRIBED = 0.656;

// The outline is absolute M/L/C/Z only, so a pose (translate, rotate, scale)
// is an affine map on its coordinate pairs — parse once, transform per frame.
const outlineCmds: string[] = [];
const outlineNums: number[] = [];
for (const tok of STAR_OUTLINE.match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!) {
  if (/[MLCZ]/i.test(tok)) outlineCmds.push(tok);
  else outlineNums.push(Number(tok) - (outlineNums.length % 2 === 0 ? STAR_CX : STAR_CY));
}
const PAIRS: Record<string, number> = { M: 1, L: 1, C: 3, Z: 0 };

/** The outline posed at (cx, cy) with half-height r, turned `deg` — as a
 *  `path()` string in the coordinate space of a viewport-sized element. */
export function outlinePath(cx: number, cy: number, r: number, deg: number): string {
  const k = r / HALF;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a) * k;
  const sin = Math.sin(a) * k;
  let out = '';
  let n = 0;
  for (const cmd of outlineCmds) {
    out += cmd;
    for (let p = 0; p < PAIRS[cmd]; p++) {
      const x = outlineNums[n++];
      const y = outlineNums[n++];
      out += `${(cx + x * cos - y * sin).toFixed(1)} ${(cy + x * sin + y * cos).toFixed(1)} `;
    }
  }
  return out;
}

/** SVG transform that poses the raw mark (viewBox units) the same way. */
export function starTransform(cx: number, cy: number, r: number, deg: number): string {
  return `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${deg.toFixed(2)}) scale(${(r / HALF).toFixed(4)}) translate(${-STAR_CX} ${-STAR_CY})`;
}

/** Half-height at which a star centred at (cx, cy) covers a w×h viewport. */
export function coverRadius(cx: number, cy: number, w: number, h: number): number {
  const far = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(w - cx, cy),
    Math.hypot(cx, h - cy),
    Math.hypot(w - cx, h - cy),
  );
  // A hair over, so antialiasing never leaves a corner pixel uncovered.
  return (far / INSCRIBED) * 1.02;
}

/** Where a star sits and how it's posed: centre, half-height, turn, and
 *  how far its coloured inlay has grown into the gold's cut-out (0–1). */
export type RevealOrigin = { cx: number; cy: number; r: number; deg: number; fill: number };

/** The tallest the visible page gets. On phones that's the large viewport —
 *  the page shows under translucent toolbars and behind a retracting URL
 *  bar — and a reveal has to cover that too, not just the small one. */
export function screenHeight(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.max(window.innerHeight, h || 0);
}

const rotationOf = (el: Element | null): number => {
  if (!el) return 0;
  const cs = getComputedStyle(el);
  let deg = 0;
  if (cs.transform && cs.transform !== 'none') {
    const m = new DOMMatrixReadOnly(cs.transform);
    deg += (Math.atan2(m.b, m.a) * 180) / Math.PI;
  }
  // The individual `rotate` property composes with transform and isn't
  // folded into it, so it's read separately (computed as "<angle>deg").
  const rot = parseFloat(cs.rotate);
  if (Number.isFinite(rot)) deg += rot;
  return deg;
};

const scaleOf = (el: Element | null): number => {
  if (!el) return 1;
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return 1;
  const m = new DOMMatrixReadOnly(t);
  return Math.min(1, Math.hypot(m.a, m.b));
};

/** Where an orbit body's mark sits right now: centre, rendered half-height
 *  and total turn (orbital spin + idle gear spin + hover nudge). */
export function measureOrbitBody(body: HTMLElement): RevealOrigin {
  const mark = body.querySelector('.work-body-mark') ?? body;
  const rect = mark.getBoundingClientRect();
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    r: rect.height / 2,
    deg:
      rotationOf(body.querySelector('.work-body-gear')) +
      rotationOf(body.querySelector('.work-body-star')),
    fill: scaleOf(body.querySelector('.work-body-inlay')),
  };
}

/** The same for any other star element (the panel's dots, the next-work
 *  mark): its box, and whatever turn its own styles give it. A rotated box
 *  grows, so the size comes from the untransformed layout box. */
export function measureStar(el: Element): RevealOrigin {
  const rect = el.getBoundingClientRect();
  const layout = el instanceof HTMLElement ? el.offsetHeight : el instanceof SVGSVGElement ? el.clientHeight : 0;
  const h = layout || rect.height;
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    r: Math.max(h / 2, 6),
    // A mark that turns only its star (the next-work link) carries the
    // turn on that group; its icon stays upright.
    deg: rotationOf(el.querySelector('.cs-mark-star') ?? el),
    fill: 1,
  };
}

// Timeline, as a pure function of t ∈ [0, 1] so the same curve plays forward
// to open and backward to close.
//   · The star (gold, inlay, icon) swells STAR_GROWTH× in log space — growth
//     that reads as constant speed — holding the pose it had in the orbit.
//   · The page seeds in the core and rides inside the inlay, at a fixed
//     share of the star, while the star swells — the anatomy stays legible
//     — then breaks out past the gold to cover the viewport.
const STAR_GROWTH = 7;
// Where the seed finishes growing to its share of the star, and that share
// (the inlay's tips sit at 0.63 of the half-height, its valleys at 0.41).
const SEED_END = 0.3;
const SEED_SHARE = 0.4;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => t * t * (3 - 2 * t);

export type RevealFrame = { starR: number; deg: number; coreR: number; fill: number };

export function revealFrame(t: number, from: RevealOrigin, cover: number): RevealFrame {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const e = easeInOut(c);
  const starR = from.r * Math.pow(STAR_GROWTH, e);
  const seed = starR * SEED_SHARE * smooth(Math.min(1, c / SEED_END));
  const out = c <= SEED_END ? 0 : Math.pow((c - SEED_END) / (1 - SEED_END), 3);
  return {
    starR,
    deg: from.deg,
    coreR: seed + (cover - seed) * out,
    // The inlay finishes filling the cut-out while the page seeds, and on
    // the way back empties to exactly what the orbit star shows.
    fill: from.fill + (1 - from.fill) * smooth(Math.min(1, c / SEED_END)),
  };
}
