// More animated story scenes (companions, character close-ups, sea moments).
(() => {
  const { crowSpr, hamsSpr, boarSpr, ship, rect, spr, tile, person, fill, trees, leaves, fire, notes, heart, fleshImg, W, H } = CG.api;
  const TAU = Math.PI * 2;
  const G = () => Renderer.ctx;
  const sg = () => Renderer.seaGfx;

  // --- shared pieces ---
  function daySea(t, horizon = 110, mountains = true) {
    const s = sg();
    s.gradient('seaSky', s.SKY, horizon);
    s.sun(262, 26, t);
    s.clouds(t, s.CLOUDS);
    if (mountains) s.mountains(horizon, t);
    s.sea(horizon, t);
  }
  function crowFly(t, x, y, scale = 3, flip = false) { crowSpr(t * 12, x, y + Math.sin(t * 12) * 2, scale, flip); }
  function sparkles(t, n = 14, col = '#fff6c8') {
    for (let i = 0; i < n; i++) {
      const k = (t * (0.3 + (i % 5) * 0.08) + i / n) % 1;
      const x = (i * 83 + Math.sin(t + i) * 10) % W, y = H - k * H;
      if (Math.sin(t * 6 + i * 3) > 0) { rect(col, x, y, 1, 3, 1 - k); rect(col, x - 1, y + 1, 3, 1, 1 - k); }
    }
  }
  function petals(t, n = 18) {
    for (let i = 0; i < n; i++) {
      const x = (i * 57 + t * (20 + i % 7 * 4)) % (W + 20) - 10, y = (i * 29 + t * (18 + i % 5 * 5)) % (H + 10) - 5;
      rect(i % 3 ? '#f7b6c2' : '#ffd9e0', x + Math.sin(t * 2 + i) * 4, y, 2, 2, 0.9);
    }
  }
  function sasPortrait(x, y, scale, t, name = 'sas') {
    const im = Assets.img['face_' + name + '_big'], blink = ((t + name.length) % 3.4) < 0.17;
    G().imageSmoothingEnabled = false;
    // gentle hair sway: draw the lower half with a small sideways drift
    const sway = Math.round(Math.sin(t * 1.3) * scale * 0.6);
    const c = G();
    c.drawImage(im, blink ? 64 : 0, 0, 64, 40, x, y, 64 * scale, 40 * scale);
    c.drawImage(im, blink ? 64 : 0, 40, 64, 24, x + sway, y + 40 * scale, 64 * scale, 24 * scale);
  }
  function stormSea(t) {
    for (let i = 0; i < 6; i++) rect(['#15171f', '#1d2130', '#262c3e', '#30384c', '#3b4459', '#434c62'][i], 0, i * 16, W, 17);
    rect('#18293a', 0, 96, W, 84);
    for (let x = 0; x < W; x += 2) { const y = 96 + Math.sin(x * 0.04 + t * 2.2) * 6 + Math.sin(x * 0.11 - t * 1.5) * 3; rect('#2f4a62', x, y, 2, 4); rect('#a9bccf', x, y, 2, 1); }
    for (let i = 0; i < 110; i++) rect('#7f93aa', (i * 97.13 + t * 60) % W, (i * 53.7 + t * 260) % H, 1, 4, 0.7);
  }
  function nightSky(t, rotate = 0) {
    for (let i = 0; i < 6; i++) rect(['#070b1d', '#0c1330', '#131c42', '#1b2753', '#233263', '#2b3a70'][i], 0, i * 18, W, 19);
    for (let i = 0; i < 90; i++) {
      let x = (i * 71.3) % W, y = (i * 37.7) % 104;
      if (rotate) { const a = t * rotate, dx = x - 160, dy = y + 70; x = 160 + dx * Math.cos(a) - dy * Math.sin(a); y = -70 + dx * Math.sin(a) + dy * Math.cos(a); }
      if (y < 0 || y > 106) continue;
      rect(Math.sin(t * 3 + i) > 0.5 ? '#ffffff' : '#8a93c0', x, y, 1, 1);
    }
  }

  const SCENES = {
    sas_closeup(t) {
      for (let i = 0; i < 8; i++) rect(['#9fc6cc', '#a6cbd0', '#adcfd4', '#b5d4d8', '#bdd8dc', '#c5dde0', '#cde1e4', '#d5e6e8'][i], 0, i * 23, W, 24);
      rect('#ffffff', 60, 20, 200, 150, 0.12 + 0.05 * Math.sin(t));
      petals(t);
      sasPortrait(96, 12 + Math.sin(t * 1.2) * 1.5, 2, t);
      sparkles(t, 10);
    },
    yunus_closeup(t) {
      for (let i = 0; i < 8; i++) rect(['#3a3a5a', '#40405f', '#474765', '#4e4e6b', '#565672', '#5e5e79', '#666680', '#6e6e87'][i], 0, i * 23, W, 24);
      for (let i = 0; i < 16; i++) { const k = (t * 0.2 + i / 16) % 1; rect('#e8903a', (i * 73) % W, H - k * H, 2, 1, 0.5 * (1 - k)); }
      sasPortrait(96, 12 + Math.sin(t * 1.1) * 1.5, 2, t, 'yunus');
    },
    marzouq_closeup(t) {
      Renderer.scenes.harbor_dawn(t);
      rect('#000', 0, 0, W, H, 0.35);
      sasPortrait(96, 14, 2, t, 'marzouq');
    },
    adel_closeup(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 1 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y);
      rect('#d9ccb4', 0, 0, W, 40);
      const shake = t < 1 ? Math.sin(t * 60) * 2 : 0;
      sasPortrait(96 + shake, 14, 2, t, 'adel');
      if (t > 0.3) { rect('#c0433a', 250, 30, 6, 26); rect('#c0433a', 250, 62, 6, 6); }
    },
    harbor_meet(t) {
      Renderer.scenes.harbor_dawn(t);
      person('sas', 'down', t, 150, 118, false, 2);
      const wave = Math.sin(t * 8) > 0;
      rect('#f6d8c0', 170 + (wave ? 2 : 0), 96 + (wave ? -4 : 0), 4, 4);
      person('yunus', 'up', t, 90, 132, false, 2);
    },
    gift(t) {
      fill('floor', 1, 1);
      rect('#9a6332', 0, 120, W, 60); for (let x = 0; x < W; x += 20) rect('#6b4226', x, 120, 1, 60);
      person('marzouq', 'right', t, 96, 92, false, 3);
      person('yunus', 'left', t, 186, 92, false, 3);
      const k = Math.min(1, t / 1.5), ix = 138 + k * 10, iy = 80 - Math.sin(k * Math.PI) * 20;
      rect('#e8b33a', ix - 10, iy - 10, 30, 30, 0.2 + 0.1 * Math.sin(t * 6));
      rect('#c98a3a', ix, iy, 10, 12); rect('#ffe9a8', ix + 2, iy + 3, 6, 6, 0.6 + 0.4 * Math.sin(t * 8));
      sparkles(t, 8);
    },
    storm_sail(t) {
      stormSea(t);
      if (Math.sin(t * 1.7) > 0.93) { rect('#e8f0ff', 0, 0, W, H, 0.5); for (let i = 0; i < 6; i++) rect('#ffffff', 200 + Math.sin(i * 3) * 10, i * 14, 2, 14); }
      const c = G(); c.save(); c.translate(150, 110); c.rotate(Math.sin(t * 1.4) * 0.18);
      c.drawImage(Renderer.gfx.sailboat(['#1d2130', 0.25]), -52, -80, 104, 92); c.restore();
      person('sas', 'right', t, 130, 72, false, 1.5);
    },
    voice_storm(t) {
      stormSea(t);
      for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1, r = 10 + k * 120; G().globalAlpha = 0.5 * (1 - k); G().strokeStyle = '#b89ae0'; G().lineWidth = 2; G().beginPath(); G().arc(160, 80, r, 0, TAU); G().stroke(); }
      G().globalAlpha = 1;
      ship(90, 70, 1.6, ['#1d2130', 0.3]);
    },
    wrong_stars(t) {
      nightSky(t, 0.08);
      rect('#9fb4de', 158, 20, 3, 34, 0.35); rect('#9fb4de', 158, 36, 22, 3, 0.35);
      rect('#0d1837', 0, 106, W, 74); for (let x = 0; x < W; x += 3) rect('#1f3060', x, 106 + Math.sin(x * 0.05 + t) * 2, 3, 2);
      ship(96, 80, 1.6, ['#0c1330', 0.45]);
    },
    fog_reveal(t) {
      for (let i = 0; i < 5; i++) rect(['#8f9ba2', '#a0abb1', '#b3bcc0', '#c4cbce', '#d2d8da'][i], 0, i * 22, W, 23);
      const b = Renderer.gfx.breath();
      for (let x = 60; x < 280; x++) { const n = (x - 170) / 110, h = (54 + b * 5) * Math.sqrt(Math.max(0, 1 - n * n)); rect('#46554f', x, 110 - h, 1, h); }
      rect('#f4ead5', 196, 84 - b * 4, 12, 5); rect('#7a2a30', 200, 84 - b * 4, 4, 5);
      rect('#5f6f75', 0, 110, W, 70);
      const open = Math.min(1, t / 3);
      G().globalAlpha = 0.85 - open * 0.6; rect('#e6ebed', -open * 180, 30, 200, 90); rect('#e6ebed', 120 + open * 180, 30, 200, 90); G().globalAlpha = 1;
      ship(10, 110, 1.4, ['#b3bcc0', 0.3]);
      crowFly(t, 190 + Math.cos(t) * 30, 40 + Math.sin(t) * 8, 2);
    },
    fishing_catch(t) {
      daySea(t, 96, false);
      rect('#e8d19a', 0, 150, W, 30);
      person('yunus', 'up', t, 150, 134, false, 2);
      rect('#5a3418', 168, 90, 2, 40); rect('#5a3418', 170, 70, 2, 22);
      const k = (t % 2.4) / 2.4, fx = 180 + k * -20, fy = 120 - Math.sin(k * Math.PI) * 60;
      for (let i = 0; i < 12; i++) rect('#e8f0f0', 171 + (fx - 171) * i / 12, 70 + (fy - 70) * i / 12 + Math.sin(i / 12 * Math.PI) * 6, 1, 1);
      spr('fish', (Math.floor(t * 10) % 2) * 16, 0, 16, 16, fx - 16, fy - 16, 2);
      if (k < 0.15 || k > 0.9) for (let i = 0; i < 10; i++) rect('#ffffff', 180 + Math.sin(i) * 20, 120 - (i % 4) * 6, 2, 2, 0.8);
    },
    crow_flight(t) {
      daySea(t, 140, false);
      trees(120, t, false, 8);
      const x = ((t * 70) % (W + 80)) - 40, y = 60 + Math.sin(t * 1.5) * 18;
      crowFly(t, x, y, 3);
      for (let i = 1; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1; rect('#1a1210', x - i * 12, y + 24 + k * 30, 3, 2, 1 - k); }
    },
    crow_rudder(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x, y);
      for (let i = 0; i < 6; i++) rect('#e9dfc7', 20 + i * 52, 0, 10, H, 0.9);
      const k = Math.min(1, t / 2.5), x = 250 - k * 120, y = 20 + Math.sin(k * Math.PI) * -10 + k * 70;
      crowFly(t, x, y, 3, true);
      rect('#6b4226', x + 20, y + 40, 4, 16); rect('#9a6332', x + 14, y + 54, 16, 16);
      person('yunus', 'up', t, 100, 128, false, 2); person('sas', 'up', t, 60, 136, false, 2);
    },
    hams_crack(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x, y);
      rect('#e9dfc7', 120, 0, 80, H); rect('#c9bda3', 180, 0, 20, H);
      const open = Math.max(0, Math.min(1, (t - 1.5) / 1.5));
      rect('#1a0a0e', 156 - open * 20, 20, 8 + open * 40, 150);
      const k = Math.min(1, t / 1.5);
      hamsSpr(16 * 1, (Math.floor(t * 8) % 4) * 16, 60 + k * 90, 110, 3);
      person('yunus', 'right', t, 20, 120, false, 2);
    },
    hams_follow(t) {
      fill('floor', 11, 18, [12, 18, 1]);
      rect('#000', 0, 0, W, H, 0.6);
      rect('#e8b33a', 60, 60, 200, 100, 0.12 + 0.03 * Math.sin(t * 9));
      const k = (t * 30) % (W + 100);
      person('yunus', 'right', t, k - 40, 110, true, 2);
      person('sas', 'right', t + 0.2, k - 80, 118, true, 2);
      hamsSpr(48, (Math.floor(t * 8) % 4) * 16, k - 130, 126, 2);
      crowFly(t, k - 60, 60, 2);
    },
    repair_boat(t) {
      daySea(t, 90, false);
      for (let x = 0; x < W; x += 32) tile('floor', 1, 1, x, 118); rect('#e8d19a', 0, 150, W, 30);
      ship(80, 76, 2);
      const hit = Math.sin(t * 8) > 0.7;
      person('yunus', 'left', t, 250, 110, false, 2);
      rect('#5a3418', 244, hit ? 118 : 108, 3, 12); rect('#8a8f96', 240, hit ? 116 : 106, 10, 5);
      if (hit) for (let i = 0; i < 6; i++) rect('#ffd24a', 236 + Math.sin(i * 2) * 10, 124 - i * 2, 2, 2);
      person('sas', 'right', t, 40, 116, false, 2);
      for (let i = 0; i < 3; i++) rect('#f4ead5', 68 + i * 6, 128 + Math.sin(t * 6 + i) * 2, 4, 1);
    },
    spring_drink(t) {
      fill('floor', 11, 12, [12, 12, 2]); trees(-24, t, false, 8);
      rect('#3a6a8a', 90, 110, 140, 50); rect('#63b6d8', 94, 114, 132, 42);
      for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; G().globalAlpha = 1 - k; G().strokeStyle = '#e9f7ff'; G().beginPath(); G().ellipse(160, 134, 10 + k * 50, 4 + k * 14, 0, 0, TAU); G().stroke(); }
      G().globalAlpha = 1;
      person('yunus', 'down', t, 146, 76, false, 2);
      if ((t % 4) > 3.2) { rect('#e8e8e0', 0, 0, W, H, 0.7); rect('#fdfdf5', 60, 30, 80, 12); rect('#fdfdf5', 180, 90, 80, 12); }
    },
    eye_pool(t) {
      fill('floor', 1, 1);
      const c = G(), px = 160, py = 96;
      const oval = (rx, ry, col) => { c.fillStyle = col; for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - j * j / (ry * ry))); c.fillRect(px - w, py + j, w * 2, 1); } };
      oval(110, 55, '#6f7378'); oval(100, 48, '#9aa0a6'); oval(90, 42, '#1d4f6a'); oval(84, 38, '#2a6f8a');
      const blink = (t % 4) > 3.75, look = Math.sin(t * 0.8) * 16;
      if (!blink) { oval(46, 22, '#f4ead5'); rect('#7a2a30', px - 16 + look, py - 18, 32, 36); rect('#120808', px - 4 + look, py - 18, 8, 36); rect('#ffffff', px + 6 + look, py - 14, 5, 5); }
      else rect('#1a0a0e', px - 46, py, 92, 3);
    },
    note_read(t) {
      rect('#3f7a3a', 0, 0, W, H);
      const unroll = Math.min(1, t / 1);
      rect('#c9a86a', 60, 30, 200, 20 + unroll * 110); rect('#f4ead5', 66, 36, 188, 10 + unroll * 100);
      for (let i = 0; i < 8; i++) if (i * 12 < unroll * 100) rect('#6b4f2a', 80 + (i % 3) * 6, 50 + i * 12, 150 - (i * 23) % 60, 2);
      rect('#9a6332', 56, 26, 208, 8); rect('#9a6332', 56, 30 + 20 + unroll * 110 - 6, 208, 8);
    },
    campfire_sing(t) {
      CG.scene('campfire')(t);
      notes(210, 110, t);
      rect('#f2708a', 206, 84 + Math.sin(t * 3) * 3, 4, 3);
    },
    office_sas(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 1 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y);
      tile('pc_iprops', 0, 0, 120, 110); tile('pc_iprops', 3, 0, 152, 110); tile('pc_iprops', 0, 1, 120, 142); tile('pc_iprops', 3, 1, 152, 142);
      sasPortrait(184, 20, 1.5, t);
      person('yunus', 'right', t, 60, 110, false, 2.5);
      if (Math.sin(t * 2) > 0) for (let i = 0; i < 3; i++) rect('#f2708a', 170 + i * 8, 40 - ((t * 20 + i * 10) % 30), 4, 3, 0.8);
    },
    hams_farewell(t) {
      for (let i = 0; i < 6; i++) rect(['#3a1f3a', '#6a2f4a', '#a8475a', '#d8705a', '#f0a060', '#f7c878'][i], 0, i * 16, W, 17);
      rect('#f7e0a0', 220, 70, 30, 30, 0.9);
      rect('#4a2a4a', 0, 96, W, 84); for (let x = 0; x < W; x += 2) rect('#e89a6a', x, 96 + Math.sin(x * 0.07 + t) * 2, 2, 1, 0.6);
      ship(170 + t * 8, 60, 1.2, ['#3a1f3a', 0.3]);
      rect('#d9a878', 0, 140, 140, 40);
      hamsSpr(0, (Math.floor(t * 2) % 4) * 16, 60, 108, 3);
    },
    launch(t) {
      daySea(t, 100, true);
      for (let x = 0; x < 120; x += 32) tile('floor', 1, 1, x, 140);
      const k = Math.min(1, t / 3);
      ship(20 + k * 140, 88 - k * 6, 1.8);
      for (let i = 0; i < 20; i++) { const kk = (t * 0.7 + i / 20) % 1; rect('#ffffff', 60 + kk * 250, 150 - Math.sin(kk * Math.PI) * 30 + i % 3 * 4, 3, 2, 1 - kk); }
      crowFly(t, 80 + k * 140, 40, 2);
    },
  };
  Object.entries(SCENES).forEach(([k, fn]) => CG.add(k, fn));
})();
