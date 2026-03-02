export default function ShopPanel({
  selectedPlotIndex,
  onBuildCoop,
  unlockedPlotCount,
  totalPlots,
  unlockCost,
  canUnlockPlot,
  onUnlockPlot,
}) {
  const canBuild = selectedPlotIndex !== null;

  return (
    <section className="panel">
      <h3>Shop</h3>
      <div className="stack-sm">
        <p className="muted">Plots: {unlockedPlotCount}/{totalPlots}</p>
        <p className="muted">Planting now uses seed selection in the backpack.</p>
        <button type="button" disabled={!canBuild} onClick={onBuildCoop}>
          Build Chicken Coop
        </button>
        <button type="button" disabled={!canUnlockPlot} onClick={onUnlockPlot}>
          {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
        </button>
      </div>
    </section>
  );
}
