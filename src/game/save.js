const SAVE_KEY = 'homestead_save_v1';
const DEFAULT_RENDER_MODE = 'glyph';

function isValidTile(tile) {
  return tile && typeof tile === 'object' && typeof tile.type === 'string';
}

function isValidGameState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!Number.isInteger(state.tick) || state.tick < 0) return false;
  if (typeof state.money !== 'number') return false;
  if (!Number.isInteger(state.gridSize) || state.gridSize <= 0) return false;
  if (!Array.isArray(state.tiles) || state.tiles.length !== state.gridSize * state.gridSize) return false;
  if (!state.tiles.every(isValidTile)) return false;
  if (!state.inventory || typeof state.inventory !== 'object' || Array.isArray(state.inventory)) return false;
  if (state.renderMode !== undefined && state.renderMode !== 'glyph') return false;

  return state.selectedTileIndex === null ||
    (Number.isInteger(state.selectedTileIndex) &&
      state.selectedTileIndex >= 0 &&
      state.selectedTileIndex < state.tiles.length);
}

function normalizeGameState(state) {
  return {
    ...state,
    renderMode: state.renderMode ?? DEFAULT_RENDER_MODE,
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
    return isValidGameState(parsed) ? normalizeGameState(parsed) : null;
  } catch {
    return null;
  }
}
