import { Edge, Svg } from './kit';

const CLAIM =
  'Pressing Update returns a job id at once; the server then imports matches from Riot in batches of 50 while the page polls for progress, and scores every player once the matches are in.';

const LANES = [
  { name: 'Browser', x: 120 },
  { name: 'Next.js', x: 430 },
  { name: 'Riot API', x: 740 },
  { name: 'Postgres', x: 1010 },
];

type Msg = { y: number; from: number; to: number; label: string; accent?: boolean; dashed?: boolean };

const MSGS: Msg[] = [
  { y: 116, from: 0, to: 1, label: 'Update' },
  { y: 156, from: 1, to: 2, label: 'list ARAM matches' },
  { y: 196, from: 1, to: 0, label: 'job id, right away', accent: true },
  { y: 270, from: 1, to: 2, label: 'match + timeline' },
  { y: 312, from: 1, to: 3, label: 'upsert · progress' },
  { y: 384, from: 0, to: 1, label: 'status? every 5 s' },
  { y: 420, from: 1, to: 0, label: '34 / 120 matches · ETA', dashed: true },
  { y: 470, from: 0, to: 1, label: 'score PIG' },
  { y: 510, from: 1, to: 3, label: 'scores for all ten players', accent: true },
];

function Wide() {
  return (
    <Svg className="dg-wide" w={1120} h={540} label={CLAIM}>
      {LANES.map((l) => (
        <g key={l.name}>
          <line className="dg-life" x1={l.x} y1={72} x2={l.x} y2={528} />
          <g className="dg-box">
            <rect x={l.x - 80} y={20} width={160} height={52} rx={8} />
            <text className="dg-title" x={l.x} y={52} textAnchor="middle">
              {l.name}
            </text>
          </g>
        </g>
      ))}
      <rect className="dg-group" x={370} y={226} width={700} height={108} rx={12} />
      <text className="dg-grouplabel" x={386} y={248}>
        in batches of 50
      </text>
      {MSGS.map((m) => {
        const a = LANES[m.from].x;
        const b = LANES[m.to].x;
        const dir = Math.sign(b - a);
        // Labels centre over the first lane gap, so a message that crosses
        // a lifeline doesn't have its label straddle it.
        const firstGap = Math.abs(b - a) > 320 ? a + dir * 310 : b;
        return (
          <Edge
            key={m.y}
            pts={[a + dir * 4, m.y, b - dir * 4, m.y]}
            label={m.label}
            lx={(a + firstGap) / 2}
            ly={m.y - 10}
            accent={m.accent}
            dashed={m.dashed}
          />
        );
      })}
    </Svg>
  );
}

const STEPS = [
  { who: 'Browser → server', title: 'Press Update', sub: 'starts a background job' },
  { who: 'Server → Riot', title: 'List ARAM matches', sub: 'the scraper yields this region' },
  { who: 'Server → browser', title: 'Job id, right away', sub: 'the page never waits', accent: true },
  { who: 'Server → Riot → Postgres', title: 'Batches of 50', sub: 'match + timeline, then upsert' },
  { who: 'Browser → server', title: 'Poll every 5\u202fs', sub: 'x / y matches · ETA' },
  { who: 'Server → Postgres', title: 'Score PIG', sub: 'all ten players, per match', accent: true },
];

function Tall() {
  const row = 88;
  return (
    <Svg className="dg-tall" w={360} h={STEPS.length * row + 16} label={CLAIM}>
      <line className="dg-life" x1={24} y1={30} x2={24} y2={(STEPS.length - 1) * row + 30} />
      {STEPS.map((s, i) => {
        const y = 14 + i * row;
        return (
          <g key={s.title}>
            <circle className={`dg-dot${s.accent ? ' is-accent' : ''}`} cx={24} cy={y + 16} r={7} />
            <text className="dg-grouplabel" x={46} y={y + 20}>
              {s.who}
            </text>
            <text className="dg-title" x={46} y={y + 46}>
              {s.title}
            </text>
            <text className="dg-sub" x={46} y={y + 66}>
              {s.sub}
            </text>
          </g>
        );
      })}
    </Svg>
  );
}

export default function ArampigUpdate() {
  return (
    <div className="dg">
      <Wide />
      <Tall />
    </div>
  );
}
