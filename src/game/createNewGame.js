function getRandomDebris() {
  const roll = Math.random();

  if (roll < 0.25) {
    return 'wood';
  }

  if (roll < 0.5) {
    return 'grass';
  }

  if (roll < 0.75) {
    return 'rock';
  }

  return null;
}

function createSpot() {
  return {
    soil: 'raw',
    crop: null,
    debris: getRandomDebris(),
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
  const centerIndex = Math.floor(totalTiles / 2);
  const unlockedTiles = Array.from({ length: totalTiles }, (_, index) => index === centerIndex);

  return {
    tick: 0,
    money: 10,
    renderMode: 'glyph',
    gridSize,
    tiles: Array.from({ length: totalTiles }, () => ({ type: 'empty' })),
    plots: Array.from({ length: totalTiles }, createPlot),
    unlockedTiles,
    inventory: {},
    hotbarItems: [],
    selected: null,
    selectedTool: { kind: 'tool', id: 'hoe' },
    uiMessage: '',
  };
}
