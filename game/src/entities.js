// The things that live in the arena: enemies, the keeper's bolts, pickups and
// particles. Factories only — movement, combat and spawning live in world.js.
import { ENEMY } from './config.js';

export const KIND = {
  EMBERLING: 'emberling',
  WISP: 'wisp',
  SPITTER: 'spitter',
  BRUTE: 'brute',
  BOSS: 'boss',
};

let nextId = 1;

export function makeEnemy(kind, x, y, wave, elite) {
  const base = ENEMY[kind];
  const hpScale = 1 + (wave - 1) * 0.12 + (elite ? 2.2 : 0);
  return {
    id: nextId,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * (elite ? 0.85 : 1),
    radius: base.radius * (elite ? 1.35 : 1),
    damage: base.damage,
    score: Math.round(base.score * (elite ? 3 : 1)),
    color: base.color,
    elite: !!elite,
    flash: 0,
    shootTimer: 2,
    wobble: Math.random() * Math.PI * 2,
    spitTimer: 1.5 + Math.random(),
  };
}

export function makeBullet(x, y, angle, speed, damage, friendly, radius) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    friendly,
    radius: radius ?? 6,
    life: 1.6,
  };
}

export function makePickup(kind, x, y) {
  return { kind, x, y, bob: Math.random() * Math.PI * 2, life: 14 };
}

export function makeParticle(x, y, color, count, speed) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    parts.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.4 + Math.random() * 0.5,
      maxLife: 0.9,
      size: 2 + Math.random() * 4,
      color,
    });
  }
  return parts;
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 1.1 };
}
