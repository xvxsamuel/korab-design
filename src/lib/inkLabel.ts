// The work labels ink in, in the spirit of the hero's name on first
// display: blurred text through an alpha cut gathers out of soft blobs into
// letters, the cut then settles to the type's own weight, and the filter
// drops away to leave plain, crisp text.
//
// The ink seeps in rather than landing: the cut starts strict, so only the
// densest ink shows — specks where strokes crowd — and opens outward until
// the specks have spread into blobs (alpha > 0.3), permissive enough at
// label size that strokes merge before they resolve. Meanwhile the blur
// shrinks and the blobs draw together into letters; at the end the cut
// tightens to alpha > 0.5, about the weight of the native glyphs it hands
// over to. The blur scales with the label's own font size, so every screen
// width looks the same.
//
// It plays on time rather than scrubbing with scroll — a work stopped half
// presented never leaves its label hanging as blobs — and runs back the
// same way, quicker, as the work leaves. Reversible mid-way.

const BLUR_EM = 0.3; // at the start even the blobs sit under the cut
const GATHER = 0.82; // share of the run spent shrinking the blur
const SEEP = 0.42; // share of the run in which the cut opens
const CUT_START = 0.7; // first, only the densest ink passes: specks
const CUT_OPEN = 0.3; // seeped through: soft blobs
const CUT_SETTLE = 0.5; // the hand-over, near the native glyph weight
// Quick, like the wipe it replaced: the blobs show for a beat, not a pause.
const IN_MS = 340;
const OUT_MS = 200;

type Run = { p: number; dir: 1 | -1; raf: number; last: number; blur: number };
// Text or an SVG mark: anything with inline style.
type Inkable = HTMLElement | SVGElement;
const runs = new WeakMap<Inkable, Run>();

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const smooth = (t: number) => t * t * (3 - 2 * t);

// feFuncA discrete table passing alpha at or above `cut`. Fine buckets, so
// the ink's edge creeps outward instead of stepping.
const BUCKETS = 50;
const table = (cut: number) => {
  const from = Math.ceil(cut * BUCKETS);
  return Array.from({ length: BUCKETS }, (_, k) => (k >= from ? '1' : '0')).join(' ');
};

/** The filter id for a work's label (rendered once per work in Works.tsx). */
export const labelFilterId = (work: string) => `label-ink-${work}`;

function pose(label: Inkable, ink: Inkable, func: SVGElement | null, filter: string, run: Run) {
  const p = run.p;
  if (p <= 0) {
    label.style.visibility = '';
    ink.style.filter = '';
    return;
  }
  label.style.visibility = 'visible';
  if (p >= 1) {
    // Native text: the filter is gone, so the label renders crisp.
    ink.style.filter = '';
    return;
  }
  if (p < GATHER) {
    // The cut opens gently, from specks outward, while the blur holds;
    // then the blur eases off and the blobs resolve into letters.
    const t = p / GATHER;
    const blur = run.blur * (1 - t * t);
    const seep = smooth(Math.min(1, p / SEEP));
    func?.setAttribute('tableValues', table(CUT_START + (CUT_OPEN - CUT_START) * seep));
    ink.style.filter = `blur(${blur.toFixed(2)}px) url(#${filter})`;
  } else {
    // The cut settles from the seeped weight to the native one.
    const t = (p - GATHER) / (1 - GATHER);
    func?.setAttribute('tableValues', table(CUT_OPEN + (CUT_SETTLE - CUT_OPEN) * t));
    ink.style.filter = `url(#${filter})`;
  }
}

type InkOptions = {
  /** Whose font size scales the blur (default: the inked part). */
  sizeFrom?: Inkable;
  /** The part that inks, when the label is more than its text — a ground
   *  under it, say, which only shows and hides (default: the label). The
   *  cut works on alpha, so it needs text on nothing: through an opaque
   *  ground the blur would only smudge. */
  ink?: Inkable;
  /** Straight to the end, no animation. */
  instant?: boolean;
};

/** Ink a label in (`on`) or back out, through its own filter (one per
 *  label: each runs on its own clock). CSS keeps the label hidden; it shows
 *  from the first frame in until it has inked back out. */
export function inkText(label: Inkable, filter: string, on: boolean, opts: InkOptions = {}) {
  const ink = opts.ink ?? label;
  const func = document.querySelector<SVGElement>(`#${filter} feFuncA`);
  const blur = BLUR_EM * (parseFloat(getComputedStyle(opts.sizeFrom ?? ink).fontSize) || 24);
  let run = runs.get(label);
  if (!run) {
    // Everything starts un-inked.
    run = { p: 0, dir: on ? 1 : -1, raf: 0, last: 0, blur };
    runs.set(label, run);
  }
  const live = run;
  live.blur = blur;
  live.dir = on ? 1 : -1;
  if (opts.instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelAnimationFrame(live.raf);
    live.raf = 0;
    live.p = on ? 1 : 0;
    pose(label, ink, func, filter, live);
    return;
  }
  // Already running: it just turns around from wherever it is.
  if (live.raf) return;
  live.last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(now - live.last, 34);
    live.last = now;
    live.p = clamp01(live.p + (live.dir > 0 ? dt / IN_MS : -dt / OUT_MS));
    pose(label, ink, func, filter, live);
    if ((live.dir > 0 && live.p >= 1) || (live.dir < 0 && live.p <= 0)) {
      live.raf = 0;
      return;
    }
    live.raf = requestAnimationFrame(step);
  };
  live.raf = requestAnimationFrame(step);
}

/** Ink a work body's label in the orbit in (`on`) or back out. */
export function inkLabel(body: HTMLElement, on: boolean) {
  const label = body.querySelector<HTMLElement>('.work-body-label');
  const work = body.dataset.work;
  if (!label || !work) return;
  inkText(label, labelFilterId(work), on, {
    sizeFrom: label.querySelector<HTMLElement>('.work-body-name') ?? label
  });
}
