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
};

export const SELLABLE_ITEMS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([cropId, crop]) => [cropId, { name: crop.name, sellPrice: crop.sellPrice }])),
  ...Object.fromEntries(
    Object.entries(CROPS).map(([cropId, crop]) => [
      `${cropId}_seed`,
      { name: `${crop.name} Seeds`, sellPrice: crop.seedBuyPrice },
    ])
  ),
  lettuce_wilted: { name: 'Wilted Lettuce', sellPrice: CROPS.lettuce.sellPrice / 2 },
  egg: { name: 'Egg', sellPrice: 4 },
  wood: { name: 'Wood', sellPrice: 2 },
  seeds: { name: 'Seeds', sellPrice: 1 },
  rock: { name: 'Rock', sellPrice: 2 },
};

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
