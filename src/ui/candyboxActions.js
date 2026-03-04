const EARLY_GAME_VISIBLE_ACTION_LIMIT = 5;

function hasMilestone(progression, milestoneId) {
  return (progression?.milestones?.completed ?? []).includes(milestoneId);
}

function hasTech(progression, techId) {
  return (progression?.researchedTechs ?? []).includes(techId);
}

function isEarlyGame(progression) {
  const techCount = progression?.researchedTechs?.length ?? 0;
  const milestoneCount = progression?.milestones?.completed?.length ?? 0;
  return techCount === 0 && milestoneCount === 0;
}

export function getAvailableActions(gameState) {
  const progression = gameState.progression ?? {};
  const handlers = gameState.handlers ?? {};
  const selectedSpot = gameState.selectedSpot;
  const plantableSeeds = gameState.plantableSeeds ?? [];
  const sellableItems = gameState.sellableItems ?? [];

  const automationUnlocked = hasTech(progression, 'automation');
  const contractsUnlocked = hasTech(progression, 'logistics') || hasMilestone(progression, 'positive_balance_10_days');
  const coopUnlocked = hasTech(progression, 'genetics') || hasMilestone(progression, 'positive_balance_10_days');
  const researchUnlocked = (progression.researchPoints ?? 0) > 0 || hasMilestone(progression, 'positive_balance_10_days');

  const actions = [
    {
      id: 'clear-debris',
      label: selectedSpot?.debris ? `Clear ${selectedSpot.debris}` : 'Clear debris',
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
      label: 'Harvest ready crops',
      isVisible: automationUnlocked,
      isEnabled: automationUnlocked,
      execute: handlers.onHarvestReady,
    },
    ...sellableItems.map((item) => ({
      id: `sell-${item.itemId}`,
      label: `Sell 1 ${item.itemId}`,
      isVisible: contractsUnlocked,
      isEnabled: (gameState.inventory?.[item.itemId] ?? 0) > 0,
      execute: () => handlers.onSellOne?.(item.itemId),
    })),
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

  if (!isEarlyGame(progression)) {
    return actions;
  }

  let visibleCount = 0;
  return actions.map((action) => {
    if (!action.isVisible) {
      return action;
    }

    visibleCount += 1;
    return {
      ...action,
      isVisible: visibleCount <= EARLY_GAME_VISIBLE_ACTION_LIMIT,
    };
  });
}
