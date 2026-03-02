import { CROPS } from './constants';

const BASE_UNLOCK_PLOT_COST = 25;

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
  return BASE_UNLOCK_PLOT_COST * (getUnlockedPlotCount(state) - 8);
}

function getLockedTilesByCenterDistance(gridSize, unlockedTiles) {
  const center = (gridSize - 1) / 2;

  return unlockedTiles
    .map((isUnlocked, index) => ({
      index,
      isUnlocked,
      row: Math.floor(index / gridSize),
      col: index % gridSize,
    }))
    .filter((tile) => !tile.isUnlocked)
    .sort((a, b) => {
      const aDistance = Math.abs(a.row - center) + Math.abs(a.col - center);
      const bDistance = Math.abs(b.row - center) + Math.abs(b.col - center);
      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }

      if (a.row !== b.row) {
        return a.row - b.row;
      }

      return a.col - b.col;
    })
    .map((tile) => tile.index);
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

function isCropUnlocked(inventory, cropId) {
  const crop = CROPS[cropId];
  if (!crop) {
    return false;
  }

  const requirement = crop.unlockRequirement;
  if (!requirement) {
    return true;
  }

  return (inventory[requirement.itemId] ?? 0) >= requirement.qty;
}

export function plantCrop(state, tileIndex, cropId) {
  if (!isTileUnlocked(state, tileIndex)) {
    return withUiMessage(state, 'That plot is locked.');
  }

  const tile = state.tiles[tileIndex];
  const crop = CROPS[cropId];
  if (!tile || !crop || tile.type !== 'empty' || !isCropUnlocked(state.inventory, cropId)) {
    return state;
  }

  const seedItemId = cropId === 'blue_herb' ? 'hybrid_seed' : `${cropId}_seed`;
  const nextInventory = adjustInventory(state.inventory, seedItemId, -1);
  if (!nextInventory) {
    return state;
  }

  const nextTiles = [...state.tiles];
  nextTiles[tileIndex] = {
    type: 'growing',
    kind: 'crop',
    cropId,
    plantedAtTick: state.tick,
    isReady: false,
  };

  return {
    ...state,
    tiles: nextTiles,
    inventory: nextInventory,
  };
}

export function harvestCrop(state, tileIndex) {
  if (!isTileUnlocked(state, tileIndex)) {
    return withUiMessage(state, 'That plot is locked.');
  }

  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.isReady) {
    return state;
  }

  const nextTiles = [...state.tiles];
  nextTiles[tileIndex] = { type: 'empty' };

  let nextInventory = adjustInventory(state.inventory, tile.cropId, 1);
  if (!nextInventory) {
    return state;
  }

  if (tile.hybridMutationEligible && Math.random() < 0.05) {
    nextInventory = adjustInventory(nextInventory, 'hybrid_seed', 1);
    if (!nextInventory) {
      return state;
    }
  }

  return {
    ...state,
    tiles: nextTiles,
    inventory: nextInventory,
  };
}

export function sellItem(state, itemId, qty = 1) {
  if (qty <= 0) {
    return state;
  }

  const itemCrop = CROPS[itemId];
  if (!itemCrop) {
    return state;
  }

  const nextInventory = adjustInventory(state.inventory, itemId, -qty);
  if (!nextInventory) {
    return state;
  }

  return {
    ...state,
    inventory: nextInventory,
    money: state.money + itemCrop.sellPrice * qty,
  };
}

export function getNextFarmExpansion(_gridSize) {
  return null;
}

export function expandFarm(state) {
  return state;
}

export function plant(state, tileId, cropId) {
  return plantCrop(state, tileId, cropId);
}

export function harvest(state, tileId) {
  return harvestCrop(state, tileId);
}

export function sell(state, itemId, amount = 1) {
  return sellItem(state, itemId, amount);
}

export function expand(state) {
  return { ...state, lastAction: 'expand' };
}

export function placeBuilding(state, tileId, buildingId) {
  if (!isTileUnlocked(state, tileId)) {
    return withUiMessage(state, 'That plot is locked.');
  }

  const tile = state.tiles[tileId];
  if (!tile || tile.type !== 'empty') {
    return state;
  }

  if (buildingId !== 'coop') {
    return state;
  }

  const nextTiles = [...state.tiles];
  nextTiles[tileId] = {
    type: 'coop',
    kind: 'building',
    buildingId: 'coop',
    animals: createStarterChickens(),
  };

  return {
    ...state,
    tiles: nextTiles,
  };
}

export function unlockPlot(state) {
  const lockedTileIndices = getLockedTilesByCenterDistance(state.gridSize, state.unlockedTiles);
  if (lockedTileIndices.length === 0) {
    return state;
  }

  const unlockCost = getUnlockPlotCost(state);
  if (state.money < unlockCost) {
    return state;
  }

  const tileToUnlock = lockedTileIndices[0];
  const nextUnlockedTiles = [...state.unlockedTiles];
  nextUnlockedTiles[tileToUnlock] = true;

  return {
    ...state,
    money: state.money - unlockCost,
    unlockedTiles: nextUnlockedTiles,
    uiMessage: '',
  };
}

export function getUnlockPlotCostForState(state) {
  return getUnlockPlotCost(state);
}

export function getUnlockablePlotCount(state) {
  return getLockedTilesByCenterDistance(state.gridSize, state.unlockedTiles).length;
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
