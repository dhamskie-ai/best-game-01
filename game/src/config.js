// LUMENKEEPER — every tuning number and colour in one place.
// The arena is a fixed 1280x720 logical field; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Waves: 10 waves, a boss on 5 and 10; clearing wave 10 wins the run. */
export const WAVES = { total: 10, bossWaves: [5, 10] };

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 5,
  fireInterval: 0.22,
  bulletSpeed: 640,
  bulletDamage: 1,
  dashSpeed: 820,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerable: 1.0,
  pickupRadius: 90,
};

export const LANTERN = {
  maxFuel: 100,
  drainPerSecond: 1.6,
  emberFuel: 6,
  minRadius: 130,
  maxRadius: 260,
  /** Enemies outside the light move this much faster; inside it they take bonus damage. */
  darkSpeedBonus: 1.35,
  lightDamageBonus: 1,
};

export const ENEMY = {
  emberling: { hp: 2, speed: 118, radius: 15, damage: 1, score: 50, color: '#ff7a4d' },
  wisp: { hp: 1, speed: 215, radius: 11, damage: 1, score: 80, color: '#c792ff' },
  spitter: { hp: 3, speed: 82, radius: 16, damage: 1, score: 120, color: '#7ee787' },
  brute: { hp: 9, speed: 58, radius: 26, damage: 2, score: 200, color: '#e5534b' },
  boss: { hp: 90, speed: 62, radius: 46, damage: 2, score: 1500, color: '#ff4d6d' },
};

/** Wave composition: how many of each kind spawn, before the boss (if any). */
export function waveComp(wave) {
  return {
    emberling: 4 + wave * 2,
    wisp: wave >= 2 ? 2 + wave : 0,
    spitter: wave >= 3 ? 1 + Math.floor(wave / 2) : 0,
    brute: wave >= 4 ? Math.floor((wave - 2) / 2) : 0,
    boss: WAVES.bossWaves.includes(wave),
  };
}

export const PICKUP = {
  emberScore: 25,
  heartHeal: 1,
  emberChance: 0.55,
  heartChance: 0.08,
};

export const PALETTE = {
  backdrop: '#0b0e1a',
  floorA: '#12162a',
  floorB: '#0e1224',
  wall: '#232a4a',
  lanternGlow: '#ffc46b',
  ember: '#ffb347',
  player: '#ffd166',
  playerCloak: '#3d5a80',
  bullet: '#ffe08a',
  text: '#f4ead8',
  muted: '#9aa3c7',
  panel: 'rgba(16, 20, 40, 0.88)',
  panelBorder: '#3a4470',
  heart: '#ff5d73',
  fuel: '#ffb347',
  bossBar: '#ff4d6d',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumenkeeper.best';
export const BEST_WAVE_KEY = 'lumenkeeper.bestWave';
