const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const DAYS_PER_SEASON = 30;

const ITEM_LABELS = {
  wood: 'Wood',
  grain: 'Grain',
  food: 'Food',
  seeds: 'Seeds',
  cloth: 'Cloth',
  tools: 'Tools',
  fences: 'Fences',
};

const SELLABLE_ITEMS = [
  { key: 'wood', minPrice: 1, maxPrice: 5 },
  { key: 'grain', minPrice: 1, maxPrice: 4 },
  { key: 'food', minPrice: 2, maxPrice: 8 },
  { key: 'seeds', minPrice: 2, maxPrice: 7 },
  { key: 'cloth', minPrice: 4, maxPrice: 12 },
  { key: 'tools', minPrice: 8, maxPrice: 20 },
  { key: 'fences', minPrice: 3, maxPrice: 10 },
];

const BUILDING_PROJECTS = {
  cookfire: { label: 'Cookpot', days: 2, energyCost: 2, hoursCost: 3, resources: { wood: 10 } },
  leanTo: { label: 'Lean-to', days: 3, energyCost: 3, hoursCost: 5, resources: { wood: 30 } },
  cottage: { label: 'Cottage', days: 4, energyCost: 4, hoursCost: 6, resources: { wood: 80, gold: 30 } },
  marketStall: { label: 'Market Stall', days: 3, energyCost: 3, hoursCost: 5, resources: { wood: 20, grain: 10 } },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const createInitialState = () => ({
  day: 1,
  year: 1,
  seasonIndex: 0,
  seasonDay: 1,
  hoursPerDay: 10,
  hoursUsed: 0,
  energyMax: 10,
  energy: 10,
  hunger: 2,
  health: 10,
  warmth: 8,
  food: 16,
  wood: 12,
  grain: 0,
  seeds: 2,
  cloth: 0,
  tools: 1,
  fences: 0,
  gold: 0,
  hasCookfire: false,
  hasMarketStall: false,
  shelterLevel: 0,
  population: 1,
  clearedPlots: 0,
  plantedPlots: [],
  toolDulled: false,
  reputation: 0,
  activeBuilds: [],
  stallListings: [],
  travelerOffers: [],
  gameOver: false,
  dailyChronicle: ['A new settlement begins.'],
  townChronicle: ['Year 1: Settlement founded.'],
});

const state = createInitialState();

function getSeason() {
  return SEASONS[state.seasonIndex];
}

function plantingDaysUntilHarvest() {
  const season = getSeason();
  if (season === 'Spring') return 4;
  if (season === 'Summer') return 5;
  if (season === 'Autumn') return 6;
  return 8;
}

function spendCosts({ energyCost = 0, hoursCost = 0 }) {
  state.energy = clamp(state.energy - energyCost, 0, state.energyMax);
  state.hoursUsed = clamp(state.hoursUsed + hoursCost, 0, state.hoursPerDay);
}

function freePlots() {
  return state.clearedPlots - state.plantedPlots.length;
}

function readyPlotsCount() {
  return state.plantedPlots.filter((p) => p.daysUntilHarvest === 0).length;
}

function canDoAction({ energyCost = 0, hoursCost = 0 }) {
  if (state.gameOver) return { allowed: false, reason: 'Game over' };
  const hoursRemaining = state.hoursPerDay - state.hoursUsed;
  if (hoursRemaining < hoursCost) return { allowed: false, reason: `Need ${hoursCost}h` };
  if (state.energy < energyCost) return { allowed: false, reason: `Need ${energyCost} energy` };
  return { allowed: true, reason: '' };
}

function hasActiveBuild(type) {
  return state.activeBuilds.some((build) => build.type === type);
}

function hasResources(costs) {
  return Object.entries(costs).every(([item, amount]) => state[item] >= amount);
}

function spendResources(costs) {
  Object.entries(costs).forEach(([item, amount]) => {
    state[item] = clamp(state[item] - amount, 0, 9999);
  });
}

function itemLabel(key) {
  return ITEM_LABELS[key] || key;
}

function createTravelerOffers() {
  const goods = [
    { item: 'seeds', qty: randInt(3, 8), goldPrice: randInt(3, 8), barter: { item: 'grain', qty: randInt(4, 10) } },
    { item: 'cloth', qty: randInt(1, 4), goldPrice: randInt(8, 16), barter: { item: 'wood', qty: randInt(8, 16) } },
    { item: 'tools', qty: 1, goldPrice: randInt(14, 24), barter: { item: 'fences', qty: randInt(3, 8) } },
    { item: 'fences', qty: randInt(2, 7), goldPrice: randInt(5, 12), barter: { item: 'wood', qty: randInt(6, 14) } },
  ];
  const count = randInt(1, 3);
  return Array.from({ length: count }).map(() => {
    const pick = goods[randInt(0, goods.length - 1)];
    return {
      id: `${Date.now()}-${Math.random()}`,
      item: pick.item,
      qty: pick.qty,
      goldPrice: pick.goldPrice,
      barter: Math.random() < 0.35 ? pick.barter : null,
    };
  });
}

function startBuild(type, logs) {
  const project = BUILDING_PROJECTS[type];
  const gate = canDoAction({ energyCost: project.energyCost, hoursCost: project.hoursCost });
  if (!gate.allowed) return false;
  if (hasActiveBuild(type)) return false;
  if (!hasResources(project.resources)) return false;
  spendCosts({ energyCost: project.energyCost, hoursCost: project.hoursCost });
  spendResources(project.resources);
  state.activeBuilds.push({ type, daysRemaining: project.days, label: project.label });
  logs.push(`${project.label} construction started (${project.days} days).`);
  return true;
}

function applyAction(action) {
  if (state.gameOver && action !== 'newSettlement') return;

  const logs = [];

  if (action.startsWith('buyTraveler:')) {
    const offerId = action.replace('buyTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer || state.gold < offer.goldPrice) return;
    state.gold = clamp(state.gold - offer.goldPrice, 0, 9999);
    state[offer.item] = clamp(state[offer.item] + offer.qty, 0, 9999);
    state.travelerOffers = state.travelerOffers.filter((entry) => entry.id !== offerId);
    logs.push(`Bought ${offer.qty} ${itemLabel(offer.item)} from a traveler for ${offer.goldPrice} gold.`);
  }

  if (action.startsWith('haggleTraveler:')) {
    const offerId = action.replace('haggleTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer || !offer.barter || state[offer.barter.item] < offer.barter.qty) return;
    state[offer.barter.item] = clamp(state[offer.barter.item] - offer.barter.qty, 0, 9999);
    state[offer.item] = clamp(state[offer.item] + offer.qty, 0, 9999);
    state.travelerOffers = state.travelerOffers.filter((entry) => entry.id !== offerId);
    logs.push(`Haggled ${offer.barter.qty} ${itemLabel(offer.barter.item)} for ${offer.qty} ${itemLabel(offer.item)}.`);
  }

  if (action === 'listStallOffer') {
    if (!state.hasMarketStall) return;
    const itemInput = document.getElementById('stall-item');
    const qtyInput = document.getElementById('stall-qty');
    const priceInput = document.getElementById('stall-price');
    if (!itemInput || !qtyInput || !priceInput) return;
    const item = itemInput.value;
    const qty = clamp(Number(qtyInput.value) || 0, 0, 9999);
    const price = clamp(Number(priceInput.value) || 0, 0, 9999);
    if (!item || qty <= 0 || price <= 0 || state[item] < qty) return;
    state[item] = clamp(state[item] - qty, 0, 9999);
    state.stallListings.push({ id: `${Date.now()}-${Math.random()}`, item, qty, pricePerUnit: price });
    logs.push(`Listed ${qty} ${itemLabel(item)} at ${price} gold each in the stall.`);
  }

  if (action === 'clearLand') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 4 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 3, hoursCost: 4 });
    state.clearedPlots += 1;
    logs.push('You cleared one new plot of land.');
  }

  if (action === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    if (!gate.allowed || freePlots() <= 0 || state.seeds < 1) return;
    spendCosts({ energyCost: 2, hoursCost: 2 });
    state.seeds -= 1;
    state.plantedPlots.push({ daysUntilHarvest: plantingDaysUntilHarvest() });
    logs.push('You planted crops on one cleared plot.');
  }

  if (action === 'harvest') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 3 });
    const readyCount = readyPlotsCount();
    if (!gate.allowed || readyCount <= 0) return;
    spendCosts({ energyCost: 2, hoursCost: 3 });
    const harvested = state.plantedPlots.filter((p) => p.daysUntilHarvest === 0).length;
    state.plantedPlots = state.plantedPlots.filter((p) => p.daysUntilHarvest > 0);
    state.grain += harvested * 10;
    state.seeds += harvested;
    logs.push(`Harvested ${harvested} ready plot(s) for ${harvested * 10} grain and ${harvested} seeds.`);
  }

  if (action === 'chopWood') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 2, hoursCost: 2 });
    let yieldWood = randInt(5, 9);
    if (state.toolDulled) yieldWood = Math.max(0, yieldWood - 2);
    state.wood += yieldWood;
    logs.push(`You chopped wood and gained +${yieldWood} wood.`);
  }

  if (action === 'buildCookfire') {
    if (state.hasCookfire) return;
    startBuild('cookfire', logs);
  }

  if (action === 'buildMarketStall') {
    if (state.hasMarketStall || (state.grain < 20 && state.reputation < 1)) return;
    startBuild('marketStall', logs);
  }

  if (action === 'buildLeanTo') {
    if (state.shelterLevel >= 1) return;
    startBuild('leanTo', logs);
  }

  if (action === 'buildCottage') {
    if (state.shelterLevel < 1 || state.shelterLevel >= 2) return;
    startBuild('cottage', logs);
  }

  if (action === 'cookMeal') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 1 });
    if (!gate.allowed || !state.hasCookfire || state.grain < 5) return;
    spendCosts({ energyCost: 1, hoursCost: 1 });
    state.grain = clamp(state.grain - 5, 0, 9999);
    state.food = clamp(state.food + 6, 0, 9999);
    logs.push('You cooked a simple meal.');
  }

  if (action === 'rest') {
    const gate = canDoAction({ energyCost: 0, hoursCost: 2 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 0, hoursCost: 2 });
    state.energy = clamp(state.energy + 3, 0, state.energyMax);
    if (state.toolDulled && Math.random() < 0.3) {
      state.toolDulled = false;
      logs.push('You rested and sharpened your tools.');
    } else {
      logs.push('You rested and recovered energy.');
    }
  }

  if (action === 'endDay') {
    endDay();
    return;
  }

  if (action === 'newSettlement') {
    Object.assign(state, createInitialState());
    render();
    return;
  }

  if (logs.length) {
    state.dailyChronicle = [...logs, ...state.dailyChronicle].slice(0, 8);
  }

  render();
}

