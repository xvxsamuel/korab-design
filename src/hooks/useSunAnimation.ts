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

// Kept for the end-position lookup elsewhere in this file.
const SUN_PATH = [SUN_START, SUN_END] as const;

// Star A's angular rate multiplier. >1 means it completes its arc early
// and waits off-screen right (still orbiting the sun, never decoupled)
// until the sun's departure carries it back in to its landing. 1.4 makes
// the visible hero/about stretch read as real orbiting — roughly twice
// the works axle's rate — and saturates the arc while the star is hidden
// for the works stage, so no rate change is ever on screen.
const STAR_ARC_SCALE   = 1.4;
// Ring radii as a fraction of the placeholder-derived base distance.
// Ring A's value is MEASURED, not aesthetic guesswork: the title's kerning
// pulls "Korab" 0.6em left over the placeholder (tight lockup), so the
// star must sit beyond the placeholder centre to clear the K. 1.1284 puts
// the star's right tips exactly 14px off the K's ink at the reference
// size (solved against the glyph box; 1.0 overlapped the K, 1.15 drifted
// wide). Ring B stays referenced to the same base so it isn't dragged
// along when ring A is tweaked.
const RING_A_SCALE   = 1.1284;
const RING_B_SCALE   = 0.66;
// Height cap on ring B. The works bodies present at the ring's lowest point
// (sunY + radius), and base scales with viewport WIDTH — so on wide screens
// an uncapped ring pushes the works to the bottom edge (measured 81% of vh
// at 1920×1080). Capping against height pins the presented row at any
// aspect; on narrow/portrait viewports the width term is the smaller one
// anyway, so phones are untouched. 0.58 with the noon sun at ~3vh (see
// SUN_CONTROL) lands the row at ~61% of the screen — the same row as the
// old 0.5/12.5vh pair, but with a bigger inner ring and the sun higher, so
// much more of the outer ring's sweep is in frame through the works stage.
const RING_B_MAX_VH  = 0.58;
// Extra angle (radians) added to the works train's start position on ring B.
// Larger values rotate the lead body further upward from the mirrored-Y
// baseline so it sits between the navbar and the title rather than down near
// the title's horizontal level. (Inherited from the second star this train
// replaced — it keeps the same hero composition.)
const WORK_START_OFFSET = Math.PI * 0.18;

