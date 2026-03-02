const SAVE_KEY = 'homestead_save_v1';
const DEFAULT_RENDER_MODE = 'glyph';
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


function normalizeSelectedTool(tool) {
  return tool === 'water' ? 'water' : 'hoe';
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
  if (!Array.isArray(state.unlockedTiles) || state.unlockedTiles.length !== state.tiles.length) return false;
  if (!state.unlockedTiles.every((isUnlocked) => typeof isUnlocked === 'boolean')) return false;
  if (!state.inventory || typeof state.inventory !== 'object' || Array.isArray(state.inventory)) return false;
  if (state.selectedTool !== undefined && state.selectedTool !== 'hoe' && state.selectedTool !== 'water') return false;
  if (state.renderMode !== undefined && state.renderMode !== 'glyph') return false;

  return state.selectedTileIndex === null ||
    (Number.isInteger(state.selectedTileIndex) &&
      state.selectedTileIndex >= 0 &&
      state.selectedTileIndex < state.tiles.length);
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

  return {
    ...state,
    gridSize: FIXED_GRID_SIZE,
    tiles: normalizedTiles,
    unlockedTiles: normalizedUnlockedTiles,
    renderMode: state.renderMode ?? DEFAULT_RENDER_MODE,
    selectedTileIndex:
      Number.isInteger(state.selectedTileIndex) && state.selectedTileIndex >= 0 && state.selectedTileIndex < TOTAL_TILES
        ? state.selectedTileIndex
        : null,
    uiMessage: state.uiMessage ?? '',
    selectedTool: normalizeSelectedTool(state.selectedTool),
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
