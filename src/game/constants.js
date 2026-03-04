export const CROPS = {
  wheat: { symbol: 'W', name: 'Wheat', growTime: 8, sellPrice: 4, seedBuyPrice: 2, tier: 'starter' },
  carrot: { symbol: 'C', name: 'Carrot', growTime: 12, sellPrice: 7, seedBuyPrice: 4, tier: 'starter' },
  turnip: { symbol: 'T', name: 'Turnip', growTime: 6, sellPrice: 3, seedBuyPrice: 2, tier: 'starter' },
  radish: {
    symbol: 'R',
    name: 'Radish',
    growTime: 10,
    sellPrice: 6,
    seedBuyPrice: 4,
    bonusYieldChance: 0.2,
    tier: 'starter',
  },
  lettuce: {
    symbol: 'L',
    name: 'Lettuce',
    growTime: 8,
    sellPrice: 8,
    seedBuyPrice: 4,
    requiresWaterForFullValue: true,
    tier: 'starter',
  },

  potato: { symbol: 'P', name: 'Potato', growTime: 12, sellPrice: 10, seedBuyPrice: 6, bonusYieldChance: 0.3, tier: 'mid' },
  onion: { symbol: 'O', name: 'Onion', growTime: 14, sellPrice: 11, seedBuyPrice: 7, seedYield: 2, tier: 'mid' },
  melon: { symbol: 'M', name: 'Melon', growTime: 20, sellPrice: 20, seedBuyPrice: 10, tier: 'mid' },
  beet: { symbol: 'B', name: 'Beet', growTime: 13, sellPrice: 12, seedBuyPrice: 7, tier: 'mid' },
  strawberry: { symbol: 'S', name: 'Strawberry', growTime: 18, sellPrice: 14, seedBuyPrice: 8, regrowHarvests: 1, tier: 'mid' },

  pumpkin: { symbol: 'U', name: 'Pumpkin', growTime: 26, sellPrice: 34, seedBuyPrice: 14, tier: 'advanced' },
  hot_pepper: {
    symbol: 'H',
    name: 'Hot Pepper',
    growTime: 13,
    sellPrice: 13,
    seedBuyPrice: 8,
    wateredGrowMultiplier: 0.7,
    tier: 'advanced',
  },
  grape: { symbol: 'G', name: 'Grape', growTime: 17, sellPrice: 16, seedBuyPrice: 9, regrowHarvests: 2, tier: 'advanced' },
  kale: { symbol: 'K', name: 'Kale', growTime: 11, sellPrice: 10, seedBuyPrice: 7, seedYield: 2, tier: 'advanced' },
  zucchini: { symbol: 'Z', name: 'Zucchini', growTime: 12, sellPrice: 11, seedBuyPrice: 8, seedYield: 3, tier: 'advanced' },

  ancient_crop: {
    symbol: 'A',
    name: 'Ancient Crop',
    growTime: 30,
    sellPrice: 45,
    seedBuyPrice: 20,
    rareSeedDropChance: 0.15,
    tier: 'rare',
  },
  fireflower: {
    symbol: 'F',
    name: 'Fireflower',
    growTime: 14,
    sellPrice: 26,
    seedBuyPrice: 16,
    mutationBonusYieldChance: 0.12,
    inShop: false,
    tier: 'rare',
  },
  dragonfruit: {
    symbol: 'D',
    name: 'Dragonfruit',
    growTime: 22,
    sellPrice: 31,
    seedBuyPrice: 15,
    seedDropChance: 0.5,
    tier: 'rare',
  },
  yarrow: { symbol: 'Y', name: 'Yarrow', growTime: 8, sellPrice: 8, seedBuyPrice: 6, tier: 'rare' },
  elderberry: {
    symbol: 'E',
    name: 'Elderberry',
    growTime: 21,
    sellPrice: 27,
    seedBuyPrice: 14,
    regrowHarvests: 2,
    tier: 'rare',
  },
};

