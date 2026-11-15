// Procedural WebAudio: every sound and the music loop are synthesised here, so
// the game ships no audio files at all. All calls are safe before the first
// user gesture — the context is created lazily and failures are swallowed.
let ctx = null;
let master = null;
let musicTimer = null;
let muted = false;
let musicStep = 0;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function initAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  return !!c;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), c.currentTime + dur);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch {
    /* audio is decoration; never break the game */
  }
}

function noise(dur, vol, lowpass) {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  } catch {
    /* ignore */
  }
}

export const sfx = {
  shoot() { tone(720, 0.08, 'square', 0.08, 340); },
  hit() { noise(0.08, 0.12, 1800); },
  kill() { tone(320, 0.18, 'triangle', 0.16, 60); noise(0.12, 0.1, 900); },
  hurt() { tone(160, 0.25, 'sawtooth', 0.2, 70); },
  pickup() { tone(880, 0.09, 'sine', 0.14, 1320); },
  heart() { tone(523, 0.12, 'sine', 0.16); setTimeout(() => tone(784, 0.16, 'sine', 0.16), 90); },
  dash() { noise(0.16, 0.14, 3200); },
  waveClear() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.14), i * 90)); },
  boss() { tone(98, 0.6, 'sawtooth', 0.2, 49); tone(147, 0.6, 'sawtooth', 0.12, 73); },
  upgrade() { [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.14), i * 70)); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.15), i * 120)); },
  gameOver() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.32, 'triangle', 0.15), i * 160)); },
};

// A slow minor-key lantern waltz: a bass note and a plucked fifth each step.
const BASS = [110, 87.31, 130.81, 98];
const PLUCK = [220, 261.63, 329.63, 392, 329.63, 261.63];

export function startMusic() {
  if (musicTimer || !ensure()) return;
  musicTimer = setInterval(() => {
    if (muted || !ctx || ctx.state !== 'running') return;
    const bar = Math.floor(musicStep / 8) % BASS.length;
    if (musicStep % 8 === 0) tone(BASS[bar], 1.4, 'sine', 0.1);
    if (musicStep % 2 === 0) tone(PLUCK[musicStep % PLUCK.length], 0.5, 'triangle', 0.045);
    musicStep += 1;
  }, 300);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
