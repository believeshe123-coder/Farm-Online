export function createNewGame() {
  return {
    money: 50,
    tick: 0,
    inventory: {},
    farm: {
      width: 6,
      height: 6,
      tiles: Array.from({ length: 36 }, (_, id) => ({
        id,
        type: 'empty',
      })),
    },
  };
}
