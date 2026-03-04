import { useEffect, useMemo } from 'react';
import { DAY_TICKS } from '../game/economy';
import { getAvailableActions } from './candyboxActions';
import { getPlotSummaryCounts, getSuggestedNextAction, getTileTypeSummary } from './candyboxSummary';
import { getCurrentWorkerToolEffect } from '../game/actions';
import AsciiBoard from './AsciiBoard';

function formatInventorySummary(inventory = {}) {
  const entries = Object.entries(inventory)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([itemId, qty]) => `${itemId}:${qty}`);

  return entries.length > 0 ? entries.join(' · ') : 'empty';
}

function formatTileTypeSummary(tileTypeSummary) {
  const entries = Object.entries(tileTypeSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => `${type}:${count}`);

  return entries.length > 0 ? entries.join(' · ') : 'none';
}

function getActionHotkey(index) {
  if (index < 0 || index > 9) {
    return '';
  }

  return index === 9 ? '0' : String(index + 1);
}

function toProgressionText(notification) {
  if (!notification) {
    return '';
  }

  if (typeof notification === 'string') {
    return notification;
  }

  if (typeof notification.message === 'string' && notification.message.trim()) {
    return notification.message;
  }

  if (typeof notification.title === 'string' && notification.title.trim()) {
    return notification.title;
  }

  return String(notification);
}

function getEarlySceneSnippet(revealed, selectedSpot) {
  if (revealed.includes('expedition')) {
    return 'The horizon opens. You can now read the wider land.';
  }

  if (revealed.includes('expansion')) {
    return `The fence creaks. ${selectedSpot?.debris ? 'Something still blocks your step.' : 'The path feels buyable.'}`;
  }

  if (revealed.includes('helpers')) {
    return 'You hear boots in the dirt. Help is possible.';
  }

  if (revealed.includes('trading')) {
    return 'A distant cart bell rings. Someone buys things.';
  }

  if (revealed.includes('gathering')) {
    return 'Wood, grass, and stone answer your hands.';
  }

  return 'You wake in a quiet field.';
}

