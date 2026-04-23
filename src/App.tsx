import { useEffect, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import Background from './components/Background';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Works from './components/Works';
import About from './components/About';
import Contact from './components/Contact';

gsap.registerPlugin(ScrollTrigger);

const sectionIds = ['home', 'works', 'about', 'contact'] as const;

// Sun arc — fixed-viewport path traced by overall scroll progress.
// Starts nearer the bottom-right corner (sunrise on the horizon),
// arcs overhead, sets bottom-left. Values are viewport units.
const sunPath = [
  { t: 0.0,  x: 92, y: 72 },
  { t: 0.33, x: 52, y: 14 },
  { t: 0.66, x: 32, y: 16 },
  { t: 1.0,  x: 8,  y: 72 }
] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const sampleSun = (p: number) => {
  const clamped = Math.max(0, Math.min(1, p));
  for (let i = 0; i < sunPath.length - 1; i++) {
    const a = sunPath[i];
    const b = sunPath[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const local = (clamped - a.t) / (b.t - a.t);
      const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      return { x: lerp(a.x, b.x, eased), y: lerp(a.y, b.y, eased) };
    }
  }
  return { x: sunPath[sunPath.length - 1].x, y: sunPath[sunPath.length - 1].y };
};

type VAnchor = { id: string; v: string };
const vAnchors: VAnchor[] = [
  { id: 'home',    v: 'calc(100vw - 56px)' },
  { id: 'works',   v: 'calc(100vw - 56px)' },
  { id: 'about',   v: '50vw' },
  { id: 'contact', v: '65vw' }
];

// Base shell dimension — the shell is always this size in CSS; the
// orbit radius is applied via transform: scale() so all per-frame
// updates are compositor-only (no layout/paint). Radius/100 gives a
// unit scale of 1 at 100px.
const SHELL_BASE = 100;

export default function App() {
  const [active, setActive] = useState<string>('home');

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set('.sun-trace', {
        opacity: 1,
        xPercent: -50,
        yPercent: -50,
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.18
      });
      gsap.set('.frame-h', { scaleX: 1, opacity: 1 });
      gsap.set('.frame-v', { left: vAnchors[0].v, scaleY: 1, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // --- Hot-path setup ----------------------------------------------
      // The orbit ring has a FIXED radius — chosen once at load as the
      // distance from the hero glyph to the starting sun position. The
      // glyph sits exactly on the rim at page load, and as you scroll
      // the ring translates with the sun (no resize). That keeps the
      // motion reading like a real orbit sweeping past rather than a
      // balloon that breathes with scroll.
      const setSun = gsap.quickSetter('.sun-trace', 'css') as (v: object) => void;
      const setOrbit = gsap.quickSetter('.sun-orbit', 'css') as (v: object) => void;

      const start = sampleSun(0);
      const startSunX = (start.x / 100) * window.innerWidth;
      const startSunY = (start.y / 100) * window.innerHeight;

      gsap.set('.sun-trace', {
        xPercent: -50, yPercent: -50,
        x: startSunX, y: startSunY,
        opacity: 0
      });
      gsap.set('.sun-orbit', {
        xPercent: -50, yPercent: -50,
        x: startSunX, y: startSunY,
        opacity: 0
      });
      gsap.to('.sun-trace', { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.7 });
      gsap.to('.sun-orbit', { opacity: 1, duration: 1.4, ease: 'power2.out', delay: 0.9 });

      // Measure the hero glyph once to lock the ring's radius. Use the
      // hero glyph specifically (not max-of-anchors) so the inline sun
      // sits exactly on the rim at the initial state.
      let ringRadius = 0;
      const measureRadius = () => {
        const glyph = document.querySelector<HTMLElement>('.hero-sun.orbit-anchor');
        if (!glyph) return;
        const r = glyph.getBoundingClientRect();
        const gx = r.left + r.width / 2;
        const gy = r.top + r.height / 2;
        ringRadius = Math.hypot(startSunX - gx, startSunY - gy);
        // The orbit SVG has a base radius of 100 (viewBox -100..100).
        // Apply scale once, statically, to match ringRadius in pixels.
        const scale = ringRadius / SHELL_BASE;
        gsap.set('.sun-orbit', { scale });
      };
      measureRadius();

      const apply = (p: number) => {
        const { x, y } = sampleSun(p);
        const sunX = (x / 100) * window.innerWidth;
        const sunY = (y / 100) * window.innerHeight;
        // Both sun + orbit write only translate — no scale on the hot
        // path. Orbit stays the same size it was measured at.
        setSun({ x: sunX, y: sunY });
        setOrbit({ x: sunX, y: sunY });
      };

      apply(0);

      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => apply(self.progress)
      });

      const onResize = () => {
        measureRadius();
        const p = ScrollTrigger.getAll()[0]?.progress ?? 0;
        apply(p);
      };
      window.addEventListener('resize', onResize);

      // --- Frame rules -------------------------------------------------
      gsap.set('.frame-v', { left: vAnchors[0].v });
      gsap.to('.frame-h', { scaleX: 1, duration: 1.2, ease: 'power2.inOut', delay: 0.3 });
      gsap.to('.frame-v', { scaleY: 1, duration: 1.2, ease: 'power2.inOut', delay: 0.5 });

      gsap.to('.frame-h', {
        opacity: 0,
        ease: 'power2.out',
        scrollTrigger: { trigger: '#works', start: 'top 90%', end: 'top 40%', scrub: 0.6 }
      });

      for (let i = 1; i < vAnchors.length; i++) {
        const prev = vAnchors[i - 1];
        const next = vAnchors[i];
        gsap.fromTo(
          '.frame-v',
          { left: prev.v },
          {
            left: next.v,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: `#${next.id}`,
              start: 'top bottom',
              end: 'top top',
              scrub: 0.6
            }
          }
        );
      }

      // --- Hero intro + other animations ------------------------------
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro.from('.hero-name .row1', { y: 80, opacity: 0, skewY: 2, duration: 1.1, delay: 0.5 });
      intro.from('.hero-name .row2', { y: 80, opacity: 0, skewY: -2, duration: 1.1 }, '-=0.9');
      intro.from('.hero-name .sun-inline', {
        scale: 0, rotate: -90, opacity: 0, duration: 0.8, ease: 'elastic.out(1, 0.6)'
      }, '-=0.75');
      intro.from('.hero-meta', { y: 20, opacity: 0, duration: 0.9 }, '-=0.6');
      intro.from('.scroll-cue', { y: 24, opacity: 0, duration: 0.7 }, '-=0.4');

      gsap.to('.scroll-cue', {
        opacity: 0, y: 20, ease: 'power2.out',
        scrollTrigger: { trigger: '.hero', start: 'top -10%', end: 'top -30%', scrub: 0.5 }
      });

      gsap.utils.toArray<HTMLElement>('.rule-h').forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.0,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' }
          }
        );
      });

      gsap.utils.toArray<HTMLElement>('.section-title').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, scrollTrigger: { trigger: el, start: 'top 88%' } }
        );
      });

      gsap.from('.work-row', {
        y: 16, opacity: 0, duration: 0.7, stagger: 0.06,
        scrollTrigger: { trigger: '.works', start: 'top 70%' }
      });

      return () => window.removeEventListener('resize', onResize);
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <Background />

      <div className="sun-trace" aria-hidden="true" />
      <svg className="sun-orbit" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle className="sun-orbit-ring" cx="0" cy="0" r="99" />
      </svg>
      <div className="frame-h" aria-hidden="true" />
      <div className="frame-v" aria-hidden="true" />

      <Cursor />
      <Nav active={active} />

      <main>
        <Hero />
        <div className="scroll-cue" aria-hidden="true">
          <div className="label">Scroll</div>
          <div className="track" />
          <div className="arrow" />
        </div>
        <Works />
        <About />
        <Contact />
        <footer>
          <span>© {new Date().getFullYear()} Samuel Korab</span>
          <span>Set in DeFonte &amp; Amiamie</span>
        </footer>
      </main>
    </>
  );
}
