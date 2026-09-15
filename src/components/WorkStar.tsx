import { useId } from 'react';
import starSvg from '../assets/star.svg?raw';

// The source mark is one compound path: outline first, then its cutouts.
// Reuse it so the ambient and filled states have exactly the same contour.
const starPath = starSvg.match(/\sd="([^"]+)"/)![1];
const [outline, inlay] = starPath.match(/M[^Z]+Z/g)!;

export default function WorkStar() {
  const clipId = useId();

  return (
    <svg className="work-body-star" viewBox="0 0 191 200" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path className="work-body-ink" d={starPath} />
        <path className="work-body-inlay" d={inlay} />
      </g>
    </svg>
  );
}
