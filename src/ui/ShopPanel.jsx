export default function ShopPanel({ selectedTileIndex, onPlant, onBuildCoop, nextExpansion, canExpand, onExpand }) {
  const canPlant = selectedTileIndex !== null;

  return (
    <section className="panel">
      <h3>Shop</h3>
      <div className="stack-sm">
        <button type="button" disabled={!canPlant} onClick={() => onPlant('wheat')}>
          Plant Wheat
        </button>
        <button type="button" disabled={!canPlant} onClick={() => onPlant('carrot')}>
          Plant Carrot
        </button>
        <button type="button" disabled={!canPlant} onClick={onBuildCoop}>
          Build Chicken Coop
        </button>
        <button type="button" disabled={!canExpand} onClick={onExpand}>
          {nextExpansion
            ? `Expand Farm (${nextExpansion.to}x${nextExpansion.to}) - $${nextExpansion.cost}`
            : 'Expand Farm (Max size reached)'}
        </button>
      </div>
    </section>
  );
}
