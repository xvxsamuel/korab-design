import { Fragment, useEffect, useRef, useState } from 'react';

const ROW_TOP_OFFSET = 80;

type Project = {
  n: string;
  name: string;
  role: string;
  tags: string;
  year: string;
  bg: string;
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
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ultricies ligula sed magna dictum porta.',
    body:
      'Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec velit neque, auctor sit amet aliquam vel, ullamcorper sit amet ligula.',
  },
];

export default function Works() {
  const [open, setOpen] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const savedScrollRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const project = open ? projects.find((p) => p.n === open) : null;
    if (project) root.style.setProperty('--bg', project.bg);
    else root.style.removeProperty('--bg');
  }, [open]);

  // Snap-close with scroll compensation + sun freeze. Panel collapses without
  // a CSS transition, scrollY is adjusted by exactly the amount of panel that
  // was above the user, and the sun is told to hold its current displayed
  // progress for the freeze window. All in one frame, so the page's visible
  // content lines up identically and the sun visually stays put. After the
  // freeze ends, the CSS smoothing class lets the sun gently catch up to its
  // natural progress on the next scroll.
  const SUN_SELECTOR = '.sun-trace, .sun-orbit, .star-a, .star-b';
  const FREEZE_MS = 600;
  const closeWithComp = () => {
    if (!open) return;
    const panelEl = document.getElementById(`work-panel-${open}`);
    const innerEl = panelEl?.querySelector<HTMLElement>('.work-panel-inner');
    if (!panelEl || !innerEl) {
      setOpen(null);
      savedScrollRef.current = null;
      return;
    }

    const panelHeight = innerEl.getBoundingClientRect().height;
    const panelTopDoc = panelEl.getBoundingClientRect().top + window.scrollY;
    const sy = window.scrollY;
    const aboveUser = Math.max(0, Math.min(sy - panelTopDoc, panelHeight));

    // Capture the sun's currently-displayed progress before anything changes.
    const oldMax = document.documentElement.scrollHeight - window.innerHeight;
    const heldProgress = oldMax > 0 ? Math.max(0, Math.min(1, sy / oldMax)) : 0;

    panelEl.style.transition = 'none';
    panelEl.style.gridTemplateRows = '0fr';
    void panelEl.offsetHeight;
    if (aboveUser > 0) window.scrollTo(0, sy - aboveUser);

    // Freeze the sun at the captured value, then let it tween smoothly to its
    // natural progress when it eventually unfreezes.
    window.dispatchEvent(
      new CustomEvent('sun:freeze', { detail: { progress: heldProgress, duration: FREEZE_MS } }),
    );
    const sunEls = document.querySelectorAll<HTMLElement>(SUN_SELECTOR);
    sunEls.forEach((el) => el.classList.add('is-smoothing'));
    window.setTimeout(
      () => sunEls.forEach((el) => el.classList.remove('is-smoothing')),
      FREEZE_MS + 500,
    );

    setOpen(null);
    savedScrollRef.current = null;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panelEl.style.transition = '';
        panelEl.style.gridTemplateRows = '';
      });
    });
  };

  // Trigger auto-close when the user is fully past or fully before the panel
  // — i.e. the panel is no longer in the viewport in either direction. At
  // those positions the panel is outside the viewport entirely, so removing
  // it (with scroll comp) doesn't change any visible content.
  useEffect(() => {
    if (!open) return;
    const panelEl = document.getElementById(`work-panel-${open}`);
    if (!panelEl) return;

    const onScroll = () => {
      const r = panelEl.getBoundingClientRect();
      const sy = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      const panelTopDoc = r.top + sy;
      const panelBottomDoc = panelTopDoc + r.height;

      const pastPanel = sy > panelBottomDoc;
      const beforePanel = sy + vh < panelTopDoc;
      const atBottom = sy >= max - 5;

      if (pastPanel || beforePanel || atBottom) closeWithComp();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  const scrollToRow = (n: string) => {
    requestAnimationFrame(() => {
      const row = rowRefs.current[n];
      if (!row) return;
      const top = row.getBoundingClientRect().top + window.scrollY - ROW_TOP_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  };

  const toggle = (n: string) => {
    if (open === n) {
      setOpen(null);
      if (savedScrollRef.current !== null) {
        const target = savedScrollRef.current;
        savedScrollRef.current = null;
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
      return;
    }
    if (open === null) savedScrollRef.current = window.scrollY;
    setOpen(n);
    scrollToRow(n);
  };

  return (
    <section id="works" className="works">
      <h2 className="section-title">Works</h2>
      <ul className="works-list">
        {projects.map((p, idx) => {
          const isOpen = open === p.n;
          return (
            <Fragment key={p.n}>
              <li className={`work-row-wrap${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  ref={(el) => {
                    rowRefs.current[p.n] = el;
                  }}
                  className="work-row"
                  onClick={() => toggle(p.n)}
                  aria-expanded={isOpen}
                  aria-controls={`work-panel-${p.n}`}
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
                <div
                  id={`work-panel-${p.n}`}
                  className="work-panel"
                  aria-hidden={!isOpen}
                >
                  <div className="work-panel-inner">
                    <div className="work-panel-content">
                      <div className="work-panel-text">
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
                      </div>
                      <div className="work-panel-images">
                        <div className="work-image-placeholder wide" />
                        <div className="work-image-placeholder" />
                        <div className="work-image-placeholder tall" />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {idx < projects.length - 1 && <li className="rule-h rule-row" aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ul>
    </section>
  );
}
