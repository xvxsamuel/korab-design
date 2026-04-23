import { Fragment } from 'react';

type Project = {
  n: string;
  name: string;
  role: string;
  tags: string;
  year: string;
};

const projects: Project[] = [
  { n: '01', name: 'Polder', role: 'Banking',  tags: 'Fintech · Mobile',  year: '2025' },
  { n: '02', name: 'Lumen',  role: 'Studio',   tags: 'Brand · Identity',  year: '2025' },
  { n: '03', name: 'Hinge',  role: 'Health',   tags: 'Web · Systems',     year: '2024' },
  { n: '04', name: 'Field',  role: 'Notes',    tags: 'Editorial · Web',   year: '2024' },
  { n: '05', name: 'Atlas',  role: 'Travel',   tags: 'iOS · Research',    year: '2023' }
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
