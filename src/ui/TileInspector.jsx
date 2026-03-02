import { CROPS } from '../game/constants';

export default function TileInspector({ selectedTile, selectedTileIndex, tick, onHarvest, onOpenCoop }) {
  if (selectedTileIndex === null || !selectedTile) {
    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p className="muted">Select a tile to see crop growth and actions.</p>
      </section>
    );
  }

  const kind = selectedTile.kind ?? selectedTile.type ?? 'unknown';
  const cropInfo = selectedTile.crop ?? selectedTile.cropId;
  const buildingInfo = selectedTile.building ?? selectedTile.buildingId;
  const crop = selectedTile.cropId ? CROPS[selectedTile.cropId] : null;
  const growth = crop && selectedTile.kind === 'crop' ? Math.min(tick - selectedTile.plantedAtTick, crop.growTime) : null;
  const showHarvest = Boolean(selectedTile.kind === 'crop' && selectedTile.isReady);
  const showCoopButton = selectedTile.type === 'coop';

  return (
    <section className="panel">
      <h3>Tile Inspector</h3>
      <p>
        <strong>Tile:</strong> {selectedTileIndex + 1}
      </p>
      <p>
        <strong>Kind:</strong> {kind}
      </p>
      <p>
        <strong>Crop:</strong> {cropInfo ? String(cropInfo) : 'None'}
      </p>
      <p>
        <strong>Building:</strong> {buildingInfo ? String(buildingInfo) : 'None'}
      </p>
      {crop && growth !== null && (
        <p>
          <strong>Growth:</strong> {growth}/{crop.growTime} ticks
        </p>
      )}
      {showHarvest && (
        <button type="button" onClick={onHarvest}>
          Harvest
        </button>
      )}
      {showCoopButton && (
        <button type="button" onClick={onOpenCoop}>
          Open Coop
        </button>
      )}
    </section>
  );
}
