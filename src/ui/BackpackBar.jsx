import { useState } from 'react';

const TOOL_SLOTS = [
  { id: 1, label: 'HOE', selection: { kind: 'tool', id: 'hoe' }, hotkey: '1' },
  { id: 2, label: 'WATER', selection: { kind: 'tool', id: 'water' }, hotkey: '2' },
];

const HOTBAR_SLOT_COUNT = 10;
const ITEM_SLOT_COUNT = HOTBAR_SLOT_COUNT - TOOL_SLOTS.length;
const BAG_SLOT_COUNT = 30;

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
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const itemSlots = Array.from({ length: ITEM_SLOT_COUNT }, (_, index) => {
    const itemId = hotbarItems?.[index] ?? null;
    const selection = itemId ? { kind: 'item', id: itemId } : null;

    return {
      id: index + TOOL_SLOTS.length + 1,
      label: itemLabel(itemId),
      selection,
      hotkey: hotkeys[index + TOOL_SLOTS.length],
    };
  });

  const slots = [...TOOL_SLOTS, ...itemSlots];
  const bagEntries = Object.entries(inventory ?? {}).filter(([, count]) => count > 0);
  const bagSlots = Array.from({ length: BAG_SLOT_COUNT }, (_, index) => {
    const entry = bagEntries[index] ?? null;

    return {
      id: `bag-${index}`,
      label: itemLabel(entry?.[0] ?? null),
      count: entry?.[1] ?? 0,
      isEmpty: entry === null,
    };
  });

  return (
    <section className="backpack-bar" aria-label="Backpack hotbar">
      {isInventoryOpen && (
        <div id="inventory-popup" className="backpack-inventory-popup" role="dialog" aria-label="Inventory bag">
          <div className="backpack-bag" role="list" aria-label="Inventory slots">
            {bagSlots.map((slot) => (
              <div key={slot.id} className={`backpack-bag-slot ${slot.isEmpty ? 'is-empty' : ''}`} role="listitem">
                <span className="backpack-slot-label">{slot.label}</span>
                {!slot.isEmpty && <span className="backpack-slot-count">x{slot.count}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="backpack-hotbar" role="list" aria-label="Hotbar">
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
      <button
        type="button"
        className="inventory-toggle"
        aria-expanded={isInventoryOpen}
        aria-controls="inventory-popup"
        onClick={() => setIsInventoryOpen((open) => !open)}
      >
        Inventory
      </button>
    </section>
  );
}
