// All canvas drawing: the arena, the lantern's light, the HUD and every screen.
// Nothing here changes the simulation; it only reads the world.
import { FIELD, PLAYER, LANTERN, WAVES, PALETTE, FONT } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_VICTORY } from './world.js';
import { KIND } from './entities.js';

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 6;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawFloor(ctx, world);
  drawPickups(ctx, world);
  drawEnemies(ctx, world);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloats(ctx, world);
  drawDarkness(ctx, world);
  ctx.restore();
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_UPGRADE) drawHud(ctx, world);
  if (world.waveBanner > 0 && world.screen === SCREEN_PLAY) drawWaveBanner(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
  if (world.screen === SCREEN_OVER) drawGameOver(ctx, world);
  if (world.screen === SCREEN_VICTORY) drawVictory(ctx, world);
}

function drawFloor(ctx, world) {
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const tile = 80;
  ctx.fillStyle = PALETTE.floorB;
  for (let y = 0; y < FIELD.height / tile; y += 1) {
    for (let x = 0; x < FIELD.width / tile; x += 1) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * tile, y * tile, tile, tile);
    }
  }
  // Faint ember runes on the floor.
  ctx.strokeStyle = 'rgba(255, 180, 80, 0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    const cx = 160 + i * 240;
    const cy = 120 + ((i * 137) % 480);
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy);
    ctx.lineTo(cx + 26, cy);
    ctx.moveTo(cx, cy - 26);
    ctx.lineTo(cx, cy + 26);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.wall;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
}

function drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    const bob = Math.sin(pk.bob) * 3;
    const blink = pk.life < 3 ? (Math.sin(world.time * 12) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = blink;
    if (pk.kind === 'ember') {
      ctx.fillStyle = PALETTE.ember;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.heart;
      ctx.font = '22px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♥', pk.x, pk.y + bob);
    }
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    const flash = e.flash > 0;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    if (e.kind === KIND.BOSS) {
      // Gloomwarden: a crowned shadow orb with pulsing spikes.
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(world.time * 2) * 0.08);
      ctx.beginPath();
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const r = e.radius + (k % 2 === 0 ? 14 : 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0b12';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius - 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(-12, -6, 5, 0, Math.PI * 2);
      ctx.arc(12, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (e.kind === KIND.WISP) {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#efe6ff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === KIND.SPITTER) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b1f10';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Emberling / brute: a jagged ember shard.
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.wobble * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, -e.radius);
      ctx.lineTo(e.radius * 0.8, 0);
      ctx.lineTo(0, e.radius);
      ctx.lineTo(-e.radius * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (e.elite) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 5);
    }
  }
}

