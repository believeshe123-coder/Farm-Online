export function advanceTick(state) {
  const nextState = {
    ...state,
    tick: state.tick + 1,
  };

  // Future: update time-based entities (e.g. crops, machines) here.
  return nextState;
}
