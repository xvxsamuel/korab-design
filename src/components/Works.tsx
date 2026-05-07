import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastTriggerRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      const project = projects.find((p) => p.n === open) ?? null;
      setDisplayed(project);
      lastTriggerRef.current = open;
      return;
    }
    // Keep current displayed data through the slide-out, then clear after
    // the CSS transition (matches the 0.5s transform in style.css).
    const t = window.setTimeout(() => setDisplayed(null), 500);
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Push the open project's palette onto the document root so all UI (nav,
  // panel, cursor, anything that reads var(--bg|--ink|--accent)) reflects it.
  // Tied to `displayed` (not `open`) so the colors persist through the
  // slide-out transition.
  useEffect(() => {
    const root = document.documentElement;
    if (displayed) {
      root.style.setProperty('--bg', displayed.bg);
      root.style.setProperty('--ink', displayed.ink);
      root.style.setProperty('--accent', displayed.accent);
    } else {
      root.style.removeProperty('--bg');
      root.style.removeProperty('--ink');
      root.style.removeProperty('--accent');
    }
    window.dispatchEvent(new Event('palette-change'));
  }, [displayed]);

  const toggle = (n: string) => setOpen((cur) => (cur === n ? null : n));

  const isOpen = open !== null;
  const project = displayed;

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
                    <span className="num">{p.n}</span>
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

      <div
        className={`work-panel-backdrop${isOpen ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden={!isOpen}
      />
      <aside
        id={PANEL_ID}
        className={`work-panel${isOpen ? ' is-open' : ''}`}
        style={project ? { background: project.bg } : undefined}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={project ? `${project.name} details` : 'Project details'}
      >
        {project && (
          <div className="work-panel-inner">
            <div className="work-panel-content">
              <div className="work-panel-text">
                <span className="work-panel-num">{project.n}</span>
                <h3 className="work-panel-title">{project.name}</h3>
                <p className="work-panel-blurb">{project.blurb}</p>
                <p className="work-panel-body">{project.body}</p>
                <dl className="work-panel-meta">
                  <div>
                    <dt>Role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt>Year</dt>
                    <dd>{project.year}</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{project.tags}</dd>
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
        )}
      </aside>
      {project &&
        createPortal(
          <button
            type="button"
            className={`work-panel-close${isOpen ? ' is-open' : ''}`}
            onClick={close}
            aria-label="Close"
            aria-controls={PANEL_ID}
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
          </button>,
          document.body,
        )}
    </section>
  );
}
