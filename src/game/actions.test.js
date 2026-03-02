import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewGame } from './createNewGame.js';
import { harvestSpot, onSpotClick } from './actions.js';
import { CROPS } from './constants.js';

test('planting and harvesting carrot credits inventory under carrot key', () => {
  const plotIndex = 6;
  const spotIndex = 0;

  let state = createNewGame();

  state = {
    ...state,
    selectedTool: { kind: 'tool', id: 'hoe' },
  };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = {
    ...state,
    selectedTool: { kind: 'tool', id: 'water' },
  };
  state = onSpotClick(state, plotIndex, spotIndex);

  state = {
    ...state,
    selectedTool: { kind: 'item', id: 'carrot_seed' },
  };
  state = onSpotClick(state, plotIndex, spotIndex);

  assert.equal(state.plots[plotIndex].spots[spotIndex].crop?.cropId, 'carrot');
  assert.equal(state.inventory.carrot_seed ?? 0, 0);

  state = {
    ...state,
    tick: CROPS.carrot.growTime,
  };

  state = harvestSpot(state, plotIndex, spotIndex);

  assert.equal(state.inventory.carrot ?? 0, 1);
  assert.equal(state.inventory.carrot_seed ?? 0, 1);
});
