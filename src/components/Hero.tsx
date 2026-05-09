import { useLayoutEffect, useState } from 'react';

// Per-letter left-margin nudge (in em). Index i applies to letter i, on top of
// the uniform compression in .hero-letter. Index 0 is unused (first letter has
// no preceding gap). Hand-tuned to even out the font's irregular sidebearings.
function letters(text: string, gaps: number[] = []) {
  return Array.from(text).map((char, i) => (
    <span
      key={i}
      className="hero-letter"
      style={{
        ['--i' as string]: i,
        ['--ml' as string]: `${gaps[i] ?? 0}em`,
      } as React.CSSProperties}
    >
      {char}
    </span>
  ));
}

// Gaps expressed as percentages (rough eyeballed values), converted to em.
const SAMUEL_GAPS = [0, -0.01, -0.045, -0.055, 0.0, -0.05];
// Index 0 here doubles as the K-to-star gap (the placeholder sits before K
// in row2's flex flow), so a negative value pulls "Korab" leftward toward
// the star without shifting the star itself.
const KORAB_GAPS  = [-0.6, -0.065, -0.02, -0.04, -0.045];

// Threshold tableValues for the discrete feFuncA: 10 buckets, the trailing
// `ones` of which are 1. ones=1 admits only the top 10% of alpha (strict —
// what the bloom holds during the main blur shrink). ones=9 admits the top
// 90% — close to native AA but with slightly fattened halos.
const THRESHOLD_TABLE_STRICT = '0 0 0 0 0 0 0 0 0 1';
const THRESHOLD_ONES_END = 9;

const ENTRY_DURATION = 1800;
// Tail after the main bloom: blur is already at 0; the threshold opens from
// strict to permissive so the rendered glyphs swell out toward native size.
const SETTLE_DURATION = 250;
// Cross-fade window: the native (unfiltered) text fades in while the bloom
// layer fades out. The bloom is then unmounted — by then it's already
// invisible, so the layer-compositing change happens behind a fully-opaque
// native render and produces no visible flash.
const CROSSFADE_DURATION = 220;
const START_BLUR = 13; // px — high enough that even the highest-alpha pixels stay below the threshold at t=0, so nothing bleeds through before the bloom starts.

function thresholdTable(ones: number) {
  const o = Math.max(1, Math.min(10, ones));
  return Array(10 - o).fill('0').concat(Array(o).fill('1')).join(' ');
}

export default function Hero() {
  const [entering, setEntering] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    if (document.documentElement.classList.contains('no-entry-anim')) return false;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  });

  useLayoutEffect(() => {
    if (!entering) return;

    const root = document.documentElement;
    const funcs = document.querySelectorAll<SVGElement>('#textThreshold .threshold-func');
    const nativeRows = document.querySelectorAll<HTMLElement>('.hero-name > .row');
    const bloomLayer = document.querySelector<HTMLElement>('.hero-name-bloom-overlay');
    if (!funcs.length || !nativeRows.length || !bloomLayer) {
      setEntering(false);
      return;
    }

    // Seed initial state synchronously before paint so the first frame
    // already shows the bloom layer at full blur and the native rows
    // hidden — no flash from defaults.
    root.style.setProperty('--text-blur', `${START_BLUR}px`);
    funcs.forEach((f) => f.setAttribute('tableValues', THRESHOLD_TABLE_STRICT));
    nativeRows.forEach((r) => { r.style.opacity = '0'; });
    bloomLayer.style.opacity = '1';

    const start = performance.now();
    const settleStart = start + ENTRY_DURATION;
    const crossfadeStart = settleStart + SETTLE_DURATION;
    const crossfadeEnd = crossfadeStart + CROSSFADE_DURATION;

    let raf = 0;
    const step = (now: number) => {
      if (now < settleStart) {
        // Bloom phase: blur shrinks from START_BLUR → 0 with ease-in cubic
        // so letters linger blurred, then snap into focus. Threshold stays
        // at the strict 90% cut for the gooey ink-burning look.
        const t = (now - start) / ENTRY_DURATION;
        const e = t * t * t;
        const blur = START_BLUR * (1 - e);
        root.style.setProperty('--text-blur', `${blur.toFixed(3)}px`);
        funcs.forEach((f) => f.setAttribute('tableValues', THRESHOLD_TABLE_STRICT));
        raf = requestAnimationFrame(step);
      } else if (now < crossfadeStart) {
        // Settle phase: blur pinned at 0, threshold opens ones=1 → ones=9
        // so the gooey shape swells toward native glyph width before the
        // cross-fade hands off.
        root.style.setProperty('--text-blur', '0px');
        const t = (now - settleStart) / SETTLE_DURATION;
        const e = 1 - Math.pow(1 - t, 2); // ease-out quad
        const ones = 1 + Math.round(e * (THRESHOLD_ONES_END - 1));
        funcs.forEach((f) => f.setAttribute('tableValues', thresholdTable(ones)));
        raf = requestAnimationFrame(step);
      } else if (now < crossfadeEnd) {
        // Cross-fade: snap native to full opacity and fade only the bloom
        // layer out. Cross-fading both layers caused the text body to
        // composite to alpha ~0.75 mid-fade (bloom 0.5 over native 0.5
        // → 0.75), which read as a brief colour wash. With native pinned
        // at 1, the composite at the glyph body stays at alpha 1
        // throughout: bloom_alpha + 1·(1 − bloom_alpha) = 1. The native
        // snap from 0→1 isn't visible because the bloom is still fully
        // opaque on top and covers the glyph body identically; only the
        // very thin sub-10%-alpha halo (where the bloom's threshold cuts
        // through) sees a barely-perceptible expansion.
        const t = (now - crossfadeStart) / CROSSFADE_DURATION;
        nativeRows.forEach((r) => { r.style.opacity = '1'; });
        bloomLayer.style.opacity = String(1 - t);
        raf = requestAnimationFrame(step);
      } else {
        // Done. Clear the inline opacity overrides so the native rows
        // revert to their CSS default (1) and unmount the bloom layer
        // via setEntering(false) — by now the bloom is already at
        // opacity 0, so removing it from the DOM (and dropping the
        // filter with it) produces no visible change.
        nativeRows.forEach((r) => { r.style.opacity = ''; });
        setEntering(false);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [entering]);

  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <h1 className="hero-name" aria-label="Samuel Korab">
          {/* Native rows — always rendered, define the H1's height/layout.
              Hidden during the bloom (opacity 0 set in JS), faded in during
              the cross-fade. */}
          <span className="row row1" aria-hidden="true">{letters('Samuel', SAMUEL_GAPS)}</span>
          <span className="row row2" aria-hidden="true">
            <span className="hero-sun-placeholder" />
            {letters('Korab', KORAB_GAPS)}
          </span>
          {/* Bloom overlay — absolutely positioned on top, mirrors the
              native flex column so its rows align pixel-perfect with the
              native rows beneath. Only mounted while `entering` is true,
              so the filter chain is entirely gone afterward and the
              browser doesn't keep a filter layer alive on the static page. */}
          {entering && (
            <div className="hero-name-bloom-overlay" aria-hidden="true">
              <span className="row row1 is-entering">{letters('Samuel', SAMUEL_GAPS)}</span>
              <span className="row row2 is-entering">
                <span className="hero-sun-placeholder" />
                {letters('Korab', KORAB_GAPS)}
              </span>
            </div>
          )}
        </h1>
      </div>
    </section>
  );
}