export default function CandyboxView({
  state,
  eventLog,
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
  onHireWorker,
  onUpgradeWorkers,
  onPulseTreeTiming,
  onPulseGrassRhythm,
  onPulseRockCrit,
  canUnlockSelected,
  nextLandCost,
  nextHireCost,
  nextToolUpgradeCost,
  plantableSeeds,
  sellableItems,
}) {
  const day = Math.floor(state.tick / DAY_TICKS) + 1;
  const tickInDay = (state.tick % DAY_TICKS) + 1;
  const revealed = state.progression?.revealed ?? ['start'];
  const hasTrading = revealed.includes('trading');
  const hasHelpers = revealed.includes('helpers');
  const hasExpedition = revealed.includes('expedition');
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
  const treeTiming = state.minigames?.tree?.inputTiming ?? 0;
  const treeRate = 1 + ((treeTiming >= 0.45 && treeTiming <= 0.55) ? 1 : 0);
  const grassRate = ((state.minigames?.grass?.streak ?? 0) % 3 === 2) ? 2 : 1;
  const rockRate = (state.minigames?.rock?.critWindow && (state.minigames?.rock?.charge ?? 0) >= 1) ? 2 : 1;
  const toolBonusPercent = Math.round(getCurrentWorkerToolEffect(state) * 100);

  const progressionLogLines = (state.progression?.notifications ?? [])
    .slice(-3)
    .map((note) => toProgressionText(note))
    .filter(Boolean)
    .map((line) => `> ${line}`);

  const logLines = [
    ...(eventLog ?? []).slice(-8),
    state.uiMessage,
    ...progressionLogLines,
  ].filter(Boolean).slice(-8);

  const actionButtons = useMemo(() => getAvailableActions({
    ...state,
    selectedSpot,
    plantableSeeds,
    sellableItems,
    canUnlockSelected,
    unlockSelectedCost: nextLandCost,
    nextHireCost,
    nextToolUpgradeCost,
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
      onHireWorker,
      onUpgradeWorkers,
    },
  }).filter((action) => action.isVisible), [
    state,
    selectedSpot,
    plantableSeeds,
    sellableItems,
    canUnlockSelected,
    nextHireCost,
    nextLandCost,
    nextToolUpgradeCost,
    onTill,
    onWater,
    onHarvestSelected,
    onHarvestReadyOnActivePlot,
    onWaterDryPlantedOnActivePlot,
    onClearDebris,
    onPlant,
    onSellOne,
    onUnlockSelected,
    onHireWorker,
    onUpgradeWorkers,
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const targetTag = event.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      const hotkeyIndex = event.key === '0' ? 9 : Number(event.key) - 1;
      if (!Number.isInteger(hotkeyIndex) || hotkeyIndex < 0 || hotkeyIndex > 9) {
        if (event.key.toLowerCase() === 'q' && typeof onPulseTreeTiming === 'function') {
          event.preventDefault();
          onPulseTreeTiming();
        }

        if (event.key.toLowerCase() === 'w' && typeof onPulseGrassRhythm === 'function') {
          event.preventDefault();
          onPulseGrassRhythm();
        }

        if (event.key.toLowerCase() === 'e' && typeof onPulseRockCrit === 'function') {
          event.preventDefault();
          onPulseRockCrit();
        }

        return;
      }

      const action = actionButtons[hotkeyIndex];
      if (!action || !action.isEnabled || typeof action.execute !== 'function') {
        return;
      }

      event.preventDefault();
      action.execute();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionButtons, onPulseGrassRhythm, onPulseRockCrit, onPulseTreeTiming]);

  return (
    <main className="candybox-view stack-lg">
      <section className="candybox-block stack-sm">
        <p>
          ${state.money} · d{day}:{tickInDay} · plot {selectedPlotIndex + 1}:{selectedSpotIndex + 1} · keys 1-9,0 + q/w/e
        </p>
        {hasTrading ? <p>bag: {formatInventorySummary(state.inventory)}</p> : null}
        {hasHelpers ? <p>ground: {formatTileTypeSummary(tileTypeSummary)}</p> : null}
        <p>scene: {getEarlySceneSnippet(revealed, selectedSpot)}</p>
      </section>

      <section className="candybox-block stack-sm">
        <div className="stack-row">
          <button type="button" disabled={!canGoPrevPlot} onClick={onPrevPlot}>prev</button>
          <button type="button" disabled={!canGoNextPlot} onClick={onNextPlot}>next</button>
          <label htmlFor="plot-selector" className="sr-only">Active plot</label>
          <select
            id="plot-selector"
            value={selectedPlotIndex}
            onChange={(event) => onSelectPlot(Number(event.target.value))}
          >
            {unlockedPlotIndexes.map((plotIndex) => (
              <option key={plotIndex} value={plotIndex}>plot {plotIndex + 1}</option>
            ))}
          </select>
          <label htmlFor="spot-group-selector" className="sr-only">Active spot group</label>
          <select
            id="spot-group-selector"
            value={activeSpotGroup}
            onChange={(event) => onSpotGroupChange(event.target.value)}
          >
            <option value="all">all</option>
            <option value="ready">ready ({activePlotSummary.readyCrops})</option>
            <option value="empty">empty ({activePlotSummary.emptySoil})</option>
            <option value="debris">debris ({activePlotSummary.debris})</option>
          </select>
        </div>

        {actionButtons.map((action, index) => {
          const hotkey = getActionHotkey(index);
          const buttonLabel = hotkey ? `[${hotkey}] ${action.label}` : action.label;
          return (
            <button key={action.id} type="button" onClick={action.execute} disabled={!action.isEnabled}>{buttonLabel}</button>
          );
        })}
        <button type="button" onClick={onPulseTreeTiming}>[q] tree timing</button>
        <button type="button" onClick={onPulseGrassRhythm}>[w] grass rhythm</button>
        <button type="button" onClick={onPulseRockCrit}>[e] rock crack</button>
      </section>

      <section className="candybox-block stack-sm">
        <p>
          next: worker {nextHireCost?.coins ?? 0}c{(nextHireCost?.permits ?? 0) > 0 ? `+${nextHireCost.permits}p` : ''} ·
          tools {nextToolUpgradeCost?.coins ?? 0}c{(nextToolUpgradeCost?.permits ?? 0) > 0 ? `+${nextToolUpgradeCost.permits}p` : ''} ·
          land {nextLandCost?.coins ?? 0}c{(nextLandCost?.permits ?? 0) > 0 ? `+${nextLandCost.permits}p` : ''}
        </p>
        <p>rates: wood {treeRate}/cut · seeds {grassRate}/cut · rock {rockRate}/break · work +{toolBonusPercent}%</p>
        <p>hint: {suggestedNextAction.label}</p>
        <p>tile: {selectedTile?.type ?? 'empty'} · soil: {selectedSpot?.soil ?? 'n/a'} · crop: {selectedSpot?.crop?.cropId ?? 'none'}</p>
      </section>

      {hasExpedition ? (
        <section className="candybox-block">
          <AsciiBoard
            tiles={state.tiles}
            plots={state.plots}
            gridSize={state.gridSize}
            tick={state.tick}
            unlockedTiles={state.unlockedTiles}
            selected={state.selected}
            onSpotClick={() => {}}
          />
        </section>
      ) : null}

      <section className="candybox-block stack-sm">
        <p>log:</p>
        {logLines.length === 0 ? <p className="muted">(quiet)</p> : (
          <ul className="compact-log">
            {logLines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
