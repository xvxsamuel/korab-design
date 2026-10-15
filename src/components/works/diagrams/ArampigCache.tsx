// Five layers a request can be answered from, nearest first. A request falls
// through until one has it; fresh stats flow the other way, from the
// scraper's flush up through revalidation.
const LAYERS = [
  { name: 'Browser', what: 'TanStack Query', ttl: '60\u00a0s', note: 'profiles, picked patches and filters' },
  { name: 'Cloudflare', what: 'edge cache', ttl: '5\u00a0min', note: 'champion pages; API 30\u00a0s – 2\u00a0h' },
  { name: 'Next.js', what: 'ISR pages', ttl: '5–60\u00a0min', note: 'tier list 5\u00a0min, each champion 1\u00a0h' },
  { name: 'Process', what: 'in-memory cache', ttl: '60\u00a0min', note: 'stale served while one refresh runs' },
  { name: 'Postgres', what: 'stats tables', ttl: 'live', note: 'plus a cache table for item stats' },
];

export default function ArampigCache() {
  return (
    <div
      className="dg dg-ladder"
      role="img"
      aria-label="Five cache layers between a visitor and the database: browser, Cloudflare, Next.js ISR, an in-process cache and Postgres; requests fall through until a layer has the answer, and the scraper's flushes revalidate them from the bottom up."
    >
      <p className="dg-ladder-rail is-down" aria-hidden="true">
        <span>request falls through</span>
      </p>
      <ol className="dg-ladder-list">
        {LAYERS.map((l) => (
          <li key={l.name}>
            <span className="dg-ladder-name">{l.name}</span>
            <span className="dg-ladder-what">{l.what}</span>
            <span className="dg-ladder-ttl">{l.ttl}</span>
            <span className="dg-ladder-note">{l.note}</span>
          </li>
        ))}
      </ol>
      <p className="dg-ladder-rail is-up" aria-hidden="true">
        <span>scraper flush revalidates</span>
      </p>
    </div>
  );
}
