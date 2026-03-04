import { CROPS, SELLABLE_ITEMS, MARKET_DAILY_UPDATE_INTERVAL, MARKET_WEEKLY_UPDATE_INTERVAL, clampMarketPrice, getBaselineMarketPrices, getBuildingChainModuleProfile, getZoneCycleConfig } from './constants.js';
import { DAY_TICKS, canAffordFromPools } from './economy.js';
import { applyCost, applyYield, canAffordCost, getCurrentSellPrice, isCropHydratedAtTick } from './actions.js';
import {
  allocateWorkersByPriority,
  getAverageAssignmentFatigue,
  getThroughputMultiplier,
  updateWorkerFatigue,
  withAutomationDefaults,
} from './workers.js';
import { processContractDeadlines, refreshContractOffers, settleContractSales } from './contracts.js';
import { applyDailyProgression, getProgressionEffects, getScaledUpkeepCost, isFeatureUnlocked } from './progression.js';

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


function addResourceMap(a = {}, b = {}) {
  const next = { ...a };
  Object.entries(b).forEach(([resourceId, amount]) => {
    if (!amount) {
      return;
    }
    next[resourceId] = (next[resourceId] ?? 0) + amount;
  });
  return next;
}

function deriveRawProduction(state, tick, workerAllocation) {
  let rawProduction = {};

  state.plots.forEach((plot, plotIndex) => {
    if (!state.unlockedTiles?.[plotIndex] || !Array.isArray(plot?.spots)) {
      return;
    }

    const workers = workerAllocation?.allocation?.[getAssignmentId('plot', plotIndex)] ?? 0;
    const automation = withAutomationDefaults(plot.automation);
    if (!automation.enabled || workers < 1) {
      return;
    }

    const zoneConfig = getZoneCycleConfig(plot.zoneType, plot.level, plot.productionPolicy);
    if (tick % zoneConfig.cycleTimeTicks !== 0) {
      return;
    }

    const { inventoryYield } = splitYieldMap(zoneConfig.outputs, state);
    rawProduction = addResourceMap(rawProduction, inventoryYield);
  });

  return rawProduction;
}

