export default function HudBar({ tick, money, onNewGame, onLoadGame }) {
  return (
    <header className="panel hud">
      <div>
        <h2>Farm Online</h2>
        <p className="muted">Money: ${money} · Tick: {tick}</p>
      </div>
      <div>
        <button onClick={onNewGame}>New Game</button>
        <button onClick={onLoadGame}>Load Game</button>
      </div>
    </header>
  );
}
