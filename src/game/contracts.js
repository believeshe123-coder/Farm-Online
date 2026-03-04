import { SELLABLE_ITEMS } from './constants.js';

const CONTRACT_ITEMS = ['wheat', 'carrot', 'turnip', 'potato', 'egg', 'wood', 'rock'];

function clampReputation(value) {
  return Math.max(0.5, Math.min(2, Number(value) || 1));
}

function randomChoice(items = []) {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function createContractOffer(state, tick = 0) {
  const reputation = clampReputation(state?.contracts?.reputation ?? 1);
  const itemId = randomChoice(CONTRACT_ITEMS.filter((id) => SELLABLE_ITEMS[id]));
  if (!itemId) {
    return null;
  }

  const baselinePrice = SELLABLE_ITEMS[itemId].baselinePrice ?? 1;
  const requiredQty = Math.max(1, Math.round((4 + Math.random() * 8) * reputation));
  const durationTicks = 24 * (2 + Math.floor(Math.random() * 5));
  const baseReward = Math.max(5, Math.round(requiredQty * baselinePrice * (1.25 + Math.random() * 0.75)));

  return {
    id: `contract-${tick}-${Math.floor(Math.random() * 1_000_000)}`,
    itemId,
    requiredQty,
    deliveredQty: 0,
    baseReward,
    acceptedTick: null,
    deadlineTick: tick + durationTicks,
  };
}

export function createInitialContractState(tick = 0) {
  return {
    reputation: 1,
    offers: Array.from({ length: 3 }, () => createContractOffer({ contracts: { reputation: 1 } }, tick)).filter(Boolean),
    active: [],
    completed: [],
    failed: [],
  };
}

export function acceptContract(contractsState, contractId, tick = 0) {
  const state = contractsState ?? createInitialContractState(tick);
  const offer = state.offers.find((entry) => entry.id === contractId);
  if (!offer) {
    return state;
  }

  return {
    ...state,
    offers: state.offers.filter((entry) => entry.id !== contractId),
    active: [
      ...state.active,
      {
        ...offer,
        acceptedTick: tick,
      },
    ],
  };
}

export function settleContractSales(contractsState, soldMap = {}, tick = 0) {
  const state = contractsState ?? createInitialContractState(tick);
  const remainingSold = { ...soldMap };
  const completed = [...state.completed];
  let bonusCoins = 0;
  let reputation = clampReputation(state.reputation);

  const active = state.active
    .map((contract) => {
      const availableQty = Math.max(0, remainingSold[contract.itemId] ?? 0);
      const neededQty = Math.max(0, contract.requiredQty - contract.deliveredQty);
      const deliveredNow = Math.min(neededQty, availableQty);

      if (deliveredNow > 0) {
        remainingSold[contract.itemId] = availableQty - deliveredNow;
      }

      const updated = {
        ...contract,
        deliveredQty: contract.deliveredQty + deliveredNow,
      };

      if (updated.deliveredQty >= updated.requiredQty) {
        const payout = Math.round(updated.baseReward * reputation);
        bonusCoins += payout;
        reputation = clampReputation(reputation + 0.05);
        completed.push({ ...updated, completedTick: tick, payout });
        return null;
      }

      return updated;
    })
    .filter(Boolean);

  return {
    contractsState: {
      ...state,
      reputation,
      active,
      completed,
    },
    bonusCoins,
  };
}

export function processContractDeadlines(contractsState, tick = 0) {
  const state = contractsState ?? createInitialContractState(tick);
  const failed = [...state.failed];
  let reputation = clampReputation(state.reputation);
  let penalties = 0;

  const active = state.active.filter((contract) => {
    if (tick <= contract.deadlineTick) {
      return true;
    }

    const penalty = Math.max(1, Math.round(contract.baseReward * 0.25));
    penalties += penalty;
    reputation = clampReputation(reputation - 0.08);
    failed.push({ ...contract, failedTick: tick, penalty });
    return false;
  });

  return {
    contractsState: {
      ...state,
      reputation,
      active,
      failed,
    },
    penalties,
  };
}

export function refreshContractOffers(contractsState, tick = 0, desiredOffers = 3) {
  const state = contractsState ?? createInitialContractState(tick);
  const offers = [...state.offers];
  while (offers.length < desiredOffers) {
    const offer = createContractOffer(state, tick);
    if (!offer) {
      break;
    }
    offers.push(offer);
  }

  return {
    ...state,
    offers,
  };
}
