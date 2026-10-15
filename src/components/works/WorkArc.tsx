import { useEffect, useRef, type CSSProperties } from 'react';
import type { Project } from '../../data/projects';
import { inkText } from '../../lib/inkLabel';
import { STAR_OUTLINE } from '../../lib/starReveal';

// The works panel's navigator: a small piece of the orrery's orbit, curving
// in from the edge of the screen, with every work's star sitting on it in
// its own colour. The open work's star is the large one; any other opens
// its work, the page growing out of it.
//
// Two layouts share one component: from the right edge on wide screens,
// tucked up under the close button, and from the bottom edge on phones
// (switched in style.css). Each is a circle of radius r whose centre sits
// off screen, so only `bulge` px of it show; the stars sit `step` degrees
// apart, centred on `base`, in reading order (`dir`).
const LAYOUTS = {
  side: { r: 300, bulge: 30, step: 8, base: 180, dir: -1 },
  foot: { r: 340, bulge: 32, step: 7.5, base: 270, dir: 1 }
};
type Layout = (typeof LAYOUTS)['side'];
// How far past the screen edge the drawn line runs, so it never ends in view.
const OVERRUN = 6;
// The stars ink in one after another as the line reaches each (lib/inkLabel.ts;
// timed to its 0.7s ease-out draw in style.css).
const STAR_LEAD = 110;
const STAR_STAGGER = 65;

/** The visible stretch of a layout's circle, as an SVG arc around (0, 0),
 *  running in reading order — from the top, or from the left — so it draws
 *  in that way too. */
function arcPath({ r, bulge, base, dir }: Layout) {
  const half = (Math.acos((r - bulge) / r) * 180) / Math.PI + OVERRUN;
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  };
  return `M ${at(base - dir * half)} A ${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${at(base + dir * half)}`;
}

const arcFilterId = (work: string) => `arc-ink-${work}`;
const starFilterId = (work: string) => `arc-star-ink-${work}`;

/** On phones the case study scrolls beneath the arc. This ground under the
 *  arc hides what passes, so the line never runs across the text. Each page
 *  carries its own, in its own colour: a new page brings its ground with it
 *  as it grows over the last. */
export function WorkArcGround() {
  const { r, bulge } = LAYOUTS.foot;
  return (
    <svg
      className="work-arc-ground"
      viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`}
      style={{ '--R': `${r}px`, '--bulge': `${bulge}px` } as CSSProperties}
      aria-hidden="true"
    >
      <circle r={r} />
    </svg>
  );
}

type Props = {
  projects: Project[];
  active: string | null;
  /** A page is up: the arc draws in and its stars take clicks. It stays up
   *  while the visitor moves between works. */
  open: boolean;
  /** Open another work, grown out of the given star. */
  onPick: (id: string, star: Element) => void;
  /** Each star's mark, for reveals that start from it without a click. */
  starRef: (id: string, el: SVGSVGElement | null) => void;
};

export default function WorkArc({ projects, active, open, onPick, starRef }: Props) {
  const style: Record<string, string | number> = { '--mid': (projects.length - 1) / 2 };
  for (const k of ['side', 'foot'] as const) {
    const { r, bulge, step, base, dir } = LAYOUTS[k];
    style[`--${k}-r`] = `${r}px`;
    style[`--${k}-bulge`] = `${bulge}px`;
    style[`--${k}-step`] = `${step}deg`;
    style[`--${k}-base`] = `${base}deg`;
    style[`--${k}-dir`] = dir;
  }

  // A star's name inks in on hover or focus — the text alone, over a ground
  // that only shows and hides with it.
  const ink = (star: HTMLElement, on: boolean, instant = false) => {
    const name = star.querySelector<HTMLElement>('.work-arc-name');
    const text = name?.querySelector<HTMLElement>('.work-arc-name-ink');
    const work = star.dataset.work;
    if (!name || !text || !work) return;
    inkText(name, arcFilterId(work), on, { ink: text, instant });
  };
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const stars = [...(navRef.current?.querySelectorAll<HTMLElement>('.work-arc-star') ?? [])];
    const mark = (star: HTMLElement) => star.querySelector('svg');
    if (!open) {
      // Closing takes the stars back out with the line, and a name still
      // inked goes at once.
      for (const star of stars) {
        ink(star, false, true);
        const svg = mark(star);
        if (svg && star.dataset.work) inkText(svg, starFilterId(star.dataset.work), false);
      }
      return;
    }
    // Each star inks in as the line reaches it.
    const timers = stars.map((star, i) =>
      window.setTimeout(() => {
        const svg = mark(star);
        if (svg && star.dataset.work) inkText(svg, starFilterId(star.dataset.work), true);
      }, STAR_LEAD + i * STAR_STAGGER)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [open]);

  return (
    <nav
      ref={navRef}
      className={`work-arc${open ? ' is-open' : ''}`}
      aria-label="Works"
      style={style as CSSProperties}
    >
      {(['side', 'foot'] as const).map((k) => (
        <svg
          key={k}
          className={`work-arc-line is-${k}`}
          viewBox={`${-LAYOUTS[k].r} ${-LAYOUTS[k].r} ${LAYOUTS[k].r * 2} ${LAYOUTS[k].r * 2}`}
          aria-hidden="true"
        >
          <path d={arcPath(LAYOUTS[k])} pathLength={100} />
        </svg>
      ))}
      <ol>
        {projects.map((p, i) => {
          const isActive = p.id === active;
          return (
            <li key={p.id} className={isActive ? 'is-active' : undefined} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className="work-arc-star"
                data-work={p.id}
                aria-label={isActive ? `${p.name}, open` : `Open ${p.name}`}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
                style={{ '--c': p.starColor } as CSSProperties}
                onClick={(e) => {
                  if (isActive) return;
                  const mark = e.currentTarget.querySelector('svg');
                  // The page grows out of the star from here; its name goes
                  // at once (its ground already wears the new page's colour).
                  ink(e.currentTarget, false, true);
                  onPick(p.id, mark ?? e.currentTarget);
                }}
                onPointerEnter={(e) => ink(e.currentTarget, true)}
                onPointerLeave={(e) => ink(e.currentTarget, false)}
                onFocus={(e) => ink(e.currentTarget, true)}
                onBlur={(e) => ink(e.currentTarget, false)}
              >
                <svg ref={(el) => starRef(p.id, el)} viewBox="0 0 191 200" aria-hidden="true">
                  {/* Only the star turns on hover; .cs-mark-star is what the
                      reveal reads its angle from. */}
                  <g className="cs-mark-star">
                    <path d={STAR_OUTLINE} />
                  </g>
                </svg>
                <span className="work-arc-name" aria-hidden="true">
                  <span className="work-arc-name-ink">{p.name}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {/* Each name and each star inks in on its own (lib/inkLabel.ts). */}
      <svg className="ink-noise-defs" aria-hidden="true">
        <defs>
          {projects.map((p) => (
            <filter
              key={p.id}
              id={arcFilterId(p.id)}
              x="-20%"
              y="-100%"
              width="140%"
              height="300%"
              colorInterpolationFilters="sRGB"
            >
              <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 1" />
              </feComponentTransfer>
            </filter>
          ))}
          {projects.map((p) => (
            <filter
              key={p.id}
              id={starFilterId(p.id)}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 1" />
              </feComponentTransfer>
            </filter>
          ))}
        </defs>
      </svg>
    </nav>
  );
}
