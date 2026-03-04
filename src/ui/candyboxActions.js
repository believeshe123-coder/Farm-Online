const MAX_ACTIONS_BY_TIER = {
  start: 3,
  gathering: 4,
  trading: 4,
  helpers: 5,
  expansion: 6,
  expedition: 6,
};

function hasReveal(progression, stepId) {
  return (progression?.revealed ?? []).includes(stepId);
}

function maybeAction(id, label, isVisible, isEnabled, execute) {
  return {
    id,
    label,
    isVisible,
    isEnabled,
    execute,
  };
}

function getTierCap(progression) {
  const revealed = progression?.revealed ?? ['start'];
  const highestTier = revealed[revealed.length - 1] ?? 'start';
  return MAX_ACTIONS_BY_TIER[highestTier] ?? 3;
}

function getDebrisActionLabel(debrisType) {
  if (debrisType === 'wood') {
    return 'Cut down trees';
  }

  if (debrisType === 'grass') {
    return 'Cut grass';
  }

  if (debrisType === 'rock') {
    return 'Break rocks';
  }

  return 'Clear debris';
}

export function getAvailableActions(gameState) {
  const progression = gameState.progression ?? {};
  const handlers = gameState.handlers ?? {};
  const selectedSpot = gameState.selectedSpot;
  const plantableSeeds = gameState.plantableSeeds ?? [];
  const sellableItems = gameState.sellableItems ?? [];

  const tier1Visible = hasReveal(progression, 'start');
  const tier2Visible = hasReveal(progression, 'trading');
  const tier3Visible = hasReveal(progression, 'helpers');
  const tier4Visible = hasReveal(progression, 'expansion');
  const tier5Visible = hasReveal(progression, 'expansion');
  const tier6Visible = hasReveal(progression, 'expedition');

  const primarySeed = plantableSeeds[0];
  const primarySell = sellableItems[0];

  const workerHireCost = gameState.workerHireCost ?? 0;
  const workerUpgradeCost = gameState.workerUpgradeCost ?? 0;

  const actions = [
<<<<<<< codex/add-progression-layer-with-reveal-rules
    // Tier 1: core resource verbs
    maybeAction(
      'cut-down-trees',
      'Cut down trees',
      tier1Visible,
      Boolean(selectedSpot?.debris === 'wood'),
      handlers.onClearDebris
    ),
    maybeAction(
      'cut-grass',
      'Cut grass',
      tier1Visible,
      Boolean(selectedSpot?.debris === 'seeds'),
      handlers.onClearDebris
    ),
    maybeAction(
      'break-rocks',
      'Break rocks',
      tier1Visible,
      Boolean(selectedSpot?.debris === 'rock'),
      handlers.onClearDebris
    ),

    // Tier 2: trade
    maybeAction(
      'sell-resources',
      primarySell ? `Sell ${primarySell.itemId}` : 'Sell resources',
      tier2Visible,
      Boolean(primarySell),
      primarySell ? () => handlers.onSellOne?.(primarySell.itemId) : undefined
    ),

    // Tier 3: helpers
    maybeAction(
      'hire-worker',
      'Hire worker',
      tier3Visible,
      Boolean(handlers.onHireWorker)
        && (gameState.money ?? 0) >= (gameState.nextHireCost?.coins ?? 0)
        && ((gameState.resourcePools?.permits?.amount ?? 0) >= (gameState.nextHireCost?.permits ?? 0)),
      handlers.onHireWorker
    ),

    // Tier 4: upgrades
    maybeAction(
      'upgrade-workers',
      'Upgrade workers',
      tier4Visible,
      Boolean(handlers.onUpgradeWorkers)
        && (gameState.money ?? 0) >= (gameState.nextToolUpgradeCost?.coins ?? 0)
        && ((gameState.resourcePools?.permits?.amount ?? 0) >= (gameState.nextToolUpgradeCost?.permits ?? 0)),
      handlers.onUpgradeWorkers
    ),

    // Tier 5: land
    maybeAction(
      'buy-land',
      'Buy land',
      tier5Visible,
      Boolean(gameState.canUnlockSelected)
        && (gameState.money ?? 0) >= (gameState.unlockSelectedCost?.coins ?? 0)
        && ((gameState.resourcePools?.permits?.amount ?? 0) >= (gameState.unlockSelectedCost?.permits ?? 0)),
      handlers.onUnlockSelected
    ),

    // Tier 6+: expedition/minigame verbs
    maybeAction(
      'expedition',
      'Go beyond',
      tier6Visible,
      false,
      undefined
    ),
    maybeAction(
      'strange-game',
      'Play strange game',
      tier6Visible,
      false,
      undefined
    ),
=======
    {
      id: 'clear-debris',
      label: getDebrisActionLabel(selectedSpot?.debris),
      isVisible: Boolean(selectedSpot?.debris),
      isEnabled: Boolean(selectedSpot?.debris),
      execute: handlers.onClearDebris,
    },
    {
      id: 'till-selected',
      label: 'Till selected plot',
      isVisible: Boolean(selectedSpot && selectedSpot.soil === 'raw' && !selectedSpot.crop),
      isEnabled: Boolean(selectedSpot && selectedSpot.soil === 'raw' && !selectedSpot.crop),
      execute: handlers.onTill,
    },
    {
      id: 'water-selected',
      label: 'Water selected crop',
      isVisible: Boolean(selectedSpot?.crop),
      isEnabled: Boolean(selectedSpot?.crop),
      execute: handlers.onWater,
    },
    {
      id: 'harvest-selected',
      label: 'Harvest selected crop',
      isVisible: Boolean(selectedSpot?.crop),
      isEnabled: Boolean(selectedSpot?.crop),
      execute: handlers.onHarvestSelected,
    },
    ...plantableSeeds.map((seed) => ({
      id: `plant-${seed.itemId}`,
      label: `Plant ${seed.label}`,
      isVisible: Boolean(selectedSpot && !selectedSpot.crop && (selectedSpot.soil === 'hoed' || selectedSpot.soil === 'watered')),
      isEnabled: (gameState.inventory?.[seed.itemId] ?? 0) > 0,
      execute: () => handlers.onPlant?.(seed.itemId),
    })),
    {
      id: 'harvest-ready',
      label: 'Harvest ready on active plot',
      isVisible: automationUnlocked,
      isEnabled: automationUnlocked,
      execute: handlers.onHarvestReadyOnActivePlot,
    },
    {
      id: 'water-dry-planted',
      label: 'Water dry planted on active plot',
      isVisible: automationUnlocked,
      isEnabled: automationUnlocked,
      execute: handlers.onWaterDryPlantedOnActivePlot,
    },
    ...sellableItems.map((item) => ({
      id: `sell-${item.itemId}`,
      label: `Sell 1 ${item.itemId}`,
      isVisible: contractsUnlocked,
      isEnabled: (gameState.inventory?.[item.itemId] ?? 0) > 0,
      execute: () => handlers.onSellOne?.(item.itemId),
    })),

    {
      id: 'hire-worker',
      label: `Hire worker ($${workerHireCost})`,
      isVisible: true,
      isEnabled: (gameState.money ?? 0) >= workerHireCost,
      execute: handlers.onHireWorker,
    },
    {
      id: 'upgrade-workers',
      label: `Upgrade workers ($${workerUpgradeCost})`,
      isVisible: true,
      isEnabled: (gameState.money ?? 0) >= workerUpgradeCost,
      execute: handlers.onUpgradeWorkers,
    },
    {
      id: 'unlock-selected',
      label: 'Unlock selected plot',
      isVisible: coopUnlocked && Boolean(gameState.canUnlockSelected),
      isEnabled: Boolean(gameState.canUnlockSelected) && (gameState.money ?? 0) >= (gameState.unlockSelectedCost ?? 0),
      execute: handlers.onUnlockSelected,
    },
    {
      id: 'research-overview',
      label: 'Research options (coming soon)',
      isVisible: researchUnlocked,
      isEnabled: false,
      execute: undefined,
    },
  ].filter((action) => typeof action.execute === 'function' || action.id === 'research-overview');
>>>>>>> main

    // Keep a tiny utility action for early play loop
    maybeAction(
      'plant-seed',
      primarySeed ? `Plant ${primarySeed.label}` : 'Plant seed',
      tier1Visible,
      Boolean(primarySeed && selectedSpot && !selectedSpot.crop && (selectedSpot.soil === 'hoed' || selectedSpot.soil === 'watered')),
      primarySeed ? () => handlers.onPlant?.(primarySeed.itemId) : undefined
    ),
  ];

  const cap = getTierCap(progression);

  return actions
    .filter((action) => action.isVisible)
    .slice(0, cap)
    .map((action) => ({
      ...action,
      // keep unrevealed/future verbs visible but intentionally inert
      execute: typeof action.execute === 'function' ? action.execute : () => {},
      isEnabled: Boolean(action.isEnabled && typeof action.execute === 'function'),
    }));
}
