export const ECONOMY_RESOURCES = {
  coins: { label: 'Coins', initialAmount: 10, defaultCapacity: 999_999 },
  water: { label: 'Water', initialAmount: 20, defaultCapacity: 200 },
  energy: { label: 'Energy', initialAmount: 20, defaultCapacity: 200 },
  labor: { label: 'Labor', initialAmount: 10, defaultCapacity: 100 },
  seeds: { label: 'Seeds', initialAmount: 0, defaultCapacity: 200 },
  wood: { label: 'Wood', initialAmount: 0, defaultCapacity: 200 },
  stone: { label: 'Stone', initialAmount: 0, defaultCapacity: 200 },
  feed: { label: 'Feed', initialAmount: 12, defaultCapacity: 200 },
  fertilizer: { label: 'Fertilizer', initialAmount: 0, defaultCapacity: 200 },
};

export const DAILY_UPKEEP_DEMANDS = {
  workers: { feed: 2 },
  pumps: { energy: 1, water: 1 },
};

export const BUILDING_OPERATING_COSTS = {
  coop: { feed: 1, labor: 1 },
  forest: { labor: 1, energy: 1 },
  mine: { labor: 1, energy: 2 },
  barn: { labor: 1 },
};

export const BUILDING_MAINTENANCE = {
  coop: { intervalTicks: 24, cost: { wood: 1 } },
  forest: { intervalTicks: 32, cost: { wood: 1, stone: 1 } },
  mine: { intervalTicks: 32, cost: { wood: 1, stone: 1 } },
  barn: { intervalTicks: 48, cost: { wood: 2, stone: 1 } },
};

export const DAY_TICKS = 24;
export const STORAGE_LOSS_SELL_RATE = 0.25;

export function createInitialResourcePools() {
  return Object.fromEntries(
    Object.entries(ECONOMY_RESOURCES).map(([resourceId, definition]) => [
      resourceId,
      {
        amount: definition.initialAmount,
        capacity: definition.defaultCapacity,
      },
    ])
  );
}

export function canAffordFromPools(resourcePools, costMap = {}) {
  return Object.entries(costMap).every(([resourceId, amount]) => {
    if (amount <= 0) {
      return true;
    }

    return (resourcePools?.[resourceId]?.amount ?? 0) >= amount;
  });
}

export function applyCostToPools(resourcePools, costMap = {}) {
  if (!canAffordFromPools(resourcePools, costMap)) {
    return {
      resourcePools,
      paid: false,
    };
  }

  const nextResourcePools = { ...resourcePools };
  for (const [resourceId, amount] of Object.entries(costMap)) {
    if (amount <= 0) {
      continue;
    }

    const resourcePool = nextResourcePools[resourceId] ?? { amount: 0, capacity: Infinity };
    nextResourcePools[resourceId] = {
      ...resourcePool,
      amount: resourcePool.amount - amount,
    };
  }

  return {
    resourcePools: nextResourcePools,
    paid: true,
  };
}

export function applyYieldToPools(resourcePools, yieldMap = {}, overflowSaleMap = {}) {
  const nextResourcePools = { ...resourcePools };
  const overflow = {};

  for (const [resourceId, amount] of Object.entries(yieldMap)) {
    if (amount <= 0) {
      continue;
    }

    const resourcePool = nextResourcePools[resourceId] ?? { amount: 0, capacity: Infinity };
    const capacity = Number.isFinite(resourcePool.capacity) ? resourcePool.capacity : Infinity;
    const storableAmount = Math.max(0, Math.min(amount, capacity - resourcePool.amount));
    const lostAmount = amount - storableAmount;

    nextResourcePools[resourceId] = {
      ...resourcePool,
      amount: resourcePool.amount + storableAmount,
    };

    if (lostAmount > 0) {
      overflow[resourceId] = (overflow[resourceId] ?? 0) + lostAmount;
    }
  }

  let soldAtLossCoins = 0;
  for (const [resourceId, lostAmount] of Object.entries(overflow)) {
    const sellPrice = overflowSaleMap[resourceId] ?? 0;
    soldAtLossCoins += lostAmount * sellPrice * STORAGE_LOSS_SELL_RATE;
  }

  if (soldAtLossCoins > 0) {
    const coinPool = nextResourcePools.coins ?? { amount: 0, capacity: Infinity };
    nextResourcePools.coins = {
      ...coinPool,
      amount: Math.min(coinPool.capacity, coinPool.amount + soldAtLossCoins),
    };
  }

  return {
    resourcePools: nextResourcePools,
    overflow,
    soldAtLossCoins,
  };
}
