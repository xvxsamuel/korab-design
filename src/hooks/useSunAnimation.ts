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

const STAR_ARC_SCALE   = 0.75;
const RING_B_SCALE     = 0.55;  // second ring radius as fraction of main
const RING_B_ARC_SCALE = 0.75;

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
    const starEl     = document.querySelector<HTMLElement>('.hero-sun:not(.hero-sun-b)')!;
    const starElB    = document.querySelector<HTMLElement>('.hero-sun-b')!;

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let savedProgress = 0;

    // Main star — measured at init
    let ringRadius  = 0;
    let startAngle  = 0;
    let endAngle    = 0;
    let starNatVX   = 0;
    let starNatDocY = 0;

    // Second star — same natural origin as main, smaller radius, mirrored above
    let ringRadiusB  = 0;
    let startAngleB  = 0;
    let endAngleB    = 0;
    let starBNatVX   = 0;
    let starBNatDocY = 0;

    const setRingStroke = () => {
      if (ringRadius > 0) {
        orbitRing.setAttribute('stroke-width', String(SHELL_BASE / ringRadius));
        orbitRingB.setAttribute('stroke-width', String(SHELL_BASE / ringRadiusB));
      }
    };

    const apply = (p: number) => {
      const scrollY = window.scrollY;
      const { x, y } = sampleSun(p);
      const sunVX = (x / 100) * vw;
      const sunVY = (y / 100) * vh;

      const t = `translate(${sunVX}px, ${sunVY}px) translate(-50%, -50%)`;
      sunEl.style.transform    = t;
      orbitEl.style.transform  = `${t} scale(${ringRadius  / SHELL_BASE})`;
      orbitElB.style.transform = `${t} scale(${ringRadiusB / SHELL_BASE})`;

      // Main star — doc-space translate
      const angle    = lerp(startAngle,  endAngle,  Math.min(p * STAR_ARC_SCALE,   1));
      const tgtVX    = sunVX + ringRadius  * Math.cos(angle);
      const tgtVY    = sunVY + ringRadius  * Math.sin(angle);
      starEl.style.transform  = `translate(${tgtVX - starNatVX}px,  ${tgtVY - starNatDocY  + scrollY}px)`;

      // Second star — same doc-space translate math, smaller ring, goes upward
      const angleB   = lerp(startAngleB, endAngleB, Math.min(p * RING_B_ARC_SCALE, 1));
      const tgtBVX   = sunVX + ringRadiusB * Math.cos(angleB);
      const tgtBVY   = sunVY + ringRadiusB * Math.sin(angleB);
      starElB.style.transform = `translate(${tgtBVX - starBNatVX}px, ${tgtBVY - starBNatDocY + scrollY}px)`;
    };

    const init = (isResize = false) => {
      vw = window.innerWidth;
      vh = window.innerHeight;

      const s0 = sampleSun(0);
      const sunStartVX = (s0.x / 100) * vw;
      const sunStartVY = (s0.y / 100) * vh;
      const initT = `translate(${sunStartVX}px, ${sunStartVY}px) translate(-50%, -50%)`;

      if (!isResize) {
        sunEl.style.transform    = initT;
        orbitEl.style.transform  = initT;
        orbitElB.style.transform = initT;
        sunEl.style.opacity      = '0';
        orbitEl.style.opacity    = '0';
        orbitElB.style.opacity   = '0';
        gsap.to(sunEl,    { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.3 });
        gsap.to(orbitEl,  { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.4 });
        gsap.to(orbitElB, { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.5 });
      }

      // Measure main star natural position (clear transforms first)
      starEl.style.transform  = '';
      starElB.style.transform = '';
      const sr  = starEl.getBoundingClientRect();
      const row = starEl.closest('.row') as HTMLElement | null;
      const rr  = row ? row.getBoundingClientRect() : sr;

      starNatVX   = sr.left + sr.width  / 2;
      const starNatVY = rr.top + rr.height / 2;
      starNatDocY = starNatVY + window.scrollY;

      ringRadius  = Math.hypot(sunStartVX - starNatVX, sunStartVY - starNatVY);
      ringRadiusB = ringRadius * RING_B_SCALE;

      // Main star: angle from sun to star
      startAngle = Math.atan2(starNatVY - sunStartVY, starNatVX - sunStartVX);

      // Second star: exact same angle but negated Y → mirrors above the sun
      startAngleB = Math.atan2(-(starNatVY - sunStartVY), starNatVX - sunStartVX);

      // Second star's t=0 position on its ring (derived, not measured from DOM)
      starBNatVX   = sunStartVX + ringRadiusB * Math.cos(startAngleB);
      starBNatDocY = sunStartVY + ringRadiusB * Math.sin(startAngleB) + window.scrollY;

      setRingStroke();

      // End angles: measure contact title position at full scroll
      const totalScroll = document.documentElement.scrollHeight - vh;
      const contactEl   = document.getElementById('contact');
      const titleEl     = contactEl?.querySelector<HTMLElement>('.section-title') ?? contactEl;

      if (titleEl) {
        const tr = titleEl.getBoundingClientRect();
        const titleDocTop  = tr.top  + window.scrollY;
        const titleDocLeft = tr.left + window.scrollX;
        const targetVX  = titleDocLeft;
        const targetVY  = titleDocTop - totalScroll;

        const s1 = sampleSun(1);
        const sunEndVX = (s1.x / 100) * vw;
        const sunEndVY = (s1.y / 100) * vh;

        // Main star ends at contact title; second star mirrors above
        endAngle  = Math.atan2( (targetVY - sunEndVY), targetVX - sunEndVX);
        endAngleB = Math.atan2(-(targetVY - sunEndVY), targetVX - sunEndVX);
      } else {
        endAngle  = startAngle  + Math.PI;
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
