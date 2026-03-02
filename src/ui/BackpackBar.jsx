const HOTBAR_SLOTS = [
  { id: 1, label: 'HOE', selection: { kind: 'tool', id: 'hoe' }, hotkey: '1' },
  { id: 2, label: 'WATER', selection: { kind: 'tool', id: 'water' }, hotkey: '2' },
  { id: 3, label: 'WHEAT', selection: { kind: 'item', id: 'wheat_seed' }, hotkey: '3' },
  { id: 4, label: 'CARROT', selection: { kind: 'item', id: 'carrot_seed' }, hotkey: '4' },
];

function isSameSelection(a, b) {
  return a?.kind === b?.kind && a?.id === b?.id;
}

export default function BackpackBar({ inventory, selectedHotbar, onSelectHotbar }) {
  return (
    <section className="backpack-bar" aria-label="Backpack hotbar">
      <div className="backpack-hotbar" role="list">
        {HOTBAR_SLOTS.map((slot) => {
          const isSeed = slot.selection.kind === 'item';
          const seedCount = isSeed ? inventory[slot.selection.id] ?? 0 : null;
          const isDisabled = isSeed && seedCount === 0;
          const isSelected = isSameSelection(selectedHotbar, slot.selection);

          return (
            <button
              key={slot.id}
              type="button"
              className={`backpack-slot ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectHotbar(slot.selection)}
              disabled={isDisabled}
              role="listitem"
              aria-pressed={isSelected}
            >
              <span className="backpack-slot-hotkey">{slot.hotkey}</span>
              <span className="backpack-slot-label">{slot.label}</span>
              {isSeed && <span className="backpack-slot-count">x{seedCount}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
