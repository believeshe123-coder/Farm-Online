import { BUILDING_CHAIN_MODULES, CROPS, SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS, WATERING_DURATION_TICKS, ZONE_TYPES, getBuildingChainModuleProfile } from './constants.js';
import { canResearchTech, isFeatureUnlocked, researchTech } from './progression.js';
import { acceptContract, settleContractSales } from './contracts.js';
import { withAutomationDefaults } from './workers.js';
import { createPlot } from './createNewGame.js';
import { applyCostToPools, applyYieldToPools, canAffordFromPools } from './economy.js';

const BASE_UNLOCK_PLOT_COST = 25;



function withBuildingChainModule(state, moduleType, moduleId) {
  const chain = state.buildingChain ?? {};
  const modules = {
    storage: chain.modules?.storage ?? 'silo',
    processing: chain.modules?.processing ?? 'mill',
    export: chain.modules?.export ?? 'market_stall',
  };

  if (!BUILDING_CHAIN_MODULES[moduleType]?.[moduleId]) {
    return state;
  }

  modules[moduleType] = moduleId;
  const profile = getBuildingChainModuleProfile(modules);

  return {
    ...state,
    buildingChain: {
      ...chain,
      modules,
      capacityByResource: { ...(profile.storage.capacityByResource ?? {}) },
      exportCaps: {
        perTick: profile.export.perTick ?? 0,
        perDay: profile.export.perDay ?? 0,
      },
    },
  };
}

function isTileUnlocked(state, tileIndex) {
  return Boolean(state.unlockedTiles?.[tileIndex]);
}

function withUiMessage(state, message) {
  return {
    ...state,
    uiMessage: message,
  };
}

function getUnlockedPlotCount(state) {
  return state.unlockedTiles.filter(Boolean).length;
}

function getUnlockPlotCost(state) {
  return BASE_UNLOCK_PLOT_COST * getUnlockedPlotCount(state);
}


function getAdjacentLockedTiles(gridSize, unlockedTiles) {
  const adjacent = [];

  unlockedTiles.forEach((isUnlocked, index) => {
    if (!isUnlocked) {
      return;
    }

    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [neighborRow, neighborCol] of neighbors) {
      if (neighborRow < 0 || neighborRow >= gridSize || neighborCol < 0 || neighborCol >= gridSize) {
        continue;
      }

      const neighborIndex = neighborRow * gridSize + neighborCol;
      if (!unlockedTiles[neighborIndex]) {
        adjacent.push(neighborIndex);
      }
    }
  });

  return [...new Set(adjacent)].sort((a, b) => a - b);
}

const COMMON_CHICKEN_TRAITS = {
  color: 'white',
  size: 'medium',
  eggRateTicks: 20,
  rarity: 'common',
};

function createChicken(id, traits = COMMON_CHICKEN_TRAITS) {
  return {
    id,
    species: 'chicken',
    traits: { ...traits },
    eggTimer: traits.eggRateTicks,
  };
}

function createStarterChickens() {
  return [createChicken('chicken-1'), createChicken('chicken-2')];
}

function chooseTrait(parentA, parentB, traitKey) {
  return Math.random() < 0.5 ? parentA.traits[traitKey] : parentB.traits[traitKey];
}

function adjustInventory(inventory, itemId, delta) {
  const nextAmount = (inventory[itemId] ?? 0) + delta;
  if (nextAmount < 0) {
    return null;
  }

  const nextInventory = { ...inventory };
  if (nextAmount === 0) {
    delete nextInventory[itemId];
  } else {
    nextInventory[itemId] = nextAmount;
  }

  return nextInventory;
}

function getWorkingResourcePools(state) {
  const basePools = state.resourcePools ?? {};
  const coinPool = basePools.coins ?? { amount: 0, capacity: Infinity };
  const syncedCoinAmount = Math.max(coinPool.amount ?? 0, state.money ?? 0);

  return {
    ...basePools,
    coins: {
      ...coinPool,
      amount: syncedCoinAmount,
    },
  };
}

