import { CROPS } from './constants.js';
import { isCropHydratedAtTick } from './actions.js';

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
    if ((tile.type === 'forest' || tile.type === 'mine') && tile.resource) {
      const nextCharge = Math.min(tile.resource.maxCharge, tile.resource.charge + 1);
      return {
        ...tile,
        resource: {
          ...tile.resource,
          charge: nextCharge,
        },
      };
    }

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
  });

  const nextPlots = state.plots.map((plot, plotIndex) => {
    if (!state.unlockedTiles[plotIndex] || !Array.isArray(plot?.spots)) {
      return plot;
    }

    return {
      ...plot,
      spots: plot.spots.map((spot) => {
        if (!spot.crop) {
          return spot;
        }

        const crop = CROPS[spot.crop.cropId];
        if (!crop) {
          return spot;
        }

        const isHydrated = isCropHydratedAtTick(spot.crop, nextTick);

        return {
          ...spot,
          soil: isHydrated ? 'watered' : 'hoed',
          crop: {
            ...spot.crop,
            watered: isHydrated,
          },
        };
      }),
    };
  });

  return {
    ...state,
    tick: nextTick,
    tiles: nextTiles,
    plots: nextPlots,
    inventory: nextInventory,
  };
}
