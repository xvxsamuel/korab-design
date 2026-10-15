import { useEffect, useRef, useState } from 'react';

const DOT_SIZE = 8;
// Box the dot grows into while it wears the scissors, over a flower.
const SCISSORS_SIZE = 34;
const LERP_DOT  = 0.6;
const LERP_PILL = 0.22;
// Morph speed of the dot ↔ scissors hand-over.
const LERP_SCISSORS = 0.25;

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
// the bg, each channel of the source sits `target` away from the bg: below
// it where the bg is the lighter of the two (light pages, dark ink), above
// it where the target is lighter (a dark page's light ink). Subtracting
// alone clamped every channel to black on a dark page, and black under
// difference draws nothing. Over the bg this resolves to the target color;
// over ink text it produces a contrasting tint that keeps text shapes
// visible underneath rather than disappearing into a same-color blob.
function preBlend(
  bg: [number,number,number],
  target: [number,number,number],
): [number,number,number] {
  const channel = (b: number, t: number) => (b >= t ? b - t : Math.min(255, b + t));
  return [channel(bg[0], target[0]), channel(bg[1], target[1]), channel(bg[2], target[2])];
}

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const scissorsRef = useRef<SVGSVGElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const canHover =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover) return;
    setEnabled(true);
    // `cursor-custom` on <html> is the one switch between the two cursors:
    // with it, style.css hides the system cursor and shows this one; without
    // it, the reverse. It's only on while this cursor is confirmed under the
    // pointer (see park/unpark), so at load, after coming back from another
    // window or tab, and with the pointer outside the page, the system cursor
    // is what shows — and if this effect bails or JS never runs, the class
    // never lands at all. Nobody is left without a pointer.

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
    // Scissors morph progress — 0 is the plain dot, 1 the scissors over a
    // flower. Target flips on pointerover; the displayed value lerps.
    let scTarget = 0;
    let sc = 0;
    let lastScissorStyle = '';

    let raf = 0;
    let running = false;
    let lastBlend: '' | 'normal' | 'difference' = '';
    // Cache the prior DOM-write strings so a frame that produces the same
    // visual values as the previous one can skip the style write entirely.
    // The render loop already stops on settle, but during active morphing
    // some properties go quiet several frames before others (e.g. width is
    // done before color), and these short-circuits keep those late frames
    // from doing work the browser would just discard.
    let lastTransform = '';
    let lastWidth = '';
    let lastHeight = '';
    let lastRadius = '';
    let lastBg = '';
    // Cached inputs to lerpColor so repeated identical (a, b, t) calls
    // don't re-round and re-concat the same rgb() string each frame.
    let lerpA: [number, number, number] | null = null;
    let lerpB: [number, number, number] | null = null;
    let lerpT = -1;
    let lerpResult = '';

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
        // A hovered element can be unmounted under the cursor (the panel's
        // close button when the panel closes). A detached node's rect is all
        // zeros, which sent the pill lerping into the top-left corner.
        if (!hoveredEmail.isConnected) {
          pillActive = false;
          pillKind = null;
          hoveredEmail = null;
        } else {
          const r = hoveredEmail.getBoundingClientRect();
          pillRect.x = r.left; pillRect.y = r.top;
          pillRect.w = r.width; pillRect.h = r.height;
        }
      }

      sc += (scTarget - sc) * LERP_SCISSORS;

      let tx: number, ty: number, tw: number, th: number, tr: number, tt: number;
      let speed: number;
      if (pillActive) {
        tx = pillRect.x; ty = pillRect.y;
        tw = pillRect.w; th = pillRect.h;
        tr = th / 2; tt = 1;
        speed = LERP_PILL;
      } else {
        // Over a flower the dot swells into the scissors' box; the same
        // width/height/radius lerp that makes the pill morph carries this
        // one, so the hand-over is one continuous shape change.
        const size = DOT_SIZE + (SCISSORS_SIZE - DOT_SIZE) * sc;
        tx = mx - size / 2; ty = my - size / 2;
        tw = size; th = size;
        tr = size / 2; tt = 0;
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
        // translate3d (not left/top) so each frame is composited only — no
        // layout pass. Width/height/border-radius still drive the dot↔pill
        // morph, but those touch the cursor's own box, not the page layout.
        // Each property is gated on a prior-value cache so frames that don't
        // change a property skip its style write — assigning the same string
        // back still costs a render-tree invalidation lookup.
        const tNext = `translate3d(${cx}px, ${cy}px, 0)`;
        if (tNext !== lastTransform) { s.transform = tNext; lastTransform = tNext; }
        const wNext = `${cw}px`;
        if (wNext !== lastWidth) { s.width = wNext; lastWidth = wNext; }
        const hNext = `${ch}px`;
        if (hNext !== lastHeight) { s.height = hNext; lastHeight = hNext; }
        const rNext = `${cr}px`;
        if (rNext !== lastRadius) { s.borderRadius = rNext; lastRadius = rNext; }

        // Pill mode paints the real palette under mix-blend-mode: normal so
        // the bubble is fully opaque and visually covers anything beneath it
        // (specifically the sun/orbit/star graphics at z-index 1-2 — they
        // would otherwise show through a difference-blended pill). Dot mode
        // keeps the pre-blended palette + difference so the small dot stays
        // legible over text. Scissors mode also blends normal — the icon
        // would go psychedelic under difference. The switch sits at the very
        // bottom of the morph, where the dot is back to size and nearly
        // refilled, so neither direction shows a visible mode change.
        const scissors = !pillActive && sc > 0.02;
        const blend: 'normal' | 'difference' =
          pillActive || (scissors && sc > 0.05) ? 'normal' : 'difference';
        const a = blend === 'normal' ? INK_REAL : INK;
        const b = blend === 'normal' ? ACCENT_REAL : ACCENT;
        // lerpColor cache — when (a, b, t) repeat across frames the rounded
        // RGB tuple is identical, so reuse the prior string. Hits during the
        // tail of a morph where ct has stabilized but the loop is still
        // running for position settling.
        let bgNext: string;
        if (a === lerpA && b === lerpB && ct === lerpT) {
          bgNext = lerpResult;
        } else {
          bgNext = lerpColor(a, b, ct);
          lerpA = a; lerpB = b; lerpT = ct; lerpResult = bgNext;
        }
        // The disc empties as the scissors arrive: same circle, its fill
        // handing over to the icon. The fill is gone by sc=0.3 — emptying
        // early on the way in, and refilling only once the circle is nearly
        // dot-sized again on the way out. A linear (1 − sc) here made the
        // return stutter: the fill came back while the box was still ~12px,
        // which flashed as a briefly fatter dot.
        if (scissors) {
          const fill = Math.max(0, Math.min(1, (0.3 - sc) / 0.3));
          bgNext = bgNext.replace('rgb(', 'rgba(').replace(')', `, ${fill.toFixed(3)})`);
        }
        if (bgNext !== lastBg) { s.background = bgNext; lastBg = bgNext; }
        if (blend !== lastBlend) {
          s.mixBlendMode = blend;
          lastBlend = blend;
        }

        // Scissors icon — grows out of the dot from nothing (no fade) and
        // swings in to rest at a working tilt, folding away on unhover along
        // the same path.
        const scEl = scissorsRef.current;
        if (scEl) {
          const scNext = sc < 0.02
            ? 'op:0'
            : `${sc.toFixed(3)}|${INK_REAL.join(',')}`;
          if (scNext !== lastScissorStyle) {
            lastScissorStyle = scNext;
            if (sc < 0.02) {
              scEl.style.opacity = '0';
            } else {
              scEl.style.opacity = '1';
              // Rests at -38° — blades up-left toward the stem it cuts —
              // arriving from a further -35° underswing.
              scEl.style.transform =
                `scale(${sc.toFixed(3)}) rotate(${(-38 - (1 - sc) * 35).toFixed(1)}deg)`;
              scEl.style.color = `rgb(${INK_REAL[0]},${INK_REAL[1]},${INK_REAL[2]})`;
            }
          }
        }

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
        Math.abs(tt - ct) < 0.005 && Math.abs(scTarget - sc) < 0.005;

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

    // Parked: the system cursor shows. That's the state at load and whenever
    // this one's position is unknown — focus went to another app, the tab was
    // hidden, the pointer left the page, a touch came in. The first real
    // movement unparks it, right where the pointer is instead of gliding
    // over from wherever it was left.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let parked = true;
    const park = () => {
      if (parked) return;
      parked = true;
      document.documentElement.classList.remove('cursor-custom');
    };
    const unpark = () => {
      if (!parked) return;
      parked = false;
      if (!pillActive) {
        const size = DOT_SIZE + (SCISSORS_SIZE - DOT_SIZE) * sc;
        cx = mx - size / 2;
        cy = my - size / 2;
      }
      // The tick that writes this position runs before the next paint, so the
      // dot never shows at its old spot.
      document.documentElement.classList.add('cursor-custom');
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !fine.matches) {
        park();
        return;
      }
      mx = e.clientX;
      my = e.clientY;
      unpark();
      schedule();
    };
    const onOut = (e: MouseEvent) => {
      // No related target: the pointer left the window (or went into a frame).
      if (!e.relatedTarget) park();
    };
    const onVisibility = () => {
      if (document.hidden) park();
    };
    const onFineChange = () => {
      if (!fine.matches) park();
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null);
      refreshPaletteFor(el);

      // Over a flower's cut zone the dot becomes the scissors.
      scTarget = el?.closest('.bg-flower-hit') ? 1 : 0;

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
    document.addEventListener('mouseout', onOut, { passive: true });
    window.addEventListener('blur', park);
    document.addEventListener('visibilitychange', onVisibility);
    fine.addEventListener('change', onFineChange);
    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute, { passive: true });
    window.addEventListener('palette-change', onPalette);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('mouseout', onOut);
      window.removeEventListener('blur', park);
      document.removeEventListener('visibilitychange', onVisibility);
      fine.removeEventListener('change', onFineChange);
      window.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('palette-change', onPalette);
      document.documentElement.classList.remove('cursor-custom');
    };
  }, []);

  if (!enabled) return null;

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      {/* Lucide "scissors" (ISC). Stroke-based; 2.4 width keeps the blades
          present at cursor size. The per-frame rotation rests it at a
          working diagonal. */}
      <svg
        ref={scissorsRef}
        className="cursor-scissors"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="3" />
        <path d="M8.12 8.12 12 12" />
        <path d="M20 4 8.12 15.88" />
        <circle cx="6" cy="18" r="3" />
        <path d="M14.8 14.8 20 20" />
      </svg>
    </div>
  );
}
