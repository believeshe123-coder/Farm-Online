function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function resolveTreeChop(inputTiming, toolLevel = 0) {
  const timing = clamp01(inputTiming);
  const accuracy = 1 - Math.abs(timing - 0.5) * 2;
  const tier = Math.max(0, Number(toolLevel) || 0);

  const extraWood = accuracy >= (0.78 - Math.min(0.18, tier * 0.03)) ? 1 : 0;
  const text = extraWood > 0 ? 'Clean cut. Extra wood.' : 'Rough chop.';

  return {
    success: accuracy >= 0.2,
    extraYield: { wood: extraWood },
    nextInputTiming: timing,
    text,
  };
}

export function resolveGrassCut(streakState = 0) {
  const streak = Math.max(0, Number(streakState) || 0) + 1;
  const extraSeeds = streak % 3 === 0 ? 1 : 0;

  return {
    success: true,
    extraYield: { seeds: extraSeeds },
    nextStreak: streak,
    resetStreak: false,
    text: extraSeeds > 0 ? `Combo ${streak}. Extra seeds.` : `Combo ${streak}.`,
  };
}

export function resolveRockBreak(chargeState = 0, critWindow = false) {
  const charge = Math.max(0, Number(chargeState) || 0) + 1;
  const crit = Boolean(critWindow) && charge >= 2;

  return {
    success: true,
    extraYield: { rock: crit ? 1 : 0 },
    nextCharge: crit ? 0 : Math.min(charge, 3),
    nextCritWindow: false,
    text: crit ? 'Shatter! Bonus rock.' : `Charge ${Math.min(charge, 3)}/3.`,
  };
}
