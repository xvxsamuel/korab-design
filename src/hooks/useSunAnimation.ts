import { useLayoutEffect } from 'react';

// Quadratic bezier: start → control → end. The control point sits above the
// viewport so the curve arcs up and over like a sun crossing the sky, with no
// waypoint kinks to make the motion feel choppy.
//
// Coordinates are in vw/vh percent and snap to a 16×16 viewport grid (each
// cell = 6.25vw × 6.25vh). Star landing-direction targets in init() and the
// title's bottom padding in CSS use the same grid so the composition reads as
// laid out against an invisible 16-unit lattice rather than ad-hoc decimals.
const SUN_START   = { x: 93.75, y: 68.75 };  // grid (15, 11)
const SUN_CONTROL = { x: 50,    y: -43.75 }; // grid (8, -7)
const SUN_END     = { x: 6.25,  y: 6.25 };   // grid (1, 1)

// Star A's angular rate multiplier. >1 means it completes its arc early
// and waits off-screen right (still orbiting the sun, never decoupled)
// until the sun's departure carries it back in to its landing. 1.4 makes
// the visible hero/about stretch read as real orbiting — roughly twice
// the works axle's rate — and saturates the arc while the star is hidden
// for the works stage, so no rate change is ever on screen.
const STAR_ARC_SCALE   = 1.4;
// Star A's hero pose, as an offset from the placeholder's centre in the
// title's em. The title's kerning pulls "Korab" 0.6em left over the
// placeholder (tight lockup), so the star must sit left of it to clear the
// K. MEASURED at the 1440×900 reference, where the old 1.1284×-sun-distance
// ring put the star's right tips exactly 14px off the K's ink. Anchoring to
// the text rather than to the sun distance keeps that clearance at every
// viewport and type size (the ratio drifted: it overlapped the K on phones
// and near-touched it at 1024). Ring A's radius is whatever reaches here.
const STAR_A_OFFSET_EM = { x: -0.661, y: 0.0272 };
// Ring B as a fraction of the sun → placeholder distance.
const RING_B_SCALE   = 0.66;
// Height cap on ring B. The works bodies present at the ring's lowest point
// (sunY + radius), and base scales with viewport WIDTH — so on wide screens
// an uncapped ring pushes the works to the bottom edge (measured 81% of vh
// at 1920×1080). Capping against height pins the presented row at any
// aspect; on narrow/portrait viewports the width term is the smaller one
// anyway, so phones are untouched. With noon at -3.125vh, the height cap
// places the presented row at 54.875vh on wide screens.
const RING_B_MAX_VH  = 0.58;
// Extra angle (radians) added to the works train's start position on ring B.
// Larger values rotate the lead body further upward from the mirrored-Y
// baseline so it sits between the navbar and the title rather than down near
// the title's horizontal level. (Inherited from the second star this train
// replaced — it keeps the same hero composition.)
const WORK_START_OFFSET = Math.PI * 0.18;

