import { useCallback, useEffect, useRef, useState } from 'react';
import Star from '../assets/star.svg?react';

type Leaf = {
  y: number;
  side: 'right' | 'left';
  len: number;
  // First-growth stagger in seconds, fixed at creation. Kept on the leaf so
  // re-expressing its y in a resized box never shifts a running animation.
  delay: number;
};

export type Flower = {
  // Original slot center, kept so a flower regrown after the cut easter egg
  // jitters around its assigned slot rather than drifting from previous leftPct.
  slot: number;
  leftPct: number;
  stemVh: number;
  bloomAngle: number;
  grow: number;
  leaves: Leaf[];
};

type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

type CutDir = 'from-left' | 'from-right';
type CutVars = Record<string, string>;
// A cut line in flower-box px: its y at the clip's left (-CUT_HALF_WIDTH_PX)
// and right (+CUT_HALF_WIDTH_PX) edges.
type CutLine = { left: number; right: number };

// What a cut severs, frozen at the moment of the cut: the falling piece
// renders from this snapshot, so the standing plant can regrow, settle or be
// cut again while the piece is still in the air.
type Piece = {
  key: number;
  dir: CutDir;
  line: CutLine;
  // Earlier cuts the plant already carried — the piece is only what was
  // still standing between them and this cut.
  trims: CutLine[];
  stemVh: number;
  starPx: number;
  bloomScale: number;
  leaves: Leaf[];
  fall: CutVars;
};

// Every cut is accepted wherever it lands, at any moment, except on a plant
// already felled (its stump is sinking away) or on a falling piece:
//
//   · Through the bloom — the line meets the stem above the box top — only
//     part of the head goes. The cut is kept for good (trims stack) and
//     nothing regrows: the plant stays exactly as cut.
//   · Through the stem within its top KEEP_CUT_FRACTION — the whole head is
//     off. After the top falls, the plant regrows from the stump.
//   · Deeper — the plant is felled; a fresh flower replaces it.
//
// A cut during growth (the intro or a regrow) first SETTLES the plant where
// it stands: the box shrinks to the height actually grown, the bloom keeps
// its current size, and leaves not yet reached are dropped. The cut then
// lands on that static plant — the growth is interrupted, not finished.
//
// Leaves are never sliced by a cut line: each goes whole with the piece or
// stays whole on the stump, by which side of the line its base is on.
// A cut leaf runs its own cycle: grown ──cut──▶ stub (unmounted; a clone
// falls) ──▶ grown (remount, epoch-bumped key replays the growth).
type LeafPhase = 'grown' | 'stub';

type FlowerEntry = Flower & {
  id: string;
  // Bumped per cut. Each cut's timers carry the value they were scheduled
  // under and no-op if a later cut has superseded it.
  cutSeq: number;
  felling: boolean;
  // True once a cut interrupted growth: stem and bloom are static at the
  // grown height and bloomScale.
  settled: boolean;
  bloomScale: number;
  // Pinned star size; unset, it follows the stem height.
  starPx?: number;
  // Folded cuts, clipped together as one polygon (see belowLines), plus the
  // latest cut, still animating its sweep.
  trims: CutLine[];
  sweep?: CutLine & { dir: CutDir; n: number };
  pieces: Piece[];
  leafPhases: LeafPhase[];
  leafEpochs: number[];
  // Every falling leaf gets its own clone, so snipping a second leaf never
  // evaporates the first one mid-drop.
  fallingLeaves: { key: number; leaf: Leaf; epoch: number; vars: CutVars }[];
  // Bumped when the plant regrows: the stem and bloom remount so their
  // growth animations replay — from the stump, driven by --regrow-from.
  bloomEpoch: number;
  regrowFrom?: number;
};

const flip = (s: 'right' | 'left'): 'right' | 'left' => (s === 'right' ? 'left' : 'right');
const MIN_STEM_VH = 6;
const MAX_STEM_VH = 22;

const stemProportion = (stemVh: number) =>
  Math.max(0, Math.min(1, (stemVh - MIN_STEM_VH) / (MAX_STEM_VH - MIN_STEM_VH)));
