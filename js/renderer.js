// Pixel-art renderer: every scene is drawn in code at 320x180 — no image files.
const Renderer = (() => {
  const W = 320, H = 180, TAU = Math.PI * 2;
  const cache = new Map();
  let ctx, scene = 'black', opts = {}, flash = 0, bolt = null, nextBolt = 0;

  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const rng = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // 0..1, period 10s; audio 'breath' ambience uses the same clock
  // shared wall clock so both multiplayer players see the island breathe in sync
  const breath = () => 0.5 + 0.5 * Math.sin(TAU * 0.1 * (Date.now() / 1000));

  function mix(a, b, k) {
    const p = s => [1, 3, 5].map(i => parseInt(s.substr(i, 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }

  function sprite(key, rows, pal, tint) {
    const id = key + (tint ? tint.join() : '');
    if (!cache.has(id)) {
      const c = document.createElement('canvas');
      c.width = Math.max(...rows.map(r => r.length)); c.height = rows.length;
      const g = c.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        let col = pal[ch];
        if (!col) return;
        if (tint) col = mix(col, tint[0], tint[1]);
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }));
      cache.set(id, c);
    }
    return cache.get(id);
  }

  // vertical gradient in flat bands with checkerboard dither at the seams
  function sky(key, colors, h) {
    const id = 'sky:' + key;
    if (!cache.has(id)) {
      const c = document.createElement('canvas'); c.width = W; c.height = h;
      const g = c.getContext('2d'), bh = Math.ceil(h / colors.length);
      colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bh, W, bh); });
      for (let i = 1; i < colors.length; i++) {
        const seam = i * bh;
        g.fillStyle = colors[i];
        for (let y = seam - 2; y < seam; y++) for (let x = y & 1; x < W; x += 2) g.fillRect(x, y, 1, 1);
        g.fillStyle = colors[i - 1];
        for (let y = seam; y < seam + 2; y++) for (let x = (y + 1) & 1; x < W; x += 2) g.fillRect(x, y, 1, 1);
      }
      cache.set(id, c);
    }
    ctx.drawImage(cache.get(id), 0, 0);
  }

  function circle(cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); R(col, cx - w, cy + dy, w * 2, 1); }
  }

  function sea(t, top, amp, [foam, mid, deep], speed = 1) {
    for (let x = 0; x < W; x++) {
      const y = Math.round(top + Math.sin(x * 0.05 + t * 1.1 * speed) * amp + Math.sin(x * 0.13 - t * 0.7 * speed) * amp * 0.35);
      R(deep, x, y, 1, H - y); R(mid, x, y, 1, 2); R(foam, x, y, 1, 1);
    }
    const r = rng(7);
    for (let i = 0; i < 46; i++) {
      const yy = top + amp + 4 + Math.floor(r() * (H - top - amp - 4));
      const len = 3 + r() * 6, sp = (0.3 + r()) * 6 * speed, depth = (yy - top) / (H - top);
      const xx = ((r() * W + t * sp) % (W + 12)) - 12;
      R(i % 3 ? mid : foam, xx, yy, len * (0.5 + depth), 1);
    }
  }

  const BOAT = [
    '............m...............',
    '............mw..............',
    '............mww.............',
    '............mwww............',
    '............mwwww...........',
    '............mwwwww..........',
    '............mwwwwWw.........',
    '............mwwwwWww........',
    '........h...mwwwwWwww.......',
    '.......hh...mwwwwWwwww......',
    '........s...mWWWWWWWWWW.....',
    '........c...m...............',
    'kkkkkkkkckkkmkkkkkkkkkkkkkkk',
    'kRRRRRRRRRRRRRRRRRRRRRRRRRRk',
    '.kBBBBBBBBBBBBBBBBBBBBBBBBk.',
    '..kbbbbbbbbbbbbbbbbbbbbbbk..',
    '...kkkkkkkkkkkkkkkkkkkkkk...',
  ];
  const BOAT_PAL = { k: '#2b1d14', m: '#6b4226', w: '#f4ead5', W: '#d6c3a0', R: '#c0433a', B: '#9a6332', b: '#6b4226', h: '#c0433a', s: '#eab38a', c: '#3d6aa8' };

  // Detailed two-sail wooden sailboat (52x46), built pixel by pixel once and cached per tint.
  function sailboat(tint) {
    const id = 'sailboat:' + (tint ? tint.join() : '');
    if (cache.has(id)) return cache.get(id);
    const c = document.createElement('canvas'); c.width = 52; c.height = 46;
    const g = c.getContext('2d');
    const P = (col, x, y, w = 1, h = 1) => { g.fillStyle = tint ? mix(col, tint[0], tint[1]) : col; g.fillRect(x, y, w, h); };
    const OUT = '#3a2414';
    // main sail (left of mast): quad from mast top (24,3) down to boom (8..23, 31)
    for (let y = 4; y <= 31; y++) {
      const k = (y - 4) / 27, left = Math.round(23 - k * 15), right = 23;
      for (let x = left; x <= right; x++) {
        const u = (x - left) / Math.max(1, right - left);
        let col = u < 0.25 ? '#c9b28a' : u < 0.7 ? '#e8d6b0' : '#f6ead0';
        if ((y + Math.round(k * 6)) % 7 === 0) col = '#d8c49c';
        P(col, x, y);
      }
      P(OUT, left - 1, y);
    }
    for (let x = 8; x <= 23; x++) P(OUT, x, 32);
    // jib (right of mast): triangle mast (26,6) → bow (46,33) → foot (26,33)
    for (let y = 6; y <= 32; y++) {
      const k = (y - 6) / 26, right = Math.round(26 + k * 19);
      for (let x = 26; x <= right; x++) {
        const u = (x - 26) / Math.max(1, right - 26);
        P(u > 0.75 ? '#c9b28a' : u > 0.35 ? '#e8d6b0' : '#f6ead0', x, y);
      }
      P(OUT, right + 1, y);
    }
    // mast + boom + pennant
    P('#4a2c16', 24, 1, 2, 36); P('#7a4a26', 24, 1, 1, 36);
    P('#4a2c16', 7, 33, 18, 2);
    P('#c0433a', 26, 1, 5, 1); P('#c0433a', 26, 2, 3, 1);
    // hull: widening planks, bow rises to the right
    const hull = [[3, 48, 36], [4, 47, 37], [5, 46, 38], [6, 45, 39], [8, 43, 40], [10, 41, 41], [13, 38, 42], [16, 35, 43]];
    hull.forEach(([l, r, y], i) => {
      for (let x = l; x <= r; x++) P(i === 0 ? '#a8703c' : i % 3 === 0 ? '#5a3418' : x < 14 ? '#6b4020' : '#7a4a26', x, y);
      P(OUT, l - 1, y); P(OUT, r + 1, y);
    });
    P('#a8703c', 45, 34, 4, 1); P('#a8703c', 47, 33, 3, 1); P(OUT, 50, 33, 1, 3);
    P(OUT, 2, 35, 48, 1); P(OUT, 16, 44, 20, 1);
    for (let x = 9; x < 42; x += 7) P('#e8b33a', x, 38);
    cache.set(id, c);
    return c;
  }

  function boat(t, x, y, amp, tint, sway = 0, foam = '#e9f7ff') {
    const bx = Math.round(x + Math.sin(t * 0.9) * sway), by = Math.round(y + Math.sin(t * 1.6) * amp);
    const img = sailboat(tint);
    ctx.drawImage(img, bx - 12, by - 28);
    // soft reflection and foam at the waterline
    ctx.globalAlpha = 0.18;
    for (let r = 0; r < 10; r++) ctx.drawImage(img, 0, 44 - r * 3, 52, 2, bx - 12 + Math.round(Math.sin(t * 3 + r) * 1.5), by + 17 + r * 2, 52, 2);
    ctx.globalAlpha = 1;
    R(foam, bx - 8 + Math.sin(t * 3) * 1.5, by + 16, 44, 1);
  }

  function bird(x, y, t, col, seed = 0) {
    const up = Math.floor(t * 5 + seed) % 2;
    x = Math.round(x); y = Math.round(y);
    if (up) { R(col, x, y, 1, 1); R(col, x + 1, y + 1, 1, 1); R(col, x + 2, y + 2, 1, 1); R(col, x + 3, y + 1, 1, 1); R(col, x + 4, y, 1, 1); }
    else { R(col, x, y + 1, 2, 1); R(col, x + 2, y + 2, 1, 1); R(col, x + 3, y + 1, 2, 1); }
  }

  function clouds(t, col, shade, speed = 1) {
    for (let i = 0; i < 5; i++) {
      const w = 28 + i * 6, x = ((i * 83 + t * (2 + i * 0.6) * speed) % (W + 70)) - 70, y = 8 + i * 9;
      R(col, x, y + 4, w, 5); R(col, x + 4, y + 1, w * 0.45, 4); R(col, x + w * 0.45, y - 1, w * 0.35, 6); R(shade, x, y + 9, w, 1);
    }
  }

  function island(cx, base, w, h, t, col, lit, dark) {
    const b = breath(t), hh = h * (1 + 0.07 * b), ww = w * (1 + 0.02 * b);
    const top = n => base - hh * Math.sqrt(Math.max(0, 1 - n * n)) * (0.85 + 0.15 * Math.sin(n * 5 + 1.3));
    for (let x = -ww / 2; x < ww / 2; x++) {
      const n = x / (ww / 2), y = top(n);
      R(col, cx + x, y, 1, base - y + 2);
      if (n < -0.15) R(lit, cx + x, y, 1, 2);
    }
    [-0.55, -0.2, 0.25, 0.6].forEach(p => {
      const x = cx + p * ww / 2, y = top(p);
      R(dark, x, y - 9, 1, 9); R(dark, x - 4, y - 10, 9, 1); R(dark, x - 5, y - 9, 2, 1); R(dark, x + 4, y - 9, 2, 1);
    });
    // "nostrils" that exhale mist on the out-breath
    const nx = [cx - ww * 0.16, cx + ww * 0.1];
    nx.forEach(x => R(dark, x, base - 4, 6, 3));
    if (b > 0.55) {
      ctx.globalAlpha = (b - 0.55) * 1.2;
      nx.forEach(x => { const k = (b - 0.55) * 30; R('#eef2f3', x - k * 0.3, base - 8 - k * 0.4, 6 + k * 0.6, 3); });
      ctx.globalAlpha = 1;
    }
  }

  function stars(t, wrong) {
    const r = rng(11), a = wrong ? t * 0.04 : 0;
    for (let i = 0; i < 70; i++) {
      let x = r() * W, y = r() * 86;
      const tw = Math.sin(t * (1 + r() * 3) + i) > 0.55;
      if (wrong) {
        const dx = x - 160, dy = y + 60, c = Math.cos(a), s = Math.sin(a);
        x = 160 + dx * c - dy * s; y = -60 + dx * s + dy * c;
        if (y > 86 || y < 0) continue;
      }
      R(tw ? '#ffffff' : '#7f89b8', x, y, 1, 1);
      if (tw && i % 7 === 0) { R('#aab3dd', x - 1, y, 1, 1); R('#aab3dd', x + 1, y, 1, 1); R('#aab3dd', x, y - 1, 1, 1); R('#aab3dd', x, y + 1, 1, 1); }
    }
  }

  function makeBolt() {
    const pts = []; let x = 60 + Math.random() * 200, y = 0;
    while (y < 84) { pts.push([x, y]); x += (Math.random() - 0.5) * 16; y += 6 + Math.random() * 8; }
    return pts;
  }

  const Scenes = {
    black() { R('#000', 0, 0, W, H); },

    title(t) { Scenes.night(t, { island: true }); },

    harbor_dawn(t) {
      sky('dawn', ['#2d2a4a', '#4b3665', '#7d4a78', '#b8607a', '#e58a6a', '#f4b67f'], 102);
      circle(236, 100, 16, '#ffd79a'); circle(236, 100, 10, '#fff0c8');
      for (let x = 0; x < 200; x++) {
        const y = 102 - (8 * (0.5 + 0.5 * Math.sin(x * 0.03 + 1)) + 3 * Math.sin(x * 0.09)) * (1 - x / 200);
        R('#4a3b63', x, y, 1, 102 - y);
      }
      sea(t, 102, 0.8, ['#ffd0a0', '#8a6f9e', '#4f4a7c'], 0.6);
      for (let i = 0; i < 9; i++) { const w = 26 - i * 2.5 + Math.sin(t * 2 + i) * 3; R('#ffc98a', 236 - w / 2, 106 + i * 4, w, 1); }
      // lighthouse
      const lx = 290, top = 58;
      for (let y = top; y < 104; y++) { const w = 8 + Math.floor((y - top) / 9); R(Math.floor((y - top) / 7) % 2 ? '#c0433a' : '#f1e6cf', lx - w / 2, y, w, 1); }
      const on = Math.sin(t * 2) > 0;
      R('#2b1d14', lx - 6, top - 2, 12, 2); R('#3a3a4a', lx - 4, top - 9, 8, 7); R(on ? '#ffe9a8' : '#b39a5a', lx - 3, top - 8, 6, 5); R('#2b1d14', lx - 5, top - 11, 10, 2);
      if (on) { ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.moveTo(lx, top - 6); ctx.lineTo(lx - 110, top - 26); ctx.lineTo(lx - 110, top + 10); ctx.fill(); ctx.globalAlpha = 1; }
      boat(t, 112, 104, 0.8, ['#f4b67f', 0.15], 0, '#ffd0a0');
      // pier
      R('#5e3b1f', 0, 146, W, 34);
      for (let y = 146, row = 0; y < H; y += 6, row++) {
        R('#8a5a2e', 0, y, W, 1); R('#3f2714', 0, y + 5, W, 1);
        for (let x = (row % 2) * 23; x < W; x += 46) R('#3f2714', x, y, 1, 6);
      }
      [[40, 128], [160, 130], [262, 128]].forEach(([x, y]) => { R('#3f2714', x, y, 7, 20); R('#6b4226', x + 1, y, 5, 19); R('#8a5a2e', x + 1, y, 5, 1); R('#c9a86a', x - 1, y + 5, 9, 2); });
      for (let i = 0; i < 3; i++) bird(((i * 97 + t * (10 + i * 3)) % (W + 20)) - 10, 30 + i * 12 + Math.sin(t * 2 + i) * 3, t, '#2d2a4a', i);
    },

    sea_day(t, o) {
      sky('day', ['#4aa3df', '#62b3e6', '#7fc3ec', '#9fd3f1', '#c2e4f6'], 80);
      circle(58, 24, 9, '#fff6c8');
      clouds(t, '#ffffff', '#cfe6f3');
      sea(t, 80, 1.6, ['#e9f7ff', '#3f9fd6', '#2a70b3'], 1);
      for (let i = 0; i < 6; i++) if (Math.sin(t * 3 + i * 2.1) > 0.8) R('#ffffff', (i * 53 + 20) % W, 86 + i * 6, 2, 1);
      boat(t, 146, 92, 1.4, null, 3);
      if (o.crow) { const a = t * 1.4; bird(160 + Math.cos(a) * 26, 58 + Math.sin(a) * 8, t, '#1a1210'); }
    },

    storm(t) {
      sky('storm', ['#15171f', '#1d2130', '#262c3e', '#30384c', '#3b4459'], 84);
      clouds(t, '#262a36', '#1b1e28', 6);
      if (t > nextBolt) { nextBolt = t + 5 + Math.random() * 6; lightning(); if (typeof Sound !== 'undefined') Sound.sfx('thunder'); }
      sea(t, 84, 5, ['#a9bccf', '#2f4a62', '#18293a'], 2.2);
      boat(t, 146, 80, 5, ['#1d2130', 0.35], 8, '#a9bccf');
      const r = rng(3);
      for (let i = 0; i < 150; i++) {
        const x0 = r() * W, sp = 220 + r() * 120, y = (r() * H + t * sp) % H, x = (x0 - y * 0.35 + W) % W;
        R('#7f93aa', x, y, 1, 2); R('#7f93aa', x - 1, y + 2, 1, 2);
      }
    },

    night(t, o) {
      sky('night', ['#070b1d', '#0c1330', '#131c42', '#1b2753', '#233263'], 88);
      stars(t, o.wrongStars);
      circle(62, 30, 10, '#f1ecd2'); R('#d6cfb0', 58, 26, 3, 3); R('#d6cfb0', 65, 33, 2, 2);
      if (o.island) island(250, 90, 70, 14, t, '#0f1730', '#16204a', '#0a1024');
      sea(t, 88, 1.2, ['#9fb4de', '#1f3060', '#0d1837'], 0.6);
      for (let i = 0; i < 10; i++) { const w = 7 - i * 0.4 + Math.sin(t * 2 + i) * 2; R('#c9c6b0', 62 - w / 2, 93 + i * 4, w, 1); }
      if (!o.island) boat(t, 150, 82, 1, ['#0c1330', 0.45], 0, '#9fb4de');
    },

    fog(t, o) {
      sky('fog', ['#8f9ba2', '#a0abb1', '#b3bcc0', '#c4cbce'], 86);
      const near = o.near;
      island(near ? 170 : 165, 90, near ? 240 : 140, near ? 50 : 28, t, '#46554f', '#56675f', '#2f3a35');
      if (o.crow) { const x = near ? 170 + 0.25 * 120 : 0; if (near) { R('#1a1210', x - 1, 90 - 50 * 0.93 - 13, 3, 2); R('#1a1210', x, 90 - 50 * 0.93 - 14, 2, 1); } }
      sea(t, 86 + breath(t) * 3, 1, ['#e3e8ea', '#8a999e', '#5f6f75'], 0.5);
      boat(t, 30, 92, 0.8, ['#b3bcc0', 0.3], 0, '#e3e8ea');
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 6; i++) {
        const x = ((t * (4 + i * 2) + i * 70) % (W + 140)) - 140, y = 40 + i * 14, h = 6 + (i % 3) * 3;
        R('#e6ebed', x, y, 140, h); R('#e6ebed', x + 12, y - 2, 116, h + 4); R('#e6ebed', x + 30, y - 3, 80, h + 6);
      }
      ctx.globalAlpha = 1;
    },
  };

  function lightning() { flash = 1; bolt = makeBolt(); }

  function loop(now) {
    const t = now / 1000;
    (Scenes[scene] || Scenes.black)(t, opts);
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.6; R('#e8f0ff', 0, 0, W, H); ctx.globalAlpha = 1;
      if (bolt && flash > 0.4) bolt.forEach(([x, y], i) => { const n = bolt[i + 1]; if (n) for (let k = 0; k < 8; k++) R('#ffffff', x + (n[0] - x) * k / 8, y + (n[1] - y) * k / 8, 2, 2); });
      flash = Math.max(0, flash - 0.04);
    }
    requestAnimationFrame(loop);
  }

  return {
    init(canvas) { ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; requestAnimationFrame(loop); },
    set(name, o) { if (name === 'storm' && scene !== 'storm') nextBolt = performance.now() / 1000 + 5; scene = name; opts = o || {}; },
    lightning,
    flash() { flash = 1; bolt = null; },
    scenes: Scenes,
    gfx: { R, rng, mix, sprite, sailboat, sky, circle, sea, boat, bird, clouds, island, stars, breath, BOAT, BOAT_PAL, W, H },
    get ctx() { return ctx; },
    // draw with every helper pointed at another canvas (used by the cinematic scenes)
    withCtx(c, fn) { const old = ctx; ctx = c; try { fn(); } finally { ctx = old; } },
    paint(canvas, rows, pal) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    },
  };
})();
