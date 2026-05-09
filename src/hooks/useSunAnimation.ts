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
const SUN_CONTROL = { x: 50,    y: -18.75 }; // grid (8, -3)
const SUN_END     = { x: 6.25,  y: 31.25 };  // grid (1, 5)

// Kept for the end-position lookup elsewhere in this file.
const SUN_PATH = [SUN_START, SUN_END] as const;

// Fraction of the full arc each star travels by the time you reach the bottom.
const STAR_ARC_SCALE   = 0.75;
const STAR_B_ARC_SCALE = 0.5;
// Ring radii as a fraction of the placeholder-derived base distance. Pushing
// ring A above 1 moves star A further out along its start ray than the title
// placeholder; ring B stays referenced to the same base so it isn't dragged
// along when ring A is tweaked.
const RING_A_SCALE   = 1.15;
const RING_B_SCALE   = 0.66;
// Second star size relative to the first star.
const STAR_B_SIZE    = 0.65;
// Extra angle (radians) added to star B's start position along its arc.
// Larger values rotate B further upward from the mirrored-Y baseline so it
// sits between the navbar and the title rather than down near the title's
// horizontal level.
const STAR_B_START_OFFSET = Math.PI * 0.18;

const SHELL_BASE = 100;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
function placeStar(el: HTMLElement, vx: number, vy: number) {
  el.style.transform = `translate(${vx}px, ${vy}px) translate(-50%, -50%)`;
}

// Center an orbit ring SVG at viewport coords (vx, vy) with pixel radius r.
function placeRing(el: SVGElement, vx: number, vy: number, r: number) {
  el.style.transform = `translate(${vx}px, ${vy}px) translate(-50%, -50%) scale(${r / SHELL_BASE})`;
}

export function useSunAnimation() {
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const sunEl = document.querySelector<HTMLElement>('.sun-trace');
      if (sunEl) {
        sunEl.style.opacity = '1';
        sunEl.style.transform = `translate(${window.innerWidth * 0.5}px, ${window.innerHeight * 0.18}px) translate(-50%, -50%)`;
      }
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
    const starElB    = document.querySelector<HTMLElement>('.star-b')!;
    const placeholder = document.querySelector<HTMLElement>('.hero-sun-placeholder')!;

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
    starElB.addEventListener('animationend', onStarBloomEnd);

    let vw = window.innerWidth;
    let vh = window.innerHeight;

    let ringRadius  = 0;
    let ringRadiusB = 0;
    let startAngleA = 0;
    let startAngleB = 0;
    let endAngleA   = 0;
    let endAngleB   = 0;

    const apply = (p: number) => {
      const { x, y } = sampleSun(p);
      const sunVX = (x / 100) * vw;
      const sunVY = (y / 100) * vh;

      sunEl.style.transform = `translate(${sunVX}px, ${sunVY}px) translate(-50%, -50%)`;
      placeRing(orbitEl,  sunVX, sunVY, ringRadius);
      placeRing(orbitElB, sunVX, sunVY, ringRadiusB);

      const fracA = Math.min(p * STAR_ARC_SCALE,   1);
      const fracB = Math.min(p * STAR_B_ARC_SCALE, 1);

      // Star A: moves downward along main ring
      const angleA = lerp(startAngleA, endAngleA, fracA);
      placeStar(starElA, sunVX + ringRadius  * Math.cos(angleA), sunVY + ringRadius  * Math.sin(angleA));

      // Star B: moves upward along smaller ring (mirrored Y angle)
      const angleB = lerp(startAngleB, endAngleB, fracB);
      placeStar(starElB, sunVX + ringRadiusB * Math.cos(angleB), sunVY + ringRadiusB * Math.sin(angleB));
    };

    let cachedBaseMax = 0;

    const computeProgress = () => {
      if (cachedBaseMax <= 0) return 0;
      const eff = Math.max(0, Math.min(cachedBaseMax, window.scrollY));
      return eff / cachedBaseMax;
    };

    let displayedProgress = 0;
    let targetProgress = 0;
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
      const delta = targetProgress - displayedProgress;
      if (Math.abs(delta) < SETTLE_EPS) {
        displayedProgress = targetProgress;
        apply(displayedProgress);
        running = false;
        return;
      }
      displayedProgress += delta * LERP;
      apply(displayedProgress);
      rafId = requestAnimationFrame(tick);
    };

    const reapply = () => {
      targetProgress = computeProgress();
      startLoop();
    };

    const onScroll = () => {
      targetProgress = computeProgress();
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

      // Size stars from placeholder (star B is STAR_B_SIZE times larger)
      starElA.style.width  = `${ph.width}px`;
      starElA.style.height = `${ph.height}px`;
      starElB.style.width  = `${ph.width * STAR_B_SIZE}px`;
      starElB.style.height = `${ph.height * STAR_B_SIZE}px`;

      const baseRadius = Math.hypot(sunStartVX - starVX, sunStartVY - starVY);
      ringRadius  = baseRadius * RING_A_SCALE;
      ringRadiusB = baseRadius * RING_B_SCALE;

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
        starElB.classList.add('sun-fade-in');

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
      // Star B starts mirrored above (negate Y delta), offset further toward the top
      startAngleB = Math.atan2(-(starVY - sunStartVY), starVX - sunStartVX) + STAR_B_START_OFFSET;

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

      if (targetEl) {
        const tr = targetEl.getBoundingClientRect();
        const targetDocY = tr.top + window.scrollY + tr.height / 2;
        const sunEndYFrac = SUN_PATH[SUN_PATH.length - 1].y / 100;
        const animEnd = Math.min(totalScroll, Math.max(0, targetDocY - vh * sunEndYFrac));
        cachedBaseMax = animEnd;
      } else {
        cachedBaseMax = totalScroll;
      }

      // Stars should land in the lower portion of the viewport so they remain
      // visible at the bottom-most scroll. Choose target directions in the
      // lower part of the viewport and back-compute endAngles so that
      // lerp(startAngle, endAngle, frac) lands at the chosen direction at p=1.
      const s1 = sampleSun(1);
      const sunEndVX = (s1.x / 100) * vw;
      const sunEndVY = (s1.y / 100) * vh;

      // Big star (A) lands in the upper-right, small star (B) in the
      // lower-left — the size hierarchy reads better with the larger body
      // sitting higher. Y values use half-grid steps (3.125vh) to pull the
      // pair vertically toward each other a touch from the row-3/row-6
      // anchors, while X stays on the integer 16-unit grid.
      const dirA = Math.atan2(vh * 0.21875 - sunEndVY, vw * 0.5625 - sunEndVX); // grid (9, 3.5)
      const dirB = Math.atan2(vh * 0.34375 - sunEndVY, vw * 0.3125 - sunEndVX); // grid (5, 5.5)

      // Each star takes the natural shortest angular path from start to end,
      // which reverses the previously-forced "long way around" orbit. Same
      // landing positions, opposite rotation direction.
      endAngleA = (dirA - (1 - STAR_ARC_SCALE)   * startAngleA) / STAR_ARC_SCALE;
      endAngleB = (dirB - (1 - STAR_B_ARC_SCALE) * startAngleB) / STAR_B_ARC_SCALE;

      const p = computeProgress();
      displayedProgress = p;
      targetProgress = p;
      apply(p);
      if (isResize) reapply();
    };

    init(false);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => init(true), 80);
    };

    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(innerRingRaf);
      running = false;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      starElA.removeEventListener('animationend', onStarBloomEnd);
      starElB.removeEventListener('animationend', onStarBloomEnd);
    };
  }, []);
}
