import { DAY_TICKS } from './economy.js';

export const PROGRESSION_STEPS = ['start', 'gathering', 'trading', 'helpers', 'expansion', 'expedition'];

export const revealRules = {
  start: {},
  gathering: {
    elapsedTicks: 8,
    actionsByVerb: {
      cut_tree: 1,
      cut_grass: 1,
      break_rock: 1,
    },
  },
  trading: {
    elapsedTicks: 20,
    lifetimeResourcesGathered: {
      wood: 2,
      stone: 2,
    },
  },
  helpers: {
    elapsedTicks: 35,
    lifetimeResourcesSold: {
      wood: 2,
    },
  },
  expansion: {
    elapsedTicks: 55,
    lifetimeResourcesSold: {
      wood: 4,
      rock: 2,
    },
    workersHired: 0,
  },
  expedition: {
    elapsedTicks: 80,
    lifetimeResourcesGathered: {
      stone: 8,
    },
    workersHired: 0,
  },
};

export const TECH_NODES = {
  automation: {
    id: 'automation',
    name: 'Automation',
    cost: 30,
    description: 'Unlocks industrial workflows and boosts recipe output.',
    unlocks: {
      buildings: ['workshop'],
      recipes: ['flour'],
    },
    effects: {
      conversionRateMultiplier: 1.15,
    },
    mutuallyExclusive: ['genetics'],
  },
  irrigation: {
    id: 'irrigation',
    name: 'Irrigation',
    cost: 35,
    description: 'Unlocks water-optimized zones and reduces water upkeep.',
    unlocks: {
      zones: ['greenhouse'],
    },
    effects: {
      upkeepMultipliers: {
        water: 0.7,
      },
    },
    mutuallyExclusive: ['heavy_industry'],
  },
  genetics: {
    id: 'genetics',
    name: 'Genetics',
    cost: 40,
    description: 'Unlocks bio-focused zones and recipes for high value crops.',
    unlocks: {
      zones: ['seed_lab', 'pasture'],
      recipes: ['feed'],
    },
    effects: {
      conversionRateMultiplier: 1.2,
    },
    mutuallyExclusive: ['automation'],
  },
  heavy_industry: {
    id: 'heavy_industry',
    name: 'Heavy Industry',
    cost: 45,
    description: 'Unlocks extractive industry and lowers mechanical upkeep.',
    unlocks: {
      buildings: ['mine'],
      zones: ['quarry'],
    },
    effects: {
      upkeepMultipliers: {
        energy: 0.75,
        stone: 0.8,
      },
    },
    mutuallyExclusive: ['irrigation'],
  },
  logistics: {
    id: 'logistics',
    name: 'Logistics',
    cost: 50,
    description: 'Unlocks advanced export and better market intelligence.',
    unlocks: {
      buildings: ['truck'],
    },
    effects: {
      upkeepMultiplierAll: 0.9,
      marketIntelLevel: 2,
    },
    mutuallyExclusive: [],
  },
};

export const MILESTONES = {
  positive_balance_10_days: {
    id: 'positive_balance_10_days',
    name: 'Balanced Operations',
    description: 'Sustain positive food/water balance for 10 days.',
    reward: { researchPoints: 25, coins: 120 },
  },
};

const BASE_UNLOCKS = {
  buildings: new Set(),
  zones: new Set(),
  recipes: new Set([]),
};

const STEP_UNLOCKS = {
  start: {
    buildings: ['coop', 'barn', 'forest', 'silo', 'mill', 'market_stall'],
    zones: ['field', 'forest'],
    recipes: [],
  },
  gathering: {
    buildings: ['mine'],
    zones: ['quarry'],
    recipes: [],
  },
  trading: {
    buildings: ['truck'],
    zones: [],
    recipes: [],
  },
  helpers: {
    buildings: ['workshop'],
    zones: [],
    recipes: ['flour'],
  },
  expansion: {
    buildings: [],
    zones: ['greenhouse'],
    recipes: [],
  },
  expedition: {
    buildings: [],
    zones: ['seed_lab', 'pasture'],
    recipes: ['feed'],
  },
};

export function createInitialProgressionState(startingWorkerCount = 0) {
  return {
    researchPoints: 0,
    researchedTechs: [],
    revealed: ['start'],
    stats: {
      actionCounts: {},
      lifetimeGathered: {},
      lifetimeSold: {},
      startingWorkerCount,
    },
    milestones: {
      positiveBalanceDays: 0,
      completed: [],
    },
    notifications: [],
  };
}

function withDefaultProgressionState(progression, state = null) {
  const baselineWorkers = state?.workers?.length ?? progression?.stats?.startingWorkerCount ?? 0;
  return {
    ...createInitialProgressionState(baselineWorkers),
    ...(progression ?? {}),
    revealed: Array.isArray(progression?.revealed) ? progression.revealed : ['start'],
    stats: {
      actionCounts: {},
      lifetimeGathered: {},
      lifetimeSold: {},
      startingWorkerCount: baselineWorkers,
      ...(progression?.stats ?? {}),
    },
    milestones: {
      positiveBalanceDays: 0,
      completed: [],
      ...(progression?.milestones ?? {}),
    },
    notifications: Array.isArray(progression?.notifications) ? progression.notifications : [],
  };
}

