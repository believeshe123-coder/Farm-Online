import { useEffect, useState } from 'react';
import HudBar from './ui/HudBar';
import FrontView from './ui/FrontView';
import AsciiBoard from './ui/AsciiBoard';
import ShopPanel from './ui/ShopPanel';
import TileInspector from './ui/TileInspector';
import CoopModal from './ui/CoopModal';
import BackpackBar from './ui/BackpackBar';
import { createNewGame } from './game/createNewGame';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';
import {
  breedChicken,
  getUnlockPlotCostForState,
  getUnlockablePlotCount,
  getUnlockablePlots,
  harvestSpot,
  onSpotClick,
  placeBuilding,
  sellItem,
  unlockPlot,
  buyItem,
  collectResourceFromTile,
} from './game/actions';

function withSelectedTool(gameState) {
  const hotbarItems = Array.isArray(gameState.hotbarItems) ? gameState.hotbarItems : [];

  if (
    gameState.selectedTool &&
    typeof gameState.selectedTool === 'object' &&
    ((gameState.selectedTool.kind === 'tool' && (gameState.selectedTool.id === 'hoe' || gameState.selectedTool.id === 'water')) ||
      (gameState.selectedTool.kind === 'item' && hotbarItems.includes(gameState.selectedTool.id)))
  ) {
    return gameState;
  }

  return {
    ...gameState,
    selectedTool: { kind: 'tool', id: 'hoe' },
  };
}