function resolveConstruction(logs) {
  state.activeBuilds.forEach((build) => {
    build.daysRemaining = clamp(build.daysRemaining - 1, 0, 99);
  });

  const finished = state.activeBuilds.filter((build) => build.daysRemaining === 0);
  state.activeBuilds = state.activeBuilds.filter((build) => build.daysRemaining > 0);

  finished.forEach((build) => {
    if (build.type === 'cookfire') state.hasCookfire = true;
    if (build.type === 'marketStall') state.hasMarketStall = true;
    if (build.type === 'leanTo') state.shelterLevel = 1;
    if (build.type === 'cottage') state.shelterLevel = 2;
    logs.push(`${build.label} was completed.`);
  });
}

function resolveStallSales(logs) {
  if (!state.hasMarketStall || state.stallListings.length === 0) return;
  const nextListings = [];
  state.stallListings.forEach((listing) => {
    const soldUnits = randInt(0, listing.qty);
    if (soldUnits > 0) {
      const goldEarned = soldUnits * listing.pricePerUnit;
      state.gold += goldEarned;
      logs.push(`Stall sold ${soldUnits}/${listing.qty} ${itemLabel(listing.item)} for ${goldEarned} gold.`);
    }
    const remaining = listing.qty - soldUnits;
    if (remaining > 0) {
      nextListings.push({ ...listing, qty: remaining });
    }
  });
  state.stallListings = nextListings;
}

