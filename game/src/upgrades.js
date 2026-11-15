// The lantern-blessing draft: when a wave is cleared the keeper chooses one of
// three blessings. Each blessing is a small permanent change to the keeper's
// stats, so runs diverge and later waves stay fair.
export const BLESSINGS = [
  {
    id: 'swift-boots',
    name: 'Swift Boots',
    icon: '»',
    desc: '+18% move speed. Outrun the dark.',
    apply(p) { p.speedMul *= 1.18; },
  },
  {
    id: 'twin-ember',
    name: 'Twin Ember',
    icon: '✦',
    desc: '+1 bolt per shot. Twice the light.',
    apply(p) { p.shots += 1; },
  },
  {
    id: 'bright-flame',
    name: 'Bright Flame',
    icon: '☀',
    desc: '+1 bolt damage. Burn brighter.',
    apply(p) { p.damage += 1; },
  },
  {
    id: 'quick-hands',
    name: 'Quick Hands',
    icon: '↯',
    desc: 'Fire 20% faster.',
    apply(p) { p.fireMul *= 0.8; },
  },
  {
    id: 'deep-lantern',
    name: 'Deep Lantern',
    icon: '◉',
    desc: '+60 max fuel, +40 fuel now. The light holds.',
    apply(p) { p.maxFuel += 60; p.fuel = Math.min(p.maxFuel, p.fuel + 40); },
  },
  {
    id: 'sturdy-cloak',
    name: 'Sturdy Cloak',
    icon: '♥',
    desc: '+1 max heart, heal 1 now.',
    apply(p) { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
  {
    id: 'long-dash',
    name: 'Long Dash',
    icon: '➤',
    desc: 'Dash recharges 35% faster.',
    apply(p) { p.dashMul *= 0.65; },
  },
  {
    id: 'magnet-ember',
    name: 'Magnet Ember',
    icon: '◎',
    desc: 'Pickups fly to you from 2x as far.',
    apply(p) { p.pickupMul *= 2; },
  },
  {
    id: 'piercing-light',
    name: 'Piercing Light',
    icon: '⟶',
    desc: 'Bolts pierce +1 enemy.',
    apply(p) { p.pierce += 1; },
  },
];

/** Three distinct blessings drawn from the pool. */
export function drawBlessings(rng) {
  const pool = [...BLESSINGS];
  const out = [];
  while (out.length < 3 && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
