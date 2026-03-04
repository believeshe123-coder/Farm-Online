import { CROPS } from '../game/constants';
import { getWateringDurationTicks, isCropHydratedAtTick } from '../game/actions';

const BASE_UNLOCK_PLOT_COST = 25;

function getUnlockCost(unlockedPlotCount) {
  return BASE_UNLOCK_PLOT_COST * (unlockedPlotCount - 8);
}

function getStage(progress) {
  if (progress < 0.34) {
    return 'Early';
  }

  if (progress < 0.67) {
    return 'Mid';
  }

  if (progress >= 1) {
    return 'Ready';
  }

  return 'Mid';
}

export default function TileInspector({
  selected,
  selectedSpot,
  selectedTile,
  tick,
  onHarvest,
  onOpenCoop,
  onCollectResource,
  isSelectedTileUnlocked,
  unlockedPlotCount,
}) {
  if (!selected || !selectedSpot) {
    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p className="muted">Select a growing spot to inspect soil, crop, and growth.</p>
      </section>
    );
  }

  const nextUnlockCost = getUnlockCost(unlockedPlotCount);

  if (!isSelectedTileUnlocked) {
    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p>
          <strong>Plot:</strong> {selected.plotIndex + 1}
        </p>
        <p>
          <strong>Spot:</strong> {selected.spotIndex + 1}
        </p>
        <p>
          <strong>Status:</strong> Locked plot
        </p>
        <p>
          <strong>Unlock Cost:</strong> ${nextUnlockCost}
        </p>
      </section>
    );
  }

  if (selectedTile?.type === 'coop') {
    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p><strong>Plot:</strong> {selected.plotIndex + 1}</p>
        <p><strong>Type:</strong> Chicken Coop</p>
        <button type="button" onClick={onOpenCoop}>Open Coop</button>
      </section>
    );
  }

  if ((selectedTile?.type === 'forest' || selectedTile?.type === 'mine') && selectedTile.resource) {
    const resourceReady = selectedTile.resource.charge >= selectedTile.resource.maxCharge;
    const ticksRemaining = Math.max(0, selectedTile.resource.maxCharge - selectedTile.resource.charge);
    const locationLabel = selectedTile.type === 'forest' ? 'Forest Camp' : 'Mining Area';

    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p><strong>Plot:</strong> {selected.plotIndex + 1}</p>
        <p><strong>Type:</strong> {locationLabel}</p>
        <p><strong>Collect:</strong> {selectedTile.resource.amount} {selectedTile.resource.itemId}</p>
        <p><strong>Status:</strong> {resourceReady ? 'Ready' : `Ready in ${ticksRemaining} ticks`}</p>
        <button type="button" disabled={!resourceReady} onClick={onCollectResource}>Collect</button>
      </section>
    );
  }

  const crop = selectedSpot.crop ? CROPS[selectedSpot.crop.cropId] : null;
  const hydratedCrop = selectedSpot.crop
    ? { ...selectedSpot.crop, watered: isCropHydratedAtTick(selectedSpot.crop, tick) }
    : null;
  const effectiveGrowTime = crop?.wateredGrowMultiplier && hydratedCrop?.watered ? crop.growTime * crop.wateredGrowMultiplier : crop?.growTime;
  const progress = crop ? (tick - selectedSpot.crop.plantedAtTick) / effectiveGrowTime : null;
  const stage = progress === null ? 'None' : getStage(progress);
  const canHarvest = Boolean(progress !== null && progress >= 1);

  let wateringStatus = null;
  if (selectedSpot.crop) {
    const hydrated = isCropHydratedAtTick(selectedSpot.crop, tick);
    const hasTimedWatering = typeof selectedSpot.crop.lastWateredTick === 'number';

    if (hydrated && hasTimedWatering) {
      const wateringDuration = getWateringDurationTicks(selectedSpot.crop.cropId);
      const ticksUntilWaterNeeded = Math.max(0, wateringDuration - (tick - selectedSpot.crop.lastWateredTick));
      wateringStatus = ticksUntilWaterNeeded === 0 ? 'Needs water now' : `Water again in ${ticksUntilWaterNeeded} ticks`;
    } else if (hydrated) {
      wateringStatus = 'Watered';
    } else {
      wateringStatus = 'Needs water now';
    }
  }

  return (
    <section className="panel">
      <h3>Tile Inspector</h3>
      <p>
        <strong>Plot:</strong> {selected.plotIndex + 1}
      </p>
      <p>
        <strong>Spot:</strong> {selected.spotIndex + 1}
      </p>
      <p>
        <strong>Soil:</strong> {selectedSpot.soil}
      </p>
      <p>
        <strong>Crop:</strong> {selectedSpot.crop ? `${crop?.name ?? selectedSpot.crop.cropId} (${selectedSpot.crop.cropId})` : 'None'}
      </p>
      {selectedSpot.crop && (
        <p>
          <strong>Water:</strong> {wateringStatus}
        </p>
      )}
      {crop && progress !== null && (
        <p>
          <strong>Progress:</strong> {Math.max(0, Math.min(100, Math.floor(progress * 100)))}% ({stage})
        </p>
      )}
      {canHarvest && (
        <button type="button" onClick={onHarvest}>
          Harvest
        </button>
      )}
    </section>
  );
}
