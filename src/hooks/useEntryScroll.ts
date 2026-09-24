import { useEffect, useLayoutEffect } from 'react';

const STORE_KEY = 'entry-scroll';

// Where the page should open. A reload returns to the exact spot it left
// (the works orbit is scroll-driven, so the section top alone would show a
// different project); any other arrival on a section's hash lands at that
// section. Runs before the orrery measures, so it opens already in place.
export function useEntryScroll(sectionIds: readonly string[]) {
  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    const navType = (performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined)?.type;

    let saved: { y: number; hash: string } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null');
    } catch { /* storage unavailable */ }

    if ((navType === 'reload' || navType === 'back_forward') && saved && saved.hash === hash) {
      window.scrollTo({ top: saved.y, behavior: 'instant' });
    } else if (hash && sectionIds.includes(hash)) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [sectionIds]);

  useEffect(() => {
    const save = () => {
      // An open project panel locks the page, and some engines report 0
      // while locked; fall back to the section hash rather than store it.
      if (document.documentElement.classList.contains('lock-scroll')) return;
      try {
        sessionStorage.setItem(STORE_KEY, JSON.stringify({
          y: window.scrollY,
          hash: window.location.hash.slice(1),
        }));
      } catch { /* storage unavailable */ }
    };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);
}

// Mirror the section in view into the URL. replaceState, not pushState: the
// back button should leave the page, not walk back through every section
// scrolled past. The top of the page is the bare URL.
export function useSectionHash(active: string) {
  useEffect(() => {
    const hash = active === 'home' ? '' : `#${active}`;
    if (window.location.hash === hash) return;
    const { pathname, search } = window.location;
    history.replaceState(history.state, '', `${pathname}${search}${hash}`);
  }, [active]);
}