// Works share one angular rate and fixed offsets, with smoothDock easing
// the final arrival. Distance from the point beneath the sun drives each
// body's morph and label emphasis. The CSS runway aligns the title pin
// with the presentations; the sun holds at noon until the last body folds.
const RAD = Math.PI / 180;
// The train's head-to-tail angular span — its min and max positions on the
// ring. However many projects there are, they divide this span evenly, so
// adding or removing a work re-spaces the rest instead of stretching the
// train; the per-neighbour step is derived in the hook from the body count.
const WORK_SPAN = 126 * RAD;
// Project insets grow and recede around the arc's lowest point. Angular
// windows keep opening, folding, and focus aligned at every viewport size.
const PRESENT_POINT = 90 * RAD;
// Start opening earlier, but still reach full size 10° before presentation.
// The 42° ramp matches the spacing of the four projects: each completes its
// expansion as the next starts. Folding stays tighter to clear the heading.
const ENTER_EDGE = 52 * RAD;
const ENTER_RAMP = 42 * RAD;
const EXIT_EDGE = 55 * RAD;
const EXIT_RAMP = 20 * RAD;
// The menu highlight is the same measure with a tighter window.
const FOCUS_HALF = 44 * RAD;
// Pause at noon after the last body folds, before the sun departs.
const WORK_EXIT_DWELL_P = 0.02;
// The finale has TWO scroll measures. `p` is the sun's: 0 at the top,
// 1 the instant the sun parks beside the email — the sun finishes exactly
// with its scroll, nothing is held back from its descent. `q` is the
// ending runway's: the extra --ending-runway of scroll beneath the sticky
// final frame (see .ending in style.css), 0 where the sun parks and 1 at
// the document bottom. The frame is glued to the viewport through all of
// q, so the ONLY things moving in the runway are the orbits:
//   · the works axle keeps its one constant rate straight through the
//     sun's landing and docks in the night slot at q = AXLE_DOCK_Q;
//   · star A waits parked STARA_GLIDE_GAP short of its slot (off the top
//     of the frame) and slides in last, over [STARA_CODA_Q, 1], ease-out.
// The runway's length (CSS) sets how slowly all of that plays.
const STARA_GLIDE_GAP = 18 * RAD;
const AXLE_DOCK_Q = 0.55;
const STARA_CODA_Q = 0.45;
// Nothing LOCKS into place: every arrival decelerates to zero angular
// velocity at its rest pose instead of stopping mid-stride. Star A's
// whole coda is ease-out; the axle keeps its constant rate but rounds
// the final stretch of the ride with a slope-matched ease (identity
// until the last DOCK_EASE_W of the normalized ride, then a cubic whose
// entry slope is 1 and exit slope is 0 — the rate bends smoothly into
// rest, no corner).
const DOCK_EASE_W = 0.15;
const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);
const smoothDock = (u: number) => {
  if (u >= 1) return 1;
  if (u < 1 - DOCK_EASE_W) return u;
  const s = (u - (1 - DOCK_EASE_W)) / DOCK_EASE_W;
  return (1 - DOCK_EASE_W) + DOCK_EASE_W * (s + s * s - s * s * s);
};
// Force the stars folded before Contact, even if a landing angle falls
// inside a morph window. init() measures the backstop from the layout.
const WORK_CLOSE_LEN = 0.04;
// Complete the sun's noon arrival this far ahead of the title pin.
const WORK_SETTLE_LEAD_P = 0.06;
// The sun's bezier parameter during the works stage — the curve's midpoint,
// which sits at exactly 50vw and (start + 2·control + end)/4 = -3.125vh:
// noon, high in the sky so the outer ring's arc fills the frame. Held for
// the whole stage so the presented point stays locked while the works pass
// through it.
const SUN_NOON = 0.5;
// The backstop lands when the contact section's top is this far up from the
// viewport bottom — everything must be shut before the contact content owns
// the screen (and stays shut for the parked body's final descent).
const CLOSE_LEAD_VH = 0.35;
// (The ornate star's pre-morph scale — 0.52, ≈ star B's old rendered size —
// lives in CSS on .work-body-mark, driven by the same --in variable.)

const SHELL_BASE = 100;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// For a ring centered at (cx, cy) with radius R inside a vw×vh viewport,
// returns the angle where a BACKWARD draw (decreasing angle — the direction
// the negative dashoffset reveals in) enters the on-screen arc, so the trace
// starts at the viewport edge instead of spending its first stretch drawing
// off-screen. The page can open at any scroll, with the sun anywhere on its
// path, so this samples the ring rather than assuming which edges it cuts:
// of the visible runs, the longest wins, entered from its high-angle end.
// Returns null when no part of the ring is on screen.
const RING_SAMPLES = 720;
function computeRingDrawStart(
  cx: number, cy: number, R: number, vw: number, vh: number,
): number | null {
  const step = (2 * Math.PI) / RING_SAMPLES;
  const vis: boolean[] = [];
  for (let i = 0; i < RING_SAMPLES; i++) {
    const x = cx + R * Math.cos(i * step);
    const y = cy + R * Math.sin(i * step);
    vis.push(x >= 0 && x <= vw && y >= 0 && y <= vh);
  }
  const firstHidden = vis.indexOf(false);
  if (firstHidden === -1) return -Math.PI / 2;
  // Walk once around from a hidden sample so no run straddles the seam.
  let bestEnd = -1;
  let bestLen = 0;
  let len = 0;
  for (let k = 1; k <= RING_SAMPLES; k++) {
    const i = (firstHidden + k) % RING_SAMPLES;
    len = vis[i] ? len + 1 : 0;
    if (len > bestLen) { bestLen = len; bestEnd = i; }
  }
  // One sample past the run's last visible point: just off-screen, so the
  // first drawn pixel sits on the edge and no sliver is left for the end.
  return bestEnd === -1 ? null : (bestEnd + 1) * step;
}

function sampleSun(p: number): { x: number; y: number } {
  const c = clamp01(p);
  const u = 1 - c;
  const x = u * u * SUN_START.x + 2 * u * c * SUN_CONTROL.x + c * c * SUN_END.x;
  const y = u * u * SUN_START.y + 2 * u * c * SUN_CONTROL.y + c * c * SUN_END.y;
  return { x, y };
}

