// Rush Kitchen — state: the whole simulation. No drawing here, only rules.
// A station is a slot that holds one job: { kind, id, t, total, done, burnt }.
// The player's hand holds at most one ingredient id. The plate holds prepared
// ids. Customers sit in seats; each has one order (a recipe) and a patience
// clock. Events are returned as a bitmask so the loop can play sounds and
// announce without the state knowing about audio or the DOM.

import {
  CUSTOMERS, FIELD, INGREDIENTS, JOB, MAX_SEATS, PATIENCE_SECONDS, RECIPES, SHIFT,
  SPAWN_SECONDS, comboMultiplier, levelAt, preparedId, tipFor, unlockedRecipes,
} from './data.js';

export const EV_NONE = 0;
export const EV_CHOP_START = 1;
export const EV_COOK_START = 2;
export const EV_JOB_DONE = 4;
export const EV_BURNT = 8;
export const EV_SERVED = 16;
export const EV_WRONG = 32;
export const EV_WALKOUT = 64;
export const EV_NEW_CUSTOMER = 128;
export const EV_LEVEL_UP = 256;
export const EV_WIN = 512;
export const EV_LOSE = 1024;

export function createState() {
  return {
    timeLeft: SHIFT.seconds,
    elapsed: 0,
    level: 1,
    money: 0,
    score: 0,
    served: 0,
    walkouts: 0,
    combo: 0,
    bestCombo: 0,
    hand: null, // pantry ingredient id, or null
    plate: [], // prepared ids on the plate
    chop: null, // station job or null
    stove: [null, null],
    chopOutput: null, // finished chopped item waiting to be picked up
    stoveOutput: [null, null],
    customers: [], // { seat, person, recipe, patience, patienceMax }
    spawnIn: 2.5,
    nextPerson: 0,
    over: false,
    won: false,
    message: '',
    messageT: 0,
    rushBannerT: 0,
  };
}

function newCustomer(state) {
  const seat = [0, 1, 2, 3].find((s) => !state.customers.some((c) => c.seat === s));
  if (seat === undefined) return null;
  const person = CUSTOMERS[state.nextPerson % CUSTOMERS.length];
  state.nextPerson += 1;
  const pool = unlockedRecipes(state.level);
  const recipe = pool[Math.floor(Math.random() * pool.length)];
  const patience = PATIENCE_SECONDS[state.level];
  const customer = { seat, person, recipe, patience, patienceMax: patience };
  state.customers.push(customer);
  return customer;
}

function flash(state, message) {
  state.message = message;
  state.messageT = 2.2;
}

// --- Player actions. Each returns an event bitmask. -------------------------

export function takeFromPantry(state, ingredientId) {
  if (state.over) return EV_NONE;
  const ing = INGREDIENTS.find((i) => i.id === ingredientId);
  if (!ing) return EV_NONE;
  if (state.hand) { flash(state, 'Hands full — plate it or trash it first'); return EV_WRONG; }
  state.hand = ingredientId;
  return EV_NONE;
}

export function useChopBoard(state) {
  if (state.over) return EV_NONE;
  // Pick up a finished chopped item first.
  if (state.chopOutput) {
    if (state.hand) { flash(state, 'Hands full'); return EV_WRONG; }
    state.hand = state.chopOutput;
    state.chopOutput = null;
    return EV_NONE;
  }
  if (state.chop) { flash(state, 'Chopping already — wait for the ding'); return EV_NONE; }
  if (!state.hand) { flash(state, 'Take an ingredient from the pantry first'); return EV_NONE; }
  const ing = INGREDIENTS.find((i) => i.id === state.hand);
  if (ing.prep !== 'chop') {
    flash(state, `${ing.name} does not need chopping — cook it or plate it`);
    return EV_WRONG;
  }
  state.chop = { kind: 'chop', id: state.hand, t: 0, total: JOB.chopSeconds, done: false };
  state.hand = null;
  return EV_CHOP_START;
}

