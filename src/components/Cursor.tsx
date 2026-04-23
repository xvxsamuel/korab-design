import { useEffect, useRef, useState } from 'react';

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canHover =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover) return;
    setEnabled(true);

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;
    let raf = 0;

    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const tick = () => {
      cx += (tx - cx) * 0.28;
      cy += (ty - cy) * 0.28;
      if (ref.current) {
        ref.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const over = (e: PointerEvent) => {
      const target = e.target as Element | null;
      setBig(!!target?.closest('a, button, .work-row'));
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
    };
  }, []);

  if (!enabled) return null;
  return <div ref={ref} className={`cursor${big ? ' big' : ''}`} aria-hidden="true" />;
}
