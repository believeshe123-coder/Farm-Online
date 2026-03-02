import { tileToGlyph } from '../render/tileToGlyph';

export default function FarmGrid({ tiles, gridSize, selectedTileIndex, onSelectTile, renderMode }) {
  return (
    <section className="grid-panel">
      <h3>Farm Grid</h3>
      <div className="farm-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, var(--tile-size))` }}>
        {tiles.map((tile, index) => (
          <button
            key={index}
            type="button"
            className={`tile ${selectedTileIndex === index ? 'selected' : ''}`}
            title={`Tile ${index + 1}`}
            onClick={() => onSelectTile(index)}
          >
            {renderMode === 'glyph' ? (
              tileToGlyph(tile)
            ) : (
              // TODO: Render tile sprites when sprite assets and renderer are available.
              tileToGlyph(tile)
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
