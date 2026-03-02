const TILE_WIDTH = 7;
const TILE_HEIGHT = 5;

function tileToAsciiCell(tile, isUnlocked) {
  if (!isUnlocked) {
    return 'XXXXXXX';
  }

  switch (tile.type) {
    case 'growing':
      return '#######';
    case 'ready':
      return '$$$$$$$';
    case 'coop':
      return 'CCCCCCC';
    case 'tilled':
      return '.......';
    case 'empty':
    default:
      return '@@@@@@@';
  }
}

export function buildAsciiBoard(state) {
  const { tiles, gridSize, selectedTileIndex, unlockedTiles } = state;
  const totalInnerWidth = gridSize * TILE_WIDTH + (gridSize - 1);
  const horizontalLine = `+${'-'.repeat(totalInnerWidth)}+`;
  const boardLines = [[{ text: horizontalLine, className: 'ascii-border' }]];

  for (let row = 0; row < gridSize; row += 1) {
    for (let tileTextRow = 0; tileTextRow < TILE_HEIGHT; tileTextRow += 1) {
      const rowTokens = [{ text: '|', className: 'ascii-border' }];

      for (let col = 0; col < gridSize; col += 1) {
        const index = row * gridSize + col;
        const tile = tiles[index];
        const isUnlocked = Boolean(unlockedTiles?.[index]);
        const classes = ['ascii-cell'];

        if (tile?.type === 'ready') {
          classes.push('is-ready');
        }

        if (selectedTileIndex === index) {
          classes.push('is-selected');
        }

        rowTokens.push({ text: tileToAsciiCell(tile, isUnlocked), className: classes.join(' ') });

        if (col < gridSize - 1) {
          rowTokens.push({ text: '|', className: 'ascii-border' });
        }
      }

      rowTokens.push({ text: '|', className: 'ascii-border' });
      boardLines.push(rowTokens);
    }

    boardLines.push([{ text: horizontalLine, className: 'ascii-border' }]);
  }

  return {
    headerLines: ['Farm Online'],
    boardLines,
  };
}

export const ASCII_TILE_WIDTH = TILE_WIDTH;
