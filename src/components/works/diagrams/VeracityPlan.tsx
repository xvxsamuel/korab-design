import { useState } from 'react';

// The pitch's three-year plan, revenue against costs, and where the €250,000
// ask goes. Revenue carries the accent, since it's the story; costs sit in a
// quieter tone. Costs are the sums of the plan's line items.
const YEARS = [
  { year: 'Year 1', stage: 'Build', revenue: 28771, costs: 73440, paying: '240' },
  { year: 'Year 2', stage: 'Scale', revenue: 115092, costs: 111400, paying: '900' },
  { year: 'Year 3', stage: 'Profit', revenue: 347676, costs: 216800, paying: '2,700' },
];
const SERIES = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'costs', label: 'Costs' },
] as const;
const ASK = [
  { name: 'Product development', amount: 85000 },
  { name: 'Marketing & growth', amount: 70000 },
  { name: 'Infrastructure & AI', amount: 60000 },
  { name: 'Legal & operations', amount: 35000 },
];
const ASK_TOTAL = ASK.reduce((sum, a) => sum + a.amount, 0);
const MAX = 350000;
const TICKS = [0, 100000, 200000, 300000];

const eur = (v: number) => `€${v.toLocaleString('en-US')}`;
const thousands = (v: number) => `${v < 0 ? '−' : '+'}€${(Math.abs(v) / 1000).toFixed(1)}k`;

type Tip = { year: number; series: (typeof SERIES)[number]['key'] };

export default function VeracityPlan() {
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="dg dg-plan" role="group" aria-label="Veracity's three-year plan and the investment ask">
      <div className="dg-plan-part">
        <div className="dg-plan-head">
          <p className="dg-plan-title">Three years</p>
          <ul className="dg-plan-legend">
            {SERIES.map((s) => (
              <li key={s.key}>
                <i className={`is-${s.key}`} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="dg-plan-chart">
          <div className="dg-plan-grid" aria-hidden="true">
            {TICKS.map((t) => (
              <span key={t} style={{ bottom: `${(t / MAX) * 100}%` }}>
                {t ? `€${t / 1000}k` : '0'}
              </span>
            ))}
          </div>
          <ol className="dg-plan-years">
            {YEARS.map((y, i) => (
              <li key={y.year}>
                <div className="dg-plan-cols">
                  {SERIES.map((s) => {
                    const on = tip?.year === i && tip.series === s.key;
                    return (
                      <span
                        key={s.key}
                        className={`dg-plan-col is-${s.key}${on ? ' is-on' : ''}`}
                        style={{ height: `${(y[s.key] / MAX) * 100}%` }}
                        tabIndex={0}
                        role="img"
                        aria-label={`${s.label}, ${y.year}: ${eur(y[s.key])}`}
                        onPointerEnter={() => setTip({ year: i, series: s.key })}
                        onPointerLeave={() => setTip(null)}
                        onFocus={() => setTip({ year: i, series: s.key })}
                        onBlur={() => setTip(null)}
                      >
                        {on && (
                          <span className="dg-plan-tip" aria-hidden="true">
                            <b>{eur(y[s.key])}</b>
                            {s.label.toLowerCase()}, {y.year.toLowerCase()}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <p className="dg-plan-x">
                  <span>{y.year}</span> {y.stage}
                </p>
                <p className="dg-plan-net">
                  <span>net</span> {thousands(y.revenue - y.costs)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="dg-plan-part">
        <div className="dg-plan-head">
          <p className="dg-plan-title">The ask: €250,000 for 20%</p>
        </div>
        <ul className="dg-plan-ask">
          {ASK.map((a) => (
            <li key={a.name}>
              <span className="dg-plan-ask-name">{a.name}</span>
              <span className="dg-plan-ask-track" aria-hidden="true">
                <i style={{ width: `${(a.amount / ASK[0].amount) * 100}%` }} />
              </span>
              <span className="dg-plan-ask-value">
                €{a.amount / 1000}k <span>{Math.round((a.amount / ASK_TOTAL) * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details className="dg-plan-table">
        <summary>The numbers</summary>
        <table>
          <thead>
            <tr>
              <th scope="col" />
              {YEARS.map((y) => (
                <th key={y.year} scope="col">
                  {y.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Paying users</th>
              {YEARS.map((y) => (
                <td key={y.year}>{y.paying}</td>
              ))}
            </tr>
            {SERIES.map((s) => (
              <tr key={s.key}>
                <th scope="row">{s.label}</th>
                {YEARS.map((y) => (
                  <td key={y.year}>{eur(y[s.key])}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Net</th>
              {YEARS.map((y) => (
                <td key={y.year}>{thousands(y.revenue - y.costs)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  );
}
