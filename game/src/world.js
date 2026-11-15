// The simulation: the keeper, the waves, the lantern's light and every collision.
// One fixed step (STEP) at a time; rendering and input live elsewhere.
import { FIELD, STEP, PLAYER, LANTERN, WAVES, PICKUP, waveComp } from './config.js';
import { makeRng, range } from './random.js';
import { makeEnemy, makeBullet, makePickup, makeParticle, makeFloatText, KIND } from './entities.js';
import { drawBlessings } from './upgrades.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export const EVENT_WAVE_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_VICTORY = 4;

const MARGIN = 40;

export class World {
  constructor() {
    this.rng = makeRng(1);
    this.reset();
  }

  reset() {
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.best = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.particles = [];
    this.floats = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveBanner = 0;
    this.boss = null;
    this.shake = 0;
    this.blessings = [];
    this.blessingTaken = [];
    this.stats = { shots: 0, hits: 0, dashes: 0 };
    this.player = this.freshPlayer();
    this.ambientTimer = 0;
  }

  freshPlayer() {
    return {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      fuel: LANTERN.maxFuel,
      maxFuel: LANTERN.maxFuel,
      speedMul: 1,
      shots: 1,
      damage: PLAYER.bulletDamage,
      fireMul: 1,
      dashMul: 1,
      pickupMul: 1,
      pierce: 0,
      fireTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashX: 0,
      dashY: 0,
      invuln: 0,
      aim: 0,
      moving: false,
    };
  }

  lightRadius() {
    const f = Math.max(0, this.player.fuel / this.player.maxFuel);
    return LANTERN.minRadius + (LANTERN.maxRadius - LANTERN.minRadius) * f;
  }

  startRun(seed) {
    this.reset();
    this.rng = makeRng(seed >>> 0 || 1);
    this.screen = SCREEN_PLAY;
    this.beginWave(1);
  }

  beginWave(n) {
    this.wave = n;
    const comp = waveComp(n);
    this.spawnQueue = [];
    const kinds = ['emberling', 'wisp', 'spitter', 'brute'];
    for (const kind of kinds) {
      for (let i = 0; i < comp[kind]; i += 1) this.spawnQueue.push(kind);
    }
    // Shuffle the queue so kinds arrive mixed.
    for (let i = this.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    if (comp.boss) this.spawnQueue.push('boss');
    this.spawnTimer = 0.4;
    this.waveBanner = 2.2;
    if (comp.boss) sfx.boss();
  }

  spawnOne(kind) {
    const edge = Math.floor(this.rng() * 4);
    let x;
    let y;
    if (edge === 0) { x = range(this.rng, MARGIN, FIELD.width - MARGIN); y = MARGIN; } else if (edge === 1) { x = range(this.rng, MARGIN, FIELD.width - MARGIN); y = FIELD.height - MARGIN; } else if (edge === 2) { x = MARGIN; y = range(this.rng, MARGIN, FIELD.height - MARGIN); } else { x = FIELD.width - MARGIN; y = range(this.rng, MARGIN, FIELD.height - MARGIN); }
    const elite = kind !== 'boss' && this.wave >= 3 && this.rng() < 0.08;
    const enemy = makeEnemy(kind, x, y, this.wave, elite);
    this.enemies.push(enemy);
    if (kind === 'boss') this.boss = enemy;
    this.particles.push(...makeParticle(x, y, '#8b93a3', 8, 120));
  }

  takeBlessing(blessing) {
    blessing.apply(this.player);
    this.blessingTaken.push(blessing.name);
    sfx.upgrade();
    this.screen = SCREEN_PLAY;
    this.beginWave(this.wave + 1);
  }

  /** Build the victory scene for a screenshot: wave 10 cleared, boss fallen. */
  forceVictory() {
    this.reset();
    this.rng = makeRng(7);
    this.screen = SCREEN_VICTORY;
    this.wave = 10;
    this.score = 12480;
    this.kills = 96;
    this.best = 12480;
    this.stats = { shots: 412, hits: 301, dashes: 23 };
    this.player.hp = 3;
    this.player.fuel = 62;
    this.blessingTaken = ['Twin Ember', 'Bright Flame', 'Sturdy Cloak', 'Swift Boots'];
    for (let i = 0; i < 5; i += 1) {
      this.particles.push(...makeParticle(range(this.rng, 200, 1080), range(this.rng, 120, 500), ['#ffd166', '#ff7a4d', '#7ee787'][i % 3], 14, 200));
    }
  }

  /** Ambient arena behind the title screen: a few emberlings drift, no combat. */
  ambient(dt) {
    this.time += dt;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0 && this.enemies.length < 6) {
      this.ambientTimer = 1.2;
      this.spawnOne('emberling');
    }
    const p = { x: FIELD.width / 2, y: FIELD.height / 2 };
    for (const e of this.enemies) this.moveEnemy(e, p, dt, true);
    this.updateParticles(dt);
  }

