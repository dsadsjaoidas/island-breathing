// World effects: particles, floating text, emote bubbles, and the animal companions
// (Fahma the crow flying around / perching on Sas, Hams slithering behind the party).
const FX = (() => {
  let parts = [], floats = [], emotes = [];
  const crow = { x: 0, y: 0, mode: 'fly', t: 0, a: 0, ready: false, flip: false };
  const hams = { x: 0, y: 0, dir: 'down', trail: [], ready: false, mv: false };
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const R = (a, b) => a + Math.random() * (b - a);

  const KINDS = {
    dust: n => Array.from({ length: n || 3 }, () => ({ vx: R(-10, 10), vy: R(-14, -4), life: R(0.3, 0.5), col: '#e8d7b0', size: 2, g: 20 })),
    grass: n => Array.from({ length: n || 3 }, () => ({ vx: R(-12, 12), vy: R(-18, -6), life: R(0.3, 0.5), col: Math.random() < 0.5 ? '#7fb84a' : '#5a9a3c', size: 1, g: 40 })),
    splash: n => Array.from({ length: n || 6 }, () => ({ vx: R(-22, 22), vy: R(-40, -15), life: R(0.35, 0.6), col: Math.random() < 0.5 ? '#ffffff' : '#9ad6e8', size: Math.random() < 0.3 ? 2 : 1, g: 110 })),
    sparkle: n => Array.from({ length: n || 8 }, () => ({ vx: R(-25, 25), vy: R(-35, -5), life: R(0.4, 0.8), col: Math.random() < 0.5 ? '#fff6b0' : '#ffffff', size: 1, g: 10, twinkle: true })),
    sparks: n => Array.from({ length: n || 4 }, () => ({ vx: R(-15, 15), vy: R(-45, -20), life: R(0.3, 0.7), col: Math.random() < 0.5 ? '#ffd24a' : '#ff7a2a', size: 1, g: -5 })),
    smoke: n => Array.from({ length: n || 2 }, () => ({ vx: R(-4, 4), vy: R(-14, -8), life: R(0.9, 1.5), col: '#bdb6ad', size: 3, g: -2, fade: true })),
    leaf: n => Array.from({ length: n || 4 }, () => ({ vx: R(-18, 18), vy: R(-25, -10), life: R(0.6, 1), col: Math.random() < 0.5 ? '#6fae4a' : '#9ac85a', size: 2, g: 30, sway: true })),
    feather: n => Array.from({ length: n || 5 }, () => ({ vx: R(-20, 20), vy: R(-20, 0), life: R(0.8, 1.3), col: '#1a1210', size: 2, g: 15, sway: true })),
    hurt: n => Array.from({ length: n || 6 }, () => ({ vx: R(-30, 30), vy: R(-40, -10), life: R(0.3, 0.5), col: '#ff5a5a', size: 2, g: 60 })),
    heart: n => Array.from({ length: n || 3 }, () => ({ vx: R(-8, 8), vy: R(-22, -12), life: R(0.9, 1.3), col: '#f2708a', size: 0, heart: true, g: 0 })),
  };

  // 5x5 icons for emote bubbles
  const ICONS = {
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '...#.', '..#..', '.....', '..#..'],
    heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    '...': ['.....', '.....', '#.#.#', '.....', '.....'],
    note: ['..##.', '..#.#', '..#..', '###..', '##...'],
    sad: ['#...#', '.....', '.###.', '#...#', '.....'],
    star: ['..#..', '.###.', '#####', '.#.#.', '#...#'],
  };
  const ICON_COL = { '!': '#d94040', '?': '#3d6aa8', heart: '#e0506e', '...': '#4a3a30', note: '#3a8a6a', sad: '#3d6aa8', star: '#e8a520' };

  function heartPx(g, x, y, col) {
    [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([a, b]) => rect(g, col, x + a, y + b, 1, 1));
  }

  return {
    reset() { parts = []; floats = []; emotes = []; crow.ready = false; hams.ready = false; hams.trail = []; },

    burst(kind, x, y, n) {
      if (!KINDS[kind]) return;
      KINDS[kind](n).forEach(p => parts.push({ ...p, x, y, max: p.life }));
    },
    float(text, x, y, col = '#ffffff') { floats.push({ text, x, y, life: 1.1, col }); },
    emote(getPos, type) { emotes.push({ getPos, type, life: 1.8 }); },

    update(dt) {
      parts = parts.filter(p => (p.life -= dt) > 0);
      parts.forEach(p => { p.vy += p.g * dt; p.x += (p.vx + (p.sway ? Math.sin(p.life * 12) * 20 : 0)) * dt; p.y += p.vy * dt; });
      floats = floats.filter(f => (f.life -= dt) > 0);
      floats.forEach(f => { f.y -= 14 * dt; });
      emotes = emotes.filter(e => (e.life -= dt) > 0);
    },

    draw(g, cx, cy) {
      parts.forEach(p => {
        const a = p.fade ? p.life / p.max : Math.min(1, p.life / p.max * 2);
        g.globalAlpha = a;
        if (p.heart) heartPx(g, p.x - cx, p.y - cy, p.col);
        else if (!p.twinkle || Math.sin(p.life * 40) > -0.3) rect(g, p.col, p.x - cx, p.y - cy, p.size + (p.fade ? (1 - a) * 3 : 0), p.size + (p.fade ? (1 - a) * 3 : 0));
      });
      g.globalAlpha = 1;
      floats.forEach(f => {
        g.globalAlpha = Math.min(1, f.life * 2);
        g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
        g.fillStyle = '#2b1d14'; g.fillText(f.text, Math.round(f.x - cx) + 1, Math.round(f.y - cy) + 1);
        g.fillStyle = f.col; g.fillText(f.text, Math.round(f.x - cx), Math.round(f.y - cy));
      });
      g.globalAlpha = 1;
      emotes.forEach(e => {
        const p = e.getPos();
        if (!p) return;
        const pop = Math.min(1, (1.8 - e.life) * 8), bob = Math.round(Math.sin(e.life * 8));
        const x = Math.round(p.x - cx) + 1, y = Math.round(p.y - cy) - 26 + bob;
        if (pop < 0.5) return;
        rect(g, '#2b1d14', x, y, 13, 11); rect(g, '#ffffff', x + 1, y + 1, 11, 9); rect(g, '#2b1d14', x + 5, y + 11, 3, 1); rect(g, '#ffffff', x + 6, y + 10, 1, 1);
        (ICONS[e.type] || ICONS['!']).forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') rect(g, ICON_COL[e.type] || '#d94040', x + 4 + i, y + 3 + j, 1, 1); }));
      });
    },

    // ---------- companions ----------
    // Fahma keeps her distance: wide loops high above the pair, drifting in and out, never landing on them
    crowEntity(t, dt, sas, leader, cx, cy) {
      const mx = (sas.x + leader.x) / 2 + 8, my = (sas.y + leader.y) / 2;
      if (!crow.ready) { Object.assign(crow, { x: mx + 90, y: my - 70, ready: true, a: 0, t: 0 }); }
      crow.a += dt * 0.55;
      crow.t += dt;
      const rx = 62 + 16 * Math.sin(crow.t * 0.23), ry = 30 + 8 * Math.sin(crow.t * 0.31);
      const tx = mx + Math.cos(crow.a) * rx, ty = my - 46 + Math.sin(crow.a * 1.3) * ry;
      crow.flip = tx < crow.x;
      crow.x += (tx - crow.x) * Math.min(1, dt * 1.6); crow.y += (ty - crow.y) * Math.min(1, dt * 1.6);
      if (Math.random() < dt * 0.04) Sound.sfx('crow');
      return {
        y: my + 60,
        draw: g => {
          g.globalAlpha = 0.16; rect(g, '#000', crow.x + 2 - cx, crow.y + 46 - cy, 10, 2); g.globalAlpha = 1;
          Assets.frame(g, 'an_crow', (Math.floor(t * 10) % 4) * 24, 24, 24, 24, crow.x - 4 - cx, crow.y - 8 - cy + Math.sin(t * 5) * 2, crow.flip);
        },
      };
    },

    hamsEntity(t, dt, leader, cx, cy) {
      if (!hams.ready) { Object.assign(hams, { x: leader.x - 12, y: leader.y + 8, ready: true, trail: [] }); }
      if (leader.mv) hams.trail.push({ x: leader.x, y: leader.y + 4 });
      if (hams.trail.length > 80) hams.trail.shift();
      const target = hams.trail[0];
      hams.mv = false;
      if (target) {
        const dx = target.x - hams.x, dy = target.y - hams.y, d = Math.hypot(dx, dy);
        if (d > 90) { hams.x = target.x; hams.y = target.y; }
        else if (d > 4 && leader.mv && Math.hypot(leader.x - hams.x, leader.y - hams.y) > 34) {
          hams.x += dx / d * 55 * dt; hams.y += dy / d * 55 * dt; hams.mv = true;
          hams.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        }
      }
      const DIR = { down: 0, up: 1, left: 2, right: 3 };
      return {
        y: hams.y,
        draw: g => {
          g.globalAlpha = 0.25; rect(g, '#000', hams.x + 3 - cx, hams.y + 13 - cy, 10, 2); g.globalAlpha = 1;
          Assets.frame(g, 'an_hams', (Math.floor(t * (hams.mv ? 8 : 2)) % 4) * 24, DIR[hams.dir] * 24, 24, 24, hams.x - 4 - cx, hams.y - 8 - cy);
        },
      };
    },
    get crowPos() { return crow.ready ? { x: crow.x, y: crow.y + 8 } : null; },
    get hamsPos() { return hams.ready ? { x: hams.x, y: hams.y } : null; },
  };
})();