function applyDailyEvents(logs) {
  const eventCountRoll = Math.random();
  let eventCount = 0;
  if (eventCountRoll > 0.35 && eventCountRoll <= 0.8) eventCount = 1;
  if (eventCountRoll > 0.8) eventCount = 2;

  const eventPool = ['rain', 'dullTools', 'traveler', 'quietWind'];

  for (let i = 0; i < eventCount; i += 1) {
    const event = eventPool[randInt(0, eventPool.length - 1)];

    if (event === 'rain') {
      const growingPlot = state.plantedPlots.find((p) => p.daysUntilHarvest > 0);
      if (growingPlot) {
        growingPlot.daysUntilHarvest = clamp(growingPlot.daysUntilHarvest - 1, 0, 99);
        logs.push('A light rain helped the crops (one plot matures faster).');
      } else {
        logs.push('A light rain passed over empty fields.');
      }
    }

    if (event === 'dullTools') {
      state.toolDulled = true;
      logs.push('Your tool edge dulled. Chop Wood yields less until Rest clears it.');
    }

    if (event === 'traveler') {
      if (state.food >= 2 && Math.random() < 0.6) {
        state.food = clamp(state.food - 2, 0, 9999);
        state.reputation += 1;
        logs.push('A traveler asked for food. You gave 2 food and gained +1 reputation.');
      } else {
        logs.push('A traveler asked for food, but left disappointed.');
      }
    }

    if (event === 'quietWind') {
      logs.push('A calm evening passed with no trouble.');
    }
  }
}

