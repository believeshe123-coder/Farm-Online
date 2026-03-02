export function plant(state, tileId, cropId) {
  return { ...state, lastAction: `plant:${cropId}@${tileId}` };
}

export function harvest(state, tileId) {
  return { ...state, lastAction: `harvest@${tileId}` };
}

export function sell(state, itemId, amount = 1) {
  return { ...state, lastAction: `sell:${itemId}x${amount}` };
}

export function expand(state) {
  return { ...state, lastAction: 'expand' };
}

export function placeBuilding(state, tileId, buildingId) {
  return { ...state, lastAction: `build:${buildingId}@${tileId}` };
}
