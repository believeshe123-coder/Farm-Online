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
  fur: 'Fur',
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
  baseHoursPerDay: 10,
  hoursUsed: 0,
  energyMax: 10,
  baseEnergyMax: 10,
  energy: 10,
  bonusEnergyToday: 0,
  bonusHoursToday: 0,
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
  fur: 0,
  gold: 0,
  hasCookfire: false,
  hasMarketStall: false,
  hasBasket: false,
  hasSharpSpear: false,
  shelterLevel: 0,
  population: 1,
  clearedPlots: 0,
  plantedPlots: [],
  toolDulled: false,
  reputation: 0,
  activeBuilds: [],
  stallListings: [],
  travelerOffers: [],
  activePage: 'main',
  selectedAdvancementNode: null,
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

function getAdvancementRoadmap() {
  const readyCount = readyPlotsCount();
  const roadmap = [
    {
      lane: 'Main Farm Loop',
      steps: [
        {
          key: 'clearedPlots',
          name: 'Cleared Plots',
          tooltip: 'Clearing plots gives seeds, sticks, stones, and grass.',
          requirements: ['None'],
          unlocks: ['Planted Plots'],
          done: () => state.clearedPlots > 0,
          available: () => true,
        },
        {
          key: 'plantedPlots',
          name: 'Planted Plots',
          tooltip: 'Plant seeds in cleared plots.',
          requirements: ['Cleared plots', 'Seeds'],
          unlocks: ['Ready Plots'],
          done: () => state.plantedPlots.length > 0 || state.grain > 0,
          available: (prevDone) => prevDone && state.clearedPlots > state.plantedPlots.length && state.seeds > 0,
        },
        {
          key: 'readyPlots',
          name: 'Ready Plots',
          tooltip: 'Plots become ready after growth time passes.',
          requirements: ['Planted plots'],
          unlocks: ['Harvest Grain'],
          done: () => readyCount > 0 || state.grain >= 5,
          available: (prevDone) => prevDone && state.plantedPlots.length > 0,
        },
        {
          key: 'harvestGrain',
          name: 'Harvest Grain',
          tooltip: 'Harvesting ready plots gives 5 grain.',
          requirements: ['Ready plots'],
          unlocks: ['Seeds → Grain → Food chain'],
          done: () => state.grain >= 5,
          available: (prevDone) => prevDone && readyCount > 0,
        },
      ],
    },
    {
      lane: 'Sticks Chain',
      steps: [
        {
          key: 'sticksNode',
          name: 'Sticks',
          tooltip: 'Gather sticks from clearing plots or stick gathering.',
          requirements: ['Clear plots or gather sticks'],
          unlocks: ['Wood'],
          done: () => state.clearedPlots > 0 || state.wood >= 6,
          available: () => true,
        },
        {
          key: 'woodNode',
          name: 'Wood',
          tooltip: 'Wood requires an axe to gather effectively.',
          requirements: ['Axe'],
          unlocks: ['Building and advanced crafting'],
          done: () => state.wood >= 20,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Stones Chain',
      steps: [
        {
          key: 'stonesNode',
          name: 'Stones',
          tooltip: 'Gather stones from clearing plots or stone gathering.',
          requirements: ['Clear plots or gather stones'],
          unlocks: ['Rocks'],
          done: () => state.clearedPlots >= 2,
          available: () => true,
        },
        {
          key: 'rocksNode',
          name: 'Rocks',
          tooltip: 'Rocks require a pickaxe to gather effectively.',
          requirements: ['Pickaxe'],
          unlocks: ['Cooking fire materials'],
          done: () => state.hasCookfire,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Seeds Chain',
      steps: [
        {
          key: 'seedsNode',
          name: 'Seeds',
          tooltip: 'Seeds come from clearing plots or seed gathering.',
          requirements: ['Clear plots or gather seeds'],
          unlocks: ['Grains'],
          done: () => state.seeds > 2 || state.grain > 0,
          available: () => true,
        },
        {
          key: 'grainsNode',
          name: 'Grains',
          tooltip: 'Seeds must be planted in cleared plots to turn into grain.',
          requirements: ['Seeds + cleared plots'],
          unlocks: ['Food'],
          done: () => state.grain > 0,
          available: (prevDone) => prevDone,
        },
        {
          key: 'foodNode',
          name: 'Food',
          tooltip: 'Grains can be turned into food at a cooking pot.',
          requirements: ['Grain + cooking pot'],
          unlocks: ['Sustained recovery'],
          done: () => state.hasCookfire && state.food > 16,
          available: (prevDone) => prevDone && (state.hasCookfire || state.grain >= 5),
        },
      ],
    },
    {
      lane: 'Grass Chain',
      steps: [
        {
          key: 'grassNode',
          name: 'Grass',
          tooltip: 'Gather grass from clearing plots or grass gathering.',
          requirements: ['Clear plots or gather grass'],
          unlocks: ['Rope'],
          done: () => state.clearedPlots > 0,
          available: () => true,
        },
        {
          key: 'ropeNode',
          name: 'Rope',
          tooltip: 'Craft rope from gathered grass.',
          requirements: ['Grass'],
          unlocks: ['Bed and utility crafting'],
          done: () => false,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Basket Chain',
      steps: [
        {
          key: 'basketNode',
          name: 'Basket',
          tooltip: 'Basket is made of sticks.',
          requirements: ['Sticks'],
          unlocks: ['Wheelbarrow'],
          done: () => state.hasBasket,
          available: () => state.wood >= 6,
        },
        {
          key: 'wheelbarrowNode',
          name: 'Wheelbarrow',
          tooltip: 'Upgrade from basket to wheelbarrow for better carrying.',
          requirements: ['Basket'],
          unlocks: ['Higher transport efficiency'],
          done: () => false,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Axe Chain',
      steps: [
        {
          key: 'handmadeAxeNode',
          name: 'Handmade Axe',
          tooltip: 'Early axe used before the full axe upgrade.',
          requirements: ['Starter materials'],
          unlocks: ['Axe'],
          done: () => state.tools >= 1,
          available: () => true,
        },
        {
          key: 'axeNode',
          name: 'Axe',
          tooltip: 'Upgraded axe improves wood gathering.',
          requirements: ['Handmade axe'],
          unlocks: ['Advanced wood production'],
          done: () => state.wood >= 30,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Pickaxe Chain',
      steps: [
        {
          key: 'handmadePickaxeNode',
          name: 'Handmade Pickaxe',
          tooltip: 'Early pickaxe used before the full pickaxe upgrade.',
          requirements: ['Starter materials'],
          unlocks: ['Pickaxe'],
          done: () => false,
          available: () => true,
        },
        {
          key: 'pickaxeNode',
          name: 'Pickaxe',
          tooltip: 'Upgraded pickaxe improves rock gathering.',
          requirements: ['Handmade pickaxe'],
          unlocks: ['Advanced rock production'],
          done: () => false,
          available: (prevDone) => prevDone,
        },
      ],
    },
    {
      lane: 'Fire Chain',
      steps: [
        {
          key: 'handmadeFireNode',
          name: 'Handmade Fire',
          tooltip: '8 stones + 4 sticks. Keeps you warm.',
          requirements: ['8 stones', '4 sticks'],
          unlocks: ['Cooking Fire'],
          done: () => state.warmth >= 9,
          available: () => true,
        },
        {
          key: 'cookingFireNode',
          name: 'Cooking Fire',
          tooltip: '8 rocks + 4 wood. Gives ability to cook.',
          requirements: ['8 rocks', '4 wood'],
          unlocks: ['Cook food from grain'],
          done: () => state.hasCookfire,
          available: (prevDone) => prevDone && state.wood >= 10,
        },
      ],
    },
    {
      lane: 'Sleeping Chain',
      steps: [
        {
          key: 'sleepingSpotNode',
          name: 'Handmade Sleeping Spot',
          tooltip: '10 grass. Restores more energy than sleeping on the ground.',
          requirements: ['10 grass'],
          unlocks: ['Handmade Bed'],
          done: () => state.shelterLevel >= 1,
          available: () => true,
        },
        {
          key: 'handmadeBedNode',
          name: 'Handmade Bed',
          tooltip: '10 wood + 4 rope + 10 fur. Restores full energy.',
          requirements: ['10 wood', '4 rope', '10 fur'],
          unlocks: ['Full nightly recovery'],
          done: () => state.shelterLevel >= 2,
          available: (prevDone) => prevDone && state.shelterLevel >= 1,
        },
      ],
    },
    {
      lane: 'Future Additions',
      steps: [
        {
          key: 'futureNode',
          name: 'More chains coming...',
          tooltip: 'This table is designed to expand as new systems are added to the game.',
          requirements: ['New content'],
          unlocks: ['More advancement paths'],
          done: () => false,
          available: () => true,
        },
      ],
    },
  ];

  const evaluatedRoadmap = roadmap.map((lane) => {
    let previousDone = true;
    return {
      ...lane,
      steps: lane.steps.map((step) => {
        const done = step.done();
        const available = !done && step.available(previousDone);
        const status = done ? 'done' : available ? 'available' : 'locked';
        const evaluatedStep = { ...step, done, available, status };
        previousDone = done;
        return evaluatedStep;
      }),
    };
  });

  const nextObjective = evaluatedRoadmap.flatMap((lane) => lane.steps).find((step) => step.available && !step.done);

  return { evaluatedRoadmap, nextObjective };
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
  if (state.gameOver && !['newSettlement', 'openAdvancementPage', 'openMainPage'].includes(action)) return;

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
    state.grain += harvested * 5;
    state.seeds += harvested;
    logs.push(`Harvested ${harvested} ready plot(s) for ${harvested * 5} grain and ${harvested} seeds.`);
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

  if (action === 'craftBasket') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed || state.hasBasket || state.wood < 6) return;
    spendCosts({ energyCost: 1, hoursCost: 2 });
    state.wood = clamp(state.wood - 6, 0, 9999);
    state.hasBasket = true;
    logs.push('You wove a gathering basket (-6 wood).');
  }

  if (action === 'sharpenSpear') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 1 });
    if (!gate.allowed || state.hasSharpSpear || state.wood < 2) return;
    spendCosts({ energyCost: 1, hoursCost: 1 });
    state.wood = clamp(state.wood - 2, 0, 9999);
    state.hasSharpSpear = true;
    logs.push('You sharpened and hardened a spear tip (-2 wood).');
  }

  if (action === 'gatherForage') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed || !state.hasBasket) return;
    spendCosts({ energyCost: 1, hoursCost: 2 });
    const foundFood = randInt(2, 4);
    state.food = clamp(state.food + foundFood, 0, 9999);
    const foundSeeds = randInt(0, 2);
    state.seeds = clamp(state.seeds + foundSeeds, 0, 9999);
    logs.push(`You gathered wild plants (+${foundFood} food, +${foundSeeds} seeds).`);
  }

  if (action === 'huntWildGame') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 3 });
    if (!gate.allowed || !state.hasSharpSpear) return;
    spendCosts({ energyCost: 3, hoursCost: 3 });
    state.hasSharpSpear = false;
    if (Math.random() < 0.65) {
      const meat = randInt(5, 9);
      const furYield = randInt(1, 2);
      state.food = clamp(state.food + meat, 0, 9999);
      state.fur = clamp(state.fur + furYield, 0, 9999);
      logs.push(`Your hunt succeeded (+${meat} food, +${furYield} fur).`);
    } else if (Math.random() < 0.5) {
      if (state.cloth >= 1) {
        state.cloth = clamp(state.cloth - 1, 0, 9999);
        logs.push('The hunt failed and you were cut, but used 1 cloth as a bandage.');
      } else {
        state.health = clamp(state.health - 1, 0, 10);
        logs.push('The hunt failed and you were hurt (-1 health). No cloth for bandages.');
      }
    } else {
      logs.push('The hunt failed and you came back empty-handed.');
    }
  }

  if (action === 'tanFurToCloth') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed || state.fur < 2) return;
    spendCosts({ energyCost: 1, hoursCost: 2 });
    state.fur = clamp(state.fur - 2, 0, 9999);
    state.cloth = clamp(state.cloth + 1, 0, 9999);
    logs.push('You processed 2 fur into 1 cloth strip for repairs and bandages.');
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
  const carryoverEnergy = Math.max(state.energy - state.bonusEnergyToday, 0);
  const nextDayEnergyBonus = carryoverEnergy > 0 ? 2 : 0;
  const nextDayHourBonus = Math.floor(carryoverEnergy / 3);

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

  if (state.shelterLevel === 0) {
    if (state.wood >= 2) {
      state.wood = clamp(state.wood - 2, 0, 9999);
      state.warmth = clamp(state.warmth + 1, 0, 10);
      logs.push('You burned 2 wood in an outdoor fire to stay warm.');
    } else {
      warmthLoss += 2;
      logs.push('No wood for a night fire. The cold closes in.');
      const attackRoll = Math.random();
      if (attackRoll < 0.7) {
        const damage = attackRoll < 0.2 ? 2 : 1;
        state.health = clamp(state.health - damage, 0, 10);
        logs.push(`Wild animals attacked in the dark (-${damage} health).`);
      } else {
        logs.push('You heard animals nearby, but they stayed away this night.');
      }
    }
  }

  state.warmth = clamp(state.warmth - warmthLoss, 0, 10);
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
  state.hoursPerDay = state.baseHoursPerDay;

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

  state.bonusEnergyToday = nextDayEnergyBonus;
  state.bonusHoursToday = nextDayHourBonus;
  if (nextDayEnergyBonus > 0 || nextDayHourBonus > 0) {
    logs.push(`Rested strength carries over: tomorrow +${nextDayEnergyBonus} energy and +${nextDayHourBonus} hour(s).`);
  }

  state.energyMax = state.baseEnergyMax + state.bonusEnergyToday;
  state.hoursPerDay = state.baseHoursPerDay + state.bonusHoursToday;
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

  if (actionName === 'craftBasket') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasBasket) return { disabled: true, reason: 'Basket ready' };
    if (state.wood < 6) return { disabled: true, reason: 'Needs 6 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'sharpenSpear') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 1 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.hasSharpSpear) return { disabled: true, reason: 'Spear is ready' };
    if (state.wood < 2) return { disabled: true, reason: 'Needs 2 wood' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'gatherForage') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasBasket) return { disabled: true, reason: 'Craft basket first' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'huntWildGame') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 3 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (!state.hasSharpSpear) return { disabled: true, reason: 'Sharpen spear first' };
    return { disabled: false, reason: '' };
  }

  if (actionName === 'tanFurToCloth') {
    const gate = canDoAction({ energyCost: 1, hoursCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (state.fur < 2) return { disabled: true, reason: 'Needs 2 fur' };
    return { disabled: false, reason: '' };
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

  if (actionName === 'openAdvancementPage') return { disabled: false, reason: '' };
  if (actionName === 'openMainPage') return { disabled: false, reason: '' };
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
  const dailyChroniclePreview = state.dailyChronicle.slice(-6);
  const townChroniclePreview = state.townChronicle.slice(-6);

  const progressRows = [];
  if (state.hasCookfire) progressRows.push('<div class="stat-row"><span class="label">Cookpot</span><span>Built</span></div>');
  if (state.hasMarketStall) progressRows.push('<div class="stat-row"><span class="label">Market</span><span>Built</span></div>');
  if (state.hasBasket) progressRows.push('<div class="stat-row"><span class="label">Basket</span><span>Ready</span></div>');
  if (state.hasSharpSpear) progressRows.push('<div class="stat-row"><span class="label">Spear</span><span>Sharpened</span></div>');
  if (state.shelterLevel > 0) progressRows.push(`<div class="stat-row"><span class="label">Shelter</span><span>${shelterText}</span></div>`);
  if (state.reputation > 0) progressRows.push(`<div class="stat-row"><span class="label">Reputation</span><span>${state.reputation}</span></div>`);

  const buildQueue = state.activeBuilds.length
    ? `<p class="muted"><strong>Building:</strong> ${state.activeBuilds.map((build) => `${build.label} (${build.daysRemaining}d left)`).join(' | ')}</p>`
    : '';

  const listingsMarkup = state.stallListings.length
    ? `<ul>${state.stallListings.map((listing) => `<li>${listing.qty} ${itemLabel(listing.item)} @ ${listing.pricePerUnit}g</li>`).join('')}</ul>`
    : '<p class="muted">No goods currently listed in your stall.</p>';

  const nav = `
    <section>
      <div class="actions">
        <button class="action-btn" data-action="openMainPage">Main</button>
        <button class="action-btn" data-action="openAdvancementPage">Advancement Table</button>
      </div>
    </section>
  `;

  if (state.activePage === 'advancement') {
    const { evaluatedRoadmap, nextObjective } = getAdvancementRoadmap();
    const selectedNode = evaluatedRoadmap.flatMap((lane) => lane.steps).find((step) => step.key === state.selectedAdvancementNode);

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
                (path) => `
                  <div class="adv-lane">
                    <h3>${path.lane}</h3>
                    <div class="adv-flow">
                      ${path.steps
                        .map(
                          (step, index) => `
                            <div class="adv-node-wrap">
                              <button class="adv-node adv-node-${step.status} ${nextObjective && nextObjective.key === step.key ? 'adv-node-next' : ''}" data-action="selectAdvancementNode:${step.key}" title="${step.tooltip}">
                                ${step.name}
                                ${step.done ? '<span class="adv-corner-check">✓</span>' : ''}
                                ${nextObjective && nextObjective.key === step.key ? '<span class="adv-next-tag">Next</span>' : ''}
                              </button>
                              ${index < path.steps.length - 1 ? '<span class="adv-link">→</span>' : ''}
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
          ${selectedNode ? `
            <section class="adv-details">
              <h3>${selectedNode.name}</h3>
              <p class="muted">${selectedNode.tooltip}</p>
              <p><strong>Requirements</strong></p>
              <ul>${selectedNode.requirements.map((requirement) => `<li>${requirement}</li>`).join('')}</ul>
              <p><strong>Unlocks</strong></p>
              <ul>${selectedNode.unlocks.map((unlock) => `<li>${unlock}</li>`).join('')}</ul>
            </section>
          ` : ''}
        </section>
      </main>
    `;
  } else {
    app.innerHTML = `
      <main class="page main-page">
        <div class="layout">
          <aside class="chronicles-column">
            <h3>Daily Chronicle</h3>
            <ul>${dailyChroniclePreview.map((line) => `<li>${line}</li>`).join('')}</ul>

            <h3>Town Chronicle</h3>
            <ul>${townChroniclePreview.map((line) => `<li>${line}</li>`).join('')}</ul>
          </aside>

          <section class="options-column">
            <h1>Medieval Incremental Economy Simulator</h1>
            <p>Day ${state.day} — ${season} ${state.seasonDay}/${DAYS_PER_SEASON} | Year ${state.year}</p>
            ${buildQueue}
            ${nav}

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
                  <div class="stat-row"><span class="label">Fur</span><span>${state.fur}</span></div>
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
              <h3>Farm & Wilderness</h3>
              <div class="actions">
                ${btn('Clear Land', 'clearLand', '-3 energy, 4h')}
                ${btn('Plant Crops', 'plantCrops', '-2 energy, 2h, -1 seed')}
                ${btn('Chop Wood', 'chopWood', '-2 energy, 2h')}
                ${btn('Gather Forage', 'gatherForage', '-1 energy, 2h')}
                ${btn('Hunt Wild Game', 'huntWildGame', '-3 energy, 3h')}
                ${readyCount > 0 ? btn('Harvest', 'harvest', '-2 energy, 3h') : ''}
              </div>
            </section>

            <section>
              <h3>Crafting</h3>
              <div class="actions">
                ${btn('Craft Basket', 'craftBasket', '-1 energy, 2h, -6 wood')}
                ${btn('Sharpen Spear', 'sharpenSpear', '-1 energy, 1h, -2 wood')}
                ${btn('Tan Fur to Cloth', 'tanFurToCloth', '-1 energy, 2h, -2 fur, +1 cloth')}
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
  }

  app.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => applyAction(button.dataset.action));
  });
}

render();
