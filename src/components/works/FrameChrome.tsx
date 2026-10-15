import type { ReactNode } from 'react';
import type { Frame } from '../../data/projects';

// Presentation around a screenshot: a quiet browser window, a phone, or a
// bare rounded plate. The chrome is drawn in the page's own palette so it
// reads as part of the case study, not as a screenshot of a screenshot.
export default function FrameChrome({ frame = 'plain', url, children }: { frame?: Frame; url?: string; children: ReactNode }) {
  if (frame === 'browser') {
    return (
      <div className="cs-browser">
        <div className="cs-browser-bar" aria-hidden="true">
          <span className="cs-browser-dots">
            <i />
            <i />
            <i />
          </span>
          {url && <span className="cs-browser-url">{url}</span>}
        </div>
        <div className="cs-browser-view">{children}</div>
      </div>
    );
  }
  if (frame === 'phone') {
    return (
      <div className="cs-phone">
        <div className="cs-phone-view">{children}</div>
      </div>
    );
  }
  return <div className="cs-plain">{children}</div>;
}
