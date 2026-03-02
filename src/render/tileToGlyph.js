export function tileToGlyph(tile) {
  const glyphMap = {
    empty: '🟩',
    tilled: '🟫',
    growing: '🌱',
    ready: '🌾',
    coop: '🐔',
  };

  return glyphMap[tile.type] ?? '❔';
}
