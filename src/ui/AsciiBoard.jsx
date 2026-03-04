import { useState } from 'react';

import { CROPS } from '../game/constants';
import { isCropHydratedAtTick } from '../game/actions';

function getEffectiveGrowTime(crop, cropState) {
  if (crop.wateredGrowMultiplier && cropState?.watered) {
    return crop.growTime * crop.wateredGrowMultiplier;
  }

  return crop.growTime;
}

function getSpotVisual(spot, tick) {
  if (spot?.debris === 'wood') {
    return { glyph: '@', className: 'is-raw' };
  }

  if (spot?.debris === 'seeds') {
    return { glyph: '$', className: 'is-planted' };
  }

  if (spot?.debris === 'rock') {
    return { glyph: 'R', className: 'is-hoed' };
  }

  if (!spot?.crop) {
    if (spot?.soil === 'hoed') {
      return { glyph: '=', className: 'is-hoed' };
    }

    if (spot?.soil === 'watered') {
      return { glyph: '=', className: 'is-watered' };
    }

    return { glyph: '.', className: 'is-raw' };
  }

  const crop = CROPS[spot.crop.cropId];
  if (!crop) {
    return { glyph: '∩', className: 'is-planted' };
  }

  const isHydrated = isCropHydratedAtTick(spot.crop, tick);
  const hydratedCropState = { ...spot.crop, watered: isHydrated };
  const growthClassName = isHydrated ? 'is-watered' : 'is-hoed';
  const progress = (tick - spot.crop.plantedAtTick) / getEffectiveGrowTime(crop, hydratedCropState);
  if (progress < 0.34) {
    return { glyph: '∩', className: growthClassName };
  }

  if (progress < 0.67) {
    return { glyph: '^', className: growthClassName };
  }

  if (progress >= 1) {
    return { glyph: crop.symbol ?? crop.name[0].toUpperCase(), className: 'is-ready' };
  }

  return { glyph: '^', className: growthClassName };
}

export default function AsciiBoard({ tiles, plots, gridSize, tick, unlockedTiles, selected, onSpotClick }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleSpotPointerDown(plotIndex, spotIndex) {
    setIsDragging(true);
    onSpotClick(plotIndex, spotIndex);
  }

  function handleSpotPointerEnter(plotIndex, spotIndex, event) {
    if (!isDragging || event.buttons !== 1) {
      return;
    }

    onSpotClick(plotIndex, spotIndex);
  }

  function stopDragging() {
    setIsDragging(false);
  }

  return (
    <section className="grid-panel ascii-panel" onMouseUp={stopDragging} onMouseLeave={stopDragging}>
      <h3>Farm Grid</h3>
      <div className="ascii-grid-wrap">
        <div className="ascii-grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {tiles.map((tile, plotIndex) => {
            const isUnlocked = Boolean(unlockedTiles?.[plotIndex]);
            const isCoop = tile.type === 'coop';
            const isForest = tile.type === 'forest';
            const isMine = tile.type === 'mine';

            return (
              <div
                key={plotIndex}
                className={`ascii-grid-tile${isUnlocked ? '' : ' is-locked'}${isCoop ? ' is-coop' : ''}${isForest ? ' is-forest' : ''}${isMine ? ' is-mine' : ''}`}
                title={`Plot ${plotIndex + 1}`}
              >
                <div className="plotInnerGrid">
                  {Array.from({ length: 25 }, (_, spotIndex) => {
                    const spot = plots?.[plotIndex]?.spots?.[spotIndex];
                    const isSelected = selected?.plotIndex === plotIndex && selected?.spotIndex === spotIndex;
                    const visual = !isUnlocked
                      ? { glyph: 'X', className: 'is-locked-spot' }
                      : isForest
                        ? { glyph: '♣', className: 'is-forest' }
                        : isMine
                          ? { glyph: '◈', className: 'is-mine' }
                          : isCoop
                            ? { glyph: '◍', className: 'is-coop-spot' }
                            : getSpotVisual(spot, tick);

                    return (
                      <button
                        key={`${plotIndex}-${spotIndex}`}
                        type="button"
                        className={`spotCell ${visual.className}${isSelected ? ' is-selected' : ''}`}
                        onMouseDown={() => handleSpotPointerDown(plotIndex, spotIndex)}
                        onMouseEnter={(event) => handleSpotPointerEnter(plotIndex, spotIndex, event)}
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