function withSynchronizedCoins(state, resourcePools) {
  return {
    ...state,
    resourcePools,
    money: resourcePools?.coins?.amount ?? state.money,
  };
}

export function canAffordCost(state, costMap) {
  const pools = getWorkingResourcePools(state);
  return canAffordFromPools(pools, costMap);
}

export function applyCost(state, costMap) {
  const pools = getWorkingResourcePools(state);
  const { resourcePools, paid } = applyCostToPools(pools, costMap);
  if (!paid) {
    return state;
  }

  return withSynchronizedCoins(state, resourcePools);
}

export function applyYield(state, yieldMap, overflowSaleMap = {}) {
  const pools = getWorkingResourcePools(state);
  const { resourcePools, overflow, soldAtLossCoins } = applyYieldToPools(pools, yieldMap, overflowSaleMap);

  return {
    ...withSynchronizedCoins(state, resourcePools),
    economyStatus: {
      ...(state.economyStatus ?? {}),
      lastOverflow: overflow,
      lastSoldAtLossCoins: soldAtLossCoins,
    },
  };
}


function debrisToInventoryItem(debris) {
  if (debris === 'wood') {
    return 'wood';
  }

  if (debris === 'seeds') {
    return 'seeds';
  }

  if (debris === 'rock') {
    return 'rock';
  }

  return null;
}

