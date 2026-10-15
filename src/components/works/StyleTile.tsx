import type { Block } from '../../data/projects';

type Tile = Extract<Block, { kind: 'tile' }>;

// A style tile laid out as a sheet: the palette first, then each family of
// components in its own labelled cell. Every render is a 2× export shown at
// half its pixels, so the pieces keep their real sizes relative to each
// other (a button stays button-sized next to a card) — the point of a tile.
export default function StyleTile({ block }: { block: Tile }) {
  return (
    <figure className="cs-tile">
      <div
        className="cs-tile-sheet"
        style={
          {
            ...(block.paper ? { '--paper': block.paper } : {}),
            ...(block.paperInk ? { '--paper-ink': block.paperInk } : {}),
          } as React.CSSProperties
        }
      >
        <div className="cs-tile-cell is-wide" role="group" aria-label="Colour">
          <h5 className="cs-tile-label">Colour</h5>
          <ul className="cs-tile-swatches">
            {block.swatches.map((s) => (
              <li key={s.hex}>
                <span className="cs-tile-chip" style={{ background: s.hex }} />
                <span className="cs-tile-name">{s.name}</span>
                <span className="cs-tile-hex">{s.hex}</span>
              </li>
            ))}
          </ul>
        </div>
        {block.groups.map((g) => (
          <div key={g.label} className={`cs-tile-cell${g.wide ? ' is-wide' : ''}`} role="group" aria-label={g.label}>
            <h5 className="cs-tile-label">{g.label}</h5>
            <div className="cs-tile-items">
              {g.items.map((it) => (
                // The width sits on the figure, not the image: a percentage
                // on the image would resolve against a shrink-to-fit figure
                // and collapse to nothing until the lazy image arrives.
                <figure
                  key={it.media.src}
                  className="cs-tile-item"
                  style={{ width: `min(100%, ${it.media.w / 2}px)` }}
                >
                  <img
                    src={it.media.src}
                    width={it.media.w / 2}
                    height={it.media.h / 2}
                    alt={it.media.alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                  {it.caption && <figcaption>{it.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
      {block.caption && <figcaption className="cs-caption">{block.caption}</figcaption>}
    </figure>
  );
}
