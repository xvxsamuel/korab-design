import Star from '../assets/star.svg?react';
import { layoutGearTrain } from '../lib/gears';

// A gently tilted, open cluster: the staggered outer cogs balance the
// centre cog while staying apart so the train can turn continuously.
const CLUSTER = layoutGearTrain(72, [
  { bearing: 165, from: 0 },
  { bearing: 45, from: 0 },
]);

export default function Cogs() {
  return (
    <div
      className="cogs"
      aria-hidden="true"
      style={{ aspectRatio: `${CLUSTER.width} / ${CLUSTER.height}` }}
    >
      {CLUSTER.gears.map((g, i) => (
        <span
          key={i}
          className="cog"
          style={{
            left: `${g.left / CLUSTER.width * 100}%`,
            top: `${g.top / CLUSTER.height * 100}%`,
            width: `${g.size / CLUSTER.width * 100}%`,
            height: `${g.size / CLUSTER.height * 100}%`,
            transform: `rotate(${g.phase}deg)`,
          }}
        >
          <Star className={g.dir === 1 ? 'gear-cw' : 'gear-ccw'} />
        </span>
      ))}
    </div>
  );
}