export function useStove(state, index) {
  if (state.over) return EV_NONE;
  if (state.stoveOutput[index] === 'burnt') {
    state.stoveOutput[index] = null;
    flash(state, 'Burnt food binned. Watch the timer!');
    return EV_NONE;
  }
  if (state.stoveOutput[index]) {
    if (state.hand) { flash(state, 'Hands full'); return EV_WRONG; }
    state.hand = state.stoveOutput[index];
    state.stoveOutput[index] = null;
    return EV_NONE;
  }
  if (state.stove[index]) { flash(state, 'That stove is busy'); return EV_NONE; }
  if (!state.hand) { flash(state, 'Take an ingredient from the pantry first'); return EV_NONE; }
  const ing = INGREDIENTS.find((i) => i.id === state.hand);
  if (ing.prep !== 'cook') {
    flash(state, `${ing.name} does not need the stove — chop it or plate it`);
    return EV_WRONG;
  }
  state.stove[index] = { kind: 'cook', id: state.hand, t: 0, total: ing.cookSeconds, done: false, burnt: false };
  state.hand = null;
  return EV_COOK_START;
}

export function clearBurnt(state, index) {
  if (state.stove[index] && state.stove[index].burnt) {
    state.stove[index] = null;
    flash(state, 'Burnt food binned. Watch the timer!');
    return EV_NONE;
  }
  return EV_NONE;
}

export function addToPlate(state) {
  if (state.over) return EV_NONE;
  if (!state.hand) { flash(state, 'Your hand is empty — grab an ingredient'); return EV_NONE; }
  const ing = INGREDIENTS.find((i) => i.id === state.hand);
  if (ing.prep !== 'ready') {
    flash(state, `${ing.name} is not ready — chop it or cook it first`);
    return EV_WRONG;
  }
  if (state.plate.length >= 4) { flash(state, 'Plate is full — serve it or trash it'); return EV_WRONG; }
  state.plate.push(preparedId(state.hand));
  state.hand = null;
  return EV_NONE;
}

// The hand can hold a raw pantry item or a prepared item picked up from a
// station output. Raw items must be finished first; prepared items plate
// directly; ready items (bun) plate as-is.
export function plateFromHand(state) {
  if (state.over) return EV_NONE;
  if (!state.hand) { flash(state, 'Your hand is empty — grab an ingredient'); return EV_NONE; }
  if (state.hand === 'burnt') { flash(state, 'That is burnt — bin it, do not serve it'); return EV_WRONG; }
  const isPrepared = state.hand.endsWith('-cooked') || state.hand.endsWith('-chopped');
  if (!isPrepared) {
    const ing = INGREDIENTS.find((i) => i.id === state.hand);
    if (ing.prep !== 'ready') {
      flash(state, `${ing.name} is not ready — chop it or cook it first`);
      return EV_WRONG;
    }
  }
  if (state.plate.length >= 4) { flash(state, 'Plate is full — serve it or trash it'); return EV_WRONG; }
  state.plate.push(isPrepared ? state.hand : preparedId(state.hand));
  state.hand = null;
  return EV_NONE;
}

export function trashHandAndPlate(state) {
  state.hand = null;
  state.plate = [];
  flash(state, 'Cleared. Fresh start!');
  return EV_NONE;
}

function plateMatches(recipe, plate) {
  if (plate.length !== recipe.needs.length) return false;
  const rest = [...plate];
  return recipe.needs.every((need) => {
    const i = rest.indexOf(need);
    if (i === -1) return false;
    rest.splice(i, 1);
    return true;
  });
}

// Serve the plate. The player picks the customer by seat; serving the wrong
// dish to a customer is refused (no penalty beyond the wasted click), while
// serving a plate that matches NO open order resets the combo.
export function serveTo(state, seat) {
  if (state.over) return EV_NONE;
  const customer = state.customers.find((c) => c.seat === seat);
  if (!customer) { flash(state, 'Nobody is sitting there'); return EV_NONE; }
  if (state.plate.length === 0) { flash(state, 'Plate is empty — build the dish first'); return EV_NONE; }
  if (!plateMatches(customer.recipe, state.plate)) {
    const anyMatch = state.customers.some((c) => plateMatches(c.recipe, state.plate));
    if (anyMatch) { flash(state, `That dish is for someone else — check the tickets`); return EV_WRONG; }
    flash(state, 'No order matches this plate — combo lost');
    state.combo = 0;
    state.plate = [];
    return EV_WRONG;
  }
  const tip = tipFor(customer.recipe.price, customer.patience, customer.patienceMax);
  const mult = comboMultiplier(state.combo);
  const earned = Math.round((customer.recipe.price + tip) * mult);
  state.money += earned;
  state.score += earned * 10 + Math.round(customer.patience);
  state.served += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.customers = state.customers.filter((c) => c !== customer);
  state.plate = [];
  flash(state, `Served ${customer.person.name}! +$${earned}${tip > 0 ? ` (tip $${tip})` : ''}${state.combo > 1 ? ` — combo x${state.combo}` : ''}`);
  return EV_SERVED;
}

