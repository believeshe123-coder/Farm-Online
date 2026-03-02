import { CROPS, FARM_EXPANSION_TIERS } from './constants';

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

export function plantCrop(state, tileIndex, cropId) {
  const tile = state.tiles[tileIndex];
  const crop = CROPS[cropId];
  if (!tile || !crop || tile.type !== 'empty') {
    return state;
  }

  const seedItemId = `${cropId}_seed`;
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
  const tile = state.tiles[tileIndex];
  if (!tile || tile.kind !== 'crop' || !tile.isReady) {
    return state;
  }

  const nextTiles = [...state.tiles];
  nextTiles[tileIndex] = { type: 'empty' };

  const nextInventory = adjustInventory(state.inventory, tile.cropId, 1);
  if (!nextInventory) {
    return state;
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

export function getNextFarmExpansion(gridSize) {
  return FARM_EXPANSION_TIERS.find((tier) => tier.from === gridSize) ?? null;
}

export function expandFarm(state) {
  const nextTier = getNextFarmExpansion(state.gridSize);
  if (!nextTier || state.money < nextTier.cost) {
    return state;
  }

  const nextTiles = Array.from({ length: nextTier.to * nextTier.to }, (_, index) => {
    const x = index % nextTier.to;
    const y = Math.floor(index / nextTier.to);

    if (x < state.gridSize && y < state.gridSize) {
      return state.tiles[y * state.gridSize + x];
    }

    return { type: 'empty' };
  });

  return {
    ...state,
    gridSize: nextTier.to,
    tiles: nextTiles,
    money: state.money - nextTier.cost,
  };
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
