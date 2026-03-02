const TOOL_SLOTS = [
  { id: 1, label: 'HOE', selection: { kind: 'tool', id: 'hoe' }, hotkey: '1' },
  { id: 2, label: 'WATER', selection: { kind: 'tool', id: 'water' }, hotkey: '2' },
];

const ITEM_SLOT_COUNT = 2;

function isSameSelection(a, b) {
  return a?.kind === b?.kind && a?.id === b?.id;
}

function itemLabel(itemId) {
  if (!itemId) {
    return 'EMPTY';
  }

  return itemId.replaceAll('_', ' ').toUpperCase();
}

export default function BackpackBar({ inventory, hotbarItems, selectedHotbar, onSelectHotbar }) {
  const itemSlots = Array.from({ length: ITEM_SLOT_COUNT }, (_, index) => {
    const itemId = hotbarItems?.[index] ?? null;
    const selection = itemId ? { kind: 'item', id: itemId } : null;

    return {
      id: index + 3,
      label: itemLabel(itemId),
      selection,
      hotkey: String(index + 3),
      itemId,
    };
  });

  const slots = [...TOOL_SLOTS, ...itemSlots];

  return (
    <section className="backpack-bar" aria-label="Backpack hotbar">
      <div className="backpack-hotbar" role="list">
        {slots.map((slot) => {
          const isItemSlot = slot.selection?.kind === 'item';
          const itemCount = isItemSlot ? inventory[slot.selection.id] ?? 0 : null;
          const isDisabled = slot.selection === null || (isItemSlot && itemCount === 0);
          const isSelected = slot.selection ? isSameSelection(selectedHotbar, slot.selection) : false;

          return (
            <button
              key={slot.id}
              type="button"
              className={`backpack-slot ${isSelected ? 'is-selected' : ''}`}
              onClick={() => slot.selection && onSelectHotbar(slot.selection)}
              disabled={isDisabled}
              role="listitem"
              aria-pressed={isSelected}
            >
              <span className="backpack-slot-hotkey">{slot.hotkey}</span>
              <span className="backpack-slot-label">{slot.label}</span>
              {isItemSlot && <span className="backpack-slot-count">x{itemCount}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
