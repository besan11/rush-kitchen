// Rush Kitchen — input: mouse clicks on the shared ZONES plus keyboard.
// The handler translates a pointer position into one game action; it never
// touches state directly except through the callbacks main.js wires up.

import { INGREDIENTS } from './data.js';
import { ZONES } from './render.js';

function inside(x, y, z) {
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
}

// Logical coordinates: the canvas is 1280x720 internally and scaled by CSS,
// so client pixels are mapped back with the canvas bounding rect.
export function toLogical(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * 1280,
    y: ((clientY - r.top) / r.height) * 720,
  };
}

// Returns one of: {type:'pantry', id} {type:'chop'} {type:'stove', index}
// {type:'plate'} {type:'seat', seat} {type:'trash'} {type:'mute'}
// {type:'pause'} {type:'confirm'} or null when the click hit nothing live.
export function clickAction(x, y, screen) {
  if (screen === 'title' || screen === 'over') {
    // The big start / play-again buttons live in the middle of the screen.
    if (x >= 490 && x <= 790 && y >= 410 && y <= 474) return { type: 'confirm' };
    return null;
  }
  if (screen === 'paused') {
    if (inside(x, y, ZONES.pause)) return { type: 'pause' };
    return null;
  }
  for (const z of ZONES.pantry) if (inside(x, y, z)) return { type: 'pantry', id: z.id };
  if (inside(x, y, ZONES.chop)) return { type: 'chop' };
  for (let i = 0; i < 2; i++) if (inside(x, y, ZONES.stove[i])) return { type: 'stove', index: i };
  if (inside(x, y, ZONES.plate)) return { type: 'plate' };
  if (inside(x, y, ZONES.serve)) return { type: 'serve' };
  if (inside(x, y, ZONES.trash)) return { type: 'trash' };
  if (inside(x, y, ZONES.mute)) return { type: 'mute' };
  if (inside(x, y, ZONES.pause)) return { type: 'pause' };
  for (const z of ZONES.seats) if (inside(x, y, z)) return { type: 'seat', seat: z.seat };
  return null;
}

// Keyboard: digits pick pantry items, letters drive stations, P pauses,
// M mutes, R restarts from the end screen, Space/Enter confirms.
export function keyAction(code, key) {
  const digit = ['1', '2', '3', '4', '5', '6'].indexOf(key);
  if (digit >= 0) return { type: 'pantry', id: INGREDIENTS[digit].id };
  switch (code) {
    case 'KeyQ': return { type: 'chop' };
    case 'KeyW': return { type: 'stove', index: 0 };
    case 'KeyE': return { type: 'stove', index: 1 };
    case 'KeyA': return { type: 'plate' };
    case 'KeyS': return { type: 'serve' };
    case 'KeyT': return { type: 'trash' };
    case 'KeyM': return { type: 'mute' };
    case 'KeyP': case 'Escape': return { type: 'pause' };
    case 'KeyR': return { type: 'restart' };
    case 'Space': case 'Enter': return { type: 'confirm' };
    default: return null;
  }
}
