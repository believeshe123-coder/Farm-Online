import { tileToGlyph } from '../render/tileToGlyph';

const tiles = Array.from({ length: 36 }, () => ({ type: 'empty' }));

export default function FarmGrid() {
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
