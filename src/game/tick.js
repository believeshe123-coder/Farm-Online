export function advanceTick(state) {
  return {
    ...state,
    tick: state.tick + 1,
  };
}
