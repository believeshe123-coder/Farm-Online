import { useEffect, useState } from 'react';
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
  unlockablePlots,
  onUnlockPlot,
  onBuySeed,
  onSellItem,
}) {
  const [activeTab, setActiveTab] = useState('shop');
  const [isOpen, setIsOpen] = useState(true);
  const canBuild = selectedPlotIndex !== null;
  const [selectedPlotToUnlock, setSelectedPlotToUnlock] = useState('');

  useEffect(() => {
    if (unlockablePlots.length === 0) {
      setSelectedPlotToUnlock('');
      return;
    }

    if (!unlockablePlots.includes(Number(selectedPlotToUnlock))) {
      setSelectedPlotToUnlock(String(unlockablePlots[0]));
    }
  }, [unlockablePlots, selectedPlotToUnlock]);

  if (!isOpen) {
    return (
      <section className="panel">
        <div className="shop-header-row">
          <h3>Shop</h3>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open Shop
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="shop-header-row">
        <h3>Shop</h3>
        <button type="button" onClick={() => setIsOpen(false)}>
          Close
        </button>
      </div>

      <div className="shop-tab-row" role="tablist" aria-label="Shop tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'shop'}
          className={activeTab === 'shop' ? 'is-active' : ''}
          onClick={() => setActiveTab('shop')}
        >
          Shop
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sell'}
          className={activeTab === 'sell' ? 'is-active' : ''}
          onClick={() => setActiveTab('sell')}
        >
          Sell
        </button>
      </div>

      <div className="stack-sm">
        <p className="muted">Plots: {unlockedPlotCount}/{totalPlots}</p>
        <p className="muted">Cash: ${money}</p>

        {activeTab === 'shop' && (
          <>
            <details open>
              <summary>Seeds</summary>
              <div className="stack-sm shop-section-body">
                {Object.entries(SHOP_SEEDS).map(([itemId, item]) => (
                  <button key={itemId} type="button" disabled={money < item.buyPrice} onClick={() => onBuySeed(itemId)}>
                    Buy {item.name} - ${item.buyPrice}
                  </button>
                ))}
              </div>
            </details>

            <details open>
              <summary>Buildings</summary>
              <div className="stack-sm shop-section-body">
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
              </div>
            </details>

            <details open>
              <summary>Plots</summary>
              <div className="stack-sm shop-section-body">
                {unlockablePlots.length > 0 && (
                  <label>
                    Plot to buy
                    <select
                      value={selectedPlotToUnlock}
                      onChange={(event) => setSelectedPlotToUnlock(event.target.value)}
                    >
                      <option value="">Choose a plot</option>
                      {unlockablePlots.map((plotIndex) => (
                        <option key={plotIndex} value={plotIndex}>
                          Plot {plotIndex + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  disabled={!canUnlockPlot || selectedPlotToUnlock === ''}
                  onClick={() => onUnlockPlot(Number(selectedPlotToUnlock))}
                >
                  {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
                </button>
              </div>
            </details>
          </>
        )}

        {activeTab === 'sell' && (
          <details open>
            <summary>Sell Items</summary>
            <div className="stack-sm shop-section-body">
              {Object.entries(SELLABLE_ITEMS).map(([itemId, item]) => {
                const owned = inventory[itemId] ?? 0;
                return (
                  <button key={itemId} type="button" disabled={owned < 1} onClick={() => onSellItem(itemId)}>
                    Sell {item.name} (+${item.sellPrice}) {owned > 0 ? `(x${owned})` : ''}
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
