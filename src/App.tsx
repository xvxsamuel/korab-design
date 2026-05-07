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
      <div className="sun-trace" aria-hidden="true" />
      <svg className="sun-orbit" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle className="sun-orbit-ring" cx="0" cy="0" r="100" />
      </svg>
      <svg className="sun-orbit sun-orbit-b" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle className="sun-orbit-ring sun-orbit-ring-b" cx="0" cy="0" r="100" />
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
