import { useEffect, useRef } from 'react';

import { CROPS } from '../game/constants';

function getEffectiveGrowTime(crop, cropState) {
  if (crop.wateredGrowMultiplier && cropState?.watered) {
    return crop.growTime * crop.wateredGrowMultiplier;
  }

  return crop.growTime;
}

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

  const progress = (tick - spot.crop.plantedAtTick) / getEffectiveGrowTime(crop, spot.crop);
  if (progress < 0.34) {
    return { glyph: '∩', className: 'is-planted' };
  }

  if (progress < 0.67) {
    return { glyph: '^', className: 'is-planted' };
  }

  if (progress >= 1) {
    return { glyph: crop.symbol ?? crop.name[0].toUpperCase(), className: 'is-ready' };
  }

  return { glyph: '^', className: 'is-planted' };
}

export default function AsciiBoard({ tiles, plots, gridSize, tick, unlockedTiles, selected, onSpotClick }) {
  const isDraggingRef = useRef(false);

  useEffect(() => {
    function stopDragging() {
      isDraggingRef.current = false;
    }

    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);

    return () => {
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('blur', stopDragging);
    };
  }, []);

  function handleSpotPointerDown(plotIndex, spotIndex) {
    isDraggingRef.current = true;
    onSpotClick(plotIndex, spotIndex);
  }

  function handleSpotPointerEnter(plotIndex, spotIndex) {
    if (!isDraggingRef.current) {
      return;
    }

    onSpotClick(plotIndex, spotIndex);
  }

  function stopDragging() {
    isDraggingRef.current = false;
  }

  return (
    <section className="grid-panel ascii-panel" onMouseUp={stopDragging} onMouseLeave={stopDragging}>
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
                        onMouseDown={() => handleSpotPointerDown(plotIndex, spotIndex)}
                        onMouseEnter={() => handleSpotPointerEnter(plotIndex, spotIndex)}
                        onClick={(event) => {
                          if (event.detail === 0) {
                            onSpotClick(plotIndex, spotIndex);
                          }
                        }}
                        onDragStart={(event) => event.preventDefault()}
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
