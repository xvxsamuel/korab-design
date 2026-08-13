import Star from '../assets/star.svg?react';
import { layoutGearTrain } from '../lib/gears';

// Three marks meshed into a shallow diagonal chain descending to the right,
// sat on the bottom edge of the panel's text column. An open chain, not a
// closed loop: three gears meshed in a ring would over-constrain the phases
// and seize.
const CLUSTER = layoutGearTrain(104, [
  { bearing: 32 },
  { bearing: 32 },
]);

export default function Cogs() {
  return (
    <div
      className="cogs"
      aria-hidden="true"
      style={{ width: CLUSTER.width, height: CLUSTER.height }}
    >
      {CLUSTER.gears.map((g, i) => (
        <span
          key={i}
          className="cog"
          style={{
            left: g.left,
            top: g.top,
            width: g.size,
            height: g.size,
            transform: `rotate(${g.phase}deg)`,
          }}
        >
          <Star className={g.dir === 1 ? 'gear-cw' : 'gear-ccw'} />
        </span>
      ))}
    </div>
  );
}
