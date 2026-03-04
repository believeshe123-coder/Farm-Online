import { CROPS } from './constants.js';
import { applyCost, applyYield, canAffordCost, isCropHydratedAtTick } from './actions.js';
import { DAY_TICKS } from './economy.js';

function addInventoryItem(inventory, itemId, amount = 1) {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  };
}

function reduceCostMap(costMap = {}, multiplier = 1) {
  return Object.fromEntries(
    Object.entries(costMap).map(([resourceId, amount]) => [resourceId, Math.max(0, amount * multiplier)])
  );
}

export function advanceTick(state) {
  const nextTick = state.tick + 1;
  const buildingOperatingCosts = state.buildingOperatingCosts ?? {};
  const maintenanceConfig = state.buildingMaintenanceConfig ?? {};
  const nextMaintenanceTimers = { ...(state.buildingMaintenanceTimers ?? {}) };

  let workingState = {
    ...state,
    tick: nextTick,
  };

  const shortages = [];
  let nextInventory = state.inventory;

  const nextTiles = state.tiles.map((tile, tileIndex) => {
    if (!tile || tile.type === 'empty') {
      return tile;
    }

    const buildingId = tile.buildingId ?? tile.type;
    const baseOperatingCost = buildingOperatingCosts[buildingId] ?? {};
    let efficiency = 1;

    if (Object.keys(baseOperatingCost).length > 0) {
      if (canAffordCost(workingState, baseOperatingCost)) {
        workingState = applyCost(workingState, baseOperatingCost);
      } else {
        const reducedCost = reduceCostMap(baseOperatingCost, 0.5);
        if (canAffordCost(workingState, reducedCost)) {
          workingState = applyCost(workingState, reducedCost);
          efficiency = 0.5;
          shortages.push(`reduced:${buildingId}:${tileIndex}`);
        } else {
          efficiency = 0;
          shortages.push(`idle:${buildingId}:${tileIndex}`);
        }
      }
    }

    const maintenance = maintenanceConfig[buildingId];
    const timer = (nextMaintenanceTimers[tileIndex] ?? 0) + 1;
    let maintenancePaid = true;

    if (maintenance?.intervalTicks && timer >= maintenance.intervalTicks) {
      if (canAffordCost(workingState, maintenance.cost)) {
        workingState = applyCost(workingState, maintenance.cost);
      } else {
        maintenancePaid = false;
        shortages.push(`maintenance:${buildingId}:${tileIndex}`);
      }
      nextMaintenanceTimers[tileIndex] = 0;
    } else {
      nextMaintenanceTimers[tileIndex] = timer;
    }

    if (!maintenancePaid) {
      efficiency *= 0.5;
    }

    if ((tile.type === 'forest' || tile.type === 'mine') && tile.resource) {
      const chargeGain = Math.max(0, Math.floor(efficiency));
      const nextCharge = Math.min(tile.resource.maxCharge, tile.resource.charge + chargeGain);
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

    if (efficiency === 0) {
      return tile;
    }

    const eggProgressStep = efficiency >= 1 ? 1 : 0.5;
    const nextAnimals = tile.animals.map((animal) => {
      if (animal.species !== 'chicken') {
        return animal;
      }

      const nextEggTimer = animal.eggTimer - eggProgressStep;
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

  if (nextTick % DAY_TICKS === 0) {
    const upkeepEntries = Object.entries(state.dailyUpkeepDemands ?? {});
    for (const [upkeepId, demand] of upkeepEntries) {
      if (canAffordCost(workingState, demand)) {
        workingState = applyCost(workingState, demand);

        if (upkeepId === 'pumps') {
          workingState = applyYield(workingState, { water: 3 });
        }
      } else {
        shortages.push(`upkeep:${upkeepId}`);
      }
    }
  }

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

  workingState = {
    ...workingState,
    tiles: nextTiles,
    plots: nextPlots,
    inventory: nextInventory,
    buildingMaintenanceTimers: nextMaintenanceTimers,
  };

  return {
    ...workingState,
    economyStatus: {
      ...(workingState.economyStatus ?? {}),
      lastShortages: shortages,
      lastUpkeepTick: nextTick,
    },
  };
}
