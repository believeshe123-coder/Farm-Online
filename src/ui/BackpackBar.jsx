const HOTBAR_SLOTS = [
  { id: 1, label: 'HOE', tool: 'hoe', hotkey: '1' },
  { id: 2, label: 'WATER', tool: 'water', hotkey: '2' },
  { id: 3, label: 'EMPTY', tool: null, hotkey: '3' },
  { id: 4, label: 'EMPTY', tool: null, hotkey: '4' },
  { id: 5, label: 'EMPTY', tool: null, hotkey: '5' },
  { id: 6, label: 'EMPTY', tool: null, hotkey: '6' },
  { id: 7, label: 'EMPTY', tool: null, hotkey: '7' },
  { id: 8, label: 'EMPTY', tool: null, hotkey: '8' },
  { id: 9, label: 'EMPTY', tool: null, hotkey: '9' },
  { id: 10, label: 'EMPTY', tool: null, hotkey: '0' },
];

function formatSeedSummary(inventory) {
  const seedEntries = Object.entries(inventory)
    .filter(([itemId, quantity]) => itemId.endsWith('_seed') && quantity > 0)
    .map(([itemId, quantity]) => `${itemId.replace('_seed', '')} x${quantity}`);

  if (seedEntries.length === 0) {
    return 'Seeds: none';
  }

  return `Seeds: ${seedEntries.join(', ')}`;
}

export default function BackpackBar({ inventory, selectedTool, onSelectTool }) {
  return (
    <section className="backpack-bar" aria-label="Backpack hotbar">
      <div className="backpack-hotbar" role="list">
        {HOTBAR_SLOTS.map((slot) => {
          const isSelected = slot.tool !== null && selectedTool === slot.tool;

          return (
            <button
              key={slot.id}
              type="button"
              className={`backpack-slot ${isSelected ? 'is-selected' : ''}`}
              onClick={() => slot.tool && onSelectTool(slot.tool)}
              disabled={slot.tool === null}
              role="listitem"
              aria-pressed={isSelected}
            >
              <span className="backpack-slot-hotkey">{slot.hotkey}</span>
              <span className={`backpack-slot-label ${slot.tool === null ? 'is-empty' : ''}`}>
                {slot.tool === null ? 'EMPTY' : slot.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="backpack-seeds">{formatSeedSummary(inventory)}</p>
    </section>
  );
}
