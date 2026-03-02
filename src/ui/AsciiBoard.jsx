import { tileToAsciiCell } from '../render/asciiBoard';

export default function AsciiBoard({ tiles, gridSize, unlockedTiles, selectedTileIndex, onSelectTile }) {
  return (
    <section className="grid-panel ascii-panel">
      <h3>Farm Grid</h3>
      <div className="ascii-grid-wrap">
        <div className="ascii-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {tiles.map((tile, index) => {
            const isUnlocked = Boolean(unlockedTiles?.[index]);
            const isReady = tile?.type === 'ready';
            const isSelected = selectedTileIndex === index;
            const tileAscii = tileToAsciiCell(tile, isUnlocked);
            const fillGlyph = tileAscii[0];

            return (
              <button
                key={index}
                type="button"
                className={`ascii-grid-tile${isUnlocked ? '' : ' is-locked'}${isReady ? ' is-ready' : ''}${isSelected ? ' is-selected' : ''}`}
                title={`Tile ${index + 1}: ${tileAscii}`}
                onClick={() => onSelectTile(index)}
              >
                <span className="ascii-grid-pattern" aria-hidden="true">
                  {Array.from({ length: 25 }, (_, fillIndex) => (
                    <span key={`${index}-${fillIndex}`} className="ascii-grid-glyph">
                      {fillGlyph}
                    </span>
                  ))}
                </span>
                <span className="sr-only">{tileAscii}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
