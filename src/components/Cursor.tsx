import { useEffect, useRef, useState } from 'react';

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
    // Pill target rect — mutated in place each frame to avoid per-frame allocations.
    const pillRect = { x: 0, y: 0, w: 0, h: 0 };
    let pillActive = false;
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
    let lastZ = 0;

    let raf = 0;
    let running = false;

    let INK: [number, number, number] = INK_FALLBACK;
    let ACCENT: [number, number, number] = ACCENT_FALLBACK;
    // Scoped palettes only exist on .nav and .work-portal — refresh only when
    // crossing into / out of one of those subtrees. Avoids running
    // getComputedStyle on every pointerover (one per element under the cursor).
    let lastScope: Element | null = null;
    const refreshPalette = (sourceEl?: Element | null) => {
      const source = sourceEl ?? document.documentElement;
      const cs = getComputedStyle(source);
      INK = parseColor(cs.getPropertyValue('--ink')) ?? INK_FALLBACK;
      ACCENT = parseColor(cs.getPropertyValue('--accent')) ?? ACCENT_FALLBACK;
    };
    const refreshPaletteFor = (el: Element | null | undefined) => {
      const scope = (el?.closest('.nav, .work-portal') as Element | null) ?? null;
      if (scope === lastScope) return;
      lastScope = scope;
      refreshPalette(scope ?? document.documentElement);
    };
    refreshPalette();

    const tick = () => {
      // Keep pill target in sync with the hovered element as its size/position changes
      if ((pillKind === 'email' || pillKind === 'panel-close') && hoveredEmail) {
        const r = hoveredEmail.getBoundingClientRect();
        pillRect.x = r.left; pillRect.y = r.top;
        pillRect.w = r.width; pillRect.h = r.height;
      }

      let tx: number, ty: number, tw: number, th: number, tr: number, tt: number;
      let speed: number;
      if (pillActive) {
        tx = pillRect.x; ty = pillRect.y;
        tw = pillRect.w; th = pillRect.h;
        tr = th / 2; tt = 1;
        speed = LERP_PILL;
      } else {
        tx = mx - DOT_SIZE / 2; ty = my - DOT_SIZE / 2;
        tw = DOT_SIZE; th = DOT_SIZE;
        tr = DOT_SIZE / 2; tt = 0;
        speed = LERP_DOT;
      }

      cx += (tx - cx) * speed;
      cy += (ty - cy) * speed;
      cw += (tw - cw) * speed;
      ch += (th - ch) * speed;
      cr += (tr - cr) * speed;
      ct += (tt - ct) * speed;

      const el = ref.current;
      if (el) {
        const s = el.style;
        s.left   = `${cx}px`;
        s.top    = `${cy}px`;
        s.width  = `${cw}px`;
        s.height = `${ch}px`;
        s.borderRadius = `${cr}px`;
        s.background = lerpColor(INK, ACCENT, ct);

        // email pill: z-index 5 so it sits above the sun (z-index 1-2) but below
        //             section content (z-index 10) — text stays on top of pill
        // panel-close pill: 61, sits above the work panel (z-index 60)
        // nav pill:   69 so it sits below the fixed nav at z-index 70
        // dot mode:   1000 so the dot is always visible
        const z =
          pillKind === 'email' ? 5 :
          pillKind === 'panel-close' ? 61 :
          ct > 0.5 ? 69 : 1000;
        if (z !== lastZ) {
          s.zIndex = `${z}`;
          lastZ = z;
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
      refreshPaletteFor(el);
      // Resolve the closest interactive container in a single tree walk so we
      // don't run three separate .closest() calls per pointerover.
      const hit = el?.closest<HTMLElement>(
        '.nav-links a, .contact-email, .work-panel-close',
      ) ?? null;

      if (!hit) {
        pillActive = false;
        pillKind = null;
        hoveredEmail = null;
      } else {
        const r = hit.getBoundingClientRect();
        pillRect.x = r.left; pillRect.y = r.top;
        pillRect.w = r.width; pillRect.h = r.height;
        pillActive = true;
        if (hit.classList.contains('work-panel-close')) {
          pillKind = 'panel-close';
          hoveredEmail = hit;
        } else if (hit.classList.contains('contact-email')) {
          pillKind = 'email';
          hoveredEmail = hit;
        } else {
          pillKind = 'nav';
          hoveredEmail = null;
        }
      }
      schedule();
    };

    // Nav lives in fixed positioning so its rect doesn't change with scroll.
    // Only email/panel-close pills need re-syncing — and `tick()` already
    // re-reads their rects each frame, so all this needs to do is wake the
    // loop. No `:hover` queries (those force expensive style recalcs).
    const recompute = () => {
      if (pillKind === 'email' || pillKind === 'panel-close') schedule();
    };

    const onPalette = () => {
      lastScope = null; // force re-read on next refreshPaletteFor
      const hovered = document.elementFromPoint(mx, my);
      refreshPaletteFor(hovered);
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
