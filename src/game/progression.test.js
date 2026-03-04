import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewGame } from './createNewGame.js';
import { placeBuilding, researchTechNode, unlockPlot } from './actions.js';
import { canResearchTech } from './progression.js';

function withResearchPoints(state, amount) {
  return {
    ...state,
    progression: {
      ...state.progression,
      researchPoints: amount,
    },
  };
}

test('research costs are enforced and consumed on unlock', () => {
  let state = createNewGame();

  assert.equal(canResearchTech(state, 'automation'), false);
  const unchanged = researchTechNode(state, 'automation');
  assert.equal(unchanged.progression.researchedTechs.includes('automation'), false);

  state = withResearchPoints(state, 40);
  assert.equal(canResearchTech(state, 'automation'), true);
  const researched = researchTechNode(state, 'automation');

  assert.equal(researched.progression.researchedTechs.includes('automation'), true);
  assert.equal(researched.progression.researchPoints, 10);
});

test('locked features cannot be used pre-unlock', () => {
  let state = createNewGame();
  state = { ...state, money: 1000 };

  const blockedMine = placeBuilding(state, 12, 'mine');
  assert.equal(blockedMine.tiles[12].type, 'empty');
  assert.equal(blockedMine.uiMessage, 'Research required for that building.');

  const blockedZoneUnlock = unlockPlot(state, 7, 'greenhouse');
  assert.equal(blockedZoneUnlock.unlockedTiles[7], false);
  assert.equal(blockedZoneUnlock.uiMessage, 'Research required for that zone.');

  state = researchTechNode(withResearchPoints(state, 50), 'heavy_industry');
  const unlockedMine = placeBuilding(state, 12, 'mine');
  assert.equal(unlockedMine.tiles[12].type, 'mine');
});

test('mutually exclusive branches are respected', () => {
  let state = withResearchPoints(createNewGame(), 100);

  state = researchTechNode(state, 'automation');
  assert.equal(state.progression.researchedTechs.includes('automation'), true);

  const geneticsAttempt = researchTechNode(state, 'genetics');
  assert.equal(geneticsAttempt.progression.researchedTechs.includes('genetics'), false);
  assert.equal(geneticsAttempt.uiMessage, 'Cannot research that technology yet.');
});
