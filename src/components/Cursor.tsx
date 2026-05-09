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

// --bg: #F3DBC3   --ink: #445b4b   --accent: #d79554
const BG_FALLBACK:     [number,number,number] = [243, 219, 195];
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

// The cursor uses mix-blend-mode: difference, so its rendered color over the
// page bg is |source − bg|. To make the cursor APPEAR as `target` against
// the bg, we set its source to `bg − target` (clamped). Over the bg this
// resolves to the target color; over ink text it produces a contrasting tint
// that keeps text shapes visible underneath rather than disappearing into a
// same-color blob.
function preBlend(
  bg: [number,number,number],
  target: [number,number,number],
): [number,number,number] {
  return [
    Math.max(0, Math.min(255, bg[0] - target[0])),
    Math.max(0, Math.min(255, bg[1] - target[1])),
    Math.max(0, Math.min(255, bg[2] - target[2])),
  ];
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
    // 'work-dot' sits below the work-portal-dots container (z-index 62) so the dot mark/star paints over the pill
    let pillKind: 'nav' | 'email' | 'panel-close' | 'work-dot' | null = null;
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
    let lastBlend: '' | 'normal' | 'difference' = '';

    // Two palettes are tracked per scope so the cursor can switch blend modes
    // without recomputing colours each frame:
    //   - PRE-BLEND values resolve to real ink/accent under mix-blend-mode:
    //     difference (used in dot mode, so the dot stays legible over text).
    //   - REAL values are painted directly under mix-blend-mode: normal (used
    //     in pill mode, so the orange bubble fully covers the sun/orbit/star
    //     graphics behind it instead of difference-blending with them).
    let INK: [number, number, number] = preBlend(BG_FALLBACK, INK_FALLBACK);
    let ACCENT: [number, number, number] = preBlend(BG_FALLBACK, ACCENT_FALLBACK);
    let INK_REAL: [number, number, number] = INK_FALLBACK;
    let ACCENT_REAL: [number, number, number] = ACCENT_FALLBACK;
    // Scoped palettes only exist on .nav and .work-portal — refresh only when
    // crossing into / out of one of those subtrees. Avoids running
    // getComputedStyle on every pointerover.
    let lastScope: Element | null = null;
    const refreshPalette = (sourceEl?: Element | null) => {
      const source = sourceEl ?? document.documentElement;
      const cs = getComputedStyle(source);
      const bg     = parseColor(cs.getPropertyValue('--bg'))     ?? BG_FALLBACK;
      const ink    = parseColor(cs.getPropertyValue('--ink'))    ?? INK_FALLBACK;
      const accent = parseColor(cs.getPropertyValue('--accent')) ?? ACCENT_FALLBACK;
      INK_REAL    = ink;
      ACCENT_REAL = accent;
      INK    = preBlend(bg, ink);
      ACCENT = preBlend(bg, accent);
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

        // Pill mode paints the real palette under mix-blend-mode: normal so
        // the bubble is fully opaque and visually covers anything beneath it
        // (specifically the sun/orbit/star graphics at z-index 1-2 — they
        // would otherwise show through a difference-blended pill). Dot mode
        // keeps the pre-blended palette + difference so the small dot stays
        // legible over text.
        const blend: 'normal' | 'difference' = pillActive ? 'normal' : 'difference';
        s.background = pillActive
          ? lerpColor(INK_REAL, ACCENT_REAL, ct)
          : lerpColor(INK, ACCENT, ct);
        if (blend !== lastBlend) {
          s.mixBlendMode = blend;
          lastBlend = blend;
        }

        // email pill: z-index 5 so it sits above the sun (z-index 1-2) but below
        //             section content (z-index 10) — text stays on top of pill
        // panel-close pill: 61, sits above the work panel (z-index 60)
        // nav pill:   69 so it sits below the fixed nav at z-index 70
        // dot mode:   1000 so the dot is always visible
        const z =
          pillKind === 'email' ? 5 :
          pillKind === 'panel-close' ? 61 :
          pillKind === 'work-dot' ? 61 :
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
        '.nav-links a, .contact-email, .work-panel-close, .work-portal-dot:not(.is-active)',
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
        } else if (hit.classList.contains('work-portal-dot')) {
          pillKind = 'work-dot';
          hoveredEmail = null;
          // Snap the pill to the visible 7px mark, not the 22px hit zone, so
          // the cursor merges into the dot itself instead of forming a halo.
          const mark = hit.querySelector('.work-portal-dot-mark') as HTMLElement | null;
          if (mark) {
            const mr = mark.getBoundingClientRect();
            pillRect.x = mr.left; pillRect.y = mr.top;
            pillRect.w = mr.width; pillRect.h = mr.height;
          }
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
