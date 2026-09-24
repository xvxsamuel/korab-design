import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SiteEntry from './components/SiteEntry';
import './style.css';

// The entrance plays on every load, wherever the page lands. The browser's
// own restoration would fire against the loader's empty document before the
// site mounts, so App restores the position itself (see useEntryScroll).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteEntry preview={import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'loading'} />
  </StrictMode>
);
