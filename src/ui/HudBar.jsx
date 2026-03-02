export default function HudBar({
  tick,
  money,
  unlockedPlotCount,
  totalPlots,
  isPaused,
  onTogglePause,
  onNewGame,
  onLoadGame,
  onBackToFront,
}) {
  return (
    <header className="panel hud">
      <div>
        <h2>Farm Online</h2>
        <p className="muted">Money: ${money} · Tick: {tick} · Plots: {unlockedPlotCount}/{totalPlots}</p>
      </div>
      <div>
        <button onClick={onTogglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
        <button onClick={onNewGame}>New Game</button>
        <button onClick={onLoadGame}>Load Game</button>
        <button onClick={onBackToFront}>Back to Front</button>
      </div>
    </header>
  );
}
