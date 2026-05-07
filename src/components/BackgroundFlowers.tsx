import Star from '../assets/star.svg?react';

export type Flower = {
  leftPct: number;
  stemVh: number;
  starPx: number;
  grow: number;
  leaves: { y: number; side: 'right' | 'left'; len: number }[];
};

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

export function generateFlowers(slotPositions: number[], jitter = 2): Flower[] {
  const slots = [...slotPositions];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const minStem = 6;
  const maxStem = 22;
  const flip = (s: 'right' | 'left'): 'right' | 'left' => (s === 'right' ? 'left' : 'right');
  return slots.map((slot) => {
    const stemVh = minStem + Math.random() * (maxStem - minStem);
    const norm = (stemVh - minStem) / (maxStem - minStem);
    const sizeJitter = (Math.random() - 0.5) * 26;
    const starPx = Math.max(34, 54 + norm * 12 + sizeJitter);
    // Tall flowers take longer to grow than short ones, with a small jitter
    // on top so equal-height stems don't animate in lockstep.
    const grow = 1.0 + norm * 1.4 + (Math.random() - 0.5) * 0.4;
    // Leaf count scales with stem height: short stems get 1, tall stems up to 3.
    const leafCount = Math.max(1, Math.round(1 + norm * 2));
    // Leaves scale with the flower (starPx) so they look proportional —
    // small flowers get small leaves, large flowers get larger ones.
    const leafScale = (0.95 + norm * 0.35) * (0.9 + Math.random() * 0.25);
    const startSide: 'right' | 'left' = Math.random() > 0.5 ? 'right' : 'left';
    // Distribute leaves evenly along the stem with margins at top/bottom so
    // there isn't a big empty gap when there are only one or two leaves.
    const leafTop = 18;
    const leafBottom = 82;
    const leafRange = leafBottom - leafTop;
    const leaves = Array.from({ length: leafCount }, (_, k) => ({
      y: leafTop + ((k + 0.5) / leafCount) * leafRange + (Math.random() - 0.5) * 6,
      side: k % 2 === 0 ? startSide : flip(startSide),
      len: (18 + Math.random() * 12) * leafScale,
    }));
    return {
      leftPct: slot + (Math.random() * jitter * 2 - jitter),
      stemVh,
      starPx,
      grow,
      leaves,
    };
  });
}

export default function BackgroundFlowers({ flowers, className = 'work-panel-flowers' }: { flowers: Flower[]; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {flowers.map((f, i) => (
        <span
          key={i}
          className="bg-flower"
          style={{
            left: `${f.leftPct}%`,
            height: `${f.stemVh}vh`,
            '--grow': `${f.grow}s`,
            '--star-size': `${f.starPx}px`,
          } as CSSVars}
        >
          <span className="bg-flower-stem" />
          {f.leaves.map((leaf, j) => {
            const isLeft = leaf.side === 'left';
            const edgePath = isLeft
              ? 'M100 20 C 82 -4, 30 -4, 0 20 C 30 44, 82 44, 100 20 Z'
              : 'M0 20 C 18 -4, 70 -4, 100 20 C 70 44, 18 44, 0 20 Z';
            const veinPath = isLeft ? 'M96 20 L 4 20' : 'M4 20 L 96 20';
            return (
              <svg
                key={j}
                className={`bg-flower-leaf bg-flower-leaf--${leaf.side}`}
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                style={{
                  bottom: `${leaf.y}%`,
                  width: `${leaf.len}px`,
                  height: `${leaf.len * 0.42}px`,
                  '--leaf-delay': `${0.64 * (1 - Math.pow(1 - leaf.y / 100, 1 / 3)) * f.grow}s`,
                } as CSSVars}
                aria-hidden="true"
              >
                <path className="bg-flower-leaf-edge" d={edgePath} fill="none" />
                <path className="bg-flower-leaf-vein" d={veinPath} fill="none" />
              </svg>
            );
          })}
          <Star className="bg-flower-star" />
        </span>
      ))}
    </div>
  );
}