export function getRandomCropId() {
  const weightedCrops = Object.entries(CROPS).map(([cropId, crop]) => ({
    cropId,
    // Strongly favor cheaper seeds so rare/end-game crops are much less likely.
    weight: 1 / ((crop.seedBuyPrice ?? 1) ** 2),
  }));

  const totalWeight = weightedCrops.reduce((sum, crop) => sum + crop.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let roll = Math.random() * totalWeight;
  for (const crop of weightedCrops) {
    roll -= crop.weight;
    if (roll <= 0) {
      return crop.cropId;
    }
  }

  return weightedCrops[weightedCrops.length - 1]?.cropId ?? null;
}

function spotToCropId(seedId) {
  if (seedId === 'seeds') {
    return getRandomCropId();
  }

  if (!seedId?.endsWith('_seed')) {
    return null;
  }

  const cropId = seedId.slice(0, -5);
  return CROPS[cropId] ? cropId : null;
}


export function getWateringDurationTicks(cropId) {
  return CROPS[cropId]?.wateringDurationTicks ?? WATERING_DURATION_TICKS;
}

export function isCropHydratedAtTick(cropState, tick) {
  if (!cropState) {
    return false;
  }

  if (typeof cropState.lastWateredTick === 'number') {
    return (tick - cropState.lastWateredTick) <= getWateringDurationTicks(cropState.cropId);
  }

  return Boolean(cropState.watered);
}

function getEffectiveGrowTime(crop, cropState) {
  const isWatered = Boolean(cropState?.watered);
  if (crop.wateredGrowMultiplier && isWatered) {
    return crop.growTime * crop.wateredGrowMultiplier;
  }

  return crop.growTime;
}

function getHarvestSeedId(cropId) {
  return `${cropId}_seed`;
}

const MAX_HOTBAR_ITEM_SLOTS = 8;

function addItemToHotbar(hotbarItems = [], itemId, maxItemSlots = MAX_HOTBAR_ITEM_SLOTS) {
  if (hotbarItems.includes(itemId)) {
    return hotbarItems;
  }

  if (hotbarItems.length >= maxItemSlots) {
    return hotbarItems;
  }

  return [...hotbarItems, itemId];
}

function cleanupHotbarItems(hotbarItems = [], inventory = {}) {
  return hotbarItems.filter((itemId) => (inventory[itemId] ?? 0) > 0);
}

function isSpotReadyToHarvest(state, spot) {
  if (!spot?.crop) {
    return false;
  }

  const crop = CROPS[spot.crop.cropId];
  if (!crop) {
    return false;
  }

  const hydratedCropState = {
    ...spot.crop,
    watered: isCropHydratedAtTick(spot.crop, state.tick),
  };
  const growthProgress = (state.tick - spot.crop.plantedAtTick) / getEffectiveGrowTime(crop, hydratedCropState);
  return growthProgress >= 1;
}

export function onSpotClick(state, plotIndex, spotIndex) {
  if (!isTileUnlocked(state, plotIndex)) {
    return state;
  }

  const plot = state.plots?.[plotIndex];
  const spot = plot?.spots?.[spotIndex];
  const tile = state.tiles?.[plotIndex];
  if (!spot) {
    return state;
  }

  if (tile && tile.type !== 'empty') {
    return {
      ...state,
      selected: { plotIndex, spotIndex },
    };
  }

  if (isSpotReadyToHarvest(state, spot)) {
    const harvestedState = harvestSpot(state, plotIndex, spotIndex);
    return {
      ...harvestedState,
      selected: { plotIndex, spotIndex },
    };
  }

  if (spot.debris) {
    const debrisItemId = debrisToInventoryItem(spot.debris);
    let nextInventory = state.inventory;
    if (debrisItemId) {
      const inventoryWithDebris = adjustInventory(nextInventory, debrisItemId, 1);
      if (inventoryWithDebris) {
        nextInventory = inventoryWithDebris;
      }
    }

    const nextPlots = [...state.plots];
    const nextSpots = [...plot.spots];
    nextSpots[spotIndex] = {
      ...spot,
      debris: null,
    };

    nextPlots[plotIndex] = {
      ...plot,
      spots: nextSpots,
    };

    return {
      ...state,
      plots: nextPlots,
      inventory: nextInventory,
      hotbarItems: debrisItemId ? addItemToHotbar(state.hotbarItems, debrisItemId) : state.hotbarItems,
      selected: { plotIndex, spotIndex },
    };
  }

  const selectedHotbar = state.selectedTool;
  if (!selectedHotbar) {
    return {
      ...state,
      selected: { plotIndex, spotIndex },
    };
  }

  const nextPlots = [...state.plots];
  const nextSpots = [...plot.spots];
  const nextSpot = { ...spot };

  if (selectedHotbar.kind === 'tool' && selectedHotbar.id === 'hoe') {
    if (nextSpot.soil === 'raw' && nextSpot.crop === null) {
      nextSpot.soil = 'hoed';
    }
  }

  if (selectedHotbar.kind === 'tool' && selectedHotbar.id === 'water') {
    if (nextSpot.crop) {
      nextSpot.crop = {
        ...nextSpot.crop,
        watered: true,
        lastWateredTick: state.tick,
      };
      nextSpot.soil = 'watered';
    } else if (nextSpot.soil === 'hoed' && nextSpot.crop === null) {
      nextSpot.soil = 'watered';
    }
  }

  let nextInventory = state.inventory;
  if (selectedHotbar.kind === 'item') {
    const cropId = spotToCropId(selectedHotbar.id);
    const canPlant = nextSpot.soil === 'watered' && nextSpot.crop === null;
    if (cropId && canPlant) {
      const updatedInventory = adjustInventory(state.inventory, selectedHotbar.id, -1);
      if (updatedInventory) {
        nextInventory = updatedInventory;
        nextSpot.crop = {
          cropId,
          plantedAtTick: state.tick,
          watered: nextSpot.soil === 'watered',
          lastWateredTick: nextSpot.soil === 'watered' ? state.tick : null,
          regrowHarvestsRemaining: CROPS[cropId].regrowHarvests ?? 0,
        };
      }
    }
  }

  nextSpots[spotIndex] = nextSpot;
  nextPlots[plotIndex] = {
    ...plot,
    spots: nextSpots,
  };

  const nextHotbarItems = cleanupHotbarItems(state.hotbarItems, nextInventory);

  return {
    ...state,
    plots: nextPlots,
    inventory: nextInventory,
    hotbarItems: nextHotbarItems,
    selected: { plotIndex, spotIndex },
  };
}

export function waterSpot(state, plotIndex, spotIndex) {
  if (!isTileUnlocked(state, plotIndex)) {
    return state;
  }

  const plot = state.plots?.[plotIndex];
  const spot = plot?.spots?.[spotIndex];
  if (!spot) {
    return state;
  }

  if (spot.crop) {
    const nextPlots = [...state.plots];
    const nextSpots = [...plot.spots];
    nextSpots[spotIndex] = {
      ...spot,
      crop: {
        ...spot.crop,
        watered: true,
        lastWateredTick: state.tick,
      },
      soil: 'watered',
    };

    nextPlots[plotIndex] = {
      ...plot,
      spots: nextSpots,
    };

    return {
      ...state,
      plots: nextPlots,
      selected: { plotIndex, spotIndex },
    };
  }

  if (spot.soil === 'hoed' && spot.crop === null) {
    const nextPlots = [...state.plots];
    const nextSpots = [...plot.spots];
    nextSpots[spotIndex] = {
      ...spot,
      soil: 'watered',
    };

    nextPlots[plotIndex] = {
      ...plot,
      spots: nextSpots,
    };

    return {
      ...state,
      plots: nextPlots,
      selected: { plotIndex, spotIndex },
    };
  }

  return {
    ...state,
    selected: { plotIndex, spotIndex },
  };
}

export function selectSpot(state, plotIndex, spotIndex = 0) {
  if (!isTileUnlocked(state, plotIndex)) {
    return state;
  }

  const spot = state.plots?.[plotIndex]?.spots?.[spotIndex];
  if (!spot) {
    return state;
  }

  return {
    ...state,
    selected: { plotIndex, spotIndex },
  };
}

export function harvestSpot(state, plotIndex, spotIndex) {
  if (!isTileUnlocked(state, plotIndex)) {
    return withUiMessage(state, 'That plot is locked.');
  }

  const plot = state.plots?.[plotIndex];
  const spot = plot?.spots?.[spotIndex];
  if (!spot?.crop) {
    return state;
  }

  if (!isSpotReadyToHarvest(state, spot)) {
    return state;
  }

  const crop = CROPS[spot.crop.cropId];
  if (!crop) {
    return state;
  }

  const produceAmount = 1
    + (crop.bonusYieldChance && Math.random() < crop.bonusYieldChance ? 1 : 0)
    + (crop.mutationBonusYieldChance && Math.random() < crop.mutationBonusYieldChance ? 1 : 0);

  const harvestedItemId = crop.requiresWaterForFullValue && !isCropHydratedAtTick(spot.crop, state.tick) ? 'lettuce_wilted' : spot.crop.cropId;

  let nextInventory = state.inventory;
  nextInventory = adjustInventory(nextInventory, harvestedItemId, produceAmount);
  if (!nextInventory) {
    return state;
  }

  const seedId = getHarvestSeedId(spot.crop.cropId);
  const seedYield = crop.seedYield ?? 1;
  const seedDropChance = crop.seedDropChance ?? 1;
  if (Math.random() < seedDropChance) {
    const inventoryWithSeeds = adjustInventory(nextInventory, seedId, seedYield);
    if (!inventoryWithSeeds) {
      return state;
    }
    nextInventory = inventoryWithSeeds;
  }

  if (crop.rareSeedDropChance && Math.random() < crop.rareSeedDropChance) {
    const inventoryWithRareSeed = adjustInventory(nextInventory, seedId, 1);
    if (inventoryWithRareSeed) {
      nextInventory = inventoryWithRareSeed;
    }
  }

  const nextPlots = [...state.plots];
  const nextSpots = [...plot.spots];
  nextSpots[spotIndex] = {
    ...spot,
    soil: 'hoed',
    crop: null,
  };

  nextPlots[plotIndex] = {
    ...plot,
    spots: nextSpots,
  };

  const nextHotbarItems = addItemToHotbar(addItemToHotbar(state.hotbarItems, seedId), harvestedItemId);

  return {
    ...state,
    plots: nextPlots,
    inventory: nextInventory,
    hotbarItems: nextHotbarItems,
  };
}

export function getNextFarmExpansion(_gridSize) {
  return null;
}

export function expandFarm(state) {
  return state;
}

export function plantCrop(state) {
  return state;
}

export function harvestCrop(state) {
  return state;
}


export function getCurrentSellPrice(state, itemId) {
  const marketPrice = state.market?.prices?.[itemId];
  if (typeof marketPrice === 'number') {
    return marketPrice;
  }

  return SELLABLE_ITEMS[itemId]?.baselinePrice ?? 0;
}

export function sellItem(state, itemId, qty = 1) {
  if (qty <= 0) {
    return state;
  }

  const sellableItem = SELLABLE_ITEMS[itemId];
  if (!sellableItem) {
    return state;
  }

  const nextInventory = adjustInventory(state.inventory, itemId, -qty);
  if (!nextInventory) {
    return state;
  }

  const nextHotbarItems = cleanupHotbarItems(state.hotbarItems, nextInventory);
  const shouldResetSelectedTool = state.selectedTool?.kind === 'item' && !nextHotbarItems.includes(state.selectedTool.id);

  const coinGain = getCurrentSellPrice(state, itemId) * qty;
  let nextState = applyYield(state, { coins: coinGain });

  const contractSettlement = settleContractSales(nextState.contracts, { [itemId]: qty }, nextState.tick);
  nextState = {
    ...nextState,
    contracts: contractSettlement.contractsState,
  };

  if (contractSettlement.bonusCoins > 0) {
    nextState = applyYield(nextState, { coins: contractSettlement.bonusCoins });
  }

  return {
    ...nextState,
    inventory: nextInventory,
    hotbarItems: nextHotbarItems,
    selectedTool: shouldResetSelectedTool ? { kind: 'tool', id: 'hoe' } : state.selectedTool,
  };
}

export function buyItem(state, itemId, qty = 1) {
  if (qty <= 0) {
    return state;
  }

  const shopItem = SHOP_SEEDS[itemId];
  if (!shopItem) {
    return state;
  }

  const totalCost = shopItem.buyPrice * qty;
  if (!canAffordCost(state, { coins: totalCost })) {
    return state;
  }

  const nextInventory = adjustInventory(state.inventory, itemId, qty);
  if (!nextInventory) {
    return state;
  }

  const paidState = applyCost(state, { coins: totalCost });

  return {
    ...paidState,
    inventory: nextInventory,
    hotbarItems: addItemToHotbar(state.hotbarItems, itemId),
  };
}

export function unlockPlot(state, tileToUnlock, zoneType = 'field') {
  if (!isFeatureUnlocked(state, 'zones', zoneType)) {
    return withUiMessage(state, 'Research required for that zone.');
  }

  const unlockableTiles = getAdjacentLockedTiles(state.gridSize, state.unlockedTiles);
  if (unlockableTiles.length === 0) {
    return state;
  }

  if (!unlockableTiles.includes(tileToUnlock)) {
    return withUiMessage(state, 'Select an adjacent locked plot to buy.');
  }

  const unlockCost = getUnlockPlotCost(state);
  if (!canAffordCost(state, { coins: unlockCost })) {
    return state;
  }

  const nextUnlockedTiles = [...state.unlockedTiles];
  nextUnlockedTiles[tileToUnlock] = true;

  const nextPlots = [...state.plots];
  nextPlots[tileToUnlock] = createPlot(ZONE_TYPES.has(zoneType) ? zoneType : 'field');

  const paidState = applyCost(state, { coins: unlockCost });

  return {
    ...paidState,
    unlockedTiles: nextUnlockedTiles,
    plots: nextPlots,
    uiMessage: '',
  };
}

export function getUnlockPlotCostForState(state) {
  return getUnlockPlotCost(state);
}

export function getUnlockablePlotCount(state) {
  return getAdjacentLockedTiles(state.gridSize, state.unlockedTiles).length;
}

export function getUnlockablePlots(state) {
  return getAdjacentLockedTiles(state.gridSize, state.unlockedTiles);
}

export function placeBuilding(state, tileId, buildingId) {
  if (!isFeatureUnlocked(state, 'buildings', buildingId)) {
    return withUiMessage(state, 'Research required for that building.');
  }

  if (!isTileUnlocked(state, tileId)) {
    return withUiMessage(state, 'That plot is locked.');
  }

  const tile = state.tiles[tileId];
  if (!tile || tile.type !== 'empty') {
    return state;
  }

  const building = SHOP_BUILDINGS[buildingId];
  if (!building || !canAffordCost(state, { coins: building.buyPrice })) {
    return state;
  }

  const nextTiles = [...state.tiles];

  if (buildingId === 'coop') {
    nextTiles[tileId] = {
      type: 'coop',
      kind: 'building',
      buildingId: 'coop',
      animals: createStarterChickens(),
      automation: withAutomationDefaults({ enabled: true, targetOutputStock: 12 }),
    };
  }

  if (buildingId === 'barn') {
    nextTiles[tileId] = {
      type: 'barn',
      kind: 'building',
      buildingId: 'barn',
      storage: {},
      automation: withAutomationDefaults(),
    };
  }

  if (buildingId === 'forest') {
    nextTiles[tileId] = {
      type: 'forest',
      kind: 'building',
      buildingId: 'forest',
      resource: {
        itemId: 'wood',
        amount: 3,
        charge: 0,
        maxCharge: 8,
      },
      automation: withAutomationDefaults({ enabled: true, targetOutputStock: 20 }),
    };
  }

  if (buildingId === 'mine') {
    nextTiles[tileId] = {
      type: 'mine',
      kind: 'building',
      buildingId: 'mine',
      resource: {
        itemId: 'rock',
        amount: 3,
        charge: 0,
        maxCharge: 10,
      },
      automation: withAutomationDefaults({ enabled: true, targetOutputStock: 20 }),
    };
  }

  if (buildingId === 'silo' || buildingId === 'warehouse') {
    nextTiles[tileId] = {
      type: buildingId,
      kind: 'building',
      buildingId,
      automation: withAutomationDefaults(),
    };
  }

  if (buildingId === 'mill' || buildingId === 'workshop') {
    nextTiles[tileId] = {
      type: buildingId,
      kind: 'building',
      buildingId,
      automation: withAutomationDefaults({ enabled: true, targetOutputStock: 10 }),
    };
  }

  if (buildingId === 'market_stall' || buildingId === 'truck') {
    nextTiles[tileId] = {
      type: buildingId,
      kind: 'building',
      buildingId,
      automation: withAutomationDefaults({ enabled: true, targetOutputStock: 0 }),
    };
  }

  if (nextTiles[tileId].type === 'empty') {
    return state;
  }

  let paidState = applyCost(state, { coins: building.buyPrice });

  if (buildingId === 'silo' || buildingId === 'warehouse') {
    paidState = withBuildingChainModule(paidState, 'storage', buildingId);
  }

  if (buildingId === 'mill' || buildingId === 'workshop') {
    paidState = withBuildingChainModule(paidState, 'processing', buildingId);
  }

  if (buildingId === 'market_stall' || buildingId === 'truck') {
    paidState = withBuildingChainModule(paidState, 'export', buildingId);
  }

  return {
    ...paidState,
    tiles: nextTiles,
    buildingMaintenanceTimers: {
      ...(state.buildingMaintenanceTimers ?? {}),
      [tileId]: 0,
    },
  };
}

export function setBuildingChainModule(state, moduleType, moduleId) {
  return withBuildingChainModule(state, moduleType, moduleId);
}

export function collectResourceFromTile(state, tileId) {
  if (!isTileUnlocked(state, tileId)) {
    return state;
  }

  const tile = state.tiles?.[tileId];
  const resource = tile?.resource;
  if (!tile || !resource || resource.charge < resource.maxCharge) {
    return state;
  }

  const nextInventory = adjustInventory(state.inventory, resource.itemId, resource.amount);
  if (!nextInventory) {
    return state;
  }

  const nextTiles = [...state.tiles];
  nextTiles[tileId] = {
    ...tile,
    resource: {
      ...resource,
      charge: 0,
    },
  };

  const resourceYield = resource.itemId === 'rock'
    ? { stone: resource.amount }
    : { [resource.itemId]: resource.amount };
  const yieldedState = applyYield(state, resourceYield, {
    wood: SELLABLE_ITEMS.wood?.baselinePrice ?? 0,
    stone: SELLABLE_ITEMS.rock?.baselinePrice ?? 0,
  });

  return {
    ...yieldedState,
    tiles: nextTiles,
    inventory: nextInventory,
    hotbarItems: addItemToHotbar(state.hotbarItems, resource.itemId),
  };
}

export function breedChicken(state, coopId, parentAId, parentBId) {
  const coop = state.tiles[coopId];
  if (!coop || coop.type !== 'coop' || !Array.isArray(coop.animals)) {
    return state;
  }

  const parentA = coop.animals.find((animal) => animal.id === parentAId && animal.species === 'chicken');
  const parentB = coop.animals.find((animal) => animal.id === parentBId && animal.species === 'chicken');
  if (!parentA || !parentB || parentA.id === parentB.id) {
    return state;
  }

  const mutationTriggered = Math.random() < 0.03;
  const inheritedTraits = {
    color: chooseTrait(parentA, parentB, 'color'),
    size: chooseTrait(parentA, parentB, 'size'),
    eggRateTicks: chooseTrait(parentA, parentB, 'eggRateTicks'),
    rarity: chooseTrait(parentA, parentB, 'rarity'),
  };

  if (mutationTriggered) {
    inheritedTraits.rarity = 'rare';
    inheritedTraits.color = 'gold';
  }

  const childId = `chicken-${state.tick}-${coop.animals.length + 1}-${Math.floor(Math.random() * 10000)}`;
  const child = createChicken(childId, inheritedTraits);

  const nextTiles = [...state.tiles];
  nextTiles[coopId] = {
    ...coop,
    animals: [...coop.animals, child],
  };

  return {
    ...state,
    tiles: nextTiles,
  };
}


export function acceptContractOffer(state, contractId) {
  return {
    ...state,
    contracts: acceptContract(state.contracts, contractId, state.tick),
  };
}


export function researchTechNode(state, techId) {
  if (!canResearchTech(state, techId)) {
    return withUiMessage(state, 'Cannot research that technology yet.');
  }

  return {
    ...researchTech(state, techId),
    uiMessage: '',
  };
}

export function setAutoSellPolicy(state, changes = {}) {
  return {
    ...state,
    autoSellPolicy: {
      ...(state.autoSellPolicy ?? {}),
      ...changes,
    },
  };
}

export function setAutoSellItemThreshold(state, itemId, minStock) {
  if (!itemId) {
    return state;
  }

  return {
    ...state,
    autoSellPolicy: {
      ...(state.autoSellPolicy ?? {}),
      minStockByItem: {
        ...((state.autoSellPolicy ?? {}).minStockByItem ?? {}),
        [itemId]: Math.max(0, Number(minStock) || 0),
      },
    },
  };
}
