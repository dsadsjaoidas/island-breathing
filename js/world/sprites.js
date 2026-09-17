// Characters, animals and interactive objects — sprites from the Ninja Adventure pack,
// with a few hand-drawn extras (office props, roots, rudder) where the pack has nothing.
const Sprites = (() => {
  const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const F = (g, sheet, sx, sy, sw, sh, x, y, flip) => Assets.frame(g, sheet, sx, sy, sw, sh, x, y, flip);
  const T = (g, sheet, cx, cy, x, y, w, h) => Assets.tile(g, sheet, cx, cy, x, y, w, h);
  const DIR = { down: 0, up: 1, left: 2, right: 3 };

  // which character sheet each role uses (Pixel Crawler body, dressed per character: 32x32 frames)
  const STYLES = { yunus: 'ch_yunus', sas: 'ch_sas', yunus_office: 'ch_yunus', sas_office: 'ch_sas', janitor: 'ch_marzouq', adel: 'ch_adel' };
  const ROW = { down: 0, left: 1, right: 1, up: 2 };

  function glow(g, cx, cy, r, col, a) {
    g.globalAlpha = a; g.fillStyle = col;
    for (let dy = -r; dy <= r; dy += 2) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(Math.round(cx - w), Math.round(cy + dy * 0.7), w * 2, 2); }
    g.globalAlpha = 1;
  }

  function shadow(g, x, y, w = 10) {
    g.globalAlpha = 0.28;
    rect(g, '#000', x + 8 - w / 2, y + 14, w, 2);
    rect(g, '#000', x + 9 - w / 2, y + 16, w - 2, 1);
    g.globalAlpha = 1;
  }

  // frame < 0 → idle loop; otherwise walk frame
  function person(g, x, y, dir, frame, sheet) {
    x = Math.round(x); y = Math.round(y);
    shadow(g, x, y);
    const idle = frame < 0;
    const col = idle ? Math.floor(performance.now() / 260) % 4 : frame % 6;
    const row = ROW[dir] + (idle ? 3 : 0);
    F(g, sheet, col * 32, row * 32, 32, 32, x - 8, y - 16, dir === 'left');
  }

  // animals drawn in the same style as the characters (24px crow/snake, 32px boar, 16px frog)
  function crow(g, x, y, t, fly, flip) {
    shadow(g, x, y + (fly ? 4 : 0), 8);
    const f = fly ? Math.floor(t * 10) % 4 : Math.floor(t * 1.5) % 2;
    F(g, 'an_crow', f * 24, fly ? 24 : 0, 24, 24, x - 4, y - 8 - (fly ? 3 + Math.sin(t * 6) * 2 : 0), flip);
  }

  function snake(g, x, y, t, dir = 'down', moving = false) {
    shadow(g, x, y, 12);
    F(g, 'an_hams', (Math.floor(t * (moving ? 8 : 2.5)) % 4) * 24, DIR[dir] * 24, 24, 24, x - 4, y - 8);
  }

  const ART = {
    wood(g, x, y) { shadow(g, x, y, 12); F(g, 'branch', 0, 0, 16, 16, x, y); },
    fishspot(g, x, y, t) {
      // expanding ring
      const k = (t * 0.8) % 1, r = 2 + k * 7;
      g.globalAlpha = 0.7 * (1 - k);
      for (let a = 0; a < 16; a++) rect(g, '#e9f7ff', x + 8 + Math.cos(a / 16 * Math.PI * 2) * r, y + 9 + Math.sin(a / 16 * Math.PI * 2) * r * 0.55, 1, 1);
      g.globalAlpha = 1;
      // fish shadow circling under the surface
      const fx = x + 5 + Math.cos(t * 1.3) * 4, fy = y + 9 + Math.sin(t * 1.3) * 2;
      g.globalAlpha = 0.45; rect(g, '#1d4a78', fx, fy, 6, 2); rect(g, '#1d4a78', fx + (Math.cos(t * 1.3) > 0 ? -2 : 6), fy - 1, 2, 4); g.globalAlpha = 1;
      // bubbles
      for (let i = 0; i < 3; i++) {
        const b = (t * 0.9 + i / 3) % 1;
        g.globalAlpha = 1 - b;
        rect(g, '#ffffff', x + 6 + i * 2 + Math.sin(t * 4 + i) , y + 10 - b * 8, i === 1 ? 2 : 1, i === 1 ? 2 : 1);
        g.globalAlpha = 1;
      }
    },
    fire(g, x, y, t, st) {
      if (st >= 1) {
        glow(g, x + 8, y + 4, 26, '#ff9a3c', 0.14 + 0.05 * Math.sin(t * 12)); glow(g, x + 8, y + 4, 14, '#ffc46a', 0.12);
        F(g, 'pc_bonfire', (Math.floor(t * 8) % 4) * 32, 0, 32, 32, x - 8, y - 14);
        F(g, 'pc_fire', (Math.floor(t * 9) % 4) * 32, 0, 32, 48, x - 8, y - 31);
      } else F(g, 'pc_bonfire', 0, 0, 32, 32, x - 8, y - 14);
      if (st >= 2) F(g, 'fish', 16, 0, 16, 16, x + 6, y - 12);
    },
    note(g, x, y, t) { shadow(g, x, y, 10); F(g, 'scroll', 0, 0, 16, 16, x, y + Math.round(Math.sin(t * 3))); if (Math.sin(t * 4) > 0.8) rect(g, '#fff', x + 13, y + 1, 1, 1); },
    // rock pool on the sand with an eye in it that watches and blinks
    eye(g, x, y, t, st, near) {
      const px = x + 8, py = y + 9;
      const oval = (rx, ry, col, dy = 0) => { g.fillStyle = col; for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry))); g.fillRect(px - w, py + j + dy, w * 2, 1); } };
      g.globalAlpha = 0.25; oval(13, 6, '#000', 2); g.globalAlpha = 1;
      oval(12, 6, '#6f7378');                   // stone rim
      oval(11, 5, '#9aa0a6', -1);
      oval(9, 4, '#1d4f6a');                    // deep water
      oval(8, 3, '#2a6f8a', -1);
      [[-11, -1], [-7, -5], [2, -6], [9, -4], [11, 1], [5, 5], [-5, 5]].forEach(([dx, dy], i) => { rect(g, '#5d6167', px + dx - 1, py + dy - 1, 4, 3); rect(g, '#b8bdc2', px + dx, py + dy - 1, 2, 1); });
      const open = Date.now() % 4200 > 180, look = Math.round(Math.sin(t * 0.9) * 2) + (near ? 1 : 0);
      if (open) {
        oval(5, 2, '#f4ead5');
        rect(g, '#7a2a30', px - 2 + look, py - 2, 4, 4);
        rect(g, '#120808', px - 1 + look, py - 2, 1, 4);
        rect(g, '#ffffff', px + 1 + look, py - 2, 1, 1);
      } else rect(g, '#1a0a0e', px - 5, py, 10, 1);
      if (Math.sin(t * 2) > 0.7) rect(g, '#cfe6ef', px - 6, py - 3, 2, 1);
    },
    boat(g, x, y, t, st) {
      const bob = Math.round(Math.sin(t * 1.4));
      shadow(g, x - 10, y + 2, 46);
      const img = Renderer.gfx.sailboat(st ? null : ['#3a2a22', 0.3]);
      if (st) g.drawImage(img, x - 18, y - 30 + bob);
      else {
        // wreck: beached and tilted, torn sails
        g.save(); g.translate(x + 8, y + 10); g.rotate(-0.12); g.drawImage(img, -26, -40); g.restore();
        rect(g, '#1a1210', x - 4, y + 4, 6, 3); rect(g, '#1a1210', x + 12, y + 6, 4, 2);
      }
    },
    crow(g, x, y, t) { crow(g, x, y, t, false); },
    crow_trapped(g, x, y, t) {
      crow(g, x, y, t, true);
      rect(g, '#9c2f2f', x + 1, y + 4, 14, 2); rect(g, '#9c2f2f', x + 1, y + 11, 14, 2); rect(g, '#6b1f1f', x + 5, y + 1, 2, 14); rect(g, '#6b1f1f', x + 10, y + 1, 2, 14);
    },
    eyeflower(g, x, y, t, st, near) {
      T(g, 'nature', 4, 10, x, y + 2);
      g.globalAlpha = 0.9; rect(g, '#9a5ab8', x + 4, y + 1, 8, 7); g.globalAlpha = 1;
      if (near) rect(g, '#5a2a78', x + 5, y + 4, 6, 1);
      else { rect(g, '#f4ead5', x + 5, y + 2, 6, 4); rect(g, '#1a1210', x + 7 + Math.round(Math.sin(t)), y + 3, 2, 2); }
    },
    frogs(g, x, y, t) {
      [[-3, 2, 0], [5, -3, 1.5]].forEach(([dx, dy, p]) => {
        glow(g, x + dx + 8, y + dy + 10, 8, '#7dffb0', 0.2 + 0.25 * Math.abs(Math.sin(t * 2 + p)));
        const hop = Math.sin(t * 0.9 + p) > 0.9;
        F(g, 'an_frog', (Math.floor(t * 2 + p) % 2) * 16, hop ? 16 : 0, 16, 16, x + dx, y + dy - (hop ? 2 : 0));
      });
    },
    boar(g, x, y, t) { shadow(g, x, y, 22); F(g, 'an_boar', (Math.floor(t * 1.5) % 2) * 32, 24, 32, 24, x - 8, y - 8); },
    fruit(g, x, y) { T(g, 'nature', 4, 14, x, y); },
    spring(g, x, y, t) {
      T(g, 'water', 1, 1, x, y);
      F(g, 'ripples', (Math.floor(t * 4) % 4) * 16, 0, 16, 16, x, y);
    },
    exit(g, x, y, t) {
      g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4);
      rect(g, '#ffe9a8', x + 4, y + 6, 8, 2); rect(g, '#ffe9a8', x + 6, y + 4, 4, 2); rect(g, '#ffe9a8', x + 5, y + 10, 6, 2);
      g.globalAlpha = 1;
    },
    hams(g, x, y, t) { snake(g, x, y, t); },
    oil(g, x, y, t) { shadow(g, x, y, 8); F(g, 'oil', 0, 0, 16, 16, x, y + Math.round(Math.sin(t * 3))); },
    plank(g, x, y) { shadow(g, x, y, 14); T(g, 'camp', 0, 7, x, y); },
    sail(g, x, y) { shadow(g, x, y, 14); T(g, 'camp', 8, 6, x, y); },
    charts(g, x, y, t) { shadow(g, x, y, 14); T(g, 'camp', 10, 6, x, y + Math.round(Math.sin(t * 2))); },
    fiber(g, x, y) { shadow(g, x, y, 12); T(g, 'camp', 10, 7, x, y); },
    rudder(g, x, y) { rect(g, '#6b4226', x + 7, y + 1, 2, 7); rect(g, '#9a6332', x + 4, y + 7, 8, 8); rect(g, '#b87a45', x + 5, y + 8, 3, 6); },
    crack(g, x, y, t) { g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); rect(g, '#6f8f3a', x + 3, y + 7, 10, 1); rect(g, '#6f8f3a', x + 6, y + 4, 1, 8); g.globalAlpha = 1; },
    glow(g, x, y, t) {
      const k = Math.pow(Math.max(0, Math.sin(t * 6.9)), 6);
      glow(g, x + 8, y + 8, 18, '#ff3040', 0.2 + 0.35 * k);
      F(g, 'heart', 0, (Math.floor(t * 4) % 4) * 16, 16, 16, x, y);
    },
    computer(g, x, y, t, st) {
      rect(g, '#2b2f3a', x + 2, y - 4, 12, 9); rect(g, st ? '#bfe8c0' : '#dfe8ef', x + 3, y - 3, 10, 7);
      for (let i = 0; i < 3; i++) rect(g, st ? '#3a8a4a' : '#9aa6b0', x + 4, y - 2 + i * 2, 3 + ((i * 5) % 6), 1);
      rect(g, '#2b2f3a', x + 7, y + 5, 2, 2);
    },
    aquarium(g, x, y, t) {
      rect(g, '#2b1d14', x, y - 3, 16, 14); rect(g, '#6b8fa3', x + 1, y - 2, 14, 12); rect(g, '#9fc7d9', x + 2, y - 1, 12, 10);
      const b = Tiles.breath();
      rect(g, '#46554f', x + 5, y + 6 - Math.round(b * 2), 6, 3 + Math.round(b * 2)); rect(g, '#2f3a35', x + 7, y + 3 - Math.round(b * 2), 1, 3);
      if (Math.sin(t * 3) > 0.5) rect(g, '#ffffff', x + 9, y + 1 + Math.round((t * 4) % 5), 1, 1);
    },
    cable(g, x, y, t) {
      for (let i = 0; i < 12; i++) rect(g, '#1a1a1e', x + 2 + i, y + 10 + Math.sin(i * 1.3 + t * 0.8) * 3, 2, 2);
      rect(g, '#3a3a40', x + 13, y + 8 + Math.sin(t * 0.8 + 15) * 3, 3, 3);
    },
    coffee(g, x, y, t) { rect(g, '#2b1d14', x + 2, y - 3, 12, 16); rect(g, '#5a5f66', x + 3, y - 2, 10, 14); rect(g, '#3a3f46', x + 5, y + 5, 6, 5); rect(g, Math.sin(t * 2) > 0 ? '#c0433a' : '#6a2a2a', x + 11, y, 1, 1); rect(g, '#f4f1ea', x + 7, y + 7, 3, 3); },
    printer(g, x, y, t, st) { rect(g, '#2b1d14', x, y + 1, 16, 11); rect(g, '#8a8f96', x + 1, y + 2, 14, 9); rect(g, '#b2b7bd', x + 1, y + 2, 14, 2); rect(g, '#f4f1ea', x + 4, y + (st ? -2 : 0), 8, 3); rect(g, '#5c9e3f', x + 12, y + 8, 1, 1); },
    door(g, x, y) { rect(g, '#2b1d14', x + 1, y, 14, 16); rect(g, '#8a5a2e', x + 2, y + 1, 12, 15); rect(g, '#6b4226', x + 4, y + 3, 8, 5); rect(g, '#e8b33a', x + 11, y + 9, 2, 2); },
    exitdoor(g, x, y) { rect(g, '#2b1d14', x + 1, y, 14, 16); rect(g, '#3a3f4a', x + 2, y + 1, 12, 15); rect(g, '#5c9e3f', x + 4, y + 2, 8, 3); rect(g, '#ffffff', x + 6, y + 3, 4, 1); },
    janitor(g, x, y, t) { person(g, x, y, 'down', -1, 'ch_marzouq'); },
    sas_office(g, x, y) { person(g, x, y, 'down', -1, 'ch_sas'); },
    window_crow(g, x, y, t) { crow(g, x, y - 12, t, false); },
  };

  function draw(g, art, x, y, t, st, near) { if (ART[art]) ART[art](g, Math.round(x), Math.round(y), t, st, near); }

  return { STYLES, person, crow, snake, draw, shadow };
})();
