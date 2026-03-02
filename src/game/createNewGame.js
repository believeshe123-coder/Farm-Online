export function createNewGame() {
  const gridSize = 5;

  return {
    tick: 0,
    money: 10,
    gridSize,
    tiles: Array.from({ length: gridSize * gridSize }, () => ({ type: 'empty' })),
    inventory: {},
    selectedTileIndex: null,
  };
}
