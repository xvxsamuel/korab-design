import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Star from '../assets/star.svg?react';
import StarFlat from '../assets/starflat.svg?react';
import Cogs from './Cogs';

type Project = {
  id: string;
  name: string;
  role: string;
  tags: string;
  year: string;
  /** Browse-view artwork. Cropped to a circle, so keep the subject centred. */
  image: string;
  bg: string;
  ink: string;
  accent: string;
  blurb: string;
  body: string;
};

const projects: Project[] = [
  {
    id: 'korabova-lovich',
    name: 'Korabova & Lovich',
    role: 'Law Firm',
    tags: 'UX Research · Brand Identity · Web',
    year: '2026',
    image: '/works/korabova-lovich.svg',
    bg: '#E5D2A8',
    ink: '#5a4423',
    accent: '#c8743a',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    body:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'aram-pig',
    name: 'ARAM PIG',
    role: 'Data Analytics Website',
    tags: 'Data Science · Development · Gaming · Web',
    year: '2026',
    image: '/works/aram-pig.svg',
    bg: '#C8D8C9',
    ink: '#2e4332',
    accent: '#c8a040',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vehicula lectus vel ipsum gravida, sed pulvinar lacus mattis.',
    body:
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
  },
  {
    id: 'veracity',
    name: 'Veracity',
    role: 'AI Startup',
    tags: 'Product Design · Brand Identity · Web Extension',
    year: '2026',
    image: '/works/veracity.svg',
    bg: '#D9CCDD',
    ink: '#4a3858',
    accent: '#a86496',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus suscipit tortor eget felis porttitor volutpat.',
    body:
      'Pellentesque in ipsum id orci porta dapibus. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Donec sollicitudin molestie malesuada. Praesent sapien massa, convallis a pellentesque nec, egestas non nisi.',
  },
  {
    id: 'omas-pantry',
    name: "Oma's Pantry",
    role: 'Online Store',
    tags: 'UX Research · Web · Ecommerce',
    year: '2025',
    image: '/works/omas-pantry.svg',
    bg: '#E8C2A1',
    ink: '#5a3019',
    accent: '#b85a26',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ultricies ligula sed magna dictum porta.',
    body:
      'Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec velit neque, auctor sit amet aliquam vel, ullamcorper sit amet ligula.',
  },
];

const PANEL_ID = 'work-panel';

