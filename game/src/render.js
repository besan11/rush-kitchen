// Rush Kitchen — render: everything on screen is drawn on one canvas.
// Layout (1280x720 logical): HUD bar, order tickets, customer seats, four
// stations, pantry, plate + serve, help strip. Every live system is visible
// at once — that is the point: the cover screenshot is the game in action.

import { FIELD, FONT, INGREDIENTS, MAX_SEATS, PALETTE, RECIPES, SHIFT, unlockedRecipes } from './data.js';

const W = FIELD.width;
const H = FIELD.height;

// Hit zones, shared with input.js through this one export so clicks and
// drawing can never drift apart.
export const ZONES = {
  pantry: INGREDIENTS.map((ing, i) => ({ id: ing.id, x: 24 + i * 106, y: 556, w: 96, h: 76 })),
  chop: { x: 24, y: 300, w: 250, h: 150 },
  stove: [{ x: 298, y: 300, w: 250, h: 150 }, { x: 572, y: 300, w: 250, h: 150 }],
  plate: { x: 846, y: 300, w: 210, h: 150 },
  serve: { x: 1080, y: 300, w: 176, h: 150 },
  trash: { x: 1080, y: 556, w: 84, h: 76 },
  mute: { x: 1176, y: 556, w: 80, h: 76 },
  pause: { x: 1080, y: 640, w: 176, h: 56 },
  seats: [0, 1, 2, 3].map((s) => ({ seat: s, x: 24 + s * 318, y: 158, w: 300, h: 128 })),
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back = '#00000055') {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (frac > 0) {
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

// --- Ingredient icons: drawn vector food, no image files. -------------------
export function drawIngredient(ctx, id, cx, cy, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r, r * 0.62, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f7d9a0';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.8, r * 0.42, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff3d0';
    [[-0.45, -0.45], [0, -0.55], [0.45, -0.45], [-0.2, -0.3], [0.25, -0.3]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.ellipse(dx * r, dy * r, r * 0.09, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#c98d4e';
    rr(ctx, -r, r * 0.28, r * 2, r * 0.42, r * 0.2); ctx.fill();
  } else if (id === 'patty' || id === 'patty-cooked') {
    ctx.fillStyle = id === 'patty-cooked' ? '#6b4226' : '#a9714e';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00000022';
    ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.8, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (id === 'patty-cooked') {
      ctx.strokeStyle = '#d9a05b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(r * 0.4, r * 0.15); ctx.stroke();
    }
  } else if (id === 'lettuce' || id === 'lettuce-chopped') {
    ctx.fillStyle = '#7bc950';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rad = r * (i % 2 ? 0.75 : 1);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad * 0.7);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4c8a2f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5); ctx.stroke();
  } else if (id === 'tomato' || id === 'tomato-chopped') {
    ctx.fillStyle = '#e5534b';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7bc950';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.75, r * 0.3, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff88';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'cheese' || id === 'cheese-chopped') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(r, r * 0.6); ctx.lineTo(0, -r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c39a1d';
    [[-0.3, 0.2], [0.25, 0.05], [0, 0.35]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.11, 0, Math.PI * 2); ctx.fill();
    });
  } else if (id === 'fries' || id === 'fries-cooked') {
    ctx.fillStyle = '#e5534b';
    rr(ctx, -r * 0.75, -r * 0.2, r * 1.5, r * 0.9, 4); ctx.fill();
    ctx.fillStyle = id === 'fries-cooked' ? '#f2c94c' : '#f7d774';
    for (let i = -2; i <= 2; i++) {
      rr(ctx, i * r * 0.28 - r * 0.09, -r * 0.95 + (Math.abs(i) % 2) * r * 0.12, r * 0.18, r * 0.85, 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(r * 0.5)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FRIES', 0, r * 0.35);
  } else if (id === 'burnt') {
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.4, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.2, r * 0.26, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFace(ctx, person, cx, cy, r, mood) {
  // Chef-hat customer: circle face, hat, eyes; mood changes the mouth.
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.95, r * 0.62, 0, Math.PI * 2); ctx.fill();
  rr(ctx, cx - r * 0.62, cy - r * 1.35, r * 1.24, r * 0.5, r * 0.2);
  ctx.fillStyle = '#f4f1e8'; ctx.fill();
  ctx.fillStyle = person.skin;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241a12';
  ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#241a12'; ctx.lineWidth = 2.5; ctx.beginPath();
  if (mood === 'happy') { ctx.arc(cx, cy + r * 0.15, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI); }
  else if (mood === 'angry') { ctx.arc(cx, cy + r * 0.65, r * 0.4, 1.15 * Math.PI, 1.85 * Math.PI); }
  else { ctx.moveTo(cx - r * 0.3, cy + r * 0.35); ctx.lineTo(cx + r * 0.3, cy + r * 0.35); }
  ctx.stroke();
  ctx.fillStyle = person.color;
  rr(ctx, cx - r * 1.05, cy + r * 0.75, r * 2.1, r * 0.55, r * 0.2); ctx.fill();
}

function stationFrame(ctx, z, title, sub, accent) {
  rr(ctx, z.x, z.y, z.w, z.h, 12);
  ctx.fillStyle = '#3d2b1f'; ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, title, z.x + z.w / 2, z.y + 22, 17, '#f7ead1', 'center');
  text(ctx, sub, z.x + z.w / 2, z.y + 42, 11, PALETTE.muted, 'center');
}

export function draw(state, screen, opts = {}) {
  const { canvas } = opts;
  const ctx = canvas.getContext('2d');
  const best = opts.best || 0;
  const muted = !!opts.muted;
  ctx.clearRect(0, 0, W, H);

  // Wall + floor.
  ctx.fillStyle = PALETTE.wallTop; ctx.fillRect(0, 0, W, 158);
  ctx.fillStyle = PALETTE.wall; ctx.fillRect(0, 158, W, 132);
  ctx.fillStyle = PALETTE.floor; ctx.fillRect(0, 290, W, H - 290);
  ctx.fillStyle = '#00000022'; ctx.fillRect(0, 286, W, 6);
  text(ctx, '🍳  RUSH KITCHEN', 24, 30, 26, '#f7ead1');
  text(ctx, '4 stations · 4 recipes · 6 ingredients · every second counts', 24, 54, 12, PALETTE.muted, 'left', false);

  // HUD: timer, money/target, score, combo, level, walkouts.
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60).toString().padStart(2, '0');
  const lowTime = state.timeLeft <= 30;
  text(ctx, `${mm}:${ss}`, 640, 30, 34, lowTime ? '#ff6b5e' : '#f7ead1', 'center');
  text(ctx, lowTime ? 'TIME LOW!' : 'SHIFT TIMER', 640, 56, 11, lowTime ? '#ff6b5e' : PALETTE.muted, 'center');
  text(ctx, `$${state.money} / $${SHIFT.targetMoney}`, 830, 28, 26, state.money >= SHIFT.targetMoney ? '#7bc950' : '#f2c94c', 'center');
  text(ctx, 'EARNED / TARGET', 830, 54, 11, PALETTE.muted, 'center');
  text(ctx, `SCORE ${state.score}`, 1010, 24, 16, '#f7ead1', 'center');
  text(ctx, `BEST ${Math.max(best, state.score)}`, 1010, 46, 11, PALETTE.muted, 'center');
  const comboColor = state.combo >= 5 ? '#ff9f1c' : state.combo >= 2 ? '#f2c94c' : '#b09a7d';
  rr(ctx, 1108, 8, 148, 48, 10);
  ctx.fillStyle = '#241a12'; ctx.fill();
  ctx.strokeStyle = comboColor; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO —', 1182, 24, 17, comboColor, 'center');
  text(ctx, `LVL ${state.level} · SERVED ${state.served}`, 1182, 44, 11, PALETTE.muted, 'center');
  // Walkout hearts.
  for (let i = 0; i < SHIFT.maxWalkouts; i++) {
    text(ctx, i < SHIFT.maxWalkouts - state.walkouts ? '❤' : '♡', 470 + i * 26, 30, 20, '#e5534b', 'center');
  }
  text(ctx, 'WALKOUTS', 470, 56, 10, PALETTE.muted, 'center');

  // Order tickets rail.
  text(ctx, 'ORDER BOARD — click a customer to serve the matching plate', 24, 78, 13, '#f2c94c');
  text(ctx, unlockedRecipes(state.level).map((r) => `${r.short} $${r.price}`).join('   ·   '), 1256, 78, 12, PALETTE.muted, 'right', false);
  state.customers.forEach((c) => {
    const x = 24 + c.seat * 318;
    const frac = Math.max(0, c.patience / c.patienceMax);
    const urgent = frac < 0.35;
    rr(ctx, x, 92, 300, 58, 8);
    ctx.fillStyle = PALETTE.ticket; ctx.fill();
    ctx.strokeStyle = urgent ? '#e5534b' : PALETTE.ticketEdge; ctx.lineWidth = urgent ? 3 : 2; ctx.stroke();
    text(ctx, `#${c.seat + 1} ${c.person.name}`, x + 12, 108, 14, PALETTE.ink);
    text(ctx, c.recipe.name, x + 12, 128, 15, '#8a4b12');
    text(ctx, `$${c.recipe.price}`, x + 288, 108, 15, '#2b7a2b', 'right');
    c.recipe.needs.forEach((need, i) => {
      drawIngredient(ctx, need, x + 150 + i * 34, 128, 26);
    });
    bar(ctx, x + 12, 140, 276, 7, frac, urgent ? '#e5534b' : frac < 0.6 ? '#f2c94c' : '#7bc950', '#00000022');
  });
  for (let s = state.customers.length; s < MAX_SEATS; s++) {
    const x = 24 + s * 318;
    rr(ctx, x, 92, 300, 58, 8);
    ctx.fillStyle = '#ffffff14'; ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = '#ffffff33'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'EMPTY SEAT — next customer soon', x + 150, 121, 12, '#ffffff88', 'center', false);
  }

  // Customer seats.
  state.customers.forEach((c) => {
    const z = ZONES.seats[c.seat];
    const frac = c.patience / c.patienceMax;
    const mood = frac < 0.3 ? 'angry' : frac < 0.6 ? 'flat' : 'happy';
    rr(ctx, z.x, z.y, z.w, z.h, 12);
    ctx.fillStyle = '#57402c'; ctx.fill();
    ctx.strokeStyle = frac < 0.3 ? '#e5534b' : '#00000000'; ctx.lineWidth = 3; ctx.stroke();
    drawFace(ctx, c.person, z.x + 62, z.y + 58, 42, mood);
    text(ctx, c.person.name, z.x + 122, z.y + 30, 18, '#f7ead1');
    text(ctx, `wants ${c.recipe.name}`, z.x + 122, z.y + 54, 13, '#f2c94c', 'left', false);
    text(ctx, c.recipe.needs.map((n) => INGREDIENTS.find((i) => n.startsWith(i.id)).short).join(' + '), z.x + 122, z.y + 76, 12, PALETTE.muted, 'left', false);
    bar(ctx, z.x + 122, z.y + 94, 164, 10, frac, frac < 0.3 ? '#e5534b' : '#7bc950');
    text(ctx, `${Math.ceil(c.patience)}s`, z.x + 122, z.y + 112, 11, frac < 0.3 ? '#ff6b5e' : PALETTE.muted, 'left', false);
    text(ctx, 'CLICK TO SERVE', z.x + 286, z.y + 112, 10, '#4fc3f7', 'right', false);
  });
  for (let s = 0; s < MAX_SEATS; s++) {
    if (state.customers.some((c) => c.seat === s)) continue;
    const z = ZONES.seats[s];
    rr(ctx, z.x, z.y, z.w, z.h, 12);
    ctx.fillStyle = '#00000022'; ctx.fill();
    text(ctx, '— empty —', z.x + z.w / 2, z.y + z.h / 2, 13, '#ffffff55', 'center', false);
  }

  // Stations.
  const chop = ZONES.chop;
  stationFrame(ctx, chop, '🔪 CHOP BOARD', state.chop ? 'chopping…' : 'click with lettuce / tomato / cheese', '#7bc950');
  if (state.chop) {
    drawIngredient(ctx, state.chop.id, chop.x + chop.w / 2, chop.y + 88, 56);
    bar(ctx, chop.x + 30, chop.y + 122, chop.w - 60, 12, state.chop.t / state.chop.total, '#7bc950');
    text(ctx, `${Math.ceil(state.chop.total - state.chop.t)}s`, chop.x + chop.w / 2, chop.y + 104, 12, '#f7ead1', 'center', false);
  } else if (state.chopOutput) {
    drawIngredient(ctx, state.chopOutput, chop.x + chop.w / 2, chop.y + 88, 56);
    text(ctx, 'READY — click to pick up', chop.x + chop.w / 2, chop.y + 128, 12, '#7bc950', 'center');
  } else {
    text(ctx, 'empty board', chop.x + chop.w / 2, chop.y + 95, 14, PALETTE.muted, 'center', false);
  }

  ZONES.stove.forEach((st, i) => {
    const job = state.stove[i];
    const out = state.stoveOutput[i];
    stationFrame(ctx, st, `🍳 STOVE ${i + 1}`, job ? 'cooking…' : out ? (out === 'burnt' ? 'BURNT — click to bin' : 'ready — click to pick up') : 'click with patty / fries', '#f28c38');
    // Pot.
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.ellipse(st.x + st.w / 2, st.y + 92, 62, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = job ? '#c96a2e' : out === 'burnt' ? '#1a1512' : out ? '#7a4a22' : '#4a3826';
    ctx.beginPath(); ctx.ellipse(st.x + st.w / 2, st.y + 88, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
    if (job) {
      drawIngredient(ctx, job.id, st.x + st.w / 2, st.y + 82, 40);
      bar(ctx, st.x + 30, st.y + 122, st.w - 60, 12, job.t / job.total, '#f28c38');
    } else if (out) {
      drawIngredient(ctx, out, st.x + st.w / 2, st.y + 82, 44);
      if (out === 'burnt') text(ctx, '🔥 BURNT', st.x + st.w / 2, st.y + 126, 13, '#ff6b5e', 'center');
    } else {
      text(ctx, 'cold stove', st.x + st.w / 2, st.y + 88, 12, PALETTE.muted, 'center', false);
    }
  });

  const plate = ZONES.plate;
  stationFrame(ctx, plate, '🍽 PLATE', 'click with a ready item to add it', '#f2c94c');
  ctx.fillStyle = PALETTE.plate;
  ctx.beginPath(); ctx.ellipse(plate.x + plate.w / 2, plate.y + 92, 78, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9bfa5'; ctx.lineWidth = 2; ctx.stroke();
  state.plate.forEach((item, i) => {
    drawIngredient(ctx, item, plate.x + 52 + i * 42, plate.y + 88, 34);
  });
  if (!state.plate.length) text(ctx, 'empty plate', plate.x + plate.w / 2, plate.y + 92, 12, '#8a7a5f', 'center', false);
  const match = RECIPES.find((r) => r.needs.length === state.plate.length && r.needs.every((n) => state.plate.includes(n)));
  text(ctx, match ? `✓ ${match.name} — $${match.price}` : state.plate.length ? 'no order matches yet' : 'build a dish here', plate.x + plate.w / 2, plate.y + 132, 12, match ? '#2b7a2b' : PALETTE.muted, 'center');

  const serve = ZONES.serve;
  stationFrame(ctx, serve, '🔔 SERVE', 'then click a customer', '#4fc3f7');
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath(); ctx.arc(serve.x + serve.w / 2, serve.y + 84, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c39a1d';
  ctx.fillRect(serve.x + serve.w / 2 - 34, serve.y + 108, 68, 8);
  text(ctx, 'DING!', serve.x + serve.w / 2, serve.y + 84, 14, '#7a5a00', 'center');
  text(ctx, state.plate.length ? 'plate ready — pick a seat' : 'serve a full plate', serve.x + serve.w / 2, serve.y + 132, 11, PALETTE.muted, 'center');

  // Pantry.
  text(ctx, 'PANTRY — click an ingredient to pick it up  (keys 1–6)', 24, 546, 13, '#f7ead1');
  text(ctx, state.hand ? `IN HAND: ${state.hand.replace('-cooked', ' (cooked)').replace('-chopped', ' (chopped)').toUpperCase()}` : 'HAND: empty', 700, 546, 13, state.hand ? '#f2c94c' : PALETTE.muted, 'left');
  ZONES.pantry.forEach((z) => {
    const ing = INGREDIENTS.find((i) => i.id === z.id);
    const inHand = state.hand === ing.id;
    rr(ctx, z.x, z.y, z.w, z.h, 10);
    ctx.fillStyle = inHand ? '#f2c94c' : '#57402c'; ctx.fill();
    ctx.strokeStyle = inHand ? '#fff' : '#00000000'; ctx.lineWidth = 3; ctx.stroke();
    drawIngredient(ctx, ing.id, z.x + z.w / 2, z.y + 30, 40);
    text(ctx, ing.name, z.x + z.w / 2, z.y + 58, 12, inHand ? '#241a12' : '#f7ead1', 'center');
    text(ctx, ing.prep === 'ready' ? 'ready' : ing.prep === 'chop' ? 'chop 2s' : `cook ${ing.cookSeconds}s`, z.x + z.w / 2, z.y + 70, 9, inHand ? '#5a4318' : PALETTE.muted, 'center', false);
  });
  // Hand slot + trash + mute.
  const trash = ZONES.trash;
  rr(ctx, trash.x, trash.y, trash.w, trash.h, 10);
  ctx.fillStyle = '#5d2a24'; ctx.fill();
  text(ctx, '🗑', trash.x + trash.w / 2, trash.y + 28, 22, '#f7ead1', 'center');
  text(ctx, 'TRASH [T]', trash.x + trash.w / 2, trash.y + 58, 10, '#f7ead1', 'center');
  const mute = ZONES.mute;
  rr(ctx, mute.x, mute.y, mute.w, mute.h, 10);
  ctx.fillStyle = '#3d2b1f'; ctx.fill();
  text(ctx, muted ? '🔇' : '🔊', mute.x + mute.w / 2, mute.y + 28, 22, '#f7ead1', 'center');
  text(ctx, 'SOUND [M]', mute.x + mute.w / 2, mute.y + 58, 10, '#f7ead1', 'center');

  // Help strip.
  text(ctx, 'HOW TO PLAY: pick ingredient → chop / cook → plate → click the matching customer. Fast serves earn tips; combos pay more.  [P] pause  [R] restart', 24, 656, 13, '#f7ead1', 'left', false);
  const pause = ZONES.pause;
  rr(ctx, pause.x, pause.y, pause.w, pause.h, 10);
  ctx.fillStyle = '#3d2b1f'; ctx.fill();
  text(ctx, screen === 'paused' ? '▶ RESUME [P]' : '⏸ PAUSE [P]', pause.x + pause.w / 2, pause.y + 28, 14, '#f7ead1', 'center');

  // Rush-hour banner.
  if (state.rushBannerT > 0) {
    ctx.fillStyle = '#e5534b';
    rr(ctx, 390, 300, 500, 64, 12); ctx.fill();
    text(ctx, `⚡ RUSH HOUR — LEVEL ${state.level} ⚡`, 640, 332, 26, '#fff', 'center');
  }
  // Toast message.
  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = '#241a12ee';
    const wpx = ctx.measureText(state.message).width + 40;
    rr(ctx, 640 - wpx / 2, 668, wpx, 34, 8); ctx.fill();
    text(ctx, state.message, 640, 686, 14, '#f2c94c', 'center', false);
  }

  // --- Screens ---------------------------------------------------------------
  if (screen === 'title') {
    ctx.fillStyle = '#241a12d9'; ctx.fillRect(0, 0, W, H);
    text(ctx, '🍳', 640, 150, 90, '#f7ead1', 'center');
    text(ctx, 'RUSH KITCHEN', 640, 240, 72, '#f2c94c', 'center');
    text(ctx, 'The 180-second lunch rush. Chop it, cook it, plate it, serve it — before they walk out.', 640, 296, 18, '#f7ead1', 'center', false);
    text(ctx, 'TARGET $120  ·  4 RECIPES  ·  4 STATIONS  ·  COMBO TIPS UP TO +50%', 640, 330, 15, '#7bc950', 'center');
    text(ctx, 'MOUSE: click pantry → station → plate → customer      KEYS: 1–6 pantry · Q chop · W/E stoves · A plate · S serve · T trash', 640, 380, 14, PALETTE.muted, 'center', false);
    ctx.fillStyle = '#f2c94c';
    rr(ctx, 490, 410, 300, 64, 12); ctx.fill();
    text(ctx, '▶  START SHIFT', 640, 443, 24, '#241a12', 'center');
    text(ctx, 'click or press SPACE / ENTER', 640, 500, 13, PALETTE.muted, 'center', false);
    text(ctx, 'An original game — no copied names, art or music. Sound is synthesized live.', 640, 560, 12, PALETTE.muted, 'center', false);
  } else if (screen === 'paused') {
    ctx.fillStyle = '#241a12b8'; ctx.fillRect(0, 0, W, H);
    text(ctx, '⏸ PAUSED', 640, 330, 56, '#f7ead1', 'center');
    text(ctx, 'Press P or click RESUME to keep cooking.', 640, 390, 16, PALETTE.muted, 'center', false);
  } else if (screen === 'over') {
    ctx.fillStyle = '#241a12e0'; ctx.fillRect(0, 0, W, H);
    const won = state.won;
    text(ctx, won ? '🎉 SHIFT COMPLETE!' : '😖 SHIFT OVER', 640, 190, 56, won ? '#7bc950' : '#ff6b5e', 'center');
    text(ctx, won ? `You beat the $${SHIFT.targetMoney} target with $${state.money}!` : state.walkouts >= SHIFT.maxWalkouts ? 'Too many customers walked out.' : `You earned $${state.money} of the $${SHIFT.targetMoney} target.`, 640, 250, 18, '#f7ead1', 'center', false);
    text(ctx, `SERVED ${state.served}   ·   SCORE ${state.score}   ·   BEST COMBO x${state.bestCombo}   ·   WALKOUTS ${state.walkouts}`, 640, 310, 18, '#f2c94c', 'center');
    text(ctx, `BEST SCORE ${Math.max(best, state.score)}`, 640, 350, 14, PALETTE.muted, 'center');
    ctx.fillStyle = '#f2c94c';
    rr(ctx, 490, 390, 300, 64, 12); ctx.fill();
    text(ctx, '↻  PLAY AGAIN', 640, 423, 24, '#241a12', 'center');
    text(ctx, 'click or press R / SPACE', 640, 480, 13, PALETTE.muted, 'center', false);
  }
}
