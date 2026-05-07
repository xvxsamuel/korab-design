import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StarFlat from '../assets/starflat.svg?react';
import Cogs from './Cogs';

type Project = {
  n: string;
  name: string;
  role: string;
  tags: string;
  year: string;
  bg: string;
  ink: string;
  accent: string;
  blurb: string;
  body: string;
};

const projects: Project[] = [
  {
    n: '01',
    name: 'Korabova & Lovich',
    role: 'Law Firm',
    tags: 'UX Research · Brand Identity · Web',
    year: '2026',
    bg: '#E5D2A8',
    ink: '#5a4423',
    accent: '#c8743a',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    body:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    n: '02',
    name: 'ARAM PIG',
    role: 'Data Analytics Website',
    tags: 'Data Science · Development · Gaming · Web',
    year: '2026',
    bg: '#C8D8C9',
    ink: '#2e4332',
    accent: '#c8a040',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vehicula lectus vel ipsum gravida, sed pulvinar lacus mattis.',
    body:
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
  },
  {
    n: '03',
    name: 'Veracity',
    role: 'AI Startup',
    tags: 'Product Design · Brand Identity · Web Extension',
    year: '2026',
    bg: '#D9CCDD',
    ink: '#4a3858',
    accent: '#a86496',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus suscipit tortor eget felis porttitor volutpat.',
    body:
      'Pellentesque in ipsum id orci porta dapibus. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Donec sollicitudin molestie malesuada. Praesent sapien massa, convallis a pellentesque nec, egestas non nisi.',
  },
  {
    n: '04',
    name: "Oma's Pantry",
    role: 'Online Store',
    tags: 'UX Research · Web · Ecommerce',
    year: '2025',
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
  const lastTriggerRef = useRef<string | null>(null);
  const prevOpenRef = useRef<string | null>(null);

  useEffect(() => {
    const prevOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && prevOpen && open !== prevOpen) {
      // Cycling between two open projects — push old layer out, slide new in.
      const oldIdx = projects.findIndex((p) => p.n === prevOpen);
      const newIdx = projects.findIndex((p) => p.n === open);
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
      const project = projects.find((p) => p.n === open) ?? null;
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
      // Restore focus to the trigger after state flush.
      requestAnimationFrame(() => triggerRefs.current[last]?.focus());
    }
  };

  useEffect(() => {
    if (!open) return;
    // Lock <html> scroll (CSS reserves the gutter via scrollbar-gutter so the
    // page doesn't shift when the styled scrollbar disappears).
    document.documentElement.classList.add('lock-scroll');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onExternalClose = () => close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('works:close', onExternalClose);
    return () => {
      document.documentElement.classList.remove('lock-scroll');
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('works:close', onExternalClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // While the panel is open, route wheel scroll into project navigation:
  // accumulating ~ACCUM_THRESHOLD of deltaY advances to the next project,
  // and scrolling past the last/first project closes the panel.
  useEffect(() => {
    if (!open) return;

    const ACCUM_THRESHOLD = 140;
    const COOLDOWN_MS = 280;
    let accumulated = 0;
    let lastAction = Date.now();

    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastAction < COOLDOWN_MS) {
        accumulated = 0;
        return;
      }
      accumulated += e.deltaY;
      if (Math.abs(accumulated) < ACCUM_THRESHOLD) return;

      const direction = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      lastAction = now;

      const idx = projects.findIndex((p) => p.n === open);
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= projects.length) {
        close();
      } else {
        setOpen(projects[nextIdx].n);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Push the open project's palette onto the nav (only). Track `open`, not
  // `displayed`, so the nav resets instantly when closing — the panel keeps
  // its own inline palette during the slide-out via the portal wrapper.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;
    const current = open ? projects.find((p) => p.n === open) : null;
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

  const toggle = (n: string) => setOpen((cur) => (cur === n ? null : n));

  const isOpen = open !== null;
  const project = displayed;

  const renderLayer = (p: Project, status: 'leaving' | 'current') => (
    <div
      key={`${status}-${p.n}`}
      className={`work-panel-layer work-panel-layer-${status}${cycleDir ? ` cycle-${cycleDir}` : ''}`}
      style={{ background: p.bg }}
    >
      <div className="work-panel-inner">
        <div className="work-panel-content">
          <div className="work-panel-text">
            <span className="work-panel-num">{p.n}</span>
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
          <div className="work-panel-images">
            <div className="work-image-placeholder wide" />
            <div className="work-image-placeholder" />
            <div className="work-image-placeholder tall" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section id="works" className="works">
      <h2 className="section-title">Works</h2>
      <ul className="works-list">
        {projects.map((p, idx) => {
          const rowOpen = open === p.n;
          return (
            <Fragment key={p.n}>
              <li className={`work-row-wrap${rowOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[p.n] = el;
                  }}
                  className="work-row"
                  onClick={() => toggle(p.n)}
                  aria-expanded={rowOpen}
                  aria-controls={PANEL_ID}
                  aria-haspopup="dialog"
                >
                  <span className="work-main">
                    <span className="num">
                      <span className="num-text">{p.n}</span>
                      <StarFlat className="num-star" aria-hidden="true" />
                    </span>
                    <span className="title">
                      {p.name} <span className="role">— {p.role}</span>
                    </span>
                    <span className="tags">{p.tags}</span>
                  </span>
                  <span className="year">{p.year}</span>
                </button>
              </li>
              {idx < projects.length - 1 && <li className="rule-row" aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ul>

      {createPortal(
        <div
          className="work-portal"
          style={
            project
              ? ({
                  '--bg': project.bg,
                  '--ink': project.ink,
                  '--accent': project.accent,
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
              <li key={p.n}>
                <button
                  type="button"
                  className={`work-portal-dot${p.n === open ? ' is-active' : ''}`}
                  onClick={() => setOpen(p.n)}
                  aria-label={`View ${p.name}`}
                  aria-current={p.n === open ? 'true' : undefined}
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
