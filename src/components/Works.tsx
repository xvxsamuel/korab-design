import { Fragment } from 'react';

type Project = {
  n: string;
  name: string;
  role: string;
  tags: string;
  year: string;
};

const projects: Project[] = [
  { n: '01', name: 'Korabova & Lovich', role: 'Law Firm',  tags: 'UX Research · Brand Identity · Web',  year: '2026' },
  { n: '02', name: 'ARAM PIG',  role: 'Data Analytics Website',   tags: 'Data Science · Development · Gaming · Web',  year: '2026' },
  { n: '03', name: 'Veracity',  role: 'AI Startup',   tags: 'Product Design · Brand Identity · Web Extension',     year: '2026' },
  { n: '04', name: "Oma's Pantry",  role: 'Online Store',    tags: 'UX Research · Web · Ecommerce',   year: '2025' },
];

export default function Works() {
  return (
    <section id="works" className="works">
      <h2 className="section-title">Works</h2>
      <ul className="works-list">
        {projects.map((p, idx) => (
          <Fragment key={p.n}>
            <li className="work-row-wrap">
              <a className="work-row" href="#" aria-label={`${p.name} — ${p.role}`}>
                <span className="work-main">
                  <span className="num">{p.n}</span>
                  <span className="title">
                    {p.name} <span className="role">— {p.role}</span>
                  </span>
                  <span className="tags">{p.tags}</span>
                </span>
                <span className="year">{p.year}</span>
              </a>
            </li>
            {idx < projects.length - 1 && <li className="rule-h rule-row" aria-hidden="true" />}
          </Fragment>
        ))}
      </ul>
    </section>
  );
}