// Works orbit --------------------------------------------------------------
// The whole works animation is two small ideas:
//
//  1. ONE ANGLE, ONE RATE. The train's head angle makes exactly one full
//     revolution per page at a single constant rate: hero pose → hero pose
//     + 2π (the night slot), the very end rounded by smoothDock. Bodies
//     sit at fixed offsets from the head. The lead body's hero angle is
//     star B's old start, computed from the same placeholder geometry.
//     Where the presentations fall is a consequence of the rate, and the
//     works section's runway height in style.css is what aligns the
//     pinned title with them.
//
//  2. ONE MEASURE. A body's angular distance from the presented point (90°,
//     beneath the sun) drives everything visual: morph openness, menu
//     focus, label opacity. Symmetric in, symmetric out; no timers, no
//     fades, no special cases.
//
// The sun rises to noon (bezier midpoint = 50vw / ~3vh) before the title
// pins, holds there until the last body folds plus a dwell, then finishes
// its arc to the contact parking. The pin and backstop derive from
// measured section positions; the rotation itself derives from nothing
// but its two end poses.
const RAD = Math.PI / 180;
// The train's head-to-tail angular span — its min and max positions on the
// ring. However many projects there are, they divide this span evenly, so
// adding or removing a work re-spaces the rest instead of stretching the
// train; the per-neighbour step is derived in the hook from the body count.
const WORK_SPAN = 126 * RAD;
// Morph windows. The morph is a plain cross-fade + scale driven by --in — no
// filters, and NO time gate: openness is purely a function of a body's
// angle. The one-after-another sequencing is the axle's own 42° spacing —
// bodies reach the presented point in order by construction. (There used to
// be per-body time slots, then a single camera gate; both fought the
// geometry — the slots drifted behind schedule changes, and the gate popped
// every body already inside the enter window open at once the moment it
// lifted.)
// The morph runs backwards on the way out, so a body leaves the stage the
// way it arrived — a small ornate star, no image, no label:
//  · position-driven — a body folds shut as its centre crosses the left band
//    of the viewport (fractions of vw so phones keep a usable stage width);
//  · progress backstop — past WORK_CLOSE_P everything is shut regardless,
//    which is what keeps the last body ornate when it descends into the
//    contact section to take up its parking spot.
// ── The presented point ────────────────────────────────────────────────────
// One geometric source of truth for open, close, and focus alike: a body's
// angular distance from the arc's lowest point, 90° — directly beneath the
// sun. Everything that used to be its own system (a time-table for opening,
// pixel edge-bands for closing, a px focus band) now reads this one measure,
// so the three can never disagree about whether a body is presented, and the
// whole thing is expressed in ring-space degrees — viewport size only enters
// through the sun and ring geometry, which already scale.
const PRESENT_POINT = 90 * RAD;
// The open/fold ramps are ASYMMETRIC on purpose. Approach side: a body
// starts opening 40° out and is full 10° before the point. Under the
// constant axle rate this window is what times the unfurl against the
// page: the lead body crosses its enter edge at ~17% of the animation —
// the same beat the sun locks onto noon — so nothing blooms over the
// about section, and each next body's unfurl begins right as the previous
// presentation peaks. Exit side: tighter — fully folded by 55° past,
// safely before the title zone (~158°).
const ENTER_EDGE = 40 * RAD;
const ENTER_RAMP = 30 * RAD;
const EXIT_EDGE = 55 * RAD;
const EXIT_RAMP = 20 * RAD;
// The menu highlight is the same measure with a tighter window.
const FOCUS_HALF = 44 * RAD;
// The axle completes exactly ONE FULL REVOLUTION per page: from the hero
// pose, through the presentations, on around the top of the sun (the
// upper semicircle sits above the viewport at noon, so the return pass is
// off-screen), ending back at its starting pose — which, at the parked
// sun, tucks every body just off the contact page's edges. Each body
// folds symmetrically after presenting and simply keeps riding; during
// the locked stage the axle is the only thing that turns.
// The sun waits this dwell after the last body folds before it departs
// for the parking spot.
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
// The end-of-page backstop is derived in init() from the contact section's
// measured position; only the ramp length is fixed. It outranks the
// presented-point measure for one reason: the parked body ENDS at the
// presented point, and it must end there folded.
const WORK_CLOSE_LEN = 0.04;
// The train's angular schedule is ONE constant rate: hero pose at p=0 to
// the night slot at canvasLandP, exactly one revolution, no zones and no
// knots. The axle turns the same amount per unit of scroll everywhere on
// the page — the speed NEVER changes, which is the orrery's whole feel.
// Only three poses matter and all three are honoured by construction:
//   · p=0 — the hero trail, unchanged;
//   · the presentations — they fall wherever the constant rate puts them
//     (~27/38/48/58% of the animation); the works RUNWAY HEIGHT in
//     style.css is sized so the title pins just ahead of the first one.
//     Aligning the works moment is a layout job now, not a schedule job;
//   · at canvasLandP the tail body docks in the night sky beside the sun,
//     the very end of the ride rounded off by smoothDock.
// How far AHEAD of the pin the sun's noon arrival completes: the camera
// should lock onto a sun already at noon, not catch the tail of its rise.
const WORK_SETTLE_LEAD_P = 0.06;
// The sun's bezier parameter during the works stage — the curve's midpoint,
// which sits at exactly 50vw and (start + 2·control + end)/4 = ~3.1vh:
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
// returns the angle on the ring where the visible arc *begins* (going CCW,
// i.e., backward in SVG path direction) and the fraction of the full ring
// that's visible. The "top" of the visible arc is the boundary intersection
// with the smallest y; "bottom" is the largest y. Visible angular span is
// (topA − bottomA) mod 2π. Used to (a) rotate the SVG circle so the path
// origin sits at the top of the visible arc and (b) tell the keyframe how
// far the dashoffset should travel to finish the on-screen drawing.
function computeRingVisibility(
  cx: number, cy: number, R: number, vw: number, vh: number,
): { topAngle: number | null; visibleFraction: number } {
  const cands: { a: number; y: number }[] = [];
  const add = (a: number, x: number, y: number) => {
    if (x >= 0 && x <= vw && y >= 0 && y <= vh) cands.push({ a, y });
  };

  // Top edge: y = 0  →  sin(a) = -cy/R
  const sT = -cy / R;
  if (Math.abs(sT) <= 1) {
    const aT = Math.asin(sT);
    [aT, Math.PI - aT].forEach((a) => add(a, cx + R * Math.cos(a), 0));
  }
  // Bottom edge: y = vh  →  sin(a) = (vh - cy)/R
  const sB = (vh - cy) / R;
  if (Math.abs(sB) <= 1) {
    const aB = Math.asin(sB);
    [aB, Math.PI - aB].forEach((a) => add(a, cx + R * Math.cos(a), vh));
  }
  // Left edge: x = 0  →  cos(a) = -cx/R
  const cL = -cx / R;
  if (Math.abs(cL) <= 1) {
    const aL = Math.acos(cL);
    [aL, -aL].forEach((a) => add(a, 0, cy + R * Math.sin(a)));
  }
  // Right edge: x = vw  →  cos(a) = (vw - cx)/R
  const cR = (vw - cx) / R;
  if (Math.abs(cR) <= 1) {
    const aR = Math.acos(cR);
    [aR, -aR].forEach((a) => add(a, vw, cy + R * Math.sin(a)));
  }

  if (cands.length === 0) {
    // Either fully visible (ring inside viewport) or fully invisible. Probe
    // 12 o'clock to disambiguate.
    if (cx >= 0 && cx <= vw && cy - R >= 0 && cy - R <= vh) {
      return { topAngle: -Math.PI / 2, visibleFraction: 1 };
    }
    return { topAngle: null, visibleFraction: 0 };
  }

  cands.sort((p, q) => p.y - q.y);
  const topA = cands[0].a;
  const botA = cands[cands.length - 1].a;
  let span = topA - botA;
  while (span < 0) span += 2 * Math.PI;
  return { topAngle: topA, visibleFraction: span / (2 * Math.PI) };
}