function endDay() {
  if (state.gameOver) {
    render();
    return;
  }

  const logs = [`End of Day ${state.day}:`];

  state.plantedPlots.forEach((plot) => {
    plot.daysUntilHarvest = clamp(plot.daysUntilHarvest - 1, 0, 99);
  });

  resolveConstruction(logs);
  resolveStallSales(logs);

  const foodNeed = state.population * 2;
  const startingFood = state.food;
  state.food = clamp(state.food - foodNeed, 0, 9999);
  const shortage = Math.max(foodNeed - startingFood, 0);
  const wasFed = shortage === 0;

  if (shortage > 0) {
    state.hunger = clamp(state.hunger + shortage, 0, 10);
    logs.push(`Food shortage by ${shortage}; hunger increased.`);
  } else {
    state.hunger = clamp(state.hunger - 1, 0, 10);
    logs.push('Food needs met; hunger reduced slightly.');
  }

  const season = getSeason();
  let warmthLoss = 0;
  if (season === 'Spring' || season === 'Summer') warmthLoss = Math.random() < 0.5 ? 0 : 1;
  if (season === 'Autumn') warmthLoss = 1;
  if (season === 'Winter') warmthLoss = Math.max(0, 2 - state.shelterLevel);
  state.warmth = clamp(state.warmth - warmthLoss, 0, 10);
  if (state.shelterLevel >= 1) {
    state.warmth = clamp(state.warmth + 2, 0, 10);
    logs.push('Shelter kept heat in (+2 warmth).');
  }
  logs.push(`Warmth changed by -${warmthLoss}.`);

  if (state.hunger >= 7) {
    state.energyMax = 8;
    state.health = clamp(state.health - 1, 0, 10);
    logs.push('Severe hunger reduced tomorrow energy max and harmed health.');
  } else {
    state.energyMax = 10;
  }

  if (state.warmth <= 2) {
    state.health = clamp(state.health - 1, 0, 10);
    logs.push('Cold conditions harmed health.');
  }

  if (state.shelterLevel >= 2 && wasFed) {
    state.health = clamp(state.health + 1, 0, 10);
    logs.push('The cottage and a full meal restored +1 health.');
  }

  applyDailyEvents(logs);

  if (state.hasMarketStall && Math.random() < 0.45) {
    state.travelerOffers = createTravelerOffers();
    logs.push('Travelers arrived at your market with goods to buy.');
  } else {
    state.travelerOffers = [];
  }

  state.day += 1;
  state.seasonDay += 1;

  if (state.seasonDay > DAYS_PER_SEASON) {
    state.seasonDay = 1;
    state.seasonIndex += 1;
    if (state.seasonIndex > 3) {
      state.seasonIndex = 0;
      state.year += 1;
      state.townChronicle.unshift(`Year ${state.year}: Another year of settlement endurance begins.`);
    }
    logs.push(`${getSeason()} begins.`);
  }

  state.energy = state.energyMax;
  state.hoursUsed = 0;

  if (state.health <= 0) {
    state.gameOver = true;
    logs.push('Health has fallen to 0. Your settlement failed. Game over.');
    state.townChronicle.unshift(`Year ${state.year}: The settlement collapsed.`);
  }

  state.dailyChronicle = logs;
  state.townChronicle = state.townChronicle.slice(0, 24);

  render();
}

