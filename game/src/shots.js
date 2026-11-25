// Rush Kitchen — shots: deterministic staged scenes for the screenshots.
// ?shot=start|play|rush|end (with &seed=) paints one fixed scene instead of
// running the loop, twice, then sets window.__shotReady. The scenes are built
// from the real state objects, so every pixel in a screenshot is a pixel the
// live game can produce — nothing is mocked or drawn only for the camera.

import { CUSTOMERS, RECIPES } from './data.js';
import { createState } from './state.js';

function customerAt(state, seat, personIndex, recipeId, patience, patienceMax) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  state.customers.push({ seat, person: CUSTOMERS[personIndex], recipe, patience, patienceMax });
}

// A busy kitchen behind the title: three customers, three tickets, a patty
// on the stove and lettuce on the board — the game already mid-shift.
export function stageStart() {
  const state = createState();
  state.timeLeft = 180;
  state.money = 0;
  state.score = 0;
  customerAt(state, 0, 0, 'burger', 44, 52);
  customerAt(state, 1, 1, 'salad', 30, 52);
  customerAt(state, 2, 3, 'burger', 18, 52);
  state.stove[0] = { kind: 'cook', id: 'patty', t: 2.1, total: 3.5, done: false, burnt: false };
  state.chop = { kind: 'chop', id: 'lettuce', t: 1.2, total: 2.0, done: false };
  state.hand = 'bun';
  return { state, screen: 'title' };
}

// Mid-shift in full flow: timer 2:14, $86 banked, combo x3, three orders,
// a patty 62% cooked, fries on stove 2, chopped lettuce waiting on the board,
// and a plate holding bun + cooked patty — one tomato from a served burger.
export function stagePlay() {
  const state = createState();
  state.elapsed = 46;
  state.level = 2;
  state.timeLeft = 134;
  state.money = 86;
  state.score = 1240;
  state.served = 7;
  state.combo = 3;
  state.bestCombo = 4;
  customerAt(state, 0, 0, 'burger', 38, 46);
  customerAt(state, 1, 2, 'cheeseburger', 22, 46);
  customerAt(state, 2, 4, 'salad', 41, 46);
  state.stove[0] = { kind: 'cook', id: 'patty', t: 2.2, total: 3.5, done: false, burnt: false };
  state.stove[1] = { kind: 'cook', id: 'fries', t: 0.9, total: 3.0, done: false, burnt: false };
  state.chopOutput = 'lettuce-chopped';
  state.plate = ['bun', 'patty-cooked'];
  state.hand = 'tomato';
  return { state, screen: 'play' };
}

// The final minute: 47 seconds left, $118 of the $120 target, combo x5, four
// orders, rush-hour banner up, one customer almost out of patience.
export function stageRush() {
  const state = createState();
  state.elapsed = 133;
  state.level = 3;
  state.timeLeft = 47;
  state.money = 118;
  state.score = 2310;
  state.served = 11;
  state.combo = 5;
  state.bestCombo = 5;
  state.rushBannerT = 3;
  customerAt(state, 0, 5, 'cheeseburger', 9, 40);
  customerAt(state, 1, 6, 'fries', 26, 40);
  customerAt(state, 2, 0, 'burger', 33, 40);
  customerAt(state, 3, 3, 'salad', 15, 40);
  state.stove[0] = { kind: 'cook', id: 'patty', t: 3.1, total: 3.5, done: false, burnt: false };
  state.chop = { kind: 'chop', id: 'cheese', t: 0.6, total: 2.0, done: false };
  state.plate = ['bun', 'patty-cooked', 'cheese-chopped'];
  state.hand = 'tomato';
  return { state, screen: 'play' };
}

// The win screen: target beaten, 13 served, best combo x6.
export function stageEnd() {
  const state = createState();
  state.timeLeft = 0;
  state.money = 142;
  state.score = 2980;
  state.served = 13;
  state.walkouts = 1;
  state.combo = 0;
  state.bestCombo = 6;
  state.over = true;
  state.won = true;
  customerAt(state, 0, 1, 'burger', 30, 40);
  return { state, screen: 'over' };
}

export function stageShot(name) {
  if (name === 'play') return stagePlay();
  if (name === 'rush') return stageRush();
  if (name === 'end') return stageEnd();
  return stageStart();
}
