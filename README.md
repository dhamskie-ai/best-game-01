# LUMENKEEPER — Ember of the Last Lantern

An original top-down arena survival game for make.fun best-game-01.

The night is eating the light. You are the keeper of the last lantern:
survive 10 waves, slay the Gloomwarden on wave 5 and the Night Sovereign on
wave 10, and keep your lantern fed — outside its light the dark ones run
faster, inside it your ember bolts burn hotter.

- **Move** WASD / arrows, **aim** mouse, **hold click** to shoot, **SPACE** dash
- Clear a wave to draft one of three lantern blessings (extra shots, damage,
  speed, fuel, hearts, pierce, faster dash, magnet pickups)
- Embers feed the lantern and score; hearts heal; combos multiply kills
- Bosses on waves 5 and 10, elites, 4 enemy kinds, particles, screen shake,
  procedural WebAudio sound effects and music (M to mute, P to pause)
- Best score kept in localStorage; R restarts after game over or victory

Play it: `node serve.ts`, then open http://localhost:8080.

Screenshots are real renders of the game, staged deterministically with
`?shot=start|play|upgrade|victory` (see `game/src/shots.js`).
