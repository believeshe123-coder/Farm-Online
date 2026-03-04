import { CROPS, SELLABLE_ITEMS, getZoneCycleConfig } from './constants.js';
import { DAY_TICKS, canAffordFromPools } from './economy.js';
import { applyCost, applyYield, canAffordCost, isCropHydratedAtTick } from './actions.js';
import {
  allocateWorkersByPriority,
  getAverageAssignmentFatigue,
  getThroughputMultiplier,
  updateWorkerFatigue,
  withAutomationDefaults,
} from './workers.js';

function addInventoryItem(inventory, itemId, amount = 1) {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  };
}

function hasInventoryCost(inventory, costMap = {}, minimumStock = 0) {
  return Object.entries(costMap).every(([itemId, amount]) => (inventory[itemId] ?? 0) >= (amount + minimumStock));
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

function getAssignmentId(kind, index) {
  return `${kind}:${index}`;
}

function processAutoTrading(state, nextTick) {
  let nextState = state;
  let nextInventory = state.inventory;
  const sellQueue = [];

  state.plots.forEach((plot) => {
    const automation = withAutomationDefaults(plot.automation);
    if (!automation.enabled) {
      return;
    }

    const zoneConfig = getZoneCycleConfig(plot.zoneType, plot.level, plot.productionPolicy);
    const { inventoryCost } = splitCostMap(zoneConfig.inputs, state);

    if (automation.autoBuyInputs) {
      Object.entries(inventoryCost).forEach(([itemId, amount]) => {
        const targetMin = Math.max(automation.minInputStock, amount);
        const current = nextInventory[itemId] ?? 0;
        const deficit = Math.max(0, targetMin - current);
        const seedSell = SELLABLE_ITEMS[itemId];
        if (!seedSell || deficit <= 0) {
          return;
        }

        const buyPrice = (seedSell.sellPrice ?? 0) * 2;
        const affordableQty = Math.floor((nextState.money ?? 0) / buyPrice);
        const qty = Math.min(deficit, affordableQty);
        if (qty <= 0) {
          return;
        }

        nextState = applyCost(nextState, { coins: qty * buyPrice });
        nextInventory = addInventoryItem(nextInventory, itemId, qty);
      });
    }

    if (automation.autoSellOutputs) {
      Object.keys(zoneConfig.outputs).forEach((itemId) => {
        const current = nextInventory[itemId] ?? 0;
        const threshold = Math.max(0, automation.targetOutputStock);
        const qtyToSell = Math.max(0, current - threshold);
        if (qtyToSell <= 0 || !SELLABLE_ITEMS[itemId]) {
          return;
        }

        nextInventory = applyInventoryCost(nextInventory, { [itemId]: qtyToSell });
        nextState = applyYield(nextState, { coins: qtyToSell * SELLABLE_ITEMS[itemId].sellPrice });
        sellQueue.push({ itemId, qty: qtyToSell, tick: nextTick });
      });
    }
  });

  return {
    ...nextState,
    inventory: nextInventory,
    sellQueue,
  };
}

function processZoneCycle(state, plot, tick, shortages, plotIndex, workerCount = 0) {
  const zoneConfig = getZoneCycleConfig(plot.zoneType, plot.level, plot.productionPolicy);
  const automation = withAutomationDefaults(plot.automation);

  if (!automation.enabled || workerCount < 1 || tick % zoneConfig.cycleTimeTicks !== 0) {
    return state;
  }

  const requiredWorkers = zoneConfig.workerRequirement;
  const averageFatigue = getAverageAssignmentFatigue(state.workers, getAssignmentId('plot', plotIndex));
  const throughputMultiplier = getThroughputMultiplier({
    assignedWorkers: workerCount,
    requiredWorkers,
    toolLevel: state.workerConfig?.toolLevel ?? 0,
    fatigueEnabled: Boolean(state.workerConfig?.fatigueEnabled),
    upkeepEnabled: Boolean(state.workerConfig?.upkeepEnabled),
    averageFatigue,
  });

  if (throughputMultiplier <= 0) {
    shortages.push(`idle-workers:${zoneConfig.zoneType}:${plotIndex}`);
    return state;
  }

  const { poolCost, inventoryCost } = splitCostMap(zoneConfig.inputs, state);
  const minInputStock = Math.max(0, Number(automation.minInputStock) || 0);
  if (!canAffordCost(state, poolCost) || !hasInventoryCost(state.inventory, inventoryCost, minInputStock)) {
    shortages.push(`zone-input:${zoneConfig.zoneType}:${plotIndex}`);
    return state;
  }

  let nextState = state;
  if (Object.keys(poolCost).length > 0) {
    nextState = applyCost(nextState, poolCost);
  }

  let nextInventory = applyInventoryCost(nextState.inventory, inventoryCost);
  const { poolYield, inventoryYield } = splitYieldMap(zoneConfig.outputs, nextState);

  const scaledPoolYield = Object.fromEntries(
    Object.entries(poolYield).map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(amount * throughputMultiplier))])
  );
  const scaledInventoryYield = Object.fromEntries(
    Object.entries(inventoryYield).map(([resourceId, amount]) => [resourceId, Math.max(0, Math.floor(amount * throughputMultiplier))])
  );

  if (Object.keys(scaledPoolYield).length > 0) {
    nextState = applyYield(nextState, scaledPoolYield);
  }

  Object.entries(scaledInventoryYield).forEach(([resourceId, amount]) => {
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

function allocateAutomationWorkers(state) {
  const assignments = [];

  state.plots.forEach((plot, index) => {
    if (!state.unlockedTiles[index] || !Array.isArray(plot?.spots)) {
      return;
    }

    const automation = withAutomationDefaults(plot.automation);
    assignments.push({
      id: getAssignmentId('plot', index),
      enabled: automation.enabled,
      priority: Number(automation.priority) || 0,
      maxWorkers: Math.max(0, Number(plot.assignedWorkers) || 0),
    });
  });

  state.tiles.forEach((tile, index) => {
    if (!state.unlockedTiles[index] || !tile || tile.type === 'empty') {
      return;
    }

    const automation = withAutomationDefaults(tile.automation);
    assignments.push({
      id: getAssignmentId('tile', index),
      enabled: automation.enabled,
      priority: Number(automation.priority) || 0,
      maxWorkers: 1,
    });
  });

  return allocateWorkersByPriority(state.workers ?? [], assignments);
}

export function advanceTick(state) {
  const nextTick = state.tick + 1;
  const buildingOperatingCosts = state.buildingOperatingCosts ?? {};
  const maintenanceConfig = state.buildingMaintenanceConfig ?? {};
  const nextMaintenanceTimers = { ...(state.buildingMaintenanceTimers ?? {}) };
  const workerAllocation = allocateAutomationWorkers(state);

  let workingState = {
    ...state,
    tick: nextTick,
    workers: workerAllocation.workers,
  };

  const shortages = [];
  let nextInventory = state.inventory;
  const activeWorkerAssignments = new Set();

  const nextTiles = state.tiles.map((tile, tileIndex) => {
    if (!tile || tile.type === 'empty') {
      return tile;
    }

    const tileWorkers = workerAllocation.allocation[getAssignmentId('tile', tileIndex)] ?? 0;
    if (tileWorkers <= 0) {
      shortages.push(`unstaffed:${tile.type}:${tileIndex}`);
      return tile;
    }

    activeWorkerAssignments.add(getAssignmentId('tile', tileIndex));

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
      const chargeGain = Math.max(0, Math.floor(efficiency * tileWorkers));
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

    const eggProgressStep = efficiency >= 1 ? 1 + (tileWorkers - 1) * 0.25 : 0.5;
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

    const plotWorkerCount = workerAllocation.allocation[getAssignmentId('plot', plotIndex)] ?? 0;
    if (plotWorkerCount > 0) {
      activeWorkerAssignments.add(getAssignmentId('plot', plotIndex));
    }

    workingState = processZoneCycle(workingState, plot, nextTick, shortages, plotIndex, plotWorkerCount);
    return plot;
  });

  workingState = {
    ...workingState,
    workers: updateWorkerFatigue(
      workingState.workers,
      activeWorkerAssignments,
      Boolean(workingState.workerConfig?.fatigueEnabled)
    ),
  };

  workingState = processAutoTrading(workingState, nextTick);

  if (nextTick % DAY_TICKS === 0) {
    Object.entries(workingState.dailyUpkeepDemands ?? {}).forEach(([demandId, demandCost]) => {
      if (canAffordFromPools(workingState.resourcePools ?? {}, demandCost)) {
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
