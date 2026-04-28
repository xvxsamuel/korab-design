import { useEffect, useRef, useState } from 'react';

type Target =
  | { kind: 'dot'; x: number; y: number }
  | { kind: 'pill'; x: number; y: number; w: number; h: number };

const DOT_SIZE = 8;
const LERP_DOT  = 0.28;
const LERP_PILL = 0.12;

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// --ink: #445b4b   --accent (star yellow): #d79554
const INK:    [number,number,number] = [68,  91,  75];
const ACCENT: [number,number,number] = [215, 149, 84];

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canHover =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover) return;
    setEnabled(true);

    // Mouse target (viewport coords)
    let mx = -200, my = -200;

    // Nav pill target — null when not hovering a nav link
    let pillTarget: { x: number; y: number; w: number; h: number } | null = null;

    // Lerped state — all in viewport coords, top-left origin
    let cx = mx - DOT_SIZE / 2;
    let cy = my - DOT_SIZE / 2;
    let cw = DOT_SIZE;
    let ch = DOT_SIZE;
    let cr = DOT_SIZE / 2; // border-radius
    let ct = 0; // 0 = dot, 1 = pill (color blend)

    let raf = 0;
    let running = false;

    const NAV_SELECTOR = '.nav-links a';

    const getTarget = (): Target => {
      if (pillTarget) return { kind: 'pill', ...pillTarget };
      return { kind: 'dot', x: mx, y: my };
    };

    const tick = () => {
      const target = getTarget();
      const speed = target.kind === 'pill' ? LERP_PILL : LERP_DOT;

      let tx: number, ty: number, tw: number, th: number, tr: number, tt: number;

      if (target.kind === 'dot') {
        // Center the dot on cursor
        tx = target.x - DOT_SIZE / 2;
        ty = target.y - DOT_SIZE / 2;
        tw = DOT_SIZE;
        th = DOT_SIZE;
        tr = DOT_SIZE / 2;
        tt = 0;
      } else {
        tx = target.x;
        ty = target.y;
        tw = target.w;
        th = target.h;
        tr = th / 2;
        tt = 1;
      }

      cx += (tx - cx) * speed;
      cy += (ty - cy) * speed;
      cw += (tw - cw) * speed;
      ch += (th - ch) * speed;
      cr += (tr - cr) * speed;
      ct += (tt - ct) * speed;

      const el = ref.current;
      if (el) {
        el.style.left   = `${cx}px`;
        el.style.top    = `${cy}px`;
        el.style.width  = `${cw}px`;
        el.style.height = `${ch}px`;
        el.style.borderRadius = `${cr}px`;
        el.style.background = lerpColor(INK, ACCENT, ct);
        // sit below nav text when in pill mode, above everything in dot mode
        el.style.zIndex = ct > 0.5 ? '39' : '1000';
        el.style.mixBlendMode = ct < 0.5 ? 'multiply' : 'normal';
      }

      const settled =
        Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05 &&
        Math.abs(tw - cw) < 0.05 && Math.abs(th - ch) < 0.05 &&
        Math.abs(tt - ct) < 0.005;

      if (!settled) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const schedule = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      schedule();
    };

    const onOver = (e: PointerEvent) => {
      const navLink = (e.target as Element | null)?.closest<HTMLElement>(NAV_SELECTOR);
      if (navLink) {
        const r = navLink.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
      } else {
        pillTarget = null;
      }
      schedule();
    };

    const recompute = () => {
      const hovered = document.querySelector<HTMLElement>(`${NAV_SELECTOR}:hover`);
      if (hovered) {
        const r = hovered.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
        schedule();
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      window.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className="cursor"
      aria-hidden="true"
    />
  );
}
