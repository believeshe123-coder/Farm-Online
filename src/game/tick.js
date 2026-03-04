import { CROPS, getZoneCycleConfig } from './constants.js';
import { DAY_TICKS } from './economy.js';
import { applyCost, applyYield, canAffordCost, isCropHydratedAtTick } from './actions.js';

function addInventoryItem(inventory, itemId, amount = 1) {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  };
}

function hasInventoryCost(inventory, costMap = {}) {
  return Object.entries(costMap).every(([itemId, amount]) => (inventory[itemId] ?? 0) >= amount);
}

function applyInventoryCost(inventory, costMap = {}) {
  const nextInventory = { ...inventory };

  for (const [itemId, amount] of Object.entries(costMap)) {
    if (amount <= 0) {
      continue;
    }

    const nextAmount = (nextInventory[itemId] ?? 0) - amount;
    if (nextAmount <= 0) {
      delete nextInventory[itemId];
    } else {
      nextInventory[itemId] = nextAmount;
    }
  }

  return nextInventory;
}

function splitCostMap(costMap = {}, state) {
  const poolIds = new Set(Object.keys(state.resourcePools ?? {}));

  return Object.entries(costMap).reduce((parts, [resourceId, amount]) => {
    if (poolIds.has(resourceId)) {
      parts.poolCost[resourceId] = amount;
    } else {
      parts.inventoryCost[resourceId] = amount;
    }
    return parts;
  }, { poolCost: {}, inventoryCost: {} });
}

function splitYieldMap(yieldMap = {}, state) {
  const poolIds = new Set(Object.keys(state.resourcePools ?? {}));

  return Object.entries(yieldMap).reduce((parts, [resourceId, amount]) => {
    if (poolIds.has(resourceId)) {
      parts.poolYield[resourceId] = amount;
    } else {
      parts.inventoryYield[resourceId] = amount;
    }
    return parts;
  }, { poolYield: {}, inventoryYield: {} });
}

function processZoneCycle(state, plot, tick, shortages, plotIndex) {
  const zoneConfig = getZoneCycleConfig(plot.zoneType, plot.level, plot.productionPolicy);
  const workers = Math.max(0, Number(plot.assignedWorkers) || 0);

  if (workers < zoneConfig.workerRequirement || tick % zoneConfig.cycleTimeTicks !== 0) {
    return state;
  }

  const { poolCost, inventoryCost } = splitCostMap(zoneConfig.inputs, state);
  if (!canAffordCost(state, poolCost) || !hasInventoryCost(state.inventory, inventoryCost)) {
    shortages.push(`zone-input:${zoneConfig.zoneType}:${plotIndex}`);
    return state;
  }

  let nextState = state;
  if (Object.keys(poolCost).length > 0) {
    nextState = applyCost(nextState, poolCost);
  }

  let nextInventory = applyInventoryCost(nextState.inventory, inventoryCost);
  const { poolYield, inventoryYield } = splitYieldMap(zoneConfig.outputs, nextState);

  if (Object.keys(poolYield).length > 0) {
    nextState = applyYield(nextState, poolYield);
  }

  Object.entries(inventoryYield).forEach(([resourceId, amount]) => {
    nextInventory = addInventoryItem(nextInventory, resourceId, amount);
  });

  return {
    ...nextState,
    inventory: nextInventory,
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

    if (tile.type !== 'coop' || !Array.isArray(tile.animals) || efficiency === 0) {
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

  let nextPlots = state.plots.map((plot, plotIndex) => {
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

  nextPlots = nextPlots.map((plot, plotIndex) => {
    if (!state.unlockedTiles[plotIndex] || !Array.isArray(plot?.spots)) {
      return plot;
    }

    workingState = processZoneCycle(workingState, plot, nextTick, shortages, plotIndex);
    return plot;
  });


  if (nextTick % DAY_TICKS === 0) {
    Object.entries(workingState.dailyUpkeepDemands ?? {}).forEach(([demandId, demandCost]) => {
      if (canAffordCost(workingState, demandCost)) {
        workingState = applyCost(workingState, demandCost);
      } else {
        shortages.push(`upkeep:${demandId}`);
      }
    });

    workingState = applyYield(workingState, { water: 3 });
  }

  return {
    ...workingState,
    economyStatus: {
      ...(workingState.economyStatus ?? {}),
      lastShortages: shortages,
      lastUpkeepTick: nextTick,
    },
  };
}