function sampleSun(p: number): { x: number; y: number } {
  const c = Math.max(0, Math.min(1, p));
  const u = 1 - c;
  const x = u * u * SUN_START.x + 2 * u * c * SUN_CONTROL.x + c * c * SUN_END.x;
  const y = u * u * SUN_START.y + 2 * u * c * SUN_CONTROL.y + c * c * SUN_END.y;
  return { x, y };
}

// Place a fixed star at viewport coords (vx, vy), centered.
// translate3d (vs translate) is an explicit hint to keep the element on its
// own GPU layer — `will-change: transform` already opts into this in CSS,
// but the 3d form is more reliable across engines and the cost is identical.
// The cache avoids re-writing identical transform strings when scroll is
// settling and a frame produces the same float values as the prior one.
function placeStar(el: HTMLElement, vx: number, vy: number, cache: { last: string }) {
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
      return;
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
      // ~3vh — noon, high-sky. The sun reaches it before the title
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

      const sunNext = `translate3d(${sunVX}px, ${sunVY}px, 0) translate(-50%, -50%)`;
      if (sunNext !== sunCache.last) {
        sunEl.style.transform = sunNext;
        sunCache.last = sunNext;
      }
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
      placeStar(starElA, sunVX + ringRadius  * Math.cos(angleA), sunVY + ringRadius  * Math.sin(angleA), starACache);

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
        placeStar(workBodies[i], bx, by, cache);

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
    let targetProgress = 0;
    // The runway measure, damped with the same lerp so the coda scrubs as
    // softly as everything else.
    let displayedRunway = 0;
    let targetRunway = 0;
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
      targetProgress = computeProgress();
      targetRunway = computeRunway();
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

    const reapply = () => {
      targetProgress = computeProgress();
      targetRunway = computeRunway();
      startLoop();
    };

    const onScroll = () => {
      targetProgress = computeProgress();
      targetRunway = computeRunway();
      startLoop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

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

      const baseRadius = Math.hypot(sunStartVX - starVX, sunStartVY - starVY);
      ringRadius  = baseRadius * RING_A_SCALE;
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
        // r-shrink runs through Web Animations API because CSS keyframes
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

        if (!document.documentElement.classList.contains('no-entry-anim')) {
          // r=99 matches the outer ring's resting radius, so the inner ring
          // first appears flush with the outer trace and then collapses
          // inward to its rendered r=72. setAttribute on `r` is unambiguous
          // — the radius shrinks symmetrically around (cx, cy) — so we drive
          // it with rAF rather than risk a browser that doesn't tween the
          // CSS `r` property reliably.
          const SHRINK_DELAY = 1400;
          const SHRINK_DUR   = 900;
          const FADE_DUR     = 250;
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
            const fadeT   = Math.min(1, elapsed / FADE_DUR);
            const r = R_START + (R_END - R_START) * easeOut(shrinkT);
            sunRingInner.setAttribute('r', String(r));
            sunRingInner.style.opacity = String(fadeT);
            if (shrinkT < 1) innerRingRaf = requestAnimationFrame(tickInner);
          };
          // Seed initial state so the very first paint has the ring at r=99
          // (otherwise the SVG attribute r=72 paints briefly before the
          // first rAF tick fires).
          sunRingInner.setAttribute('r', String(R_START));
          sunRingInner.style.opacity = '0';
          innerRingRaf = requestAnimationFrame(tickInner);
        }
      }

      // Star A starts where the placeholder is (below sun)
      startAngleA = Math.atan2(starVY - sunStartVY, starVX - sunStartVX);
      // The works train's lead body starts mirrored above (negate Y delta),
      // offset further toward the top — star B's old opening position.
      workPhase = Math.atan2(-(starVY - sunStartVY), starVX - sunStartVX) + WORK_START_OFFSET;

      // Update ring stroke widths so they look the same weight visually
      orbitRing.setAttribute('stroke-width',  String(SHELL_BASE / ringRadius));
      orbitRingB.setAttribute('stroke-width', String(SHELL_BASE / ringRadiusB));

      // Rotate each circle so its path origin (path-pos 100) sits at the top
      // of the visible arc. Then the dashoffset animation (going from -100
      // toward 0) reveals pixels backward in path direction = CCW visually =
      // top→bottom on the visible left arc, and reveals them immediately
      // instead of after a long off-screen warmup. Visible-end dashoffset
      // tells the keyframe at which point the on-screen drawing is finished.
      const visA = computeRingVisibility(sunStartVX, sunStartVY, ringRadius,  vw, vh);
      const visB = computeRingVisibility(sunStartVX, sunStartVY, ringRadiusB, vw, vh);
      if (visA.topAngle !== null) {
        orbitRing.setAttribute('transform', `rotate(${(visA.topAngle * 180) / Math.PI})`);
      }
      if (visB.topAngle !== null) {
        orbitRingB.setAttribute('transform', `rotate(${(visB.topAngle * 180) / Math.PI})`);
      }
      // Cap ring B's drawn arc at ring A's visible fraction so the two arcs
      // subtend the same angular slice. The smaller ring naturally fits more
      // of its full circle inside the viewport (so visB.visibleFraction tends
      // to be larger than visA's), which makes it read as a much tighter,
      // more curved arc than ring A — visually mismatched. Matching the
      // angular span keeps both arcs reading as the "same shape" at
      // different scales.
      const fracA = visA.visibleFraction;
      const fracB = Math.min(visB.visibleFraction, fracA);
      orbitRing.style.setProperty('--ring-visible-end',  String(-100 + 100 * fracA));
      orbitRingB.style.setProperty('--ring-visible-end', String(-100 + 100 * fracB));

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
        const sunEndYFrac = SUN_PATH[SUN_PATH.length - 1].y / 100;
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
      // (The works train's schedule needs no landing solve: its knots are
      // fixed angles — WORK_PARK ends the page with the head body hanging
      // beneath the sun — and its direction still counter-rotates ring A's,
      // which is the orrery's whole reading. The old construction here
      // solved a +2π lap to park the last body at star B's grid spot; that
      // lap is what forced the crossing to race the page, so it's gone.)

      const p = computeProgress();
      const q = computeRunway();
      displayedProgress = p;
      targetProgress = p;
      displayedRunway = q;
      targetRunway = q;
      apply(p, q);
      if (isResize) reapply();
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
      window.removeEventListener('scroll', onScroll);
      starElA.removeEventListener('animationend', onStarBloomEnd);
      worksOrbit?.removeEventListener('animationend', onWorksBloomEnd);
    };
  }, []);
}
