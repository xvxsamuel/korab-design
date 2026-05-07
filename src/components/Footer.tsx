import { useEffect, useMemo, useRef, useState } from 'react';
import BackgroundFlowers, { generateFlowers, type Flower } from './BackgroundFlowers';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const [grown, setGrown] = useState(false);

  // Slots are confined to the middle band so flowers don't overlap the
  // back-to-top button on the left or the copyright text on the right.
  const flowers = useMemo<Flower[]>(
    () => generateFlowers([24, 40, 56, 72], 3),
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setGrown(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const backToTop = () => {
    document.getElementById('home')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <footer ref={ref} className={grown ? 'is-grown' : undefined}>
      <BackgroundFlowers flowers={flowers} className="footer-flowers" />
      <button type="button" className="footer-top" onClick={backToTop} aria-label="Back to top">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
        <span>back to top</span>
      </button>
      <span className="footer-copy">© {new Date().getFullYear()} korab.design</span>
    </footer>
  );
}
