import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SUN_PATH = [
  { t: 0.0,  x: 92, y: 72 },
  { t: 0.33, x: 52, y: 14 },
  { t: 0.66, x: 32, y: 16 },
  { t: 1.0,  x: 8,  y: 72 },
] as const;

// Fraction of the full arc each star travels by the time you reach the bottom.
const STAR_ARC_SCALE   = 0.75;
const STAR_B_ARC_SCALE = 0.5;
// Second ring radius as a fraction of the main ring radius.
const RING_B_SCALE   = 0.65;
// Second star size relative to the first star.
const STAR_B_SIZE    = 0.65;
// Extra angle (radians) added to star B's start — negative rotates it higher on its arc.
const STAR_B_START_OFFSET = -Math.PI * -0.25;

const SHELL_BASE = 100;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sampleSun(p: number): { x: number; y: number } {
  const c = Math.max(0, Math.min(1, p));
  for (let i = 0; i < SUN_PATH.length - 1; i++) {
    const a = SUN_PATH[i], b = SUN_PATH[i + 1];
    if (c >= a.t && c <= b.t) {
      const local = (c - a.t) / (b.t - a.t);
      const e = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
    }
  }
  return { x: SUN_PATH[SUN_PATH.length - 1].x, y: SUN_PATH[SUN_PATH.length - 1].y };
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

    const sunEl      = document.querySelector<HTMLElement>('.sun-trace')!;
    const orbitEl    = document.querySelector<SVGElement>('.sun-orbit:not(.sun-orbit-b)')!;
    const orbitRing  = document.querySelector<SVGCircleElement>('.sun-orbit-ring:not(.sun-orbit-ring-b)')!;
    const orbitElB   = document.querySelector<SVGElement>('.sun-orbit-b')!;
    const orbitRingB = document.querySelector<SVGCircleElement>('.sun-orbit-ring-b')!;
    const starElA    = document.querySelector<HTMLElement>('.star-a')!;
    const starElB    = document.querySelector<HTMLElement>('.star-b')!;
    const placeholder = document.querySelector<HTMLElement>('.hero-sun-placeholder')!;

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let savedProgress = 0;

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

    const init = (isResize = false) => {
      vw = window.innerWidth;
      vh = window.innerHeight;

      const s0 = sampleSun(0);
      const sunStartVX = (s0.x / 100) * vw;
      const sunStartVY = (s0.y / 100) * vh;

      if (!isResize) {
        const initT = `translate(${sunStartVX}px, ${sunStartVY}px) translate(-50%, -50%)`;
        sunEl.style.transform   = initT;
        orbitEl.style.opacity   = '0';
        orbitElB.style.opacity  = '0';
        sunEl.style.opacity     = '0';
        starElA.style.opacity   = '0';
        starElB.style.opacity   = '0';
        gsap.to(sunEl,    { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.3 });
        gsap.to(orbitEl,  { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.4 });
        gsap.to(orbitElB, { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.5 });
        gsap.to(starElA,  { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.3 });
        gsap.to(starElB,  { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.5 });
      }

      // Measure the placeholder to get star A's start position and size
      const ph = placeholder.getBoundingClientRect();
      const starVX = ph.left + ph.width  / 2;
      const starVY = ph.top  + ph.height / 2;

      // Size stars from placeholder (star B is STAR_B_SIZE times larger)
      starElA.style.width  = `${ph.width}px`;
      starElA.style.height = `${ph.height}px`;
      starElB.style.width  = `${ph.width * STAR_B_SIZE}px`;
      starElB.style.height = `${ph.height * STAR_B_SIZE}px`;

      ringRadius  = Math.hypot(sunStartVX - starVX, sunStartVY - starVY);
      ringRadiusB = ringRadius * RING_B_SCALE;

      // Star A starts where the placeholder is (below sun)
      startAngleA = Math.atan2(starVY - sunStartVY, starVX - sunStartVX);
      // Star B starts mirrored above (negate Y delta), offset further toward the top
      startAngleB = Math.atan2(-(starVY - sunStartVY), starVX - sunStartVX) + STAR_B_START_OFFSET;

      // Update ring stroke widths so they look the same weight visually
      orbitRing.setAttribute('stroke-width',  String(SHELL_BASE / ringRadius));
      orbitRingB.setAttribute('stroke-width', String(SHELL_BASE / ringRadiusB));

      // Compute end angles: where each star lands at the contact section
      const totalScroll = document.documentElement.scrollHeight - vh;
      const contactEl   = document.getElementById('contact');
      const titleEl     = contactEl?.querySelector<HTMLElement>('.section-title') ?? contactEl;

      if (titleEl) {
        const tr = titleEl.getBoundingClientRect();
        // Title's viewport position when fully scrolled to bottom
        const targetVX = tr.left + window.scrollX;
        const targetVY = tr.top  + window.scrollY - totalScroll;

        const s1 = sampleSun(1);
        const sunEndVX = (s1.x / 100) * vw;
        const sunEndVY = (s1.y / 100) * vh;

        endAngleA = Math.atan2( (targetVY - sunEndVY), targetVX - sunEndVX);
        endAngleB = Math.atan2(-(targetVY - sunEndVY), targetVX - sunEndVX);
      } else {
        endAngleA = startAngleA + Math.PI;
        endAngleB = startAngleB + Math.PI;
      }

      ScrollTrigger.getAll().forEach(st => st.kill());
      apply(isResize ? savedProgress : 0);

      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          savedProgress = self.progress;
          apply(self.progress);
        },
      });
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
      window.removeEventListener('resize', onResize);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);
}
