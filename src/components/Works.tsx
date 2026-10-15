import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import WorkStar from './WorkStar';
import { labelFilterId } from '../lib/inkLabel';
import CaseStudy from './works/CaseStudy';
import WorkArc, { WorkArcGround } from './works/WorkArc';
import StarFlat from '../assets/starflat.svg?react';
import { projects, type Project } from '../data/projects';
import {
  STAR_INLAY,
  STAR_OUTLINE,
  STAR_PATH,
  STAR_CX,
  STAR_CY,
  coverRadius,
  measureOrbitBody,
  measureStar,
  screenHeight,
  outlinePath,
  revealFrame,
  starTransform,
  type RevealOrigin,
} from '../lib/starReveal';

const PANEL_ID = 'work-panel';
// Open plays a touch slower than close: arriving is the moment, leaving
// should get out of the way.
const OPEN_MS = 760;
const CLOSE_MS = 560;
// Cycling between projects reveals from a 22px dot, so it covers less
// ground in the star's own growth and can run quicker.
const CYCLE_MS = 640;
// The nav takes the project palette once the page has grown past it (and
// gives it back as the page shrinks below it), not at the click.
const NAV_SWAP_T = 0.62;

function projectPalette(project: Project): React.CSSProperties {
  return {
    '--bg': project.bg,
    '--ink': project.ink,
    '--accent': project.accent,
  } as React.CSSProperties;
}

function applyNavPalette(project: Project | null) {
  const nav = document.querySelector<HTMLElement>('.nav');
  if (!nav) return;
  if (project) {
    nav.style.setProperty('--bg', project.bg);
    nav.style.setProperty('--ink', project.ink);
    nav.style.setProperty('--accent', project.accent);
  } else {
    nav.style.removeProperty('--bg');
    nav.style.removeProperty('--ink');
    nav.style.removeProperty('--accent');
  }
  window.dispatchEvent(new Event('palette-change'));
}

// Around a fixed layer the browser still paints the page itself: the
// scrollbar gutter the root reserves (which no element can cover), insets
// and overscroll. While a work is up, the root and body wear its colour —
// switched once the page covers the screen, and back before it shrinks —
// and phones tint their browser bars to match through theme-color.
const SITE_THEME = '#F3DBC3';
function applyCanvas(project: Project | null) {
  const root = document.documentElement;
  if (project) root.style.setProperty('--canvas', project.bg);
  else root.style.removeProperty('--canvas');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', project?.bg ?? SITE_THEME);
}

type Run = {
  from: RevealOrigin;
  // The orbit star keeps turning (and the orrery breathing) under a reveal;
  // re-measured every frame, the page lands on it where it is, not where
  // it was when the run began.
  track?: () => RevealOrigin;
  cover: number;
  t: number;
  dir: 1 | -1;
  ms: number;
  last: number;
  raf: number;
  done: () => void;
  onFrame?: (t: number) => void;
};

