export default function HudBar() {
  return (
    <header className="panel hud">
      <div>
        <h2>Farm Online</h2>
        <p className="muted">Money: $50 · Tick: 0</p>
      </div>
      <div className="muted">⏯ Pause | ⏩ Speed</div>
    </header>
  );
}
