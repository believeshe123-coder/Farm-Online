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

function spotToCropId(seedId) {
  if (seedId === 'wheat_seed') {
    return 'wheat';
  }

  if (seedId === 'carrot_seed') {
    return 'carrot';
  }

  return null;
}

export function onSpotClick(state, plotIndex, spotIndex) {
  if (!isTileUnlocked(state, plotIndex)) {
    return state;
  }

  const plot = state.plots?.[plotIndex];
  const spot = plot?.spots?.[spotIndex];
  if (!spot) {
    return state;
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
    if (nextSpot.soil === 'hoed' && nextSpot.crop === null) {
      nextSpot.soil = 'watered';
    }
  }

  let nextInventory = state.inventory;
  if (selectedHotbar.kind === 'item') {
    const cropId = spotToCropId(selectedHotbar.id);
    const canPlant = (nextSpot.soil === 'hoed' || nextSpot.soil === 'watered') && nextSpot.crop === null;
    if (cropId && canPlant) {
      const updatedInventory = adjustInventory(state.inventory, selectedHotbar.id, -1);
      if (updatedInventory) {
        nextInventory = updatedInventory;
        nextSpot.crop = {
          cropId,
          plantedAtTick: state.tick,
        };
      }
    }
  }

  nextSpots[spotIndex] = nextSpot;
  nextPlots[plotIndex] = {
    ...plot,
    spots: nextSpots,
  };

  return {
    ...state,
    plots: nextPlots,
    inventory: nextInventory,
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

  const crop = CROPS[spot.crop.cropId];
  if (!crop) {
    return state;
  }

  const growthProgress = (state.tick - spot.crop.plantedAtTick) / crop.growTime;
  if (growthProgress < 1) {
    return state;
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

  const nextInventory = adjustInventory(state.inventory, spot.crop.cropId, 1);
  if (!nextInventory) {
    return state;
  }

  return {
    ...state,
    plots: nextPlots,
    inventory: nextInventory,
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
