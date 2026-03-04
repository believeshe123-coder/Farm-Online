import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewGame } from './createNewGame.js';
import { placeBuilding, researchTechNode, unlockPlot } from './actions.js';
import { applyProgressionReveals, canResearchTech, recordActionVerb, recordLifetimeResources } from './progression.js';

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

test('locked features cannot be used pre-reveal', () => {
  let state = createNewGame();
  state = { ...state, money: 1000 };

  const blockedMine = placeBuilding(state, 12, 'mine');
  assert.equal(blockedMine.tiles[12].type, 'empty');
  assert.equal(blockedMine.uiMessage, 'Research required for that building.');

  const blockedZoneUnlock = unlockPlot(state, 7, 'greenhouse');
  assert.equal(blockedZoneUnlock.unlockedTiles[7], false);
  assert.equal(blockedZoneUnlock.uiMessage, 'Research required for that zone.');

  state = {
    ...state,
    progression: {
      ...state.progression,
      revealed: ['start', 'gathering'],
    },
  };
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

test('progression reveal evaluates rules and appends one-time notifications', () => {
  let state = createNewGame();

  state = { ...state, tick: 100 };
  state = recordActionVerb(state, 'cut_tree', 1);
  state = recordActionVerb(state, 'cut_grass', 1);
  state = recordActionVerb(state, 'break_rock', 1);
  state = recordLifetimeResources(state, 'lifetimeGathered', { wood: 8, stone: 8 });
  state = recordLifetimeResources(state, 'lifetimeSold', { wood: 4, rock: 2 });
  state = applyProgressionReveals(state);

  assert.deepEqual(state.progression.revealed, ['start', 'gathering', 'trading', 'helpers', 'expansion', 'expedition']);
  const firstNotificationCount = state.progression.notifications.length;
  assert.equal(firstNotificationCount, 5);

  state = applyProgressionReveals(state);
  assert.equal(state.progression.notifications.length, firstNotificationCount);
});
