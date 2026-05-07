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
const INK_FALLBACK:    [number,number,number] = [68,  91,  75];
const ACCENT_FALLBACK: [number,number,number] = [215, 149, 84];

function parseColor(input: string): [number, number, number] | null {
  const s = input.trim();
  if (!s) return null;
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).map((v) => parseFloat(v));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  return null;
}

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canHover =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover) return;
    setEnabled(true);

    let mx = -200, my = -200;
    let pillTarget: { x: number; y: number; w: number; h: number } | null = null;
    // 'nav' keeps cursor behind fixed nav (z-index 69 < nav 70)
    // 'email' uses z-index 5 so <main> content (z-index 10+) always paints on top
    // 'panel-close' sits above the work panel (z-index 60); SVG inside the button paints on top via its own stacking context
    let pillKind: 'nav' | 'email' | 'panel-close' | null = null;
    // live reference to the hovered email element so we can re-read its rect each frame
    let hoveredEmail: HTMLElement | null = null;

    let cx = mx - DOT_SIZE / 2;
    let cy = my - DOT_SIZE / 2;
    let cw = DOT_SIZE;
    let ch = DOT_SIZE;
    let cr = DOT_SIZE / 2;
    let ct = 0;

    let raf = 0;
    let running = false;

    let INK: [number, number, number] = INK_FALLBACK;
    let ACCENT: [number, number, number] = ACCENT_FALLBACK;
    // Read --ink/--accent from the element under the cursor so the cursor
    // picks up scoped palettes (nav has its own vars, work-portal has the
    // active project's vars). Falls back to documentElement.
    const refreshPalette = (sourceEl?: Element | null) => {
      const source = sourceEl ?? document.documentElement;
      const cs = getComputedStyle(source);
      INK = parseColor(cs.getPropertyValue('--ink')) ?? INK_FALLBACK;
      ACCENT = parseColor(cs.getPropertyValue('--accent')) ?? ACCENT_FALLBACK;
    };
    refreshPalette();

    const getTarget = (): Target => {
      if (pillTarget) return { kind: 'pill', ...pillTarget };
      return { kind: 'dot', x: mx, y: my };
    };

    const tick = () => {
      // Keep pill target in sync with the hovered element as its size/position changes
      if ((pillKind === 'email' || pillKind === 'panel-close') && hoveredEmail) {
        const r = hoveredEmail.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
      }

      const target = getTarget();
      const speed = target.kind === 'pill' ? LERP_PILL : LERP_DOT;

      let tx: number, ty: number, tw: number, th: number, tr: number, tt: number;

      if (target.kind === 'dot') {
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

        // email pill: z-index 5 so it sits above the sun (z-index 1-2) but below
        //             section content (z-index 10) — text stays on top of pill
        // nav pill:   z-index 39 so it sits below the fixed nav at z-index 40
        // dot mode:   z-index 1000 so the dot is always visible
        if (pillKind === 'email') {
          el.style.zIndex = '5';
        } else if (pillKind === 'panel-close') {
          // Sits above the work panel (z-index 60); SVG inside the close button
          // has its own stacking context (z-index 2 with isolation) so it paints on top.
          el.style.zIndex = '61';
        } else if (ct > 0.5) {
          el.style.zIndex = '69';
        } else {
          el.style.zIndex = '1000';
        }
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
      const el = (e.target as Element | null);
      refreshPalette(el);
      const navLink  = el?.closest<HTMLElement>('.nav-links a');
      const emailLink = el?.closest<HTMLElement>('.contact-email');
      const closeBtn = el?.closest<HTMLElement>('.work-panel-close');

      if (navLink) {
        const r = navLink.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
        pillKind = 'nav';
        hoveredEmail = null;
      } else if (closeBtn) {
        const r = closeBtn.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
        pillKind = 'panel-close';
        hoveredEmail = closeBtn;
      } else if (emailLink) {
        const r = emailLink.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
        pillKind = 'email';
        hoveredEmail = emailLink;
      } else {
        pillTarget = null;
        pillKind = null;
        hoveredEmail = null;
      }
      schedule();
    };

    const recompute = () => {
      const navHovered   = document.querySelector<HTMLElement>('.nav-links a:hover');
      const emailHovered = document.querySelector<HTMLElement>('.contact-email:hover');
      const closeHovered = document.querySelector<HTMLElement>('.work-panel-close:hover');
      const hovered = navHovered ?? closeHovered ?? emailHovered;
      if (hovered) {
        const r = hovered.getBoundingClientRect();
        pillTarget = { x: r.left, y: r.top, w: r.width, h: r.height };
        pillKind = navHovered ? 'nav' : closeHovered ? 'panel-close' : 'email';
        hoveredEmail = (closeHovered ?? emailHovered) ?? null;
        schedule();
      }
    };

    const onPalette = () => {
      // Refresh from whatever is currently under the cursor so scoped palettes
      // (nav, work-portal) are honored — falling back to documentElement.
      const hovered = document.elementFromPoint(mx, my);
      refreshPalette(hovered);
      schedule();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute, { passive: true });
    window.addEventListener('palette-change', onPalette);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      window.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('palette-change', onPalette);
    };
  }, []);

  if (!enabled) return null;

  return <div ref={ref} className="cursor" aria-hidden="true" />;
}
