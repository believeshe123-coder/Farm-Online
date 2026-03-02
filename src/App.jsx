import { useEffect, useState } from 'react';
import HudBar from './ui/HudBar';
import FarmGrid from './ui/FarmGrid';
import ShopPanel from './ui/ShopPanel';
import InventoryPanel from './ui/InventoryPanel';
import TileInspector from './ui/TileInspector';
import { createNewGame } from './game/createNewGame';
import { loadGame, saveGame } from './game/save';
import { advanceTick } from './game/tick';

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
          />
          <ShopPanel />
          <InventoryPanel />
        </aside>
      </main>
    </div>
  );
}
