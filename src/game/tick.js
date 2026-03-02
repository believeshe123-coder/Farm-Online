import { CROPS } from './constants';

function addInventoryItem(inventory, itemId, amount = 1) {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  };
}

export function advanceTick(state) {
  const nextTick = state.tick + 1;
  let nextInventory = state.inventory;

  const nextTiles = state.tiles.map((tile) => {
    if (tile.kind !== 'crop') {
      if (tile.type !== 'coop' || !Array.isArray(tile.animals)) {
        return tile;
      }

      const nextAnimals = tile.animals.map((animal) => {
        if (animal.species !== 'chicken') {
          return animal;
        }

        const nextEggTimer = animal.eggTimer - 1;
        if (nextEggTimer <= 0) {
          nextInventory = addInventoryItem(nextInventory, 'egg', 1);
          return {
            ...animal,
            eggTimer: animal.traits.eggRateTicks,
          };
        }

        return {
          ...animal,
          eggTimer: nextEggTimer,
        };
      });

      return {
        ...tile,
        animals: nextAnimals,
      };
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
    inventory: nextInventory,
  };

  return nextState;
}
