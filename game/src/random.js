// A tiny seeded generator (mulberry32) so a screenshot scene always plays the
// same way, and a helper for the live game, which seeds from the clock.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function liveRng() {
  return makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}

/** Pick a value in [min, max) from a generator. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Pick one element of an array. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
