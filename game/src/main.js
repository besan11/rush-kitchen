// Rush Kitchen — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, over. ?shot=start|play|rush|end stages one
// fixed scene for a screenshot instead of running the loop, paints it twice
// and sets window.__shotReady.

import { BEST_KEY } from './data.js';
import { draw } from './render.js';
import { clickAction, keyAction, toLogical } from './input.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import {
  EV_BURNT, EV_CHOP_START, EV_COOK_START, EV_JOB_DONE, EV_LEVEL_UP,
  EV_LOSE, EV_NEW_CUSTOMER, EV_SERVED, EV_WALKOUT, EV_WIN, EV_WRONG,
  addToPlate, burnTick, clearBurnt, createState, plateFromHand, serveTo,
  step, takeFromPantry, trashHandAndPlate, useChopBoard, useStove,
} from './state.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode: best lasts this visit only */ }
}

function runShot(name) {
  const scene = stageShot(name);
  const best = Math.max(readBest(), scene.state.score);
  let painted = 0;
  function paint() {
    draw(scene.state, scene.screen, { canvas, best, muted: isMuted() });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let state = createState();
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let serveArmed = false; // the SERVE bell was clicked: next seat click serves

  function announce(message) { status.textContent = message; }

  function startGame() {
    state = createState();
    serveArmed = false;
    accumulator = 0;
    screen = 'play';
    announce('Playing. Serve $120 before the 3-minute timer ends.');
  }

  function endGame() {
    screen = 'over';
    if (state.score > best) { best = state.score; saveBest(best); }
    announce(state.won
      ? `Shift complete! You earned $${state.money}. Score ${state.score}.`
      : `Shift over. You earned $${state.money} of $120. Score ${state.score}.`);
  }

  function playEvents(events) {
    if (events & EV_SERVED) sfx.serve();
    if (events & EV_JOB_DONE) sfx.ding();
    if (events & EV_CHOP_START) sfx.chop();
    if (events & EV_COOK_START) sfx.sizzle();
    if (events & EV_WRONG) sfx.wrong();
    if (events & EV_BURNT) sfx.wrong();
    if (events & EV_WALKOUT) sfx.walkout();
    if (events & EV_LEVEL_UP) sfx.levelUp();
    if (events & EV_NEW_CUSTOMER) sfx.pick();
    if (events & EV_WIN) sfx.win();
    if (events & EV_LOSE) sfx.lose();
    if (events & (EV_WIN | EV_LOSE)) endGame();
  }

  // One action from mouse or keyboard, routed by screen.
  function doAction(action) {
    if (!action) return;
    if (action.type === 'mute') { toggleMute(); return; }
    if (action.type === 'pause') {
      if (screen === 'play') { screen = 'paused'; announce('Paused.'); }
      else if (screen === 'paused') { screen = 'play'; announce('Playing.'); }
      return;
    }
    if (action.type === 'restart') { if (screen === 'over') startGame(); return; }
    if (action.type === 'confirm') {
      if (screen === 'title' || screen === 'over') startGame();
      else if (screen === 'paused') { screen = 'play'; announce('Playing.'); }
      return;
    }
    if (screen !== 'play') return;
    let events = 0;
    switch (action.type) {
      case 'pantry': events = takeFromPantry(state, action.id); if (!events) sfx.pick(); break;
      case 'chop': events = useChopBoard(state); break;
      case 'stove':
        if (state.stoveOutput[action.index] === 'burnt') clearBurnt(state, action.index);
        else events = useStove(state, action.index);
        break;
      case 'plate': events = plateFromHand(state); if (!events) sfx.pick(); break;
      case 'serve': serveArmed = true; announce('Serve armed — click a customer.'); break;
      case 'seat': events = serveTo(state, action.seat); serveArmed = false; break;
      case 'trash': events = trashHandAndPlate(state); break;
      default: break;
    }
    playEvents(events);
    if (state.message) announce(state.message);
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLogical(canvas, e.clientX, e.clientY);
    doAction(clickAction(p.x, p.y, screen));
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    doAction(keyAction(e.code, e.key));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') { screen = 'paused'; announce('Paused.'); }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === 'play') {
      while (accumulator >= STEP) {
        const events = step(state, STEP) | burnTick(state, STEP);
        playEvents(events);
        accumulator -= STEP;
        if (screen !== 'play') { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
    }
    draw(state, screen, { canvas, best, muted: isMuted() });
  }

  announce('Rush Kitchen. Press Space or click to start your shift.');
  // Tiny read-only handle for automated checks (screenshots, play-tests).
  window.__rush = { get state() { return state; }, get screen() { return screen; } };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
