import { useEffect, useState } from 'react';
import FrontView from './ui/FrontView';
import CandyboxView from './ui/CandyboxView';
import { createNewGame } from './game/createNewGame';
import { createInitialBuildingChainState, SHOP_SEEDS, SELLABLE_ITEMS } from './game/constants';
import { createInitialWorkers } from './game/workers';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';
import {
  getUnlockablePlots,
  harvestSpot,
  onSpotClick,
  sellItem,
  unlockPlot,
  selectSpot,
} from './game/actions';

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
    progression: nextState.progression ?? { researchPoints: 0, researchedTechs: [], milestones: { positiveBalanceDays: 0, completed: [] }, notifications: [] },
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

export default function App() {
  const [view, setView] = useState('game');
  const [gameState, setGameState] = useState(() => {
    const savedState = loadGame();
    return withSelectedTool(savedState ?? createNewGame());
  });
  const [isPaused, setIsPaused] = useState(false);
  const [frontMessage, setFrontMessage] = useState('');

  useEffect(() => {
    saveGame(gameState);
  }, [gameState]);

  useEffect(() => {
    if (view !== 'game' || isPaused) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setGameState((prevState) => advanceTick(prevState));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [view, isPaused]);

  const handleStartGame = () => {
    setGameState(withSelectedTool(createNewGame()));
    setIsPaused(false);
    setFrontMessage('');
    setView('game');
  };

  const handleFrontLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(withSelectedTool(savedState));
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

  return (
    <div className="app-shell">
      <CandyboxView
        state={gameState}
        selectedPlotIndex={selectedPlotIndex}
        selectedSpotIndex={selectedSpotIndex}
        selectedSpot={selectedSpot}
        selectedTile={selectedTile}
        canGoPrevPlot={canGoPrevPlot}
        canGoNextPlot={canGoNextPlot}
        canUnlockSelected={canUnlockSelected}
        plantableSeeds={plantableSeeds}
        sellableItems={sellableItems}
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
          return onSpotClick(prevState, plotIndex, spotIndex);
        })}
        onHarvestSelected={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          return harvestSpot(prevState, plotIndex, spotIndex);
        })}
        onHarvestReady={() => setGameState((prevState) => {
          let nextState = prevState;
          prevState.unlockedTiles.forEach((isUnlocked, plotIndex) => {
            if (!isUnlocked) {
              return;
            }

            const spotCount = prevState.plots[plotIndex]?.spots?.length ?? 0;
            for (let spotIndex = 0; spotIndex < spotCount; spotIndex += 1) {
              nextState = harvestSpot(nextState, plotIndex, spotIndex);
            }
          });

          return nextState;
        })}
        onPlant={(seedItemId) => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex, selectedSpotIndex: spotIndex } = getSelectedIndexes(prevState);
          const withSeedSelected = { ...prevState, selectedTool: { kind: 'item', id: seedItemId } };
          return onSpotClick(withSeedSelected, plotIndex, spotIndex);
        })}
        onSellOne={(itemId) => setGameState((prevState) => sellItem(prevState, itemId, 1))}
        onUnlockSelected={() => setGameState((prevState) => {
          const { selectedPlotIndex: plotIndex } = getSelectedIndexes(prevState);
          return unlockPlot(prevState, plotIndex);
        })}
      />
    </div>
  );
}
