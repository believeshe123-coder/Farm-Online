export const CROPS = {
  wheat: { name: 'Wheat', growTime: 10, sellPrice: 5 },
  carrot: { name: 'Carrot', growTime: 15, sellPrice: 8 },
  blue_herb: {
    name: 'Blue Herb',
    growTime: 18,
    sellPrice: 14,
    unlockRequirement: {
      itemId: 'hybrid_seed',
      qty: 1,
      text: 'Requires 1 hybrid_seed owned',
    },
  },
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
