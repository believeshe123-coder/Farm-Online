export function tileToAsciiCell(tile, isUnlocked) {
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
    case 'empty':
    default:
      return '@@@@@@@';
  }
}