function addNotification(progression, message) {
  return {
    ...progression,
    notifications: [...(progression.notifications ?? []), { id: `${Date.now()}-${Math.random()}`, message }],
  };
}

export function getResearchPointGeneration(state) {
  const unlockedPlots = state.unlockedTiles?.filter(Boolean).length ?? 1;
  const base = 3;
  const scale = Math.floor(unlockedPlots / 2);
  const milestoneBonus = (state.progression?.milestones?.completed?.length ?? 0) * 1;
  return base + scale + milestoneBonus;
}

export function getUnlockedFeatures(progression) {
  const safeProgression = withDefaultProgressionState(progression);
  const unlocked = {
    buildings: new Set(BASE_UNLOCKS.buildings),
    zones: new Set(BASE_UNLOCKS.zones),
    recipes: new Set(BASE_UNLOCKS.recipes),
  };

  (safeProgression.revealed ?? []).forEach((stepId) => {
    const unlocks = STEP_UNLOCKS[stepId];
    if (!unlocks) {
      return;
    }

    (unlocks.buildings ?? []).forEach((id) => unlocked.buildings.add(id));
    (unlocks.zones ?? []).forEach((id) => unlocked.zones.add(id));
    (unlocks.recipes ?? []).forEach((id) => unlocked.recipes.add(id));
  });

  return unlocked;
}

export function isFeatureUnlocked(state, type, id) {
  const unlocked = getUnlockedFeatures(withDefaultProgressionState(state.progression, state));
  return unlocked[type]?.has(id) ?? false;
}

export function recordActionVerb(state, verb, amount = 1) {
  if (!verb || amount <= 0) {
    return state;
  }

  const progression = withDefaultProgressionState(state.progression, state);
  const actionCounts = progression.stats?.actionCounts ?? {};
  return {
    ...state,
    progression: {
      ...progression,
      stats: {
        ...progression.stats,
        actionCounts: {
          ...actionCounts,
          [verb]: (actionCounts[verb] ?? 0) + amount,
        },
      },
    },
  };
}

export function recordLifetimeResources(state, bucket, resources = {}) {
  if (!bucket || (bucket !== 'lifetimeGathered' && bucket !== 'lifetimeSold')) {
    return state;
  }

  const entries = Object.entries(resources).filter(([, amount]) => Number(amount) > 0);
  if (entries.length === 0) {
    return state;
  }

  const progression = withDefaultProgressionState(state.progression, state);
  const current = progression.stats?.[bucket] ?? {};
  const nextBucket = { ...current };

  entries.forEach(([resourceId, amount]) => {
    nextBucket[resourceId] = (nextBucket[resourceId] ?? 0) + amount;
  });

  return {
    ...state,
    progression: {
      ...progression,
      stats: {
        ...progression.stats,
        [bucket]: nextBucket,
      },
    },
  };
}

function doesRulePass(rule = {}, state, progression) {
  const elapsedTicks = state.tick ?? 0;
  if (typeof rule.elapsedTicks === 'number' && elapsedTicks < rule.elapsedTicks) {
    return false;
  }

  const actionCounts = progression.stats?.actionCounts ?? {};
  const gathered = progression.stats?.lifetimeGathered ?? {};
  const sold = progression.stats?.lifetimeSold ?? {};

  if (!Object.entries(rule.actionsByVerb ?? {}).every(([verb, amount]) => (actionCounts[verb] ?? 0) >= amount)) {
    return false;
  }

  if (!Object.entries(rule.lifetimeResourcesGathered ?? {}).every(([resourceId, amount]) => (gathered[resourceId] ?? 0) >= amount)) {
    return false;
  }

  if (!Object.entries(rule.lifetimeResourcesSold ?? {}).every(([resourceId, amount]) => (sold[resourceId] ?? 0) >= amount)) {
    return false;
  }

  const startingWorkers = progression.stats?.startingWorkerCount ?? (state.workers?.length ?? 0);
  const workersHired = Math.max(0, (state.workers?.length ?? 0) - startingWorkers);
  if (typeof rule.workersHired === 'number' && workersHired < rule.workersHired) {
    return false;
  }

  return true;
}

export function applyProgressionReveals(state) {
  const progression = withDefaultProgressionState(state.progression, state);
  const alreadyRevealed = new Set(progression.revealed ?? []);
  const revealedNow = [];

  for (const stepId of PROGRESSION_STEPS) {
    if (alreadyRevealed.has(stepId)) {
      continue;
    }

    const rule = revealRules[stepId] ?? {};
    if (!doesRulePass(rule, state, progression)) {
      break;
    }

    alreadyRevealed.add(stepId);
    revealedNow.push(stepId);
  }

  if (revealedNow.length === 0) {
    return {
      ...state,
      progression,
    };
  }

  let nextProgression = {
    ...progression,
    revealed: PROGRESSION_STEPS.filter((stepId) => alreadyRevealed.has(stepId)),
  };

  revealedNow.forEach((stepId) => {
    nextProgression = addNotification(nextProgression, `Progression unlocked: ${stepId}`);
  });

  return {
    ...state,
    progression: nextProgression,
  };
}

