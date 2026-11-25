// Rush Kitchen — audio: all sounds are synthesized with WebAudio, so the
// game ships zero audio files and makes zero network requests. The context
// is created lazily on the first user gesture (browsers block autoplay).

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  pick() { tone(520, 0.07, 'triangle', 0.08); },
  chop() { tone(180, 0.08, 'square', 0.07); tone(140, 0.08, 'square', 0.07, 0.09); },
  sizzle() { tone(900, 0.25, 'sawtooth', 0.03); tone(1200, 0.2, 'sawtooth', 0.02, 0.08); },
  ding() { tone(880, 0.15, 'sine', 0.14); tone(1320, 0.25, 'sine', 0.12, 0.1); },
  serve() { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.12, 'triangle', 0.12, 0.09); tone(1100, 0.2, 'triangle', 0.12, 0.18); },
  wrong() { tone(160, 0.2, 'square', 0.08); },
  walkout() { tone(220, 0.3, 'sawtooth', 0.09); tone(180, 0.35, 'sawtooth', 0.09, 0.15); },
  levelUp() { tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12, 0.1); tone(784, 0.25, 'triangle', 0.12, 0.2); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, i * 0.13)); },
  lose() { [400, 350, 300, 220].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.16)); },
};