function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of world.enemyBullets) {
    ctx.fillStyle = '#c792ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.screen === SCREEN_OVER) return;
  const blink = p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = blink ? 0.4 : 1;
  // Cloak.
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  // Lantern glow on the keeper.
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
  glow.addColorStop(0, 'rgba(255, 196, 107, 0.95)');
  glow.addColorStop(1, 'rgba(255, 196, 107, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  // Hood and lantern.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  const lx = Math.cos(p.aim) * 18;
  const ly = Math.sin(p.aim) * 18;
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(lx - 4, ly - 5, 8, 10);
  ctx.restore();
  // Aim tick.
  ctx.strokeStyle = 'rgba(255, 224, 138, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * 24, p.y + Math.sin(p.aim) * 24);
  ctx.lineTo(p.x + Math.cos(p.aim) * 32, p.y + Math.sin(p.aim) * 32);
  ctx.stroke();
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, world) {
  ctx.font = 'bold 15px ' + FONT;
  ctx.textAlign = 'center';
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawDarkness(ctx, world) {
  // Night presses in everywhere except the lantern's circle of light.
  const p = world.player;
  const r = world.lightRadius();
  const dark = ctx.createRadialGradient(p.x, p.y, r * 0.55, p.x, p.y, r * 1.9);
  dark.addColorStop(0, 'rgba(5, 6, 18, 0)');
  dark.addColorStop(0.55, 'rgba(5, 6, 18, 0.25)');
  dark.addColorStop(1, 'rgba(5, 6, 18, 0.72)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // A warm halo right around the keeper.
  const halo = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, r);
  halo.addColorStop(0, 'rgba(255, 196, 107, 0.16)');
  halo.addColorStop(1, 'rgba(255, 196, 107, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textBaseline = 'alphabetic';
  // Score and wave, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 28px ' + FONT;
  ctx.fillText('SCORE ' + world.score.toLocaleString('en-US'), 24, 44);
  ctx.font = '20px ' + FONT;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WAVE ' + Math.max(1, world.wave) + ' / ' + WAVES.total, 24, 72);
  if (world.combo >= 3) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('COMBO x' + world.combo, 24, 100);
  }
  // Hearts, top centre.
  ctx.textAlign = 'center';
  ctx.font = '26px ' + FONT;
  for (let i = 0; i < p.maxHp; i += 1) {
    ctx.fillStyle = i < p.hp ? PALETTE.heart : 'rgba(255,93,115,0.25)';
    ctx.fillText('♥', 560 + i * 32, 40);
  }
  // Lantern fuel bar, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px ' + FONT;
  ctx.fillText('LANTERN FUEL', 1256, 28);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(1056, 36, 200, 14);
  ctx.fillStyle = p.fuel < 25 ? '#ff5d73' : PALETTE.fuel;
  ctx.fillRect(1056, 36, 200 * (p.fuel / p.maxFuel), 14);
  // Dash cooldown, bottom right.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px ' + FONT;
  ctx.fillText(p.dashCooldown <= 0 ? 'DASH READY  [SPACE]' : 'DASH …', 1256, 690);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(1156, 664, 100, 8);
  ctx.fillStyle = '#7ee7ff';
  const dashFrac = 1 - p.dashCooldown / (PLAYER.dashCooldown * p.dashMul);
  ctx.fillRect(1156, 664, 100 * Math.max(0, Math.min(1, dashFrac)), 8);
  // Boss bar.
  if (world.boss) {
    const b = world.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('GLOOMWARDEN', 640, 640);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(440, 650, 400, 12);
    ctx.fillStyle = PALETTE.bossBar;
    ctx.fillRect(440, 650, 400 * Math.max(0, b.hp / b.maxHp), 12);
  }
  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('WASD move · Mouse aim · Hold click to shoot · SPACE dash · P pause · M mute', 24, 694);
}

function drawWaveBanner(ctx, world) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.waveBanner);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 52px ' + FONT;
  ctx.fillText('WAVE ' + world.wave, 640, 300);
  ctx.font = '22px ' + FONT;
  ctx.fillStyle = PALETTE.ember;
  ctx.fillText(WAVES.bossWaves.includes(world.wave) ? 'Something huge stirs in the dark…' : 'Hold the light. Spend it well.', 640, 340);
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 18, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 76px ' + FONT;
  ctx.fillText('LUMENKEEPER', 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '26px ' + FONT;
  ctx.fillText('Ember of the Last Lantern', 640, 262);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '19px ' + FONT;
  ctx.fillText('The night is eating the light. You are the keeper of the last lantern.', 640, 310);
  ctx.fillText('Survive 10 waves. Slay the Gloomwarden on wave 5 and the Night Sovereign on wave 10.', 640, 338);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px ' + FONT;
  ctx.fillText('WASD / arrows — move      Mouse — aim      Hold click — shoot embers', 640, 396);
  ctx.fillText('SPACE — dash through danger      Pick up embers to feed your lantern', 640, 424);
  ctx.fillText('Outside your light, the dark ones run faster. Inside it, your bolts burn hotter.', 640, 452);
  if (world.best > 0) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('BEST SCORE ' + world.best.toLocaleString('en-US'), 640, 496);
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 26px ' + FONT;
  const pulse = 0.7 + Math.sin(world.time * 4) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillText('— CLICK OR PRESS ENTER TO BEGIN —', 640, 560);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('An original game: its art, sounds and music are made in code. No downloads, no network.', 640, 610);
}

function drawUpgrade(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 18, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px ' + FONT;
  ctx.fillText('WAVE ' + world.wave + ' CLEARED', 640, 130);
  ctx.fillStyle = '#ffb347';
  ctx.font = '22px ' + FONT;
  ctx.fillText('The lantern flares. Choose a blessing — click a card or press 1, 2 or 3.', 640, 170);
  const cards = world.blessings;
  const w = 300;
  const h = 240;
  const gap = 30;
  const total = cards.length * w + (cards.length - 1) * gap;
  const x0 = (FIELD.width - total) / 2;
  const y0 = 230;
  cards.forEach((card, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, y0, w, h);
    ctx.fillStyle = '#ffd166';
    ctx.font = '52px ' + FONT;
    ctx.fillText(card.icon, x + w / 2, y0 + 80);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px ' + FONT;
    ctx.fillText(card.name, x + w / 2, y0 + 130);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '17px ' + FONT;
    wrapText(ctx, card.desc, x + w / 2, y0 + 165, w - 36, 24);
    ctx.fillStyle = '#7ee7ff';
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('[ ' + (i + 1) + ' ]', x + w / 2, y0 + h - 18);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '17px ' + FONT;
  ctx.fillText('Score ' + world.score.toLocaleString('en-US') + '  ·  ' + world.kills + ' creatures banished', 640, 530);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = trial;
  }
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * lineHeight));
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(10, 4, 8, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d73';
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText('THE LIGHT GOES OUT', 640, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '24px ' + FONT;
  ctx.fillText('The dark takes the lantern on wave ' + world.wave + ' of ' + WAVES.total + '.', 640, 310);
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('SCORE ' + world.score.toLocaleString('en-US') + '   ·   ' + world.kills + ' BANISHED', 640, 370);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '19px ' + FONT;
  ctx.fillText('Best score ' + Math.max(world.best, world.score).toLocaleString('en-US'), 640, 410);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText('— PRESS R OR CLICK TO TRY AGAIN —', 640, 480);
}

function drawVictory(ctx, world) {
  ctx.fillStyle = 'rgba(8, 12, 4, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText('DAWN BREAKS', 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '25px ' + FONT;
  ctx.fillText('The Night Sovereign falls. Ten waves held — the lantern burns on.', 640, 272);
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('FINAL SCORE ' + world.score.toLocaleString('en-US'), 640, 340);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '21px ' + FONT;
  ctx.fillText(world.kills + ' creatures banished  ·  ' + world.stats.shots + ' embers fired  ·  ' + world.stats.dashes + ' dashes', 640, 384);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '19px ' + FONT;
  const blessings = world.blessingTaken.length > 0 ? world.blessingTaken.join('  ·  ') : 'No blessings taken';
  ctx.fillText('Blessings: ' + blessings, 640, 424);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px ' + FONT;
  ctx.fillText('— PRESS R OR CLICK TO PLAY AGAIN —', 640, 500);
}