export default function Works() {
  const [open, setOpen] = useState<string | null>(null);
  // Holds the project data while the panel is sliding out, so children
  // stay mounted (and visible) for the duration of the close transition.
  const [displayed, setDisplayed] = useState<Project | null>(null);
  // While cycling between projects, the outgoing project is kept around so
  // we can render two stacked layers and animate them past each other.
  const [outgoing, setOutgoing] = useState<Project | null>(null);
  const [cycleDir, setCycleDir] = useState<'next' | 'prev' | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastTriggerRef = useRef<string | null>(null);
  const prevOpenRef = useRef<string | null>(null);
  // Page scroll at the moment the panel opened, restored on close.
  const lockedScrollRef = useRef(0);

  const isOpen = open !== null;

  useEffect(() => {
    const prevOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && prevOpen && open !== prevOpen) {
      // Cycling between two open projects — push old layer out, slide new in.
      const oldIdx = projects.findIndex((p) => p.id === prevOpen);
      const newIdx = projects.findIndex((p) => p.id === open);
      const oldProject = projects[oldIdx] ?? null;
      const newProject = projects[newIdx] ?? null;
      if (oldProject) setOutgoing(oldProject);
      if (newProject) setDisplayed(newProject);
      setCycleDir(newIdx > oldIdx ? 'next' : 'prev');
      lastTriggerRef.current = open;
      const t = window.setTimeout(() => {
        setOutgoing(null);
        setCycleDir(null);
      }, 270);
      return () => window.clearTimeout(t);
    }

    if (open) {
      // Opening from closed.
      const project = projects.find((p) => p.id === open) ?? null;
      setDisplayed(project);
      setOutgoing(null);
      setCycleDir(null);
      lastTriggerRef.current = open;
      return;
    }

    // Closing — keep displayed mounted through the horizontal slide-out.
    setOutgoing(null);
    setCycleDir(null);
    const t = window.setTimeout(() => setDisplayed(null), 250);
    return () => window.clearTimeout(t);
  }, [open]);

  const close = () => {
    setOpen(null);
    const last = lastTriggerRef.current;
    if (last) {
      // Restore focus to the trigger after state flush. preventScroll matters:
      // the default focus behaviour scrolls the element into view, and the
      // orbit bodies are fixed-position, so the browser's idea of "into view"
      // is their layout origin — which yanked the page to the top of the
      // document on every close.
      requestAnimationFrame(() => {
        const orbitBody = triggerRefs.current[last];
        if (orbitBody?.offsetParent) orbitBody.focus({ preventScroll: true });
        else cardRefs.current[last]?.focus({ preventScroll: true });
      });
    }
  };

  // The panel is an overlay: the page underneath freezes exactly where it was
  // and is put back byte-for-byte on close, so the orrery resumes mid-stride
  // instead of re-deriving itself from a moved scroll position. Keyed on
  // isOpen, not open — cycling between projects must not unlock and relock.
  useEffect(() => {
    if (!isOpen) return;
    // Capture before the lock: some engines clamp documentElement.scrollTop to
    // 0 the moment overflow goes hidden, so reading it afterwards is too late.
    lockedScrollRef.current = window.scrollY;
    // (CSS reserves the gutter via scrollbar-gutter so the page doesn't shift
    // when the styled scrollbar disappears.)
    document.documentElement.classList.add('lock-scroll');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onExternalClose = () => close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('works:close', onExternalClose);
    return () => {
      document.documentElement.classList.remove('lock-scroll');
      // Instant, not smooth — a smooth restore would animate the orrery
      // through every intermediate scroll position on the way back.
      window.scrollTo(0, lockedScrollRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('works:close', onExternalClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Push the open project's palette onto the nav (only). Track `open`, not
  // `displayed`, so the nav resets instantly when closing — the panel keeps
  // its own inline palette during the slide-out via the portal wrapper.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;
    const current = open ? projects.find((p) => p.id === open) : null;
    if (current) {
      nav.style.setProperty('--bg', current.bg);
      nav.style.setProperty('--ink', current.ink);
      nav.style.setProperty('--accent', current.accent);
    } else {
      nav.style.removeProperty('--bg');
      nav.style.removeProperty('--ink');
      nav.style.removeProperty('--accent');
    }
    window.dispatchEvent(new Event('palette-change'));
  }, [open]);

  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  const project = displayed;
  // Palette source must update in the same render as `open` changes so the
  // .work-portal's --ink/--accent are present before the cursor's pointerover
  // handler reads them. Using `displayed` alone would lag by one render
  // (it's set in a useEffect), letting the cursor cache root-default colors.
  const paletteProject = (open ? projects.find((p) => p.id === open) : null) ?? displayed;

  const renderLayer = (p: Project, status: 'leaving' | 'current') => (
    <div
      key={`${status}-${p.id}`}
      className={`work-panel-layer work-panel-layer-${status}${cycleDir ? ` cycle-${cycleDir}` : ''}`}
      style={
        {
          background: p.bg,
          '--bg': p.bg,
          '--ink': p.ink,
          '--accent': p.accent,
        } as React.CSSProperties
      }
    >
      <div className="work-panel-inner">
        <div className="work-panel-content">
          <div className="work-panel-text">
            <h3 className="work-panel-title">{p.name}</h3>
            <p className="work-panel-blurb">{p.blurb}</p>
            <p className="work-panel-body">{p.body}</p>
            <dl className="work-panel-meta">
              <div>
                <dt>Role</dt>
                <dd>{p.role}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{p.year}</dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{p.tags}</dd>
              </div>
            </dl>
            <Cogs />
          </div>
          <figure className="work-panel-media">
            <img src={p.image} alt="" loading="lazy" decoding="async" />
          </figure>
        </div>
      </div>
    </div>
  );

  return (
    <section id="works" className="works">
      {/* Scroll runway for the orbit below. The runway sets how much scroll
          the crossing gets; the pin wrapper inside it sets how long the title
          holds. They're deliberately different lengths: the title lets go
          well before the runway ends, so it is already scrolling away while
          the stars are still crossing — they never have to share the top of
          the frame with it. */}
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
          behind the ring they sit on. Hidden on small/touch screens, where
          .works-grid takes over. */}
      <div className="works-orbit">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            ref={(el) => {
              triggerRefs.current[p.id] = el;
            }}
            className={`work-body${open === p.id ? ' is-open' : ''}`}
            onClick={() => toggle(p.id)}
            aria-expanded={open === p.id}
            aria-controls={PANEL_ID}
            aria-haspopup="dialog"
            // Ambient star until the morph — useSunAnimation flips this (and
            // pointer events, via .is-live) once the body has become a work.
            tabIndex={-1}
          >
            {/* Two faces of one body. Until the works section it wears the
                ornate cut-out mark — the second star's own face — then the
                scroll bloom burns in the solid waymark mark with the project
                cut into a circle inside it, the points reading as a star
                around the image. */}
            <span className="work-body-mark">
              {/* The gear wrapper is what the hover turns — both star faces,
                  never the image. The disc sits outside it so the project
                  stays upright through every rotation source. */}
              <span className="work-body-gear" aria-hidden="true">
                <Star className="work-body-holey" aria-hidden="true" />
                <StarFlat className="work-body-star" aria-hidden="true" />
              </span>
              <span className="work-body-disc">
                {/* Eager: the bodies are fixed-position, so a lazy loader has
                    no reliable "scrolled into view" moment to hook onto. */}
                <img src={p.image} alt="" decoding="async" />
              </span>
            </span>
            <span className="work-body-label">
              <span className="work-body-name">{p.name}</span>
              <span className="work-body-year">{p.year}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Small-screen / touch fallback: the orbit needs a wide viewport and a
          pointer, so below the breakpoint the same projects list out flat. */}
      <ul className="works-grid">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              ref={(el) => {
                cardRefs.current[p.id] = el;
              }}
              className="work-card"
              onClick={() => toggle(p.id)}
              aria-expanded={open === p.id}
              aria-controls={PANEL_ID}
              aria-haspopup="dialog"
            >
              <span className="work-card-mark">
                <StarFlat className="work-card-star" aria-hidden="true" />
                <span className="work-card-disc">
                  <img src={p.image} alt="" loading="lazy" decoding="async" />
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
          style={
            paletteProject
              ? ({
                  '--bg': paletteProject.bg,
                  '--ink': paletteProject.ink,
                  '--accent': paletteProject.accent,
                } as React.CSSProperties)
              : undefined
          }
        >
          <div
            className={`work-panel-backdrop${isOpen ? ' is-open' : ''}`}
            onClick={close}
            aria-hidden={!isOpen}
          />
          <aside
            id={PANEL_ID}
            className={`work-panel${isOpen ? ' is-open' : ''}`}
            aria-hidden={!isOpen}
            role="dialog"
            aria-modal="true"
            aria-label={project ? `${project.name} details` : 'Project details'}
          >
            {outgoing && renderLayer(outgoing, 'leaving')}
            {project && renderLayer(project, 'current')}
          </aside>
          <button
            type="button"
            className={`work-panel-close${isOpen ? ' is-open' : ''}`}
            onClick={close}
            aria-label="Close"
            aria-controls={PANEL_ID}
            aria-hidden={!isOpen}
            tabIndex={isOpen ? 0 : -1}
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
          <ol
            className={`work-portal-dots${isOpen ? ' is-open' : ''}`}
            aria-label="Project navigation"
          >
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`work-portal-dot${p.id === open ? ' is-active' : ''}`}
                  onClick={() => setOpen(p.id)}
                  aria-label={`View ${p.name}`}
                  aria-current={p.id === open ? 'true' : undefined}
                  tabIndex={isOpen ? 0 : -1}
                >
                  <span className="work-portal-dot-mark" />
                  <StarFlat className="work-portal-dot-star" />
                </button>
              </li>
            ))}
          </ol>
        </div>,
        document.body,
      )}
    </section>
  );
}
