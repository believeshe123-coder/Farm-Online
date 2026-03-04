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
  throughputStatus = [],
  researchPoints = 0,
  progressionAlerts = 0,
  marketIntelLevel = 0,
}) {
  return (
    <header className="panel hud">
      <div>
        <h2>Farm Online</h2>
        <p className="muted">Money: ${money} · Tick: {tick} · Plots: {unlockedPlotCount}/{totalPlots} · RP: {researchPoints}</p>
      </div>
      <div>
        {throughputStatus.length > 0 && (
          <p className="muted">{throughputStatus.join(' · ')}</p>
        )}
        {marketIntelLevel > 0 && (
          <p className="muted">Market intel level {marketIntelLevel} unlocked</p>
        )}
        {progressionAlerts > 0 && <p className="hud-badge">🔔 {progressionAlerts} progression alerts</p>}
        <button onClick={onTogglePause}>{isPaused ? 'Resume' : 'Pause'}</button>
        <button onClick={onNewGame}>New Game</button>
        <button onClick={onLoadGame}>Load Game</button>
        <button onClick={onBackToFront}>Back to Front</button>
      </div>
    </header>
  );
}
