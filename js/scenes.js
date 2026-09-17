// Extra VN backdrops (Acts II–IV) + the hook that lets the world map draw on the same canvas.
(() => {
  const { R, sky, circle, sea, boat, island, stars, breath, W, H } = Renderer.gfx;
  const S = Renderer.scenes;
  const TAU = Math.PI * 2;
  const alpha = (a, fn) => { const c = Renderer.ctx; c.globalAlpha = a; fn(); c.globalAlpha = 1; };
  const beat = t => Math.pow(Math.max(0, Math.sin(t * TAU * 1.1)), 8);

  function rain(t, col = '#7f93aa', n = 130) {
    for (let i = 0; i < n; i++) {
      const x0 = (i * 97.13) % W, sp = 220 + (i * 37) % 120, y = ((i * 53.7) + t * sp) % H, x = (x0 - y * 0.35 + W) % W;
      R(col, x, y, 1, 2); R(col, x - 1, y + 2, 1, 2);
    }
  }

  function silhouette(x, y, braid, lit) {
    R('#140d0a', x - 5, y, 10, 14);
    circle(x, y - 4, 4, '#140d0a');
    if (braid) R('#140d0a', x + 3, y - 2, 2, 8);
    R(lit, x - 5, y + 2, 1, 10); R(lit, x - 3, y - 6, 1, 3);
  }

  S.world = t => World.frame(Renderer.ctx, t);
  S.white = () => R('#f4f1ea', 0, 0, W, H);

  S.camp_night = t => {
    sky('campnight', ['#070b1d', '#0c1330', '#131c42', '#1b2753'], 92);
    stars(t, false);
    const b = breath();
    for (let x = 0; x < W; x++) {
      const h = 28 + 9 * Math.sin(x * 0.05) + 5 * Math.sin(x * 0.13 + 2) + b * 4;
      R('#08110d', x, 92 - h, 1, h);
    }
    if (Math.sin(t * 0.7) > 0.8) { R('#e8c34a', 212, 70, 1, 1); R('#e8c34a', 216, 70, 1, 1); }
    R('#262a38', 0, 92, W, 88);
    for (let i = 0; i < 60; i++) R('#30354a', (i * 53) % W, 94 + (i * 29) % 84, 2, 1);
    const fx = 160, fy = 140, flick = Math.sin(t * 13) * 0.04;
    alpha(0.16 + flick, () => circle(fx, fy, 52, '#ff9a3c'));
    alpha(0.22 + flick, () => circle(fx, fy, 28, '#ffb45a'));
    R('#5e5a57', fx - 11, fy + 4, 22, 3);
    R('#5a3a22', fx - 9, fy + 1, 18, 3);
    for (let i = 0; i < 7; i++) {
      const h = 6 + 6 * Math.abs(Math.sin(t * 9 + i * 1.3));
      R(i % 2 ? '#ffd24a' : '#ff7a2a', fx - 7 + i * 2, fy + 1 - h, 2, h);
    }
    silhouette(128, 128, false, '#ff9a3c');
    silhouette(192, 128, true, '#ff9a3c');
  };

  S.heart = t => {
    R('#2a0d12', 0, 0, W, H);
    const k = beat(t), b = breath();
    for (let i = 0; i < 7; i++) {
      const x = 14 + i * 50;
      for (let y = 0; y < H; y += 2) { const off = Math.sin(y / H * Math.PI) * (16 + b * 4); R('#e9dfc7', x + off, y, 5, 2); R('#b8ab8f', x + off + 4, y, 1, 2); }
    }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU, len = 150;
      for (let d = 40; d < len; d += 3) R(k > 0.3 ? '#8e2a36' : '#5c1520', 160 + Math.cos(a) * d, 96 + Math.sin(a) * d * 0.6 + Math.sin(d * 0.1 + t) * 2, 2, 2);
    }
    const r = Math.round(30 + k * 5), cx = 160, cy = 92;
    circle(cx - 13, cy - 8, Math.round(r * 0.55), '#8e1f2c');
    circle(cx + 13, cy - 8, Math.round(r * 0.55), '#8e1f2c');
    for (let y = 0; y < r + 4; y++) { const w = (r + 4 - y) * 1.05; R('#8e1f2c', cx - w, cy - 6 + y, w * 2, 1); }
    circle(cx - 19, cy - 16, 5, '#c2394a');
    R('#e9dfc7', cx - 3, cy - 36, 6, 12);
    alpha(0.18 * k, () => R('#ff3040', 0, 0, W, H));
  };

  S.escape = t => {
    sky('escape', ['#3a1422', '#5a1f2a', '#8a3a2e', '#c46a3a', '#e89a5a'], 92);
    const open = 0.5 + 0.5 * Math.sin(t * 1.4);
    for (let x = 150; x < W; x++) {
      const n = (x - 235) / 90, h = 78 * Math.sqrt(Math.max(0, 1 - n * n));
      R('#2a1a22', x, 92 - h, 1, h);
    }
    const jawY = 60 - open * 26;
    R('#12080c', 175, jawY, 130, 92 - jawY);
    for (let i = 0; i < 10; i++) {
      const x = 180 + i * 12;
      for (let k = 0; k < 7; k++) { R('#f4ead5', x + k / 2, jawY + k, 6 - k, 1); R('#f4ead5', x + k / 2, 90 - k, 6 - k, 1); }
    }
    circle(250, jawY - 18, 5, '#e8c34a'); R('#12080c', 249, jawY - 22, 2, 9);
    sea(t, 92, 4, ['#f0b890', '#6a3a4a', '#3a1f2e'], 2.5);
    boat(t, 40 + Math.sin(t * 0.6) * 8, 86, 3, ['#3a1422', 0.2], 0, '#f0b890');
    rain(t, '#c98a7a', 60);
  };

  S.harbor_storm = t => {
    S.harbor_dawn(t);
    alpha(0.6, () => R('#10141f', 0, 0, W, H));
    rain(t);
  };

  S.sea_island = t => {
    S.sea_day(t, {});
    island(262, 80, 46, 9, t, '#4f86a8', '#6a9fbf', '#3e7090');
  };

  S.ceiling = t => {
    R('#cfcac0', 0, 0, W, H);
    for (let x = 0; x < W; x += 40) R('#b9b3a6', x, 0, 1, H);
    for (let y = 0; y < H; y += 30) R('#b9b3a6', 0, y, W, 1);
    const on = Math.sin(t * 37) > -0.95;
    [[60, 44], [180, 104], [220, 14]].forEach(([x, y]) => { R('#9d978b', x - 2, y - 2, 84, 16); R(on ? '#fdfdf5' : '#cfcfc4', x, y, 80, 12); });
    alpha(0.25, () => R('#ffffff', 0, 0, W, H));
  };

  S.office = (t, o) => {
    R('#d8d3c6', 0, 0, W, H);
    R('#c9c4b8', 0, 0, W, 8);
    R('#6b6560', 228, 18, 74, 64); R('#a9c1cd', 232, 22, 66, 56); R('#6b6560', 264, 22, 2, 56);
    if (o.crow) { R('#1a1210', 276, 62, 8, 6); R('#1a1210', 282, 59, 4, 4); R('#e8b33a', 286, 60, 2, 1); }
    R('#8a6d4f', 0, 122, W, 58); R('#a8876a', 0, 118, W, 5);
    R('#2b2f3a', 92, 36, 136, 80); R('#dfe8ef', 98, 42, 124, 64);
    for (let i = 0; i < 7; i++) R('#9aa6b0', 104, 48 + i * 8, 40 + (i * 37) % 70, 2);
    if (Math.sin(t * 6) > 0) R('#2b2f3a', 104 + (5 * 37) % 70 + 42, 88, 2, 6);
    R('#2b2f3a', 150, 116, 20, 4);
    R('#f4f1ea', 240, 108, 44, 12); R('#e2ddd1', 244, 104, 44, 12);
    R('#c0433a', 40, 104, 14, 16); R('#f4ead5', 42, 104, 10, 3);
    R('#6b8fa3', 8, 84, 30, 34); R('#9fc7d9', 10, 88, 26, 28);
    island(23, 114, 18, 5, t, '#46554f', '#56675f', '#2f3a35');
  };
})();
