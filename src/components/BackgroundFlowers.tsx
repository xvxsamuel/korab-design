import { useCallback, useEffect, useState } from 'react';
import Star from '../assets/star.svg?react';

export type Flower = {
  // Original slot center, kept so a flower regrown after the cut easter egg
  // jitters around its assigned slot rather than drifting from previous leftPct.
  slot: number;
  leftPct: number;
  stemVh: number;
  starPx: number;
  grow: number;
  leaves: { y: number; side: 'right' | 'left'; len: number }[];
};

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

type FlowerEntry = Flower & {
  id: string;
  cutting?: boolean;
  // Side the cut "blade" enters from; chosen at random per click.
  cutDirection?: 'from-left' | 'from-right';
  cutVars?: Record<string, string>;
};

const flip = (s: 'right' | 'left'): 'right' | 'left' => (s === 'right' ? 'left' : 'right');

function generateFlower(slot: number, jitter: number): Flower {
  const minStem = 6;
  const maxStem = 22;
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
    slot,
    leftPct: slot + (Math.random() * jitter * 2 - jitter),
    stemVh,
    starPx,
    grow,
    leaves,
  };
}

export function generateFlowers(slotPositions: number[], jitter = 2): Flower[] {
  const slots = [...slotPositions];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots.map((slot) => generateFlower(slot, jitter));
}

let nextEntryId = 0;
const newEntryId = () => `f${++nextEntryId}`;

// How long the full cut animation runs from click to regrow. Aligned with
// keyframes in style.css: 0–160ms sweep on the main body / synced reveal on
// the cut-top duplicate; 220ms pause; 220–980ms fall (760ms ease-in, no
// opacity change — the piece is cropped by the .footer-flowers clip-path as
// it crosses the footer's bottom edge); 660–960ms stem fade. React unmounts
// the cut-top alongside the surviving stem when this timer fires.
const CUT_DURATION_MS = 980;
// Half the X range of the cut polygon in style.css (polygon spans -200px..200px
// horizontally). The cut line is a straight line across that range; the JS
// here sets its endpoints so it passes through the click point at a chosen
// slope.
const CUT_HALF_WIDTH_PX = 200;
// Maximum random rotation of the cut line, in degrees. ±this gives the
// "slightly left or right" tilt — enough to read as angled without looking
// extreme on short stems.
const CUT_MAX_ANGLE_DEG = 10;
// Jitter applied when a flower regrows in its slot — small enough that it
// feels like the same flower bed but visibly shifted from where it was.
const REGROW_JITTER = 2;

export default function BackgroundFlowers({
  flowers,
  className = 'work-panel-flowers',
}: {
  flowers: Flower[];
  className?: string;
}) {
  const [entries, setEntries] = useState<FlowerEntry[]>([]);

  useEffect(() => {
    setEntries(flowers.map((f) => ({ ...f, id: newEntryId() })));
  }, [flowers]);

  const handleCut = useCallback(
    (id: string) => (event: React.MouseEvent<HTMLSpanElement>) => {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      // Anchor the cut to the click point on the flower span. Span height is
      // the stem length; the hit area extends above the span to cover the
      // bloom, so a click on the star resolves to a negative Y in span-local
      // coordinates and the cut line lands above the span top — exactly where
      // the user clicked.
      const flower = (event.currentTarget as HTMLElement).parentElement as HTMLElement | null;
      if (!flower) return;
      const rect = flower.getBoundingClientRect();
      if (rect.height === 0) return;
      const clickXPx = event.clientX - rect.left;
      const clickYPx = event.clientY - rect.top;

      // Random tilt within ±CUT_MAX_ANGLE_DEG. Slope works in screen space
      // (y grows downward), so positive slope = line goes down-right.
      const angleDeg = (Math.random() - 0.5) * 2 * CUT_MAX_ANGLE_DEG;
      const slope = Math.tan((angleDeg * Math.PI) / 180);
      // Point-slope: the cut line passes through (clickXPx, clickYPx).
      // Resolve its Y at the polygon's left and right edges so the cut
      // intersects the click point exactly, regardless of where on the
      // flower the user clicked.
      const cutLeftPx = clickYPx - (CUT_HALF_WIDTH_PX + clickXPx) * slope;
      const cutRightPx = clickYPx + (CUT_HALF_WIDTH_PX - clickXPx) * slope;

      // Knife enters from a random side and sweeps across to the other.
      const direction: 'from-left' | 'from-right' =
        Math.random() < 0.5 ? 'from-left' : 'from-right';

      // Surviving lower stem drifts a few px down with a small random lateral
      // nudge as it fades.
      const fadeDx = (Math.random() - 0.5) * 8;
      // Cut-away top falls: small lateral drift + a long drop that takes the
      // piece past the footer's bottom edge (where .footer-flowers' clip-path
      // crops it out) + a slight rotation. Randomized so successive cuts
      // don't look identical.
      const topFallDx = (Math.random() - 0.5) * 24;
      const topFallDy = 300 + Math.random() * 100;
      const topFallRotate = (Math.random() - 0.5) * 30;

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id && !entry.cutting
            ? {
                ...entry,
                cutting: true,
                cutDirection: direction,
                cutVars: {
                  '--cut-left': `${cutLeftPx.toFixed(2)}px`,
                  '--cut-right': `${cutRightPx.toFixed(2)}px`,
                  '--cut-fade-dx': `${fadeDx.toFixed(2)}px`,
                  '--top-fall-dx': `${topFallDx.toFixed(2)}px`,
                  '--top-fall-dy': `${topFallDy.toFixed(2)}px`,
                  '--top-fall-rotate': `${topFallRotate.toFixed(2)}deg`,
                },
              }
            : entry,
        ),
      );

      window.setTimeout(() => {
        setEntries((prev) =>
          prev.map((entry) => {
            if (entry.id !== id) return entry;
            const baseSlot = entry.slot ?? entry.leftPct;
            return { ...generateFlower(baseSlot, REGROW_JITTER), id: newEntryId() };
          }),
        );
      }, CUT_DURATION_MS);
    },
    [],
  );

  return (
    <div className={className} aria-hidden="true">
      {entries.map((f) => {
        // The visual flower (stem + leaves + star) is rendered into a wrapper
        // we can clip / animate independently. When the cut runs, the same
        // body is duplicated inside .bg-flower-cut-top so the cut-away upper
        // half can fall while the lower half stays put — see style.css. The
        // helper returns a fresh subtree on each call so the two copies are
        // independent React elements.
        const renderBody = () => (
          <>
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
          </>
        );

        return (
          <span
            key={f.id}
            className={`bg-flower${f.cutting ? ` is-cutting is-cutting--${f.cutDirection}` : ''}`}
            style={{
              left: `${f.leftPct}%`,
              height: `${f.stemVh}vh`,
              '--grow': `${f.grow}s`,
              '--star-size': `${f.starPx}px`,
              ...(f.cutVars ?? {}),
            } as CSSVars}
          >
            <span
              className="bg-flower-hit"
              onClick={f.cutting ? undefined : handleCut(f.id)}
              aria-hidden="true"
            />
            <span className="bg-flower-main">{renderBody()}</span>
            {f.cutting && <span className="bg-flower-cut-top">{renderBody()}</span>}
          </span>
        );
      })}
    </div>
  );
}