function processBuildingChain(state, rawProduction, nextTick) {
  const chain = state.buildingChain ?? {};
  const safeModules = {
    storage: isFeatureUnlocked(state, 'buildings', chain.modules?.storage) ? chain.modules?.storage : 'silo',
    processing: isFeatureUnlocked(state, 'buildings', chain.modules?.processing) ? chain.modules?.processing : 'mill',
    export: isFeatureUnlocked(state, 'buildings', chain.modules?.export) ? chain.modules?.export : 'market_stall',
  };
  const profile = getBuildingChainModuleProfile(safeModules);
  const capacityByResource = { ...(profile.storage.capacityByResource ?? {}), ...(chain.capacityByResource ?? {}) };
  let storage = { ...(chain.storage ?? {}) };

  const throughputStatus = [];

  Object.entries(rawProduction).forEach(([resourceId, amount]) => {
    const cap = capacityByResource[resourceId] ?? 0;
    const current = storage[resourceId] ?? 0;
    const admitted = Math.max(0, Math.min(amount, cap - current));
    storage[resourceId] = current + admitted;
    if (admitted < amount) {
      throughputStatus.push('Storage full');
    }
  });

  const processingKey = profile.processingId;
  const recipes = profile.processing.recipes ?? {};
  const progressionEffects = getProgressionEffects(state.progression);
  const queueCapacity = profile.processing.queueCapacity ?? 0;
  const processingQueues = {
    mill: [...(chain.processingQueues?.mill ?? [])],
    workshop: [...(chain.processingQueues?.workshop ?? [])],
  };
  const activeQueue = processingQueues[processingKey] ?? [];

  Object.entries(recipes).forEach(([recipeId, recipe]) => {
    let canEnqueue = true;
    while (canEnqueue) {
      const hasInputs = Object.entries(recipe.inputs ?? {}).every(([resourceId, needed]) => (storage[resourceId] ?? 0) >= needed);
      if (!hasInputs) {
        throughputStatus.push('Input starvation');
        break;
      }

      if (activeQueue.length >= queueCapacity) {
        throughputStatus.push('No processor capacity');
        break;
      }

      Object.entries(recipe.inputs ?? {}).forEach(([resourceId, needed]) => {
        storage[resourceId] = Math.max(0, (storage[resourceId] ?? 0) - needed);
      });

      const scaledOutputs = Object.fromEntries(
        Object.entries(recipe.outputs ?? {}).map(([resourceId, outputAmount]) => [
          resourceId,
          Math.max(0, Math.floor(outputAmount * progressionEffects.conversionRateMultiplier)),
        ])
      );
      activeQueue.push({ recipeId, remainingTicks: recipe.durationTicks ?? 1, outputs: scaledOutputs });

      canEnqueue = false;
    }
  });

  const remainingQueue = [];
  const completedOutput = {};
  activeQueue.forEach((job) => {
    const remainingTicks = (job.remainingTicks ?? 1) - 1;
    if (remainingTicks <= 0) {
      Object.entries(job.outputs ?? {}).forEach(([resourceId, amount]) => {
        completedOutput[resourceId] = (completedOutput[resourceId] ?? 0) + amount;
      });
      return;
    }

    remainingQueue.push({ ...job, remainingTicks });
  });
  processingQueues[processingKey] = remainingQueue;

  Object.entries(completedOutput).forEach(([resourceId, amount]) => {
    const cap = capacityByResource[resourceId] ?? 0;
    const current = storage[resourceId] ?? 0;
    const admitted = Math.max(0, Math.min(amount, cap - current));
    storage[resourceId] = current + admitted;
    if (admitted < amount) {
      throughputStatus.push('Storage full');
    }
  });

  const exportCaps = {
    perTick: profile.export.perTick ?? 0,
    perDay: profile.export.perDay ?? 0,
  };

  const exportQueue = { ...(chain.exportQueue ?? {}) };
  Object.entries(storage).forEach(([resourceId, amount]) => {
    if (amount > 0 && SELLABLE_ITEMS[resourceId]) {
      exportQueue[resourceId] = (exportQueue[resourceId] ?? 0) + amount;
      storage[resourceId] = 0;
    }
  });

  const dayChanged = nextTick % DAY_TICKS === 0;
  const exportedTodayBase = dayChanged ? 0 : (chain.exportedToday ?? 0);
  let exportedToday = exportedTodayBase;
  const perDayRemaining = Math.max(0, exportCaps.perDay - exportedTodayBase);
  let perTickRemaining = Math.min(exportCaps.perTick, perDayRemaining);
  let coinsFromExport = 0;

  Object.keys(exportQueue).forEach((resourceId) => {
    if (perTickRemaining <= 0) {
      return;
    }
    const queued = exportQueue[resourceId] ?? 0;
    if (queued <= 0) {
      return;
    }

    const exported = Math.min(queued, perTickRemaining);
    exportQueue[resourceId] = queued - exported;
    perTickRemaining -= exported;
    exportedToday += exported;
    coinsFromExport += exported * (state.market?.prices?.[resourceId] ?? SELLABLE_ITEMS[resourceId]?.baselinePrice ?? 0);
  });

  const dedupedStatus = [...new Set(throughputStatus)];

  return {
    ...state,
    buildingChain: {
      ...chain,
      modules: {
        storage: profile.storageId,
        processing: profile.processingId,
        export: profile.exportId,
      },
      capacityByResource,
      rawProduction,
      storage,
      processingQueues,
      exportQueue,
      exportCaps,
      exportedToday,
      exportDayStartedAtTick: dayChanged ? nextTick : (chain.exportDayStartedAtTick ?? 0),
    },
    economyStatus: {
      ...(state.economyStatus ?? {}),
      throughputStatus: dedupedStatus,
    },
    chainExportCoins: coinsFromExport,
  };
}


function updateMarketPrices(state, tick) {
  const baselinePrices = getBaselineMarketPrices();
  const currentPrices = state.market?.prices ?? baselinePrices;
  const currentTrends = state.market?.trends ?? {};
  const isDaily = tick % MARKET_DAILY_UPDATE_INTERVAL === 0;
  const isWeekly = tick % MARKET_WEEKLY_UPDATE_INTERVAL === 0;

  if (!isDaily && !isWeekly) {
    return state;
  }

  const nextPrices = { ...currentPrices };
  const nextTrends = { ...currentTrends };

  Object.keys(baselinePrices).forEach((itemId) => {
    const config = SELLABLE_ITEMS[itemId];
    const previous = currentPrices[itemId] ?? baselinePrices[itemId];
    let multiplier = 1;

    if (isDaily) {
      multiplier += (Math.random() * 2 - 1) * (config.dailyVolatility ?? 0);
    }

    if (isWeekly) {
      multiplier += (Math.random() * 2 - 1) * (config.weeklyVolatility ?? 0);
    }

    const updatedPrice = clampMarketPrice(itemId, previous * multiplier);
    nextPrices[itemId] = updatedPrice;
    nextTrends[itemId] = Number((((updatedPrice - previous) / Math.max(1, previous)) * 100).toFixed(2));
  });

  return {
    ...state,
    market: {
      prices: nextPrices,
      trends: nextTrends,
      lastDailyUpdateTick: isDaily ? tick : (state.market?.lastDailyUpdateTick ?? 0),
      lastWeeklyUpdateTick: isWeekly ? tick : (state.market?.lastWeeklyUpdateTick ?? 0),
    },
  };
}

