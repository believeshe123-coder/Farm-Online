export default function InventoryPanel({ inventory, onSell }) {
  const entries = Object.entries(inventory ?? {});

  return (
    <section className="panel">
      <h3>Inventory</h3>
      {entries.length === 0 ? (
        <p className="muted">No items.</p>
      ) : (
        <ul>
          {entries.map(([itemId, qty]) => (
            <li key={itemId}>
              {itemId}: {qty}{' '}
              <button type="button" disabled={qty <= 0} onClick={() => onSell(itemId, 1)}>
                Sell
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