export default function App() {
  const [view, setView] = useState('game');
  const [gameState, setGameState] = useState(() => {
    const savedState = loadGame();
    return withSelectedTool(savedState ?? createNewGame());
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isCoopModalOpen, setIsCoopModalOpen] = useState(false);
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

    return () => {
      clearInterval(intervalId);
    };
  }, [view, isPaused]);

  useEffect(() => {
    if (view !== 'game') {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === '1') {
        setGameState((prevState) => ({ ...prevState, selectedTool: { kind: 'tool', id: 'hoe' } }));
        return;
      }

      if (event.key === '2') {
        setGameState((prevState) => ({ ...prevState, selectedTool: { kind: 'tool', id: 'water' } }));
        return;
      }

      const hotbarKeys = ['3', '4', '5', '6', '7', '8', '9', '0'];
      if (hotbarKeys.includes(event.key)) {
        setGameState((prevState) => {
          const slotIndex = hotbarKeys.indexOf(event.key);
          const itemId = prevState.hotbarItems?.[slotIndex];
          if (!itemId) {
            return prevState;
          }

          return { ...prevState, selectedTool: { kind: 'item', id: itemId } };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [view]);

  const handleStartGame = () => {
    setGameState(withSelectedTool(createNewGame()));
    setIsPaused(false);
    setIsCoopModalOpen(false);
    setFrontMessage('');
    setView('game');
  };

  const handleFrontLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(withSelectedTool(savedState));
      setIsPaused(false);
      setIsCoopModalOpen(false);
      setFrontMessage('');
      setView('game');
      return;
    }

    setFrontMessage('No save found yet.');
  };

  const handleNewGame = () => {
    setGameState(withSelectedTool(createNewGame()));
  };

  const handleLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(withSelectedTool(savedState));
    }
  };

  const handleBackToFront = () => {
    setIsPaused(true);
    setIsCoopModalOpen(false);
    setFrontMessage('');
    setView('front');
  };

  const unlockedPlotCount = gameState.unlockedTiles.filter(Boolean).length;
  const totalPlots = gameState.tiles.length;
  const unlockCost = getUnlockPlotCostForState(gameState);
  const canUnlockPlot = getUnlockablePlotCount(gameState) > 0 && gameState.money >= unlockCost;
  const selectedPlotIndex = gameState.selected?.plotIndex ?? null;
  const unlockablePlots = getUnlockablePlots(gameState);
  const selectedSpotIndex = gameState.selected?.spotIndex ?? null;
  const selectedPlot = selectedPlotIndex === null ? null : gameState.plots[selectedPlotIndex];
  const selectedSpot =
    selectedPlotIndex === null || selectedSpotIndex === null ? null : selectedPlot?.spots?.[selectedSpotIndex] ?? null;
  const selectedTile = selectedPlotIndex === null ? null : gameState.tiles[selectedPlotIndex];
  const isSelectedTileUnlocked = selectedPlotIndex !== null && gameState.unlockedTiles[selectedPlotIndex];
  const selectedCoop = selectedTile?.type === 'coop' ? selectedTile : null;

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

  return (
    <div className="app-shell">
      <HudBar
        tick={gameState.tick}
        money={gameState.money}
        unlockedPlotCount={unlockedPlotCount}
        totalPlots={totalPlots}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prevIsPaused) => !prevIsPaused)}
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
        onBackToFront={handleBackToFront}
      />
      <main className="main-layout game-layout">
        <AsciiBoard
          tiles={gameState.tiles}
          plots={gameState.plots}
          gridSize={gameState.gridSize}
          tick={gameState.tick}
          unlockedTiles={gameState.unlockedTiles}
          selected={gameState.selected}
          onSpotClick={(plotIndex, spotIndex) =>
            setGameState((prevState) => onSpotClick(prevState, plotIndex, spotIndex))
          }
        />
        <aside className="side-panels">
          <TileInspector
            selected={gameState.selected}
            selectedSpot={selectedSpot}
            selectedTile={selectedTile}
            tick={gameState.tick}
            isSelectedTileUnlocked={isSelectedTileUnlocked}
            unlockedPlotCount={unlockedPlotCount}
            onHarvest={() =>
              setGameState((prevState) => {
                if (!prevState.selected) {
                  return prevState;
                }

                return harvestSpot(prevState, prevState.selected.plotIndex, prevState.selected.spotIndex);
              })
            }
            onOpenCoop={() => setIsCoopModalOpen(true)}
            onCollectResource={() =>
              setGameState((prevState) => {
                if (!prevState.selected) {
                  return prevState;
                }

                return collectResourceFromTile(prevState, prevState.selected.plotIndex);
              })
            }
          />
          <ShopPanel
            selectedPlotIndex={selectedPlotIndex}
            money={gameState.money}
            inventory={gameState.inventory}
            onBuild={(buildingId) =>
              setGameState((prevState) => {
                if (prevState.selected?.plotIndex === undefined) {
                  return prevState;
                }

                return placeBuilding(prevState, prevState.selected.plotIndex, buildingId);
              })
            }
            unlockedPlotCount={unlockedPlotCount}
            totalPlots={totalPlots}
            unlockCost={unlockCost}
            canUnlockPlot={canUnlockPlot}
            unlockablePlots={unlockablePlots}
            onUnlockPlot={(plotIndex, plotProfile) => setGameState((prevState) => unlockPlot(prevState, plotIndex, plotProfile))}
            onBuySeed={(itemId) => setGameState((prevState) => buyItem(prevState, itemId))}
            onSellItem={(itemId, qty = 1) => setGameState((prevState) => sellItem(prevState, itemId, qty))}
          />
        </aside>
      </main>
      <BackpackBar
        inventory={gameState.inventory}
        hotbarItems={gameState.hotbarItems}
        selectedHotbar={gameState.selectedTool}
        onChangeHotbarItems={(nextHotbarItems) =>
          setGameState((prevState) => {
            const nextState = {
              ...prevState,
              hotbarItems: nextHotbarItems,
            };

            if (
              prevState.selectedTool?.kind === 'item' &&
              !nextHotbarItems.includes(prevState.selectedTool.id)
            ) {
              return {
                ...nextState,
                selectedTool: { kind: 'tool', id: 'hoe' },
              };
            }

            return nextState;
          })
        }
        onSelectHotbar={(selection) =>
          setGameState((prevState) => ({
            ...prevState,
            selectedTool: selection,
          }))
        }
      />
      {isCoopModalOpen && selectedCoop && selectedPlotIndex !== null && (
        <CoopModal
          coop={selectedCoop}
          onClose={() => setIsCoopModalOpen(false)}
          onBreed={(parentAId, parentBId) =>
            setGameState((prevState) => breedChicken(prevState, selectedPlotIndex, parentAId, parentBId))
          }
        />
      )}
    </div>
  );
}