function processGlobalAutoSell(state, nextTick) {
  const policy = state.autoSellPolicy ?? {};
  if (!policy.enabled) {
    return state;
  }

  let nextState = state;
  let nextInventory = state.inventory;
  const soldMap = {};

  Object.keys(nextInventory).forEach((itemId) => {
    if (!SELLABLE_ITEMS[itemId]) {
      return;
    }

    const minStockByItem = policy.minStockByItem ?? {};
    const minStock = Math.max(0, Number(minStockByItem[itemId] ?? policy.defaultMinStock ?? 0) || 0);
    const current = nextInventory[itemId] ?? 0;
    const qtyToSell = Math.max(0, current - minStock);
    if (qtyToSell <= 0) {
      return;
    }

    nextInventory = applyInventoryCost(nextInventory, { [itemId]: qtyToSell });
    const price = getCurrentSellPrice(nextState, itemId);
    nextState = applyYield(nextState, { coins: qtyToSell * price });
    soldMap[itemId] = (soldMap[itemId] ?? 0) + qtyToSell;
  });

  const contractSettlement = settleContractSales(nextState.contracts, soldMap, nextTick);
  nextState = {
    ...nextState,
    inventory: nextInventory,
    contracts: contractSettlement.contractsState,
  };

  if (contractSettlement.bonusCoins > 0) {
    nextState = applyYield(nextState, { coins: contractSettlement.bonusCoins });
  }

  return nextState;
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

        const buyPrice = (getCurrentSellPrice(nextState, itemId) || seedSell.baselinePrice || 0) * 2;
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
        const salePrice = getCurrentSellPrice(nextState, itemId);
        nextState = applyYield(nextState, { coins: qtyToSell * salePrice });
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

  const rawProduction = deriveRawProduction(workingState, nextTick, workerAllocation);
  workingState = processBuildingChain(workingState, rawProduction, nextTick);

  if ((workingState.chainExportCoins ?? 0) > 0) {
    workingState = applyYield(workingState, { coins: workingState.chainExportCoins });
  }

  if (Object.prototype.hasOwnProperty.call(workingState, 'chainExportCoins')) {
    const { chainExportCoins, ...stateWithoutChainExportCoins } = workingState;
    workingState = stateWithoutChainExportCoins;
  }

  workingState = processAutoTrading(workingState, nextTick);
  workingState = processGlobalAutoSell(workingState, nextTick);
  workingState = updateMarketPrices(workingState, nextTick);

  const deadlineResult = processContractDeadlines(workingState.contracts, nextTick);
  workingState = {
    ...workingState,
    contracts: deadlineResult.contractsState,
  };

  if (deadlineResult.penalties > 0) {
    workingState = applyCost(workingState, { coins: Math.min(deadlineResult.penalties, workingState.money ?? 0) });
  }

  if (nextTick % DAY_TICKS === 0) {
    Object.entries(workingState.dailyUpkeepDemands ?? {}).forEach(([demandId, demandCost]) => {
      const scaledDemandCost = getScaledUpkeepCost(demandCost, workingState.progression);
      if (canAffordFromPools(workingState.resourcePools ?? {}, scaledDemandCost)) {
        workingState = applyCost(workingState, scaledDemandCost);
      } else {
        shortages.push(`upkeep:${demandId}`);
      }
    });

    workingState = applyYield(workingState, { water: 3 });

    if (nextTick % MARKET_WEEKLY_UPDATE_INTERVAL === 0) {
      workingState = {
        ...workingState,
        contracts: refreshContractOffers(workingState.contracts, nextTick),
      };
    }
  }

  workingState = applyDailyProgression(workingState, nextTick);

  return {
    ...workingState,
    economyStatus: {
      ...(workingState.economyStatus ?? {}),
      lastShortages: shortages,
      lastUpkeepTick: nextTick,
    },
  };
}
