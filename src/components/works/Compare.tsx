import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComparePair, Frame, Media } from '../../data/projects';
import StarFlat from '../../assets/starflat.svg?react';
import FrameChrome from './FrameChrome';
import MediaView from './MediaView';

const clampPct = (v: number) => Math.min(100, Math.max(0, v));
// The knob is one of the orrery's gears: it rolls as it's dragged, this many
// degrees across the full width.
const ROLL = 540;

type Props = {
  pairs: ComparePair[];
  frame?: Frame;
  labels?: [string, string];
  caption?: string;
  /** Fallback address for the browser chrome. */
  url?: string;
  /** Where the divider rests, in percent from the left. */
  start?: number;
};

// Warm the other pairs' files once the slider is in view, so switching tabs
// swaps instantly instead of showing an empty frame while one loads.
function preload(media: Media) {
  if (media.type !== 'image') return;
  const img = new Image();
  if (media.small) {
    img.sizes = '(max-width: 900px) 100vw, 1180px';
    img.srcset = `${media.small} ${Math.round(media.w / 2)}w, ${media.src} ${media.w}w`;
  }
  img.src = media.src;
}

// Before on the left, after on the right: the before layer is the one being
// clipped, so dragging right uncovers more of the old site. Each label sits
// inside its own layer and is covered or uncovered along with it.
export default function Compare({ pairs, frame = 'browser', labels = ['Before', 'After'], caption, url, start = 50 }: Props) {
  const [tab, setTab] = useState(0);
  const [pos, setPos] = useState(start);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const hinted = useRef(false);
  const pair = pairs[tab];

  const fromPointer = useCallback((clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    setPos(clampPct(((clientX - r.left) / r.width) * 100));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    hinted.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e.clientX);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 5;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pos - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pos + step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    hinted.current = true;
    setPos(clampPct(next));
  };

  // First time the slider is mostly in view, the gear rolls a little way
  // each side and back — enough to say "drag me" without words.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        pairs.forEach((p) => {
          preload(p.before);
          preload(p.after);
        });
        if (reduced || hinted.current) return;
        hinted.current = true;
        const t0 = performance.now();
        const DUR = 1500;
        const step = (now: number) => {
          if (dragging.current) return;
          const t = Math.min(1, (now - t0) / DUR);
          // One damped swing: out to the left, across to the right, home.
          setPos(clampPct(start - 14 * Math.sin(t * Math.PI * 2) * (1 - t * 0.35)));
          if (t < 1) raf = requestAnimationFrame(step);
          else setPos(start);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [pairs, start]);

  return (
    <figure ref={rootRef} className={`cs-compare cs-frame-${frame}`}>
      {pairs.length > 1 && (
        <div className="cs-tabs" role="tablist" aria-label="Pages">
          {pairs.map((p, i) => (
            <button
              key={p.label}
              type="button"
              role="tab"
              aria-selected={i === tab}
              className={`cs-tab${i === tab ? ' is-active' : ''}`}
              onClick={() => setTab(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <FrameChrome frame={frame} url={pair.url ?? url}>
        <div
          ref={stageRef}
          className="cs-compare-stage"
          style={{ aspectRatio: `${pair.after.w} / ${pair.after.h}`, '--pos': `${pos}%` } as React.CSSProperties}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="cs-compare-layer is-after">
            <MediaView key={`a-${tab}`} media={pair.after} />
            <span className="cs-compare-tag is-after">{labels[1]}</span>
          </div>
          <div className="cs-compare-layer is-before">
            <MediaView key={`b-${tab}`} media={pair.before} />
            <span className="cs-compare-tag is-before">{labels[0]}</span>
          </div>
          <div
            className="cs-compare-handle"
            role="slider"
            tabIndex={0}
            aria-label={`${pair.label}: ${labels[0]} and ${labels[1]}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${Math.round(pos)}% ${labels[0].toLowerCase()}`}
            onKeyDown={onKey}
          >
            <span className="cs-compare-line" aria-hidden="true" />
            <span className="cs-compare-knob" aria-hidden="true">
              <StarFlat
                className="cs-compare-gear"
                style={{ transform: `rotate(${((pos - 50) / 100) * ROLL}deg)` }}
              />
              <svg className="cs-compare-arrows" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 7-5 5 5 5" />
                <path d="m15 7 5 5-5 5" />
              </svg>
            </span>
          </div>
        </div>
      </FrameChrome>
      {caption && <figcaption className="cs-caption">{caption}</figcaption>}
    </figure>
  );
}
