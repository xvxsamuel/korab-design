import { useId } from 'react';
import starSvg from '../assets/star.svg?raw';

// The source mark is one compound path: outline first, then its cutouts.
// Reuse it so the ambient and filled states have exactly the same contour.
const starPath = starSvg.match(/\sd="([^"]+)"/)![1];
const [outline, inlay] = starPath.match(/M[^Z]+Z/g)!;

// Ink and inlay are separate SVGs so the entrance bloom can threshold each
// on its own alpha. Blurred together, the inlay's colour smeared into the
// ink and the 90% cut only sharpened the outer edge, so the mark inked in
// as a soft disc. The wrapper carries the spin, so both still turn as one.
export default function WorkStar() {
  const clipId = useId();

  return (
    <span className="work-body-star" aria-hidden="true">
      <svg viewBox="0 0 191 200">
        <defs>
          <clipPath id={clipId}>
            <path d={outline} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path className="work-body-ink" d={starPath} />
        </g>
      </svg>
      <svg viewBox="0 0 191 200">
        <g clipPath={`url(#${clipId})`}>
          <path className="work-body-inlay" d={inlay} />
        </g>
      </svg>
    </span>
  );
}
