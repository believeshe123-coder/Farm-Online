import { useEffect, useState } from 'react';
import HudBar from './ui/HudBar';
import FarmGrid from './ui/FarmGrid';
import ShopPanel from './ui/ShopPanel';
import InventoryPanel from './ui/InventoryPanel';
import TileInspector from './ui/TileInspector';
import { createNewGame } from './game/createNewGame';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';
import { expandFarm, getNextFarmExpansion, harvestCrop, plantCrop, sellItem } from './game/actions';

export default function App() {
  const [gameState, setGameState] = useState(() => loadGame() ?? createNewGame());
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    saveGame(gameState);
  }, [gameState]);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setGameState((prevState) => advanceTick(prevState));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPaused]);

  const handleNewGame = () => {
    setGameState(createNewGame());
  };

  const handleLoadGame = () => {
    const savedState = loadGame();
    if (savedState) {
      setGameState(savedState);
    }
  };

  const nextExpansion = getNextFarmExpansion(gameState.gridSize);
  const canExpand = Boolean(nextExpansion) && gameState.money >= nextExpansion.cost;

  return (
    <div className="app-shell">
      <HudBar
        tick={gameState.tick}
        money={gameState.money}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prevIsPaused) => !prevIsPaused)}
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
      />
      <main className="main-layout">
        <FarmGrid
          tiles={gameState.tiles}
          gridSize={gameState.gridSize}
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
            selectedTile={
              gameState.selectedTileIndex === null
                ? null
                : gameState.tiles[gameState.selectedTileIndex]
            }
            tick={gameState.tick}
            onHarvest={() =>
              setGameState((prevState) => {
                if (prevState.selectedTileIndex === null) {
                  return prevState;
                }

                return harvestCrop(prevState, prevState.selectedTileIndex);
              })
            }
          />
          <ShopPanel
            selectedTileIndex={gameState.selectedTileIndex}
            onPlant={(cropId) =>
              setGameState((prevState) => {
                if (prevState.selectedTileIndex === null) {
                  return prevState;
                }

                return plantCrop(prevState, prevState.selectedTileIndex, cropId);
              })
            }
            nextExpansion={nextExpansion}
            canExpand={canExpand}
            onExpand={() => setGameState((prevState) => expandFarm(prevState))}
          />
          <InventoryPanel
            inventory={gameState.inventory}
            onSell={(itemId, qty) => setGameState((prevState) => sellItem(prevState, itemId, qty))}
          />
        </aside>
      </main>
    </div>
  );
}