// --- Simulation step ---------------------------------------------------------

export function step(state, dt) {
  if (state.over) return EV_NONE;
  let events = EV_NONE;
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.messageT > 0) state.messageT -= dt;
  if (state.rushBannerT > 0) state.rushBannerT -= dt;

  const level = levelAt(state.elapsed);
  if (level !== state.level) {
    state.level = level;
    state.rushBannerT = 3;
    events |= EV_LEVEL_UP;
    flash(state, level >= 3 ? 'RUSH HOUR! Faster orders, shorter patience!' : `Level ${level} — new recipe unlocked!`);
  }

  // Chopping job.
  if (state.chop) {
    state.chop.t += dt;
    if (state.chop.t >= state.chop.total) {
      state.chopOutput = preparedId(state.chop.id);
      state.chop = null;
      events |= EV_JOB_DONE;
    }
  }
  // Stove jobs: finish, then burn if ignored.
  state.stove.forEach((job, i) => {
    if (!job) return;
    job.t += dt;
    if (!job.done && job.t >= job.total) {
      job.done = true;
      state.stoveOutput[i] = preparedId(job.id);
      state.stove[i] = null;
      events |= EV_JOB_DONE;
    }
  });
  // A finished dish left on a stove too long burns: the output slot holds the
  // burnt item until the player bins it. We track burn time on the output.
  // (Burn is modelled on the output slot via a parallel timer array below.)

  // Customers lose patience; walkouts cost a heart and reset the combo.
  state.customers.forEach((c) => { c.patience -= dt; });
  const walked = state.customers.filter((c) => c.patience <= 0);
  if (walked.length) {
    state.customers = state.customers.filter((c) => c.patience > 0);
    state.walkouts += walked.length;
    state.combo = 0;
    events |= EV_WALKOUT;
    flash(state, `${walked.map((w) => w.person.name).join(' & ')} walked out! Combo lost.`);
  }

  // New arrivals, one seat at a time.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0 && state.customers.length < MAX_SEATS) {
    if (newCustomer(state)) events |= EV_NEW_CUSTOMER;
    state.spawnIn = SPAWN_SECONDS[state.level];
  }

  // End of shift.
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.over = true;
    state.won = state.money >= SHIFT.targetMoney;
    events |= state.won ? EV_WIN : EV_LOSE;
  } else if (state.walkouts >= SHIFT.maxWalkouts) {
    state.over = true;
    state.won = false;
    events |= EV_LOSE;
    flash(state, 'Too many walkouts — the shift is over.');
  }
  return events;
}

// Burn tracking lives outside the job: when a cooked item sits in a stove
// output slot, `burnT` counts up; past JOB.burnSeconds the item is ruined.
export function burnTick(state, dt) {
  let events = EV_NONE;
  state.stoveOutput.forEach((item, i) => {
    if (!item || item === 'burnt') return;
    state._burnT = state._burnT || [0, 0];
    state._burnT[i] += dt;
    if (state._burnT[i] > JOB.burnSeconds) {
      state.stoveOutput[i] = 'burnt';
      state._burnT[i] = 0;
      events |= EV_BURNT;
      flash(state, 'Left too long — it burnt! Click the stove to bin it.');
    }
  });
  // Reset the burn clock when a slot is picked up.
  state.stoveOutput.forEach((item, i) => {
    if (!item && state._burnT) state._burnT[i] = 0;
  });
  return events;
}

export { FIELD };
