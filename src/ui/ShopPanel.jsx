import { SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS } from '../game/constants';

export default function ShopPanel({
  selectedPlotIndex,
  money,
  inventory,
  onBuild,
  unlockedPlotCount,
  totalPlots,
  unlockCost,
  canUnlockPlot,
  onUnlockPlot,
  onBuySeed,
  onSellItem,
}) {
  const canBuild = selectedPlotIndex !== null;

  return (
    <section className="panel">
      <h3>Shop</h3>
      <div className="stack-sm">
        <p className="muted">Plots: {unlockedPlotCount}/{totalPlots}</p>
        <p className="muted">Cash: ${money}</p>

        <h4>Seeds</h4>
        {Object.entries(SHOP_SEEDS).map(([itemId, item]) => (
          <button key={itemId} type="button" disabled={money < item.buyPrice} onClick={() => onBuySeed(itemId)}>
            Buy {item.name} - ${item.buyPrice}
          </button>
        ))}

        <h4>Buildings</h4>
        {Object.entries(SHOP_BUILDINGS).map(([buildingId, building]) => (
          <button
            key={buildingId}
            type="button"
            disabled={!canBuild || money < building.buyPrice}
            onClick={() => onBuild(buildingId)}
          >
            Build {building.name} - ${building.buyPrice}
          </button>
        ))}

        <button type="button" disabled={!canUnlockPlot} onClick={onUnlockPlot}>
          {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
        </button>

        <h4>Sell</h4>
        {Object.entries(SELLABLE_ITEMS).map(([itemId, item]) => {
          const owned = inventory[itemId] ?? 0;
          return (
            <button key={itemId} type="button" disabled={owned < 1} onClick={() => onSellItem(itemId)}>
              Sell {item.name} (+${item.sellPrice}) {owned > 0 ? `(x${owned})` : ''}
            </button>
          );
        })}
      </div>
    </section>
  );
}