const starSizeFor = (stemVh: number) => 42 + stemProportion(stemVh) * 36;

function generateFlower(slot: number, jitter: number): Flower {
  const stemVh = MIN_STEM_VH + Math.random() * (MAX_STEM_VH - MIN_STEM_VH);
  const norm = stemProportion(stemVh);
  // Tall flowers take longer to grow than short ones, with a small jitter
  // on top so equal-height stems don't animate in lockstep.
  const grow = 1.0 + norm * 1.4 + (Math.random() - 0.5) * 0.4;
  // Leaf count scales with stem height: short stems get 1, tall stems up to 3.
  const leafCount = Math.max(1, Math.round(1 + norm * 2));
  // Leaves scale with stem height like the bloom so they look proportional —
  // small flowers get small leaves, large flowers get larger ones.
  const leafScale = (0.95 + norm * 0.35) * (0.9 + Math.random() * 0.25);
  const startSide: 'right' | 'left' = Math.random() > 0.5 ? 'right' : 'left';
  // Distribute leaves evenly along the stem with margins at top/bottom so
  // there isn't a big empty gap when there are only one or two leaves.
  const leafTop = 18;
  const leafBottom = 82;
  const leafRange = leafBottom - leafTop;
  const leaves = Array.from({ length: leafCount }, (_, k) => {
    const y = leafTop + ((k + 0.5) / leafCount) * leafRange + (Math.random() - 0.5) * 6;
    return {
      y,
      side: k % 2 === 0 ? startSide : flip(startSide),
      len: (18 + Math.random() * 12) * leafScale,
      // Sprouts as the growing stem reaches it (the stem's ease-out curve).
      delay: 0.64 * (1 - Math.pow(1 - y / 100, 1 / 3)) * grow,
    };
  });
  return {
    slot,
    leftPct: slot + (Math.random() * jitter * 2 - jitter),
    stemVh,
    bloomAngle: (Math.random() - 0.5) * 36,
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
let nextKey = 0;

const makeEntry = (f: Flower): FlowerEntry => ({
  ...f,
  id: newEntryId(),
  cutSeq: 0,
  felling: false,
  settled: false,
  bloomScale: 1,
  trims: [],
  pieces: [],
  leafPhases: f.leaves.map(() => 'grown'),
  leafEpochs: f.leaves.map(() => 0),
  fallingLeaves: [],
  bloomEpoch: 0,
});

// How long a cut runs from click to regrow/replace. Aligned with keyframes
// in style.css: 0–160ms sweep; 220ms pause; 220–980ms fall.
const CUT_DURATION_MS = 980;
// How long the regrowth from the stump takes (matches --regrow duration in
// style.css). A regrown top never has much stem to cover, so it's brisker
// than the intro's full growth.
const REGROW_MS = 1400;
// A cut leaf falls for this long, then the bed waits before regrowing it.
const LEAF_FALL_MS = 760;
const LEAF_REGROW_MS = 2400;
// Stem cuts at or above this fraction of the stem (measured from the top)
// keep the plant; deeper cuts fell and regenerate the whole flower.
const KEEP_CUT_FRACTION = 0.3;
// Half the X range of the cut polygons in style.css (they span -200px..200px
// horizontally). A cut line is straight across that range; its endpoints
// are set so it passes through the click point at a chosen slope.
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

const lineAt = (l: CutLine, x: number) =>
  l.left + ((x + CUT_HALF_WIDTH_PX) / (2 * CUT_HALF_WIDTH_PX)) * (l.right - l.left);

// The region below every line, as one clip-path polygon. Its upper edge is
// the lines' upper envelope (the pointwise max of y — lower on screen), a
// convex chain whose corners are the lines' pairwise crossings. One static
// wrapper therefore carries any number of cuts, and the stem and bloom
// inside it never remount when another cut is added.
function belowLines(lines: CutLine[]): string | undefined {
  if (lines.length === 0) return undefined;
  const X = CUT_HALF_WIDTH_PX;
  const xs = [-X, X];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const si = (lines[i].right - lines[i].left) / (2 * X);
      const sj = (lines[j].right - lines[j].left) / (2 * X);
      if (si === sj) continue;
      const x = -X + (lines[j].left - lines[i].left) / (si - sj);
      if (x > -X && x < X) xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  const edge = xs.map((x) => {
    const y = Math.max(...lines.map((l) => lineAt(l, x)));
    return `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  });
  return `polygon(${edge.join(', ')}, ${X}px 9999px, ${-X}px 9999px)`;
}

const cutLineVars = (l: CutLine): CutVars => ({
  '--cut-left': `${l.left.toFixed(2)}px`,
  '--cut-right': `${l.right.toFixed(2)}px`,
});

// A leaf's base, measured down from the box top: it hangs from `bottom: y%`
// and turns about its vertical middle.
const leafBaseFromTop = (leaf: Leaf, boxPx: number) =>
  boxPx - ((leaf.y / 100) * boxPx + leaf.len * 0.21);

export default function BackgroundFlowers({
  flowers,
  className = 'work-panel-flowers',
}: {
  flowers: Flower[];
  className?: string;
}) {
  const [entries, setEntries] = useState<FlowerEntry[]>([]);
  // Mirrors the latest render so a click can read the plant it lands on.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
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

  // Apply `next` to one entry, only while `seq` is still its latest cut.
  const update = useCallback(
    (id: string, seq: number, next: (e: FlowerEntry) => FlowerEntry) => {
      setEntries((prev) => prev.map((e) => (e.id === id && e.cutSeq === seq ? next(e) : e)));
    },
    [],
  );

  const cutPlant = useCallback(
    (id: string) =>
      (event: React.MouseEvent<HTMLElement>) => {
        if (reducedMotion()) return;
        const entry = entriesRef.current.find((e) => e.id === id);
        if (!entry || entry.felling) return;
        const box = (event.currentTarget as HTMLElement).closest('.bg-flower') as
          | HTMLElement
          | null;
        const stemEl = box?.querySelector<HTMLElement>('.bg-flower-main .bg-flower-stem');
        const bloomEl = box?.querySelector<HTMLElement>('.bg-flower-main .bg-flower-star');
        if (!box || !stemEl || !bloomEl) return;
        const rect = box.getBoundingClientRect();
        if (rect.height === 0) return;
        const vhPx = window.innerHeight / 100;

        // Interrupt growth: the plant becomes what has grown so far. The
        // bloom rides the stem tip, so its current top is where the grown
        // stem ends; the box shrinks to that, keeping its base in place.
        const growing =
          !entry.settled &&
          [stemEl, bloomEl].some((el) =>
            el.getAnimations().some((a) => a.playState === 'running'),
          );
        let boxPx = rect.height;
        let settle: Partial<FlowerEntry> = {};
        if (growing) {
          const style = getComputedStyle(bloomEl);
          const bloomTop = parseFloat(style.top) || 0;
          const m = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
          boxPx = Math.max(1, rect.height - bloomTop);
          const kept: number[] = [];
          entry.leaves.forEach((leaf, j) => {
            if ((leaf.y / 100) * rect.height <= boxPx) kept.push(j);
          });
          settle = {
            settled: true,
            bloomScale: Math.hypot(m.a, m.b) || 1,
            starPx: entry.starPx ?? starSizeFor(entry.stemVh),
            stemVh: boxPx / vhPx,
            leaves: kept.map((j) => {
              const leaf = entry.leaves[j];
              return { ...leaf, y: ((leaf.y / 100) * rect.height / boxPx) * 100 };
            }),
            leafPhases: kept.map((j) => entry.leafPhases[j]),
            leafEpochs: kept.map((j) => entry.leafEpochs[j]),
          };
        }
        const plant = { ...entry, ...settle };

        // All geometry in flower-box coordinates (of the settled box). The
        // box spans the stem; the bloom sits above its top, so head clicks
        // resolve to negative Y and the cut line lands exactly where clicked.
        const clickXPx = event.clientX - rect.left;
        const clickYPx = event.clientY - (rect.bottom - boxPx);
        // Random tilt within ±CUT_MAX_ANGLE_DEG. Slope works in screen space
        // (y grows downward), so positive slope = line goes down-right.
        const angleDeg = (Math.random() - 0.5) * 2 * CUT_MAX_ANGLE_DEG;
        const slope = Math.tan((angleDeg * Math.PI) / 180);
        const line: CutLine = {
          left: clickYPx - (CUT_HALF_WIDTH_PX + clickXPx) * slope,
          right: clickYPx + (CUT_HALF_WIDTH_PX - clickXPx) * slope,
        };
        // Where the line crosses the stem.
        const stemCutY = lineAt(line, 0);
        const headOnly = stemCutY < 0;
        const fell = !headOnly && stemCutY / boxPx > KEEP_CUT_FRACTION;
        const dir: CutDir = Math.random() < 0.5 ? 'from-left' : 'from-right';
        // The fall: a straight drop with a gentle tilt and a drift to one
        // side — drift and tilt agree on the side so the piece reads as
        // leaning the way it travels. Randomised per cut.
        const side = Math.random() < 0.5 ? -1 : 1;
        const fall: CutVars = {
          '--top-fall-dx': `${(side * (14 + Math.random() * 22)).toFixed(2)}px`,
          '--top-fall-dy': `${(300 + Math.random() * 100).toFixed(2)}px`,
          '--top-fall-rotate': `${(side * (10 + Math.random() * 16)).toFixed(2)}deg`,
        };

        // Leaves go whole to whichever side of the line their base is on.
        const staying: number[] = [];
        const severed: Leaf[] = [];
        plant.leaves.forEach((leaf, j) => {
          if (!headOnly && leafBaseFromTop(leaf, boxPx) < stemCutY) {
            if (plant.leafPhases[j] === 'grown') severed.push(leaf);
          } else {
            staying.push(j);
          }
        });

        // The previous cut's sweep has long finished (or finishes now); it
        // joins the static trims before this one starts.
        const trims = plant.sweep
          ? [...plant.trims, { left: plant.sweep.left, right: plant.sweep.right }]
          : plant.trims;
        const seq = entry.cutSeq + 1;
        const piece: Piece = {
          key: ++nextKey,
          dir,
          line,
          trims,
          stemVh: plant.stemVh,
          starPx: plant.starPx ?? starSizeFor(plant.stemVh),
          bloomScale: plant.bloomScale,
          leaves: severed,
          fall,
        };

        update(id, entry.cutSeq, (e) => ({
          ...e,
          ...settle,
          cutSeq: seq,
          felling: fell,
          trims,
          sweep: { ...line, dir, n: seq },
          pieces: [...e.pieces, piece],
          leaves: staying.map((j) => plant.leaves[j]),
          leafPhases: staying.map((j) => plant.leafPhases[j]),
          leafEpochs: staying.map((j) => plant.leafEpochs[j]),
        }));

        // The piece has left the frame by the end of its fall.
        schedule(id, CUT_DURATION_MS, () =>
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, pieces: e.pieces.filter((p) => p.key !== piece.key) } : e,
            ),
          ),
        );

        if (fell) {
          // A freshly randomised flower takes the slot once the top is down.
          schedule(id, CUT_DURATION_MS, () =>
            update(id, seq, (e) => makeEntry(generateFlower(e.slot ?? e.leftPct, REGROW_JITTER))),
          );
        } else if (!headOnly) {
          // The whole head is off: once the top has fallen, the plant grows
          // back FROM THE STUMP. It picks a height within the removed
          // stretch, keeps every leaf below the cut at its absolute height,
          // and replays the growth mechanics — stem scale and bloom ride —
          // starting at the stump instead of the ground. A later cut on the
          // stump supersedes this (the seq guard).
          const stumpPx = boxPx - stemCutY;
          schedule(id, CUT_DURATION_MS, () =>
            update(id, seq, (e) => {
              const oldVh = e.stemVh;
              const stumpVh = Math.min(oldVh, stumpPx / vhPx);
              // Replace only what was trimmed; repeated trims cannot
              // ratchet the height up to the cap.
              const newVh = stumpVh + (oldVh - stumpVh) * (0.8 + Math.random() * 0.2);
              const from = newVh > 0 ? stumpVh / newVh : 0;
              const leaves = e.leaves.map((leaf) => ({
                ...leaf,
                y: (((leaf.y / 100) * oldVh) / newVh) * 100,
              }));
              const leafPhases = [...e.leafPhases];
              const leafEpochs = [...e.leafEpochs];
              // A fresh leaf may sprout on the regrown stretch when there is
              // room for one — it grows in with the stem.
              if (newVh - stumpVh > 5 && Math.random() < 0.7) {
                const leafSide: 'right' | 'left' =
                  leaves.length > 0
                    ? flip(leaves[leaves.length - 1].side)
                    : Math.random() > 0.5 ? 'right' : 'left';
                const yVh = stumpVh + (newVh - stumpVh) * (0.35 + Math.random() * 0.3);
                leaves.push({ y: (yVh / newVh) * 100, side: leafSide, len: 18 + Math.random() * 12, delay: 0 });
                leafPhases.push('grown');
                leafEpochs.push(1);
              }
              return {
                ...e,
                stemVh: newVh,
                leaves,
                leafPhases,
                leafEpochs,
                settled: false,
                bloomScale: 1,
                starPx: undefined,
                trims: [],
                sweep: undefined,
                regrowFrom: from,
                bloomEpoch: e.bloomEpoch + 1,
              };
            }),
          );
        }
        // A head-only cut keeps its trim for good — nothing is scheduled.
      },
    [schedule, update],
  );

  const cutLeaf = useCallback(
    (id: string, index: number) => (event: React.MouseEvent<HTMLElement>) => {
      if (reducedMotion()) return;
      // A leaf click must never double as a stem cut.
      event.stopPropagation();
      // Drift and tilt share a random side, like the top's fall.
      const leafSide = Math.random() < 0.5 ? -1 : 1;
      const vars: CutVars = {
        '--top-fall-dx': `${(leafSide * (12 + Math.random() * 20)).toFixed(2)}px`,
        '--top-fall-dy': `${(240 + Math.random() * 80).toFixed(2)}px`,
        '--top-fall-rotate': `${(leafSide * (18 + Math.random() * 30)).toFixed(2)}deg`,
      };
      const key = ++nextKey;
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id || e.felling) return e;
          if (e.leafPhases[index] !== 'grown') return e;
          const leafPhases = [...e.leafPhases];
          leafPhases[index] = 'stub';
          return {
            ...e,
            leafPhases,
            fallingLeaves: [
              ...e.fallingLeaves,
              { key, leaf: e.leaves[index], epoch: e.leafEpochs[index], vars },
            ],
          };
        }),
      );
      schedule(id, LEAF_FALL_MS, () =>
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, fallingLeaves: e.fallingLeaves.filter((f) => f.key !== key) }
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

  // The leaf shape, shared by the standing plant, falling pieces and falling
  // leaf clones. `onCut` is omitted on clones, which never take clicks.
  const renderLeaf = (
    leaf: Leaf,
    key: string,
    epoch: number,
    onCut?: (event: React.MouseEvent<HTMLElement>) => void,
  ) => {
    const isLeft = leaf.side === 'left';
    const edgePath = isLeft
      ? 'M100 20 C 82 -4, 30 -4, 0 20 C 30 44, 82 44, 100 20 Z'
      : 'M0 20 C 18 -4, 70 -4, 100 20 C 70 44, 18 44, 0 20 Z';
    const veinPath = isLeft ? 'M96 20 L 4 20' : 'M4 20 L 96 20';
    return (
      <span
        key={key}
        className={`bg-flower-leaf bg-flower-leaf--${leaf.side}${onCut ? ' bg-flower-hit bg-flower-hit--leaf' : ''}`}
        style={
          {
            bottom: `${leaf.y}%`,
            width: `${leaf.len}px`,
            height: `${leaf.len * 0.42}px`,
            // Regrown leaves sprout immediately; only the first growth
            // staggers down the stem.
            '--leaf-delay': epoch > 0 ? '0s' : `${leaf.delay}s`,
          } as CSSVars
        }
        onClick={onCut}
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

  return (
    <div className={className} aria-hidden="true">
      {entries.map((f) => {
        // The hit surfaces ARE the visuals: the bloom wrapper, the stem, and
        // each leaf carry .bg-flower-hit themselves (with small ::after halos
        // in CSS for forgiveness). Pointer hit-testing follows their own
        // transforms and clip-paths, so the clickable areas track the
        // rendered shapes exactly — a half-bloomed star is exactly half as
        // clickable, a trimmed-off stretch can't be clicked at all.
        const growthAttr = f.settled
          ? { 'data-settled': '' }
          : f.bloomEpoch > 0
            ? { 'data-regrown': '' }
            : {};
        // --regrow-from stays on the plant after the regrow: the regrown
        // parts' animations hold their end state via fill-mode and still
        // resolve the variable from the cascade.
        const regrowVars =
          f.regrowFrom !== undefined
            ? { '--regrow-from': f.regrowFrom.toFixed(4), '--regrow': `${REGROW_MS}ms` }
            : undefined;

        return (
          <span
            key={f.id}
            className={`bg-flower${f.felling ? ' is-felling' : ''}`}
            style={
              {
                '--left': `${f.leftPct}%`,
                height: `${f.stemVh}vh`,
                '--grow': `${f.grow}s`,
                '--star-size': `${f.starPx ?? starSizeFor(f.stemVh)}px`,
                '--bloom-angle': `${f.bloomAngle}deg`,
                ...(f.settled ? { '--bloom-scale': f.bloomScale.toFixed(4) } : {}),
                ...(regrowVars ?? {}),
              } as CSSVars
            }
          >
            <span className="bg-flower-main">
              {/* Stem and bloom sit inside two fixed wrappers — every folded
                  cut, then the latest cut's sweep — so adding a cut never
                  remounts them. Leaves stay outside: no cut line clips them. */}
              <span className="bg-flower-clip" style={{ clipPath: belowLines(f.trims) }}>
                <span
                  className={
                    f.sweep
                      ? `bg-flower-sweep bg-flower-sweep--${f.sweep.dir} bg-flower-sweep--${f.sweep.n % 2 ? 'a' : 'b'}`
                      : 'bg-flower-sweep'
                  }
                  style={f.sweep ? (cutLineVars(f.sweep) as CSSVars) : undefined}
                >
                  <span
                    key={`stem:${f.bloomEpoch}`}
                    className="bg-flower-stem bg-flower-hit bg-flower-hit--stem"
                    {...growthAttr}
                    onClick={cutPlant(f.id)}
                  />
                  <span
                    key={`bloom:${f.bloomEpoch}`}
                    className="bg-flower-star bg-flower-hit bg-flower-hit--head"
                    {...growthAttr}
                    onClick={cutPlant(f.id)}
                  >
                    <Star className="bg-flower-star-svg" aria-hidden="true" />
                  </span>
                </span>
              </span>
              {f.leaves.map((leaf, j) =>
                f.leafPhases[j] === 'grown'
                  ? renderLeaf(leaf, `${j}:${f.leafEpochs[j]}`, f.leafEpochs[j], cutLeaf(f.id, j))
                  : null,
              )}
            </span>
            {f.pieces.map((p) => (
              <span
                key={p.key}
                className={`bg-flower-piece bg-flower-piece--${p.dir}`}
                style={
                  {
                    height: `${p.stemVh}vh`,
                    '--star-size': `${p.starPx}px`,
                    '--bloom-scale': p.bloomScale.toFixed(4),
                    ...cutLineVars(p.line),
                    ...p.fall,
                  } as CSSVars
                }
              >
                <span className="bg-flower-clip" style={{ clipPath: belowLines(p.trims) }}>
                  <span className="bg-flower-reveal">
                    <span className="bg-flower-stem" />
                    <span className="bg-flower-star">
                      <Star className="bg-flower-star-svg" aria-hidden="true" />
                    </span>
                  </span>
                </span>
                {p.leaves.map((leaf, j) => renderLeaf(leaf, String(j), 1))}
              </span>
            ))}
            {f.fallingLeaves.map((fall) => (
              <span
                key={fall.key}
                className="bg-flower-leaf-fall"
                style={fall.vars as CSSVars}
              >
                {renderLeaf(fall.leaf, 'leaf', fall.epoch)}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}
