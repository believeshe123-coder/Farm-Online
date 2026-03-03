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

export const SHOP_SEEDS = Object.fromEntries(
  Object.entries(CROPS)
    .filter(([, crop]) => crop.inShop !== false)
    .map(([cropId, crop]) => [
      `${cropId}_seed`,
      { name: `${crop.name} Seeds`, buyPrice: crop.seedBuyPrice },
    ])
);

export const SHOP_BUILDINGS = {
  coop: { name: 'Chicken Coop', buyPrice: 150 },
  barn: { name: 'Barn', buyPrice: 250 },
};

export const SELLABLE_ITEMS = {
  ...Object.fromEntries(Object.entries(CROPS).map(([cropId, crop]) => [cropId, { name: crop.name, sellPrice: crop.sellPrice }])),
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
