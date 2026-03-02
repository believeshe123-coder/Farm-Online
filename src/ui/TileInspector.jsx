export default function TileInspector({ selectedTile, selectedTileIndex }) {
  if (selectedTileIndex === null || !selectedTile) {
    return (
      <section className="panel">
        <h3>Tile Inspector</h3>
        <p className="muted">Select a tile to see crop growth and actions.</p>
      </section>
    );
  }

  const kind = selectedTile.type ?? 'unknown';
  const cropInfo = selectedTile.crop ?? selectedTile.cropId;
  const buildingInfo = selectedTile.building ?? selectedTile.buildingId;

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
    </section>
  );
}
