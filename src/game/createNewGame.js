export function createNewGame() {
  const gridSize = 5;

  return {
    tick: 0,
    money: 10,
    renderMode: 'glyph',
    gridSize,
    tiles: Array.from({ length: gridSize * gridSize }, () => ({ type: 'empty' })),
    inventory: {
      wheat_seed: 3,
      carrot_seed: 1,
    },
    selectedTileIndex: null,
  };
}
