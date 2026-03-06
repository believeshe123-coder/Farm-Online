const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const DAYS_PER_SEASON = 30;
const TOWN_ROLES = ['Builder', 'Hunter', 'Lumberjack', 'Miner', 'Farmer', 'Trader'];

const ITEM_LABELS = {
  sticks: 'Sticks',
  stones: 'Stones',
  rocks: 'Rocks',
  grass: 'Grass',
  rope: 'Rope',
  wood: 'Wood',
  sticks: 'Sticks',
  stones: 'Stones',
  grass: 'Grass',
  grain: 'Grain',
  food: 'Food',
  seeds: 'Seeds',
  cloth: 'Cloth',
  bandages: 'Bandages',
  tools: 'Tools',
  fences: 'Fences',
  fur: 'Fur',
};

const SELLABLE_ITEMS = [
  { key: 'wood', minPrice: 1, maxPrice: 5 },
  { key: 'sticks', minPrice: 1, maxPrice: 4 },
  { key: 'stones', minPrice: 1, maxPrice: 4 },
  { key: 'grass', minPrice: 1, maxPrice: 3 },
  { key: 'grain', minPrice: 1, maxPrice: 4 },
  { key: 'food', minPrice: 2, maxPrice: 8 },
  { key: 'seeds', minPrice: 2, maxPrice: 7 },
  { key: 'cloth', minPrice: 4, maxPrice: 12 },
  { key: 'tools', minPrice: 8, maxPrice: 20 },
  { key: 'fences', minPrice: 3, maxPrice: 10 },
];