// Center the sun or a star at viewport coordinates (vx, vy).
// translate3d (vs translate) is an explicit hint to keep the element on its
// own GPU layer — `will-change: transform` already opts into this in CSS,
// but the 3d form is more reliable across engines and the cost is identical.
// The cache avoids re-writing identical transform strings when scroll is
// settling and a frame produces the same float values as the prior one.
function placeBody(el: HTMLElement, vx: number, vy: number, cache: { last: string }) {
  const next = `translate3d(${vx}px, ${vy}px, 0) translate(-50%, -50%)`;
  if (next !== cache.last) { el.style.transform = next; cache.last = next; }
}

// Center an orbit ring SVG at viewport coords (vx, vy) with pixel radius r.
function placeRing(el: SVGElement, vx: number, vy: number, r: number, cache: { last: string }) {
  const next = `translate3d(${vx}px, ${vy}px, 0) translate(-50%, -50%) scale(${r / SHELL_BASE})`;
  if (next !== cache.last) { el.style.transform = next; cache.last = next; }
}

export function useSunAnimation() {
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const sunEl = document.querySelector<HTMLElement>('.sun-trace');
      if (sunEl) {
        sunEl.style.opacity = '1';
        sunEl.style.transform = `translate(${window.innerWidth * 0.5}px, ${window.innerHeight * 0.18}px) translate(-50%, -50%)`;
      }
      // Nothing drives the works orbit in this path, so hand the works section
      // over to its flat list rather than leaving four unplaced bodies stacked
      // in the top-left corner.
      document.documentElement.classList.add('no-orbit');
      return () => document.documentElement.classList.remove('no-orbit');
    }

    const sunEl       = document.querySelector<HTMLElement>('.sun-trace')!;
    const sunRingOuter = document.querySelector<SVGCircleElement>('.sun-ring-outer')!;
    const sunRingInner = document.querySelector<SVGCircleElement>('.sun-ring-inner')!;
    const orbitEl    = document.querySelector<SVGElement>('.sun-orbit:not(.sun-orbit-b)')!;
    const orbitRing  = document.querySelector<SVGCircleElement>('.sun-orbit-ring:not(.sun-orbit-ring-b)')!;
    const orbitElB   = document.querySelector<SVGElement>('.sun-orbit-b')!;
    const orbitRingB = document.querySelector<SVGCircleElement>('.sun-orbit-ring-b')!;
    const starElA    = document.querySelector<HTMLElement>('.star-a')!;
    const placeholder = document.querySelector<HTMLElement>('.hero-sun-placeholder')!;
    const worksOrbit = document.querySelector<HTMLElement>('.works-orbit');
    const workBodies = worksOrbit
      ? Array.from(worksOrbit.querySelectorAll<HTMLElement>('.work-body'))
      : [];
    // Evenly divide the fixed span among however many works exist.
    const workStep = WORK_SPAN / Math.max(1, workBodies.length - 1);

    // Strip the bloom filter once the entrance finishes. The 90% alpha
    // threshold inside #starThreshold leaves binary edges that read as
    // jittery while the SVG inside spins, so we want it active during the
    // bloom and gone after. Inline style overrides the filter declared on
    // .sun-fade-in.
    const onStarBloomEnd = (e: AnimationEvent) => {
      if (e.animationName !== 'star-ink-bloom') return;
      (e.currentTarget as HTMLElement).style.filter = 'none';
    };
    starElA.addEventListener('animationend', onStarBloomEnd);
    // Same idea for the works train's entrance: dropping the class removes
    // the filter chain from every ornate star at once.
    const onWorksBloomEnd = (e: AnimationEvent) => {
      if (e.animationName !== 'work-star-bloom') return;
      worksOrbit?.classList.remove('sun-fade-in');
    };
    worksOrbit?.addEventListener('animationend', onWorksBloomEnd);

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    let ringRadius  = 0;
    let ringRadiusB = 0;
    let startAngleA = 0;
    let endAngleA   = 0;
    // Works train endpoints, computed in init(). workPhase keeps star B's
    // old start construction; workEndHead is where the revolution finishes
    // (night-sky slot). workPinP / closeEndP / slowEndP are layout-derived:
    // the pin times the sun's noon arrival, closeEndP backstops the folds,
    // and slowEndP only clamps settleP on unusually short layouts.
    let workPhase   = 0;
    let workEndHead = 0;
    let workPinP    = 0.5;
    let closeEndP   = 0.85;
    let slowEndP    = 0.8;
    // The sun's last placed position — where the entrance draws from.
    let sunNowX     = 0;
    let sunNowY     = 0;

    // Per-element transform caches — apply() runs every scroll-settle frame
    // and writes several transforms; gating each on its prior value skips
    // style writes when scroll has paused but the lerp tail is still ticking.
    const sunCache    = { last: '' };
    const orbitACache = { last: '' };
    const orbitBCache = { last: '' };
    const starACache  = { last: '' };
    const workCaches  = workBodies.map(() => ({
      last: '', spin: '', bloom: '', focus: '', live: false,
    }));

    const apply = (p: number, q: number) => {
      // The sun's noon arrival, anchored ahead of the works pin.
      const settleP = Math.max(0.05, Math.min(workPinP - WORK_SETTLE_LEAD_P, slowEndP - 0.1));
      // The axle's constant ride spans the sun's whole scroll AND the first
      // AXLE_DOCK_Q of the runway; in p-units the ride ends here (>1).
      const rideSpan = workEndHead - workPhase;
      const rideEndP = 1 + AXLE_DOCK_Q * runwayP;
      // The sun unlocks ANGULARLY: the moment the axle's last body has
      // folded past the exit edge (plus a small dwell), noon lets go and
      // the descent begins. Derived by inverting the constant-rate ride.
      const foldedHead = PRESENT_POINT + EXIT_EDGE + 5 * RAD;
      const glideStartP = Math.min(
        0.9,
        Math.max(
          settleP + 0.05,
          rideEndP * ((foldedHead - workPhase) / Math.max(0.01, rideSpan))
            + WORK_EXIT_DWELL_P,
        ),
      );
      // The sun lands at p=1 — with its scroll, not before it.
      const canvasLandP = 1;

      // Sun schedule: the bezier's midpoint (0.5) lands at exactly 50vw,
      // -3.125vh — noon, high-sky. The sun reaches it before the title
      // pins, HOLDS there through the presentations (locking the presented
      // point mid-screen), then descends to the contact parking once the
      // last body has folded. The scroll damping rounds off the velocity
      // corners.
      let sunP: number;
      if (p <= settleP) {
        sunP = SUN_NOON * (p / settleP);
      } else if (p <= glideStartP) {
        sunP = SUN_NOON;
      } else {
        sunP = SUN_NOON + (1 - SUN_NOON)
          * clamp01((p - glideStartP) / Math.max(0.01, canvasLandP - glideStartP));
      }
      const { x, y } = sampleSun(sunP);
      const sunVX = (x / 100) * vw;
      const sunVY = (y / 100) * vh;
      sunNowX = sunVX;
      sunNowY = sunVY;

      placeBody(sunEl, sunVX, sunVY, sunCache);
      placeRing(orbitEl,  sunVX, sunVY, ringRadius,  orbitACache);
      placeRing(orbitElB, sunVX, sunVY, ringRadiusB, orbitBCache);

      const fracA = Math.min(p * STAR_ARC_SCALE, 1);

      // Star A: rides the main ring — with an extra full lap folded into
      // its arc, so the visible hero/about stretch reads as real orbiting.
      // The arc saturates mid-page, parked STARA_GLIDE_GAP short of its
      // slot — off the top of the frame for the whole sun descent. In the
      // ending runway, the ease-out coda pays the gap out last of all,
      // decelerating into the slot so the page's final motion drifts to
      // rest.
      const tailT = easeOut3(clamp01((q - STARA_CODA_Q) / (1 - STARA_CODA_Q)));
      const angleA = lerp(startAngleA, endAngleA, fracA)
        + STARA_GLIDE_GAP * tailT;
      placeBody(starElA, sunVX + ringRadius  * Math.cos(angleA), sunVY + ringRadius  * Math.sin(angleA), starACache);

      // Works train on ring B — the page's second star, four bodies deep.
      // Placed here — not in a loop of their own — so a frame never paints
      // them at one ring position and the sun at another.
      //
      // ONE constant rate for the whole ride: hero pose → night slot, no
      // zones, no knots — the works alignment comes from the LAYOUT (the
      // runway height positions the pin just ahead of the first
      // presentation). The ride runs straight through the sun's landing
      // into the ending runway — the night star is still arriving on the
      // stopped frame — and smoothDock bends its very end so the axle
      // drifts to rest at AXLE_DOCK_Q instead of stopping mid-stride.
      const rideT = (p + q * runwayP) / rideEndP;
      const head = workPhase + rideSpan * smoothDock(Math.min(rideT, 1));
      for (let i = 0; i < workBodies.length; i++) {
        // Reversed offsets: index 0 rides furthest ahead, so the projects
        // present in ARRAY order (first project first) — the panel's
        // next/prev and the presentation sequence agree.
        const a = head + (workBodies.length - 1 - i) * workStep;
        const cache = workCaches[i];
        const bx = sunVX + ringRadiusB * Math.cos(a);
        const by = sunVY + ringRadiusB * Math.sin(a);
        placeBody(workBodies[i], bx, by, cache);

        // Turn each mark by its own orbital angle, 1:1. A body rigidly fixed to
        // a rotating arm turns exactly as far as the arm does; without this the
        // marks translate along the arc while staying upright, which reads as
        // sliding sideways rather than orbiting. Scroll drives it, so the spin
        // rate is locked to the sweep instead of running off a clock.
        const spin = (a / RAD).toFixed(1);
        if (spin !== cache.spin) {
          workBodies[i].style.setProperty('--spin', `${spin}deg`);
          cache.spin = spin;
        }

        // Purely angular openness — a body unfurls as it approaches the
        // presented point and folds as it leaves, wherever on the page that
        // happens. No time gate: under the constant rate a gate anchored to
        // the pin would catch bodies already inside the enter window and
        // pop them open together the moment it lifted. The unfurl begins
        // while a body is still riding in (largely off-screen right), which
        // reads as the approach itself. The end backstop still forces
        // everything shut for the parked night pose.
        const signed = a - PRESENT_POINT;
        const offPoint = Math.abs(signed);
        const openness = signed < 0
          ? clamp01((ENTER_EDGE + signed) / ENTER_RAMP)
          : clamp01((EXIT_EDGE - signed) / EXIT_RAMP);
        const endFall = clamp01((closeEndP - p) / WORK_CLOSE_LEN);
        const bloom = Math.min(openness, endFall);

        // Menu focus — the same presented-point measure with a tighter
        // window, gated by the morph so shut bodies never highlight. The
        // emphasis hands over smoothly from one body to the next as the
        // train carries them through the point.
        const focus = bloom * clamp01(1 - offPoint / FOCUS_HALF);
        const fNext = focus.toFixed(3);
        if (fNext !== cache.focus) {
          cache.focus = fNext;
          workBodies[i].style.setProperty('--focus', fNext);
        }

        const next = bloom.toFixed(3);
        if (next !== cache.bloom) {
          cache.bloom = next;
          workBodies[i].style.setProperty('--in', next);
          // Before the morph a body is an ambient star, not a control:
          // clicking the hero's star shouldn't open a project panel. Pointer
          // events and tab order switch on once it has mostly become a work.
          const live = bloom > 0.5;
          if (live !== cache.live) {
            workBodies[i].classList.toggle('is-live', live);
            workBodies[i].tabIndex = live ? 0 : -1;
            cache.live = live;
          }
        }
      }
    };

    let cachedBaseMax = 0;
    // The ending runway's scroll length, and the same expressed in p-units
    // (runway px / sun px) so the axle's ride can span both measures.
    let runwayPx = 0;
    let runwayP = 0;

    const computeProgress = () => {
      if (cachedBaseMax <= 0) return 0;
      const eff = Math.max(0, Math.min(cachedBaseMax, window.scrollY));
      return eff / cachedBaseMax;
    };
    const computeRunway = () => {
      if (runwayPx <= 0) return 0;
      return clamp01((window.scrollY - cachedBaseMax) / runwayPx);
    };

    let displayedProgress = 0;
    // The runway measure, damped with the same lerp so the coda scrubs as
    // softly as everything else.
    let displayedRunway = 0;
    let rafId = 0;
    let innerRingRaf = 0;
    let running = false;

    // Lerp factor per frame. ~0.18 settles in roughly 8–12 frames at 60fps —
    // enough damping to absorb scroll jitter without feeling laggy.
    const LERP = 0.18;
    const SETTLE_EPS = 0.0005;

    const startLoop = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };

    const tick = () => {
      const targetProgress = computeProgress();
      const targetRunway = computeRunway();
      const delta = targetProgress - displayedProgress;
      const deltaQ = targetRunway - displayedRunway;
      const scrollDone = Math.abs(delta) < SETTLE_EPS && Math.abs(deltaQ) < SETTLE_EPS;
      if (scrollDone) {
        displayedProgress = targetProgress;
        displayedRunway = targetRunway;
      } else {
        displayedProgress += delta * LERP;
        displayedRunway += deltaQ * LERP;
      }

      apply(displayedProgress, displayedRunway);
      if (scrollDone) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', startLoop, { passive: true });

    const init = (isResize = false) => {
      vw = window.innerWidth;
      vh = window.innerHeight;

      const s0 = sampleSun(0);
      const sunStartVX = (s0.x / 100) * vw;
      const sunStartVY = (s0.y / 100) * vh;

      // Measure the placeholder to get star A's start position and size.
      // getBoundingClientRect() is viewport-relative, so adjust for scroll to get
      // the document-Y, which equals the viewport-Y at scroll=0 (where sunStart is defined).
      const ph = placeholder.getBoundingClientRect();
      const starVX = ph.left + ph.width  / 2;
      const starVY = (ph.top + window.scrollY) + ph.height / 2;

      // The orbit layer starts transparent in CSS so the un-placed buttons
      // never flash at the viewport origin before this hook runs; from the
      // first placement on it stays opaque (the entrance bloom below handles
      // the reveal on a fresh load).
      if (worksOrbit) worksOrbit.style.opacity = '1';

      // Size star A from the placeholder so it matches the title's gap.
      starElA.style.width  = `${ph.width}px`;
      starElA.style.height = `${ph.height}px`;

      const titleEm = parseFloat(getComputedStyle(placeholder).fontSize);
      const starAX = starVX + STAR_A_OFFSET_EM.x * titleEm;
      const starAY = starVY + STAR_A_OFFSET_EM.y * titleEm;
      const baseRadius = Math.hypot(sunStartVX - starVX, sunStartVY - starVY);
      ringRadius  = Math.hypot(sunStartVX - starAX, sunStartVY - starAY);
      ringRadiusB = Math.min(baseRadius * RING_B_SCALE, vh * RING_B_MAX_VH);

      // Set the sun rings' stroke widths so they render at ~1px regardless of
      // the rendered SVG size (mirrors the per-orbit stroke-width logic). With
      // pathLength="100", a non-scaling-stroke vector-effect would corrupt the
      // dashoffset trace, so we keep a normal stroke and just scale its width.
      const sunVisualRadius = sunEl.offsetWidth / 2;
      if (sunVisualRadius > 0) {
        const sw = String(SHELL_BASE / sunVisualRadius);
        sunRingOuter.setAttribute('stroke-width', sw);
        sunRingInner.setAttribute('stroke-width', sw);
      }

      if (!isResize) {
        // Initial transform — most fade-ins are driven by the .sun-fade-in
        // CSS class added below. The inner sun ring is the exception: its
        // r-shrink runs through requestAnimationFrame because CSS keyframes
        // on the SVG `r` attribute don't tween reliably across browsers.
        sunEl.style.transform = `translate(${sunStartVX}px, ${sunStartVY}px) translate(-50%, -50%)`;
        sunEl.classList.add('sun-fade-in');
        orbitEl.classList.add('sun-fade-in');
        orbitElB.classList.add('sun-fade-in');
        starElA.classList.add('sun-fade-in');
        // The works train blooms in with the rest of the orrery: the class
        // puts the same ink-burn entrance on each ornate star, and the
        // animationend handler above strips it when the burn resolves.
        worksOrbit?.classList.add('sun-fade-in');

        // r=99 matches the outer ring's resting radius, so the inner ring
        // appears at full strength ON the finished outer trace — hidden in
        // it, not faded up — and then peels off inward to its rendered
        // r=72. setAttribute on `r` is unambiguous — the radius shrinks
        // symmetrically around (cx, cy) — so we drive it with rAF rather
        // than risk a browser that doesn't tween the CSS `r` property
        // reliably.
        const SHRINK_DELAY = 1400;
        const SHRINK_DUR   = 900;
        const R_START      = 99;
        const R_END        = 72;
        // cubic-bezier(0.22, 1, 0.36, 1) flattens fast and lingers — the
        // closest unit-cost curve is easeOutQuint (1-(1-t)^5).
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

        const animStart = performance.now() + SHRINK_DELAY;
        const tickInner = () => {
          const elapsed = performance.now() - animStart;
          if (elapsed < 0) {
            innerRingRaf = requestAnimationFrame(tickInner);
            return;
          }
          const shrinkT = Math.min(1, elapsed / SHRINK_DUR);
          const r = R_START + (R_END - R_START) * easeOut(shrinkT);
          sunRingInner.setAttribute('r', String(r));
          sunRingInner.style.opacity = '1';
          if (shrinkT < 1) innerRingRaf = requestAnimationFrame(tickInner);
        };
        // Seed initial state so the very first paint has the ring at r=99
        // (otherwise the SVG attribute r=72 paints briefly before the
        // first rAF tick fires).
        sunRingInner.setAttribute('r', String(R_START));
        sunRingInner.style.opacity = '0';
        innerRingRaf = requestAnimationFrame(tickInner);
      }

      // Star A starts in the title's gap, clear of the K
      startAngleA = Math.atan2(starAY - sunStartVY, starAX - sunStartVX);
      // The works train's lead body starts mirrored above (negate Y delta),
      // offset further toward the top — star B's old opening position.
      workPhase = Math.atan2(-(starVY - sunStartVY), starVX - sunStartVX) + WORK_START_OFFSET;

      // Update ring stroke widths so they look the same weight visually
      orbitRing.setAttribute('stroke-width',  String(SHELL_BASE / ringRadius));
      orbitRingB.setAttribute('stroke-width', String(SHELL_BASE / ringRadiusB));

      // The animation ends earlier than the bottom of the document so the sun
      // parks next to the email link while the contact section is in view.
      // animEnd is set so the email's center sits at the sun's terminal Y.
      const contactEl   = document.getElementById('contact');
      const targetEl    =
        contactEl?.querySelector<HTMLElement>('.contact-email') ??
        contactEl?.querySelector<HTMLElement>('.section-title') ??
        contactEl;
      const totalScroll = document.documentElement.scrollHeight - vh;

      // Pin the ending frame's top so its bottom meets the viewport's: the
      // frame's own height is the offset (measured, so footer/contact
      // padding changes never desync it).
      const frameEl = document.querySelector<HTMLElement>('.ending-frame');
      const frameH = frameEl ? frameEl.offsetHeight : 0;
      if (frameEl) {
        frameEl.style.setProperty('--ending-frame-h', `${Math.round(frameH)}px`);
      }

      if (frameEl && frameH > 0) {
        // The sun lands the instant the ending frame PINS — the scroll at
        // which the frame's bottom first meets the viewport's bottom. Past
        // that the frame is glued and the scroll that remains is the
        // runway: orbits only. (Anchoring to the email's document position
        // would be wrong here — while pinned, the email's position is
        // constant, and the sun would spend the whole runway still
        // descending toward a target that stopped moving.)
        // Measure the frame's STATIC position via its (non-sticky) parent:
        // a stuck sticky element reports its pinned, viewport-carried rect,
        // which would place the pin at whatever scroll init() happened to
        // run at — and zero the runway when that's the page bottom.
        const endingEl = frameEl.parentElement ?? frameEl;
        const frameTopDoc = endingEl.getBoundingClientRect().top + window.scrollY;
        const pinScroll = frameTopDoc + frameH - vh;
        cachedBaseMax = Math.min(totalScroll, Math.max(0, pinScroll));
      } else if (targetEl) {
        // No sticky frame (reduced layouts): anchor to the email as before.
        const tr = targetEl.getBoundingClientRect();
        const targetDocY = tr.top + window.scrollY + tr.height / 2;
        const sunEndYFrac = SUN_END.y / 100;
        cachedBaseMax = Math.min(totalScroll, Math.max(0, targetDocY - vh * sunEndYFrac));
      } else {
        cachedBaseMax = totalScroll;
      }
      // Whatever scroll remains past the sun's landing is the ending
      // runway — the sticky final frame stays glued while the orbits
      // finish. (Measured, so the CSS --ending-runway is the single source
      // of its length; zero when the layout has no runway.)
      runwayPx = Math.max(0, totalScroll - cachedBaseMax);
      runwayP = cachedBaseMax > 0 ? runwayPx / cachedBaseMax : 0;

      // Schedule knots, anchored to where the sections actually sit in the
      // document rather than to hand-tuned progress fractions — section
      // padding can be adjusted freely without silently desynchronising the
      // works from the layout.
      if (cachedBaseMax > 0) {
        const worksEl = document.getElementById('works');
        if (worksEl) {
          const worksTopDoc = worksEl.getBoundingClientRect().top + window.scrollY;
          // The camera settles when the section top reaches the viewport top.
          workPinP = Math.max(0.05, Math.min(0.9, worksTopDoc / cachedBaseMax));
        }
        if (contactEl) {
          const contactTopDoc = contactEl.getBoundingClientRect().top + window.scrollY;
          closeEndP = Math.max(0, (contactTopDoc - vh * CLOSE_LEAD_VH) / cachedBaseMax);
          // Only clamps settleP on unusually short layouts.
          slowEndP = Math.min(
            0.95,
            Math.max(workPinP + 0.1, (contactTopDoc - vh * 0.9) / cachedBaseMax),
          );
        }
      }

      // Stars should land in the lower portion of the viewport so they remain
      // visible at the bottom-most scroll. Choose target directions in the
      // lower part of the viewport and back-compute endAngles so that
      // lerp(startAngle, endAngle, frac) lands at the chosen direction at p=1.
      const s1 = sampleSun(1);
      const sunEndVX = (s1.x / 100) * vw;
      const sunEndVY = (s1.y / 100) * vh;

      // Star A lands in the upper-right — grid (9, 3.5), a half-grid Y step
      // off the row-3 anchor. The arc's end angle stops the held-back gap
      // SHORT of the landing direction (apply()'s coda pays it out last),
      // and carries ONE EXTRA FULL LAP in the travel direction — screen-
      // identical at the ends, but the visible stretches actually orbit.
      const dirA = Math.atan2(vh * 0.21875 - sunEndVY, vw * 0.5625 - sunEndVX);
      endAngleA = (STAR_ARC_SCALE >= 1
        ? dirA
        : (dirA - (1 - STAR_ARC_SCALE) * startAngleA) / STAR_ARC_SCALE)
        - STARA_GLIDE_GAP
        - 2 * Math.PI;
      // The works revolution's final pose: the tail body parks visibly on
      // ring B toward grid (6, 3) from the parked sun — the third light of
      // the night sky, between the sun and star A. The head angle for that
      // is the tail's direction minus the train's span, lifted to the
      // nearest full-turn equivalent of the hero pose so the journey stays
      // one revolution (± a few degrees) rather than gaining laps.
      const dirW = Math.atan2(vh * 0.1875 - sunEndVY, vw * 0.375 - sunEndVX);
      const endBase = dirW - (workBodies.length - 1) * workStep;
      workEndHead = endBase
        + 2 * Math.PI * Math.round((workPhase + 2 * Math.PI - endBase) / (2 * Math.PI));
      const p = computeProgress();
      const q = computeRunway();
      displayedProgress = p;
      displayedRunway = q;
      apply(p, q);

      // Rotate each circle so its path origin (path-pos 100) sits where the
      // on-screen arc begins, measured from wherever the page opened — the
      // hero, a section hash, or a restored reload all trace from the sun's
      // CURRENT pose. The dashoffset animation (-100 toward 0) then reveals
      // pixels backward in path direction, starting on screen immediately
      // instead of after an off-screen warmup. Entrance only: re-rotating on
      // a later init would jump an arc that's mid-draw.
      if (!isResize) {
        const startA = computeRingDrawStart(sunNowX, sunNowY, ringRadius,  vw, vh);
        const startB = computeRingDrawStart(sunNowX, sunNowY, ringRadiusB, vw, vh);
        if (startA !== null) orbitRing.setAttribute('transform', `rotate(${startA / RAD})`);
        if (startB !== null) orbitRingB.setAttribute('transform', `rotate(${startB / RAD})`);
      }
      if (isResize) startLoop();
    };

    init(false);

    // Fonts and late-loading assets reflow the document after mount, and
    // the schedule's scroll length (cachedBaseMax) plus every layout-derived
    // threshold were measured against the pre-swap layout — leaving the
    // night-sky landings a few degrees short of their slots until the next
    // resize re-derived them. Re-init once the font swap settles and once
    // more when the full load does.
    let disposed = false;
    const onLateLayout = () => {
      if (!disposed) init(true);
    };
    window.addEventListener('load', onLateLayout, { once: true });
    document.fonts?.ready.then(onLateLayout).catch(() => {});

    let resizeTimer: ReturnType<typeof setTimeout>;
    // Mobile browsers fire `resize` every time the URL bar slides away, which
    // is a height change of up to ~120px mid-scroll. Re-running init() on
    // those re-measures the placeholder and re-derives every ring radius, so
    // the whole orrery jumps while you're scrolling. Width changes are real
    // resizes; height-only changes below the bar's travel are not.
    const URL_BAR_SLACK = 140;
    const onResize = () => {
      const sameWidth = window.innerWidth === vw;
      if (sameWidth && Math.abs(window.innerHeight - vh) <= URL_BAR_SLACK) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => init(true), 80);
    };

    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(innerRingRaf);
      running = false;
      window.removeEventListener('load', onLateLayout);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', startLoop);
      starElA.removeEventListener('animationend', onStarBloomEnd);
      worksOrbit?.removeEventListener('animationend', onWorksBloomEnd);
    };
  }, []);
}
