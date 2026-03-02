import { CROPS } from '../game/constants';

function isCropUnlocked(inventory, crop) {
  if (!crop.unlockRequirement) {
    return true;
  }

  return (inventory[crop.unlockRequirement.itemId] ?? 0) >= crop.unlockRequirement.qty;
}

export default function ShopPanel({
  inventory,
  selectedTileIndex,
  onPlant,
  onBuildCoop,
  unlockedPlotCount,
  totalPlots,
  unlockCost,
  canUnlockPlot,
  onUnlockPlot,
}) {
  const canPlant = selectedTileIndex !== null;
  const cropEntries = Object.entries(CROPS);

  return (
    <section className="panel">
      <h3>Shop</h3>
      <div className="stack-sm">
        <p className="muted">Plots: {unlockedPlotCount}/{totalPlots}</p>
        {cropEntries.map(([cropId, crop]) => {
          const unlocked = isCropUnlocked(inventory, crop);
          const lockText = crop.unlockRequirement?.text;

          return (
            <button key={cropId} type="button" disabled={!canPlant || !unlocked} onClick={() => onPlant(cropId)}>
              Plant {crop.name}
              {!unlocked && lockText ? ` (${lockText})` : ''}
            </button>
          );
        })}
        <button type="button" disabled={!canPlant} onClick={onBuildCoop}>
          Build Chicken Coop
        </button>
        <button type="button" disabled={!canUnlockPlot} onClick={onUnlockPlot}>
          {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
        </button>
      </div>
    </section>
  );
}
