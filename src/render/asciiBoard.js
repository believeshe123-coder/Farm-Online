const TILE_WIDTH = 5;

function tileToAsciiCell(tile) {
  switch (tile.type) {
    case 'growing':
      return '#####';
    case 'ready':
      return '$$$$$';
    case 'coop':
      return 'CCCCC';
    case 'tilled':
      return '.....';
    case 'empty':
    default:
      return '@@@@@';
  }
}

export function buildAsciiBoard(state) {
  const { tiles, gridSize, selectedTileIndex } = state;
  const horizontalLine = `+${'-'.repeat(gridSize * TILE_WIDTH + (gridSize - 1))}+`;
  const boardLines = [[{ text: horizontalLine, className: 'ascii-border' }]];

  for (let row = 0; row < gridSize; row += 1) {
    const rowTokens = [{ text: '|', className: 'ascii-border' }];

    for (let col = 0; col < gridSize; col += 1) {
      const index = row * gridSize + col;
      const tile = tiles[index];
      const classes = ['ascii-cell'];

      if (tile?.type === 'ready') {
        classes.push('is-ready');
      }

      if (selectedTileIndex === index) {
        classes.push('is-selected');
      }

      rowTokens.push({ text: tileToAsciiCell(tile), className: classes.join(' ') });

      if (col < gridSize - 1) {
        rowTokens.push({ text: '|', className: 'ascii-border' });
      }
    }

    rowTokens.push({ text: '|', className: 'ascii-border' });
    boardLines.push(rowTokens);
    boardLines.push([{ text: horizontalLine, className: 'ascii-border' }]);
  }

  return {
    headerLines: ['Farm Online'],
    boardLines,
  };
}

export const ASCII_TILE_WIDTH = TILE_WIDTH;
