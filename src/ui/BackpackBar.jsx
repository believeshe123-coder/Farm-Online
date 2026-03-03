import { useMemo, useState } from 'react';

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

export default function BackpackBar({ inventory, hotbarItems, selectedHotbar, onSelectHotbar, onChangeHotbarItems }) {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const itemSlots = Array.from({ length: ITEM_SLOT_COUNT }, (_, index) => {
    const itemId = hotbarItems?.[index] ?? null;
    const selection = itemId ? { kind: 'item', id: itemId } : null;

    return {
      id: index + TOOL_SLOTS.length + 1,
      itemId,
      label: itemLabel(itemId),
      selection,
      hotkey: hotkeys[index + TOOL_SLOTS.length],
    };
  });

  const slots = [...TOOL_SLOTS, ...itemSlots];
  const bagEntries = useMemo(() => {
    const hotbarItemSet = new Set((hotbarItems ?? []).filter(Boolean));

    return Object.entries(inventory ?? {}).filter(([itemId, count]) => count > 0 && !hotbarItemSet.has(itemId));
  }, [inventory, hotbarItems]);
  const bagSlots = Array.from({ length: BAG_SLOT_COUNT }, (_, index) => {
    const entry = bagEntries[index] ?? null;

    return {
      id: `bag-${index}`,
      itemId: entry?.[0] ?? null,
      label: itemLabel(entry?.[0] ?? null),
      count: entry?.[1] ?? 0,
      isEmpty: entry === null,
    };
  });

  const moveItemToHotbar = (itemId) => {
    if (!itemId) {
      return;
    }

    const nextHotbar = [...(hotbarItems ?? [])];
    const existingIndex = nextHotbar.indexOf(itemId);
    if (existingIndex >= 0) {
      nextHotbar[existingIndex] = null;
      onChangeHotbarItems(nextHotbar);
      return;
    }

    const emptyIndex = nextHotbar.findIndex((id) => !id);
    if (emptyIndex >= 0) {
      nextHotbar[emptyIndex] = itemId;
      onChangeHotbarItems(nextHotbar);
      return;
    }

    const selectedIndex = selectedHotbar?.kind === 'item' ? nextHotbar.indexOf(selectedHotbar.id) : -1;
    if (selectedIndex >= 0) {
      nextHotbar[selectedIndex] = itemId;
      onChangeHotbarItems(nextHotbar);
    }
  };

  const removeHotbarItem = (itemIndex) => {
    const nextHotbar = [...(hotbarItems ?? [])];
    nextHotbar[itemIndex] = null;
    onChangeHotbarItems(nextHotbar);
  };

  const placeItemInHotbarSlot = (itemId, targetIndex, source) => {
    if (!itemId || targetIndex < 0 || targetIndex >= ITEM_SLOT_COUNT) {
      return;
    }

    const nextHotbar = [...(hotbarItems ?? [])];
    const existingIndex = nextHotbar.indexOf(itemId);

    if (typeof source?.index === 'number') {
      nextHotbar[source.index] = null;
    }

    if (existingIndex >= 0 && existingIndex !== targetIndex && existingIndex !== source?.index) {
      nextHotbar[existingIndex] = null;
    }

    nextHotbar[targetIndex] = itemId;
    onChangeHotbarItems(nextHotbar);
  };

  const handleDragStart = (event, payload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    setDraggedItem(payload);
  };

  const resolveDraggedItem = (event) => {
    const payload = event.dataTransfer.getData('application/json');
    if (payload) {
      try {
        return JSON.parse(payload);
      } catch {
        return draggedItem;
      }
    }

    return draggedItem;
  };

  return (
    <section className="backpack-bar" aria-label="Backpack hotbar">
      {isInventoryOpen && (
        <div id="inventory-popup" className="backpack-inventory-popup" role="dialog" aria-label="Inventory bag">
          <p className="backpack-help">Click an item to add/remove it from your hotbar.</p>
          <div
            className="backpack-bag"
            role="list"
            aria-label="Inventory slots"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const payload = resolveDraggedItem(event);
              if (payload?.source === 'hotbar' && typeof payload.index === 'number') {
                removeHotbarItem(payload.index);
              }
              setDraggedItem(null);
            }}
          >
            {bagSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`backpack-bag-slot ${slot.isEmpty ? 'is-empty' : ''}`}
                role="listitem"
                onClick={() => moveItemToHotbar(slot.itemId)}
                disabled={slot.isEmpty}
                draggable={!slot.isEmpty}
                onDragStart={(event) =>
                  handleDragStart(event, {
                    source: 'bag',
                    itemId: slot.itemId,
                  })
                }
                onDragEnd={() => setDraggedItem(null)}
              >
                <span className="backpack-slot-label">{slot.label}</span>
                {!slot.isEmpty && <span className="backpack-slot-count">x{slot.count}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="backpack-hotbar" role="list" aria-label="Hotbar">
        {slots.map((slot) => {
          const isItemSlot = slot.selection?.kind === 'item';
          const itemCount = isItemSlot ? inventory[slot.selection.id] ?? 0 : null;
          const isDisabled = (!isInventoryOpen && slot.selection === null)
            || (isItemSlot && itemCount === 0 && !isInventoryOpen);
          const isSelected = slot.selection ? isSameSelection(selectedHotbar, slot.selection) : false;
          const itemIndex = slot.id - TOOL_SLOTS.length - 1;
          const canDropToSlot = isInventoryOpen && slot.id > TOOL_SLOTS.length;

          return (
            <button
              key={slot.id}
              type="button"
              className={`backpack-slot ${isSelected ? 'is-selected' : ''}`}
              onClick={() => {
                if (isInventoryOpen && slot.itemId) {
                  removeHotbarItem(itemIndex);
                  return;
                }

                if (slot.selection) {
                  onSelectHotbar(slot.selection);
                }
              }}
              disabled={isDisabled}
              role="listitem"
              aria-pressed={isSelected}
              draggable={Boolean(isInventoryOpen && slot.itemId)}
              onDragStart={(event) => {
                if (!slot.itemId) {
                  event.preventDefault();
                  return;
                }

                handleDragStart(event, {
                  source: 'hotbar',
                  itemId: slot.itemId,
                  index: itemIndex,
                });
              }}
              onDragEnd={() => setDraggedItem(null)}
              onDragOver={(event) => {
                if (canDropToSlot) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                if (!canDropToSlot) {
                  return;
                }

                event.preventDefault();
                const payload = resolveDraggedItem(event);
                placeItemInHotbarSlot(payload?.itemId, itemIndex, payload);
                setDraggedItem(null);
              }}
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
