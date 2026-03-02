import { useEffect, useState } from 'react';
import HudBar from './ui/HudBar';
import FrontView from './ui/FrontView';
import AsciiBoard from './ui/AsciiBoard';
import ShopPanel from './ui/ShopPanel';
import InventoryPanel from './ui/InventoryPanel';
import TileInspector from './ui/TileInspector';
import CoopModal from './ui/CoopModal';
import { createNewGame } from './game/createNewGame';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';
import {
  breedChicken,
  getUnlockPlotCostForState,
  getUnlockablePlotCount,
  harvestCrop,
  placeBuilding,
  plantCrop,
  sellItem,
  unlockPlot,
} from './game/actions';

export default function App() {
  const [view, setView] = useState('front');
  const [gameState, setGameState] = useState(() => createNewGame());
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

  const handleStartGame = () => {
    setGameState(createNewGame());
    setIsPaused(false);
    setIsCoopModalOpen(false);
    setFrontMessage('');
    setView('game');
  };

  const handleFrontLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(savedState);
      setIsPaused(false);
      setIsCoopModalOpen(false);
      setFrontMessage('');
      setView('game');
      return;
    }

    setFrontMessage('No save found yet.');
  };

  const handleNewGame = () => {
    setGameState(createNewGame());
  };

  const handleLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(savedState);
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
  const selectedTile =
    gameState.selectedTileIndex === null ? null : gameState.tiles[gameState.selectedTileIndex];
  const isSelectedTileUnlocked =
    gameState.selectedTileIndex !== null && gameState.unlockedTiles[gameState.selectedTileIndex];
  const selectedCoop = selectedTile?.type === 'coop' ? selectedTile : null;

  return (
    <div className="app-shell">
      {view === 'front' ? (
        <FrontView
          onStartGame={handleStartGame}
          onLoadGame={handleFrontLoadGame}
          loadMessage={frontMessage}
        />
      ) : (
        <>
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
          <main className="main-layout">
            <AsciiBoard
              tiles={gameState.tiles}
              gridSize={gameState.gridSize}
              unlockedTiles={gameState.unlockedTiles}
              renderMode={gameState.renderMode}
              selectedTileIndex={gameState.selectedTileIndex}
              onSelectTile={(index) =>
                setGameState((prevState) => ({
                  ...prevState,
                  selectedTileIndex: index,
                }))
              }
            />
            <aside className="side-panels">
              <TileInspector
                selectedTileIndex={gameState.selectedTileIndex}
                selectedTile={selectedTile}
                tick={gameState.tick}
                isSelectedTileUnlocked={isSelectedTileUnlocked}
                unlockedPlotCount={unlockedPlotCount}
                onHarvest={() =>
                  setGameState((prevState) => {
                    if (prevState.selectedTileIndex === null) {
                      return prevState;
                    }

                    return harvestCrop(prevState, prevState.selectedTileIndex);
                  })
                }
                onOpenCoop={() => setIsCoopModalOpen(true)}
              />
              <ShopPanel
                inventory={gameState.inventory}
                selectedTileIndex={gameState.selectedTileIndex}
                onPlant={(cropId) =>
                  setGameState((prevState) => {
                    if (prevState.selectedTileIndex === null) {
                      return prevState;
                    }

                    return plantCrop(prevState, prevState.selectedTileIndex, cropId);
                  })
                }
                onBuildCoop={() =>
                  setGameState((prevState) => {
                    if (prevState.selectedTileIndex === null) {
                      return prevState;
                    }

                    return placeBuilding(prevState, prevState.selectedTileIndex, 'coop');
                  })
                }
                unlockedPlotCount={unlockedPlotCount}
                totalPlots={totalPlots}
                unlockCost={unlockCost}
                canUnlockPlot={canUnlockPlot}
                onUnlockPlot={() => setGameState((prevState) => unlockPlot(prevState))}
              />
              <InventoryPanel
                inventory={gameState.inventory}
                onSell={(itemId, qty) =>
                  setGameState((prevState) => sellItem(prevState, itemId, qty))
                }
              />
            </aside>
          </main>
          {isCoopModalOpen && selectedCoop && gameState.selectedTileIndex !== null && (
            <CoopModal
              coop={selectedCoop}
              onClose={() => setIsCoopModalOpen(false)}
              onBreed={(parentAId, parentBId) =>
                setGameState((prevState) =>
                  breedChicken(prevState, prevState.selectedTileIndex, parentAId, parentBId),
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}
