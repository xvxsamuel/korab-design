/**
 * Meshing geometry for the star mark (src/assets/star.svg) used as a cog.
 *
 * ── Geometry, measured off the path ────────────────────────────────────────
 * viewBox is "0 0 191 200"; the mark's centre of symmetry is (95.5, 100).
 * Walking the outer contour gives 10 tips and 10 valleys:
 *   - tip apex radius   100.0 units  (cusp midpoints, e.g. the top tip at y≈0)
 *   - valley floor radius 65.7 units (e.g. the cusp at 115.77, 37.51)
 * They alternate every 18°, so the mark is a 10-tooth gear: 36° per tooth.
 *
 * The SVG is drawn with the default preserveAspectRatio ("xMidYMid meet") into
 * a square box of side S. 200 is the larger viewBox side, so 1 unit = S/200 px
 * and the star's centre lands exactly on the box centre — which is also the
 * default transform-origin, so `rotate()` on the box spins the gear about its
 * own axis.
 *
 * ── Meshing ───────────────────────────────────────────────────────────────
 * Angles below are screen angles: clockwise-positive, measured from +x with y
 * pointing down — the same sense as CSS `rotate()` and `atan2(dy, dx)`. An
 * unrotated mark has tips at 18 + 36k degrees and valleys at 36k.
 *
 * Two gears mesh when one's tip points into the other's valley along the line
 * joining their centres. For a pair whose parent→child bearing is β, that
 * resolves (either way round) to a constraint on the sum of their rotations:
 *
 *     rotation(child) ≡ 2β + 18 − rotation(parent)   (mod 36)
 *
 * The constraint is on the *sum*, which is why it survives motion: meshed
 * equal-tooth gears counter-rotate at equal speed, so one rotation gains
 * exactly what the other loses and the sum never changes. A static phase plus
 * a shared-period spin in alternating directions therefore stays locked
 * forever — no per-frame correction needed.
 */

export const TEETH = 10;
export const TOOTH_ANGLE = 360 / TEETH; // 36°
export const HALF_TOOTH = TOOTH_ANGLE / 2; // 18°

/** Tip and root radii as a fraction of the box side S. */
export const TIP_RADIUS = 100 / 200;
export const ROOT_RADIUS = 65.7 / 200;

/**
 * Centre-to-centre distance for a meshed pair, as a fraction of S.
 *
 * Full engagement — tip apex resting on the valley floor — is
 * TIP_RADIUS + ROOT_RADIUS = 0.8285, but at that depth the tooth flanks clear
 * each other by only ~0.2°, which antialiasing renders as an overlap. Backing
 * the tips out to 0.85 gives up 12% of the tooth depth for ~1.6° of flank
 * clearance: still visibly interlocked, never colliding.
 */
export const MESH_RATIO = 0.85;

export type GearLink = {
  /** Screen angle (deg, clockwise from +x) from the parent's centre to this gear. */
  bearing: number;
  /** Index of the gear this one meshes with. Defaults to the previous gear. */
  from?: number;
};

export type GearPlacement = {
  /** Box top-left, relative to the train's bounding box. */
  left: number;
  top: number;
  size: number;
  /** Static rotation (deg) that seats this gear's teeth into its neighbour's. */
  phase: number;
  /** +1 clockwise, -1 counter-clockwise. Neighbours always differ. */
  dir: 1 | -1;
};

export type GearTrain = {
  gears: GearPlacement[];
  width: number;
  height: number;
};

const RAD = Math.PI / 180;
const mod36 = (v: number) => ((v % TOOTH_ANGLE) + TOOTH_ANGLE) % TOOTH_ANGLE;

/**
 * Places a chain of equal-size gears. Gear 0 sits at the origin; each link adds
 * one gear at `bearing` from the gear it meshes with, at the exact centre
 * distance, with the phase and spin direction that keep the teeth engaged.
 *
 * Sizes are equal by construction: scaled copies of the same mark have
 * different tooth pitches, so unequal gears could not mesh continuously.
 */
export function layoutGearTrain(size: number, links: GearLink[]): GearTrain {
  const distance = MESH_RATIO * size;
  const centres = [{ x: 0, y: 0 }];
  const phases = [0];
  const dirs: (1 | -1)[] = [1];

  links.forEach((link, i) => {
    const parent = link.from ?? i;
    const { bearing } = link;
    centres.push({
      x: centres[parent].x + distance * Math.cos(bearing * RAD),
      y: centres[parent].y + distance * Math.sin(bearing * RAD),
    });
    phases.push(mod36(2 * bearing + HALF_TOOTH - phases[parent]));
    dirs.push(dirs[parent] === 1 ? -1 : 1);
  });

  const half = size / 2;
  const minX = Math.min(...centres.map((c) => c.x)) - half;
  const minY = Math.min(...centres.map((c) => c.y)) - half;
  const maxX = Math.max(...centres.map((c) => c.x)) + half;
  const maxY = Math.max(...centres.map((c) => c.y)) + half;

  return {
    gears: centres.map((c, i) => ({
      left: c.x - half - minX,
      top: c.y - half - minY,
      size,
      phase: phases[i],
      dir: dirs[i],
    })),
    width: maxX - minX,
    height: maxY - minY,
  };
}
