import { CROPS } from './constants.js';
import { isCropHydratedAtTick } from './actions.js';

const DEBRIS_SPAWN_INTERVAL = 5;

function getDebrisWeights(resourceProfile = 'mixed') {
  if (resourceProfile === 'forest') {
    return { wood: 0.65, rock: 0.15, seeds: 0.2 };
  }

  if (resourceProfile === 'rock') {
    return { wood: 0.15, rock: 0.65, seeds: 0.2 };
  }

  if (resourceProfile === 'seeds') {
    return { wood: 0.15, rock: 0.2, seeds: 0.65 };
  }

  return { wood: 0.34, rock: 0.33, seeds: 0.33 };
}

function rollDebrisByWeights(resourceProfile = 'mixed') {
  const weights = getDebrisWeights(resourceProfile);
  let roll = Math.random();

  if (roll < weights.wood) {
    return 'wood';
  }

  roll -= weights.wood;
  if (roll < weights.rock) {
    return 'rock';
  }

  return 'seeds';
}

function spawnDebrisForPlot(plot) {
  if (!Array.isArray(plot?.spots)) {
    return plot;
  }

  const spawnableIndexes = plot.spots
    .map((spot, index) => (spot && !spot.crop && !spot.debris && spot.soil === 'raw' ? index : -1))
    .filter((index) => index >= 0);

  if (spawnableIndexes.length === 0) {
    return plot;
  }

  const spawnIndex = spawnableIndexes[Math.floor(Math.random() * spawnableIndexes.length)];
  const spots = [...plot.spots];
  spots[spawnIndex] = {
    ...spots[spawnIndex],
    debris: rollDebrisByWeights(plot.resourceProfile),
  };

  return {
    ...plot,
    spots,
  };
}

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

  const shouldSpawnPlotDebris = nextTick % DEBRIS_SPAWN_INTERVAL === 0;

  const nextPlots = state.plots.map((plot, plotIndex) => {
    if (!state.unlockedTiles[plotIndex] || !Array.isArray(plot?.spots)) {
      return plot;
    }

    let nextPlot = {
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

    if (shouldSpawnPlotDebris) {
      nextPlot = spawnDebrisForPlot(nextPlot);
    }

    return nextPlot;
  });

  return {
    ...state,
    tick: nextTick,
    tiles: nextTiles,
    plots: nextPlots,
    inventory: nextInventory,
  };
}