const BUILDING_PROJECTS = {
  cookfire: { label: 'Cooking Fire', days: 2, energyCost: 2, resources: { rocks: 8, wood: 4 } },
  leanTo: { label: 'Lean-to', days: 3, energyCost: 3, resources: { wood: 30 } },
  cottage: { label: 'Cottage', days: 4, energyCost: 4, resources: { wood: 80, gold: 30 } },
  marketStall: { label: 'Market Stall', days: 3, energyCost: 3, resources: { wood: 20, grain: 10 } },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const createInitialState = () => ({
  day: 1,
  year: 1,
  seasonIndex: 0,
  seasonDay: 1,
  energyMax: 10,
  baseEnergyMax: 10,
  energy: 10,
  bonusEnergyToday: 0,
  hunger: 2,
  health: 10,
  warmth: 8,
  armorWarmthBuff: 0,
  food: 0,
  sticks: 0,
  stones: 0,
  rocks: 0,
  grass: 0,
  rope: 0,
  wood: 0,
  grain: 0,
  seeds: 0,
  cloth: 0,
  bandages: 0,
  tools: 0,
  fences: 0,
  fur: 0,
  gold: 0,
  hasCookfire: false,
  hasHandmadeFire: false,
  hasMarketStall: false,
  hasBasket: false,
  hasSharpSpear: false,
  spearUses: 0,
  hasKnife: false,
  hasWheelbarrow: false,
  hasHandmadeAxe: false,
  hasAxe: false,
  hasHandmadePickaxe: false,
  hasPickaxe: false,
  hasSleepingSpot: false,
  hasHandmadeBed: false,
  hasFurArmor: false,
  hasWell: false,
  shelterLevel: 0,
  population: 1,
  cottagesCount: 0,
  cottages: [],
  townsfolk: [],
  children: [],
  roleBonuses: { Builder: 0, Hunter: 0, Lumberjack: 0, Miner: 0, Farmer: 0, Trader: 0 },
  hasLifePartner: false,
  clearedPlots: 0,
  plantedPlots: [],
  toolDulled: false,
  reputation: 0,
  activeBuilds: [],
  stallListings: [],
  travelerOffers: [],
  activePage: 'main',
  selectedAdvancementNode: null,
  selectedCottageId: null,
  restedToday: false,
  gameOver: false,
  dailyChronicle: ['A new settlement begins.'],
  chronicleLog: ['A new settlement begins.'],
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

function spendCosts({ energyCost = 0 }) {
  state.energy = clamp(state.energy - energyCost, 0, state.energyMax);
}

function freePlots() {
  return state.clearedPlots - state.plantedPlots.length;
}

function readyPlotsCount() {
  return state.plantedPlots.filter((p) => p.daysUntilHarvest === 0).length;
}

function canDoAction({ energyCost = 0 }) {
  if (state.gameOver) return { allowed: false, reason: 'Game over' };
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

const advancementChains = [
  {
    name: 'Main Farm Loop',
    steps: [
      { id: 'cleared_plots', label: 'Cleared Plots', desc: 'Clearing plots gives seeds, sticks, stones, and grass.', requires: [] },
      { id: 'planted_plots', label: 'Planted Plots', desc: 'Plant seeds in cleared plots.', requires: ['cleared_plots'] },
      { id: 'ready_plots', label: 'Ready Plots', desc: 'Plots become ready after growth time passes.', requires: ['planted_plots'] },
      { id: 'harvest_grain', label: 'Harvest Grain', desc: 'Harvesting ready plots gives 5 grain.', requires: ['ready_plots'] },
    ],
  },
  {
    name: 'Sticks Chain',
    steps: [
      { id: 'sticks', label: 'Sticks', desc: 'Gather sticks from clearing plots or stick gathering.', requires: [] },
      { id: 'wood', label: 'Wood', desc: 'Wood requires an axe to gather effectively.', requires: ['sticks'] },
    ],
  },
  {
    name: 'Stones Chain',
    steps: [
      { id: 'stones', label: 'Stones', desc: 'Gather stones from clearing plots or stone gathering.', requires: [] },
      { id: 'rocks', label: 'Rocks', desc: 'Rocks require a pickaxe to gather effectively.', requires: ['stones'] },
    ],
  },
  {
    name: 'Seeds Chain',
    steps: [
      { id: 'seeds', label: 'Seeds', desc: 'Seeds come from clearing plots or seed gathering.', requires: [] },
      { id: 'grains', label: 'Grains', desc: 'Seeds must be planted in cleared plots to turn into grain.', requires: ['seeds'] },
      { id: 'food', label: 'Food', desc: 'Grains can be turned into food at a cooking fire.', requires: ['grains'] },
    ],
  },
  {
    name: 'Grass Chain',
    steps: [
      { id: 'grass', label: 'Grass', desc: 'Gather grass from clearing plots or grass gathering.', requires: [] },
      { id: 'rope', label: 'Rope', desc: 'Craft rope from gathered grass.', requires: ['grass'] },
    ],
  },
  {
    name: 'Basket Chain',
    steps: [
      { id: 'basket', label: 'Basket', desc: 'Basket is made of sticks.', requires: [] },
      { id: 'wheelbarrow', label: 'Wheelbarrow', desc: 'Upgrade from basket to wheelbarrow for better carrying.', requires: ['basket'] },
    ],
  },
  {
    name: 'Axe Chain',
    steps: [
      { id: 'handmade_axe', label: 'Handmade Axe', desc: 'Early axe used before the full axe upgrade.', requires: [] },
      { id: 'axe', label: 'Axe', desc: 'Upgraded axe improves wood gathering.', requires: ['handmade_axe'] },
    ],
  },
  {
    name: 'Pickaxe Chain',
    steps: [
      { id: 'handmade_pickaxe', label: 'Handmade Pickaxe', desc: 'Early pickaxe used before the full pickaxe upgrade.', requires: [] },
      { id: 'pickaxe', label: 'Pickaxe', desc: 'Upgraded pickaxe improves rock gathering.', requires: ['handmade_pickaxe'] },
    ],
  },
  {
    name: 'Fire Chain',
    steps: [
      { id: 'handmade_fire', label: 'Handmade Fire', desc: '8 stones + 4 sticks. Keeps you warm.', requires: [] },
      { id: 'cooking_fire', label: 'Cooking Fire', desc: '8 rocks + 4 wood. Gives ability to cook.', requires: ['handmade_fire'] },
    ],
  },
  {
    name: 'Well Chain',
    steps: [
      { id: 'well', label: 'Well', desc: 'Build a well with 10 rocks to auto-water plots and speed growth.', requires: [] },
    ],
  },
  {
    name: 'Sleeping Chain',
    steps: [
      { id: 'handmade_sleeping_spot', label: 'Handmade Sleeping Spot', desc: '10 grass. Sleeping here gives +1 next-day energy.', requires: [] },
      { id: 'handmade_bed', label: 'Handmade Bed', desc: '10 wood + 4 rope + 10 cloth. Sleeping here gives +7 next-day energy.', requires: ['handmade_sleeping_spot'] },
    ],
  },
  {
    name: 'Shelter Chain',
    steps: [
      { id: 'lean_to', label: 'Lean-to', desc: 'Build your first shelter with 30 wood.', requires: [] },
      { id: 'cottage', label: 'Cottage', desc: 'Upgrade shelter with 80 wood and 30 gold.', requires: ['lean_to'] },
    ],
  },
  {
    name: 'Market Chain',
    steps: [
      { id: 'market_stall', label: 'Market Stall', desc: 'Unlock and build your first market stall.', requires: [] },
      { id: 'stall_listing', label: 'Post Listings', desc: 'List goods from your storage for travelers.', requires: ['market_stall'] },
      { id: 'traveler_trade', label: 'Complete Trades', desc: 'Sell listed goods or buy from travelers.', requires: ['stall_listing'] },
    ],
  },
  {
    name: 'Future Additions',
    steps: [
      { id: 'future', label: 'More chains coming...', desc: 'This table is designed to expand as new systems are added to the game.', requires: [] },
    ],
  },
];

function getAdvancementRoadmap() {
  const readyCount = readyPlotsCount();
  const doneByStepId = {
    cleared_plots: () => state.clearedPlots > 0,
    planted_plots: () => state.plantedPlots.length > 0 || state.grain > 0,
    ready_plots: () => readyCount > 0 || state.grain >= 5,
    harvest_grain: () => state.grain >= 5,
    sticks: () => state.sticks > 0,
    wood: () => state.wood >= 20,
    stones: () => state.stones > 0,
    rocks: () => state.rocks > 0 || state.hasCookfire,
    seeds: () => state.seeds > 2 || state.grain > 0,
    grains: () => state.grain > 0,
    food: () => state.food > 16,
    grass: () => state.grass > 0,
    rope: () => state.rope > 0,
    basket: () => state.hasBasket,
    wheelbarrow: () => state.hasWheelbarrow,
    handmade_axe: () => state.hasHandmadeAxe || state.hasAxe,
    axe: () => state.hasAxe,
    handmade_pickaxe: () => state.hasHandmadePickaxe || state.hasPickaxe,
    pickaxe: () => state.hasPickaxe,
    handmade_fire: () => state.hasHandmadeFire || state.hasCookfire,
    cooking_fire: () => state.hasCookfire,
    well: () => state.hasWell,
    handmade_sleeping_spot: () => state.hasSleepingSpot || state.hasHandmadeBed,
    handmade_bed: () => state.hasHandmadeBed,
    lean_to: () => state.shelterLevel >= 1,
    cottage: () => state.shelterLevel >= 2,
    market_stall: () => state.hasMarketStall,
    stall_listing: () => state.stallListings.length > 0,
    traveler_trade: () => state.gold > 0 || state.reputation > 0,
    future: () => false,
  };

  const completionMap = {};
  advancementChains.forEach((chain) => {
    chain.steps.forEach((step) => {
      completionMap[step.id] = doneByStepId[step.id] ? doneByStepId[step.id]() : false;
    });
  });

  const evaluatedRoadmap = advancementChains.map((chain) => {
    return {
      ...chain,
      steps: chain.steps.map((step) => {
        const done = completionMap[step.id];
        const available = !done && step.requires.every((requiredId) => completionMap[requiredId]);
        const status = done ? 'done' : available ? 'available' : 'locked';
        return { ...step, done, available, status };
      }),
    };
  });

  const nextObjective = evaluatedRoadmap.flatMap((chain) => chain.steps).find((step) => step.available && !step.done);

  return { evaluatedRoadmap, nextObjective };
}

function totalAdults() {
  return state.townsfolk.length;
}

function childCapacity() {
  return Math.max(state.cottagesCount - 1, 0);
}

function adultCapacity() {
  return Math.max(state.cottagesCount - 1, 0) * 2;
}

function randomRole() {
  return TOWN_ROLES[randInt(0, TOWN_ROLES.length - 1)];
}

function addAdult(role, logs, sourceText, preferredCottageId = null) {
  if (totalAdults() >= adultCapacity()) return false;
  const chosen = role || randomRole();
  const adultNamePool = ['Jack', 'Sherrl', 'Bob', 'Leon', 'Mara', 'Tobin', 'Ivy', 'Hale', 'Nora', 'Rook', 'Kira', 'Dale'];
  const name = adultNamePool[randInt(0, adultNamePool.length - 1)];

  const availableCottages = Array.from({ length: state.cottagesCount }, (_, idx) => idx + 1).filter((id) => id > 1);
  const targetCottage = (preferredCottageId && availableCottages.includes(preferredCottageId))
    ? preferredCottageId
    : availableCottages.find((id) => state.townsfolk.filter((person) => person.cottageId === id).length < 2);

  if (!targetCottage) return false;

  state.townsfolk.push({ name, role: chosen, cottageId: targetCottage });
  logs.push(`${sourceText} ${name} the ${chosen.toLowerCase()} moved into Cottage ${targetCottage}.`);
  return true;
}

function maybeTownRequests(logs) {
  if (state.townsfolk.length === 0 || Math.random() >= 0.25) return;
  const askBandage = Math.random() < 0.45;
  if (askBandage) {
    if (state.bandages > 0) {
      state.bandages = clamp(state.bandages - 1, 0, 9999);
      state.reputation = clamp(state.reputation + 1, -20, 20);
      logs.push('A family asked for a bandage; you shared one (+1 reputation).');
    } else {
      state.reputation = clamp(state.reputation - 1, -20, 20);
      logs.push('A family asked for a bandage, but you had none (-1 reputation).');
    }
  } else if (state.food >= 2) {
    state.food = clamp(state.food - 2, 0, 9999);
    state.reputation = clamp(state.reputation + 1, -20, 20);
    logs.push('A family asked for food; you shared 2 food (+1 reputation).');
  } else {
    state.reputation = clamp(state.reputation - 1, -20, 20);
    logs.push('A family asked for food, but stores were empty (-1 reputation).');
  }
}

function resolveTownLife(logs) {
  if (adultCapacity() <= 0 && childCapacity() <= 0) {
    state.population = 1 + (state.hasLifePartner ? 1 : 0);
    return;
  }

  if (totalAdults() < adultCapacity() && Math.random() < 0.45) {
    addAdult(null, logs, 'New settlers arrived.');
  }

  const roleGains = { Builder: 0, Hunter: 0, Lumberjack: 0, Miner: 0, Farmer: 0, Trader: 0 };

  state.townsfolk.forEach((person) => {
    const bonus = state.roleBonuses[person.role] || 0;
    const gain = randInt(1, 3) + (Math.random() < 0.35 ? bonus : 0);
    roleGains[person.role] += gain;

    if (person.role === 'Builder') {
      if (state.activeBuilds.length) {
        const target = state.activeBuilds[randInt(0, state.activeBuilds.length - 1)];
        target.daysRemaining = clamp(target.daysRemaining - 1, 0, 99);
      }
      if (state.toolDulled && Math.random() < 0.5) state.toolDulled = false;
    }

    if (person.role === 'Farmer') {
      const growing = state.plantedPlots.filter((plot) => plot.daysUntilHarvest > 0);
      if (growing.length) {
        const pick = growing[randInt(0, growing.length - 1)];
        pick.daysUntilHarvest = clamp(pick.daysUntilHarvest - 1, 0, 99);
      }
      const ready = state.plantedPlots.filter((plot) => plot.daysUntilHarvest === 0);
      if (ready.length) {
        state.plantedPlots = state.plantedPlots.filter((plot) => plot.daysUntilHarvest > 0);
        state.grain = clamp(state.grain + 5, 0, 9999);
        state.seeds = clamp(state.seeds + 1, 0, 9999);
      }
    }

    if (person.role === 'Trader') {
      state.tools = clamp(state.tools + randInt(0, 1), 0, 9999);
      state.fences = clamp(state.fences + randInt(0, 1), 0, 9999);
      if (Math.random() < 0.2) {
        const upRole = TOWN_ROLES[randInt(0, TOWN_ROLES.length - 1)];
        state.roleBonuses[upRole] = clamp((state.roleBonuses[upRole] || 0) + 1, 0, 3);
        logs.push(`A trader found upgrades for your ${upRole.toLowerCase()}s.`);
      }
    }
  });

  if (roleGains.Hunter) {
    state.food = clamp(state.food + roleGains.Hunter, 0, 9999);
    state.fur = clamp(state.fur + Math.ceil(roleGains.Hunter / 2), 0, 9999);
  }
  if (roleGains.Lumberjack) state.wood = clamp(state.wood + roleGains.Lumberjack, 0, 9999);
  if (roleGains.Miner) state.rocks = clamp(state.rocks + roleGains.Miner, 0, 9999);

  const childGather = state.children.reduce((sum) => sum + randInt(1, 2), 0);
  if (childGather > 0) {
    state.sticks = clamp(state.sticks + childGather, 0, 9999);
    state.stones = clamp(state.stones + childGather, 0, 9999);
    logs.push(`Children gathered +${childGather} sticks and +${childGather} stones.`);
  }

  logs.push(`Townsfolk help: builders ${roleGains.Builder}, hunters ${roleGains.Hunter}, lumberjacks ${roleGains.Lumberjack}, miners ${roleGains.Miner}, farmers ${roleGains.Farmer}, traders ${roleGains.Trader}.`);

  if (state.children.length < childCapacity() && totalAdults() >= 2 && Math.random() < 0.03) {
    const childCottage = state.cottagesCount > 0 ? randInt(1, state.cottagesCount) : 1;
    state.children.push({ name: `Child ${Date.now().toString().slice(-3)}`, daysToAdult: DAYS_PER_SEASON, cottageId: childCottage });
    logs.push('A child was born in town. They will grow up in one season.');
  }

  const remainingChildren = [];
  state.children.forEach((child) => {
    child.daysToAdult = clamp(child.daysToAdult - 1, 0, DAYS_PER_SEASON);
    if (child.daysToAdult > 0) {
      remainingChildren.push(child);
      return;
    }

    if (totalAdults() < adultCapacity()) {
      addAdult(null, logs, 'A child grew into an adult and stayed in town.', child.cottageId);
      return;
    }

    if (Math.random() < 0.1 && state.townsfolk.length >= 2) {
      state.townsfolk.pop();
      state.townsfolk.pop();
      logs.push('No cottage space was available; an entire family left town.');
    } else {
      logs.push('A grown child left town due to no free cottage space.');
    }
  });
  state.children = remainingChildren;

  maybeTownRequests(logs);
  state.population = 1 + (state.hasLifePartner ? 1 : 0) + state.townsfolk.length + state.children.length;
}

function createTravelerOffers() {
  const goods = [
    { item: 'seeds', qty: randInt(3, 8), goldPrice: randInt(3, 8) },
    { item: 'cloth', qty: randInt(1, 4), goldPrice: randInt(8, 16) },
    { item: 'tools', qty: 1, goldPrice: randInt(14, 24) },
    { item: 'fences', qty: randInt(2, 7), goldPrice: randInt(5, 12) },
    { item: 'food', qty: randInt(4, 10), goldPrice: randInt(5, 12) },
  ];
  const count = randInt(1, 3);
  return Array.from({ length: count }).map(() => {
    const pick = goods[randInt(0, goods.length - 1)];
    return {
      id: `${Date.now()}-${Math.random()}`,
      item: pick.item,
      qty: pick.qty,
      goldPrice: pick.goldPrice,
      chatOpen: false,
      haggleDenies: 0,
      traderMessage: 'Interested? Buy now, or try to haggle with me.',
      demand: null,
    };
  });
}

const TRADE_VALUES = {
  gold: 1,
  wood: 1,
  sticks: 0.5,
  stones: 0.6,
  grass: 0.4,
  grain: 0.8,
  food: 1.2,
  seeds: 1,
  rope: 2,
  cloth: 4,
  fur: 2,
  fences: 3,
  tools: 10,
  bandages: 2,
};

function travelerCounterDemand(offer) {
  const preferred = ['wood', 'grain', 'food', 'sticks', 'stones'];
  const valueTarget = Math.max(1, Math.ceil(offer.goldPrice * 0.8));
  const availablePick = preferred.find((key) => state[key] > 0) || 'wood';
  const perUnit = TRADE_VALUES[availablePick] || 1;
  const qty = clamp(Math.ceil(valueTarget / perUnit), 1, 30);
  return { item: availablePick, qty };
}

function closeTravelerChatExcept(offerId) {
  state.travelerOffers = state.travelerOffers.map((entry) => ({
    ...entry,
    chatOpen: entry.id === offerId,
  }));
}

function getCottageRoster(cottageId) {
  const roster = [];
  if (cottageId === 1) {
    roster.push({ name: 'You', role: 'Founder' });
    if (state.hasLifePartner) roster.push({ name: 'Life Partner', role: 'Partner' });
  }
  state.townsfolk.filter((person) => person.cottageId === cottageId).forEach((person) => roster.push({ name: person.name || 'Resident', role: person.role }));
  state.children.filter((child) => child.cottageId === cottageId).forEach((child, index) => roster.push({ name: child.name || `Child ${index + 1}`, role: 'Child' }));
  return roster;
}

function startBuild(type, logs) {
  const project = BUILDING_PROJECTS[type];
  const gate = canDoAction({ energyCost: project.energyCost });
  if (!gate.allowed) return false;
  if (hasActiveBuild(type)) return false;
  if (!hasResources(project.resources)) return false;
  spendCosts({ energyCost: project.energyCost });
  spendResources(project.resources);
  state.activeBuilds.push({ type, daysRemaining: project.days, label: project.label });
  logs.push(`${project.label} construction started (${project.days} days).`);
  return true;
}

function applyAction(action) {
  if (state.gameOver && !['newSettlement', 'openAdvancementPage', 'openMainPage', 'openTownMap'].includes(action)) return;

  const logs = [];
  if (action === 'openAdvancementPage') {
    state.activePage = 'advancement';
    render();
    return;
  }

  if (action === 'openMainPage') {
    state.activePage = 'main';
    render();
    return;
  }

  if (action === 'openTownMap') {
    state.activePage = 'townMap';
    if (!state.selectedCottageId && state.cottagesCount > 0) state.selectedCottageId = 1;
    render();
    return;
  }

  if (action.startsWith('selectCottage:')) {
    const cottageId = Number(action.replace('selectCottage:', ''));
    if (!Number.isNaN(cottageId)) state.selectedCottageId = cottageId;
    render();
    return;
  }

  if (action.startsWith('selectAdvancementNode:')) {
    state.selectedAdvancementNode = action.replace('selectAdvancementNode:', '');
    render();
    return;
  }

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
    if (!offer) return;
    closeTravelerChatExcept(offerId);
    state.travelerOffers = state.travelerOffers.map((entry) => {
      if (entry.id !== offerId) return entry;
      return { ...entry, chatOpen: true, traderMessage: 'Talk to me. You can offer gold, ask for trade, or accept what I demand.', demand: entry.demand || null };
    });
  }

  if (action.startsWith('askTradeTraveler:')) {
    const offerId = action.replace('askTradeTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer) return;

    state.travelerOffers = state.travelerOffers.map((entry) => {
      if (entry.id !== offerId) return entry;
      if (Math.random() < 0.5) {
        return { ...entry, traderMessage: 'Maybe. What do you have to offer for this?', demand: null, chatOpen: true };
      }
      const demand = travelerCounterDemand(entry);
      return { ...entry, traderMessage: `I will trade if you give me ${demand.qty} ${itemLabel(demand.item)} for it.`, demand, chatOpen: true };
    });
  }

  if (action.startsWith('haggleGoldTraveler:')) {
    const offerId = action.replace('haggleGoldTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer) return;
    const input = document.getElementById(`haggle-gold-${offerId}`);
    const offerGold = clamp(Number(input?.value) || 0, 0, 9999);
    if (offerGold <= 0) return;

    const minAccept = Math.max(1, Math.ceil(offer.goldPrice * 0.8));
    if (offerGold >= minAccept && state.gold >= offerGold) {
      state.gold = clamp(state.gold - offerGold, 0, 9999);
      state[offer.item] = clamp(state[offer.item] + offer.qty, 0, 9999);
      state.travelerOffers = state.travelerOffers.filter((entry) => entry.id !== offerId);
      logs.push(`You haggled and bought ${offer.qty} ${itemLabel(offer.item)} for ${offerGold} gold.`);
    } else {
      let repLoss = false;
      state.travelerOffers = state.travelerOffers.map((entry) => {
        if (entry.id !== offerId) return entry;
        const denies = entry.haggleDenies + 1;
        const tooLow = offerGold < Math.ceil(offer.goldPrice * 0.5);
        if (tooLow) repLoss = true;
        if (denies >= 2) {
          const demand = travelerCounterDemand(entry);
          return { ...entry, haggleDenies: denies, demand, chatOpen: true, traderMessage: `No more low offers. I will take ${demand.qty} ${itemLabel(demand.item)} or full price.` };
        }
        return { ...entry, haggleDenies: denies, chatOpen: true, traderMessage: `No. That is too low (${denies}/2).` };
      });
      if (repLoss) {
        state.reputation = clamp(state.reputation - 1, -20, 20);
        logs.push('Your offer was far too low. Reputation -1.');
      }
    }
  }

  if (action.startsWith('proposeTradeTraveler:')) {
    const offerId = action.replace('proposeTradeTraveler:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer) return;
    const itemInput = document.getElementById(`haggle-item-${offerId}`);
    const qtyInput = document.getElementById(`haggle-qty-${offerId}`);
    const tradeItem = itemInput?.value;
    const tradeQty = clamp(Number(qtyInput?.value) || 0, 0, 9999);
    if (!tradeItem || tradeQty <= 0 || state[tradeItem] < tradeQty) return;

    const askedValue = (TRADE_VALUES.gold || 1) * offer.goldPrice;
    const offeredValue = (TRADE_VALUES[tradeItem] || 1) * tradeQty;

    if (offeredValue >= askedValue * 0.75) {
      state[tradeItem] = clamp(state[tradeItem] - tradeQty, 0, 9999);
      state[offer.item] = clamp(state[offer.item] + offer.qty, 0, 9999);
      state.travelerOffers = state.travelerOffers.filter((entry) => entry.id !== offerId);
      logs.push(`Trade approved: ${tradeQty} ${itemLabel(tradeItem)} for ${offer.qty} ${itemLabel(offer.item)}.`);
    } else {
      let repLoss = false
      state.travelerOffers = state.travelerOffers.map((entry) => {
        if (entry.id !== offerId) return entry;
        const denies = entry.haggleDenies + 1;
        const tooLow = offeredValue < askedValue * 0.5;
        if (tooLow) repLoss = true;
        if (denies >= 2) {
          const demand = travelerCounterDemand(entry);
          return { ...entry, haggleDenies: denies, demand, chatOpen: true, traderMessage: `No. I will only take ${demand.qty} ${itemLabel(demand.item)} now.` };
        }
        return { ...entry, haggleDenies: denies, chatOpen: true, traderMessage: `No deal (${denies}/2). Offer more.` };
      });
      if (repLoss) {
        state.reputation = clamp(state.reputation - 1, -20, 20);
        logs.push('That trade offer offended the traveler. Reputation -1.');
      }
    }
  }

  if (action.startsWith('acceptTravelerDemand:')) {
    const offerId = action.replace('acceptTravelerDemand:', '');
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer || !offer.demand) return;
    if (state[offer.demand.item] < offer.demand.qty) return;
    state[offer.demand.item] = clamp(state[offer.demand.item] - offer.demand.qty, 0, 9999);
    state[offer.item] = clamp(state[offer.item] + offer.qty, 0, 9999);
    state.travelerOffers = state.travelerOffers.filter((entry) => entry.id !== offerId);
    logs.push(`You accepted the traveler's demand: ${offer.demand.qty} ${itemLabel(offer.demand.item)} for ${offer.qty} ${itemLabel(offer.item)}.`);
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
    const gate = canDoAction({ energyCost: 3 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 3 });
    state.clearedPlots += 1;
    const foundSeeds = randInt(0, 2);
    const foundSticks = randInt(1, 3);
    const foundStones = randInt(1, 2);
    const foundGrass = randInt(1, 3);
    state.seeds = clamp(state.seeds + foundSeeds, 0, 9999);
    state.sticks = clamp(state.sticks + foundSticks, 0, 9999);
    state.stones = clamp(state.stones + foundStones, 0, 9999);
    state.grass = clamp(state.grass + foundGrass, 0, 9999);
    logs.push(`You cleared one new plot of land (+${foundSeeds} seeds, +${foundSticks} sticks, +${foundStones} stones, +${foundGrass} grass).`);
  }

  if (action === 'gatherSticks') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 1 });
    const found = randInt(2, 5);
    state.sticks = clamp(state.sticks + found, 0, 9999);
    logs.push(`You gathered +${found} sticks.`);
  }

  if (action === 'gatherStones') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 1 });
    const found = randInt(2, 5);
    state.stones = clamp(state.stones + found, 0, 9999);
    logs.push(`You gathered +${found} stones.`);
  }

  if (action === 'gatherGrass') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 1 });
    const found = randInt(3, 7);
    state.grass = clamp(state.grass + found, 0, 9999);
    logs.push(`You gathered +${found} grass.`);
  }

  if (action === 'gatherSeeds') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 1 });
    const found = randInt(1, 3);
    state.seeds = clamp(state.seeds + found, 0, 9999);
    logs.push(`You gathered +${found} wild seeds.`);
  }

  if (action === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || freePlots() <= 0 || state.seeds < 1) return;
    spendCosts({ energyCost: 2 });
    state.seeds -= 1;
    state.plantedPlots.push({ daysUntilHarvest: plantingDaysUntilHarvest() });
    logs.push('You planted crops on one cleared plot.');
  }

  if (action === 'harvest') {
    const gate = canDoAction({ energyCost: 2 });
    const readyCount = readyPlotsCount();
    if (!gate.allowed || readyCount <= 0) return;
    spendCosts({ energyCost: 2 });
    const harvested = state.plantedPlots.filter((p) => p.daysUntilHarvest === 0).length;
    state.plantedPlots = state.plantedPlots.filter((p) => p.daysUntilHarvest > 0);
    state.grain += harvested * 5;
    state.seeds += harvested;
    logs.push(`Harvested ${harvested} ready plot(s) for ${harvested * 5} grain and ${harvested} seeds.`);
  }

  if (action === 'chopWood') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || (!state.hasHandmadeAxe && !state.hasAxe)) return;
    spendCosts({ energyCost: 2 });
    let yieldWood = state.hasAxe ? randInt(5, 7) : randInt(2, 4);
    if (state.toolDulled) {
      yieldWood = Math.max(0, yieldWood - 2);
      logs.push('Your axe edge is slightly damaged, so wood yield is reduced. Rest to sharpen it.');
    } else {
      yieldWood = Math.max(2, yieldWood);
    }
    state.wood += yieldWood;
    logs.push(`You chopped wood and gained +${yieldWood} wood.`);
  }

  if (action === 'craftBasket') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasBasket || state.sticks < 6) return;
    spendCosts({ energyCost: 1 });
    state.sticks = clamp(state.sticks - 6, 0, 9999);
    state.hasBasket = true;
    logs.push('You wove a gathering basket (-6 sticks).');
  }

  if (action === 'sharpenSpear') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.spearUses > 0 || state.sticks < 2 || state.stones < 1) return;
    spendCosts({ energyCost: 1 });
    state.sticks = clamp(state.sticks - 2, 0, 9999);
    state.stones = clamp(state.stones - 1, 0, 9999);
    state.hasSharpSpear = true;
    state.spearUses = 3;
    logs.push('You crafted a spear from sticks and stones (-2 sticks, -1 stone). It has 3 hunting uses.');
  }

  if (action === 'gatherForage') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || (!state.hasBasket && !state.hasWheelbarrow)) return;
    spendCosts({ energyCost: 1 });
    const foundFood = state.hasWheelbarrow ? randInt(3, 6) : randInt(2, 4);
    state.food = clamp(state.food + foundFood, 0, 9999);
    const foundSeeds = randInt(0, 2);
    state.seeds = clamp(state.seeds + foundSeeds, 0, 9999);
    logs.push(`You gathered wild plants (+${foundFood} food, +${foundSeeds} seeds).`);
  }

  if (action === 'huntWildGame') {
    const gate = canDoAction({ energyCost: 3 });
    if (!gate.allowed || (state.spearUses <= 0 && !state.hasKnife)) return;
    spendCosts({ energyCost: 3 });

    const usingKnife = state.hasKnife;
    if (!usingKnife && state.spearUses > 0) {
      state.spearUses = clamp(state.spearUses - 1, 0, 3);
      state.hasSharpSpear = state.spearUses > 0;
      if (state.spearUses === 0) logs.push('Your spear broke after this hunt.');
    }

    const successChance = usingKnife ? 0.8 : 0.65;
    if (Math.random() < successChance) {
      const meat = usingKnife ? randInt(6, 11) : randInt(5, 9);
      const furYield = usingKnife ? randInt(2, 3) : randInt(1, 2);
      state.food = clamp(state.food + meat, 0, 9999);
      state.fur = clamp(state.fur + furYield, 0, 9999);
      logs.push(`Your hunt succeeded with your ${usingKnife ? 'knife' : 'spear'} (+${meat} food, +${furYield} fur).`);
    } else if (Math.random() < 0.5) {
      if (state.bandages >= 1) {
        state.bandages = clamp(state.bandages - 1, 0, 9999);
        logs.push('The hunt failed and you were cut, but used 1 bandage.');
      } else {
        state.health = clamp(state.health - 1, 0, 10);
        logs.push('The hunt failed and you were hurt (-1 health). No bandages left.');
      }
    } else {
      logs.push('The hunt failed and you came back empty-handed.');
    }
  }


  if (action === 'craftRope') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.grass < 4) return;
    spendCosts({ energyCost: 1 });
    state.grass = clamp(state.grass - 4, 0, 9999);
    state.rope = clamp(state.rope + 1, 0, 9999);
    logs.push('You crafted 1 rope from 4 grass.');
  }

  if (action === 'craftWheelbarrow') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || !state.hasBasket || state.hasWheelbarrow || state.wood < 8 || state.rope < 2) return;
    spendCosts({ energyCost: 2 });
    state.wood = clamp(state.wood - 8, 0, 9999);
    state.rope = clamp(state.rope - 2, 0, 9999);
    state.hasWheelbarrow = true;
    logs.push('You built a wheelbarrow (-8 wood, -2 rope).');
  }

  if (action === 'craftHandmadeAxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasHandmadeAxe || state.hasAxe || state.sticks < 3 || state.stones < 2) return;
    spendCosts({ energyCost: 1 });
    state.sticks = clamp(state.sticks - 3, 0, 9999);
    state.stones = clamp(state.stones - 2, 0, 9999);
    state.hasHandmadeAxe = true;
    logs.push('You crafted a handmade axe (-3 sticks, -2 stones).');
  }

  if (action === 'craftAxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || !state.hasHandmadeAxe || state.hasAxe || state.wood < 6 || state.rope < 1) return;
    spendCosts({ energyCost: 1 });
    state.wood = clamp(state.wood - 6, 0, 9999);
    state.rope = clamp(state.rope - 1, 0, 9999);
    state.hasAxe = true;
    logs.push('You upgraded to a proper axe (-6 wood, -1 rope).');
  }

  if (action === 'craftHandmadePickaxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasHandmadePickaxe || state.hasPickaxe || state.sticks < 3 || state.stones < 2) return;
    spendCosts({ energyCost: 1 });
    state.sticks = clamp(state.sticks - 3, 0, 9999);
    state.stones = clamp(state.stones - 2, 0, 9999);
    state.hasHandmadePickaxe = true;
    logs.push('You crafted a handmade pickaxe (-3 sticks, -2 stones).');
  }

  if (action === 'craftPickaxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || !state.hasHandmadePickaxe || state.hasPickaxe || state.wood < 6 || state.rope < 1) return;
    spendCosts({ energyCost: 1 });
    state.wood = clamp(state.wood - 6, 0, 9999);
    state.rope = clamp(state.rope - 1, 0, 9999);
    state.hasPickaxe = true;
    logs.push('You upgraded to a proper pickaxe (-6 wood, -1 rope).');
  }

  if (action === 'gatherRocks') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || (!state.hasHandmadePickaxe && !state.hasPickaxe)) return;
    spendCosts({ energyCost: 2 });
    const found = state.hasPickaxe ? randInt(2, 4) : randInt(1, 3);
    state.rocks = clamp(state.rocks + found, 0, 9999);
    logs.push(`You gathered +${found} rocks with your ${state.hasPickaxe ? 'pickaxe' : 'handmade pickaxe'}.`);
  }

  if (action === 'crackStonesToRocks') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || (!state.hasHandmadePickaxe && !state.hasPickaxe) || state.stones < 2) return;
    spendCosts({ energyCost: 1 });
    state.stones = clamp(state.stones - 2, 0, 9999);
    state.rocks = clamp(state.rocks + 1, 0, 9999);
    logs.push('You cracked 2 stones into 1 rock.');
  }

  if (action === 'buildHandmadeFire') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasHandmadeFire || state.hasCookfire || state.stones < 8 || state.sticks < 4) return;
    spendCosts({ energyCost: 1 });
    state.stones = clamp(state.stones - 8, 0, 9999);
    state.sticks = clamp(state.sticks - 4, 0, 9999);
    state.hasHandmadeFire = true;
    state.warmth = clamp(state.warmth + 2, 0, 10);
    logs.push('You built a handmade fire (-8 stones, -4 sticks).');
  }

  if (action === 'buildSleepingSpot') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasSleepingSpot || state.hasHandmadeBed || state.grass < 10) return;
    spendCosts({ energyCost: 1 });
    state.grass = clamp(state.grass - 10, 0, 9999);
    state.hasSleepingSpot = true;
    logs.push('You made a handmade sleeping spot (-10 grass).');
  }

  if (action === 'buildHandmadeBed') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || !state.hasSleepingSpot || state.hasHandmadeBed || state.wood < 10 || state.rope < 4 || state.cloth < 10) return;
    spendCosts({ energyCost: 2 });
    state.wood = clamp(state.wood - 10, 0, 9999);
    state.rope = clamp(state.rope - 4, 0, 9999);
    state.cloth = clamp(state.cloth - 10, 0, 9999);
    state.hasHandmadeBed = true;
    logs.push('You built a handmade bed (-10 wood, -4 rope, -10 cloth).');
  }

  if (action === 'craftKnife') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || !state.hasSharpSpear || state.hasKnife || state.stones < 2) return;
    spendCosts({ energyCost: 1 });
    state.stones = clamp(state.stones - 2, 0, 9999);
    state.hasKnife = true;
    logs.push('You carved a knife from your spear path (-2 stones).');
  }

  if (action === 'tanFurToCloth') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.fur < 2) return;
    spendCosts({ energyCost: 1 });
    state.fur = clamp(state.fur - 2, 0, 9999);
    state.cloth = clamp(state.cloth + 1, 0, 9999);
    logs.push('You processed 2 fur into 1 cloth.');
  }

  if (action === 'craftBandages') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.cloth < 1) return;
    spendCosts({ energyCost: 1 });
    state.cloth = clamp(state.cloth - 1, 0, 9999);
    state.bandages = clamp(state.bandages + 2, 0, 9999);
    logs.push('You crafted 2 bandages from 1 cloth.');
  }

  if (action === 'craftFurArmor') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed || state.hasFurArmor || state.cloth < 1 || state.fur < 2) return;
    spendCosts({ energyCost: 2 });
    state.cloth = clamp(state.cloth - 1, 0, 9999);
    state.fur = clamp(state.fur - 2, 0, 9999);
    state.hasFurArmor = true;
    state.armorWarmthBuff = 1;
    state.warmth = clamp(state.warmth + 2, 0, 10);
    logs.push('You stitched fur armor (+2 warmth now, +1 warmth each day).');
  }

  if (action === 'healWithBandage') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.bandages < 1 || state.health >= 10) return;
    spendCosts({ energyCost: 1 });
    state.bandages = clamp(state.bandages - 1, 0, 9999);
    state.health = clamp(state.health + 1, 0, 10);
    logs.push('You used 1 bandage and recovered +1 health.');
  }

  if (action === 'buildCookfire') {
    if (state.hasCookfire || !state.hasHandmadeFire) return;
    startBuild('cookfire', logs);
  }

  if (action === 'buildWell') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || state.hasWell || state.rocks < 10) return;
    spendCosts({ energyCost: 1 });
    state.rocks = clamp(state.rocks - 10, 0, 9999);
    state.hasWell = true;
    logs.push('You built a well (-10 rocks). Your plots will now auto-water and grow faster.');
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
    if (state.shelterLevel < 1) return;
    startBuild('cottage', logs);
  }

  if (action === 'cookMeal') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed || !state.hasCookfire || state.grain < 5) return;
    spendCosts({ energyCost: 1 });
    state.grain = clamp(state.grain - 5, 0, 9999);
    state.food = clamp(state.food + 6, 0, 9999);
    logs.push('You cooked a simple meal.');
  }

  if (action === 'rest') {
    if (state.restedToday) return;
    const gate = canDoAction({ energyCost: 0 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 0 });
    state.restedToday = true;
    const beforeEnergy = state.energy;
    state.energy = clamp(state.energy + 3, 0, state.energyMax);
    const energyRecovered = state.energy - beforeEnergy;
    const repairedTool = state.toolDulled;
    if (repairedTool) state.toolDulled = false;

    if (repairedTool) {
      logs.push(`You rested and recovered +${energyRecovered} energy, and repaired your dulled tools.`);
    } else {
      logs.push(`You rested and recovered +${energyRecovered} energy.`);
    }
  }

  if (action === 'getLifePartner') {
    const gate = canDoAction({ energyCost: 1 });
    const townBuiltUp = state.cottagesCount >= 2 || state.reputation >= 3 || state.townsfolk.length >= 3;
    if (!gate.allowed || state.hasLifePartner || state.cottagesCount < 1 || !townBuiltUp) return;
    spendCosts({ energyCost: 1 });
    state.hasLifePartner = true;
    logs.push('You found a life partner and settled into your family cottage.');
    state.townChronicle.unshift(`Year ${state.year}: You found a life partner.`);
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
    state.dailyChronicle = logs;
    state.chronicleLog.unshift(...logs);
    state.chronicleLog = state.chronicleLog.slice(0, 300);
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
    if (build.type === 'cottage') {
      state.shelterLevel = 2;
      const wasFirstCottage = state.cottagesCount === 0;
      state.cottagesCount = clamp(state.cottagesCount + 1, 0, 9999);
      const newId = state.cottagesCount;
      state.cottages = state.cottages || [];
      state.cottages.push({ id: newId, label: newId === 1 ? 'Your Cottage' : `Cottage ${newId}` });
      if (wasFirstCottage) {
        logs.push('Your first cottage is now your family home.');
      } else {
        addAdult(randomRole(), logs, 'A new cottage opened.');
        addAdult(randomRole(), logs, 'A new cottage opened.');
      }
    }
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
  const carryoverEnergy = Math.max(state.energy - state.bonusEnergyToday, 0);
  const nextDayEnergyBonus = carryoverEnergy > 0 ? 2 : 0;

  const plotGrowthReduction = state.hasWell ? 2 : 1;
  state.plantedPlots.forEach((plot) => {
    plot.daysUntilHarvest = clamp(plot.daysUntilHarvest - plotGrowthReduction, 0, 99);
  });
  if (state.hasWell && state.plantedPlots.length) {
    logs.push('Your well auto-watered the plots; crops matured faster.');
  }

  resolveConstruction(logs);
  resolveStallSales(logs);
  resolveTownLife(logs);

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

  if (state.shelterLevel === 0) {
    const canKeepFire = state.hasHandmadeFire || state.hasCookfire;
    const canFuelWithWood = state.wood >= 2;
    const canFuelWithSticks = state.sticks >= 5;
    if (canKeepFire && (canFuelWithWood || canFuelWithSticks)) {
      if (canFuelWithWood) {
        state.wood = clamp(state.wood - 2, 0, 9999);
        logs.push('You kept your camp fire going with 2 wood.');
      } else {
        state.sticks = clamp(state.sticks - 5, 0, 9999);
        logs.push('You kept your camp fire going with 5 sticks.');
      }
      state.warmth = clamp(state.warmth + 1, 0, 10);
    } else {
      warmthLoss += 2;
      if (!canKeepFire) {
        logs.push('You have no camp fire yet. The night cold bites hard.');
      } else {
        logs.push('No fuel for your camp fire (need 2 wood or 5 sticks). The cold closes in.');
      }
      const attackRoll = Math.random();
      if (attackRoll < 0.7) {
        const baseDamage = attackRoll < 0.2 ? 2 : 1;
        if (state.spearUses > 0) {
          state.spearUses = clamp(state.spearUses - 1, 0, 3);
          state.hasSharpSpear = state.spearUses > 0;
          const defenseRoll = Math.random();

          if (defenseRoll < 0.2) {
            const meat = randInt(2, 4);
            const furYield = randInt(1, 2);
            state.food = clamp(state.food + meat, 0, 9999);
            state.fur = clamp(state.fur + furYield, 0, 9999);
            logs.push(`Wild animals attacked, but your spear defense was perfect (+${meat} food, +${furYield} fur).`);
          } else if (defenseRoll < 0.8) {
            logs.push('Wild animals attacked in the dark, but you fought them off with your spear.');
          } else {
            const reducedDamage = Math.max(1, baseDamage - 1);
            state.health = clamp(state.health - reducedDamage, 0, 10);
            logs.push(`Wild animals attacked; your spear helped, but you were still hurt (-${reducedDamage} health).`);
          }

          if (state.spearUses === 0) logs.push('Your spear broke during the night defense.');
        } else {
          state.health = clamp(state.health - baseDamage, 0, 10);
          logs.push(`Wild animals attacked in the dark (-${baseDamage} health).`);
        }
      } else {
        logs.push('You heard animals nearby, but they stayed away this night.');
      }
    }
  }

  state.warmth = clamp(state.warmth - warmthLoss, 0, 10);
  if (state.armorWarmthBuff > 0) {
    state.warmth = clamp(state.warmth + state.armorWarmthBuff, 0, 10);
    logs.push(`Fur armor retained warmth (+${state.armorWarmthBuff}).`);
  }
  if (state.shelterLevel >= 1) {
    state.warmth = clamp(state.warmth + 2, 0, 10);
    logs.push('Shelter kept heat in (+2 warmth).');
  }
  logs.push(`Warmth changed by -${warmthLoss}.`);

  if (state.hunger >= 7) {
    state.baseEnergyMax = 8;
    state.health = clamp(state.health - 1, 0, 10);
    logs.push('Severe hunger reduced tomorrow energy max and harmed health.');
  } else {
    state.baseEnergyMax = 10;
  }

  state.energyMax = state.baseEnergyMax;

  if (state.warmth <= 2) {
    state.health = clamp(state.health - 1, 0, 10);
    logs.push('Cold conditions harmed health.');
  }

  if (state.shelterLevel >= 2 && wasFed) {
    state.health = clamp(state.health + 1, 0, 10);
    logs.push('The cottage and a full meal restored +1 health.');
  }

  applyDailyEvents(logs);

  const travelerArrivalChance = state.hasMarketStall ? 0.58 : 0.24;
  if (Math.random() < travelerArrivalChance) {
    state.travelerOffers = createTravelerOffers();
    logs.push(state.hasMarketStall ? 'Travelers arrived at your market with goods to buy.' : 'A traveling seller stopped by your camp with a popup sale.');
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

  const sleepEnergyBonus = state.hasHandmadeBed ? 7 : state.hasSleepingSpot ? 1 : 0;

  state.bonusEnergyToday = nextDayEnergyBonus + sleepEnergyBonus;
  if (state.bonusEnergyToday > 0) {
    logs.push(`Sleep bonuses for tomorrow: +${state.bonusEnergyToday} energy.`);
  }

  state.energyMax = state.baseEnergyMax + state.bonusEnergyToday;
  state.energy = state.energyMax;
  state.restedToday = false;

  if (state.health <= 0) {
    state.gameOver = true;
    logs.push('Health has fallen to 0. Your settlement failed. Game over.');
    state.townChronicle.unshift(`Year ${state.year}: The settlement collapsed.`);
  }

  state.dailyChronicle = logs;
  state.chronicleLog.unshift(...logs);
  state.chronicleLog = state.chronicleLog.slice(0, 300);
  state.townChronicle = state.townChronicle.slice(0, 24);

  render();
}

function actionStatus(actionName) {
  if (state.gameOver && !['newSettlement', 'openAdvancementPage', 'openMainPage'].includes(actionName)) return { disabled: true, reason: 'Game over' };

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
    if (!offer) return { disabled: true, reason: 'Offer unavailable' };
    return { disabled: false, reason: '' };
  }

  if (actionName.startsWith('askTradeTraveler:') || actionName.startsWith('haggleGoldTraveler:') || actionName.startsWith('proposeTradeTraveler:') || actionName.startsWith('acceptTravelerDemand:')) {
    const offerId = actionName.split(':')[1];
    const offer = state.travelerOffers.find((entry) => entry.id === offerId);
    if (!offer) return { disabled: true, reason: 'Offer unavailable' };
    if (actionName.startsWith('acceptTravelerDemand:')) {
      if (!offer.demand) return { disabled: true, reason: 'No demand set yet' };
      if (state[offer.demand.item] < offer.demand.qty) return { disabled: true, reason: `Need ${offer.demand.qty} ${itemLabel(offer.demand.item)}` };
    }
    return { disabled: false, reason: '' };
  }

  if (actionName === 'listStallOffer') {
    if (!state.hasMarketStall) return { disabled: true, reason: 'Requires market stall' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'clearLand') {
    const gate = canDoAction({ energyCost: 3 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'gatherSticks' || actionName === 'gatherStones' || actionName === 'gatherGrass' || actionName === 'gatherSeeds') {
    const gate = canDoAction({ energyCost: 1 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (freePlots() <= 0) return { disabled: true, reason: 'No cleared empty plot' };
    if (state.seeds < 1) return { disabled: true, reason: 'Need seeds' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'harvest') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (readyPlotsCount() <= 0) return { disabled: true, reason: 'No ready crops' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'chopWood') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasHandmadeAxe && !state.hasAxe) return { disabled: true, reason: 'Requires handmade axe or axe' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'gatherSticks') {
    const gate = canDoAction({ energyCost: 1 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'gatherStones') {
    const gate = canDoAction({ energyCost: 1 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'gatherSeeds') {
    const gate = canDoAction({ energyCost: 1 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'gatherGrass') {
    const gate = canDoAction({ energyCost: 1 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'gatherRocks') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasHandmadePickaxe && !state.hasPickaxe) return { disabled: true, reason: 'Requires handmade pickaxe or pickaxe' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'crackStonesToRocks') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasHandmadePickaxe && !state.hasPickaxe) return { disabled: true, reason: 'Requires handmade pickaxe or pickaxe' };
    if (state.stones < 2) return { disabled: true, reason: 'Needs 2 stones' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftRope') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.grass < 4) return { disabled: true, reason: 'Needs 4 grass' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftBasket') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasBasket) return { disabled: true, reason: 'Basket ready' };
    if (state.sticks < 6) return { disabled: true, reason: 'Needs 6 sticks' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftWheelbarrow') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasBasket) return { disabled: true, reason: 'Needs Basket first' };
    if (state.hasWheelbarrow) return { disabled: true, reason: 'Wheelbarrow ready' };
    if (state.wood < 8) return { disabled: true, reason: 'Needs 8 wood' };
    if (state.rope < 2) return { disabled: true, reason: 'Needs 2 rope' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'sharpenSpear') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.spearUses > 0) return { disabled: true, reason: `Spear ready (${state.spearUses} uses left)` };
    if (state.sticks < 2) return { disabled: true, reason: 'Needs 2 sticks' };
    if (state.stones < 1) return { disabled: true, reason: 'Needs 1 stone' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftKnife') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasSharpSpear) return { disabled: true, reason: 'Needs Spear first' };
    if (state.hasKnife) return { disabled: true, reason: 'Knife ready' };
    if (state.stones < 2) return { disabled: true, reason: 'Needs 2 stones' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'gatherForage') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasBasket && !state.hasWheelbarrow) return { disabled: true, reason: 'Craft basket first' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'huntWildGame') {
    const gate = canDoAction({ energyCost: 3 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.spearUses <= 0 && !state.hasKnife) return { disabled: true, reason: 'Need spear or knife first' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'tanFurToCloth') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.fur < 2) return { disabled: true, reason: 'Needs 2 fur' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftBandages') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.cloth < 1) return { disabled: true, reason: 'Needs 1 cloth' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftFurArmor') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasFurArmor) return { disabled: true, reason: 'Armor ready' };
    if (state.cloth < 1 || state.fur < 2) return { disabled: true, reason: 'Needs 1 cloth + 2 fur' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'healWithBandage') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.bandages < 1) return { disabled: true, reason: 'Need 1 bandage' };
    if (state.health >= 10) return { disabled: true, reason: 'Health is already full' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftHandmadeAxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasHandmadeAxe || state.hasAxe) return { disabled: true, reason: 'Already crafted' };
    if (state.sticks < 3 || state.stones < 2) return { disabled: true, reason: 'Needs 3 sticks + 2 stones' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftAxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasHandmadeAxe) return { disabled: true, reason: 'Needs handmade axe' };
    if (state.hasAxe) return { disabled: true, reason: 'Axe ready' };
    if (state.wood < 6 || state.rope < 1) return { disabled: true, reason: 'Needs 6 wood + 1 rope' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftHandmadePickaxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasHandmadePickaxe || state.hasPickaxe) return { disabled: true, reason: 'Already crafted' };
    if (state.sticks < 3 || state.stones < 2) return { disabled: true, reason: 'Needs 3 sticks + 2 stones' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'craftPickaxe') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasHandmadePickaxe) return { disabled: true, reason: 'Needs handmade pickaxe' };
    if (state.hasPickaxe) return { disabled: true, reason: 'Pickaxe ready' };
    if (state.wood < 6 || state.rope < 1) return { disabled: true, reason: 'Needs 6 wood + 1 rope' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildHandmadeFire') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasHandmadeFire || state.hasCookfire) return { disabled: true, reason: 'Already built' };
    if (state.stones < 8 || state.sticks < 4) return { disabled: true, reason: 'Needs 8 stones + 4 sticks' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildSleepingSpot') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasSleepingSpot || state.hasHandmadeBed) return { disabled: true, reason: 'Already built' };
    if (state.grass < 10) return { disabled: true, reason: 'Needs 10 grass' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildHandmadeBed') {
    const gate = canDoAction({ energyCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasSleepingSpot) return { disabled: true, reason: 'Needs sleeping spot first' };
    if (state.hasHandmadeBed) return { disabled: true, reason: 'Already built' };
    if (state.wood < 10 || state.rope < 4 || state.cloth < 10) return { disabled: true, reason: 'Needs 10 wood + 4 rope + 10 cloth' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'rest') {
    const gate = canDoAction({ energyCost: 0 });
    if (state.restedToday) return { disabled: true, reason: 'Already rested today' };
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'getLifePartner') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.cottagesCount < 1) return { disabled: true, reason: 'Build your first cottage first' };
    if (state.hasLifePartner) return { disabled: true, reason: 'Life partner already with you' };
    const townBuiltUp = state.cottagesCount >= 2 || state.reputation >= 3 || state.townsfolk.length >= 3;
    if (!townBuiltUp) return { disabled: true, reason: 'Town needs to be more built up' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildLeanTo') {
    const project = BUILDING_PROJECTS.leanTo;
    const gate = canDoAction({ energyCost: project.energyCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.shelterLevel >= 1) return { disabled: true, reason: 'Lean-to already built' };
    if (hasActiveBuild('leanTo')) return { disabled: true, reason: 'Already building' };
    if (state.wood < 30) return { disabled: true, reason: 'Needs 30 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildCottage') {
    const project = BUILDING_PROJECTS.cottage;
    const gate = canDoAction({ energyCost: project.energyCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.shelterLevel < 1) return { disabled: true, reason: 'Requires lean-to first' };
    if (hasActiveBuild('cottage')) return { disabled: true, reason: 'Already building' };
    if (state.wood < 80) return { disabled: true, reason: 'Needs 80 wood' };
    if (state.gold < 30) return { disabled: true, reason: 'Needs 30 gold' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildCookfire') {
    const project = BUILDING_PROJECTS.cookfire;
    const gate = canDoAction({ energyCost: project.energyCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasCookfire) return { disabled: true, reason: 'Cooking fire already built' };
    if (!state.hasHandmadeFire) return { disabled: true, reason: 'Requires handmade fire first' };
    if (hasActiveBuild('cookfire')) return { disabled: true, reason: 'Already building' };
    if (state.rocks < 8) return { disabled: true, reason: 'Needs 8 rocks' };
    if (state.wood < 4) return { disabled: true, reason: 'Needs 4 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildWell') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasWell) return { disabled: true, reason: 'Well already built' };
    if (state.rocks < 10) return { disabled: true, reason: 'Needs 10 rocks' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'cookMeal') {
    const gate = canDoAction({ energyCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasCookfire) return { disabled: true, reason: 'Requires cooking fire' };
    if (state.grain < 5) return { disabled: true, reason: 'Needs 5 grain' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'buildMarketStall') {
    const project = BUILDING_PROJECTS.marketStall;
    const gate = canDoAction({ energyCost: project.energyCost });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasMarketStall) return { disabled: true, reason: 'Market stall already built' };
    if (hasActiveBuild('marketStall')) return { disabled: true, reason: 'Already building' };
    if (state.grain < 20 && state.reputation < 1) return { disabled: true, reason: 'Unlocks at 20 grain or 1 reputation' };
    if (state.wood < 20) return { disabled: true, reason: 'Needs 20 wood' };
    if (state.grain < 10) return { disabled: true, reason: 'Needs 10 grain' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'openAdvancementPage') return { disabled: false, reason: '' };
  if (actionName === 'openMainPage') return { disabled: false, reason: '' };
  if (actionName === 'openTownMap') return { disabled: false, reason: '' };
  if (actionName.startsWith('selectCottage:')) return { disabled: false, reason: '' };
  if (actionName === 'endDay') return { disabled: false, reason: '' };
  if (actionName === 'newSettlement') return { disabled: false, reason: '' };

  return { disabled: false, reason: '' };
}

function isActionDiscovered(actionName) {
  if (actionName === 'chopWood') return state.hasHandmadeAxe || state.hasAxe;
  if (actionName === 'gatherRocks') return state.hasHandmadePickaxe || state.hasPickaxe;
  if (actionName === 'crackStonesToRocks') return state.hasHandmadePickaxe || state.hasPickaxe;
  if (actionName === 'gatherForage') return state.hasBasket || state.hasWheelbarrow;
  if (actionName === 'huntWildGame') return state.spearUses > 0 || state.hasKnife;

  if (actionName === 'craftWheelbarrow') return state.hasBasket;
  if (actionName === 'craftAxe') return state.hasHandmadeAxe;
  if (actionName === 'craftPickaxe') return state.hasHandmadePickaxe;
  if (actionName === 'craftKnife') return state.hasSharpSpear;

  if (actionName === 'buildCookfire') return state.hasHandmadeFire;
  if (actionName === 'cookMeal') return state.hasCookfire;
  if (actionName === 'buildCottage') return state.shelterLevel >= 1;
  if (actionName === 'buildHandmadeBed') return state.hasSleepingSpot;
  if (actionName === 'healWithBandage') return state.bandages > 0 || state.health < 10;
  if (actionName === 'getLifePartner') return state.cottagesCount >= 1;

  return true;
}

function btn(label, actionName, costsText) {
  if (!isActionDiscovered(actionName)) return '';
  const { disabled, reason } = actionStatus(actionName);
  return `<button class="action-btn" data-action="${actionName}" ${disabled ? 'disabled' : ''} title="${reason || ''}">${label}${costsText ? ` (${costsText})` : ''}</button>`;
}

function render() {
  const app = document.getElementById('root');
  const season = getSeason();
  const readyCount = readyPlotsCount();
  const shelterText = state.shelterLevel === 0 ? 'None' : state.shelterLevel === 1 ? 'Lean-to' : 'Cottage';
  const energyCritical = state.energy <= 3;
  const chronicleLogPreview = state.chronicleLog;
  const townChroniclePreview = state.townChronicle.slice(-6);

  const chronicleBuckets = [];
  chronicleLogPreview.forEach((line) => {
    if (line.startsWith('End of Day ')) {
      chronicleBuckets.push({ title: line.replace(':', ''), entries: [] });
      return;
    }

    if (!chronicleBuckets.length) {
      chronicleBuckets.push({ title: 'Recent Activity', entries: [] });
    }

    chronicleBuckets[chronicleBuckets.length - 1].entries.push(line);
  });

  const chronicleToneClass = (line) => {
    const text = line.toLowerCase();
    if (['failed', 'game over', 'harmed', 'attacked', 'shortage', 'cold', 'bites hard', 'no fuel', 'disappointed', 'hurt'].some((term) => text.includes(term))) return 'chronicle-bad';
    if (['recovered', 'restored', 'gained', 'met', 'reduced', 'kept', 'arrived', '+'].some((term) => text.includes(term))) return 'chronicle-good';
    return 'chronicle-neutral';
  };

  const chronicleMarkup = chronicleBuckets
    .map((bucket) => {
      const lineMarkup = bucket.entries.length
        ? bucket.entries.map((entry) => `<span class="${chronicleToneClass(entry)}">${entry}</span>`).join(' • ')
        : '<span class="chronicle-neutral">No events recorded.</span>';
      return `<article class="chronicle-day"><p class="chronicle-day-head">${bucket.title}</p><p class="chronicle-day-text">${lineMarkup}</p></article>`;
    })
    .join('');

  const progressRows = [];
  if (state.hasHandmadeFire) progressRows.push('<div class="stat-row"><span class="label">Handmade Fire</span><span>Built</span></div>');
  if (state.hasCookfire) progressRows.push('<div class="stat-row"><span class="label">Cooking Fire</span><span>Built</span></div>');
  if (state.hasWell) progressRows.push('<div class="stat-row"><span class="label">Well</span><span>Built</span></div>');
  if (state.hasMarketStall) progressRows.push('<div class="stat-row"><span class="label">Market</span><span>Built</span></div>');
  if (state.hasBasket) progressRows.push('<div class="stat-row"><span class="label">Basket</span><span>Ready</span></div>');
  if (state.spearUses > 0) progressRows.push(`<div class="stat-row"><span class="label">Spear</span><span>${state.spearUses} use(s)</span></div>`);
  if (state.hasKnife) progressRows.push('<div class="stat-row"><span class="label">Knife</span><span>Ready</span></div>');
  if (state.hasAxe) progressRows.push('<div class="stat-row"><span class="label">Axe</span><span>Ready</span></div>');
  if (state.hasPickaxe) progressRows.push('<div class="stat-row"><span class="label">Pickaxe</span><span>Ready</span></div>');
  if (state.hasWheelbarrow) progressRows.push('<div class="stat-row"><span class="label">Wheelbarrow</span><span>Ready</span></div>');
  if (state.hasSleepingSpot) progressRows.push('<div class="stat-row"><span class="label">Sleeping Spot</span><span>Built</span></div>');
  if (state.hasHandmadeBed) progressRows.push('<div class="stat-row"><span class="label">Handmade Bed</span><span>Built</span></div>');
  if (state.hasFurArmor) progressRows.push('<div class="stat-row"><span class="label">Fur Armor</span><span>Equipped</span></div>');
  if (state.shelterLevel > 0) progressRows.push(`<div class="stat-row"><span class="label">Shelter</span><span>${shelterText}</span></div>`);
  if (state.cottagesCount > 0) progressRows.push(`<div class="stat-row"><span class="label">Cottages</span><span>${state.cottagesCount}</span></div>`);
  if (state.hasLifePartner) progressRows.push('<div class="stat-row"><span class="label">Life Partner</span><span>With you</span></div>');
  if (state.townsfolk.length > 0 || state.children.length > 0) progressRows.push(`<div class="stat-row"><span class="label">Residents</span><span>${state.townsfolk.length} adults, ${state.children.length} children</span></div>`);
  if (state.reputation > 0) progressRows.push(`<div class="stat-row"><span class="label">Reputation</span><span>${state.reputation}</span></div>`);

  const buildQueue = state.activeBuilds.length
    ? `<p class="muted"><strong>Building:</strong> ${state.activeBuilds.map((build) => `${build.label} (${build.daysRemaining}d left)`).join(' | ')}</p>`
    : '';

  const listingsMarkup = state.stallListings.length
    ? `<ul>${state.stallListings.map((listing) => `<li>${listing.qty} ${itemLabel(listing.item)} @ ${listing.pricePerUnit}g</li>`).join('')}</ul>`
    : '<p class="muted">No goods currently listed in your stall.</p>';

  const travelerInlineBtn = (label, actionName) => {
    const { disabled, reason } = actionStatus(actionName);
    return `<button class="action-btn traveler-inline-btn" data-action="${actionName}" ${disabled ? 'disabled' : ''} title="${reason || ''}">${label}</button>`;
  };

  const travelerOptionsMarkup = state.travelerOffers.length
    ? `<div class="traveler-option-list">${state.travelerOffers
      .map((offer) => `<div class="traveler-option-row"><span class="traveler-option-text"><strong>${offer.qty} ${itemLabel(offer.item)}</strong> for ${offer.goldPrice} gold</span><span class="traveler-option-actions">${travelerInlineBtn('Buy', `buyTraveler:${offer.id}`)} ${travelerInlineBtn('Haggle', `haggleTraveler:${offer.id}`)}</span></div>`)
      .join('')}</div>`
    : '<p class="muted">No traveler offers right now.</p>';

  const openTravelerOffer = state.travelerOffers.find((offer) => offer.chatOpen);
  const travelerChatMarkup = openTravelerOffer
    ? `<section class="traveler-chat-popout"><h4>Haggle Chat — ${openTravelerOffer.qty} ${itemLabel(openTravelerOffer.item)}</h4><p class="muted"><strong>Trader:</strong> ${openTravelerOffer.traderMessage}</p><div class="traveler-chat"><div class="actions compact"><input id="haggle-gold-${openTravelerOffer.id}" type="number" min="1" value="${Math.max(1, openTravelerOffer.goldPrice - 1)}" /> ${btn('Offer Gold', `haggleGoldTraveler:${openTravelerOffer.id}`)} ${btn('Will you trade with me?', `askTradeTraveler:${openTravelerOffer.id}`)}</div><div class="actions compact"><select id="haggle-item-${openTravelerOffer.id}">${['wood', 'grain', 'food', 'sticks', 'stones', 'cloth', 'fur', 'rope', 'fences', 'tools', 'bandages', 'seeds', 'grass'].map((key) => `<option value="${key}">${itemLabel(key)}</option>`).join('')}</select><input id="haggle-qty-${openTravelerOffer.id}" type="number" min="1" value="3" /> ${btn('Offer Trade', `proposeTradeTraveler:${openTravelerOffer.id}`)} ${openTravelerOffer.demand ? btn(`Accept Terms (${openTravelerOffer.demand.qty} ${itemLabel(openTravelerOffer.demand.item)})`, `acceptTravelerDemand:${openTravelerOffer.id}`) : ''}</div></div></section>`
    : '';

  const builtMapFeatures = [
    state.hasSleepingSpot ? 'Sleeping Spot' : '',
    state.hasHandmadeFire ? 'Handmade Fire' : '',
    state.hasCookfire ? 'Cooking Fire' : '',
    state.hasWell ? 'Well' : '',
    state.clearedPlots > 0 ? `Farm Plots (${state.clearedPlots})` : '',
    state.hasMarketStall ? 'Market Stall' : '',
    state.cottagesCount > 0 ? `${state.cottagesCount} Cottage(s)` : '',
  ].filter(Boolean);

  const selectedCottage = state.cottages.find((cottage) => cottage.id === state.selectedCottageId) || state.cottages[0] || null;
  const selectedRoster = selectedCottage ? getCottageRoster(selectedCottage.id) : [];

  const hasCampfire = state.hasCookfire || state.hasHandmadeFire;
  const hasFarmPlots = state.clearedPlots > 0 || state.plantedPlots.length > 0 || readyCount > 0;
  const farmPlotStateClass = readyCount > 0 ? 'state-ready' : (state.plantedPlots.length > 0 ? 'state-planted' : 'state-cleared');
  const visibleCottages = Math.min(state.cottagesCount, 4);

  const cottageSceneMarkup = Array.from({ length: visibleCottages }, (_, index) => {
    const cottageNumber = index + 1;
    return `<div class="map-cottage c${cottageNumber}"><span>Cottage ${cottageNumber}</span></div>`;
  }).join('');

  const nav = `
    <section>
      <div class="actions">
        <button class="action-btn" data-action="openMainPage">Main</button>
        <button class="action-btn" data-action="openAdvancementPage">Advancement Table</button>
        <button class="action-btn" data-action="openTownMap">Town Map</button>
      </div>
    </section>
  `;

  if (state.activePage === 'advancement') {
    const { evaluatedRoadmap, nextObjective } = getAdvancementRoadmap();

    app.innerHTML = `
      <main class="page">
        <section class="options-column advancement-page">
          <h1>Settlement Advancement Table</h1>
          <p class="muted">Progression roadmap with tooltips. Hover any node box to view what it does.</p>
          ${nav}
          <div class="adv-legend" aria-label="Advancement state legend">
            <div class="adv-legend-item"><span class="adv-swatch adv-node-done">✓ Done</span></div>
            <div class="adv-legend-item"><span class="adv-swatch adv-node-available">Available</span></div>
            <div class="adv-legend-item"><span class="adv-swatch adv-node-locked">Locked</span></div>
          </div>
          <section class="advancement-tree">
            ${evaluatedRoadmap
              .map(
                (chain) => `
                  <div class="adv-lane">
                    <h3>${chain.name}</h3>
                    <div class="adv-flow">
                      ${chain.steps
                        .map(
                          (step, index) => `
                            <div class="adv-node-wrap">
                              <button class="adv-node adv-node-${step.status}" data-action="selectAdvancementNode:${step.id}" title="${step.desc}">
                                ${step.label}
                                ${step.done ? '<span class="adv-corner-check">✓</span>' : ''}
                                ${nextObjective && nextObjective.id === step.id ? '<span class="adv-next-tag">Next</span>' : ''}
                              </button>
                              ${index < chain.steps.length - 1 ? '<span class="adv-link">→</span>' : ''}
                            </div>
                          `,
                        )
                        .join('')}
                    </div>
                  </div>
                `,
              )
              .join('')}
          </section>
        </section>
      </main>
    `;
  } else if (state.activePage === 'townMap') {
    app.innerHTML = `
      <main class="page">
        <section class="options-column advancement-page townmap-layout full-map">
          <section class="stats-box townmap-canvas full-map">
            <div class="town-map-scene">
              <div class="townmap-hud">
                <h1>Town Map</h1>
                <p class="muted">Birdseye snapshot of your settlement. Build up to reveal more of town.</p>
                ${nav}
              </div>

              <span class="map-brush b1" aria-hidden="true"></span>
              <span class="map-brush b2" aria-hidden="true"></span>
              <span class="map-brush b3" aria-hidden="true"></span>
              <span class="map-brush b4" aria-hidden="true"></span>
              <div class="map-path ${hasCampfire && hasFarmPlots ? '' : 'hidden'}" aria-hidden="true"></div>
              <div class="map-feature sleeping-spot ${state.hasSleepingSpot ? '' : 'hidden'}">Bedroll</div>
              <div class="map-feature campfire ${hasCampfire ? '' : 'hidden'}" title="Campfire">🔥</div>
              <div class="map-feature lean-to ${state.shelterLevel >= 1 ? '' : 'hidden'}">Lean-to</div>
              <div class="farm-plots ${hasFarmPlots ? '' : 'hidden'} ${farmPlotStateClass}">
                <div class="farm-plot-grid">
                  <span class="farm-plot-cell"></span><span class="farm-plot-cell"></span><span class="farm-plot-cell"></span>
                  <span class="farm-plot-cell"></span><span class="farm-plot-cell"></span><span class="farm-plot-cell"></span>
                </div>
                <div class="farm-plot-label">Farm Plots</div>
              </div>
              ${cottageSceneMarkup}
              <div class="map-feature well ${state.hasWell ? '' : 'hidden'}">Well</div>
              <div class="map-feature market ${state.hasMarketStall ? '' : 'hidden'}">Market</div>

              <div class="townmap-panels">
                <section class="stats-box">
                  <h3>Built Features</h3>
                  ${builtMapFeatures.length ? `<p>${builtMapFeatures.join(' · ')}</p>` : '<p class="muted">Your town is still tiny. Build structures to populate the map.</p>'}
                </section>

                <section class="stats-box">
                  <h3>Cottages</h3>
                  ${state.cottages.length
                    ? `<div class="cottage-list">${state.cottages.map((cottage) => {
                      const roster = getCottageRoster(cottage.id);
                      return `<button class="action-btn" data-action="selectCottage:${cottage.id}">${cottage.label}: ${roster.length}/3 filled</button>`;
                    }).join('')}</div>`
                    : '<p class="muted">No cottages built yet.</p>'}
                  ${selectedCottage
                    ? `<div class="stats-box"><h4>${selectedCottage.label}</h4><p class="muted">${selectedRoster.length}/3 filled</p>${selectedRoster.length ? `<ul>${selectedRoster.map((person) => `<li>${person.name}${person.role ? ` — ${person.role}` : ''}</li>`).join('')}</ul>` : '<p class="muted">Empty cottage slot.</p>'}</div>`
                    : ''}
                </section>
              </div>
            </div>
          </section>
        </section>
      </main>
    `;
  } else {
    app.innerHTML = `
      <main class="page main-page">
        <div class="layout">
          <aside class="chronicles-column">
            <h3>Chronicle Log</h3>
            <div class="chronicle-log">${chronicleMarkup}</div>

            <h3>Town Chronicle</h3>
            <ul>${townChroniclePreview.map((line) => `<li>${line}</li>`).join('')}</ul>

            <h3>Traveler Offers</h3>
            ${travelerOptionsMarkup}
          </aside>

          <section class="options-column">
            <h1>Medieval Incremental Economy Simulator</h1>
            <p>Day ${state.day} — ${season} ${state.seasonDay}/${DAYS_PER_SEASON} | Year ${state.year}</p>
            ${buildQueue}
            ${nav}

            <section class="stats">
              <div class="stats-box">
                <div class="stats-columns">
                  <div class="stat-stack">
                    <div class="stat-group stat-group-status">
                      <h4>Status</h4>
                      <div class="stat-row"><span class="label key">Energy</span><span class="stat-value ${energyCritical ? 'critical' : ''}">${state.energy}/${state.energyMax}</span></div>
                      <div class="stat-row"><span class="label">Hunger</span><span>${state.hunger}/10</span></div>
                      <div class="stat-row"><span class="label key">Health</span><span>${state.health}/10</span></div>
                      <div class="stat-row"><span class="label">Warmth</span><span>${state.warmth}/10</span></div>
                    </div>
                    <div class="stat-divider" aria-hidden="true"></div>
                    <div class="stat-group stat-group-farm">
                      <h4>Farm</h4>
                      <div class="stat-row"><span class="label">Cleared plots</span><span>${state.clearedPlots}</span></div>
                      <div class="stat-row"><span class="label">Planted plots</span><span>${state.plantedPlots.length}</span></div>
                      <div class="stat-row"><span class="label">Ready plots</span><span>${readyCount}</span></div>
                    </div>
                  </div>
                  <div class="stat-group stat-group-supplies">
                    <h4>Supplies</h4>
                    <div class="stat-row"><span class="label key">Food</span><span>${state.food}</span></div>
                    <div class="stat-row"><span class="label">Sticks</span><span>${state.sticks}</span></div>
                    <div class="stat-row"><span class="label">Stones</span><span>${state.stones}</span></div>
                    <div class="stat-row"><span class="label">Rocks</span><span>${state.rocks}</span></div>
                    <div class="stat-row"><span class="label">Grass</span><span>${state.grass}</span></div>
                    <div class="stat-row"><span class="label">Rope</span><span>${state.rope}</span></div>
                    <div class="stat-row"><span class="label">Wood</span><span>${state.wood}</span></div>
                    <div class="stat-row"><span class="label">Grain</span><span>${state.grain}</span></div>
                    <div class="stat-row"><span class="label">Seeds</span><span>${state.seeds}</span></div>
                    <div class="stat-row"><span class="label">Fur</span><span>${state.fur}</span></div>
                    <div class="stat-row"><span class="label">Cloth</span><span>${state.cloth}</span></div>
                    <div class="stat-row"><span class="label">Bandages</span><span>${state.bandages}</span></div>
                    <div class="stat-row"><span class="label">Tools</span><span>${state.tools}</span></div>
                    <div class="stat-row"><span class="label">Fences</span><span>${state.fences}</span></div>
                    <div class="stat-row"><span class="label">Gold</span><span>${state.gold}</span></div>
                  </div>
                </div>
              </div>
              ${progressRows.length ? `<div class="stats-box"><div class="stat-group stat-group-progress"><h4>Progress</h4>${progressRows.join('')}</div></div>` : ''}
            </section>

            ${state.gameOver ? '<p class="game-over">Game Over: your settlement can no longer continue.</p>' : ''}

            <section>
              <h3>Farm & Wilderness</h3>
              <div class="actions">
                ${btn('Clear Land', 'clearLand', '-3 energy')}
                ${btn('Gather Sticks', 'gatherSticks', '-1 energy')}
                ${btn('Gather Stones', 'gatherStones', '-1 energy')}
                ${btn('Gather Grass', 'gatherGrass', '-1 energy')}
                ${btn('Gather Seeds', 'gatherSeeds', '-1 energy')}
                ${btn('Plant Crops', 'plantCrops', '-2 energy, -1 seed')}
                ${btn('Gather Rocks', 'gatherRocks', '-2 energy (needs Handmade Pickaxe/Pickaxe)')}
                ${btn('Chop Wood', 'chopWood', '-2 energy (needs Axe/Handmade Axe)')}
                ${btn('Gather Forage', 'gatherForage', '-1 energy')}
                ${btn('Hunt Wild Game', 'huntWildGame', '-3 energy')}
                ${readyCount > 0 ? btn('Harvest', 'harvest', '-2 energy') : ''}
              </div>
            </section>

            <section>
              <h3>Crafting</h3>
              <div class="actions">
                ${btn('Craft Rope', 'craftRope', '-1 energy, -4 grass')}
                ${btn('Craft Basket', 'craftBasket', '-1 energy, -6 sticks')}
                ${btn('Craft Wheelbarrow', 'craftWheelbarrow', '-2 energy, -8 wood, -2 rope')}
                ${btn('Craft Handmade Axe', 'craftHandmadeAxe', '-1 energy, -3 sticks, -2 stones')}
                ${btn('Craft Axe', 'craftAxe', '-1 energy, -6 wood, -1 rope')}
                ${btn('Craft Handmade Pickaxe', 'craftHandmadePickaxe', '-1 energy, -3 sticks, -2 stones')}
                ${btn('Craft Pickaxe', 'craftPickaxe', '-1 energy, -6 wood, -1 rope')}
                ${btn('Crack Stones to Rocks', 'crackStonesToRocks', '-1 energy, -2 stones, +1 rock')}
                ${btn('Craft Spear', 'sharpenSpear', '-1 energy, -2 sticks, -1 stone (3 uses)')}
                ${btn('Craft Knife', 'craftKnife', '-1 energy, -2 stones (better hunting than spear)')}
                ${btn('Tan Fur to Cloth', 'tanFurToCloth', '-1 energy, -2 fur, +1 cloth')}
                ${btn('Craft Bandages', 'craftBandages', '-1 energy, -1 cloth, +2 bandages')}
                ${btn('Craft Fur Armor', 'craftFurArmor', '-2 energy, -1 cloth, -2 fur, +warmth buff')}
              </div>
            </section>

            <section>
              <h3>Buildings</h3>
              <div class="actions">
                ${!state.hasHandmadeFire ? btn('Build Handmade Fire', 'buildHandmadeFire', '-1 energy, -8 stones, -4 sticks') : ''}
                ${state.hasHandmadeFire && !state.hasCookfire ? btn('Build Cooking Fire', 'buildCookfire', '2 day build, -2 energy, -8 rocks, -4 wood') : ''}
                ${state.hasCookfire ? btn('Cook Meal', 'cookMeal', '-1 energy, -5 grain, +6 food') : ''}
                ${!state.hasWell ? btn('Build Well', 'buildWell', '-1 energy, -10 rocks') : ''}
                ${btn('Build Lean-to', 'buildLeanTo', '3 day build, -3 energy, -30 wood')}
                ${state.shelterLevel >= 1 ? btn('Build Cottage', 'buildCottage', '4 day build, -4 energy, -80 wood, -30 gold (adds housing)') : ''}
                ${!state.hasMarketStall ? btn('Build Market Stall', 'buildMarketStall', '3 day build, -3 energy, -20 wood, -10 grain') : ''}
              </div>
            </section>

            <section>
              <h3>Life</h3>
              <div class="actions">${btn('Build Sleeping Spot', 'buildSleepingSpot', '-1 energy, -10 grass')} ${btn('Build Handmade Bed', 'buildHandmadeBed', '-2 energy, -10 wood, -4 rope, -10 cloth')} ${btn('Get Life Partner', 'getLifePartner', '-1 energy (when town is built up)')} ${btn('Rest', 'rest', '+3 energy, repairs dulled tools (once/day)')} ${btn('Use Bandage', 'healWithBandage', '-1 energy, -1 bandage, +1 health')}</div>
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
            ${travelerChatMarkup}
          </section>
        </div>
      </main>
    `;
  }

  app.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => applyAction(button.dataset.action));
  });
}

render();
