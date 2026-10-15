import { useState } from 'react';
import type { Frame, Media, Spot } from '../../data/projects';
import FrameChrome from './FrameChrome';
import MediaView from './MediaView';

// Never magnify past this: the sources are 2×, so beyond ~2.6× a component
// starts to soften on a 1× screen.
const MAX_ZOOM = 2.6;
// Share of the stage the focused component fills, leaving air round it.
const FILL = 0.84;

type View = { s: number; tx: number; ty: number };

// Scale so the region fits the stage, then translate its centre to the
// stage's centre — clamped so the zoom never runs off the screenshot's edge.
// Translate is in % of the canvas's own (unscaled) box, origin top-left.
function focus(spot: Spot): View {
  const s = Math.max(1, Math.min(MAX_ZOOM, FILL * Math.min(1 / spot.w, 1 / spot.h)));
  const cx = spot.x + spot.w / 2;
  const cy = spot.y + spot.h / 2;
  const clampT = (t: number) => Math.min(0, Math.max(1 - s, t));
  return { s, tx: clampT(0.5 - cx * s), ty: clampT(0.5 - cy * s) };
}

type Props = { media: Media; spots: Spot[]; frame?: Frame; url?: string; caption?: string };

export default function ZoomTour({ media, spots, frame = 'browser', url, caption }: Props) {
  const [active, setActive] = useState(-1);
  const spot = active >= 0 ? spots[active] : null;
  const view = spot ? focus(spot) : { s: 1, tx: 0, ty: 0 };
  const toggle = (i: number) => setActive((cur) => (cur === i ? -1 : i));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && active >= 0) {
      // Zoom out before the panel's own Escape closes the whole page.
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      setActive(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((cur) => (cur + 1) % spots.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((cur) => (cur <= 0 ? spots.length - 1 : cur - 1));
    }
  };

  return (
    <figure className={`cs-zoom${spot ? ' is-zoomed' : ''}`} onKeyDown={onKey}>
      <div className="cs-zoom-main">
        <FrameChrome frame={frame} url={url}>
          <div className="cs-zoom-stage" style={{ aspectRatio: `${media.w} / ${media.h}` }}>
            <div
              className="cs-zoom-canvas"
              style={
                {
                  transform: `translate(${view.tx * 100}%, ${view.ty * 100}%) scale(${view.s})`,
                  '--zs': view.s,
                } as React.CSSProperties
              }
            >
              <MediaView media={media} />
              {spots.map((sp, i) => (
                <button
                  key={sp.title}
                  type="button"
                  className={`cs-zoom-spot${i === active ? ' is-active' : ''}`}
                  style={{
                    left: `${sp.x * 100}%`,
                    top: `${sp.y * 100}%`,
                    width: `${sp.w * 100}%`,
                    height: `${sp.h * 100}%`,
                  }}
                  onClick={() => toggle(i)}
                  aria-label={`${i + 1}. ${sp.title}`}
                  aria-pressed={i === active}
                >
                  <span className={`cs-zoom-pin${sp.pin ? ` is-${sp.pin}` : ''}`} aria-hidden="true">
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </FrameChrome>
      </div>
      <div className="cs-zoom-side">
        <ol className="cs-zoom-notes">
          {spots.map((sp, i) => (
            <li key={sp.title} className={i === active ? 'is-active' : undefined}>
              <button type="button" onClick={() => toggle(i)} aria-expanded={i === active}>
                <span className="cs-zoom-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="cs-zoom-title">{sp.title}</span>
              </button>
              <div className="cs-zoom-fold">
                <p className="cs-zoom-note">{sp.note}</p>
              </div>
            </li>
          ))}
        </ol>
        {/* Phones: the notes become a strip of numbered chips, and the open
            one's reasoning is set below them. */}
        <p className="cs-zoom-current" aria-live="polite">
          {spot ? spot.note : 'Tap a number to zoom in.'}
        </p>
        <button
          type="button"
          className="cs-zoom-reset"
          onClick={() => setActive(-1)}
          disabled={!spot}
        >
          Whole view
        </button>
      </div>
      {caption && <figcaption className="cs-caption">{caption}</figcaption>}
    </figure>
  );
}
