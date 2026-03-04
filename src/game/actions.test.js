import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewGame } from './createNewGame.js';
import {
  buyItem,
  getRandomCropId,
  harvestSpot,
  isCropHydratedAtTick,
  onSpotClick,
  placeBuilding,
  collectResourceFromTile,
  sellItem,
  unlockPlot,
  canAffordCost,
  applyCost,
  applyYield,
} from './actions.js';
import { CROPS, SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS, WATERING_DURATION_TICKS } from './constants.js';
import { advanceTick } from './tick.js';

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




test('generic seed roll strongly favors cheap crops over expensive ones', () => {
  const totalRolls = 20000;
  const counts = { wheat: 0, ancient_crop: 0 };

  for (let i = 0; i < totalRolls; i += 1) {
    const cropId = getRandomCropId();
    if (cropId === 'wheat') {
      counts.wheat += 1;
    }
    if (cropId === 'ancient_crop') {
      counts.ancient_crop += 1;
    }
  }

  assert.ok(counts.wheat > counts.ancient_crop * 15, `Expected wheat to be far more common than ancient crop. Wheat=${counts.wheat}, Ancient=${counts.ancient_crop}`);
});
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

test('selling an item down to zero removes it from inventory and hotbar', () => {
  const state = {
    ...createNewGame(),
    inventory: { carrot: 1 },
    hotbarItems: ['carrot'],
    selectedTool: { kind: 'item', id: 'carrot' },
  };

  const nextState = sellItem(state, 'carrot', 1);

  assert.equal(nextState.inventory.carrot, undefined);
  assert.equal(nextState.hotbarItems.includes('carrot'), false);
  assert.deepEqual(nextState.selectedTool, { kind: 'tool', id: 'hoe' });
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

test('placing forest and mine creates resource areas', () => {
  const baseState = { ...createNewGame(), money: 1000 };

  const forestState = placeBuilding(baseState, 12, 'forest');
  const mineState = placeBuilding(baseState, 12, 'mine');

  assert.equal(forestState.tiles[12].type, 'forest');
  assert.equal(forestState.tiles[12].resource?.itemId, 'wood');
  assert.equal(mineState.tiles[12].type, 'mine');
  assert.equal(mineState.tiles[12].resource?.itemId, 'rock');
});

test('forest can be collected when fully charged', () => {
  let state = { ...createNewGame(), money: 1000 };
  state = placeBuilding(state, 12, 'forest');

  for (let i = 0; i < state.tiles[12].resource.maxCharge; i += 1) {
    state = advanceTick(state);
  }

  const collectedState = collectResourceFromTile(state, 12);

  assert.equal(collectedState.inventory.wood, 3);
  assert.equal(collectedState.tiles[12].resource.charge, 0);
  assert.ok(collectedState.hotbarItems.includes('wood'));
});

test('watering a planted crop sets lastWateredTick', () => {
  const plotIndex = 12;
  const spotIndex = 1;
  let state = {
    ...createNewGame(),
    inventory: { melon_seed: 1 },
    hotbarItems: ['melon_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  state = { ...state, selectedTool: { kind: 'item', id: 'melon_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = { ...state, tick: 3, selectedTool: { kind: 'tool', id: 'water' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  assert.equal(state.plots[plotIndex].spots[spotIndex].crop?.lastWateredTick, 3);
  assert.equal(state.plots[plotIndex].spots[spotIndex].crop?.watered, true);
});

test('hydration expires after configured watering duration ticks', () => {
  const hydratedCrop = { cropId: 'lettuce', watered: true, lastWateredTick: 2 };

  assert.equal(isCropHydratedAtTick(hydratedCrop, 2 + WATERING_DURATION_TICKS), true);
  assert.equal(isCropHydratedAtTick(hydratedCrop, 2 + WATERING_DURATION_TICKS + 1), false);
});

test('re-watering refreshes hydration window', () => {
  const plotIndex = 12;
  const spotIndex = 1;
  let state = {
    ...createNewGame(),
    inventory: { melon_seed: 1 },
    hotbarItems: ['melon_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  state = { ...state, selectedTool: { kind: 'item', id: 'melon_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = {
    ...state,
    tick: WATERING_DURATION_TICKS + 2,
    selectedTool: { kind: 'tool', id: 'water' },
  };
  state = onSpotClick(state, plotIndex, spotIndex);

  const cropState = state.plots[plotIndex].spots[spotIndex].crop;
  assert.equal(cropState?.lastWateredTick, WATERING_DURATION_TICKS + 2);
  assert.equal(isCropHydratedAtTick(cropState, WATERING_DURATION_TICKS + 2), true);
});

test('advanceTick dries soil after crop hydration expires', () => {
  const plotIndex = 12;
  const spotIndex = 1;
  let state = {
    ...createNewGame(),
    inventory: { melon_seed: 1 },
    hotbarItems: ['melon_seed'],
  };

  state = clearDebrisAndPrepareSoil(state, plotIndex, spotIndex);
  state = { ...state, selectedTool: { kind: 'item', id: 'melon_seed' } };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = {
    ...state,
    tick: WATERING_DURATION_TICKS,
  };

  const nextState = advanceTick(state);
  const nextSpot = nextState.plots[plotIndex].spots[spotIndex];

  assert.equal(nextSpot.soil, 'hoed');
  assert.equal(nextSpot.crop?.watered, false);
});

test('hydrated lettuce harvest produces lettuce instead of wilted lettuce', () => {
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

test('lettuce becomes wilted if hydration has expired before harvest', () => {
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

  state = {
    ...state,
    tick: CROPS.lettuce.growTime + WATERING_DURATION_TICKS + 1,
  };
  state = withMockedRandom(0.99, () => harvestSpot(state, plotIndex, spotIndex));

  assert.equal(state.inventory.lettuce ?? 0, 0);
  assert.equal(state.inventory.lettuce_wilted ?? 0, 1);
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
  ];

  for (const cropId of expectedCropIds) {
    assert.ok(SHOP_SEEDS[`${cropId}_seed`], `Missing ${cropId}_seed in shop`);
  }
});

test('rare crop seeds are not directly purchasable in shop', () => {
  const rareCropIds = Object.entries(CROPS)
    .filter(([, crop]) => crop.tier === 'rare')
    .map(([cropId]) => cropId);

  for (const cropId of rareCropIds) {
    assert.equal(Object.hasOwn(SHOP_SEEDS, `${cropId}_seed`), false);
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

test('unlocking a new plot generates fresh randomized debris spots', () => {
  const targetPlot = 7;
  const baseState = { ...createNewGame(), money: 1000 };
  const initialDebris = baseState.plots[targetPlot].spots.map((spot) => spot.debris);

  const unlockedState = withMockedRandom(0.3, () => unlockPlot(baseState, targetPlot));
  const unlockedDebris = unlockedState.plots[targetPlot].spots.map((spot) => spot.debris);

  assert.equal(unlockedState.unlockedTiles[targetPlot], true);
  assert.ok(unlockedDebris.every((debris) => debris === 'seeds'));
  assert.notDeepEqual(unlockedDebris, initialDebris);
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


test('resource costs block actions correctly through canAfford/apply helpers', () => {
  const state = createNewGame();

  assert.equal(canAffordCost(state, { coins: 5, energy: 5 }), true);
  assert.equal(canAffordCost(state, { coins: 1000 }), false);

  const blockedState = applyCost(state, { energy: 999 });
  assert.equal(blockedState, state);

  const paidState = applyCost(state, { coins: 3, energy: 2 });
  assert.equal(paidState.resourcePools.coins.amount, state.resourcePools.coins.amount - 3);
  assert.equal(paidState.resourcePools.energy.amount, state.resourcePools.energy.amount - 2);
});

test('daily upkeep drains resources per day tick', () => {
  let state = createNewGame();
  state = {
    ...state,
    tick: 23,
    resourcePools: {
      ...state.resourcePools,
      feed: { ...state.resourcePools.feed, amount: 10 },
      energy: { ...state.resourcePools.energy, amount: 10 },
      water: { ...state.resourcePools.water, amount: 10 },
    },
  };

  state = advanceTick(state);

  assert.equal(state.resourcePools.feed.amount, 8);
  assert.equal(state.resourcePools.energy.amount, 9);
  assert.equal(state.resourcePools.water.amount, 12);
});

test('shortages reduce output and storage overflow is sold at loss', () => {
  let state = createNewGame();
  state = {
    ...state,
    resourcePools: {
      ...state.resourcePools,
      feed: { amount: 0, capacity: 200 },
      labor: { amount: 0, capacity: 100 },
      energy: { amount: 0, capacity: 100 },
      water: { amount: 99, capacity: 100 },
      coins: { amount: 500, capacity: 999999 },
    },
    money: 500,
    dailyUpkeepDemands: { pumps: { energy: 0, water: 0 } },
    tick: 23,
  };

  state = placeBuilding(state, 12, 'coop');
  state = {
    ...state,
    resourcePools: { ...state.resourcePools, coins: { ...state.resourcePools.coins, amount: 0 } },
    money: 0,
  };
  state = {
    ...state,
    tiles: state.tiles.map((tile, index) => (index === 12 ? { ...tile, animals: tile.animals.map((a) => ({ ...a, eggTimer: 1 })) } : tile)),
  };

  state = advanceTick(state);

  assert.equal(state.inventory.egg ?? 0, 0);
  assert.equal(state.economyStatus.lastShortages.some((entry) => entry.startsWith('idle:coop:12')), true);

  const afterOverflow = applyYield(state, { water: 10 }, { water: 2 });
  assert.equal(afterOverflow.resourcePools.water.amount, 100);
  assert.equal(afterOverflow.resourcePools.coins.amount > state.resourcePools.coins.amount, true);
  assert.equal(afterOverflow.economyStatus.lastOverflow.water > 0, true);
});
