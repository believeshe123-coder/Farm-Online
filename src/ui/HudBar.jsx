export default function HudBar({
  tick,
  money,
  isPaused,
  onTogglePause,
  onNewGame,
  onLoadGame,
}) {
  return (
    <header className="panel hud">
      <div>
        <h2>Farm Online</h2>
        <p className="muted">Money: ${money} · Tick: {tick}</p>
      </div>
      <div>
        <button onClick={onTogglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
        <button onClick={onNewGame}>New Game</button>
        <button onClick={onLoadGame}>Load Game</button>
      </div>
    </header>
  );
}
