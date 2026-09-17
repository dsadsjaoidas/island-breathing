// Top-down exploration: WASD/arrows/touch movement, collisions, hazards timed to the island's breath,
// objects, minigames, cave lighting and co-op sync. Each client moves its own character;
// the host owns objects, quests and story triggers.
const World = (() => {
  const TS = 16, VW = 320, VH = 180, SPEED = 62;
  const P = { yunus: mk(), sas: mk() };
  const keys = { up: false, down: false, left: false, right: false };
  const KEYMAP = { w: 'up', arrowup: 'up', 'ص': 'up', s: 'down', arrowdown: 'down', 'س': 'down', a: 'left', arrowleft: 'left', 'ش': 'left', d: 'right', arrowright: 'right', 'ي': 'right' };
  const HURT = { acid: 'الحمض يحرق! اعبر وقت الزفير.', teeth: 'أطبقت الأسنان! راقب إيقاعها.', roots: 'التفّت الجذور حولك!' };

  let mapId = null, map = null, grid = [], cols = 0, rows = 0, layer = null, light = null;
  let objs = [], state = {}, markers = {};
  let active = false, frozen = false, remote = false, touchReady = false;
  let last = performance.now(), sendT = 0, safeT = 0, hurtT = 0, mini = null, trail = [];

  function mk() { return { x: 0, y: 0, dir: 'down', frame: 0, mv: false, anim: 0, tx: null, ty: null, safe: null }; }
  const me = () => Game.localId();
  const other = () => (me() === 'yunus' ? 'sas' : 'yunus');
  const now = () => performance.now() / 1000;
  const env = () => ({ opened: !!Game.flags().hamsOpened });
  const tileAt = (tx, ty) => (ty >= 0 && ty < rows && tx >= 0 && tx < cols ? grid[ty][tx] : ' ');
  const feet = p => [Math.floor((p.x + 8) / TS), Math.floor((p.y + 13) / TS)];

  // ---------- input ----------
  document.addEventListener('keydown', e => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k && active && e.target.tagName !== 'INPUT') { keys[k] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', e => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function initTouch() {
    touchReady = true;
    // analog stick → 8 directions
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let pid = null;
    const release = () => { pid = null; knob.style.transform = ''; for (const k in keys) keys[k] = false; };
    const steer = e => {
      const r = stick.getBoundingClientRect(), max = r.width / 2;
      let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
      const d = Math.hypot(dx, dy);
      if (d > max) { dx *= max / d; dy *= max / d; }
      knob.style.transform = `translate(${dx * 0.6}px, ${dy * 0.6}px)`;
      const dead = max * 0.25;
      keys.left = dx < -dead; keys.right = dx > dead; keys.up = dy < -dead; keys.down = dy > dead;
    };
    stick.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; stick.setPointerCapture(pid); steer(e); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === pid) steer(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => stick.addEventListener(ev, release));
    document.getElementById('btnAct').addEventListener('click', e => { e.stopPropagation(); if (frozen) Game.input('adv'); else tryInteract(); });
  }

  // ---------- map loading ----------
  function load(id, at, objStates, pos) {
    if (!touchReady) initTouch();
    mapId = id; map = Maps[id]; state = objStates || {};
    rows = map.rows.length; cols = Math.max(...map.rows.map(r => r.length));
    grid = []; objs = []; markers = {};
    const count = {};
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        let ch = map.rows[y][x] || map.fill;
        const def = map.legend[ch];
        if (def) {
          markers[ch] = markers[ch] || { x, y };
          count[ch] = (count[ch] || 0) + 1;
          if (def.type !== 'spawn') objs.push({ ...def, ch, key: `${id}@${x},${y}`, x, y, label: def.label && def.label.replace('#', count[ch]) });
          ch = def.floor || neighborFloor(x, y);
        }
        row.push(ch);
      }
      grid.push(row);
    }
    if (map.sasLabel && markers.S) objs.push({ type: 'look', key: 'npc:sas', label: map.sasLabel, verb: 'تحدّث مع ساس', x: markers.S.x, y: markers.S.y, show: () => !remote });
    prerender();

    const put = (p, tx, ty) => { Object.assign(p, { x: tx * TS, y: ty * TS, tx: null, ty: null, mv: false, dir: 'down' }); p.safe = { x: p.x, y: p.y }; };
    if (pos) { ['yunus', 'sas'].forEach(k => { put(P[k], 0, 0); Object.assign(P[k], pos[k]); P[k].safe = { x: P[k].x, y: P[k].y }; }); }
    else if (at && markers[at]) { const a = freeNear(markers[at]); put(P.yunus, a.x, a.y); const b = freeNear(a, true); put(P.sas, b.x, b.y); }
    else { put(P.yunus, markers.Y.x, markers.Y.y); put(P.sas, markers.S.x, markers.S.y); }
    trail = []; mini = null; frozen = false; active = true;
    FX.reset();
    last = performance.now();
  }

  // floor under an object marker: copy a walkable neighbour so items blend into sand/grass/etc.
  function neighborFloor(x, y) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const c = (map.rows[y + dy] || '')[x + dx];
      if (c && !map.legend[c] && !Tiles.solid(c, { opened: true })) return c;
    }
    return map.floor;
  }

  function freeNear(m, skipSelf) {
    const around = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    if (!skipSelf && !Tiles.solid(tileAt(m.x, m.y), env()) && !map.legend[map.rows[m.y][m.x]]) return m;
    for (const [dx, dy] of around) if (!Tiles.solid(tileAt(m.x + dx, m.y + dy), env())) return { x: m.x + dx, y: m.y + dy };
    return m;
  }

  function prerender() {
    layer = document.createElement('canvas');
    layer.width = cols * TS; layer.height = rows * TS;
    const g = layer.getContext('2d');
    g.translate(0, 0);
    Tiles.drawMap(g, grid, rows, cols, map.floor);
  }

  // ---------- objects ----------
  const visible = o => !o.show || o.show(Game.flags());
  const used = o => !!state[o.key];
  const drawn = o => visible(o) && !((o.type === 'pickup' || o.art === 'note' || o.art === 'crow_trapped') && used(o));
  const mine = (o, who = me()) => !(o.only && Net.connected && o.only !== who);
  const interactable = (o, who = me()) => visible(o) && mine(o, who) && !['zone', 'deco'].includes(o.type) && !(o.once && used(o)) && !(o.type === 'pickup' && used(o)) && !(o.type === 'fish' && used(o)) && !(o.type === 'fire' && state[o.key] >= 2);

  function verb(o) {
    if (o.type === 'fire') return state[o.key] ? 'اشوِ السمك' : 'أشعل النار';
    return o.verb;
  }

  function nearest(p) {
    const cx = p.x + 8, cy = p.y + 12;
    let best = null, bd = 21;
    for (const o of objs) {
      if (!interactable(o)) continue;
      const d = Math.hypot(o.x * TS + 8 - cx, o.y * TS + 8 - cy);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function tryInteract() {
    if (mini) return miniPress();
    if (frozen || !active) return;
    const o = nearest(P[me()]);
    if (o) Game.input('act', { key: o.key, who: me() });
  }

  // host only
  function hostInteract(key, who) {
    const o = objs.find(x => x.key === key);
    if (!o || !interactable(o, who)) return;
    const A = Game.api;
    switch (o.type) {
      case 'pickup':
        A.setObj(key, 1); A.out('sfx', 'pickup'); A.out('toast', '+ ' + o.name, true);
        A.out('wfx', 'pickup', o.x * TS + 8, o.y * TS + 8, who);
        if (o.set) for (const k in o.set) A.setFlag(k, o.set[k]);
        if (o.stat) A.applyStats(o.stat);
        if (o.quest) A.progress(o.quest);
        break;
      case 'fish':
        if (!A.hasQuest('fish') || A.questDone('fish')) return A.out('toast', 'لدينا ما يكفي من السمك.', true);
        A.mini(who, 'fish', key, null, ok => {
          if (!ok) return A.out('toast', 'أفلتت السمكة...', false);
          A.setObj(key, 1); A.out('sfx', 'splash'); A.out('toast', '+ سمكة', true); A.out('wfx', 'emote', 0, 0, who, 'star'); A.progress('fish');
        });
        break;
      case 'fire': {
        const st = state[key] || 0;
        if (st === 0) {
          if (!A.questDone('wood')) return A.out('toast', 'نحتاج حطبًا أولًا.', false);
          A.mini(who, 'hold', key, 'تُشعل النار...', () => { A.setObj(key, 1); A.out('sfx', 'fire'); A.out('wfx', 'fire', o.x * TS + 8, o.y * TS + 8, who); A.progress('fire'); });
        } else if (!A.questDone('fish')) A.out('toast', 'النار جاهزة... لكن أين السمك؟', false);
        else A.mini(who, 'hold', key + ':grill', 'تشوي السمك...', () => { A.setObj(key, 2); A.out('sfx', 'fire'); A.applyStats({ supplies: 2 }); A.progress('grill'); });
        break;
      }
      case 'look':
        if (o.once) A.setObj(key, 1);
        A.out('wfx', 'emote', 0, 0, who, o.art === 'note' || o.art === 'charts' ? '...' : '?');
        A.jump(o.label, who);
        break;
      case 'exit':
        if (o.cond && !o.cond(A.s)) return A.out('toast', o.locked || 'مغلق.', false);
        if (o.label) A.jump(o.label, who); else A.changeMap(o.to, o.at);
        break;
    }
  }

  function checkZones() {
    const ps = remote ? [P.yunus, P.sas] : [P.yunus];
    for (const o of objs) {
      if (o.type !== 'zone' || used(o) || !visible(o)) continue;
      if (!ps.some(p => { const [tx, ty] = feet(p); return tx === o.x && ty === o.y; })) continue;
      const A = Game.api;
      // a zone is usually a whole row of markers: consume the entire group at once
      objs.forEach(z => { if (z.type === 'zone' && z.ch === o.ch && !used(z)) A.setObj(z.key, 1); });
      if (o.quest) A.progress(o.quest);
      if (o.label) { A.jump(o.label); return; }
    }
  }

  // ---------- minigames (run on the interacting player's screen) ----------
  // fishing: cast → wait → bite (!) → reel bar → catch/escape animation
  function startMini(kind, text, cb, key) {
    for (const k in keys) keys[k] = false;
    const o = key && objs.find(x => key.startsWith(x.key));
    const L = P[me()];
    const target = o ? { x: o.x * TS + 8, y: o.y * TS + 8 } : { x: L.x + 8, y: L.y + 20 };
    if (kind === 'fish') {
      const dx = target.x - (L.x + 8), dy = target.y - (L.y + 12);
      L.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      mini = { kind, phase: 'cast', t0: now(), pt: now(), target, cb, wait: 0.9 + Math.random() * 1.6, zone: 0.25 + Math.random() * 0.5, w: 0.22, hint: 'رميت الصنّارة... انتظر' };
      Sound.sfx('whoosh');
    } else {
      mini = { kind: 'hold', t0: now(), dur: 1.8, cb, target, hint: text || '...', emit: 0 };
    }
  }
  const fishPos = () => 0.5 + 0.5 * Math.sin((now() - mini.pt) * 3.4 - Math.PI / 2);
  function setPhase(ph, hint) { mini.phase = ph; mini.pt = now(); if (hint) mini.hint = hint; }
  function miniPress() {
    if (!mini || mini.kind !== 'fish') return;
    if (mini.phase === 'bite') return setPhase('reel', 'اضغط E حين يلتقي المؤشر بالسمكة!');
    if (mini.phase === 'reel' && now() - mini.pt > 0.25) {
      const ok = Math.abs(fishPos() - mini.zone) < mini.w / 2;
      FX.burst('splash', mini.target.x, mini.target.y, 10);
      Sound.sfx('splash');
      setPhase(ok ? 'catch' : 'escape', ok ? 'اصطدتها!' : 'أفلتت...');
      mini.ok = ok;
    }
  }
  function endMini(ok) { const cb = mini.cb; mini = null; cb(ok); }

  function updateMini() {
    const el = now() - mini.pt, L = P[me()];
    if (mini.kind === 'hold') {
      if ((mini.emit -= 1 / 60) <= 0) { mini.emit = 0.08; FX.burst('sparks', mini.target.x, mini.target.y - 4, 2); if (Math.random() < 0.3) FX.burst('smoke', mini.target.x, mini.target.y - 8, 1); }
      if (now() - mini.t0 >= mini.dur) { FX.burst('sparkle', mini.target.x, mini.target.y - 6, 10); endMini(true); }
      return;
    }
    if (mini.phase === 'cast' && el > 0.5) { FX.burst('splash', mini.target.x, mini.target.y, 5); setPhase('wait'); }
    else if (mini.phase === 'wait' && el > mini.wait) { setPhase('bite', 'السمكة تعضّ! اضغط E'); FX.emote(() => ({ x: L.x, y: L.y }), '!'); Sound.sfx('pickup'); }
    else if (mini.phase === 'bite' && el > 1.6) setPhase('escape', 'تأخرت... هربت السمكة');
    else if (mini.phase === 'reel' && el > 6) setPhase('escape', 'أفلتت...');
    else if ((mini.phase === 'catch' || mini.phase === 'escape') && el > 1) {
      if (mini.phase === 'catch') { FX.float('+1', L.x + 8, L.y - 18, '#ffe9a8'); FX.burst('sparkle', L.x + 8, L.y - 8, 10); }
      endMini(mini.phase === 'catch');
    }
  }

  // rod, line, bobber and the jumping fish
  function drawFishing(ctx, cx, cy, t) {
    const L = P[me()], el = now() - mini.pt;
    const side = L.dir === 'left' ? -1 : 1;
    const hand = { x: L.x + 8 + side * 5 - cx, y: L.y - 2 - cy };
    const tip = { x: hand.x + side * 10, y: hand.y - 12 };
    let bob = { x: mini.target.x - cx, y: mini.target.y - cy };
    if (mini.phase === 'cast') { const k = Math.min(1, el / 0.5); bob = { x: tip.x + (bob.x - tip.x) * k, y: tip.y + (bob.y - tip.y) * k - Math.sin(k * Math.PI) * 20 }; }
    else if (mini.phase === 'wait') bob.y += Math.round(Math.sin(t * 3));
    else if (mini.phase === 'bite') bob.y += 2 + Math.round(Math.abs(Math.sin(t * 20)) * 2);
    else if (mini.phase === 'reel') { bob.y += Math.round(Math.sin(t * 14)); bob.x += Math.round(Math.sin(t * 9) * 2); }
    // rod
    ctx.fillStyle = '#5a3418';
    for (let i = 0; i <= 10; i++) ctx.fillRect(Math.round(hand.x + (tip.x - hand.x) * i / 10), Math.round(hand.y + (tip.y - hand.y) * i / 10), 2, 1);
    // line (sagging curve)
    if (mini.phase !== 'catch') {
      ctx.fillStyle = '#e8f0f0';
      for (let i = 0; i <= 16; i++) {
        const k = i / 16, sag = Math.sin(k * Math.PI) * (mini.phase === 'reel' ? 2 : 6);
        ctx.fillRect(Math.round(tip.x + (bob.x - tip.x) * k), Math.round(tip.y + (bob.y - tip.y) * k + sag), 1, 1);
      }
      ctx.fillStyle = '#d94040'; ctx.fillRect(Math.round(bob.x) - 1, Math.round(bob.y) - 2, 3, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bob.x) - 1, Math.round(bob.y), 3, 1);
    } else {
      const k = Math.min(1, el / 0.7), fx = bob.x + (hand.x - bob.x) * k, fy = bob.y + (hand.y - bob.y) * k - Math.sin(k * Math.PI) * 26;
      Assets.frame(ctx, 'fish', (Math.floor(t * 10) % 2) * 16, 0, 16, 16, fx - 8, fy - 8);
    }
  }

  function drawMiniUI(ctx, t) {
    if (mini.kind === 'hold') {
      const k = Math.min(1, (now() - mini.t0) / mini.dur);
      ctx.fillStyle = '#2b1d14'; ctx.fillRect(118, 150, 84, 10);
      ctx.fillStyle = '#f8e4b8'; ctx.fillRect(119, 151, 82, 8);
      ctx.fillStyle = '#e8b33a'; ctx.fillRect(120, 152, Math.round(80 * k), 6);
      ctx.fillStyle = '#fff0b0'; ctx.fillRect(120, 152, Math.round(80 * k), 2);
      return;
    }
    if (mini.phase !== 'reel') return;
    const x0 = 90, y0 = 144, w = 140;
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(x0 - 6, y0 - 8, w + 12, 26);
    ctx.fillStyle = '#b8743a'; ctx.fillRect(x0 - 5, y0 - 7, w + 10, 24);
    ctx.fillStyle = '#1d4f7a'; ctx.fillRect(x0, y0, w, 10);
    ctx.fillStyle = '#2f7fb0'; ctx.fillRect(x0, y0, w, 3);
    const zx = Math.round(x0 + (mini.zone - mini.w / 2) * w), zw = Math.round(mini.w * w);
    ctx.fillStyle = '#5c9e3f'; ctx.fillRect(zx, y0, zw, 10);
    ctx.fillStyle = '#8ad05a'; ctx.fillRect(zx, y0, zw, 2);
    Assets.frame(ctx, 'fish', (Math.floor(t * 6) % 2) * 16, 0, 16, 16, zx + zw / 2 - 8, y0 - 3);
    const mx = Math.round(x0 + fishPos() * w);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 1, y0 - 5, 3, 20);
    ctx.fillStyle = '#d94040'; ctx.fillRect(mx - 2, y0 - 6, 5, 2);
  }

  // ---------- simulation ----------
  function blocked(px, py) {
    const e = env();
    const x0 = Math.floor((px + 4) / TS), x1 = Math.floor((px + 11) / TS), y0 = Math.floor((py + 11) / TS), y1 = Math.floor((py + 15) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (Tiles.solid(tileAt(tx, ty), e)) return true;
      if (objs.some(o => o.solid && o.x === tx && o.y === ty && visible(o))) return true;
    }
    return false;
  }

  function animate(p, dx, dy, dt) {
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    p.mv = true; p.anim += dt; p.frame = Math.floor(p.anim * 10) % 6;
  }

  function move(p, dx, dy, dt) {
    if (!dx && !dy) { p.mv = false; return; }
    const len = Math.hypot(dx, dy), [tx, ty] = feet(p);
    const sp = SPEED * dt * (tileAt(tx, ty) === '-' ? 0.7 : 1);
    const nx = p.x + dx / len * sp, ny = p.y + dy / len * sp, stuck = blocked(p.x, p.y);
    if (stuck || !blocked(nx, p.y)) p.x = nx;
    if (stuck || !blocked(p.x, ny)) p.y = ny;
    p.x = Math.max(-4, Math.min(cols * TS - 12, p.x)); p.y = Math.max(-8, Math.min(rows * TS - 16, p.y));
    animate(p, dx, dy, dt);
  }

  function follow(O, L, dt) {
    if (map.follow === false) { O.mv = false; return; }
    if (L.mv) trail.push({ x: L.x, y: L.y });
    if (trail.length > 26) trail.shift();
    const target = trail[0] || L, dx = target.x - O.x, dy = target.y - O.y, d = Math.hypot(dx, dy);
    if (d > 80) { O.x = target.x; O.y = target.y; }
    else if (d > 3 && L.mv) { O.x += dx / d * SPEED * dt; O.y += dy / d * SPEED * dt; animate(O, dx, dy, dt); }
    else O.mv = false;
  }

  function update(dt) {
    const L = P[me()], O = P[other()];
    if (!frozen && !mini) move(L, (keys.right ? 1 : 0) - (keys.left ? 1 : 0), (keys.down ? 1 : 0) - (keys.up ? 1 : 0), dt);
    else L.mv = false;

    hurtT -= dt;
    const [tx, ty] = feet(L), ch = tileAt(tx, ty), hz = Tiles.hazard(ch);
    if (hz && hurtT <= 0 && !frozen) {
      Object.assign(L, L.safe); hurtT = 1;
      View.fx('shake'); Sound.sfx('hurt'); View.toast(HURT[hz], false);
      FX.burst('hurt', L.x + 8, L.y + 4, 8); FX.emote(() => ({ x: L.x, y: L.y }), '!');
    } else if (!['a', 't', 'R'].includes(ch) && (safeT -= dt) <= 0) { L.safe = { x: L.x, y: L.y }; safeT = 0.25; }

    if (remote) {
      if (O.tx !== null) {
        const k = Math.min(1, dt * 12);
        O.x += (O.tx - O.x) * k; O.y += (O.ty - O.y) * k;
        O.anim += dt; O.frame = O.mv ? Math.floor(O.anim * 10) % 6 : -1;
      }
    } else if (me() === 'yunus') follow(O, L, dt);

    if (Net.connected && (sendT -= dt) <= 0) {
      sendT = 0.066;
      Net.send({ t: 'pos', id: me(), x: Math.round(L.x), y: Math.round(L.y), dir: L.dir, mv: L.mv });
    }
    if (Net.mode !== 'guest' && !frozen && !Game.api.running) checkZones();

    if (mini) updateMini();

    // footstep dust / splashes
    FX.update(dt);
    ['yunus', 'sas'].forEach(id => {
      const p = P[id];
      if (!p.mv) return;
      p.step = (p.step || 0) - dt;
      if (p.step > 0) return;
      p.step = 0.22;
      const [fx, fy] = feet(p), c = tileAt(fx, fy);
      if (c === '-') FX.burst('splash', p.x + 8, p.y + 15, 3);
      else if (c === '.' ) FX.burst('dust', p.x + 8, p.y + 15, 2);
      else if (c === ',' || c === ';') FX.burst('grass', p.x + 8, p.y + 15, 2);
    });
    const n = !frozen && !mini && nearest(L);
    View.prompt(frozen ? null : mini ? mini.hint : n ? `${verb(n)}  [E]` : null);
  }

  // ---------- drawing ----------
  function ring(g, x, y, r) {
    for (let dy = -r; dy <= r; dy += 2) { const w = Math.sqrt(r * r - dy * dy); g.fillRect(Math.round(x - w), Math.round(y + dy), Math.round(w * 2), 2); }
  }

  function frame(ctx, t) {
    const n = performance.now(), dt = Math.min(0.05, (n - last) / 1000);
    last = n;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    if (!active) return;
    update(dt);

    const L = P[me()], mw = cols * TS, mh = rows * TS;
    const cx = mw <= VW ? Math.round((mw - VW) / 2) : Math.max(0, Math.min(mw - VW, Math.round(L.x + 8 - VW / 2)));
    const cy = mh <= VH ? Math.round((mh - VH) / 2) : Math.max(0, Math.min(mh - VH, Math.round(L.y + 8 - VH / 2)));
    ctx.drawImage(layer, -cx, -cy);

    const e = env();
    const tx0 = Math.max(0, Math.floor(cx / TS)), ty0 = Math.max(0, Math.floor(cy / TS));
    const tx1 = Math.min(cols - 1, Math.floor((cx + VW) / TS)), ty1 = Math.min(rows - 1, Math.floor((cy + VH) / TS));
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = grid[ty][tx];
      if (Tiles.ANIM.has(ch)) Tiles.drawAnim(ctx, ch, tx * TS - cx, ty * TS - cy, tx, ty, t, e);
    }

    const ents = [];
    for (const o of objs) {
      if (!o.art || !drawn(o)) continue;
      const near = Math.hypot(o.x * TS - L.x, o.y * TS - L.y) < 40;
      ents.push({ y: o.y * TS, draw: () => Sprites.draw(ctx, o.art, o.x * TS - cx, o.y * TS - cy, t, state[o.key] || 0, near) });
    }
    const office = map.style === 'office';
    ['yunus', 'sas'].forEach(id => {
      const p = P[id];
      ents.push({
        y: p.y + 1,
        draw: () => {
          const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
          Sprites.person(ctx, x, y + (p.crouch && now() - p.crouch < 0.25 ? 2 : 0), p.dir, p.mv ? p.frame : -1, Sprites.STYLES[office ? id + '_office' : id]);
          if (remote) { ctx.fillStyle = id === 'yunus' ? '#c0433a' : '#2a9d8f'; ctx.fillRect(x + 7, y - 5, 2, 2); }
        },
      });
    });
    // companions
    const f = Game.flags();
    // companions appear only after the meeting, and never while their "not yet met" version is on the map
    const trappedCrow = objs.some(o => o.art === 'crow_trapped' && !used(o));
    const waitingHams = objs.some(o => o.art === 'hams' && visible(o));
    if (f.crowFreed && !office && !trappedCrow) ents.push(FX.crowEntity(t, 1 / 60, P.sas, P.yunus, cx, cy));
    const hamsHere = f.metHams && !f.hamsSacrifice && !f.hamsLeft && !f.hamsHero && !office && mapId !== 'jungle';
    if (hamsHere && !waitingHams) ents.push(FX.hamsEntity(t, 1 / 60, P.yunus, cx, cy));
    ents.forEach(e => { if (!e.draw.length) return; const d = e.draw; e.draw = () => d(ctx); });
    ents.sort((a, b) => a.y - b.y).forEach(x => x.draw());
    if (mini && mini.kind === 'fish') drawFishing(ctx, cx, cy, t);
    FX.draw(ctx, cx, cy);

    const b = Tiles.breath();
    if (map.flesh) {
      ctx.fillStyle = '#4a0f18';
      ctx.globalAlpha = 0.1 + 0.2 * b;
      ctx.fillRect(0, 0, VW, 8); ctx.fillRect(0, VH - 8, VW, 8); ctx.fillRect(0, 8, 8, VH - 16); ctx.fillRect(VW - 8, 8, 8, VH - 16);
      ctx.globalAlpha = 1;
    }

    if (map.dark) {
      if (!light) { light = document.createElement('canvas'); light.width = VW; light.height = VH; }
      const g = light.getContext('2d'), f = Game.flags();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, VW, VH); g.fillStyle = `rgba(4,2,8,${map.dark})`; g.fillRect(0, 0, VW, VH);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      const r = (f.lantern ? 62 : 42) + (f.lanternOil ? 18 : 0) + (f.frogLight ? 12 : 0);
      const glow = (x, y, rad) => { for (let i = 4; i >= 1; i--) { g.globalAlpha = 0.42; ring(g, x, y, rad * i / 4); } };
      ['yunus', 'sas'].forEach(id => glow(P[id].x + 8 - cx, P[id].y + 8 - cy, r * (1 + 0.04 * Math.sin(t * 9))));
      objs.forEach(o => { if (drawn(o) && o.art && o.art !== 'rudder') glow(o.x * TS + 8 - cx, o.y * TS + 8 - cy, o.glow || 14); });
      ctx.drawImage(light, 0, 0);
    }

    if (map.breathUI) {
      ctx.fillStyle = '#2b1d14'; ctx.fillRect(138, 4, 44, 8);
      ctx.fillStyle = '#f3d9a4'; ctx.fillRect(139, 5, 42, 6);
      ctx.fillStyle = b > 0.5 ? '#d9434f' : '#63b6d8'; ctx.fillRect(140, 6, Math.round(40 * b), 4);
    }

    if (mini) drawMiniUI(ctx, t);
  }

  return {
    load, frame, tryInteract, hostInteract, mini: startMini,
    // visual events broadcast by the host
    wfx(kind, x, y, who, arg) {
      if (!active) return;
      const p = P[who] || P.yunus;
      if (kind === 'pickup') { FX.burst('sparkle', x, y - 4, 10); FX.float('+1', x, y - 10, '#ffe9a8'); p.crouch = now(); }
      if (kind === 'fire') { FX.burst('sparks', x, y - 4, 16); FX.burst('smoke', x, y - 8, 4); }
      if (kind === 'emote') FX.emote(() => ({ x: p.x, y: p.y }), arg);
      if (kind === 'companion') FX.emote(() => (who === 'crow' ? FX.crowPos : FX.hamsPos), arg);
      if (kind === 'burst') FX.burst(arg, x, y);
    },
    stop() { active = false; mini = null; View.prompt(null); },
    setObj(key, val) { state[key] = val; },
    positions: () => ({ yunus: { x: Math.round(P.yunus.x), y: Math.round(P.yunus.y), dir: P.yunus.dir }, sas: { x: Math.round(P.sas.x), y: Math.round(P.sas.y), dir: P.sas.dir } }),
    remotePos(m) {
      if (m.id === me()) return;
      const p = P[m.id];
      if (p.tx === null) { p.x = m.x; p.y = m.y; }
      Object.assign(p, { tx: m.x, ty: m.y, dir: m.dir, mv: m.mv });
    },
    setRemote(v) { remote = v; P.sas.tx = P.yunus.tx = null; },
    get active() { return active; },
    get frozen() { return frozen; },
    set frozen(v) { frozen = v; if (v) for (const k in keys) keys[k] = false; },
  };
})();
