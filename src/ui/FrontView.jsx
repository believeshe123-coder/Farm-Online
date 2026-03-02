export default function FrontView({ onStartGame, onLoadGame, loadMessage }) {
  return (
    <main className="front-view-wrap">
      <section className="panel front-view-panel">
        <h1>Farm Online</h1>
        <p className="muted">A terminal-style idle farm sim.</p>
        <div className="stack-row">
          <button onClick={onStartGame}>Start Game</button>
          <button onClick={onLoadGame}>Load Game</button>
        </div>
        {loadMessage && <p className="front-view-message">{loadMessage}</p>}
        <section className="front-view-help">
          <h3>How to Play</h3>
          <ul>
            <li>Select a plot</li>
            <li>Plant seeds</li>
            <li>Harvest and sell to unlock more plots</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