export const ZONE_DEFINITIONS = {
  field: {
    name: 'Field',
    cycleTimeTicks: 4,
    workerRequirement: 1,
    defaultPolicy: 'balanced',
    policies: {
      balanced: { label: 'Balanced', inputs: { seeds: 1, water: 1 }, outputs: { wheat: 2, seeds: 1 } },
      grain_focus: { label: 'Grain Focus', inputs: { seeds: 1, water: 2 }, outputs: { wheat: 3 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.9, outputMultiplier: 1.2, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.8, outputMultiplier: 1.5, workerDelta: 1 },
    ],
  },
  forest: {
    name: 'Forest',
    cycleTimeTicks: 5,
    workerRequirement: 1,
    defaultPolicy: 'timber',
    policies: {
      timber: { label: 'Timber', inputs: { energy: 1 }, outputs: { wood: 3 } },
      forage: { label: 'Forage', inputs: { energy: 1 }, outputs: { wood: 1, seeds: 1 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.9, outputMultiplier: 1.15, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.75, outputMultiplier: 1.35, workerDelta: 1 },
    ],
  },
  quarry: {
    name: 'Quarry',
    cycleTimeTicks: 6,
    workerRequirement: 2,
    defaultPolicy: 'stone_cut',
    policies: {
      stone_cut: { label: 'Stone Cut', inputs: { energy: 2 }, outputs: { rock: 3 } },
      salvage: { label: 'Salvage', inputs: { energy: 1 }, outputs: { rock: 2, seeds: 1 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.9, outputMultiplier: 1.2, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.75, outputMultiplier: 1.4, workerDelta: 1 },
    ],
  },
  pasture: {
    name: 'Pasture',
    cycleTimeTicks: 5,
    workerRequirement: 1,
    defaultPolicy: 'eggs',
    policies: {
      eggs: { label: 'Eggs', inputs: { feed: 1 }, outputs: { egg: 2 } },
      mixed_feed: { label: 'Compost Feed', inputs: { feed: 1 }, outputs: { egg: 1, fertilizer: 1 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.9, outputMultiplier: 1.2, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.75, outputMultiplier: 1.4, workerDelta: 1 },
    ],
  },
  greenhouse: {
    name: 'Greenhouse',
    cycleTimeTicks: 4,
    workerRequirement: 2,
    defaultPolicy: 'vegetables',
    policies: {
      vegetables: { label: 'Vegetables', inputs: { water: 2, energy: 1, seeds: 1 }, outputs: { lettuce: 2, carrot: 1 } },
      herbs: { label: 'Herbs', inputs: { water: 1, energy: 1, seeds: 1 }, outputs: { yarrow: 1, seeds: 1 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.85, outputMultiplier: 1.2, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.7, outputMultiplier: 1.5, workerDelta: 1 },
    ],
  },
  seed_lab: {
    name: 'Seed Lab',
    cycleTimeTicks: 7,
    workerRequirement: 2,
    defaultPolicy: 'seed_refining',
    policies: {
      seed_refining: { label: 'Seed Refining', inputs: { fertilizer: 1, energy: 1 }, outputs: { seeds: 4 } },
      hybridizing: { label: 'Hybridizing', inputs: { seeds: 2, energy: 1 }, outputs: { seeds: 3, fireflower_seed: 1 } },
    },
    upgrades: [
      { level: 2, cycleTimeMultiplier: 0.9, outputMultiplier: 1.2, workerDelta: 0 },
      { level: 3, cycleTimeMultiplier: 0.8, outputMultiplier: 1.45, workerDelta: 1 },
    ],
  },
};

export const ZONE_TYPES = new Set(Object.keys(ZONE_DEFINITIONS));

function getLevelModifiers(zoneDefinition, level = 1) {
  const levelNumber = Math.max(1, Number(level) || 1);
  const applicableUpgrades = (zoneDefinition?.upgrades ?? []).filter((upgrade) => levelNumber >= upgrade.level);

  return applicableUpgrades.reduce((modifiers, upgrade) => ({
    cycleTimeMultiplier: modifiers.cycleTimeMultiplier * (upgrade.cycleTimeMultiplier ?? 1),
    outputMultiplier: modifiers.outputMultiplier * (upgrade.outputMultiplier ?? 1),
    workerDelta: modifiers.workerDelta + (upgrade.workerDelta ?? 0),
  }), {
    cycleTimeMultiplier: 1,
    outputMultiplier: 1,
    workerDelta: 0,
  });
}

export function getZoneCycleConfig(zoneType = 'field', level = 1, policyId) {
  const definition = ZONE_DEFINITIONS[zoneType] ?? ZONE_DEFINITIONS.field;
  const policy = definition.policies[policyId] ?? definition.policies[definition.defaultPolicy];
  const modifiers = getLevelModifiers(definition, level);

  return {
    zoneType,
    zoneName: definition.name,
    level: Math.max(1, Number(level) || 1),
    policyId: definition.policies[policyId] ? policyId : definition.defaultPolicy,
    cycleTimeTicks: Math.max(1, Math.round(definition.cycleTimeTicks * modifiers.cycleTimeMultiplier)),
    workerRequirement: Math.max(1, definition.workerRequirement + modifiers.workerDelta),
    inputs: Object.fromEntries(
      Object.entries(policy.inputs ?? {}).map(([resourceId, amount]) => [resourceId, Math.max(0, Math.round(amount))])
    ),
    outputs: Object.fromEntries(
      Object.entries(policy.outputs ?? {}).map(([resourceId, amount]) => [resourceId, Math.max(0, Math.round(amount * modifiers.outputMultiplier))])
    ),
    upgrades: definition.upgrades ?? [],
  };
}

export function getZoneNetProduction(zoneType = 'field', level = 1, policyId) {
  const config = getZoneCycleConfig(zoneType, level, policyId);
  const cycleTime = config.cycleTimeTicks;
  const perTick = {};

  [...Object.keys(config.outputs), ...Object.keys(config.inputs)].forEach((resourceId) => {
    const output = config.outputs[resourceId] ?? 0;
    const input = config.inputs[resourceId] ?? 0;
    perTick[resourceId] = Number(((output - input) / cycleTime).toFixed(2));
  });

  const perDay = Object.fromEntries(
    Object.entries(perTick).map(([resourceId, amount]) => [resourceId, Number((amount * 24).toFixed(2))])
  );

  return {
    ...config,
    netPerTick: perTick,
    netPerDay: perDay,
  };
}

export const WATERING_DURATION_TICKS = 8;

export const SHOP_SEEDS = Object.fromEntries(
  Object.entries(CROPS)
    .filter(([, crop]) => crop.inShop !== false && crop.tier !== 'rare')
    .map(([cropId, crop]) => [
      `${cropId}_seed`,
      { name: `${crop.name} Seeds`, buyPrice: crop.seedBuyPrice },
    ])
);

export const SHOP_BUILDINGS = {
  coop: { name: 'Chicken Coop', buyPrice: 150 },
  barn: { name: 'Barn', buyPrice: 250 },
  forest: { name: 'Forest Camp', buyPrice: 120 },
  mine: { name: 'Mining Area', buyPrice: 140 },
  silo: { name: 'Silo', buyPrice: 180 },
  warehouse: { name: 'Warehouse', buyPrice: 300 },
  mill: { name: 'Mill', buyPrice: 280 },
  workshop: { name: 'Workshop', buyPrice: 340 },
  market_stall: { name: 'Market Stall', buyPrice: 200 },
  truck: { name: 'Truck', buyPrice: 360 },
};

export const WORKER_HIRE_LADDER = {
  baseCoinCost: 40,
  growth: 1.2,
  softcapStart: 10,
  softcapGrowth: 0.18,
  permitEvery: 4,
};

export const WORKER_TOOL_UPGRADE_LADDER = [
  {
    tier: 1,
    cost: { coins: 60, permits: 0 },
    effect: { throughputBonus: 0.12 },
  },
  {
    tier: 2,
    cost: { coins: 110, permits: 1 },
    effect: { throughputBonus: 0.22 },
  },
  {
    tier: 3,
    cost: { coins: 190, permits: 2 },
    effect: { throughputBonus: 0.3 },
  },
  {
    tier: 4,
    cost: { coins: 320, permits: 3 },
    effect: { throughputBonus: 0.36 },
  },
];

export const LAND_UNLOCK_COST_CURVE = {
  baseCoinCost: 25,
  growth: 1.16,
  softcapStartUnlockedPlots: 10,
  softcapGrowth: 0.22,
  permitEvery: 3,
};

export const BUILDING_CHAIN_MODULES = {
  storage: {
    silo: {
      name: 'Silo',
      capacityByResource: { wheat: 100, carrot: 60, turnip: 60, seeds: 80, flour: 40, feed: 40 },
    },
    warehouse: {
      name: 'Warehouse',
      capacityByResource: { wheat: 200, carrot: 140, turnip: 140, seeds: 180, flour: 120, feed: 120 },
    },
  },
  processing: {
    mill: {
      name: 'Mill',
      queueCapacity: 2,
      recipes: {
        flour: { inputs: { wheat: 2 }, outputs: { flour: 1 }, durationTicks: 2 },
      },
    },
    workshop: {
      name: 'Workshop',
      queueCapacity: 3,
      recipes: {
        feed: { inputs: { turnip: 2, carrot: 1 }, outputs: { feed: 2 }, durationTicks: 3 },
      },
    },
  },
  export: {
    market_stall: {
      name: 'Market Stall',
      perTick: 3,
      perDay: 24,
    },
    truck: {
      name: 'Truck',
      perTick: 7,
      perDay: 72,
    },
  },
};

export function getBuildingChainModuleProfile(moduleSelection = {}) {
  const storageId = moduleSelection.storage ?? 'silo';
  const processingId = moduleSelection.processing ?? 'mill';
  const exportId = moduleSelection.export ?? 'market_stall';

  return {
    storageId,
    processingId,
    exportId,
    storage: BUILDING_CHAIN_MODULES.storage[storageId] ?? BUILDING_CHAIN_MODULES.storage.silo,
    processing: BUILDING_CHAIN_MODULES.processing[processingId] ?? BUILDING_CHAIN_MODULES.processing.mill,
    export: BUILDING_CHAIN_MODULES.export[exportId] ?? BUILDING_CHAIN_MODULES.export.market_stall,
  };
}

export function createInitialBuildingChainState() {
  return {
    modules: {
      storage: 'silo',
      processing: 'mill',
      export: 'market_stall',
    },
    capacityByResource: {},
    storage: {},
    rawProduction: {},
    processingQueues: {
      mill: [],
      workshop: [],
    },
    exportQueue: {},
    exportCaps: {
      perTick: 0,
      perDay: 0,
    },
    exportedToday: 0,
    exportDayStartedAtTick: 0,
  };
}

const CROP_PRICE_BOUNDS = { minMultiplier: 0.7, maxMultiplier: 1.5 };
const SEED_PRICE_BOUNDS = { minMultiplier: 0.75, maxMultiplier: 1.3 };

export const SELLABLE_ITEMS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([cropId, crop]) => [cropId, {
    name: crop.name,
    baselinePrice: crop.sellPrice,
    dailyVolatility: 0.08,
    weeklyVolatility: 0.14,
    ...CROP_PRICE_BOUNDS,
  }])),
  ...Object.fromEntries(
    Object.entries(CROPS).map(([cropId, crop]) => [
      `${cropId}_seed`,
      {
        name: `${crop.name} Seeds`,
        baselinePrice: crop.seedBuyPrice,
        dailyVolatility: 0.04,
        weeklyVolatility: 0.08,
        ...SEED_PRICE_BOUNDS,
      },
    ])
  ),
  lettuce_wilted: {
    name: 'Wilted Lettuce',
    baselinePrice: CROPS.lettuce.sellPrice / 2,
    dailyVolatility: 0.06,
    weeklyVolatility: 0.12,
    minMultiplier: 0.7,
    maxMultiplier: 1.2,
  },
  egg: { name: 'Egg', baselinePrice: 4, dailyVolatility: 0.05, weeklyVolatility: 0.1, minMultiplier: 0.75, maxMultiplier: 1.35 },
  wood: { name: 'Wood', baselinePrice: 2, dailyVolatility: 0.04, weeklyVolatility: 0.09, minMultiplier: 0.7, maxMultiplier: 1.3 },
  grass: { name: 'Grass', baselinePrice: 2, dailyVolatility: 0.04, weeklyVolatility: 0.09, minMultiplier: 0.75, maxMultiplier: 1.35 },
  seeds: { name: 'Seeds', baselinePrice: 1, dailyVolatility: 0.03, weeklyVolatility: 0.07, minMultiplier: 0.8, maxMultiplier: 1.25 },
  rock: { name: 'Rock', baselinePrice: 2, dailyVolatility: 0.04, weeklyVolatility: 0.09, minMultiplier: 0.75, maxMultiplier: 1.35 },
};

export const MARKET_DAILY_UPDATE_INTERVAL = 24;
export const MARKET_WEEKLY_UPDATE_INTERVAL = MARKET_DAILY_UPDATE_INTERVAL * 7;

export function getSellPriceBounds(itemId) {
  const config = SELLABLE_ITEMS[itemId];
  if (!config) {
    return { minPrice: 0, maxPrice: 0 };
  }

  const baselinePrice = config.baselinePrice ?? 0;
  return {
    minPrice: Math.max(1, Math.floor(baselinePrice * (config.minMultiplier ?? 1))),
    maxPrice: Math.max(1, Math.ceil(baselinePrice * (config.maxMultiplier ?? 1))),
  };
}

export function getBaselineMarketPrices() {
  return Object.fromEntries(
    Object.entries(SELLABLE_ITEMS).map(([itemId, item]) => [itemId, item.baselinePrice])
  );
}

export function clampMarketPrice(itemId, rawPrice) {
  const { minPrice, maxPrice } = getSellPriceBounds(itemId);
  return Math.min(maxPrice, Math.max(minPrice, Math.round(rawPrice)));
}

export const ANIMALS = {
  chicken: { name: 'Chicken', buyCost: 20, produceTicks: 3 },
};

export const COSTS = {
  chickenCoop: 150,
};

export const FARM_EXPANSION_TIERS = [
  { from: 5, to: 7, cost: 50 },
  { from: 7, to: 10, cost: 200 },
  { from: 10, to: 15, cost: 800 },
];
