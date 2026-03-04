import { useEffect, useState } from 'react';
import FrontView from './ui/FrontView';
import CandyboxView from './ui/CandyboxView';
import { createNewGame } from './game/createNewGame';
import { createInitialBuildingChainState, SHOP_SEEDS, SELLABLE_ITEMS } from './game/constants';
import { isSpotReadyToHarvest } from './ui/candyboxSummary';
import { createInitialWorkers } from './game/workers';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';
import {
  getLandCost,
  getUnlockablePlots,
  getWorkerHireCost,
  getWorkerToolUpgradeCost,
  harvestSpot,
  hireWorker,
  onSpotClick,
  pulseGrassRhythm,
  pulseRockCritWindow,
  pulseTreeTiming,
  sellItem,
  unlockPlot,
  selectSpot,
  upgradeWorkerTools,
  waterSpot,
  isCropHydratedAtTick,
  hireWorker,
  upgradeWorkerTools,
} from './game/actions';

const MAX_EVENT_LOG_LINES = 100;

function toLogLine(tick, message) {
  return `Tick ${tick}: ${message}`;
}

function toProgressionLogLine(notification) {
  if (!notification) {
    return '';
  }

  if (typeof notification === 'string') {
    return notification;
  }

  if (typeof notification.message === 'string' && notification.message.trim()) {
    return notification.message;
  }

  if (typeof notification.title === 'string' && notification.title.trim()) {
    return notification.title;
  }

  return String(notification);
}

function withSelectedTool(gameState) {
  const hotbarItems = Array.isArray(gameState.hotbarItems) ? gameState.hotbarItems : [];
  const isToolValid = Boolean(
    gameState.selectedTool
    && typeof gameState.selectedTool === 'object'
    && ((gameState.selectedTool.kind === 'tool' && (gameState.selectedTool.id === 'hoe' || gameState.selectedTool.id === 'water'))
      || (gameState.selectedTool.kind === 'item' && hotbarItems.includes(gameState.selectedTool.id)))
  );

  const nextState = {
    ...gameState,
    selectedTool: isToolValid ? gameState.selectedTool : { kind: 'tool', id: 'hoe' },
  };

  return {
    ...nextState,
    workers: Array.isArray(nextState.workers) ? nextState.workers : createInitialWorkers(6),
    workerConfig: {
      toolLevel: 0,
      fatigueEnabled: false,
      upkeepEnabled: false,
      ...(nextState.workerConfig ?? {}),
    },
    sellQueue: Array.isArray(nextState.sellQueue) ? nextState.sellQueue : [],
    market: nextState.market ?? { prices: {}, trends: {}, lastDailyUpdateTick: 0, lastWeeklyUpdateTick: 0 },
    contracts: nextState.contracts ?? { reputation: 1, offers: [], active: [], completed: [], failed: [] },
    autoSellPolicy: nextState.autoSellPolicy ?? { enabled: false, defaultMinStock: 0, minStockByItem: {} },
    buildingChain: { ...createInitialBuildingChainState(), ...(nextState.buildingChain ?? {}) },
    minigames: nextState.minigames ?? {
      tree: { inputTiming: 0.5 },
      grass: { streak: 0 },
      rock: { charge: 0, critWindow: false },
      lastOutcome: '',
    },
    progression: nextState.progression ?? {
      researchPoints: 0,
      researchedTechs: [],
      revealed: ['start'],
      stats: {
        actionCounts: {},
        lifetimeGathered: {},
        lifetimeSold: {},
        startingWorkerCount: (Array.isArray(nextState.workers) ? nextState.workers.length : 6),
      },
      milestones: { positiveBalanceDays: 0, completed: [] },
      notifications: [],
    },
  };
}

function getSelectedIndexes(gameState) {
  const unlockedPlots = gameState.unlockedTiles
    .map((isUnlocked, index) => (isUnlocked ? index : null))
    .filter((index) => Number.isInteger(index));

  const firstUnlockedPlot = unlockedPlots[0] ?? 0;
  const selectedPlotIndex = gameState.selected?.plotIndex ?? firstUnlockedPlot;
  const selectedSpotIndex = gameState.selected?.spotIndex ?? 0;

  return { selectedPlotIndex, selectedSpotIndex, unlockedPlots };
}


