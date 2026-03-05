const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const DAYS_PER_SEASON = 30;

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
  population: 1,
  clearedPlots: 0,
  plantedPlots: [],
  toolDulled: false,
  reputation: 0,
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
  if (hoursRemaining < hoursCost) return { allowed: false, reason: 'Not enough hours' };
  if (state.energy < energyCost) return { allowed: false, reason: 'Not enough energy' };
  return { allowed: true, reason: '' };
}

function applyAction(action) {
  if (state.gameOver && action !== 'newSettlement') return;

  const logs = [];

  if (action === 'clearLand') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 4 });
    if (!gate.allowed) return;
    spendCosts({ energyCost: 3, hoursCost: 4 });
    state.clearedPlots += 1;
    logs.push('You cleared one new plot of land.');
  }

  if (action === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    if (!gate.allowed || freePlots() <= 0) return;
    spendCosts({ energyCost: 2, hoursCost: 2 });
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
    logs.push(`Harvested ${harvested} ready plot(s) for ${harvested * 10} grain.`);
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

function applyDailyEvents(logs) {
  const eventCountRoll = Math.random();
  let eventCount = 0;
  if (eventCountRoll > 0.35 && eventCountRoll <= 0.8) eventCount = 1;
  if (eventCountRoll > 0.8) eventCount = 2;

  const eventPool = [
    'rain',
    'dullTools',
    'traveler',
    'quietWind',
  ];

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

  const foodNeed = state.population * 2;
  const startingFood = state.food;
  state.food = clamp(state.food - foodNeed, 0, 9999);
  const shortage = Math.max(foodNeed - startingFood, 0);

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
  if (season === 'Winter') warmthLoss = 2;
  state.warmth = clamp(state.warmth - warmthLoss, 0, 10);
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

  applyDailyEvents(logs);

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

  if (actionName === 'clearLand') {
    const gate = canDoAction({ energyCost: 3, hoursCost: 4 });
    return { disabled: !gate.allowed, reason: gate.reason };
  }

  if (actionName === 'plantCrops') {
    const gate = canDoAction({ energyCost: 2, hoursCost: 2 });
    if (!gate.allowed) return { disabled: true, reason: gate.reason };
    if (freePlots() <= 0) return { disabled: true, reason: 'No cleared empty plot' };
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

  if (actionName === 'endDay') return { disabled: false, reason: '' };
  if (actionName === 'newSettlement') return { disabled: false, reason: '' };

  return { disabled: false, reason: '' };
}

function btn(label, actionName, costsText) {
  const { disabled, reason } = actionStatus(actionName);
  return `<button data-action="${actionName}" ${disabled ? 'disabled' : ''} title="${reason || ''}">
      ${label}${costsText ? ` (${costsText})` : ''}
    </button>
    ${disabled && reason ? `<span class="reason">${reason}</span>` : ''}`;
}

function render() {
  const app = document.getElementById('root');
  const season = getSeason();
  const readyCount = readyPlotsCount();
  const growingCount = state.plantedPlots.filter((p) => p.daysUntilHarvest > 0).length;

  app.innerHTML = `
    <main class="page">
      <h1>Medieval Incremental Economy Simulator</h1>
      <p>Day ${state.day} — ${season} ${state.seasonDay}/${DAYS_PER_SEASON} | Year ${state.year}</p>

      <pre class="stats">Energy: ${state.energy}/${state.energyMax}
Hours: ${state.hoursUsed}/${state.hoursPerDay}
Hunger: ${state.hunger}/10
Health: ${state.health}/10
Warmth: ${state.warmth}/10
Food: ${state.food}
Wood: ${state.wood}
Grain: ${state.grain}
Population: ${state.population}
Cleared plots: ${state.clearedPlots}
Planted plots: ${state.plantedPlots.length} (${growingCount} growing, ${readyCount} ready)
Tool condition: ${state.toolDulled ? 'Dulled' : 'Good'}
Reputation: ${state.reputation}</pre>

      ${state.gameOver ? '<p class="game-over">Game Over: your settlement can no longer continue.</p>' : ''}

      <section>
        <h3>Farm</h3>
        <div class="actions">
          ${btn('Clear Land', 'clearLand', '-3 energy, 4h')}
          ${btn('Plant Crops', 'plantCrops', '-2 energy, 2h')}
          ${btn('Chop Wood', 'chopWood', '-2 energy, 2h')}
          ${readyCount > 0 ? btn('Harvest', 'harvest', '-2 energy, 3h') : ''}
        </div>
      </section>

      <section>
        <h3>Life</h3>
        <div class="actions">
          ${btn('Rest', 'rest', '+3 energy, 2h')}
        </div>
      </section>

      <section>
        <button data-action="endDay">End Day</button>
        <button data-action="newSettlement">New Settlement</button>
      </section>

      <h3>Daily Chronicle</h3>
      <ul>
        ${state.dailyChronicle.map((line) => `<li>${line}</li>`).join('')}
      </ul>

      <h3>Town Chronicle</h3>
      <ul>
        ${state.townChronicle.map((line) => `<li>${line}</li>`).join('')}
      </ul>
    </main>
  `;

  app.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => applyAction(button.dataset.action));
  });
}

render();
