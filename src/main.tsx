import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

// Skip on-mount entry animations when the page loads partway scrolled — the
// user can't see what's happening at the top, so playing the animation is
// wasted. Setting the class before React mounts ensures CSS overrides apply
// from the very first paint. Any new entry animation should add its own
// override under `html.no-entry-anim` in style.css to participate.
if (window.scrollY > 0) {
  document.documentElement.classList.add('no-entry-anim');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
