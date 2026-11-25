// Rush Kitchen — data: every tuning number, ingredient and recipe in one place.
// The kitchen is a fixed 1280x720 logical field; the renderer scales it, so no
// rule here depends on the window size. All art is drawn vector shapes + text,
// so the game needs no image, font or network file at all.

export const FIELD = { width: 1280, height: 720 };

// One shift lasts three minutes. Earn the target before the clock hits zero.
export const SHIFT = { seconds: 180, targetMoney: 120, maxWalkouts: 3 };
export const MAX_SEATS = 4;

// A station job takes a fixed number of seconds; rush hour shortens patience,
// never the job times, so the game stays fair when it gets fast.
export const JOB = { chopSeconds: 2.0, pattySeconds: 3.5, friesSeconds: 3.0, burnSeconds: 8.0 };

// Ingredients. `prep` is what the pantry item must become before it can be
// plated: "ready" goes straight on the plate, "chop" needs the board,
// "cook" needs a stove. `cookSeconds` only applies to cook items.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     short: 'BUN',  prep: 'ready', color: '#e8b06a', dark: '#b97f36', price: 0 },
  { id: 'patty',   name: 'Patty',   short: 'PATY', prep: 'cook',  cookSeconds: JOB.pattySeconds, color: '#8a5a3b', dark: '#5d3a24', price: 0 },
  { id: 'lettuce', name: 'Lettuce', short: 'LETC', prep: 'chop',  color: '#7bc950', dark: '#4c8a2f', price: 0 },
  { id: 'tomato',  name: 'Tomato',  short: 'TOMA', prep: 'chop',  color: '#e5534b', dark: '#a92e28', price: 0 },
  { id: 'cheese',  name: 'Cheese',  short: 'CHEE', prep: 'chop',  color: '#f2c94c', dark: '#c39a1d', price: 0 },
  { id: 'fries',   name: 'Fries',   short: 'FRIE', prep: 'cook',  cookSeconds: JOB.friesSeconds, color: '#f2d06b', dark: '#b98d2e', price: 0 },
];

// A prepared item is the pantry id plus its finished state: "bun" is ready as
// picked, "patty-cooked" and "lettuce-chopped" are the plated forms.
export function preparedId(ingredientId) {
  if (ingredientId === 'patty' || ingredientId === 'fries') return ingredientId + '-cooked';
  if (ingredientId === 'lettuce' || ingredientId === 'tomato' || ingredientId === 'cheese') return ingredientId + '-chopped';
  return ingredientId;
}

export function ingredientOf(prepared) {
  return INGREDIENTS.find((i) => prepared === i.id || prepared === i.id + '-cooked' || prepared === i.id + '-chopped');
}

// The four recipes. `needs` lists prepared ids; order does not matter, the
// plate matches when its set equals the recipe's set. `unlockLevel` gates the
// harder dishes so the first minute teaches the loop with two recipes only.
export const RECIPES = [
  { id: 'burger',      name: 'Classic Burger', short: 'BURGER', price: 12, needs: ['bun', 'patty-cooked', 'lettuce-chopped'], unlockLevel: 1, color: '#e8b06a' },
  { id: 'salad',       name: 'Garden Salad',   short: 'SALAD',  price: 9,  needs: ['lettuce-chopped', 'tomato-chopped', 'cheese-chopped'], unlockLevel: 1, color: '#7bc950' },
  { id: 'cheeseburger', name: 'Cheese Melt',   short: 'MELT',   price: 14, needs: ['bun', 'patty-cooked', 'cheese-chopped', 'tomato-chopped'], unlockLevel: 2, color: '#f2c94c' },
  { id: 'fries',       name: 'Crispy Fries',   short: 'FRIES',  price: 6,  needs: ['fries-cooked'], unlockLevel: 2, color: '#f2d06b' },
];

export function unlockedRecipes(level) {
  return RECIPES.filter((r) => r.unlockLevel <= level);
}

// Customers. Names are original; patience and spawn speed tighten each level.
export const CUSTOMERS = [
  { name: 'Maya',  color: '#f2a541', skin: '#f2c89b' },
  { name: 'Riko',  color: '#4fc3f7', skin: '#c98d5f' },
  { name: 'Sari',  color: '#e5538a', skin: '#f2c89b' },
  { name: 'Bimo',  color: '#7bc950', skin: '#8a5a3b' },
  { name: 'Lala',  color: '#9b7ede', skin: '#f2c89b' },
  { name: 'Danu',  color: '#e5534b', skin: '#c98d5f' },
  { name: 'Nina',  color: '#39c0a8', skin: '#f2c89b' },
  { name: 'Arka',  color: '#f28c38', skin: '#8a5a3b' },
];

// Level = rush-hour stage. Level rises every 45 seconds of the shift.
export function levelAt(elapsedSeconds) {
  return Math.min(4, 1 + Math.floor(elapsedSeconds / 45));
}

// Seconds between customer arrivals at each level (first arrival is faster,
// so the board is never empty at the start).
export const SPAWN_SECONDS = { 1: 13, 2: 11, 3: 9, 4: 8 };

// How long a customer waits before storming out, at each level.
export const PATIENCE_SECONDS = { 1: 52, 2: 46, 3: 40, 4: 34 };

// Tip: serve fast and the customer pays up to +50% on top of the menu price.
export function tipFor(price, patienceLeft, patienceMax) {
  const fraction = Math.max(0, patienceLeft / patienceMax);
  return Math.round(price * 0.5 * fraction);
}

// Combo: each consecutive serve within the patience window raises the
// multiplier by one step, capped at x5. A walkout or a wrong serve resets it.
export function comboMultiplier(combo) {
  return 1 + Math.min(combo, 8) * 0.1;
}

export const PALETTE = {
  wall: '#3d2b1f', wallTop: '#57402c', floor: '#2c2118', counter: '#8a5a3b',
  counterTop: '#a9744f', steel: '#b9c2cc', steelDark: '#7d8794', board: '#d9a05b',
  plate: '#f4f1e8', ticket: '#fff7d6', ticketEdge: '#d9c27a', ink: '#2b2118',
  cream: '#f7ead1', red: '#e5534b', green: '#7bc950', gold: '#f2c94c',
  blue: '#4fc3f7', purple: '#9b7ede', muted: '#b09a7d', dark: '#241a12',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'rush-kitchen.best';
