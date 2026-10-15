// How a PIG score is made, at the level the site itself explains it: what
// goes in, what it's measured against, and what comes out. The weights and
// cut-offs stay private by design.
const STAGES = [
  {
    title: 'What you did',
    items: ['Damage to champions', 'Wave damage', 'Healing & shielding', 'Crowd control', 'Deaths', 'Kill participation', 'Death quality'],
  },
  {
    title: 'Against whom',
    items: ["This champion's typical game", 'same patch', 'same game length'],
  },
  {
    title: 'Weighted by role',
    items: ['Enchanters by healing', 'Tanks by crowd control', 'Wave-clearers by wave damage'],
  },
  {
    title: 'And what you built',
    items: ['Core items', 'Runes', 'Skill order', 'Spells', 'Starter', 'vs. the enemy team'],
  },
];

const LABELS = ['Perfect', 'Excellent', 'Good', 'Average', 'Bad', 'Awful'];

export default function ArampigScore() {
  return (
    <div
      className="dg dg-score"
      role="img"
      aria-label="A PIG score compares a player's damage, healing, crowd control, deaths and kill participation with that champion's typical game on the same patch and game length, weights them by the champion's role, blends in build quality, and outputs a score from 0 to 100 with a label from Perfect to Awful."
    >
      <ol className="dg-score-flow">
        {STAGES.map((s) => (
          <li key={s.title} className="dg-score-stage">
            <span className="dg-score-title">{s.title}</span>
            <ul>
              {s.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </li>
        ))}
        <li className="dg-score-stage is-result">
          <span className="dg-score-title">PIG</span>
          <span className="dg-score-range">0–100</span>
          <ul className="dg-score-labels">
            {LABELS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </li>
      </ol>
    </div>
  );
}
