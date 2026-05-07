import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BackgroundFlowers, { generateFlowers, type Flower } from './BackgroundFlowers';

// Distance reserved between a control's edge and the nearest flower's stem
// center. Has to cover the flower's own visual extent (star half-width plus
// the longest leaf, ~50px) plus the visual breathing room we want on top of
// that, so a flower at the boundary slot still clears the controls.
const CONTROL_BUFFER_PX = 88;

// Pick a flower count so the gap between adjacent stem centers stays in a
// pleasant range (~140-180px) given the available horizontal band.
function pickFlowerCount(rangePx: number): number {
  if (rangePx < 130) return 1;
  if (rangePx < 280) return 2;
  if (rangePx < 480) return 3;
  if (rangePx < 680) return 4;
  return 5;
}

// Measure the back-to-top button and copyright relative to the footer, then
// distribute flower slots evenly across the horizontal range left over after
// reserving CONTROL_BUFFER_PX on either side of any control. Each control
// classifies as left- or right-side by which half of the footer its center
// lands in, which works for both the row layout (controls at edges) and the
// small-screen column stack (both controls on the left).
function computeSlots(footer: HTMLElement): number[] {
  const fr = footer.getBoundingClientRect();
  if (fr.width === 0) return [];

  let leftPx = 0;
  let rightPx = fr.width;
  const fCenter = fr.width / 2;

  const controls = [
    footer.querySelector<HTMLElement>('.footer-top'),
    footer.querySelector<HTMLElement>('.footer-copy'),
  ];
  for (const el of controls) {
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const localLeft = r.left - fr.left;
    const localRight = r.right - fr.left;
    const center = (localLeft + localRight) / 2;
    if (center < fCenter) {
      leftPx = Math.max(leftPx, localRight);
    } else {
      rightPx = Math.min(rightPx, localLeft);
    }
  }

  leftPx += CONTROL_BUFFER_PX;
  rightPx -= CONTROL_BUFFER_PX;

  const rangePx = rightPx - leftPx;
  if (rangePx < 80) return [];

  const count = pickFlowerCount(rangePx);
  const slots: number[] = [];
  for (let i = 0; i < count; i++) {
    const px = leftPx + (rangePx * (i + 0.5)) / count;
    slots.push((px / fr.width) * 100);
  }
  return slots;
}

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const [grown, setGrown] = useState(false);
  const [flowers, setFlowers] = useState<Flower[]>([]);

  useLayoutEffect(() => {
    const update = () => {
      if (!ref.current) return;
      setFlowers(generateFlowers(computeSlots(ref.current), 3));
    };

    update();

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 180);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

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
