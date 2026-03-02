import { tileToGlyph } from '../render/tileToGlyph';

export default function FarmGrid({ tiles }) {
  return (
    <section className="grid-panel">
      <h3>Farm Grid</h3>
      <div className="farm-grid">
        {tiles.map((tile, index) => (
          <div key={index} className="tile" title={`Tile ${index + 1}`}>
            {tileToGlyph(tile)}
          </div>
        ))}
      </div>
    </section>
  );
}
