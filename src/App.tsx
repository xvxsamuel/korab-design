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

const sectionIds = ['home', 'works', 'about', 'contact'] as const;

export default function App() {
  const [active, setActive] = useState<string>('home');
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
    const update = () => setCueHidden(window.scrollY > 40);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

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
          {/* Hero title entrance: a CSS gaussian blur is composed with this
              discrete threshold so the blurred text snaps to a crisp gooey
              shape. Hero.tsx animates --text-blur and the tableValues over
              3s, then strips the filter so the final glyphs render with
              their native antialiasing (no jagged threshold edges). */}
          <filter id="textThreshold" x="-15%" y="-25%" width="130%" height="150%">
            {/* Threshold alpha only, then re-paint with a pure ink flood so
                the displayed colour stays #445b4b at every step of the
                animation. Discrete tableValues bucket the input alpha
                range so Hero.tsx can animate the cut from strict (90%) to
                permissive (10%) by editing tableValues each frame. The
                filter is left applied permanently after the bloom — never
                dropped — because the layer-compositing transition from
                "filtered" to "no filter" caused a perceptible flash around
                the title even when the final filter output matched native
                rendering. */}
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
      <div className="star-b" aria-hidden="true">
        <span className="brand-orbit-body brand-orbit-body-b">
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
        <Contact />
        <Footer />
      </main>
    </>
  );
}
