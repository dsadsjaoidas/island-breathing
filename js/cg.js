// Animated story illustrations ("CG"): close-up scenes built from the pack sprites at 2x,
// shown with a caption for key moments (the boar fleeing, freeing Fahma, the heart, the escape...).
const CG = (() => {
  const W = 320, H = 180, S = 2;
  const TAU = Math.PI * 2;
  let g = null;

  const rect = (c, x, y, w, h, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.globalAlpha = 1; };
  const sheet = s => (typeof s === 'string' ? Assets.img[s] : s);

  function spr(src, sx, sy, sw, sh, x, y, scale = S, flip = false, alpha = 1) {
    g.globalAlpha = alpha;
    if (flip) { g.save(); g.translate(Math.round(x) + sw * scale, Math.round(y)); g.scale(-1, 1); g.drawImage(sheet(src), sx, sy, sw, sh, 0, 0, sw * scale, sh * scale); g.restore(); }
    else g.drawImage(sheet(src), sx, sy, sw, sh, Math.round(x), Math.round(y), sw * scale, sh * scale);
    g.globalAlpha = 1;
  }
  const tile = (src, cx, cy, x, y, w = 1, h = 1, scale = S) => spr(src, cx * 16, cy * 16, w * 16, h * 16, x, y, scale);
  const ROW = { down: 0, left: 1, right: 1, up: 2 };
  // characters: 32x32 frames (Pixel Crawler body); (x, y) is the top-left of the old 16px box
  function person(src, dir, t, x, y, walking = true, scale = S) {
    const sheetName = 'ch_' + src;
    const col = walking ? Math.floor(t * 10) % 6 : Math.floor(t * 4) % 4;
    const row = ROW[dir] + (walking ? 0 : 3);
    rect('#000', x + 3 * scale, y + 14 * scale, 10 * scale, 2 * scale, 0.25);
    spr(sheetName, col * 32, row * 32, 32, 32, x - 8 * scale, y - 16 * scale, scale, dir === 'left');
  }
  // the detailed two-sail boat, bottom-aligned like the old 80x32 hull sprite
  function ship(x, y, scale = S, tint) {
    const im = Renderer.gfx.sailboat(tint);
    g.drawImage(im, Math.round(x + 10 * scale), Math.round(y + 32 * scale - 44 * scale), 52 * scale, 46 * scale);
  }
  function crowSpr(k, x, y, scale = S, flip = false, fly = true) {
    const f = Math.floor(k);
    spr('an_crow', (fly ? f % 4 : f % 2) * 24, fly ? 24 : 0, 24, 24, x - 4 * scale, y - 8 * scale, scale, flip);
  }
  function hamsSpr(colPx, rowPx, x, y, scale = S) {
    spr('an_hams', Math.round(rowPx / 16) * 24, Math.round(colPx / 16) * 24, 24, 24, x - 4 * scale, y - 8 * scale, scale);
  }
  function boarSpr(k, x, y, scale = S, flip = false, run = true) {
    spr('an_boar', (Math.floor(k) % (run ? 4 : 2)) * 32, run ? 0 : 24, 32, 24, x - 4 * scale, y - 8 * scale, scale, flip);
  }
  const fleshImg = () => Assets.variant('floor', 'flesh', Assets.recolor.flesh);

  function fill(src, cx, cy, alt) {
    for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) {
      const h = Tiles.hash(x, y, 5);
      if (alt && h < 0.25) tile(src, alt[0] + Math.floor(h * 8) % (alt[2] || 1), alt[1], x, y); else tile(src, cx, cy, x, y);
    }
  }
  function trees(y, t, dark, n = 7) {
    const src = dark ? Assets.variant('nature', 'dark', p => { for (let i = 0; i < p.length; i += 4) { p[i] *= 0.55; p[i + 1] *= 0.62; p[i + 2] *= 0.6; } }) : 'nature';
    for (let i = 0; i < n; i++) tile(src, i % 2 ? 2 : 16, 0, i * 50 - 20 + Math.sin(t * 0.5 + i) * 1, y + (i % 3) * 6, 2, 2);
  }
  function leaves(t, n = 14) {
    for (let i = 0; i < n; i++) {
      const x = (i * 71 + t * (30 + i * 3)) % (W + 20) - 10, y = (i * 37 + t * (20 + i)) % H;
      spr('leaf', (Math.floor(t * 8 + i) % 6) * 12, 0, 12, 7, x, y, 1);
    }
  }
  function dust(x, y, t) { for (let i = 0; i < 5; i++) { const k = (t * 3 + i / 5) % 1; rect('#d9c29a', x - k * 30, y - k * 8 + Math.sin(i) * 4, 5 - k * 4, 5 - k * 4, 0.7 * (1 - k)); } }
  function fire(x, y, t, scale = S) { rect('#ff9a3c', x - 40, y - 40, 110, 90, 0.12 + 0.04 * Math.sin(t * 12)); tile('camp', 12, 4, x - 2, y + 4); spr('fire', (Math.floor(t * 12) % 8) * 12, 0, 12, 12, x + 4, y - 6, scale); }
  function sea(y, t, deep = '#2a70b3', light = '#63b6d8') {
    rect(deep, 0, y, W, H - y);
    for (let x = 0; x < W; x += 2) { const yy = y + Math.sin(x * 0.05 + t * 1.5) * 3; rect(light, x, yy, 2, 3); rect('#ffffff', x, yy, 2, 1, 0.5); }
  }
  function sky(top, bottom, h = H) { for (let i = 0; i < 6; i++) rect(i % 2 ? top : bottom, 0, (i * h) / 6, W, h / 6 + 1, 1); rect(top, 0, 0, W, h / 3); }
  function notes(x, y, t) { for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1; rect('#ffe9a8', x + Math.sin(k * 8 + i) * 12, y - k * 60, 3, 3, 1 - k); rect('#ffe9a8', x + 2 + Math.sin(k * 8 + i) * 12, y - k * 60 - 6, 1, 7, 1 - k); } }
  function heart(x, y, t, calm) {
    const beat = calm ? 0.3 : Math.pow(Math.max(0, Math.sin(t * 6.9)), 6);
    rect('#ff3040', 0, 0, W, H, 0.12 * beat);
    spr('heart', 0, (calm ? 1 : Math.floor(t * 6) % 4) * 16, 16, 16, x - beat * 4, y - beat * 4, 5 + beat * 0.5);
  }
  function jaws(t, open) {
    rect('#2a1a22', 170, 30, 170, 110);
    rect('#12080c', 180, 70 - open * 30, 150, 60 + open * 30);
    for (let i = 0; i < 9; i++) { const x = 184 + i * 16; for (let k = 0; k < 10; k++) { rect('#f4ead5', x + k / 2, 70 - open * 30 + k, 8 - k * 0.8, 1); rect('#f4ead5', x + k / 2, 130 - k, 8 - k * 0.8, 1); } }
    rect('#e8c34a', 244, 42 - open * 20, 10, 10); rect('#12080c', 248, 42 - open * 20, 2, 10);
  }
  const letterbox = () => { rect('#000', 0, 0, W, 12); rect('#000', 0, H - 12, W, 12); };

  const SCENES = {
    landing(t) {
      // misty sky
      for (let i = 0; i < 8; i++) rect(['#7f8e98', '#8a98a1', '#95a2aa', '#a1acb3', '#adb7bd', '#b9c2c7', '#c5cdd1', '#d1d8db'][i], 0, i * 11, W, 12);
      const b = Renderer.gfx.breath();
      // the island rising behind, breathing
      for (let x = 150; x < W + 20; x++) { const n = (x - 250) / 120, hh = (60 + b * 6) * Math.sqrt(Math.max(0, 1 - n * n)); rect('#4a5a52', x, 92 - hh, 1, hh); if (n < -0.3) rect('#5c6e64', x, 92 - hh, 1, 2); }
      [[200, 52], [236, 40], [270, 44], [300, 58]].forEach(([x, y]) => { rect('#33403a', x, y - b * 4, 2, 10); rect('#33403a', x - 5, y - 2 - b * 4, 12, 3); });
      // sea
      rect('#5d7a82', 0, 92, W, 40);
      for (let i = 0; i < 70; i++) { const x = ((i * 53 + t * (6 + i % 5)) % (W + 20)) - 10, y = 94 + (i * 17) % 36; rect(i % 3 ? '#86a3aa' : '#a9c2c7', x, y, 3 + i % 6, 1); }
      // sand
      rect('#e6cf98', 0, 126, W, 54);
      for (let x = 0; x < W; x += 2) rect('#f4e6c0', x, 125 + Math.round(Math.sin(x * 0.07 + t * 2) * 1.5), 2, 2);
      for (let i = 0; i < 40; i++) rect(i % 2 ? '#d4b877' : '#f3e2b5', (i * 71) % W, 132 + (i * 29) % 44, 2, 1);
      // boat pulled onto the shore
      ship(-10, 92 + Math.sin(t * 1.2), 2);
      // jumps onto the sand
      const jump = (delay, x0, dist) => { const k = Math.max(0, Math.min(1, (t - delay) / 0.9)); return { x: x0 + k * dist, y: 140 - 16 * 2 - Math.sin(k * Math.PI) * 28, walking: k < 1 }; };
      const yj = jump(0.3, 104, 70), sj = jump(1.1, 80, 60);
      person('yunus', 'right', t, yj.x, yj.y, yj.walking);
      person('sas', 'right', t + 0.3, sj.x, sj.y, sj.walking);
      if (t > 1.2 && t < 1.8) for (let i = 0; i < 6; i++) rect('#f4e6c0', 186 + i * 4, 136 - (t - 1.2) * 20 * (i % 3), 2, 2, 0.8);
      // drifting fog bands
      for (let i = 0; i < 5; i++) rect('#eef2f3', ((t * (5 + i * 2) + i * 90) % (W + 160)) - 160, 40 + i * 18, 160, 8 + i % 3 * 4, 0.22);
    },
    campfire(t) {
      sky('#070b1d', '#0c1330', 104);
      for (let i = 0; i < 40; i++) rect(Math.sin(t * 2 + i) > 0.6 ? '#ffffff' : '#7f89b8', (i * 71) % W, (i * 37) % 60, 1, 1);
      trees(34, t, true, 8);
      if (Math.sin(t * 0.8) > 0.5) { rect('#e8c34a', 90, 76, 2, 2); rect('#e8c34a', 96, 76, 2, 2); rect('#e8c34a', 230, 70, 2, 2); rect('#e8c34a', 236, 70, 2, 2); }
      // sandy ground
      rect('#2e2a2a', 0, 104, W, H - 104);
      for (let i = 0; i < 70; i++) rect(i % 3 ? '#3a3430' : '#26221f', (i * 53) % W, 108 + (i * 29) % 70, 2 + i % 3, 1);
      // warm light pool on the ground
      const fl = 0.05 * Math.sin(t * 13) + 0.03 * Math.sin(t * 7);
      [[120, 34, 0.1], [84, 24, 0.14], [50, 15, 0.2]].forEach(([rx, ry, a]) => {
        for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - j * j / (ry * ry))); rect('#ff9a3c', 160 - w, 148 + j, w * 2, 1, a + fl); }
      });
      // bonfire sitting on the sand (logs + stones + animated flames)
      rect('#000', 134, 148, 52, 4, 0.35);
      spr('pc_bonfire', (Math.floor(t * 8) % 4) * 32, 0, 32, 32, 128, 94, 2);
      spr('pc_fire', (Math.floor(t * 9) % 4) * 32, 0, 32, 48, 128, 62, 2);
      for (let i = 0; i < 10; i++) { const k = (t * 0.7 + i / 10) % 1; rect(i % 2 ? '#ffd24a' : '#ff7a2a', 160 + Math.sin(i * 7 + t * 3) * 14 * k, 90 - k * 70, 1, 2, 1 - k); }
      // characters standing on the ground line (feet at y=150), lit on the fire side
      person('yunus', 'right', t, 58, 118, false);
      person('sas', 'left', t, 230, 118, false);
      rect('#ff9a3c', 0, 104, W, H - 104, 0.04 + fl * 0.5);
    },
    boar_flee(t) {
      fill('floor', 11, 12, [12, 12, 2]); trees(-20, t, false, 8); trees(118, t + 2, false, 8);
      const k = (t * 70) % (W + 120);
      boarSpr(t * 10, W - k, 92, 3, true);
      dust(W - k + 50, 136, t);
      person('yunus', 'left', t, W - k + 90, 96);
      person('sas', 'left', t + 0.2, W - k + 130, 104);
      leaves(t, 10);
    },
    boar_chase(t) {
      fill('floor', 11, 12, [12, 12, 2]); trees(-20, t, false, 8); trees(118, t + 2, false, 8);
      const k = (t * 80) % (W + 140);
      person('yunus', 'left', t, W - k, 94);
      person('sas', 'left', t + 0.2, W - k + 36, 102);
      boarSpr(t * 10, W - k + 90, 90, 3, true);
      dust(W - k + 150, 134, t);
      leaves(t, 10);
    },
    boar_feed(t) {
      fill('floor', 11, 12, [12, 12, 2]); trees(-20, t, false, 8);
      boarSpr(t * 3, 150, 96, 3, true);
      spr('fish', 16, 0, 16, 16, 132, 118, 2);
      person('yunus', 'right', t, 70, 100, false); person('sas', 'right', t, 40, 108, false);
    },
    crow_freed(t) {
      fill('floor', 11, 12, [12, 12, 2]); trees(-24, t, false, 8);
      const up = Math.min(t, 2.5);
      for (let i = 0; i < 4; i++) rect('#9c2f2f', 130 + i * 18, 100 + up * 10 + i * 3, 6, 40 - up * 8);
      crowSpr(t * 10, 136 + up * 10, 90 - up * 28, 3);
      person('sas', 'up', t, 110, 116, false); person('yunus', 'up', t, 170, 120, false);
      for (let i = 0; i < 6; i++) { const k = (t * 0.8 + i / 6) % 1; rect('#1a1210', 150 + Math.sin(i * 3) * 30 * k, 80 - k * 40, 3, 2, 1 - k); }
    },
    hams_meet(t) {
      fill('floor', 11, 18, [12, 18, 1]);
      rect('#000', 0, 0, W, H, 0.55);
      const glow = 0.18 + 0.05 * Math.sin(t * 3); rect('#e8b33a', 110, 40, 100, 110, glow);
      const rise = Math.min(t * 20, 20);
      hamsSpr(0, (Math.floor(t * 4) % 4) * 16, 136, 70 - rise, 3);
      person('yunus', 'up', t, 100, 130, false); person('sas', 'up', t, 196, 130, false);
      rect('#000', 0, 0, W, 30, 0.6); rect('#000', 0, 150, W, 30, 0.6);
    },
    heart_sing(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x, y);
      heart(128, 20, t, true);
      person('sas', 'up', t, 146, 128, false); notes(160, 128, t);
      person('yunus', 'up', t, 96, 136, false);
    },
    heart_stab(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x + Math.sin(t * 40) * 2, y);
      heart(128, 20, t, false);
      spr('fire', (Math.floor(t * 14) % 8) * 12, 0, 12, 12, 150, 60, 4);
      person('yunus', 'up', t, 146, 128, false); person('sas', 'up', t, 100, 136, false);
      rect('#ffffff', 0, 0, W, H, Math.max(0, 0.6 - t));
    },
    heart_sneak(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x, y);
      heart(20, 30, t, false);
      const k = Math.min(t * 40, 220);
      person('yunus', 'right', t, 70 + k, 128); person('sas', 'right', t + 0.3, 40 + k, 136);
    },
    hams_sacrifice(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile(fleshImg(), 11, 18, x, y);
      heart(128, 20, t, t > 1.6);
      const k = Math.min(t / 1.4, 1);
      hamsSpr(16, (Math.floor(t * 8) % 4) * 16, 150, 140 - k * 90, 3);
      person('sas', 'up', t, 80, 132, false); person('yunus', 'up', t, 210, 132, false);
    },
    escape(t) {
      sky('#5a1f2a', '#8a3a2e', 110);
      jaws(t, 0.5 + 0.5 * Math.sin(t * 1.4));
      sea(120, t * 2, '#3a1f2e', '#6a3a4a');
      ship(20 + Math.sin(t * 0.8) * 8, 96 + Math.sin(t * 2) * 4, 1.6);
      person('yunus', 'left', t, 60 + Math.sin(t * 0.8) * 8, 84 + Math.sin(t * 2) * 4, true, 1.6);
      person('sas', 'left', t, 90 + Math.sin(t * 0.8) * 8, 84 + Math.sin(t * 2) * 4, false, 1.6);
      crowSpr(t * 10, 20 + t * 20 % 120, 40, 2);
      for (let i = 0; i < 60; i++) rect('#c98a7a', (i * 53 + t * 200) % W, (i * 31 + t * 300) % H, 1, 4, 0.6);
    },
    hams_tongue(t) {
      sea(90, t * 2, '#3a1f2e', '#6a3a4a'); rect('#5a1f2a', 0, 0, W, 90);
      rect('#b33a4a', 0, 110, 170 - t * 20, 16); rect('#8e1f2c', 0, 122, 170 - t * 20, 4);
      hamsSpr(16, (Math.floor(t * 8) % 4) * 16, 150 - t * 30, 80 + Math.abs(Math.sin(t * 2)) * -20, 3);
      ship(180, 70, 1.6);
    },
    crash(t) {
      sky('#10141f', '#262c3e', 100); sea(100, t, '#1d2d55', '#4a6a9a');
      for (let x = 0; x < W; x += 32) tile('floor', 1, 1, x, 128);
      rect('#10141f', 0, 0, W, H, 0.35);
      ship(170, 104, 2);
      person('yunus', 'down', t, 120, 140, false); person('sas', 'left', t, 70, 136, false);
      crowSpr(t * 10, 60 + Math.sin(t) * 40, 40, 2);
      for (let i = 0; i < 80; i++) rect('#7f93aa', (i * 53 + t * 100) % W, (i * 31 + t * 320) % H, 1, 4, 0.7);
      rect('#ffffff', 0, 0, W, H, Math.max(0, (t - 3) * 0.4));
    },
    wake(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 1 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y);
      rect('#d9ccb4', 0, 0, W, 50); for (let x = 0; x < W; x += 32) tile('pc_iwalls', 14, 8, x, 34);
      tile('pc_iprops', 0, 0, 110, 90); tile('pc_iprops', 3, 0, 142, 90); tile('pc_iprops', 0, 1, 110, 122); tile('pc_iprops', 3, 1, 142, 122);
      person('yunus', 'down', t, 124, 70 - (t > 1 ? 4 : 0), false);
      person('adel', 'left', t, 190, 80, false);
      if (t > 0.8) { rect('#c0433a', 206, 50 + Math.sin(t * 10) * 2, 4, 14); rect('#c0433a', 206, 68, 4, 4); }
      rect('#ffffff', 0, 0, W, H, Math.max(0, 0.9 - t * 0.6));
    },
    friends(t) {
      sky('#f4b67f', '#e58a6a', 90); sea(90, t);
      for (let x = 0; x < W; x += 32) tile('water', 1, 13, x, 130);
      ship(60, 92 + Math.sin(t * 1.4) * 2, 2);
      person('sas', 'right', t, 150, 110, false); person('yunus', 'left', t, 190, 110, false);
      crowSpr(t * 1.5, 90, 66 + Math.sin(t * 1.4) * 2, 2);
    },
    sea_end(t) {
      sky('#4aa3df', '#7fc3ec', 90); sea(90, t);
      rect('#4f86a8', 240, 80 - Tiles.breath() * 4, 60, 12 + Tiles.breath() * 4);
      ship(40 + t * 6 % 60, 96 + Math.sin(t * 1.4) * 3, 2);
      person('yunus', 'right', t, 90 + t * 6 % 60, 82 + Math.sin(t * 1.4) * 3, false);
    },
    office_island(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 11 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y + Math.sin(t * TAU * 0.1 + x * 0.02) * 4);
      person('adel', 'down', t, 140, 60, false, 3);
      rect('#e8c34a', 150, 76, 4, 4, 0.8 + 0.2 * Math.sin(t * 4)); rect('#e8c34a', 166, 76, 4, 4, 0.8 + 0.2 * Math.sin(t * 4));
      rect('#000', 0, 0, W, H, Math.min(0.6, t * 0.1));
    },
    logbook(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 1 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y);
      tile('pc_iprops', 0, 0, 120, 96); tile('pc_iprops', 3, 0, 152, 96); tile('pc_iprops', 0, 1, 120, 128); tile('pc_iprops', 3, 1, 152, 128);
      person('adel', 'down', t, 136, 60, false, 3);
      spr('scroll', 0, 0, 16, 16, 140, 110 + Math.sin(t * 2) * 2, 3);
    },
    paper(t) {
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) tile('pc_iwalls', 1 + (x / 32 | 0) % 3, 21 + (y / 32 | 0) % 2, x, y);
      rect('#e58a6a', 220, 20, 80, 50); rect('#6b6560', 258, 20, 3, 50);
      crowSpr(t * 10, 240 + t * 30, 40 - t * 10, 2);
      person('yunus', 'up', t, 140, 100, false, 3);
    },
    loop(t) {
      sky('#a3adb4', '#b8c0c5'); sea(60, t, '#6f8f9e', '#a9c4cc');
      for (let x = 0; x < W; x += 32) tile('floor', 1, 1, x, 110);
      rect('#ffffff', 0, 0, W, 100, 0.3 + 0.1 * Math.sin(t));
      person('yunus', 'down', t, 140, 110, false); person('sas', 'left', t, 180, 112, false);
      crowSpr(0, 60, 70, 2, false, false);
    },
    lost(t) {
      rect('#12080c', 0, 0, W, H);
      const close = Math.min(t * 0.4, 1);
      rect('#2a1a22', 0, 0, W, 90 * close); rect('#2a1a22', 0, H - 90 * close, W, 90 * close);
      person('sas', 'up', t, 150, 80, false); rect('#000', 0, 0, W, H, close * 0.9);
    },
  };

  // cinematic pass: render off-screen, slow push-in, fade from black, soft vignette
  let buf = null;
  function vignette(c) {
    c.fillStyle = '#000';
    for (let i = 0; i < 6; i++) { c.globalAlpha = 0.06; c.fillRect(0, 0, W, 6 + i * 3); c.fillRect(0, H - 6 - i * 3, W, 6 + i * 3); c.fillRect(0, 0, 8 + i * 4, H); c.fillRect(W - 8 - i * 4, 0, 8 + i * 4, H); }
    c.globalAlpha = 1;
  }

  return {
    get names() { return Object.keys(SCENES); },
    api: { crowSpr, hamsSpr, boarSpr, ship, rect, spr, tile, person, fill, trees, leaves, dust, fire, sea, sky, notes, heart, jaws, fleshImg, W, H, S },
    add(name, fn) { SCENES[name] = fn; },
    scene: name => SCENES[name],
    draw(ctx, t, opts) {
      if (!buf) { buf = document.createElement('canvas'); buf.width = W; buf.height = H; }
      g = buf.getContext('2d');
      g.imageSmoothingEnabled = false;
      const lt = t - (opts.t0 || t);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      Renderer.withCtx(g, () => (SCENES[opts.name] || SCENES.lost)(lt));
      vignette(g);
      const z = 1 + 0.05 * Math.min(1, lt / 8), dw = W * z, dh = H * z;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, (W - dw) / 2, (H - dh) / 2 + Math.sin(lt * 0.5) * 0.6, dw, dh);
      g = ctx;
      letterbox();
      if (lt < 0.5) { ctx.globalAlpha = 1 - lt / 0.5; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    },
  };
})();

Renderer.scenes.cg = (t, opts) => CG.draw(Renderer.ctx, t, opts);
