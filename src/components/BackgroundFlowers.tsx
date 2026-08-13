import { useCallback, useEffect, useRef, useState } from 'react';
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

type CutDir = 'from-left' | 'from-right';
type CutVars = Record<string, string>;

// The plant's lifecycle is a strict state machine: exactly one phase at a
// time, so no combination of clicks can ever stack two choreographies onto
// the same body (the old boolean flags allowed cutting + regrowing at once,
// which is where the "animations all over the place" came from).
//
//   idle ──head / shallow-stem cut──▶ beheading ──▶ topRegrowing ──▶ idle
//   idle ──deep-stem cut────────────▶ felling ────▶ (entry replaced)
//
// Cuts are accepted ONLY in idle — enforced twice, by pointer-events in CSS
// (keyed off the phase classes) and by the phase guard inside every state
// update. Every timer-driven transition also names the phase it expects to
// leave, so a stale timeout from a superseded cut can never fire into the
// wrong phase; it just no-ops.
//
// Each leaf runs its own two-state machine, independent of the plant's:
//   grown ──cut──▶ stub (unmounted; a clone falls) ──▶ grown (remount)
// A stub simply isn't rendered — on either the standing plant or any falling
// clone — so a beheaded plant that lost a leaf earlier drops a top without
// that leaf, and the regrow remount replays the growth animation via an
// epoch-bumped key.
type PlantPhase =
  | { name: 'idle' }
  | { name: 'felling'; dir: CutDir; vars: CutVars }
  | { name: 'beheading'; dir: CutDir; vars: CutVars }
  | { name: 'topRegrowing'; vars: CutVars };

type LeafPhase = 'grown' | 'stub';

