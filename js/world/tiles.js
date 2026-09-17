// Map tiles from the Ninja Adventure tilesets (16x16). Static layers are pre-rendered per map in two
// passes (ground, then tall decoration like trees); hazards and water overlays animate every frame.
const Tiles = (() => {
  const TS = 16;
  const SOLID = new Set(['~', 'T', 'P', 'r', '#', 'b', 'v', 'W', 'D', 'G', ' ']);
  const ANIM = new Set(['~', '-', 'a', 't', 'R', 'f', 'k']);
  const WATER = new Set(['~', '-']);
  const FLESH = new Set(['f', 't', 'R', 'k', 'b', 'a']);
  const TAU = Math.PI * 2;

  const hash = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const breath = () => 0.5 + 0.5 * Math.sin(TAU * 0.1 * (Date.now() / 1000));
  const teethActive = () => (Date.now() / 1000) % 3 < 1.1;
  const rootsClosed = () => breath() > 0.3;

  const T = (g, sheet, cx, cy, x, y, w, h) => Assets.tile(g, sheet, cx, cy, x, y, w, h);
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const flesh = () => Assets.variant('floor', 'flesh', Assets.recolor.flesh);
  const acid = () => Assets.variant('water', 'acid', Assets.recolor.acid);
  const darkTrees = () => Assets.variant('nature', 'dark', p => { for (let i = 0; i < p.length; i += 4) { p[i] *= 0.55; p[i + 1] *= 0.62; p[i + 2] *= 0.6; } });

  // water edge piece in a 3x3 frame + strips + inner corners (TilesetWater layout)
  function waterPiece(land, oy) {
    const { n, s, e, w, ne, nw, se, sw } = land;
    let c;
    if (n && s) c = e && w ? [3, 3] : w ? [0, 3] : e ? [2, 3] : [1, 3];
    else if (e && w) c = n ? [3, 0] : s ? [3, 2] : [3, 1];
    else if (n) c = w ? [0, 0] : e ? [2, 0] : [1, 0];
    else if (s) c = w ? [0, 2] : e ? [2, 2] : [1, 2];
    else if (w) c = [0, 1];
    else if (e) c = [2, 1];
    else c = ne ? [5, 2] : nw ? [6, 2] : se ? [5, 1] : sw ? [6, 1] : [1, 1];
    return [c[0], c[1] + oy];
  }

  function ground(g, ch, x, y, tx, ty, at, floor) {
    const h = hash(tx, ty, 3);
    switch (ch) {
      case '.': T(g, 'floor', 1, 1, x, y); return;
      case ',': case 'x': T(g, 'floor', 0, 12, x, y); if (h < 0.3) T(g, 'floor', 1 + Math.floor(h * 20) % 2, 12, x, y); return;
      case ';': T(g, 'floor', 11, 12, x, y); if (h < 0.3) T(g, 'floor', 12 + Math.floor(h * 20) % 2, 12, x, y); return;
      case 'o': T(g, 'pc_dungeon', 4 + Math.floor(h * 6) % 5, 1 + Math.floor(h * 13) % 2, x, y); return;
      case '_': T(g, 'pc_iwalls', 1 + (tx % 3), 21 + (ty % 2), x, y); return;
      case 'c': T(g, 'pc_iwalls', 11 + (tx % 3), 21 + (ty % 2), x, y); return;
      case '=': T(g, 'water', 1, 13, x, y); return;
      case '~': case '-': {
        const L = (dx, dy) => { const c = at(tx + dx, ty + dy); return c !== ' ' && !WATER.has(c); };
        const land = { n: L(0, -1), s: L(0, 1), e: L(1, 0), w: L(-1, 0), ne: L(1, -1), nw: L(-1, -1), se: L(1, 1), sw: L(-1, 1) };
        const [cx, cy] = waterPiece(land, floor === ',' || floor === ';' ? 6 : 0);
        T(g, 'water', cx, cy, x, y);
        return;
      }
      case '#': {
        const face = at(tx, ty + 1) !== '#';
        if (face) { T(g, 'pc_dungeon', 1, 1, x, y); if (at(tx, ty - 1) !== '#') T(g, 'pc_dungeon', 1, 0, x, y); }
        else { rect(g, '#15141c', x, y, 16, 16); if (h < 0.3) rect(g, '#1f1e28', x + 3, y + 5, 6, 2); }
        return;
      }
      case 'W': case 'G': {
        const below = at(tx, ty + 1), face = below !== 'W' && below !== 'G';
        if (face) T(g, 'pc_iwalls', 14, 8, x, y); else T(g, 'pc_iwalls', 14 + (tx % 2), 6, x, y);
        if (ch === 'G') { rect(g, '#3a2414', x + 2, y + 2, 12, 11); rect(g, '#9fc7d9', x + 3, y + 3, 10, 9); rect(g, '#cfe6ef', x + 4, y + 4, 3, 3); rect(g, '#3a2414', x + 7, y + 3, 1, 9); }
        return;
      }
      case 'D': T(g, 'pc_iwalls', 1 + (tx % 3), 21 + (ty % 2), x, y); return;
      case 'T': case 'v': return ground(g, floor === '.' ? ';' : floor || ';', x, y, tx, ty, at, floor);
      case 'P': case 'r': return ground(g, floor || '.', x, y, tx, ty, at, floor);
      default:
        if (FLESH.has(ch)) { T(g, flesh(), 11, 18, x, y); if (h < 0.15) T(g, flesh(), 12, 18, x, y); return; }
        rect(g, '#000', x, y, 16, 16);
    }
  }

  function bone(g, x, y) {
    rect(g, '#2b1d14', x + 2, y, 12, 16);
    rect(g, '#e9dfc7', x + 3, y, 10, 16); rect(g, '#c9bda3', x + 10, y, 3, 16);
    rect(g, '#fff8e8', x + 4, y + 2, 2, 12); rect(g, '#b8ab8f', x + 3, y + 7, 10, 1);
  }

  // tall things drawn after the ground so they overlap the row above
  function deco(g, ch, x, y, tx, ty, at) {
    const h = hash(tx, ty, 7);
    // Pixel Crawler props anchored at the tile's bottom-centre
    const prop = (name, dx = 0) => { const im = Assets.img[name]; g.drawImage(im, Math.round(x + 8 - im.width / 2 + dx), y + 16 - im.height); };
    switch (ch) {
      case 'T': prop(h < 0.2 ? 'pc_pine' : h < 0.75 ? 'pc_tree_green' : 'pc_bush_big', Math.round((h - 0.5) * 6)); return;
      case 'v': prop(h < 0.6 ? 'pc_pine_dark' : 'pc_pine', Math.round((h - 0.5) * 6)); return;
      case 'P': prop(h < 0.6 ? 'pc_tree_green' : 'pc_tree_yellow'); return;
      case 'r': prop(h < 0.5 ? 'pc_rock_grey' : 'pc_rock'); return;
      case 'x': Assets.frame(g, 'flower', 0, 0, 4, 8, x + 5, y + 5); return;
      case 'b': bone(g, x, y); return;
      case 'D': {
        // two-tile desks: left half + right end of the long table, raised half a tile
        const left = ch === 'D' && at(tx - 1, ty) !== 'D';
        T(g, 'pc_iprops', left ? 0 : 3, 0, x, y - 8); T(g, 'pc_iprops', left ? 0 : 3, 1, x, y + 8 - 8);
        return;
      }
    }
  }

  function drawMap(g, grid, rows, cols, floor) {
    const at = (tx, ty) => (ty >= 0 && ty < rows && tx >= 0 && tx < cols ? grid[ty][tx] : ' ');
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ground(g, grid[y][x], x * TS, y * TS, x, y, at, floor);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) deco(g, grid[y][x], x * TS, y * TS, x, y, at);
  }

  function drawAnim(g, ch, px, py, tx, ty, t, env) {
    const h = hash(tx, ty, 9), b = breath();
    switch (ch) {
      case '-':
      case '~':
        if (Math.sin(t * 1.5 + h * 30) > 0.93) { rect(g, '#ffffff', px + Math.floor(h * 10), py + Math.floor(hash(tx, ty, 6) * 12), 4, 1); }
        if (Math.sin(t * 2 + h * 40) > 0.96) rect(g, '#ffffff', px + Math.floor(h * 14), py + Math.floor(hash(tx, ty, 4) * 14), 2, 1);
        return;
      case 'f':
        g.globalAlpha = 0.25 * b; rect(g, '#d05a6a', px, py, 16, 16); g.globalAlpha = 1;
        return;
      case 'a': {
        const hot = b > 0.5;
        T(g, acid(), 1, 1, px, py);
        if (hot) { g.globalAlpha = 0.35; rect(g, '#d8ff7a', px, py, 16, 16); g.globalAlpha = 1; }
        for (let i = 0; i < 2; i++) {
          const bx = Math.floor(hash(tx, ty, i + 10) * 12), by = Math.floor(((hash(tx, ty, i + 20) * 16 - t * (hot ? 9 : 2)) % 16 + 16) % 16);
          rect(g, hot ? '#f0ffb0' : '#7aa85a', px + bx, py + by, 2, 2);
        }
        return;
      }
      case 't': {
        const up = teethActive(), th = up ? 11 : 3;
        for (let k = 0; k < 3; k++) {
          const x = px + 1 + k * 5;
          for (let y = 0; y < th; y++) { const w = Math.max(1, Math.round(4 * (1 - y / th))); rect(g, y % 4 === 3 ? '#d8ccb0' : '#f4ead5', x + (4 - w) / 2, py + 14 - y, w, 1); }
        }
        return;
      }
      case 'R':
        if (rootsClosed()) {
          rect(g, '#4a1414', px, py + 3, 16, 3); rect(g, '#9c2f2f', px, py + 2, 16, 2);
          rect(g, '#4a1414', px, py + 11, 16, 3); rect(g, '#9c2f2f', px, py + 10, 16, 2);
          rect(g, '#9c2f2f', px + 4 + Math.round(Math.sin(t * 2 + tx)), py, 3, 16);
          rect(g, '#7a2020', px + 11, py, 2, 16);
        } else { rect(g, '#9c2f2f', px, py + 2, 3, 2); rect(g, '#9c2f2f', px + 13, py + 11, 3, 2); }
        return;
      case 'k':
        if (env.opened) { rect(g, '#c9bda3', px + 2, py + 11, 3, 2); rect(g, '#c9bda3', px + 11, py + 4, 2, 2); }
        else { bone(g, px, py); for (let y = 0; y < 16; y++) rect(g, '#1a0a0e', px + 7 + Math.round(Math.sin(y * 0.9) * 2), py + y, 2, 1); }
    }
  }

  function solid(ch, env) {
    if (ch === 'R') return rootsClosed();
    if (ch === 'k') return !env.opened;
    return SOLID.has(ch);
  }

  function hazard(ch) {
    if (ch === 'a') return breath() > 0.5 && 'acid';
    if (ch === 't') return teethActive() && 'teeth';
    if (ch === 'R') return rootsClosed() && 'roots';
    return false;
  }

  return { TS, ANIM, drawMap, drawAnim, solid, hazard, breath, hash };
})();
