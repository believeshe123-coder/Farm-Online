function createSpot() {
  return {
    soil: 'raw',
    crop: null,
  };
}

function createPlot() {
  return {
    spots: Array.from({ length: 25 }, createSpot),
  };
}

export function createNewGame() {
  const gridSize = 5;
  const totalTiles = gridSize * gridSize;
  const centerStart = 1;
  const centerEnd = 3;
  const unlockedTiles = Array.from({ length: totalTiles }, (_, index) => {
    const col = index % gridSize;
    const row = Math.floor(index / gridSize);
    return row >= centerStart && row <= centerEnd && col >= centerStart && col <= centerEnd;
  });

  return {
    tick: 0,
    money: 10,
    renderMode: 'glyph',
    gridSize,
    tiles: Array.from({ length: totalTiles }, () => ({ type: 'empty' })),
    plots: Array.from({ length: totalTiles }, createPlot),
    unlockedTiles,
    inventory: {
      wheat_seed: 3,
      carrot_seed: 2,
      turnip_seed: 2,
    },
    hotbarItems: ['wheat_seed', 'carrot_seed', 'turnip_seed'],
    selected: null,
    selectedTool: { kind: 'tool', id: 'hoe' },
    uiMessage: '',
  };
}
