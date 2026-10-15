import type { Project } from '../../data/projects';
import { STAR_CX, STAR_CY, STAR_INLAY, STAR_OUTLINE } from '../../lib/starReveal';
import BlockView from './BlockView';
import './case-study.css';

// The orbit star in miniature — gold outline, the project's inlay, its icon —
// on the next-work link, where the following page grows out of it.
function ProjectMark({ project }: { project: Project }) {
  return (
    <svg className="cs-mark" viewBox="0 0 191 200" aria-hidden="true">
      {/* Only the star turns, like the orbit's gears; the icon stays upright. */}
      <g className="cs-mark-star">
        <path d={STAR_OUTLINE} fill="var(--gold)" />
        <path d={STAR_INLAY} fill={project.starColor} />
      </g>
      <image
        href={project.icon}
        x={STAR_CX - 33}
        y={STAR_CY - 33}
        width={66}
        height={66}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}

type Props = {
  project: Project;
  next?: Project;
  /** Open the next case study, grown out of the given star. */
  onNext?: (next: Project, mark: Element) => void;
};

export default function CaseStudy({ project, next, onNext }: Props) {
  return (
    <article className="cs" style={{ '--star-color': project.starColor } as React.CSSProperties}>
      <header className="cs-head">
        <p className="cs-kicker">{project.tags}</p>
        <h3 className="cs-title">{project.name}</h3>
        <p className="cs-summary">{project.summary}</p>
      </header>

      {/* Facts and tools share one set of columns: a label over plain lines,
          grouped by space alone. */}
      <div className="cs-meta">
        <dl className="cs-facts">
          {project.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
          {project.link && (
            <div>
              <dt>Live</dt>
              <dd>
                <a className="cs-link" href={project.link.href} target="_blank" rel="noreferrer">
                  {project.link.label}
                </a>
              </dd>
            </div>
          )}
        </dl>
        {project.stack.length > 0 && (
          <section className="cs-stack" aria-label="Built with">
            {project.stack.map((group) => (
              <div key={group.label} className="cs-stack-group">
                <h4 className="cs-label">{group.label}</h4>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>

      {project.cover && (
        <div className="cs-section cs-cover">
          <BlockView block={project.cover} url={project.domain} />
        </div>
      )}

      {project.sections.map((section, i) => (
        <section key={section.id} className="cs-section" aria-labelledby={`${project.id}-${section.id}`}>
          <header className="cs-section-head">
            <p className="cs-label">
              <span className="cs-index">{String(i + 1).padStart(2, '0')}</span>
              {section.label}
            </p>
            <h4 id={`${project.id}-${section.id}`} className="cs-section-title">
              {section.title}
            </h4>
            {section.lede && <p className="cs-lede">{section.lede}</p>}
          </header>
          {section.blocks.map((block, j) => (
            <BlockView key={j} block={block} url={project.domain} />
          ))}
        </section>
      ))}

      {next && onNext && (
        // A nav, not a footer: the site styles bare <footer> as its own.
        <nav className="cs-next" aria-label="Next work">
          <p className="cs-label">Next work</p>
          <button
            type="button"
            className="cs-next-link"
            onClick={(e) => onNext(next, e.currentTarget.querySelector('.cs-mark') ?? e.currentTarget)}
          >
            <span className="cs-next-gear">
              <ProjectMark project={next} />
            </span>
            <span className="cs-next-text">
              <span className="cs-next-name">{next.name}</span>
              <span className="cs-next-tags">{next.tags}</span>
            </span>
          </button>
        </nav>
      )}
    </article>
  );
}
