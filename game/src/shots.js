// Screenshot scenes behind ?shot=start|play|upgrade|victory. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (kite away from the nearest enemy, shoot at it, dash when
// it gets too close), so the frame is what a short game really looks like and
// the same seed always gives the same frame. The victory scene is the one
// exception: it stages the run's final state directly (wave 10 cleared) and
// lets the victory screen render over it.
import { STEP } from './config.js';
import { makeRng } from './random.js';
import { SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER } from './world.js';

/** Steer the keeper: away from the closest enemy, toward the arena centre. */
function autopilot(world) {
  const p = world.player;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }
  let mx = 0;
  let my = 0;
  if (nearest) {
    const dx = p.x - nearest.x;
    const dy = p.y - nearest.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = nearestDist < 260 ? 1 : -0.25;
    mx = (dx / d) * want + ((640 - p.x) / 640) * 0.4;
    my = (dy / d) * want + ((360 - p.y) / 360) * 0.4;
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
  }
  const aim = nearest ? Math.atan2(nearest.y - p.y, nearest.x - p.x) : 0;
  const dash = nearestDist < 90 && p.dashCooldown <= 0;
  return { move: { x: mx, y: my }, aim, firing: !!nearest, dash };
}

/**
 * Play forward for up to `seconds`, taking blessings when a wave clears and
 * restarting (with a sturdier keeper) if the pilot dies. Stops early when
 * `until` returns true.
 */
function simulate(world, seconds, until, sturdy) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (until && until(world)) break;
    if (world.screen === SCREEN_OVER) {
      world.startRun(23);
      if (sturdy) {
        world.player.maxHp = 8;
        world.player.hp = 8;
        world.player.shots = 2;
      }
      continue;
    }
    if (world.screen === SCREEN_UPGRADE) {
      world.takeBlessing(world.blessings[0]);
      continue;
    }
    if (world.screen !== SCREEN_PLAY) break;
    if (until && until(world)) break;
    const a = autopilot(world);    world.step(STEP, a.move, a.aim, a.firing, a.dash);
  }
}

/**
 * Set `world` to the named scene and return the best score to show on the title.
 * Scenes: start (title over a drifting arena), play (wave 3 mid-fight),
 * upgrade (wave 1 cleared, blessing draft open), victory (wave 10 won).
 */
export function stageShot(name, world) {
  if (name === 'victory') {
    world.forceVictory();
    return { best: world.score };
  }
  if (name === 'upgrade') {
    world.startRun(11);
    simulate(world, 90, (w) => w.screen === SCREEN_UPGRADE, false);
    if (world.screen !== SCREEN_UPGRADE) {
      // The pilot could not clear wave 1 in time: clear it by hand.
      world.startRun(11);
      world.spawnQueue = [];
      world.enemies = [];
      world.step(STEP, { x: 0, y: 0 }, 0, false, false);
    }
    return { best: world.score };
  }
  if (name === 'play') {
    world.startRun(23);
    world.player.maxHp = 8;
    world.player.hp = 8;
    world.player.shots = 2;
    simulate(world, 120, (w) => w.screen === SCREEN_PLAY && w.wave >= 3 && w.enemies.length >= 4, true);
    return { best: world.score };
  }
  // start: title over a live arena.
  world.reset();
  world.rng = makeRng(5);
  for (let i = 0; i < 5 / STEP; i += 1) world.ambient(STEP);
  return { best: 12480 };
}
