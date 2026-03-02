import { CROPS } from './constants';

function addInventoryItem(inventory, itemId, amount = 1) {
  return {
    ...inventory,
    [itemId]: (inventory[itemId] ?? 0) + amount,
  };
}

function getOrthogonalNeighbors(tileIndex, gridSize, totalTiles) {
  const x = tileIndex % gridSize;
  const y = Math.floor(tileIndex / gridSize);
  const deltas = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  return deltas
    .map(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
        return null;
      }

      const neighborIndex = ny * gridSize + nx;
      return neighborIndex >= 0 && neighborIndex < totalTiles ? neighborIndex : null;
    })
    .filter((neighborIndex) => neighborIndex !== null);
}

function areInSameFiveTickWindow(tickA, tickB) {
  return Math.floor(tickA / 5) === Math.floor(tickB / 5);
}

export function advanceTick(state) {
  const nextTick = state.tick + 1;
  let nextInventory = state.inventory;

  let nextTiles = state.tiles.map((tile) => {
    if (tile.kind !== 'crop') {
      if (tile.type !== 'coop' || !Array.isArray(tile.animals)) {
        return tile;
      }

      const nextAnimals = tile.animals.map((animal) => {
        if (animal.species !== 'chicken') {
          return animal;
        }

        const nextEggTimer = animal.eggTimer - 1;
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
    }

    const crop = CROPS[tile.cropId];
    if (!crop) {
      return tile;
    }

    const isReady = nextTick - tile.plantedAtTick >= crop.growTime;
    const becameReady = isReady && !tile.isReady;
    return {
      ...tile,
      isReady,
      type: isReady ? 'ready' : 'growing',
      readyAtTick: becameReady ? nextTick : tile.readyAtTick,
      hybridMutationEligible: tile.hybridMutationEligible ?? false,
    };
  });

  const updatedTiles = [...nextTiles];
  nextTiles.forEach((tile, tileIndex) => {
    if (tile.kind !== 'crop' || !tile.isReady || typeof tile.readyAtTick !== 'number') {
      return;
    }

    const neighbors = getOrthogonalNeighbors(tileIndex, state.gridSize, nextTiles.length);
    const matchesMutationCondition = neighbors.some((neighborIndex) => {
      const neighbor = nextTiles[neighborIndex];
      return (
        neighbor?.kind === 'crop' &&
        neighbor.isReady &&
        neighbor.cropId !== tile.cropId &&
        typeof neighbor.readyAtTick === 'number' &&
        areInSameFiveTickWindow(tile.readyAtTick, neighbor.readyAtTick)
      );
    });

    if (matchesMutationCondition) {
      updatedTiles[tileIndex] = {
        ...updatedTiles[tileIndex],
        hybridMutationEligible: true,
      };
    }
  });

  nextTiles = updatedTiles;

  const nextState = {
    ...state,
    tick: nextTick,
    tiles: nextTiles,
    inventory: nextInventory,
  };

  return nextState;
}
