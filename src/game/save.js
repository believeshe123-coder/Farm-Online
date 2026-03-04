const SAVE_KEY = 'homestead_save_v1';
const DEFAULT_RENDER_MODE = 'glyph';
const MAX_HOTBAR_ITEM_SLOTS = 8;
const FIXED_GRID_SIZE = 5;
const TOTAL_TILES = FIXED_GRID_SIZE * FIXED_GRID_SIZE;

function buildDefaultUnlockedTiles(gridSize) {
  const centerStart = 1;
  const centerEnd = 3;

  return Array.from({ length: gridSize * gridSize }, (_, index) => {
    const col = index % gridSize;
    const row = Math.floor(index / gridSize);
    return row >= centerStart && row <= centerEnd && col >= centerStart && col <= centerEnd;
  });
}

function createDefaultSpot() {
  return {
    soil: 'raw',
    crop: null,
    debris: null,
  };
}

function createDefaultPlot() {
  return {
    resourceProfile: 'mixed',
    spots: Array.from({ length: 25 }, createDefaultSpot),
  };
}

function normalizeSelectedTool(selectedTool, hotbarItems = []) {
  if (selectedTool === 'hoe' || selectedTool === 'water') {
    return { kind: 'tool', id: selectedTool };
  }

  if (
    selectedTool &&
    typeof selectedTool === 'object' &&
    ((selectedTool.kind === 'tool' && (selectedTool.id === 'hoe' || selectedTool.id === 'water')) ||
      (selectedTool.kind === 'item' && typeof selectedTool.id === 'string' && hotbarItems.includes(selectedTool.id)))
  ) {
    return selectedTool;
  }

  return { kind: 'tool', id: 'hoe' };
}

function normalizeHotbarItems(hotbarItems, inventory) {
  if (!Array.isArray(hotbarItems)) {
    return ['wheat_seed', 'carrot_seed'];
  }

  const seen = new Set();
  const normalized = [];

  hotbarItems.forEach((itemId) => {
    if (typeof itemId !== 'string' || seen.has(itemId) || normalized.length >= MAX_HOTBAR_ITEM_SLOTS) {
      return;
    }

    if ((inventory?.[itemId] ?? 0) <= 0) {
      return;
    }

    seen.add(itemId);
    normalized.push(itemId);
  });

  if (normalized.length === 0) {
    if ((inventory?.wheat_seed ?? 0) > 0) {
      normalized.push('wheat_seed');
    }

    if ((inventory?.carrot_seed ?? 0) > 0 && normalized.length < MAX_HOTBAR_ITEM_SLOTS) {
      normalized.push('carrot_seed');
    }
  }

  return normalized;
}

function normalizeSelected(selected) {
  if (!selected || typeof selected !== 'object') {
    return null;
  }

  if (
    Number.isInteger(selected.plotIndex) &&
    selected.plotIndex >= 0 &&
    selected.plotIndex < TOTAL_TILES &&
    Number.isInteger(selected.spotIndex) &&
    selected.spotIndex >= 0 &&
    selected.spotIndex < 25
  ) {
    return {
      plotIndex: selected.plotIndex,
      spotIndex: selected.spotIndex,
    };
  }

  return null;
}

function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'object') {
    return null;
  }

  if ((crop.cropId === 'wheat' || crop.cropId === 'carrot') && Number.isInteger(crop.plantedAtTick)) {
    return {
      cropId: crop.cropId,
      plantedAtTick: crop.plantedAtTick,
    };
  }

  return null;
}

function normalizeSoil(soil) {
  if (soil === 'hoed' || soil === 'watered') {
    return soil;
  }

  return 'raw';
}