export default function Works() {
  // What the visitor asked for — drives aria state, the arc and the palette
  // of the panel's chrome.
  const [open, setOpen] = useState<string | null>(null);
  // The project page mounted on top. Lags `open` through a close so the page
  // stays painted while it shrinks back into its star.
  const [displayed, setDisplayed] = useState<Project | null>(null);
  // While cycling, the page being covered — kept mounted under the new one
  // until the new page has grown over it.
  const [outgoing, setOutgoing] = useState<Project | null>(null);
  // A reveal has come to rest: the page fully covers the view.
  const [settled, setSettled] = useState(false);
  // The panel's chrome (close button, arc) comes up with the first page and
  // stays through moves between works, until the page closes.
  const [chrome, setChrome] = useState(false);

  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Each work's star on the panel's arc (WorkArc).
  const arcStarRefs = useRef<Record<string, Element | null>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const revealRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const iconGroupRef = useRef<SVGGElement>(null);
  const inlayRef = useRef<SVGPathElement>(null);
  const iconRef = useRef<SVGImageElement>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const runRef = useRef<Run | null>(null);
  // The orbit body the page opened from — where it shrinks back to, whatever
  // project it shows by then (the page is scroll-locked, so it hasn't moved).
  const originIdRef = useRef<string | null>(null);
  // A reveal waiting for its layer to mount (set on click, consumed in the
  // layout effect below, before the first paint of the new layer).
  const pendingRef = useRef<{
    from: RevealOrigin;
    kind: 'open' | 'cycle';
    track?: () => RevealOrigin;
    /** The colour of a solid star the page grows out of (the arc's). */
    solid?: string;
  } | null>(null);
  // Page scroll at the moment the panel opened, restored on close.
  const lockedScrollRef = useRef(0);
  const navProjectRef = useRef<Project | null>(null);
  // Whether focus moves to the close button once the page settles: after an
  // open, and after a move only if focus went down with the page it left
  // (the next-work link). A star picked on the arc keeps it.
  const refocusRef = useRef(false);

  const isOpen = open !== null;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setNav = useCallback((project: Project | null) => {
    if (navProjectRef.current === project) return;
    navProjectRef.current = project;
    applyNavPalette(project);
  }, []);

  // Pose the reveal for progress t. The star (gold, inlay) keeps the angle it
  // had in the orbit; the icon grows with it but stays upright, as it does
  // there. The page is clipped to the outline grown from the star's core.
  const paint = useCallback((run: Pick<Run, 'from' | 'cover'>, t: number, layer: HTMLDivElement | null) => {
    const { from, cover } = run;
    const f = revealFrame(t, from, cover);
    groupRef.current?.setAttribute('transform', starTransform(from.cx, from.cy, f.starR, f.deg));
    iconGroupRef.current?.setAttribute('transform', starTransform(from.cx, from.cy, f.starR, 0));
    inlayRef.current?.setAttribute(
      'transform',
      `translate(${STAR_CX} ${STAR_CY}) scale(${f.fill.toFixed(4)}) translate(${-STAR_CX} ${-STAR_CY})`,
    );
    if (layer) {
      layer.style.clipPath = f.coreR < 0.5 ? 'inset(50%)' : `path('${outlinePath(from.cx, from.cy, f.coreR, f.deg)}')`;
    }
  }, []);

  // A reveal starts as the star it grows from: gold with an inlay and an
  // icon like the orbit's (and the next-work mark), or solid like the arc's.
  const showReveal = useCallback((project: Project, solid?: string) => {
    const inlay = solid ?? project.starColor;
    inlayRef.current?.setAttribute('fill', inlay);
    inlayRef.current?.setAttribute('stroke', inlay);
    if (inkRef.current) inkRef.current.style.fill = solid ?? '';
    iconRef.current?.setAttribute('href', project.icon);
    if (iconRef.current) iconRef.current.style.visibility = solid ? 'hidden' : '';
    if (revealRef.current) revealRef.current.style.visibility = 'visible';
  }, []);

  const hideReveal = useCallback(() => {
    if (revealRef.current) revealRef.current.style.visibility = 'hidden';
  }, []);

  // Drive t toward 1 (dir 1) or 0 (dir -1). Time-stepped rather than
  // start-anchored, so a run can be reversed mid-flight from wherever it is.
  const animate = useCallback((run: Omit<Run, 'raf' | 'last'>, layerId: string) => {
    if (runRef.current) cancelAnimationFrame(runRef.current.raf);
    const live: Run = { ...run, raf: 0, last: performance.now() };
    runRef.current = live;
    const layer = () => layerRefs.current[layerId] ?? null;
    paint(live, live.t, layer());
    live.onFrame?.(live.t);
    const finished = () => (live.dir > 0 ? live.t >= 1 : live.t <= 0);
    if (live.ms <= 0) {
      live.t = live.dir > 0 ? 1 : 0;
      paint(live, live.t, layer());
      live.onFrame?.(live.t);
      runRef.current = null;
      live.done();
      return;
    }
    const step = (now: number) => {
      // Clamp the step: a throttled tab hands back one huge delta, which
      // would skip the whole reveal.
      const dt = Math.min(now - live.last, 34);
      live.last = now;
      live.t = Math.min(1, Math.max(0, live.t + (live.dir * dt) / live.ms));
      if (live.track) live.from = live.track();
      paint(live, live.t, layer());
      live.onFrame?.(live.t);
      if (finished()) {
        runRef.current = null;
        live.done();
        return;
      }
      live.raf = requestAnimationFrame(step);
    };
    live.raf = requestAnimationFrame(step);
  }, [paint]);

  // Start whichever reveal is waiting, before the new layer's first paint:
  // its clip is set to the t=0 pose here, so it never flashes full-size.
  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending || !displayed) return;
    pendingRef.current = null;
    const project = displayed;
    const from = pending.from;
    const cover = coverRadius(from.cx, from.cy, window.innerWidth, screenHeight());
    showReveal(project, pending.solid);
    const kind = pending.kind;
    animate(
      {
        from,
        track: pending.track,
        cover,
        t: 0,
        dir: 1,
        ms: reduced() ? 0 : kind === 'open' ? OPEN_MS : CYCLE_MS,
        onFrame: (t) => {
          if (t >= NAV_SWAP_T) setNav(project);
        },
        done: () => {
          const layer = layerRefs.current[project.id];
          if (layer) layer.style.clipPath = '';
          hideReveal();
          applyCanvas(project);
          setOutgoing(null);
          setSettled(true);
          setChrome(true);
        },
      },
      project.id,
    );
  }, [displayed, animate, showReveal, hideReveal, setNav]);

  const openFrom = useCallback((id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const body = triggerRefs.current[id];
    // Bodies only take clicks once presented, so the trigger is on screen.
    // The reduced-motion list has no orbit; its reveal is instant anyway.
    const from = body?.offsetParent
      ? measureOrbitBody(body)
      : measureStar(cardRefs.current[id]?.querySelector('.work-card-star') ?? document.body);
    originIdRef.current = id;
    refocusRef.current = true;
    // Not tracked on the way out: the click leaves the star mid hover-turn,
    // and following it back would swing the reveal sideways. The orbit star
    // hides under its reveal instead, so it can't peek out as it settles.
    pendingRef.current = { from, kind: 'open' };
    body?.classList.add('is-revealed');
    setSettled(false);
    setOpen(id);
    setDisplayed(project);
  }, []);

  // Swap the page for another project's, grown out of a star on the panel:
  // its star on the arc, or the next-work mark at the foot of a case study.
  const cycleTo = useCallback((id: string, fromEl?: Element) => {
    const project = projects.find((p) => p.id === id);
    if (!project || !displayed || project.id === displayed.id) return;
    // A cycle still running finishes where it is: its page is now the one
    // being covered.
    if (runRef.current) {
      cancelAnimationFrame(runRef.current.raf);
      runRef.current = null;
      const layer = layerRefs.current[displayed.id];
      if (layer) layer.style.clipPath = '';
    }
    const star = fromEl ?? arcStarRefs.current[id] ?? null;
    const from = measureStar(star ?? document.body);
    // A star on the arc is solid: the page grows out of it in its colour.
    const fill = star?.closest('.work-arc') ? star.querySelector('path') : null;
    pendingRef.current = { from, kind: 'cycle', solid: fill ? getComputedStyle(fill).fill : undefined };
    refocusRef.current = !!layerRefs.current[displayed.id]?.contains(document.activeElement);
    setSettled(false);
    setOutgoing(displayed);
    setOpen(id);
    setDisplayed(project);
  }, [displayed]);

  const close = useCallback(() => {
    const current = displayed;
    if (!current) return;
    setSettled(false);
    setChrome(false);
    setOpen(null);
    setOutgoing(null);
    const originId = originIdRef.current ?? current.id;
    const originProject = projects.find((p) => p.id === originId) ?? current;
    const body = triggerRefs.current[originId];
    const running = runRef.current;
    // Mid-reveal: reverse from where it is. Otherwise re-measure the star —
    // its idle spin kept turning while the page was up.
    const from = running?.from ?? (body?.offsetParent
      ? measureOrbitBody(body)
      : measureStar(cardRefs.current[originId] ?? document.body));
    const cover = running?.cover ?? coverRadius(from.cx, from.cy, window.innerWidth, screenHeight());
    // The gold, inlay and icon land on the star the page opened from.
    showReveal(originProject);
    // The site's own colour returns before any of it is uncovered.
    applyCanvas(null);
    animate(
      {
        from,
        track: body?.offsetParent ? () => measureOrbitBody(body) : undefined,
        cover,
        t: running?.t ?? 1,
        dir: -1,
        ms: reduced() ? 0 : CLOSE_MS,
        onFrame: (t) => {
          if (t < NAV_SWAP_T) setNav(null);
        },
        done: () => {
          hideReveal();
          // Same frame: the reveal, tracked onto the star, hands back to it.
          body?.classList.remove('is-revealed');
          setDisplayed(null);
          window.dispatchEvent(new Event('works:closed'));
          const trigger = triggerRefs.current[originId];
          // Focus comes back to the star without its keyboard-focus turn
          // (an Escape counts as keyboard use): it stays where it landed.
          if (trigger) {
            trigger.dataset.returned = '';
            trigger.addEventListener('blur', () => delete trigger.dataset.returned, { once: true });
          }
          // preventScroll: the orbit bodies are fixed-position, so the
          // browser's idea of "into view" is their layout origin — focusing
          // them plainly yanked the page to the top of the document.
          if (trigger?.offsetParent) trigger.focus({ preventScroll: true });
          else cardRefs.current[originId]?.focus({ preventScroll: true });
        },
      },
      current.id,
    );
  }, [displayed, animate, showReveal, hideReveal, setNav]);

  // The panel is an overlay: the page underneath freezes exactly where it was
  // and is put back byte-for-byte on close, so the orrery resumes mid-stride
  // instead of re-deriving itself from a moved scroll position. Keyed on the
  // page being up at all (displayed), so the lock holds through the close —
  // the star the page shrinks into must not move under it.
  const pageUp = displayed !== null;
  useEffect(() => {
    if (!pageUp) return;
    // Capture before the lock: some engines clamp documentElement.scrollTop to
    // 0 the moment overflow goes hidden, so reading it afterwards is too late.
    lockedScrollRef.current = window.scrollY;
    // (CSS reserves the gutter via scrollbar-gutter so the page doesn't shift
    // when the styled scrollbar disappears.)
    document.documentElement.classList.add('lock-scroll');
    return () => {
      document.documentElement.classList.remove('lock-scroll');
      // Instant, not smooth — a smooth restore would animate the orrery
      // through every intermediate scroll position on the way back.
      window.scrollTo({ top: lockedScrollRef.current, behavior: 'instant' });
    };
  }, [pageUp]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onExternalClose = () => close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('works:close', onExternalClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('works:close', onExternalClose);
    };
  }, [isOpen, close]);

  // Once the page has settled over the view, move focus into it.
  useEffect(() => {
    if (!settled || !refocusRef.current) return;
    refocusRef.current = false;
    closeRef.current?.focus({ preventScroll: true });
  }, [settled]);

  useEffect(() => () => {
    if (runRef.current) cancelAnimationFrame(runRef.current.raf);
  }, []);

  // Dev only: freeze the running reveal at progress t, to inspect a frame,
  // and open any project straight away, wherever the orbit is.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as {
      __revealAt?: (t: number) => void;
      __openWork?: (id: string) => void;
    };
    w.__revealAt = (t: number) => {
      const run = runRef.current;
      if (!run || !displayed) return;
      cancelAnimationFrame(run.raf);
      paint(run, t, layerRefs.current[displayed.id] ?? null);
    };
    w.__openWork = (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (!project) return;
      originIdRef.current = id;
      refocusRef.current = true;
      pendingRef.current = {
        from: { cx: window.innerWidth / 2, cy: window.innerHeight / 2, r: 60, deg: 0, fill: 1 },
        kind: 'open',
      };
      setSettled(false);
      setOpen(id);
      setDisplayed(project);
    };
    return () => {
      delete w.__revealAt;
      delete w.__openWork;
    };
  }, [displayed, paint]);

  // Palette source must update in the same render as `open` changes so the
  // .work-portal's --ink/--accent are present before the cursor's pointerover
  // handler reads them. Using `displayed` alone would lag by one render.
  const paletteProject = (open ? projects.find((p) => p.id === open) : null) ?? displayed;

  const renderLayer = (p: Project, status: 'leaving' | 'current') => (
    <div
      // Keyed by project alone: a page that turns from current to leaving
      // keeps its node, and with it its scroll position, while it's covered.
      key={p.id}
      ref={(el) => {
        layerRefs.current[p.id] = el;
      }}
      className={`work-panel-layer is-${status}`}
      data-scheme={p.scheme}
      style={{ background: p.bg, ...projectPalette(p) }}
    >
      <div className="work-panel-inner">
        <CaseStudy
          project={p}
          next={projects[(projects.findIndex((q) => q.id === p.id) + 1) % projects.length]}
          onNext={(next, mark) => cycleTo(next.id, mark)}
        />
      </div>
      <WorkArcGround />
    </div>
  );

  return (
    <section id="works" className="works">
      {/* The runway controls scroll length; the shorter pin releases the
          heading before the orbit finishes. Text paints above the stars. */}
      <div className="works-runway">
        <div className="works-pin">
          <div className="works-stage">
            <h2 className="section-title">Works</h2>
          </div>
        </div>
      </div>

      {/* Bodies riding the works orbit. Fixed to the viewport so they share a
          coordinate space with the sun; useSunAnimation writes their
          transforms in the same frame it moves the sun, so they never lag
          behind the ring they sit on. Reduced motion uses .works-grid. */}
      {/* One ink filter per label: each inks in on its own clock, and the
          alpha cut opens as it goes (lib/inkLabel.ts). */}
      <svg className="ink-noise-defs" aria-hidden="true">
        <defs>
          {projects.map((p) => (
            <filter
              key={p.id}
              id={labelFilterId(p.id)}
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
        </defs>
      </svg>
      <div className="works-orbit">
        {projects.map((p) => (
          <button
            key={p.id}
            data-work={p.id}
            type="button"
            ref={(el) => {
              triggerRefs.current[p.id] = el;
            }}
            // Keep this stable: the orbit hook owns the dynamic is-live class.
            className="work-body"
            style={{ '--star-color': p.starColor } as React.CSSProperties}
            onClick={() => (open === p.id ? close() : openFrom(p.id))}
            aria-expanded={open === p.id}
            aria-controls={PANEL_ID}
            aria-haspopup="dialog"
            // Ambient star until the morph — useSunAnimation flips this (and
            // pointer events, via .is-live) once the body has become a work.
            tabIndex={-1}
          >
            {/* The project inset grows across the original star's cutouts. */}
            <span className="work-body-mark">
              {/* The gear wrapper is what the hover turns — the star,
                  never the icon. The icon sits outside it so the project
                  stays upright through every rotation source. */}
              <span className="work-body-gear" aria-hidden="true">
                <WorkStar />
              </span>
              <span className="work-body-icon">
                {/* Eager: the bodies are fixed-position, so a lazy loader has
                    no reliable "scrolled into view" moment to hook onto. */}
                <img src={p.icon} alt="" decoding="async" />
              </span>
            </span>
            <span className="work-body-label">
              <span className="work-body-name">{p.name}</span>
              <span className="work-body-year">{p.year}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Reduced-motion fallback: the same projects in a static list. */}
      <ul className="works-grid">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              ref={(el) => {
                cardRefs.current[p.id] = el;
              }}
              className="work-card"
              style={{ '--star-color': p.starColor } as React.CSSProperties}
              onClick={() => (open === p.id ? close() : openFrom(p.id))}
              aria-expanded={open === p.id}
              aria-controls={PANEL_ID}
              aria-haspopup="dialog"
            >
              <span className="work-card-mark">
                <StarFlat className="work-card-star" aria-hidden="true" />
                <StarFlat className="work-card-inlay" aria-hidden="true" />
                <span className="work-card-icon">
                  <img src={p.icon} alt="" loading="lazy" decoding="async" />
                </span>
              </span>
              <span className="work-card-name">{p.name}</span>
              <span className="work-card-year">{p.year}</span>
            </button>
          </li>
        ))}
      </ul>

      {createPortal(
        <div
          className="work-portal"
          style={paletteProject ? projectPalette(paletteProject) : undefined}
        >
          <aside
            id={PANEL_ID}
            className={`work-panel${displayed ? ' is-up' : ''}${isOpen ? ' is-open' : ''}${chrome ? ' has-arc' : ''}`}
            aria-hidden={!isOpen}
            role="dialog"
            aria-modal="true"
            aria-label={displayed ? `${displayed.name} case study` : 'Project details'}
          >
            {outgoing && renderLayer(outgoing, 'leaving')}
            {/* The star the page grows out of: gold outline, the project's
                inlay and icon — posed over the clicked star, then zoomed. */}
            <svg ref={revealRef} className="work-reveal" aria-hidden="true">
              <defs>
                <clipPath id="work-reveal-clip">
                  <path d={STAR_OUTLINE} />
                </clipPath>
              </defs>
              {/* Inked like the orbit star (WorkStar): the whole mark, clipped
                  to its outline, with the inlay filling the cut-out. */}
              <g ref={groupRef}>
                <path ref={inkRef} className="work-reveal-ink" d={STAR_PATH} clipPath="url(#work-reveal-clip)" />
                <path ref={inlayRef} className="work-reveal-inlay" d={STAR_INLAY} />
              </g>
              <g ref={iconGroupRef}>
                {/* The orbit icon's box: 33% of the mark, centred. */}
                <image
                  ref={iconRef}
                  x={STAR_CX - 33}
                  y={STAR_CY - 33}
                  width={66}
                  height={66}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            </svg>
            {displayed && renderLayer(displayed, 'current')}
          </aside>
          <button
            ref={closeRef}
            type="button"
            className={`work-panel-close${chrome ? ' is-open' : ''}`}
            onClick={close}
            aria-label="Close"
            aria-controls={PANEL_ID}
            aria-hidden={!chrome}
            tabIndex={chrome ? 0 : -1}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <WorkArc
            projects={projects}
            active={open}
            open={chrome}
            onPick={(id, star) => cycleTo(id, star)}
            starRef={(id, el) => {
              arcStarRefs.current[id] = el;
            }}
          />
        </div>,
        document.body,
      )}
    </section>
  );
}
