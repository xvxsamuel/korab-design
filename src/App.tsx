import { useEffect, useRef, useState } from 'react';

import Background from './components/Background';
import Star from './assets/star.svg?react';
import Cursor from './components/Cursor';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Works from './components/Works';
import About from './components/About';
import Contact from './components/Contact';
import { useSunAnimation } from './hooks/useSunAnimation';

const sectionIds = ['home', 'works', 'about', 'contact'] as const;

export default function App() {
  const [active, setActive] = useState<string>('home');
  const scrollCueRef = useRef<HTMLDivElement>(null);

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
    const el = scrollCueRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      if (window.scrollY > 40) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
      }
      clearTimeout(timer);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  useSunAnimation();

  return (
    <>
      <Background />

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
        <div className="scroll-cue" aria-hidden="true" ref={scrollCueRef}>
          <div className="arrow" />
        </div>
        <Works />
        <About />
        <Contact />
        <footer>
          <span className="footer-copy">© {new Date().getFullYear()} korab.design</span>
        </footer>
      </main>
    </>
  );
}