function normalizePlots(rawPlots) {
  return Array.from({ length: TOTAL_TILES }, (_, plotIndex) => {
    const sourcePlot = rawPlots?.[plotIndex];
    const sourceSpots = Array.isArray(sourcePlot?.spots) ? sourcePlot.spots : [];

    const resourceProfile = sourcePlot?.resourceProfile;

    return {
      resourceProfile: resourceProfile === 'forest' || resourceProfile === 'rock' || resourceProfile === 'seeds' || resourceProfile === 'mixed'
        ? resourceProfile
        : 'mixed',
      spots: Array.from({ length: 25 }, (_, spotIndex) => {
        const sourceSpot = sourceSpots[spotIndex];
        return {
          soil: normalizeSoil(sourceSpot?.soil),
          crop: normalizeCrop(sourceSpot?.crop),
          debris: sourceSpot?.debris === 'wood' || sourceSpot?.debris === 'rock' || sourceSpot?.debris === 'seeds'
            ? sourceSpot.debris
            : null,
        };
      }),
    };
  });
}

function isValidTile(tile) {
  return tile && typeof tile === 'object' && typeof tile.type === 'string';
}

function isValidGameState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!Number.isInteger(state.tick) || state.tick < 0) return false;
  if (typeof state.money !== 'number') return false;
  if (state.gridSize !== FIXED_GRID_SIZE) return false;
  if (!Array.isArray(state.tiles) || state.tiles.length !== TOTAL_TILES) return false;
  if (!state.tiles.every(isValidTile)) return false;
  if (!Array.isArray(state.plots) || state.plots.length !== TOTAL_TILES) return false;
  if (!state.plots.every((plot) => Array.isArray(plot?.spots) && plot.spots.length === 25)) return false;
  if (!Array.isArray(state.unlockedTiles) || state.unlockedTiles.length !== state.tiles.length) return false;
  if (!state.unlockedTiles.every((isUnlocked) => typeof isUnlocked === 'boolean')) return false;
  if (!state.inventory || typeof state.inventory !== 'object' || Array.isArray(state.inventory)) return false;
  if (!state.selectedTool || typeof state.selectedTool !== 'object') return false;
  if (state.renderMode !== undefined && state.renderMode !== 'glyph') return false;

  return state.selected === null ||
    (Number.isInteger(state.selected.plotIndex) &&
      state.selected.plotIndex >= 0 &&
      state.selected.plotIndex < TOTAL_TILES &&
      Number.isInteger(state.selected.spotIndex) &&
      state.selected.spotIndex >= 0 &&
      state.selected.spotIndex < 25);
}

function normalizeGameState(state) {
  const normalizedTiles = Array.from({ length: TOTAL_TILES }, (_, index) => {
    const tile = state.tiles?.[index];
    return isValidTile(tile) ? tile : { type: 'empty' };
  });

  const defaultUnlockedTiles = buildDefaultUnlockedTiles(FIXED_GRID_SIZE);
  const normalizedUnlockedTiles = Array.from({ length: TOTAL_TILES }, (_, index) => {
    if (!Array.isArray(state.unlockedTiles)) {
      return defaultUnlockedTiles[index];
    }

    return typeof state.unlockedTiles[index] === 'boolean'
      ? state.unlockedTiles[index]
      : defaultUnlockedTiles[index];
  });

  const normalizedInventory = state.inventory && typeof state.inventory === 'object' && !Array.isArray(state.inventory)
    ? state.inventory
    : {};
  const hotbarItems = normalizeHotbarItems(state.hotbarItems, normalizedInventory);

  return {
    ...state,
    gridSize: FIXED_GRID_SIZE,
    tiles: normalizedTiles,
    plots: normalizePlots(state.plots),
    unlockedTiles: normalizedUnlockedTiles,
    inventory: normalizedInventory,
    hotbarItems,
    renderMode: state.renderMode ?? DEFAULT_RENDER_MODE,
    selected: normalizeSelected(state.selected),
    uiMessage: state.uiMessage ?? '',
    selectedTool: normalizeSelectedTool(state.selectedTool, hotbarItems),
  };
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeGameState(parsed);
    return isValidGameState(normalized) ? normalized : null;
  } catch {
    return null;
  }
}
