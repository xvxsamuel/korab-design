import { useEffect, useState } from 'react';

import Star from './assets/star.svg?react';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Works from './components/Works';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { useSunAnimation } from './hooks/useSunAnimation';
import { useEntryScroll, useSectionHash } from './hooks/useEntryScroll';

const sectionIds = ['home', 'about', 'works', 'contact'] as const;

export default function App() {
  // Seeded from the URL so the first render doesn't clear a section hash
  // before the observer reports where the page actually opened.
  const [active, setActive] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return (sectionIds as readonly string[]).includes(hash) ? hash : 'home';
  });
  // Initialize from current scrollY so the first paint already reflects the
  // right state (no flash of the cue when refreshing partway down the page).
  const [cueHidden, setCueHidden] = useState<boolean>(
    () => typeof window !== 'undefined' && window.scrollY > 40,
  );

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const pastStart = window.scrollY > 40;
      setCueHidden(pastStart);
      // Disable bounce before reaching the hero; allow it at the footer.
      root.classList.toggle('past-scroll-start', pastStart);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      root.classList.remove('past-scroll-start');
    };
  }, []);

  // Declared ahead of the orrery: its layout effect must scroll into place
  // before useSunAnimation measures the starting pose.
  useEntryScroll(sectionIds);
  useSectionHash(active);
  useSunAnimation();

  return (
    <>
      <div className="sun-trace" aria-hidden="true">
        <svg className="sun-trace-svg" viewBox="-100 -100 200 200" aria-hidden="true">
          <circle className="sun-ring-outer" cx="0" cy="0" r="99" pathLength="100" />
          <circle className="sun-ring-inner" cx="0" cy="0" r="72" pathLength="100" />
        </svg>
      </div>
      <svg className="ink-noise-defs" aria-hidden="true">
        <defs>
          {/* Hero.tsx blooms a filtered title overlay, then fades it away
              over the native text before unmounting it. */}
          <filter id="textThreshold" x="-15%" y="-25%" width="130%" height="150%">
            {/* Threshold alpha, then flood with ink to preserve the title's
                colour as the threshold opens from strict to permissive. */}
            <feComponentTransfer in="SourceGraphic" result="thresh">
              <feFuncA className="threshold-func" type="discrete" tableValues="0 0 0 0 0 0 0 0 0 1" />
            </feComponentTransfer>
            <feFlood floodColor="#445b4b" result="ink" />
            <feComposite in="ink" in2="thresh" operator="in" />
          </filter>
          {/* Same alpha-threshold + flood pattern as #textThreshold, but with
              the accent flood colour so the orbit stars bloom in matching
              the surrounding accent palette. Threshold stays pinned at 90%;
              the CSS bloom animation only varies the upstream blur. */}
          <filter id="starThreshold" x="-25%" y="-25%" width="150%" height="150%">
            <feComponentTransfer in="SourceGraphic" result="thresh">
              <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 1" />
            </feComponentTransfer>
            <feFlood floodColor="#d79554" result="ink" />
            <feComposite in="ink" in2="thresh" operator="in" />
          </filter>
          {/* The works train's bloom: the same 90% alpha cut, but keeping
              the source colours — a presented body's inlay, icon and label
              aren't accent, and a flood would snap them when it lifts. */}
          <filter id="inkThreshold" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <svg className="sun-orbit" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle className="sun-orbit-ring" cx="0" cy="0" r="100" pathLength="100" />
      </svg>
      <svg className="sun-orbit sun-orbit-b" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle className="sun-orbit-ring sun-orbit-ring-b" cx="0" cy="0" r="100" pathLength="100" />
      </svg>
      <div className="star-a" aria-hidden="true">
        <span className="brand-orbit-body">
          <Star className="sun-inline" />
        </span>
      </div>
      <Cursor />
      <Nav active={active} />

      <main>
        <Hero />
        <div
          className={`scroll-cue${cueHidden ? ' hidden' : ''}`}
          aria-hidden="true"
        >
          <div className="arrow" />
        </div>
        <About />
        <Works />
        {/* The ending is a sticky frame over a short runway: the composed
            contact + footer glue to the viewport at the bottom while the
            runway's extra scroll passes underneath — that scroll belongs to
            the orbits alone (useSunAnimation's coda), so the sun finishes
            with the page and the stars keep arriving on a stopped frame. */}
        <div className="ending">
          <div className="ending-frame">
            <Contact />
            <Footer />
          </div>
          <div className="ending-runway" aria-hidden="true" />
        </div>
      </main>
    </>
  );
}