function getSpotIndexForGroup(plot, group, gameState) {
  const spots = plot?.spots ?? [];

  if (group === 'ready') {
    const readyIndex = spots.findIndex((spot) => isSpotReadyToHarvest(spot, gameState.tick));
    return readyIndex >= 0 ? readyIndex : 0;
  }

  if (group === 'empty') {
    const emptyIndex = spots.findIndex((spot) => !spot?.crop && !spot?.debris);
    return emptyIndex >= 0 ? emptyIndex : 0;
  }

  if (group === 'debris') {
    const debrisIndex = spots.findIndex((spot) => Boolean(spot?.debris));
    return debrisIndex >= 0 ? debrisIndex : 0;
  }

  return 0;
}

export default function App() {
  const [view, setView] = useState('game');
  const [gameState, setGameState] = useState(() => {
    const savedState = loadGame();
    return withSelectedTool(savedState ?? createNewGame());
  });
  const [isPaused, setIsPaused] = useState(false);
  const [frontMessage, setFrontMessage] = useState('');
  const [activeSpotGroup, setActiveSpotGroup] = useState('all');
  const [eventLog, setEventLog] = useState([]);

  const appendLogEntries = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    setEventLog((prevLog) => [...prevLog, ...entries].slice(-MAX_EVENT_LOG_LINES));
  };

  useEffect(() => {
    saveGame(gameState);
  }, [gameState]);

  useEffect(() => {
    if (view !== 'game' || isPaused) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setGameState((prevState) => {
        const nextState = advanceTick(prevState);
        const tickEntries = [];

        const prevNotifications = prevState.progression?.notifications ?? [];
        const nextNotifications = nextState.progression?.notifications ?? [];
        if (nextNotifications.length > prevNotifications.length) {
          nextNotifications.slice(prevNotifications.length).forEach((notification) => {
            const message = toProgressionLogLine(notification);
            if (message) {
              tickEntries.push(toLogLine(nextState.tick, `Progression: ${message}`));
            }
          });
        }

        const prevOffers = prevState.contracts?.offers?.length ?? 0;
        const nextOffers = nextState.contracts?.offers?.length ?? 0;
        if (nextOffers > prevOffers) {
          tickEntries.push(toLogLine(nextState.tick, `New contracts available (${nextOffers}).`));
        }

        const prevCompletedContracts = prevState.contracts?.completed?.length ?? 0;
        const nextCompletedContracts = nextState.contracts?.completed?.length ?? 0;
        if (nextCompletedContracts > prevCompletedContracts) {
          tickEntries.push(toLogLine(nextState.tick, `Completed contracts: +${nextCompletedContracts - prevCompletedContracts}.`));
        }

        const prevResearch = prevState.progression?.researchedTechs?.length ?? 0;
        const nextResearch = nextState.progression?.researchedTechs?.length ?? 0;
        if (nextResearch > prevResearch) {
          tickEntries.push(toLogLine(nextState.tick, `Completed research: +${nextResearch - prevResearch}.`));
        }

        appendLogEntries(tickEntries);
        return nextState;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [view, isPaused]);

  const handleStartGame = () => {
    setGameState(withSelectedTool(createNewGame()));
    setEventLog([]);
    setIsPaused(false);
    setFrontMessage('');
    setView('game');
  };

  const handleFrontLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(withSelectedTool(savedState));
      setEventLog([]);
      setIsPaused(false);
      setFrontMessage('');
      setView('game');
      return;
    }

    setFrontMessage('No save found yet.');
  };

  if (view === 'front') {
    return (
      <div className="app-shell">
        <FrontView
          onStartGame={handleStartGame}
          onLoadGame={handleFrontLoadGame}
          loadMessage={frontMessage}
        />
      </div>
    );
  }

  const { selectedPlotIndex, selectedSpotIndex, unlockedPlots } = getSelectedIndexes(gameState);
  const selectedPlot = gameState.plots[selectedPlotIndex];
  const selectedSpot = selectedPlot?.spots?.[selectedSpotIndex] ?? null;
  const selectedTile = gameState.tiles[selectedPlotIndex] ?? null;
  const selectedUnlockedPosition = unlockedPlots.indexOf(selectedPlotIndex);
  const canGoPrevPlot = selectedUnlockedPosition > 0;
  const canGoNextPlot = selectedUnlockedPosition >= 0 && selectedUnlockedPosition < unlockedPlots.length - 1;

  const plantableSeeds = Object.entries(SHOP_SEEDS)
    .filter(([itemId]) => (gameState.inventory[itemId] ?? 0) > 0)
    .slice(0, 4)
    .map(([itemId, item]) => ({ itemId, label: item.name.replace(/ Seeds$/, '') }));

  const sellableItems = Object.keys(SELLABLE_ITEMS)
    .filter((itemId) => (gameState.inventory[itemId] ?? 0) > 0)
    .slice(0, 3)
    .map((itemId) => ({ itemId }));

  const unlockablePlots = getUnlockablePlots(gameState);
  const canUnlockSelected = unlockablePlots.includes(selectedPlotIndex);
<<<<<<< codex/add-progression-layer-with-reveal-rules
  const nextLandCost = getLandCost(gameState);
  const nextHireCost = getWorkerHireCost(gameState);
  const nextToolUpgradeCost = getWorkerToolUpgradeCost(gameState);
=======
  const workerHireCost = 20 + ((gameState.workers?.length ?? 0) * 10);
  const workerUpgradeCost = 40 + ((gameState.workerConfig?.toolLevel ?? 0) * 30);
>>>>>>> main

  return (
    <div className="app-shell candybox-shell">
      <CandyboxView
        state={gameState}
        eventLog={eventLog}
        selectedPlotIndex={selectedPlotIndex}
        selectedSpotIndex={selectedSpotIndex}
        selectedSpot={selectedSpot}
        selectedTile={selectedTile}
        canGoPrevPlot={canGoPrevPlot}
        canGoNextPlot={canGoNextPlot}
        canUnlockSelected={canUnlockSelected}
        nextLandCost={nextLandCost}
        nextHireCost={nextHireCost}
        nextToolUpgradeCost={nextToolUpgradeCost}
        plantableSeeds={plantableSeeds}
        sellableItems={sellableItems}
        activeSpotGroup={activeSpotGroup}
        workerHireCost={workerHireCost}
        workerUpgradeCost={workerUpgradeCost}
        onSelectPlot={(plotIndex) => setGameState((prevState) => {
          const targetPlot = prevState.plots[plotIndex];
          const targetSpotIndex = getSpotIndexForGroup(targetPlot, activeSpotGroup, prevState);
          return selectSpot(prevState, plotIndex, targetSpotIndex);
        })}
        onSpotGroupChange={(group) => {
          setActiveSpotGroup(group);
          setGameState((prevState) => {
            const { selectedPlotIndex: plotIndex } = getSelectedIndexes(prevState);
            const targetPlot = prevState.plots[plotIndex];
            const targetSpotIndex = getSpotIndexForGroup(targetPlot, group, prevState);
            return selectSpot(prevState, plotIndex, targetSpotIndex);
          });
        }}
        onPrevPlot={() => setGameState((prevState) => {
          const { unlockedPlots: nextUnlockedPlots } = getSelectedIndexes(prevState);
          const currentIndex = nextUnlockedPlots.indexOf(prevState.selected?.plotIndex ?? nextUnlockedPlots[0]);
          if (currentIndex <= 0) {
            return prevState;
          }

          const targetPlotIndex = nextUnlockedPlots[currentIndex - 1];
          return selectSpot(prevState, targetPlotIndex, 0);
        })}
        onNextPlot={() => setGameState((prevState) => {
          const { unlockedPlots: nextUnlockedPlots } = getSelectedIndexes(prevState);
          const currentIndex = nextUnlockedPlots.indexOf(prevState.selected?.plotIndex ?? nextUnlockedPlots[0]);
          if (currentIndex < 0 || currentIndex >= nextUnlockedPlots.length - 1) {
            return prevState;
          }

          const targetPlotIndex = nextUnlockedPlots[currentIndex + 1];
          return selectSpot(prevState, targetPlotIndex, 0);
        })}
        onTill={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const withHoe = { ...prevState, selectedTool: { kind: 'tool', id: 'hoe' } };
          return onSpotClick(withHoe, plotIndex, spotIndex);
        })}
        onWater={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const withWater = { ...prevState, selectedTool: { kind: 'tool', id: 'water' } };
          return onSpotClick(withWater, plotIndex, spotIndex);
        })}
        onClearDebris={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const nextState = onSpotClick(prevState, plotIndex, spotIndex);
          const text = nextState.minigames?.lastOutcome;
          if (nextState !== prevState && text) {
            appendLogEntries([toLogLine(prevState.tick, text)]);
          }
          return nextState;
        })}
        onHarvestSelected={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const nextState = harvestSpot(prevState, plotIndex, spotIndex);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, `Harvest action on Plot ${plotIndex + 1}, Spot ${spotIndex + 1}.`)]);
          }
          return nextState;
        })}
        onHarvestReadyOnActivePlot={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex } = getSelectedIndexes(prevState);
          const spotCount = prevState.plots[plotIndex]?.spots?.length ?? 0;
          let nextState = prevState;

          for (let spotIndex = 0; spotIndex < spotCount; spotIndex += 1) {
            nextState = harvestSpot(nextState, plotIndex, spotIndex);
          }

          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, `Harvested ready crops on Plot ${plotIndex + 1}.`)]);
          }

          return nextState;
        })}
        onWaterDryPlantedOnActivePlot={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: fallbackSpotIndex } = getSelectedIndexes(prevState);
          const spots = prevState.plots[plotIndex]?.spots ?? [];
          let nextState = prevState;

          spots.forEach((spot, spotIndex) => {
            if (!spot?.crop) {
              return;
            }

            if (!isCropHydratedAtTick(spot.crop, prevState.tick)) {
              nextState = waterSpot(nextState, plotIndex, spotIndex);
            }
          });

          return {
            ...nextState,
            selected: { plotIndex, spotIndex: fallbackSpotIndex },
          };
        })}
        onPlant={(seedItemId) => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const withSeedSelected = { ...prevState, selectedTool: { kind: 'item', id: seedItemId } };
          const nextState = onSpotClick(withSeedSelected, plotIndex, spotIndex);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, `Planted ${seedItemId} on Plot ${plotIndex + 1}, Spot ${spotIndex + 1}.`)]);
          }
          return nextState;
        })}
        onSellOne={(itemId) => setGameState((prevState) => {
          const nextState = sellItem(prevState, itemId, 1);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, `Sold 1 ${itemId}.`)]);
          }
          return nextState;
        })}
        onHireWorker={() => setGameState((prevState) => {
          const nextState = hireWorker(prevState);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, 'Hired a worker.')]);
          }
          return nextState;
        })}
        onUpgradeWorkers={() => setGameState((prevState) => {
          const nextState = upgradeWorkerTools(prevState);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, 'Upgraded worker tools.')]);
          }
          return nextState;
        })}
        onUnlockSelected={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex } = getSelectedIndexes(prevState);
          const nextState = unlockPlot(prevState, plotIndex);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, `Unlocked Plot ${plotIndex + 1}.`)]);
          }
          return nextState;
        })}
        onHireWorker={() => setGameState((prevState) => {
          const nextState = hireWorker(prevState);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, nextState.uiMessage || 'A worker joins.')]);
          }
          return nextState;
        })}
        onUpgradeWorkers={() => setGameState((prevState) => {
          const nextState = upgradeWorkerTools(prevState);
          if (nextState !== prevState) {
            appendLogEntries([toLogLine(prevState.tick, nextState.uiMessage || 'Tools improved.')]);
          }
          return nextState;
        })}
        onPulseTreeTiming={() => setGameState((prevState) => {
          const nextState = pulseTreeTiming(prevState);
          const text = nextState.minigames?.lastOutcome;
          if (text) {
            appendLogEntries([toLogLine(prevState.tick, text)]);
          }
          return nextState;
        })}
        onPulseGrassRhythm={() => setGameState((prevState) => {
          const nextState = pulseGrassRhythm(prevState);
          const text = nextState.minigames?.lastOutcome;
          if (text) {
            appendLogEntries([toLogLine(prevState.tick, text)]);
          }
          return nextState;
        })}
        onPulseRockCrit={() => setGameState((prevState) => {
          const nextState = pulseRockCritWindow(prevState);
          const text = nextState.minigames?.lastOutcome;
          if (text) {
            appendLogEntries([toLogLine(prevState.tick, text)]);
          }
          return nextState;
        })}
      />
    </div>
  );
}
