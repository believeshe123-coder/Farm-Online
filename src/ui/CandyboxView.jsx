import { DAY_TICKS } from '../game/economy';
import { getAvailableActions } from './candyboxActions';
import { getPlotSummaryCounts, getSuggestedNextAction, getTileTypeSummary } from './candyboxSummary';

function formatInventorySummary(inventory = {}) {
  const entries = Object.entries(inventory)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([itemId, qty]) => `${itemId}:${qty}`);

  return entries.length > 0 ? entries.join(' · ') : 'empty';
}

function formatTileTypeSummary(tileTypeSummary) {
  const entries = Object.entries(tileTypeSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}:${count}`);

  return entries.length > 0 ? entries.join(' · ') : 'none';
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
  onSelectPlot,
  activeSpotGroup,
  onSpotGroupChange,
  onTill,
  onWater,
  onHarvestSelected,
  onHarvestReadyOnActivePlot,
  onWaterDryPlantedOnActivePlot,
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
  const unlockedPlotIndexes = state.unlockedTiles
    .map((isUnlocked, plotIndex) => (isUnlocked ? plotIndex : null))
    .filter((plotIndex) => Number.isInteger(plotIndex));

  const { byPlot } = getPlotSummaryCounts(state);
  const activePlotSummary = byPlot[selectedPlotIndex] ?? {
    readyCrops: 0,
    emptySoil: 0,
    debris: 0,
    dryPlanted: 0,
  };
  const tileTypeSummary = getTileTypeSummary(state);
  const suggestedNextAction = getSuggestedNextAction(state, selectedPlotIndex);

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
      onHarvestReadyOnActivePlot,
      onWaterDryPlantedOnActivePlot,
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
      <p className="muted">Tiles: {formatTileTypeSummary(tileTypeSummary)}</p>

      <div className="stack-row">
        <button type="button" disabled={!canGoPrevPlot} onClick={onPrevPlot}>Prev plot</button>
        <button type="button" disabled={!canGoNextPlot} onClick={onNextPlot}>Next plot</button>
      </div>

      <section className="panel stack-sm">
        <strong>Summary selectors</strong>
        <label htmlFor="plot-selector">
          Active plot
          <select
            id="plot-selector"
            value={selectedPlotIndex}
            onChange={(event) => onSelectPlot(Number(event.target.value))}
          >
            {unlockedPlotIndexes.map((plotIndex) => (
              <option key={plotIndex} value={plotIndex}>Plot {plotIndex + 1}</option>
            ))}
          </select>
        </label>

        <label htmlFor="spot-group-selector">
          Active spot group
          <select
            id="spot-group-selector"
            value={activeSpotGroup}
            onChange={(event) => onSpotGroupChange(event.target.value)}
          >
            <option value="all">all spots</option>
            <option value="ready">ready crops ({activePlotSummary.readyCrops})</option>
            <option value="empty">empty soil ({activePlotSummary.emptySoil})</option>
            <option value="debris">debris ({activePlotSummary.debris})</option>
          </select>
        </label>
        <p className="muted">Suggested next action: {suggestedNextAction.label}</p>
      </section>

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
