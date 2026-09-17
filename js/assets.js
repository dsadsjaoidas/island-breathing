// Image assets: Ninja Adventure (Pixel-Boy & AAA, CC0), Pixel Crawler (Anokolisa) and sprites generated for this game.
const Assets = (() => {
  const NAMES = [
    'ch_yunus', 'ch_sas', 'ch_adel', 'ch_marzouq', 'face_sas_big', 'face_yunus_big', 'face_adel_big', 'face_marzouq_big',
    'fish', 'heart',
    'floor', 'water', 'nature', 'camp',
    'pc_tree_green', 'pc_tree_yellow', 'pc_pine', 'pc_pine_dark', 'pc_bush_big', 'pc_rock', 'pc_rock_grey', 'pc_bonfire', 'pc_fire', 'pc_dungeon', 'pc_iwalls', 'pc_iprops', 'an_crow', 'an_boar', 'an_frog', 'an_hams',
    'fire', 'leaf', 'ripples', 'flower', 'branch', 'scroll', 'oil',
  ];
  const img = {};
  const derived = new Map();

  function load(onProgress) {
    let done = 0;
    return Promise.all(NAMES.map(n => new Promise(res => {
      const i = new Image();
      i.onload = i.onerror = () => { onProgress && onProgress(++done / NAMES.length); res(); };
      i.src = `assets/img/${n}.png`;
      img[n] = i;
    })));
  }

  // recoloured copy of a sheet, made once (e.g. blue parrot → black crow, water → acid)
  function variant(name, key, fn) {
    const id = name + ':' + key;
    if (!derived.has(id)) {
      const src = img[name], c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      fn(d.data);
      g.putImageData(d, 0, 0);
      derived.set(id, c);
    }
    return derived.get(id);
  }

  const recolor = {
    crow: p => { for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const r = p[i], g = p[i + 1], b = p[i + 2]; if (r > 180 && g > 120 && b < 120) continue; const l = (r + g + b) / 3; p[i] = p[i + 1] = l * 0.22; p[i + 2] = l * 0.3; } },
    acid: p => { for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; if (b > r + 20) { p[i] = r * 0.6 + 40; p[i + 1] = Math.min(255, b * 0.9 + 30); p[i + 2] = g * 0.25; } } },
    flesh: p => { for (let i = 0; i < p.length; i += 4) { const l = (p[i] + p[i + 1] + p[i + 2]) / 3; p[i] = Math.min(255, l * 1.25 + 20); p[i + 1] = l * 0.55; p[i + 2] = l * 0.6; } },
  };

  // draw one 16x16 (or w x h tiles) cell from a sheet
  function tile(g, src, cx, cy, x, y, w = 1, h = 1) {
    const im = typeof src === 'string' ? img[src] : src;
    g.drawImage(im, cx * 16, cy * 16, w * 16, h * 16, Math.round(x), Math.round(y), w * 16, h * 16);
  }

  function frame(g, src, sx, sy, sw, sh, x, y, flip) {
    const im = typeof src === 'string' ? img[src] : src;
    if (!flip) return g.drawImage(im, sx, sy, sw, sh, Math.round(x), Math.round(y), sw, sh);
    g.save(); g.translate(Math.round(x) + sw, Math.round(y)); g.scale(-1, 1);
    g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh); g.restore();
  }

  return { load, img, tile, frame, variant, recolor };
})();
