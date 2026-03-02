export default function ShopPanel({ selectedTileIndex, onPlant }) {
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
      </div>
    </section>
  );
}
