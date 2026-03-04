import { CROPS, WATERING_DURATION_TICKS } from '../game/constants';

function isCropHydrated(cropState, tick) {
  if (!cropState) {
    return false;
  }

  if (typeof cropState.lastWateredTick === 'number') {
    const wateringDuration = CROPS[cropState.cropId]?.wateringDurationTicks ?? WATERING_DURATION_TICKS;
    return (tick - cropState.lastWateredTick) <= wateringDuration;
  }

  return Boolean(cropState.watered);
}

export function isSpotReadyToHarvest(spot, tick) {
  const cropState = spot?.crop;
  if (!cropState) {
    return false;
  }

  const crop = CROPS[cropState.cropId];
  if (!crop) {
    return false;
  }

  const hydrated = isCropHydrated(cropState, tick);
  const effectiveGrowTime = crop.wateredGrowMultiplier && hydrated
    ? crop.growTime * crop.wateredGrowMultiplier
    : crop.growTime;

  if (!effectiveGrowTime) {
    return false;
  }

  return (tick - cropState.plantedAtTick) / effectiveGrowTime >= 1;
}

function summarizePlot(plot, tick) {
  const summary = {
    totalSpots: 0,
    planted: 0,
    readyCrops: 0,
    emptySoil: 0,
    debris: 0,
    dryPlanted: 0,
  };

  const spots = plot?.spots ?? [];
  summary.totalSpots = spots.length;

  spots.forEach((spot) => {
    if (spot?.debris) {
      summary.debris += 1;
      return;
    }

    if (spot?.crop) {
      summary.planted += 1;
      if (isSpotReadyToHarvest(spot, tick)) {
        summary.readyCrops += 1;
      }
      if (!isCropHydrated(spot.crop, tick)) {
        summary.dryPlanted += 1;
      }
      return;
    }

    summary.emptySoil += 1;
  });

  return summary;
}

export function getPlotSummaryCounts(gameState) {
  const tick = gameState?.tick ?? 0;
  const plots = gameState?.plots ?? [];

  const byPlot = plots.map((plot) => summarizePlot(plot, tick));
  const totals = byPlot.reduce((acc, summary) => ({
    totalSpots: acc.totalSpots + summary.totalSpots,
    planted: acc.planted + summary.planted,
    readyCrops: acc.readyCrops + summary.readyCrops,
    emptySoil: acc.emptySoil + summary.emptySoil,
    debris: acc.debris + summary.debris,
    dryPlanted: acc.dryPlanted + summary.dryPlanted,
  }), {
    totalSpots: 0,
    planted: 0,
    readyCrops: 0,
    emptySoil: 0,
    debris: 0,
    dryPlanted: 0,
  });

  return { byPlot, totals };
}

export function getTileTypeSummary(gameState) {
  const summary = {};
  (gameState?.tiles ?? []).forEach((tile) => {
    const type = tile?.type ?? 'unknown';
    summary[type] = (summary[type] ?? 0) + 1;
  });
  return summary;
}

export function getSuggestedNextAction(gameState, activePlotIndex) {
  const { byPlot } = getPlotSummaryCounts(gameState);
  const activeSummary = byPlot[activePlotIndex] ?? null;

  if (!activeSummary) {
    return { id: 'none', label: 'Select an unlocked plot.' };
  }

  if (activeSummary.readyCrops > 0) {
    return { id: 'harvest-ready-active', label: `Harvest ${activeSummary.readyCrops} ready crop${activeSummary.readyCrops === 1 ? '' : 's'} on this plot.` };
  }

  if (activeSummary.dryPlanted > 0) {
    return { id: 'water-dry-active', label: `Water ${activeSummary.dryPlanted} dry planted spot${activeSummary.dryPlanted === 1 ? '' : 's'} on this plot.` };
  }

  if (activeSummary.debris > 0) {
    return { id: 'clear-debris', label: `Clear ${activeSummary.debris} debris spot${activeSummary.debris === 1 ? '' : 's'} on this plot.` };
  }

  if (activeSummary.emptySoil > 0) {
    return { id: 'plant-empty-soil', label: `${activeSummary.emptySoil} empty soil spot${activeSummary.emptySoil === 1 ? '' : 's'} available for planting.` };
  }

  return { id: 'none', label: 'No urgent actions right now.' };
}
