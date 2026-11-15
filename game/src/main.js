// Boot, the fixed-step loop, screen transitions and the ?shot= screenshot mode.
// LUMENKEEPER — Ember of the Last Lantern: survive 10 waves, keep the light lit.
import { FIELD, STEP, BEST_KEY, BEST_WAVE_KEY } from './config.js';
import { liveRng } from './random.js';
import { Input } from './input.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_VICTORY } from './world.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';
import { initAudio, startMusic, toggleMute, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = new Input(canvas);
const world = new World();

function loadBest() {
  try {
    world.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    world.best = 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(Math.max(world.best, world.score)));
    localStorage.setItem(BEST_WAVE_KEY, String(world.wave));
  } catch {
    /* best score is a nicety, not a requirement */
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

// Screenshot mode: ?shot=start|play|upgrade|victory stages a deterministic
// scene, draws one frame and flags window.__shotReady for the capture tool.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  loadBest();
  stageShot(shotName, world);
  drawWorld(ctx, world);
  window.__shotReady = true;
} else {
  loadBest();
  world.reset();
  let last = performance.now();
  let acc = 0;
  let paused = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (paused) {
      input.endFrame();
      return;
    }
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 8) {
      tick(STEP);
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 8) acc = 0;
    drawWorld(ctx, world);
    input.endFrame();
  }

  function tick(dt) {
    const p = world.player;
    if (input.wasPressed('KeyM')) {
      const m = toggleMute();
      announce(m ? 'Sound muted' : 'Sound on');
    }
    if (world.screen === SCREEN_TITLE) {
      world.ambient(dt);
      if (input.wasPressed('Enter') || input.wasPressed('Mouse') || input.wasPressed('Space')) {
        initAudio();
        startMusic();
        world.startRun(Math.floor(liveRng()() * 0xffffffff));
        announce('Wave 1. Hold the light.');
      }
      return;
    }
    if (world.screen === SCREEN_UPGRADE) {
      if (input.wasPressed('Digit1')) world.takeBlessing(world.blessings[0]);
      else if (input.wasPressed('Digit2') && world.blessings[1]) world.takeBlessing(world.blessings[1]);
      else if (input.wasPressed('Digit3') && world.blessings[2]) world.takeBlessing(world.blessings[2]);
      else if (input.wasPressed('Mouse')) {
        const picked = pickCard(input.mouseX, input.mouseY);
        if (picked) world.takeBlessing(picked);
      }
      return;
    }
    if (world.screen === SCREEN_OVER || world.screen === SCREEN_VICTORY) {
      if (world.screen === SCREEN_OVER) saveBest();
      if (input.wasPressed('KeyR') || input.wasPressed('Mouse') || input.wasPressed('Enter')) {
        world.startRun(Math.floor(liveRng()() * 0xffffffff));
        announce('Wave 1. Hold the light.');
      }
      return;
    }
    // SCREEN_PLAY
    if (input.wasPressed('KeyP')) {
      paused = true;
      announce('Paused. Press P to resume.');
      return;
    }
    const move = input.moveVector();
    const aim = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
    world.step(dt, move, aim, input.mouseDown, input.wasPressed('Space'));
    if (world.screen === SCREEN_OVER) saveBest();
  }

  // The three blessing cards drawn by render.js: 300 wide, 30 apart, from y 230.
  function pickCard(mx, my) {
    const cards = world.blessings;
    const w = 300;
    const h = 240;
    const gap = 30;
    const total = cards.length * w + (cards.length - 1) * gap;
    const x0 = (FIELD.width - total) / 2;
    const y0 = 230;
    for (let i = 0; i < cards.length; i += 1) {
      const x = x0 + i * (w + gap);
      if (mx >= x && mx <= x + w && my >= y0 && my <= y0 + h) return cards[i];
    }
    return null;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && paused) {
      paused = false;
      last = performance.now();
      announce('Resumed.');
    }
  });

  // Keep the pause flag honest when the tab hides.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === SCREEN_PLAY) paused = true;
  });

  requestAnimationFrame(frame);
}
