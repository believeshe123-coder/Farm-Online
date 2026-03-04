import { DAY_TICKS } from '../game/economy';
import { getAvailableActions } from './candyboxActions';

function formatInventorySummary(inventory = {}) {
  const entries = Object.entries(inventory)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([itemId, qty]) => `${itemId}:${qty}`);

  return entries.length > 0 ? entries.join(' · ') : 'empty';
}

export default function CandyboxView({
  state,
  selectedPlotIndex,
  selectedSpotIndex,
  selectedSpot,
  selectedTile,
  canGoPrevPlot,
  canGoNextPlot,
  onPrevPlot,
  onNextPlot,
  onTill,
  onWater,
  onHarvestSelected,
  onHarvestReady,
  onClearDebris,
  onPlant,
  onSellOne,
  onUnlockSelected,
  canUnlockSelected,
  plantableSeeds,
  sellableItems,
}) {
  const day = Math.floor(state.tick / DAY_TICKS) + 1;
  const tickInDay = (state.tick % DAY_TICKS) + 1;

  const logLines = [
    state.uiMessage,
    ...(state.progression?.notifications ?? []).slice(-4).map((note) => note.message ?? note),
    ...(state.economyStatus?.lastShortages ?? []).map((entry) => `Shortage: ${entry}`),
    ...(Object.entries(state.economyStatus?.lastOverflow ?? {})
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => `Overflow sold: ${itemId} x${qty}`)),
  ].filter(Boolean).slice(0, 8);

  const unlockedPlotCount = state.unlockedTiles?.filter(Boolean)?.length ?? 1;
  const actionButtons = getAvailableActions({
    ...state,
    selectedSpot,
    plantableSeeds,
    sellableItems,
    canUnlockSelected,
    unlockSelectedCost: 25 * unlockedPlotCount,
    handlers: {
      onTill,
      onWater,
      onHarvestSelected,
      onHarvestReady,
      onClearDebris,
      onPlant,
      onSellOne,
      onUnlockSelected,
    },
  }).filter((action) => action.isVisible);

  return (
    <main className="panel candybox-view stack-sm">
      <h3>Candybox View</h3>
      <p className="muted">
        ${state.money} · Tick {state.tick} · Day {day} (t{tickInDay}/{DAY_TICKS}) · Plot {selectedPlotIndex + 1} · Spot {selectedSpotIndex + 1}
      </p>
      <p className="muted">Inventory: {formatInventorySummary(state.inventory)}</p>

      <div className="stack-row">
        <button type="button" disabled={!canGoPrevPlot} onClick={onPrevPlot}>Prev plot</button>
        <button type="button" disabled={!canGoNextPlot} onClick={onNextPlot}>Next plot</button>
      </div>

      <section className="panel">
        <strong>Selected</strong>
        <p className="muted">
          Tile: {selectedTile?.type ?? 'empty'} · Soil: {selectedSpot?.soil ?? 'n/a'} · Crop: {selectedSpot?.crop?.cropId ?? 'none'}
        </p>
      </section>

      <section className="panel">
        <strong>Log</strong>
        {logLines.length === 0 ? <p className="muted">No recent events.</p> : (
          <ul>
            {logLines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}
          </ul>
        )}
      </section>

      <section className="panel stack-sm">
        <strong>Actions</strong>
        {actionButtons.map((action) => (
          <button key={action.id} type="button" onClick={action.execute} disabled={!action.isEnabled}>{action.label}</button>
        ))}
      </section>
    </main>
  );
}
