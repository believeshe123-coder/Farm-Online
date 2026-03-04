export function tileToGlyph(tile) {
  // Single source of truth for tile glyph/icon selection.
  const glyphMap = {
    empty: '🟩',
    tilled: '🟫',
    growing: '🌱',
    ready: '🌾',
    coop: '🐔',
    barn: '🏚️',
    forest: '🌲',
    mine: '⛏️',
  };

  return glyphMap[tile.type] ?? '❔';
}
