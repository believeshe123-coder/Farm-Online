import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveGrassCut, resolveRockBreak, resolveTreeChop } from './minigames.js';

test('resolveTreeChop rewards accurate timing', () => {
  const good = resolveTreeChop(0.5, 0);
  const bad = resolveTreeChop(0.05, 0);

  assert.equal(good.extraYield.wood, 1);
  assert.equal(bad.extraYield.wood, 0);
});

test('resolveGrassCut grants periodic streak bonus', () => {
  const first = resolveGrassCut(0);
  const second = resolveGrassCut(first.nextStreak);
  const third = resolveGrassCut(second.nextStreak);

  assert.equal(first.extraYield.seeds, 0);
  assert.equal(second.extraYield.seeds, 0);
  assert.equal(third.extraYield.seeds, 1);
});

test('resolveRockBreak uses charge and crit window', () => {
  const noCrit = resolveRockBreak(1, false);
  const crit = resolveRockBreak(1, true);

  assert.equal(noCrit.extraYield.rock, 0);
  assert.equal(crit.extraYield.rock, 1);
  assert.equal(crit.nextCharge, 0);
});