  moveEnemy(e, target, dt, ambient) {
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let speed = e.speed;
    if (!ambient) {
      const inLight = dist < this.lightRadius();
      if (!inLight) speed *= LANTERN.darkSpeedBonus;
    }
    if (e.kind === KIND.WISP) {
      e.wobble += dt * 6;
      const px = -dy / dist;
      const py = dx / dist;
      e.x += ((dx / dist) * speed + px * Math.sin(e.wobble) * 90) * dt;
      e.y += ((dy / dist) * speed + py * Math.sin(e.wobble) * 90) * dt;
    } else if (e.kind === KIND.SPITTER && dist < 260 && !ambient) {
      e.x -= (dx / dist) * speed * 0.6 * dt;
      e.y -= (dy / dist) * speed * 0.6 * dt;
    } else {
      e.x += (dx / dist) * speed * dt;
      e.y += (dy / dist) * speed * dt;
    }
    e.x = Math.max(24, Math.min(FIELD.width - 24, e.x));
    e.y = Math.max(24, Math.min(FIELD.height - 24, e.y));
  }

  step(dt, move, aimAngle, firing, dashPressed) {
    this.time += dt;
    const p = this.player;
    if (this.waveBanner > 0) this.waveBanner -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.fireTimer = Math.max(0, p.fireTimer - dt);

    // Lantern fuel drains; the light shrinks with it.
    p.fuel = Math.max(0, p.fuel - LANTERN.drainPerSecond * dt);

    // Dash: a short burst with invulnerability.
    if (dashPressed && p.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown * p.dashMul;
      p.dashX = move.x;
      p.dashY = move.y;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.12);
      this.stats.dashes += 1;
      sfx.dash();
      this.particles.push(...makeParticle(p.x, p.y, '#ffd166', 10, 160));
    }
    let speed = PLAYER.speed * p.speedMul;
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      speed = PLAYER.dashSpeed;
      p.x += p.dashX * speed * dt;
      p.y += p.dashY * speed * dt;
    } else {
      p.x += move.x * speed * dt;
      p.y += move.y * speed * dt;
    }
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x));
    p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y));
    p.moving = move.x !== 0 || move.y !== 0;
    p.aim = aimAngle;

    // Fire a spread of ember bolts toward the aim.
    if (firing && p.fireTimer <= 0) {
      p.fireTimer = PLAYER.fireInterval * p.fireMul;
      this.stats.shots += 1;
      const n = p.shots;
      for (let i = 0; i < n; i += 1) {
        const spread = (i - (n - 1) / 2) * 0.14;
        this.bullets.push(makeBullet(p.x, p.y, aimAngle + spread, PLAYER.bulletSpeed, p.damage, true));
      }
      sfx.shoot();
    }

    // Spawn the wave over time, faster as the wave grows.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnOne(this.spawnQueue.shift());
        this.spawnTimer = Math.max(0.25, 0.9 - this.wave * 0.05);
      }
    }

    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateFloats(dt);

    // Wave cleared: draft a blessing, or win the run on wave 10.
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.screen === SCREEN_PLAY) {
      if (this.wave >= WAVES.total) {
        this.screen = SCREEN_VICTORY;
        this.best = Math.max(this.best, this.score);
        sfx.victory();
        return EVENT_VICTORY;
      }
      this.score += 100 * this.wave;
      this.blessings = drawBlessings(this.rng);
      this.screen = SCREEN_UPGRADE;
      sfx.waveClear();
      return EVENT_WAVE_CLEAR;
    }
    return 0;
  }

  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      this.moveEnemy(e, p, dt, false);
      // Spitters fire; the boss fires radial bursts and summons emberlings.
      if (e.kind === KIND.SPITTER) {
        e.spitTimer -= dt;
        if (e.spitTimer <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 520) {
          e.spitTimer = 2.4;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          this.enemyBullets.push(makeBullet(e.x, e.y, a, 260, 1, false, 8));
        }
      }
      if (e.kind === KIND.BOSS) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.2;
          for (let k = 0; k < 10; k += 1) {
            const a = (k / 10) * Math.PI * 2 + this.time;
            this.enemyBullets.push(makeBullet(e.x, e.y, a, 190, 1, false, 8));
          }
          if (this.enemies.length < 8) {
            this.spawnQueue.push('emberling', 'emberling');
          }
        }
      }
      // Touching the keeper hurts, unless dashing through.
      const dist = Math.hypot(p.x - e.x, p.y - e.y);
      if (dist < e.radius + PLAYER.radius && p.invuln <= 0) {
        this.hurtPlayer(e.damage);
        // Knock the enemy back so one touch is one hit.
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.x += Math.cos(a) * 30;
        e.y += Math.sin(a) * 30;
      }
    }
    if (this.boss && this.boss.hp <= 0) this.boss = null;
  }

  hurtPlayer(damage) {
    const p = this.player;
    p.hp -= damage;
    p.invuln = PLAYER.invulnerable;
    this.combo = 0;
    this.shake = 1;
    sfx.hurt();
    this.particles.push(...makeParticle(p.x, p.y, '#ff5d73', 16, 220));
    if (p.hp <= 0) {
      p.hp = 0;
      this.screen = SCREEN_OVER;
      this.best = Math.max(this.best, this.score);
      sfx.gameOver();
      this.particles.push(...makeParticle(p.x, p.y, '#ffd166', 40, 320));
    }
  }

  updateBullets(dt) {
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height;
      if (!dead) {
        for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
          const e = this.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
            const inLight = Math.hypot(e.x - p.x, e.y - p.y) < this.lightRadius();
            const dmg = b.damage + (inLight ? LANTERN.lightDamageBonus : 0);
            e.hp -= dmg;
            e.flash = 0.12;
            this.stats.hits += 1;
            this.particles.push(...makeParticle(b.x, b.y, '#ffe08a', 4, 140));
            if (b.pierceLeft === undefined) b.pierceLeft = p.pierce;
            if (e.hp <= 0) this.killEnemy(j, e);
            if (b.pierceLeft > 0) {
              b.pierceLeft -= 1;
            } else {
              dead = true;
            }
            sfx.hit();
            break;
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height;
      if (!dead && p.invuln <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + PLAYER.radius) {
        this.hurtPlayer(b.damage);
        dead = true;
      }
      if (dead) this.enemyBullets.splice(i, 1);
    }
  }

  killEnemy(index, e) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = 3;
    const bonus = 1 + Math.min(this.combo, 10) * 0.1;
    const gained = Math.round(e.score * bonus);
    this.score += gained;
    this.floats.push(makeFloatText(e.x, e.y, `+${gained}`, '#ffe08a'));
    this.particles.push(...makeParticle(e.x, e.y, e.color, e.kind === KIND.BOSS ? 40 : 14, 260));
    this.shake = Math.max(this.shake, e.kind === KIND.BOSS ? 1 : 0.25);
    sfx.kill();
    const roll = this.rng();
    if (e.kind === KIND.BOSS) {
      this.pickups.push(makePickup('heart', e.x - 30, e.y));
      this.pickups.push(makePickup('heart', e.x + 30, e.y));
      for (let k = 0; k < 4; k += 1) this.pickups.push(makePickup('ember', e.x + range(this.rng, -50, 50), e.y + range(this.rng, -50, 50)));
    } else if (roll < PICKUP.heartChance) {
      this.pickups.push(makePickup('heart', e.x, e.y));
    } else if (roll < PICKUP.heartChance + PICKUP.emberChance) {
      this.pickups.push(makePickup('ember', e.x, e.y));
    }
  }

  updatePickups(dt) {
    const p = this.player;
    const magnet = PLAYER.pickupRadius * p.pickupMul;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pk = this.pickups[i];
      pk.bob += dt * 4;
      pk.life -= dt;
      const dist = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (dist < magnet) {
        const a = Math.atan2(p.y - pk.y, p.x - pk.x);
        pk.x += Math.cos(a) * 320 * dt;
        pk.y += Math.sin(a) * 320 * dt;
      }
      if (dist < PLAYER.radius + 14) {
        if (pk.kind === 'ember') {
          this.score += PICKUP.emberScore;
          p.fuel = Math.min(p.maxFuel, p.fuel + LANTERN.emberFuel);
          this.floats.push(makeFloatText(pk.x, pk.y, `+${PICKUP.emberScore} ✦`, '#ffb347'));
          sfx.pickup();
        } else {
          p.hp = Math.min(p.maxHp, p.hp + PICKUP.heartHeal);
          this.floats.push(makeFloatText(pk.x, pk.y, '+1 ♥', '#ff5d73'));
          sfx.heart();
        }
        this.pickups.splice(i, 1);
      } else if (pk.life <= 0) {
        this.pickups.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateFloats(dt) {
    for (let i = this.floats.length - 1; i >= 0; i -= 1) {
      const f = this.floats[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
  }
}