export function getProgressionEffects(progression) {
  return (progression?.researchedTechs ?? []).reduce((effects, techId) => {
    const tech = TECH_NODES[techId];
    if (!tech) {
      return effects;
    }

    effects.conversionRateMultiplier *= tech.effects?.conversionRateMultiplier ?? 1;
    effects.upkeepMultiplierAll *= tech.effects?.upkeepMultiplierAll ?? 1;

    Object.entries(tech.effects?.upkeepMultipliers ?? {}).forEach(([resourceId, value]) => {
      effects.upkeepMultipliers[resourceId] = (effects.upkeepMultipliers[resourceId] ?? 1) * value;
    });

    effects.marketIntelLevel = Math.max(effects.marketIntelLevel, tech.effects?.marketIntelLevel ?? 0);
    return effects;
  }, {
    conversionRateMultiplier: 1,
    upkeepMultiplierAll: 1,
    upkeepMultipliers: {},
    marketIntelLevel: 0,
  });
}

export function canResearchTech(state, techId) {
  const tech = TECH_NODES[techId];
  if (!tech) {
    return false;
  }

  const progression = state.progression ?? createInitialProgressionState();
  if ((progression.researchedTechs ?? []).includes(techId)) {
    return false;
  }

  if ((progression.researchPoints ?? 0) < tech.cost) {
    return false;
  }

  return !tech.mutuallyExclusive.some((otherTechId) => (progression.researchedTechs ?? []).includes(otherTechId));
}

export function researchTech(state, techId) {
  if (!canResearchTech(state, techId)) {
    return state;
  }

  const tech = TECH_NODES[techId];
  const progression = state.progression ?? createInitialProgressionState();
  const nextProgression = addNotification({
    ...progression,
    researchPoints: progression.researchPoints - tech.cost,
    researchedTechs: [...progression.researchedTechs, techId],
  }, `Research complete: ${tech.name}`);

  return {
    ...state,
    progression: nextProgression,
  };
}

export function clearProgressionNotifications(state) {
  return {
    ...state,
    progression: {
      ...(state.progression ?? createInitialProgressionState()),
      notifications: [],
    },
  };
}

function applyUpkeepMultiplierToCost(costMap = {}, effects) {
  return Object.fromEntries(
    Object.entries(costMap).map(([resourceId, amount]) => {
      const specific = effects.upkeepMultipliers?.[resourceId] ?? 1;
      const scaled = amount * specific * effects.upkeepMultiplierAll;
      return [resourceId, Math.max(0, Math.ceil(scaled))];
    })
  );
}

export function getScaledUpkeepCost(costMap, progression) {
  return applyUpkeepMultiplierToCost(costMap, getProgressionEffects(progression));
}

export function getMilestoneStatus(state) {
  const progression = state.progression ?? createInitialProgressionState();
  const completed = new Set(progression.milestones?.completed ?? []);
  return {
    positive_balance_10_days: {
      ...MILESTONES.positive_balance_10_days,
      progress: progression.milestones?.positiveBalanceDays ?? 0,
      target: 10,
      completed: completed.has('positive_balance_10_days'),
    },
  };
}

export function applyDailyProgression(state, nextTick) {
  if (nextTick % DAY_TICKS !== 0) {
    return state;
  }

  const progression = state.progression ?? createInitialProgressionState();
  const completed = new Set(progression.milestones?.completed ?? []);
  const feedPool = state.resourcePools?.feed?.amount ?? 0;
  const waterPool = state.resourcePools?.water?.amount ?? 0;
  const hasPositiveBalance = feedPool > 0 && waterPool > 0;

  const nextDays = hasPositiveBalance ? (progression.milestones?.positiveBalanceDays ?? 0) + 1 : 0;
  let nextProgression = {
    ...progression,
    researchPoints: progression.researchPoints + getResearchPointGeneration(state),
    milestones: {
      ...(progression.milestones ?? {}),
      positiveBalanceDays: nextDays,
      completed: [...completed],
    },
  };

  if (!completed.has('positive_balance_10_days') && nextDays >= 10) {
    completed.add('positive_balance_10_days');
    nextProgression = addNotification({
      ...nextProgression,
      researchPoints: nextProgression.researchPoints + MILESTONES.positive_balance_10_days.reward.researchPoints,
      money: state.money,
      milestones: {
        ...nextProgression.milestones,
        completed: [...completed],
      },
    }, 'Milestone reached: Balanced Operations');

    return {
      ...state,
      money: state.money + MILESTONES.positive_balance_10_days.reward.coins,
      progression: {
        ...nextProgression,
        milestones: {
          ...nextProgression.milestones,
          completed: [...completed],
        },
      },
    };
  }

  return {
    ...state,
    progression: nextProgression,
  };
}
