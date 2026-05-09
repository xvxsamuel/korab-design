import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

// Skip on-mount entry animations on reload, or when the page loads partway
// scrolled. Reload is the load case where the browser may not have restored
// scroll position by the time this script runs, so checking scrollY alone
// misses scrolled-down refreshes — the navigation entry's type is reliable
// at script-load time. Setting the class before React mounts ensures CSS
// overrides apply from the very first paint. Any new entry animation should
// add its own override under `html.no-entry-anim` in style.css to participate.
const navType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
if (window.scrollY > 0 || navType === 'reload') {
  document.documentElement.classList.add('no-entry-anim');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