type FlowerEntry = Flower & {
  id: string;
  phase: PlantPhase;
  leafPhases: LeafPhase[];
  leafEpochs: number[];
  // Every falling leaf gets its own clone, so snipping a second leaf never
  // evaporates the first one mid-drop (the old single slot did exactly that).
  fallingLeaves: { index: number; epoch: number; vars: CutVars }[];
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

const makeEntry = (f: Flower): FlowerEntry => ({
  ...f,
  id: newEntryId(),
  phase: { name: 'idle' },
  leafPhases: f.leaves.map(() => 'grown'),
  leafEpochs: f.leaves.map(() => 0),
  fallingLeaves: [],
});

// How long the full cut animation runs from click to regrow/replace. Aligned
// with keyframes in style.css: 0–160ms sweep; 220ms pause; 220–980ms fall.
const CUT_DURATION_MS = 980;
// The regrow-top wipe length after a kept cut (matches flower-regrow-top).
const REGROW_WIPE_MS = 900;
// A cut leaf falls for this long, then the bed waits before regrowing it.
const LEAF_FALL_MS = 760;
const LEAF_REGROW_MS = 2400;
// Stem cuts at or above this fraction of the stem (measured from the top)
// keep the plant; deeper cuts fell and regenerate the whole flower.
const KEEP_CUT_FRACTION = 0.3;
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

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function BackgroundFlowers({
  flowers,
  className = 'work-panel-flowers',
}: {
  flowers: Flower[];
  className?: string;
}) {
  const [entries, setEntries] = useState<FlowerEntry[]>([]);
  // All pending timeouts, keyed by entry id, so replacing or unmounting a
  // flower always retires its whole schedule in one sweep.
  const timersRef = useRef(new Map<string, Set<number>>());

  const schedule = useCallback((id: string, ms: number, fn: () => void) => {
    let set = timersRef.current.get(id);
    if (!set) {
      set = new Set();
      timersRef.current.set(id, set);
    }
    const t = window.setTimeout(() => {
      const live = timersRef.current.get(id);
      if (live) {
        live.delete(t);
        if (live.size === 0) timersRef.current.delete(id);
      }
      fn();
    }, ms);
    set.add(t);
  }, []);

  useEffect(() => {
    setEntries(flowers.map(makeEntry));
    const timers = timersRef.current;
    return () => {
      timers.forEach((set) => set.forEach((t) => window.clearTimeout(t)));
      timers.clear();
    };
  }, [flowers]);

  // Advance one entry's plant phase — but only if it is still in the phase
  // the caller expects. The guard is what makes stale timers harmless.
  const advance = useCallback(
    (id: string, expect: PlantPhase['name'], next: (e: FlowerEntry) => FlowerEntry) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id && e.phase.name === expect ? next(e) : e)),
      );
    },
    [],
  );

  const cutPlant = useCallback(
    (id: string, kind: 'head' | 'stem') =>
      (event: React.MouseEvent<HTMLElement>) => {
        if (reducedMotion()) return;
        const box = (event.currentTarget as HTMLElement).closest('.bg-flower') as
          | HTMLElement
          | null;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        if (rect.height === 0) return;

        // All geometry in flower-box coordinates. The box spans the stem; the
        // bloom sits above its top, so head clicks resolve to negative Y and
        // the cut line lands above the box — exactly where clicked.
        const clickXPx = event.clientX - rect.left;
        const clickYPx = event.clientY - rect.top;
        const keep = kind === 'head' || clickYPx / rect.height <= KEEP_CUT_FRACTION;

        // Random tilt within ±CUT_MAX_ANGLE_DEG. Slope works in screen space
        // (y grows downward), so positive slope = line goes down-right.
        const angleDeg = (Math.random() - 0.5) * 2 * CUT_MAX_ANGLE_DEG;
        const slope = Math.tan((angleDeg * Math.PI) / 180);
        const dir: CutDir = Math.random() < 0.5 ? 'from-left' : 'from-right';
        const vars: CutVars = {
          '--cut-left': `${(clickYPx - (CUT_HALF_WIDTH_PX + clickXPx) * slope).toFixed(2)}px`,
          '--cut-right': `${(clickYPx + (CUT_HALF_WIDTH_PX - clickXPx) * slope).toFixed(2)}px`,
          '--cut-fade-dx': `${((Math.random() - 0.5) * 8).toFixed(2)}px`,
          '--top-fall-dx': `${((Math.random() - 0.5) * 24).toFixed(2)}px`,
          '--top-fall-dy': `${(300 + Math.random() * 100).toFixed(2)}px`,
          '--top-fall-rotate': `${((Math.random() - 0.5) * 30).toFixed(2)}deg`,
        };

        advance(id, 'idle', (e) => ({
          ...e,
          phase: keep ? { name: 'beheading', dir, vars } : { name: 'felling', dir, vars },
        }));

        if (keep) {
          // Top falls, then wipes back in from the same cut line. Both hops
          // are phase-guarded, so if this cut never actually started (the
          // click raced another transition) they fall through silently.
          schedule(id, CUT_DURATION_MS, () =>
            advance(id, 'beheading', (e) => ({ ...e, phase: { name: 'topRegrowing', vars } })),
          );
          schedule(id, CUT_DURATION_MS + REGROW_WIPE_MS, () =>
            advance(id, 'topRegrowing', (e) => ({ ...e, phase: { name: 'idle' } })),
          );
        } else {
          // The whole plant falls; a freshly randomised flower takes the
          // slot. No timer sweep here — a sweep would also kill timers
          // belonging to a LIVE choreography if this cut was the one that
          // got refused. Pending timers for the old id are phase-guarded
          // no-ops after the swap, and each retires itself as it fires.
          schedule(id, CUT_DURATION_MS, () =>
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id && e.phase.name === 'felling'
                  ? makeEntry(generateFlower(e.slot ?? e.leftPct, REGROW_JITTER))
                  : e,
              ),
            ),
          );
        }
      },
    [advance, schedule],
  );

  const cutLeaf = useCallback(
    (id: string, index: number) => (event: React.MouseEvent<HTMLElement>) => {
      if (reducedMotion()) return;
      // A leaf click must never double as a stem cut.
      event.stopPropagation();
      const vars: CutVars = {
        '--top-fall-dx': `${((Math.random() - 0.5) * 30).toFixed(2)}px`,
        '--top-fall-dy': `${(240 + Math.random() * 80).toFixed(2)}px`,
        '--top-fall-rotate': `${((Math.random() - 0.5) * 60).toFixed(2)}deg`,
      };
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id || e.phase.name !== 'idle') return e;
          if (e.leafPhases[index] !== 'grown') return e;
          const leafPhases = [...e.leafPhases];
          leafPhases[index] = 'stub';
          return {
            ...e,
            leafPhases,
            fallingLeaves: [
              ...e.fallingLeaves,
              { index, epoch: e.leafEpochs[index], vars },
            ],
          };
        }),
      );
      schedule(id, LEAF_FALL_MS, () =>
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, fallingLeaves: e.fallingLeaves.filter((f) => f.index !== index) }
              : e,
          ),
        ),
      );
      schedule(id, LEAF_REGROW_MS, () =>
        setEntries((prev) =>
          prev.map((e) => {
            if (e.id !== id || e.leafPhases[index] !== 'stub') return e;
            const leafPhases = [...e.leafPhases];
            leafPhases[index] = 'grown';
            const leafEpochs = [...e.leafEpochs];
            leafEpochs[index] = e.leafEpochs[index] + 1;
            return { ...e, leafPhases, leafEpochs };
          }),
        ),
      );
    },
    [schedule],
  );

  return (
    <div className={className} aria-hidden="true">
      {entries.map((f) => {
        const phase = f.phase;

        // The hit surfaces ARE the visuals: the bloom wrapper, the stem, and
        // each leaf carry .bg-flower-hit themselves (with small ::after halos
        // in CSS for forgiveness). Because pointer hit-testing follows the
        // elements' own transforms, the clickable areas track the rendered
        // shapes exactly — a half-bloomed star is exactly half as clickable,
        // a rotated leaf hits along its rotated box. No hand-derived boxes
        // to drift out of sync. Clones never receive events (CSS disables
        // them), so the shared renderers below can stay identical.
        const renderLeaf = (
          leaf: Flower['leaves'][number],
          j: number,
          opts?: { forFall?: boolean; epoch?: number },
        ) => {
          const epoch = opts?.epoch ?? f.leafEpochs[j];
          const isLeft = leaf.side === 'left';
          const edgePath = isLeft
            ? 'M100 20 C 82 -4, 30 -4, 0 20 C 30 44, 82 44, 100 20 Z'
            : 'M0 20 C 18 -4, 70 -4, 100 20 C 70 44, 18 44, 0 20 Z';
          const veinPath = isLeft ? 'M96 20 L 4 20' : 'M4 20 L 96 20';
          return (
            <span
              key={`${j}:${epoch}`}
              className={`bg-flower-leaf bg-flower-leaf--${leaf.side} bg-flower-hit bg-flower-hit--leaf`}
              style={
                {
                  bottom: `${leaf.y}%`,
                  width: `${leaf.len}px`,
                  height: `${leaf.len * 0.42}px`,
                  // Regrown leaves sprout immediately; only the first growth
                  // staggers down the stem.
                  '--leaf-delay':
                    epoch > 0
                      ? '0s'
                      : `${0.64 * (1 - Math.pow(1 - leaf.y / 100, 1 / 3)) * f.grow}s`,
                } as CSSVars
              }
              onClick={opts?.forFall ? undefined : cutLeaf(f.id, j)}
              aria-hidden="true"
            >
              <svg
                className="bg-flower-leaf-svg"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="bg-flower-leaf-edge" d={edgePath} fill="none" />
                <path className="bg-flower-leaf-vein" d={veinPath} fill="none" />
              </svg>
            </span>
          );
        };

        // One renderer for the standing body and every clone; `clone` only
        // strips the click handlers. Stub leaves are omitted everywhere, so
        // falling tops carry exactly the leaves the plant actually has.
        const renderBody = (clone: boolean) => (
          <>
            <span
              className="bg-flower-stem bg-flower-hit bg-flower-hit--stem"
              onClick={clone ? undefined : cutPlant(f.id, 'stem')}
            />
            {f.leaves.map((leaf, j) =>
              f.leafPhases[j] === 'grown'
                ? renderLeaf(leaf, j, clone ? { forFall: true } : undefined)
                : null,
            )}
            <span
              className="bg-flower-star bg-flower-hit bg-flower-hit--head"
              onClick={clone ? undefined : cutPlant(f.id, 'head')}
            >
              <Star className="bg-flower-star-svg" aria-hidden="true" />
            </span>
          </>
        );

        const stateClasses = [
          phase.name === 'felling' || phase.name === 'beheading'
            ? ` is-cutting is-cutting--${phase.dir}`
            : '',
          phase.name === 'beheading' ? ' is-cutting--keep' : '',
          phase.name === 'topRegrowing' ? ' is-regrowing' : '',
        ].join('');
        const cutVars = phase.name === 'idle' ? undefined : phase.vars;

        return (
          <span
            key={f.id}
            className={`bg-flower${stateClasses}`}
            style={
              {
                left: `${f.leftPct}%`,
                height: `${f.stemVh}vh`,
                '--grow': `${f.grow}s`,
                '--star-size': `${f.starPx}px`,
                ...(cutVars ?? {}),
              } as CSSVars
            }
          >
            <span className="bg-flower-main">{renderBody(false)}</span>
            {(phase.name === 'felling' || phase.name === 'beheading') && (
              <span className="bg-flower-cut-top">{renderBody(true)}</span>
            )}
            {f.fallingLeaves.map((fall) => (
              <span
                key={`fall:${fall.index}:${fall.epoch}`}
                className="bg-flower-leaf-fall"
                style={fall.vars as CSSVars}
              >
                {renderLeaf(f.leaves[fall.index], fall.index, {
                  forFall: true,
                  epoch: fall.epoch,
                })}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
