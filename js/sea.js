// Open-sea backdrops in the reference style: gradient sky, glowing sun, layered cumulus,
// snow-capped mountain range, textured teal sea and the detailed sailboat.
(() => {
  const { R, circle, boat, island, W, H } = Renderer.gfx;
  const S = Renderer.scenes;
  const cache = new Map();
  const ctx = () => Renderer.ctx;

  function gradient(key, stops, h) {
    if (!cache.has(key)) {
      const c = document.createElement('canvas'); c.width = W; c.height = h;
      const g = c.getContext('2d'), band = h / stops.length;
      stops.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1); });
      for (let i = 1; i < stops.length; i++) {
        const y0 = Math.floor(i * band);
        g.fillStyle = stops[i];
        for (let y = y0 - 3; y < y0; y++) for (let x = (y * 3) % 4; x < W; x += 4) g.fillRect(x, y, 2, 1);
      }
      cache.set(key, c);
    }
    ctx().drawImage(cache.get(key), 0, 0);
  }

  // pixel cumulus: overlapping puffs with light top, mid body and blue-grey underside
  function cloudSprite(seed, w, h) {
    const key = `cloud:${seed}:${w}:${h}`;
    if (!cache.has(key)) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      let s = seed;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      const puffs = [];
      const n = Math.max(4, Math.round(w / 14));
      for (let i = 0; i < n; i++) {
        const px = w * 0.12 + (w * 0.76) * (i / (n - 1)), r = h * (0.28 + rnd() * 0.3) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.9);
        puffs.push([px, h - r * 0.9 - 2, r]);
      }
      const layer = (col, dy, shrink) => {
        g.fillStyle = col;
        puffs.forEach(([x, y, r]) => { const rr = Math.max(1, r - shrink); for (let yy = -rr; yy <= rr; yy++) { const ww = Math.floor(Math.sqrt(rr * rr - yy * yy)); g.fillRect(Math.round(x - ww), Math.round(y + yy + dy), ww * 2, 1); } });
      };
      layer('#7fa6d0', 2, 0);
      layer('#b8d4ee', 0, 0);
      layer('#e4f1fb', -2, 2);
      layer('#ffffff', -4, 5);
      g.clearRect(0, h - 3, w, 3);
      g.fillStyle = '#9dbde0'; g.fillRect(Math.round(w * 0.1), h - 4, Math.round(w * 0.8), 1);
      cache.set(key, c);
    }
    return cache.get(key);
  }

  function clouds(t, list) {
    list.forEach(([seed, w, h, y, speed, x0]) => {
      const x = ((x0 + t * speed) % (W + w + 20)) - w - 10;
      ctx().drawImage(cloudSprite(seed, w, h), Math.round(x), y);
    });
  }

  function sun(x, y, t) {
    const g = ctx();
    const pulse = Math.sin(t * 1.2) * 0.5;
    [[26, 0.08], [20, 0.12], [15, 0.2]].forEach(([r, a]) => { g.globalAlpha = a; circle(x, y, Math.round(r + pulse), '#ffffff'); });
    g.globalAlpha = 1;
    circle(x, y, 11, '#fffbe8'); circle(x, y, 9, '#ffffff');
  }

  function mountains(horizon, t) {
    // far range
    for (let x = 0; x < W; x++) {
      const h = 22 + 10 * Math.sin(x * 0.021 + 1.2) + 6 * Math.sin(x * 0.057 + 0.4) + 3 * Math.sin(x * 0.13);
      R('#6f9fd0', x, horizon - h, 1, h);
      if (Math.sin(x * 0.057 + 0.4) > 0.6) R('#8ab3dc', x, horizon - h, 1, 2);
    }
    // near range with a snowy peak
    const peak = 238;
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - peak);
      const big = Math.max(0, 44 - d * 0.55);
      const h = Math.max(8 + 6 * Math.sin(x * 0.04 + 2) + 4 * Math.sin(x * 0.11), big);
      const top = horizon - h;
      R('#3f6fa8', x, top, 1, h);
      R(x < peak ? '#4f82bd' : '#335d92', x, top, 1, Math.min(h, 3));
      if (big > 30) {
        const snow = Math.round((big - 30) * 0.7);
        R(x < peak ? '#ffffff' : '#d7e4f2', x, top, 1, snow);
        if (snow > 2 && Math.sin(x * 0.9) > 0.3) R('#ffffff', x, top + snow, 1, 2);
      }
    }
  }

  function sea(horizon, t) {
    const g = ctx();
    const rows = H - horizon;
    for (let i = 0; i < rows; i++) {
      const k = i / rows;
      const col = k < 0.06 ? '#6fcab6' : k < 0.3 ? '#3aa596' : k < 0.65 ? '#2d8d84' : '#20706c';
      R(col, 0, horizon + i, W, 1);
    }
    // wave strokes: shorter and denser near the horizon, longer below (perspective)
    let s = 17;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 170; i++) {
      const k = rnd(), y = horizon + 2 + Math.floor(Math.pow(k, 1.6) * (rows - 4));
      const depth = (y - horizon) / rows;
      const len = 2 + Math.floor(rnd() * 5 + depth * 14);
      const speed = (0.5 + rnd()) * (2 + depth * 8);
      const x = ((rnd() * W + t * speed) % (W + 30)) - 15;
      const light = rnd() < 0.55;
      R(light ? (depth < 0.3 ? '#8fe0cc' : '#57bdaa') : '#1a5f5c', x, y, len, 1);
      if (light && depth > 0.4) R('#3aa596', x + 1, y + 1, len - 2, 1);
    }
    // horizon shimmer
    g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2);
    R('#bff0e2', 0, horizon, W, 1);
    g.globalAlpha = 1;
  }

  const SKY = ['#2f7fd6', '#3a8adc', '#469ae2', '#56a8e7', '#68b6ea', '#7cc4ee', '#94d2f1', '#abdef3'];
  const CLOUDS = [[11, 70, 22, 18, 3, 40], [23, 44, 14, 34, 5, 210], [5, 130, 34, 50, 1.6, 120], [37, 90, 26, 58, 2.2, 300], [51, 36, 12, 12, 6, 260]];

  S.sea_day = (t, o = {}) => {
    const horizon = 112;
    gradient('seaSky', SKY, horizon);
    sun(262, 26, t);
    clouds(t, CLOUDS);
    mountains(horizon, t);
    sea(horizon, t);
    if (o.island) island(270, horizon + 1, 60, 12, t, '#3f6f8f', '#5a8aa6', '#2e5870');
    boat(t, 140, 108, 1.6, null, 3, '#bff0e2');
    if (o.crow) {
      const a = t * 1.4, x = 150 + Math.cos(a) * 30, y = 60 + Math.sin(a) * 9, up = Math.floor(t * 6) % 2;
      R('#1a1210', x, y, 4, 2); R('#1a1210', x + 3, y - 1, 2, 2); R('#e8b33a', x + 5, y - 1, 1, 1);
      R('#1a1210', x - 2 + (up ? 1 : 0), y + (up ? -3 : 2), 4, 1); R('#f4ead5', x + 1, y + (up ? -3 : 2), 1, 1);
    }
  };

  S.sea_island = t => S.sea_day(t, { island: true });
  Renderer.seaGfx = { gradient, clouds, cloudSprite, sun, mountains, sea, SKY, CLOUDS };
})();
