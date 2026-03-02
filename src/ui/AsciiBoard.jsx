import { CROPS } from '../game/constants';

function getSpotVisual(spot, tick) {
  if (!spot?.crop) {
    if (spot?.soil === 'hoed') {
      return { glyph: '=', className: 'is-hoed' };
    }

    if (spot?.soil === 'watered') {
      return { glyph: '=', className: 'is-watered' };
    }

    return { glyph: '@', className: 'is-raw' };
  }

  const crop = CROPS[spot.crop.cropId];
  if (!crop) {
    return { glyph: '∩', className: 'is-planted' };
  }

  const progress = (tick - spot.crop.plantedAtTick) / crop.growTime;
  if (progress < 0.34) {
    return { glyph: '∩', className: 'is-planted' };
  }

  if (progress < 0.67) {
    return { glyph: '^', className: 'is-planted' };
  }

  if (progress >= 1) {
    return { glyph: spot.crop.cropId === 'wheat' ? 'W' : 'C', className: 'is-ready' };
  }

  return { glyph: '^', className: 'is-planted' };
}

export default function AsciiBoard({ tiles, plots, gridSize, tick, unlockedTiles, selected, onSpotClick }) {
  return (
    <section className="grid-panel ascii-panel">
      <h3>Farm Grid</h3>
      <div className="ascii-grid-wrap">
        <div className="ascii-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {tiles.map((tile, plotIndex) => {
            const isUnlocked = Boolean(unlockedTiles?.[plotIndex]);
            const isCoop = tile.type === 'coop';

            return (
              <div
                key={plotIndex}
                className={`ascii-grid-tile${isUnlocked ? '' : ' is-locked'}${isCoop ? ' is-coop' : ''}`}
                title={`Plot ${plotIndex + 1}`}
              >
                <div className="plotInnerGrid">
                  {Array.from({ length: 25 }, (_, spotIndex) => {
                    const spot = plots?.[plotIndex]?.spots?.[spotIndex];
                    const isSelected = selected?.plotIndex === plotIndex && selected?.spotIndex === spotIndex;
                    const visual = isUnlocked ? getSpotVisual(spot, tick) : { glyph: 'X', className: 'is-locked-spot' };

                    return (
                      <button
                        key={`${plotIndex}-${spotIndex}`}
                        type="button"
                        className={`spotCell ${visual.className}${isSelected ? ' is-selected' : ''}`}
                        onClick={() => onSpotClick(plotIndex, spotIndex)}
                        disabled={!isUnlocked}
                      >
                        {visual.glyph}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
