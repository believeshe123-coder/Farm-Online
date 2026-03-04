import { useEffect, useMemo, useState } from 'react';
import { CROPS, getZoneNetProduction, SELLABLE_ITEMS, SHOP_BUILDINGS, SHOP_SEEDS, ZONE_DEFINITIONS } from '../game/constants';

function buildSellSections(inventory, marketPrices = {}) {
  const cropIds = new Set(Object.keys(CROPS));
  const allEntries = Object.entries(SELLABLE_ITEMS);

  const sections = [
    {
      id: 'crops',
      title: 'Crops',
      items: allEntries.filter(([itemId]) => cropIds.has(itemId)).map(([itemId, item]) => [itemId, { ...item, sellPrice: marketPrices[itemId] ?? item.baselinePrice }]),
    },
    {
      id: 'seeds',
      title: 'Seeds',
      items: allEntries.filter(([itemId]) => itemId === 'seeds' || itemId.endsWith('_seed')).map(([itemId, item]) => [itemId, { ...item, sellPrice: marketPrices[itemId] ?? item.baselinePrice }]),
    },
    {
      id: 'other',
      title: 'Other',
      items: allEntries.filter(([itemId]) => !cropIds.has(itemId) && itemId !== 'seeds' && !itemId.endsWith('_seed')).map(([itemId, item]) => [itemId, { ...item, sellPrice: marketPrices[itemId] ?? item.baselinePrice }]),
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
  selectedPlot,
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
  onSetPlotZone,
  onSetPlotPolicy,
  onSetPlotWorkers,
  marketPrices,
  marketTrends,
  contracts,
  autoSellPolicy,
  onAcceptContract,
  onSetAutoSellPolicy,
  onSetAutoSellItemThreshold,
}) {
  const [activeTab, setActiveTab] = useState('shop');
  const [isOpen, setIsOpen] = useState(true);
  const [showUnaffordable, setShowUnaffordable] = useState(false);
  const canBuild = selectedPlotIndex !== null;
  const [selectedPlotToUnlock, setSelectedPlotToUnlock] = useState('');
  const [selectedZoneToUnlock, setSelectedZoneToUnlock] = useState('field');
  const [autoSellItemId, setAutoSellItemId] = useState('wheat');
  const sellSections = useMemo(() => buildSellSections(inventory, marketPrices), [inventory, marketPrices]);
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
  const selectedZoneDefinition = selectedPlot ? ZONE_DEFINITIONS[selectedPlot.zoneType] : null;
  const selectedPolicy = selectedZoneDefinition?.policies?.[selectedPlot?.productionPolicy]
    ? selectedPlot.productionPolicy
    : selectedZoneDefinition?.defaultPolicy;
  const selectedNetProduction = selectedPlot
    ? getZoneNetProduction(selectedPlot.zoneType, selectedPlot.level, selectedPolicy)
    : null;

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
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'market'}
          className={activeTab === 'market' ? 'is-active' : ''}
          onClick={() => setActiveTab('market')}
        >
          Market
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

            {selectedPlotIndex !== null && selectedPlot && (
              <details open>
                <summary>Selected plot zone</summary>
                <div className="stack-sm shop-section-body">
                  <p className="muted">Plot {selectedPlotIndex + 1}</p>
                  <label>
                    Zone type
                    <select value={selectedPlot.zoneType} onChange={(event) => onSetPlotZone(event.target.value)}>
                      {Object.entries(ZONE_DEFINITIONS).map(([zoneType, definition]) => (
                        <option key={zoneType} value={zoneType}>{definition.name}</option>
                      ))}
                    </select>
                  </label>
                  {selectedZoneDefinition && (
                    <label>
                      Recipe / policy
                      <select
                        value={selectedPolicy}
                        onChange={(event) => onSetPlotPolicy(event.target.value)}
                      >
                        {Object.entries(selectedZoneDefinition.policies).map(([policyId, policy]) => (
                          <option key={policyId} value={policyId}>{policy.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Assigned workers
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={selectedPlot.assignedWorkers ?? 0}
                      onChange={(event) => onSetPlotWorkers(Number(event.target.value))}
                    />
                  </label>
                  {selectedNetProduction && (
                    <>
                      <p className="muted">Net per tick: {Object.entries(selectedNetProduction.netPerTick).map(([id, amount]) => `${id}:${amount}`).join(', ') || '0'}</p>
                      <p className="muted">Net per day: {Object.entries(selectedNetProduction.netPerDay).map(([id, amount]) => `${id}:${amount}`).join(', ') || '0'}</p>
                    </>
                  )}
                </div>
              </details>
            )}

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
                  <>
                    <label>
                      Zone type
                      <select
                        value={selectedZoneToUnlock}
                        onChange={(event) => setSelectedZoneToUnlock(event.target.value)}
                      >
                        {Object.entries(ZONE_DEFINITIONS).map(([zoneType, definition]) => (
                          <option key={zoneType} value={zoneType}>{definition.name}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={!canUnlockPlot || selectedPlotToUnlock === ''}
                      onClick={() => onUnlockPlot(Number(selectedPlotToUnlock), selectedZoneToUnlock)}
                    >
                      {unlockedPlotCount >= totalPlots ? 'Unlock Plot (All plots unlocked)' : `Unlock Plot - $${unlockCost}`}
                    </button>
                  </>
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

        {activeTab === 'market' && (
          <>
            <details open>
              <summary>Current prices and trends</summary>
              <div className="stack-sm shop-section-body">
                {Object.entries(SELLABLE_ITEMS).map(([itemId, item]) => {
                  const price = marketPrices?.[itemId] ?? item.baselinePrice;
                  const trend = marketTrends?.[itemId] ?? 0;
                  const trendPrefix = trend > 0 ? '+' : '';
                  return (
                    <p key={itemId} className="muted">
                      {item.name}: ${price} ({trendPrefix}{trend}%)
                    </p>
                  );
                })}
              </div>
            </details>

            <details open>
              <summary>Contracts</summary>
              <div className="stack-sm shop-section-body">
                <p className="muted">Reputation: x{(contracts?.reputation ?? 1).toFixed(2)}</p>
                {(contracts?.offers ?? []).map((contract) => (
                  <button key={contract.id} type="button" onClick={() => onAcceptContract(contract.id)}>
                    Accept: Deliver {contract.requiredQty} {contract.itemId} by tick {contract.deadlineTick} for ${contract.baseReward}
                  </button>
                ))}
                {(contracts?.offers ?? []).length === 0 && <p className="muted">No offers available right now.</p>}
                {(contracts?.active ?? []).map((contract) => (
                  <p key={contract.id} className="muted">
                    Active: {contract.itemId} {contract.deliveredQty}/{contract.requiredQty} (deadline: {contract.deadlineTick})
                  </p>
                ))}
              </div>
            </details>

            <details open>
              <summary>Auto-sell policy</summary>
              <div className="stack-sm shop-section-body">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(autoSellPolicy?.enabled)}
                    onChange={(event) => onSetAutoSellPolicy({ enabled: event.target.checked })}
                  />{' '}
                  Enable global auto-sell
                </label>
                <label>
                  Default minimum stock
                  <input
                    type="number"
                    min="0"
                    value={autoSellPolicy?.defaultMinStock ?? 0}
                    onChange={(event) => onSetAutoSellPolicy({ defaultMinStock: Number(event.target.value) || 0 })}
                  />
                </label>
                <label>
                  Item threshold
                  <select value={autoSellItemId} onChange={(event) => setAutoSellItemId(event.target.value)}>
                    {Object.entries(SELLABLE_ITEMS).map(([itemId, item]) => (
                      <option key={itemId} value={itemId}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Keep at least
                  <input
                    type="number"
                    min="0"
                    value={autoSellPolicy?.minStockByItem?.[autoSellItemId] ?? autoSellPolicy?.defaultMinStock ?? 0}
                    onChange={(event) => onSetAutoSellItemThreshold(autoSellItemId, Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            </details>
          </>
        )}

      </div>
    </section>
  );
}
