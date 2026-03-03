import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewGame } from './createNewGame.js';
import { buyItem, harvestSpot, onSpotClick, placeBuilding, sellItem, unlockPlot } from './actions.js';
import { CROPS, SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS } from './constants.js';

function withMockedRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}


function clearDebrisAndPrepareSoil(state, plotIndex, spotIndex) {
  let nextState = { ...state, selectedTool: { kind: 'tool', id: 'hoe' } };

  if (nextState.plots[plotIndex].spots[spotIndex].debris) {
    nextState = onSpotClick(nextState, plotIndex, spotIndex);
  }

  nextState = onSpotClick(nextState, plotIndex, spotIndex);
  nextState = { ...nextState, selectedTool: { kind: 'tool', id: 'water' } };
  nextState = onSpotClick(nextState, plotIndex, spotIndex);

  return nextState;
}


test('generic seeds plant a random crop', () => {
  const plotIndex = 12;
  const spotIndex = 0;
  let state = {
    ...createNewGame(),
    inventory: { seeds: 1 },
    hotbarItems: ['seeds'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  const seedsBeforePlanting = state.inventory.seeds ?? 0;

  state = { ...state, selectedTool: { kind: 'item', id: 'seeds' } };
  state = withMockedRandom(0, () => onSpotClick(state, plotIndex, spotIndex));

  assert.equal(state.plots[plotIndex].spots[spotIndex].crop?.cropId, 'wheat');
  assert.equal(state.inventory.seeds ?? 0, seedsBeforePlanting - 1);
});

test('planting requires watering and harvesting carrot credits inventory under carrot key', () => {
  const plotIndex = 12;
  const spotIndex = 0;

  let state = {
    ...createNewGame(),
    inventory: { carrot_seed: 2 },
    hotbarItems: ['carrot_seed'],
  };

  state = { ...state, selectedTool: { kind: 'item', id: 'carrot_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  assert.equal(state.plots[plotIndex].spots[spotIndex].crop, null);

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);

  state = {
    ...state,
    selectedTool: { kind: 'item', id: 'carrot_seed' },
  };
  state = onSpotClick(state, plotIndex, spotIndex);

  assert.equal(state.plots[plotIndex].spots[spotIndex].crop?.cropId, 'carrot');
  assert.equal(state.inventory.carrot_seed ?? 0, 1);

  state = {
    ...state,
    tick: CROPS.carrot.growTime,
  };

  state = harvestSpot(state, plotIndex, spotIndex);

  assert.equal(state.inventory.carrot ?? 0, 1);
  assert.equal(state.inventory.carrot_seed ?? 0, 2);
});

test('buying seeds deducts money and adds to inventory + hotbar', () => {
  const state = { ...createNewGame(), money: 50 };
  const nextState = buyItem(state, 'carrot_seed');

  assert.equal(nextState.money, state.money - SHOP_SEEDS.carrot_seed.buyPrice);
  assert.equal(nextState.inventory.carrot_seed, (state.inventory.carrot_seed ?? 0) + 1);
  assert.ok(nextState.hotbarItems.includes('carrot_seed'));
});

test('selling item increases money and reduces inventory', () => {
  const state = {
    ...createNewGame(),
    inventory: {
      ...createNewGame().inventory,
      egg: 2,
    },
  };

  const nextState = sellItem(state, 'egg');

  assert.equal(nextState.money, state.money + SELLABLE_ITEMS.egg.sellPrice);
  assert.equal(nextState.inventory.egg, 1);
});

test('placing barn consumes money and changes tile type', () => {
  const baseState = createNewGame();
  const state = {
    ...baseState,
    money: 500,
  };

  const barnState = placeBuilding(state, 12, 'barn');
  assert.equal(barnState.tiles[12].type, 'barn');
  assert.equal(barnState.money, state.money - SHOP_BUILDINGS.barn.buyPrice);
});

test('watered lettuce harvest produces lettuce instead of wilted lettuce', () => {
  const plotIndex = 12;
  const spotIndex = 1;
  let state = {
    ...createNewGame(),
    inventory: { ...createNewGame().inventory, lettuce_seed: 1 },
    hotbarItems: [...createNewGame().hotbarItems, 'lettuce_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);

  state = { ...state, selectedTool: { kind: 'item', id: 'lettuce_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = { ...state, tick: CROPS.lettuce.growTime };
  state = withMockedRandom(0.99, () => harvestSpot(state, plotIndex, spotIndex));

  assert.equal(state.inventory.lettuce ?? 0, 1);
  assert.equal(state.inventory.lettuce_wilted ?? 0, 0);
});

test('harvesting resets planted spots to dry hoed soil', () => {
  const plotIndex = 12;
  const spotIndex = 2;
  let state = {
    ...createNewGame(),
    inventory: { ...createNewGame().inventory, strawberry_seed: 1 },
    hotbarItems: [...createNewGame().hotbarItems, 'strawberry_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  state = { ...state, selectedTool: { kind: 'item', id: 'strawberry_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = { ...state, tick: CROPS.strawberry.growTime };
  state = withMockedRandom(0.99, () => harvestSpot(state, plotIndex, spotIndex));

  assert.equal(state.inventory.strawberry ?? 0, 1);
  assert.equal(state.plots[plotIndex].spots[spotIndex].crop, null);
  assert.equal(state.plots[plotIndex].spots[spotIndex].soil, 'hoed');
});



test('all crop-specific seeds are sellable', () => {
  for (const [cropId, crop] of Object.entries(CROPS)) {
    const seedId = `${cropId}_seed`;
    assert.deepEqual(SELLABLE_ITEMS[seedId], {
      name: `${crop.name} Seeds`,
      sellPrice: crop.seedBuyPrice,
    });
  }
});

test('shop seeds include all requested crops', () => {
  const expectedCropIds = [
    'wheat', 'carrot', 'turnip', 'radish', 'lettuce',
    'potato', 'onion', 'melon', 'beet', 'strawberry',
    'pumpkin', 'hot_pepper', 'grape', 'kale', 'zucchini',
    'ancient_crop', 'dragonfruit', 'yarrow', 'elderberry',
  ];

  for (const cropId of expectedCropIds) {
    assert.ok(SHOP_SEEDS[`${cropId}_seed`], `Missing ${cropId}_seed in shop`);
  }
});

test('mutation crops remain in gameplay but are excluded from shop', () => {
  assert.equal(CROPS.fireflower.mutationBonusYieldChance > 0, true);
  assert.equal(Object.hasOwn(SHOP_SEEDS, 'fireflower_seed'), false);
});

test('fireflower mutation bonus yield can trigger in harvest', () => {
  const plotIndex = 12;
  const spotIndex = 3;
  let state = {
    ...createNewGame(),
    inventory: { ...createNewGame().inventory, fireflower_seed: 1 },
    hotbarItems: [...createNewGame().hotbarItems, 'fireflower_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  state = { ...state, selectedTool: { kind: 'item', id: 'fireflower_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = { ...state, tick: CROPS.fireflower.growTime };
  state = withMockedRandom(0.01, () => harvestSpot(state, plotIndex, spotIndex));

  assert.equal(state.inventory.fireflower ?? 0, 2);
});


test('new game starts with exactly one unlocked center plot', () => {
  const state = createNewGame();
  const unlockedIndices = state.unlockedTiles.map((isUnlocked, index) => (isUnlocked ? index : null)).filter((index) => index !== null);

  assert.deepEqual(unlockedIndices, [12]);
});

test('unlock plot requires choosing an adjacent locked tile', () => {
  let state = { ...createNewGame(), money: 1000 };

  const invalidState = unlockPlot(state, 0);
  assert.equal(invalidState.unlockedTiles[0], false);
  assert.equal(invalidState.uiMessage, 'Select an adjacent locked plot to buy.');

  state = unlockPlot(state, 7);
  assert.equal(state.unlockedTiles[7], true);
});


test('new game starts with no seeds in inventory', () => {
  const state = createNewGame();

  assert.deepEqual(state.inventory, {});
  assert.deepEqual(state.hotbarItems, []);
});

test('clicking debris clears it and awards resources', () => {
  const plotIndex = 12;
  const spotIndex = 4;
  let state = createNewGame();

  state = {
    ...state,
    plots: state.plots.map((plot, index) => {
      if (index !== plotIndex) {
        return plot;
      }

      const spots = [...plot.spots];
      spots[spotIndex] = {
        ...spots[spotIndex],
        debris: 'wood',
      };

      return { ...plot, spots };
    }),
  };

  state = onSpotClick(state, plotIndex, spotIndex);

  assert.equal(state.plots[plotIndex].spots[spotIndex].debris, null);
  assert.equal(state.inventory.wood, 1);
});
