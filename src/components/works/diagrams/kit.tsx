import { createContext, useContext, useId, type ReactNode } from 'react';

// Hand-drawn diagram primitives. Coordinates are viewBox units; every
// diagram ships a wide layout and a tall one for phones (CSS swaps them),
// so labels stay at a readable size instead of shrinking with the width.
// Colours come from the page palette via classes in case-study.css.

const MarkerCtx = createContext({ ink: '', accent: '' });

type SvgProps = { w: number; h: number; label: string; className: string; children: ReactNode };

export function Svg({ w, h, label, className, children }: SvgProps) {
  const id = useId().replace(/:/g, '');
  const ids = { ink: `dg-a-${id}`, accent: `dg-b-${id}` };
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        {(['ink', 'accent'] as const).map((k) => (
          <marker
            key={k}
            id={ids[k]}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10z" className={`dg-head is-${k}`} />
          </marker>
        ))}
      </defs>
      <MarkerCtx.Provider value={ids}>{children}</MarkerCtx.Provider>
    </svg>
  );
}

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: boolean;
  /** Small numbered tag in the corner, for step diagrams. */
  n?: number;
  /** Set the title near the top (for tall boxes that hold rows). */
  top?: boolean;
};

export function Box({ x, y, w, h, title, sub, accent, n, top }: BoxProps) {
  // A step number takes the top-left corner, so the text block drops a
  // little to clear it.
  const cy = (top ? y + 38 : y + h / 2) + (n !== undefined ? 6 : 0);
  return (
    <g className={`dg-box${accent ? ' is-accent' : ''}`}>
      <rect x={x} y={y} width={w} height={h} rx={8} />
      {n !== undefined && (
        <text className="dg-num" x={x + 12} y={y + 20}>
          {String(n).padStart(2, '0')}
        </text>
      )}
      <text className="dg-title" x={x + w / 2} y={sub ? cy - 4 : cy + 6} textAnchor="middle">
        {title}
      </text>
      {sub && (
        <text className="dg-sub" x={x + w / 2} y={cy + 17} textAnchor="middle">
          {sub}
        </text>
      )}
    </g>
  );
}

type EdgeProps = {
  /** Polyline points [x, y, x, y, ...], drawn with softened corners. */
  pts: number[];
  label?: string;
  /** Label anchor point and alignment. */
  lx?: number;
  ly?: number;
  anchor?: 'start' | 'middle' | 'end';
  accent?: boolean;
  dashed?: boolean;
  /** Arrowheads: at the end (default), both ends, or none. */
  heads?: 'end' | 'both' | 'none';
  /** Turn the label (degrees) to run along a vertical leg. */
  rotate?: number;
};

const R = 10;

// Orthogonal polyline with rounded joins: each corner is cut back by up to R
// along both legs and bridged with a quadratic through the corner point.
function roundedPath(pts: number[]): string {
  const p: [number, number][] = [];
  for (let i = 0; i < pts.length; i += 2) p.push([pts[i], pts[i + 1]]);
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [ax, ay] = p[i - 1];
    const [bx, by] = p[i];
    const [cx, cy] = p[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    const r = Math.min(R, l1 / 2, l2 / 2);
    const sx = bx - ((bx - ax) / l1) * r;
    const sy = by - ((by - ay) / l1) * r;
    const ex = bx + ((cx - bx) / l2) * r;
    const ey = by + ((cy - by) / l2) * r;
    d += ` L${sx} ${sy} Q${bx} ${by} ${ex} ${ey}`;
  }
  const last = p[p.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

export function Edge({ pts, label, lx, ly, anchor = 'middle', accent, dashed, heads = 'end', rotate }: EdgeProps) {
  const ids = useContext(MarkerCtx);
  const marker = `url(#${accent ? ids.accent : ids.ink})`;
  return (
    <g>
      <path
        className={`dg-edge${accent ? ' is-accent' : ''}${dashed ? ' is-dashed' : ''}`}
        d={roundedPath(pts)}
        markerEnd={heads === 'none' ? undefined : marker}
        markerStart={heads === 'both' ? marker : undefined}
      />
      {label && lx !== undefined && ly !== undefined && (
        <text
          className={`dg-elabel${accent ? ' is-accent' : ''}`}
          x={lx}
          y={ly}
          textAnchor={anchor}
          transform={rotate ? `rotate(${rotate} ${lx} ${ly})` : undefined}
        >
          {label}
        </text>
      )}
    </g>
  );
}

type GroupProps = { x: number; y: number; w: number; h: number; label: string; labelAt?: 'top' | 'bottom' };

export function Group({ x, y, w, h, label, labelAt = 'top' }: GroupProps) {
  return (
    <g>
      <rect className="dg-group" x={x} y={y} width={w} height={h} rx={14} />
      <text className="dg-grouplabel" x={x + 16} y={labelAt === 'top' ? y + 24 : y + h - 14}>
        {label}
      </text>
    </g>
  );
}

/** A small labelled row inside a box: a name and what it holds. */
export function Row({ x, y, w, name, detail }: { x: number; y: number; w: number; name: string; detail: string }) {
  return (
    <g className="dg-row">
      <rect x={x} y={y} width={w} height={44} rx={6} />
      <text className="dg-rowname" x={x + 12} y={y + 19}>
        {name}
      </text>
      <text className="dg-sub" x={x + 12} y={y + 35}>
        {detail}
      </text>
    </g>
  );
}

export function Note({ x, y, children, anchor = 'start' }: { x: number; y: number; children: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text className="dg-note" x={x} y={y} textAnchor={anchor}>
      {children}
    </text>
  );
}