function actionStatus(actionName) {
  if (state.gameOver && actionName !== 'newSettlement') return { disabled: true, reason: 'Game over' };

  if (actionName.startsWith('buyTraveler:')) {
    const offerId = actionName.replace('buyTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer) return { disabled: true, reason: 'Offer unavailable' };
    if (state.gold < offer.goldPrice) return { disabled: true, reason: `Need ${offer.goldPrice} gold` };
    return { disabled: false, reason: '' };
  }

  if (actionName.startsWith('haggleTraveler:')) {
    const offerId = actionName.replace('haggleTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer || !offer.barter) return { disabled: true, reason: 'No barter offer' };
    if (state[offer.barter.item] < offer.barter.qty) return { disabled: true, reason: `Need ${offer.barter.qty} ${itemLabel(offer.barter.item)}` };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'listStallOffer') {
    if (!state.hasMarketStall) return { disabled: true, reason: 'Requires market stall' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'clearLand') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 4 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (freePlots() <= 0) return { disabled: true, reason: 'No cleared empty plot' };
    if (state.seeds < 1) return { disabled: true, reason: 'Need seeds' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'harvest') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 3 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (readyPlotsCount() <= 0) return { disabled: true, reason: 'No ready crops' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'chopWood') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'rest') {
    const gate = canDoAction({ energyCost: 0, hoursCost: 2 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'buildLeanTo') {
    const project = BUILDING_PROJECTS.leanTo;
    const gate = canDoAction({ energyCost: project.energyCost, hoursCost: project.hoursCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.shelterLevel >= 1) return { disabled: true, reason: 'Lean-to already built' };
    if (hasActiveBuild('leanTo')) return { disabled: true, reason: 'Already building' };
    if (state.wood < 30) return { disabled: true, reason: 'Needs 30 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildCottage') {
    const project = BUILDING_PROJECTS.cottage;
    const gate = canDoAction({ energyCost: project.energyCost, hoursCost: project.hoursCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.shelterLevel < 1) return { disabled: true, reason: 'Requires lean-to first' };
    if (state.shelterLevel >= 2) return { disabled: true, reason: 'Cottage already built' };
    if (hasActiveBuild('cottage')) return { disabled: true, reason: 'Already building' };
    if (state.wood < 80) return { disabled: true, reason: 'Needs 80 wood' };
    if (state.gold < 30) return { disabled: true, reason: 'Needs 30 gold' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildCookfire') {
    const project = BUILDING_PROJECTS.cookfire;
    const gate = canDoAction({ energyCost: project.energyCost, hoursCost: project.hoursCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasCookfire) return { disabled: true, reason: 'Cookpot already built' };
    if (hasActiveBuild('cookfire')) return { disabled: true, reason: 'Already building' };
    if (state.wood < 10) return { disabled: true, reason: 'Needs 10 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'cookMeal') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasCookfire) return { disabled: true, reason: 'Requires cookpot' };
    if (state.grain < 5) return { disabled: true, reason: 'Needs 5 grain' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildMarketStall') {
    const project = BUILDING_PROJECTS.marketStall;
    const gate = canDoAction({ energyCost: project.energyCost, hoursCost: project.hoursCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasMarketStall) return { disabled: true, reason: 'Market stall already built' };
    if (hasActiveBuild('marketStall')) return { disabled: true, reason: 'Already building' };
    if (state.grain < 20 && state.reputation < 1) return { disabled: true, reason: 'Unlocks at 20 grain or 1 reputation' };
    if (state.wood < 20) return { disabled: true, reason: 'Needs 20 wood' };
    if (state.grain < 10) return { disabled: true, reason: 'Needs 10 grain' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'endDay') return { disabled: false, reason: '' };
  if (actionName === 'newSettlement') return { disabled: false, reason: '' };

  return { disabled: false, reason: '' };
}

function btn(label, actionName, costsText) {
  const { disabled, reason } = actionStatus(actionName);
  return `<button class="action-btn" data-action="${actionName}" ${disabled ? 'disabled' : ''} title="${reason || ''}">${label}${costsText ? ` (${costsText})` : ''}</button>`;
}

function render() {
  const app = document.getElementById('root');
  const season = getSeason();
  const readyCount = readyPlotsCount();
  const buildingsVisible = state.day >= 2 || state.wood >= 10;
  const canUnlockMarket = state.grain >= 20 || state.reputation >= 1;
  const shelterText = state.shelterLevel === 0 ? 'None' : state.shelterLevel === 1 ? 'Lean-to' : 'Cottage';
  const energyCritical = state.energy <= 3;
  const hoursRemaining = state.hoursPerDay - state.hoursUsed;
  const hoursCritical = hoursRemaining <= 3;

  const progressRows = [];
  if (state.hasCookfire) progressRows.push('<div class="stat-row"><span class="label">Cookpot</span><span>Built</span></div>');
  if (state.hasMarketStall) progressRows.push('<div class="stat-row"><span class="label">Market</span><span>Built</span></div>');
  if (state.shelterLevel > 0) progressRows.push(`<div class="stat-row"><span class="label">Shelter</span><span>${shelterText}</span></div>`);
  if (state.reputation > 0) progressRows.push(`<div class="stat-row"><span class="label">Reputation</span><span>${state.reputation}</span></div>`);

  const buildQueue = state.activeBuilds.length
    ? `<p class="muted"><strong>Building:</strong> ${state.activeBuilds.map((build) => `${build.label} (${build.daysRemaining}d left)`).join(' | ')}</p>`
    : '';

  const listingsMarkup = state.stallListings.length
    ? `<ul>${state.stallListings.map((listing) => `<li>${listing.qty} ${itemLabel(listing.item)} @ ${listing.pricePerUnit}g</li>`).join('')}</ul>`
    : '<p class="muted">No goods currently listed in your stall.</p>';

  app.innerHTML = `
    <main class="page">
      <div class="layout">
        <aside class="chronicles-column">
          <h3>Daily Chronicle</h3>
          <ul>${state.dailyChronicle.map((line) => `<li>${line}</li>`).join('')}</ul>

          <h3>Town Chronicle</h3>
          <ul>${state.townChronicle.map((line) => `<li>${line}</li>`).join('')}</ul>
        </aside>

        <section class="options-column">
          <h1>Medieval Incremental Economy Simulator</h1>
          <p>Day ${state.day} — ${season} ${state.seasonDay}/${DAYS_PER_SEASON} | Year ${state.year}</p>
          ${buildQueue}

          <section class="stats">
            <div class="stats-grid">
              <div class="stat-group">
                <h4>Status</h4>
                <div class="stat-row"><span class="label key">Energy</span><span class="stat-value ${energyCritical ? 'critical' : ''}">${state.energy}/${state.energyMax}</span></div>
                <div class="stat-row"><span class="label key">Hours Left</span><span class="stat-value ${hoursCritical ? 'critical' : ''}">${hoursRemaining}/${state.hoursPerDay}</span></div>
                <div class="stat-row"><span class="label">Hunger</span><span>${state.hunger}/10</span></div>
                <div class="stat-row"><span class="label key">Health</span><span>${state.health}/10</span></div>
                <div class="stat-row"><span class="label">Warmth</span><span>${state.warmth}/10</span></div>
              </div>
              <div class="stat-group">
                <h4>Supplies</h4>
                <div class="stat-row"><span class="label key">Food</span><span>${state.food}</span></div>
                <div class="stat-row"><span class="label">Wood</span><span>${state.wood}</span></div>
                <div class="stat-row"><span class="label">Grain</span><span>${state.grain}</span></div>
                <div class="stat-row"><span class="label">Seeds</span><span>${state.seeds}</span></div>
                <div class="stat-row"><span class="label">Cloth</span><span>${state.cloth}</span></div>
                <div class="stat-row"><span class="label">Tools</span><span>${state.tools}</span></div>
                <div class="stat-row"><span class="label">Fences</span><span>${state.fences}</span></div>
                <div class="stat-row"><span class="label">Gold</span><span>${state.gold}</span></div>
              </div>
              <div class="stat-group">
                <h4>Farm</h4>
                <div class="stat-row"><span class="label">Cleared plots</span><span>${state.clearedPlots}</span></div>
                <div class="stat-row"><span class="label">Planted plots</span><span>${state.plantedPlots.length}</span></div>
                <div class="stat-row"><span class="label">Ready plots</span><span>${readyCount}</span></div>
              </div>
              ${progressRows.length ? `<div class="stat-group"><h4>Progress</h4>${progressRows.join('')}</div>` : ''}
            </div>
          </section>

          ${state.gameOver ? '<p class="game-over">Game Over: your settlement can no longer continue.</p>' : ''}

          <section>
            <h3>Farm</h3>
            <div class="actions">
              ${btn('Clear Land', 'clearLand', '-3 energy, 4h')}
              ${btn('Plant Crops', 'plantCrops', '-2 energy, 2h, -1 seed')}
              ${btn('Chop Wood', 'chopWood', '-2 energy, 2h')}
              ${readyCount > 0 ? btn('Harvest', 'harvest', '-2 energy, 3h') : ''}
            </div>
          </section>

          ${buildingsVisible ? `
          <section>
            <h3>Buildings</h3>
            <div class="actions">
              ${!state.hasCookfire ? btn('Build Cookpot', 'buildCookfire', '2 day build, -2 energy, 3h, -10 wood') : ''}
              ${state.hasCookfire ? btn('Cook Meal', 'cookMeal', '-1 energy, 1h, -5 grain, +6 food') : ''}
              ${btn('Build Lean-to', 'buildLeanTo', '3 day build, -3 energy, 5h, -30 wood')}
              ${state.shelterLevel >= 1 ? btn('Build Cottage', 'buildCottage', '4 day build, -4 energy, 6h, -80 wood, -30 gold') : ''}
              ${!state.hasMarketStall && canUnlockMarket ? btn('Build Market Stall', 'buildMarketStall', '3 day build, -3 energy, 5h, -20 wood, -10 grain') : ''}
            </div>
          </section>
          ` : ''}

          <section>
            <h3>Life</h3>
            <div class="actions">${btn('Rest', 'rest', '+3 energy, 2h')}</div>
          </section>

          ${state.hasMarketStall ? `
          <section>
            <h3>Market Stall (Sell Only)</h3>
            <p class="muted">Set your own listing: choose item, quantity, and gold per unit.</p>
            <div class="actions">
              <select id="stall-item">${SELLABLE_ITEMS.map((item) => `<option value="${item.key}">${itemLabel(item.key)}</option>`).join('')}</select>
              <input id="stall-qty" type="number" min="1" value="10" />
              <input id="stall-price" type="number" min="1" value="1" />
              ${btn('List in Stall', 'listStallOffer')}
            </div>
            ${listingsMarkup}
          </section>
          ` : ''}

          <section>
            <button class="action-btn" data-action="endDay">End Day</button>
            <button class="action-btn" data-action="newSettlement">New Settlement</button>
          </section>
        </section>
      </div>

      ${state.hasMarketStall && state.travelerOffers.length ? `
      <section class="traveler-panel">
        <h3>Travelers in Town (Buy From Traveler)</h3>
        <div class="traveler-grid">
          ${state.travelerOffers.map((offer) => `
            <article class="traveler-card">
              <p><strong>${offer.qty} ${itemLabel(offer.item)}</strong></p>
              <p>${offer.goldPrice} gold</p>
              <div class="actions compact">
                ${btn('Buy', `buyTraveler:${offer.id}`)}
                ${offer.barter ? btn(`Haggle (${offer.barter.qty} ${itemLabel(offer.barter.item)})`, `haggleTraveler:${offer.id}`) : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
      ` : ''}
    </main>
  `;

  app.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => applyAction(button.dataset.action));
  });
}

render();
