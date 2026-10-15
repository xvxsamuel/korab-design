import type { Block } from '../../data/projects';
import Compare from './Compare';
import FrameChrome from './FrameChrome';
import MediaView from './MediaView';
import ZoomTour from './ZoomTour';
import Diagram from './Diagram';
import StyleTile from './StyleTile';

export default function BlockView({ block, url }: { block: Block; url?: string }) {
  switch (block.kind) {
    case 'media':
      return (
        <figure className={`cs-figure cs-frame-${block.frame ?? 'plain'}${block.size ? ` is-${block.size}` : ''}`}>
          <FrameChrome frame={block.frame} url={url}>
            <MediaView media={block.media} />
          </FrameChrome>
          {block.caption && <figcaption className="cs-caption">{block.caption}</figcaption>}
        </figure>
      );

    case 'compare':
      return (
        <div className={block.size ? `cs-figure is-${block.size}` : 'cs-figure'}>
          <Compare
            pairs={block.pairs}
            frame={block.frame}
            labels={block.labels}
            caption={block.caption}
            start={block.start}
            url={url}
          />
        </div>
      );

    case 'zoom':
      return <ZoomTour media={block.media} spots={block.spots} frame={block.frame} url={url} caption={block.caption} />;

    case 'gallery':
      return (
        <div
          className={`cs-gallery is-${block.columns ?? 2}${block.items.every((it) => it.frame === 'phone') ? ' is-phones' : ''}`}
        >
          {block.items.map((item, i) => (
            <figure
              key={i}
              className={`cs-gallery-item cs-frame-${item.frame ?? 'plain'}${item.span === 2 ? ' is-wide' : ''}${item.natural ? ' is-natural' : ''}`}
            >
              <FrameChrome frame={item.frame}>
                {item.natural ? (
                  <div
                    className="cs-natural"
                    style={{ '--nw': `${item.media.w / (item.natural === true ? 2 : item.natural)}px` } as React.CSSProperties}
                  >
                    <MediaView media={item.media} sizes={`${item.media.w / (item.natural === true ? 2 : item.natural)}px`} />
                  </div>
                ) : (
                  <MediaView
                    media={item.media}
                    sizes={
                      item.span === 2
                        ? '(max-width: 900px) 100vw, 1180px'
                        : block.columns === 3
                          ? '(max-width: 900px) 100vw, 400px'
                          : '(max-width: 900px) 100vw, 600px'
                    }
                  />
                )}
              </FrameChrome>
              {item.caption && <figcaption className="cs-caption">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      );

    case 'flow':
      return (
        <ol className="cs-flow" aria-label="Flow">
          {block.items.map((item, i) => (
            <li key={item.label} className="cs-flow-step">
              <FrameChrome frame={block.frame ?? 'plain'}>
                <MediaView media={item.media} sizes="(max-width: 900px) 80vw, 420px" />
              </FrameChrome>
              <p className="cs-flow-label">
                <span className="cs-flow-num">{String(i + 1).padStart(2, '0')}</span>
                {item.label}
              </p>
            </li>
          ))}
        </ol>
      );

    case 'stats':
      return (
        <dl className="cs-stats">
          {block.items.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      );

    case 'notes':
      return (
        <ul className="cs-notes">
          {block.items.map((n) => (
            <li key={n.title}>
              <h5 className="cs-notes-title">{n.title}</h5>
              <p className="cs-notes-body">{n.body}</p>
            </li>
          ))}
        </ul>
      );

    case 'diagram':
      return (
        <figure className="cs-figure cs-diagram">
          <Diagram id={block.diagram} />
          {block.caption && <figcaption className="cs-caption">{block.caption}</figcaption>}
        </figure>
      );

    case 'patterns':
      return (
        <figure className="cs-figure cs-patterns">
          <dl className="cs-patterns-list">
            {block.groups.map((g) => (
              <div key={g.area} className="cs-patterns-row">
                <dt className="cs-patterns-area">{g.area}</dt>
                <dd>
                  <ul>
                    {g.items.map((it) => (
                      <li key={it.name}>
                        <span className="cs-patterns-name">{it.name}</span>
                        <span className="cs-patterns-where">{it.where}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
          {block.caption && <figcaption className="cs-caption">{block.caption}</figcaption>}
        </figure>
      );

    case 'tile':
      return <StyleTile block={block} />;
  }
}
