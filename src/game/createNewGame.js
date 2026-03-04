import { BUILDING_MAINTENANCE, BUILDING_OPERATING_COSTS, DAILY_UPKEEP_DEMANDS, createInitialResourcePools } from './economy.js';
import { createInitialWorkers, withAutomationDefaults } from './workers.js';
import { createInitialContractState } from './contracts.js';
import { createInitialBuildingChainState, getBaselineMarketPrices } from './constants.js';
import { createInitialProgressionState } from './progression.js';

export function getRandomDebris() {
  const roll = Math.random();

  if (roll < 0.25) {
    return 'wood';
  }

  if (roll < 0.5) {
    return 'seeds';
  }

  if (roll < 0.75) {
    return 'rock';
  }

  return null;
}

export function createSpot() {
  return {
    soil: 'raw',
    crop: null,
    debris: getRandomDebris(),
  };
}

export function createPlot(zoneType = 'field') {
  return {
    zoneType,
    level: 1,
    assignedWorkers: 1,
    automation: withAutomationDefaults({
      enabled: true,
      minInputStock: 1,
      targetOutputStock: 15,
    }),
    productionPolicy: null,
    spots: Array.from({ length: 25 }, createSpot),
  };
}

export function createNewGame() {
  const gridSize = 5;
  const totalTiles = gridSize * gridSize;
  const centerIndex = Math.floor(totalTiles / 2);
  const unlockedTiles = Array.from({ length: totalTiles }, (_, index) => index === centerIndex);

  const resourcePools = createInitialResourcePools();
  const marketPrices = getBaselineMarketPrices();

  return {
    tick: 0,
    money: resourcePools.coins.amount,
    renderMode: 'glyph',
    gridSize,
    tiles: Array.from({ length: totalTiles }, () => ({
      type: 'empty',
      automation: withAutomationDefaults(),
    })),
    plots: Array.from({ length: totalTiles }, createPlot),
    workers: createInitialWorkers(6),
    workerConfig: {
      toolLevel: 0,
      fatigueEnabled: false,
      upkeepEnabled: false,
    },
    sellQueue: [],
    market: {
      prices: marketPrices,
      trends: Object.fromEntries(Object.keys(marketPrices).map((itemId) => [itemId, 0])),
      lastDailyUpdateTick: 0,
      lastWeeklyUpdateTick: 0,
    },
    contracts: createInitialContractState(0),
    autoSellPolicy: { enabled: false, defaultMinStock: 0, minStockByItem: {} },
    unlockedTiles,
    resourcePools,
    dailyUpkeepDemands: structuredClone(DAILY_UPKEEP_DEMANDS),
    buildingOperatingCosts: structuredClone(BUILDING_OPERATING_COSTS),
    buildingMaintenanceConfig: structuredClone(BUILDING_MAINTENANCE),
    buildingMaintenanceTimers: {},
    economyStatus: {
      lastShortages: [],
      lastOverflow: {},
      lastSoldAtLossCoins: 0,
      lastUpkeepTick: 0,
    },
    inventory: {},
    hotbarItems: [],
    selected: null,
    selectedTool: { kind: 'tool', id: 'hoe' },
    uiMessage: '',
    buildingChain: createInitialBuildingChainState(),
    progression: createInitialProgressionState(),
  };
}
