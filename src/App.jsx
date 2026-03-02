import { useEffect, useState } from 'react';
import HudBar from './ui/HudBar';
import FarmGrid from './ui/FarmGrid';
import ShopPanel from './ui/ShopPanel';
import InventoryPanel from './ui/InventoryPanel';
import { createNewGame } from './game/createNewGame';
import { loadGame, saveGame } from './game/save';

export default function App() {
  const [gameState, setGameState] = useState(() => loadGame() ?? createNewGame());

  useEffect(() => {
    saveGame(gameState);
  }, [gameState]);

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
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
      />
      <main className="main-layout">
        <FarmGrid tiles={gameState.tiles} />
        <aside className="side-panels">
          <ShopPanel />
          <InventoryPanel />
        </aside>
      </main>
    </div>
  );
}
