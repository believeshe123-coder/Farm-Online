import { useEffect, useMemo, useState } from 'react';
import { CROPS, SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS } from '../game/constants';

function buildSellSections(inventory) {
  const cropIds = new Set(Object.keys(CROPS));
  const allEntries = Object.entries(SELLABLE_ITEMS);

  const sections = [
    {
      id: 'crops',
      title: 'Crops',
      items: allEntries.filter(([itemId]) => cropIds.has(itemId)),
    },
    {
      id: 'seeds',
      title: 'Seeds',
      items: allEntries.filter(([itemId]) => itemId === 'seeds' || itemId.endsWith('_seed')),
    },
    {
      id: 'other',
      title: 'Other',
      items: allEntries.filter(([itemId]) => !cropIds.has(itemId) && itemId !== 'seeds' && !itemId.endsWith('_seed')),
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      totalOwned: section.items.reduce((total, [itemId]) => total + (inventory[itemId] ?? 0), 0),
    }))
    .filter((section) => section.items.length > 0);
}

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
  const [showUnaffordable, setShowUnaffordable] = useState(false);
  const canBuild = selectedPlotIndex !== null;
  const [selectedPlotToUnlock, setSelectedPlotToUnlock] = useState('');
  const sellSections = useMemo(() => buildSellSections(inventory), [inventory]);
  const visibleSeedEntries = useMemo(
    () => Object.entries(SHOP_SEEDS).filter(([, item]) => showUnaffordable || money >= item.buyPrice),
    [money, showUnaffordable]
  );
  const visibleBuildingEntries = useMemo(
    () => Object.entries(SHOP_BUILDINGS).filter(([, building]) => showUnaffordable || money >= building.buyPrice),
    [money, showUnaffordable]
  );
  const canAffordPlotUnlock = money >= unlockCost;
  const showPlotUnlock = unlockablePlots.length > 0 && (showUnaffordable || canAffordPlotUnlock);

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
            <label>
              <input
                type="checkbox"
                checked={showUnaffordable}
                onChange={(event) => setShowUnaffordable(event.target.checked)}
              />{' '}
              Show unaffordable (debug)
            </label>

            <details open>
              <summary>Seeds</summary>
              <div className="stack-sm shop-section-body">
                {visibleSeedEntries.length === 0 && <p className="muted">No affordable seeds right now.</p>}
                {visibleSeedEntries.map(([itemId, item]) => (
                  <button key={itemId} type="button" disabled={money < item.buyPrice} onClick={() => onBuySeed(itemId)}>
                    Buy {item.name} - ${item.buyPrice}
                  </button>
                ))}
              </div>
            </details>

            <details open>
              <summary>Buildings</summary>
              <div className="stack-sm shop-section-body">
                {visibleBuildingEntries.length === 0 && <p className="muted">No affordable buildings right now.</p>}
                {visibleBuildingEntries.map(([buildingId, building]) => (
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
                {showPlotUnlock && (
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
                {!showPlotUnlock && unlockablePlots.length > 0 && <p className="muted">No affordable plot unlocks right now.</p>}
                {unlockablePlots.length === 0 && <p className="muted">No adjacent plots available to unlock.</p>}
                {showPlotUnlock && (
                  <button
                    type="button"
                    disabled={!canUnlockPlot || selectedPlotToUnlock === ''}
                    onClick={() => onUnlockPlot(Number(selectedPlotToUnlock))}
                  >
                    {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
                  </button>
                )}
              </div>
            </details>
          </>
        )}

        {activeTab === 'sell' && (
          <>
            {sellSections.map((section) => (
              <details key={section.id} open>
                <summary>{section.title}</summary>
                <div className="stack-sm shop-section-body">
                  <button
                    type="button"
                    disabled={section.totalOwned < 1}
                    onClick={() => {
                      section.items.forEach(([itemId]) => {
                        const qty = inventory[itemId] ?? 0;
                        if (qty > 0) {
                          onSellItem(itemId, qty);
                        }
                      });
                    }}
                  >
                    Sell all in this section
                  </button>
                  {section.items.map(([itemId, item]) => {
                    const owned = inventory[itemId] ?? 0;
                    return (
                      <button key={itemId} type="button" disabled={owned < 1} onClick={() => onSellItem(itemId)}>
                        Sell {item.name} (+${item.sellPrice}) {owned > 0 ? `(x${owned})` : ''}
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
