import { CROPS } from './constants';

export function advanceTick(state) {
  const nextTick = state.tick + 1;
  const nextTiles = state.tiles.map((tile) => {
    if (tile.kind !== 'crop') {
      return tile;
    }

    const crop = CROPS[tile.cropId];
    if (!crop) {
      return tile;
    }

    const isReady = nextTick - tile.plantedAtTick >= crop.growTime;
    return {
      ...tile,
      isReady,
      type: isReady ? 'ready' : 'growing',
    };
  });

  const nextState = {
    ...state,
    tick: nextTick,
    tiles: nextTiles,
  };

  return nextState;
}
