import { CROPS } from './constants';

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
  return { ...state, lastAction: `build:${buildingId}@${tileId}` };
}
