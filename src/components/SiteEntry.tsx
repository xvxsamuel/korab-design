import { useEffect, useState } from 'react';
import App from '../App';
import Cogs from './Cogs';

const SHOW_AFTER_MS = 120;
const EXIT_MS = 280;
const MAX_WAIT_MS = 2000;

export default function SiteEntry({ preview = false }: { preview?: boolean }) {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'ready'>('loading');

  useEffect(() => {
    if (preview) return;
    let disposed = false;
    let settled = false;
    let exitTimer = 0;
    const started = performance.now();
    const finish = () => {
      if (disposed || settled) return;
      settled = true;
      window.clearTimeout(deadline);
      // Cached fonts go straight to the site. Only dismiss an already
      // visible loader; never hold the page just to show an animation.
      if (performance.now() - started < SHOW_AFTER_MS ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setPhase('ready');
      } else {
        setPhase('leaving');
        exitTimer = window.setTimeout(() => setPhase('ready'), EXIT_MS);
      }
    };
    const deadline = window.setTimeout(finish, MAX_WAIT_MS);
    // App mounts only after these settle, so the title and orbits start
    // together against the final font metrics. Images never block entry.
    Promise.allSettled([
      document.fonts.load('500 1em "DeFonte"'),
      document.fonts.load('400 1em "Amiamie"'),
    ]).then(finish);
    return () => {
      disposed = true;
      window.clearTimeout(deadline);
      window.clearTimeout(exitTimer);
    };
    // This gate runs once per mount, including StrictMode's cleanup/replay.
  }, []);

  if (phase === 'ready') return <App />;

  return (
    <div className={`site-loader${phase === 'leaving' ? ' is-leaving' : ''}`} role="status">
      <span className="sr-only">Loading portfolio</span>
      <div className="site-loader-mark"><Cogs /></div>
    </div>
  );
}
