// Game engine (authoritative on solo/host). Runs story labels, quests, stats, world hand-off,
// autosave and multiplayer sync. Everything visible goes through out() so the guest mirrors it.
const Game = (() => {
  const SAVE_KEY = 'tib.save.v2', END_KEY = 'tib.endings';
  const MAX = 5;
  const ENDINGS = {
    paper: 'العودة إلى الورق', sea: 'نداء البحر', loop: 'الحلم يعود',
    logbook: 'سجلّ الرحلة', office_island: 'الجزيرة في المكتب', friends: 'بحّاران على اليابسة', lost: 'الابتلاع',
  };
  const fresh = () => ({
    label: 'start', i: 0, flags: {}, stats: { hull: 5, supplies: 3, resolve: 3, bond: 3 }, day: 0,
    scene: 'black', sceneOpts: {}, music: null, amb: [], hud: false, quests: null,
    mode: 'vn', map: null, objs: {}, pos: null, frozen: false,
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ar = n => Number(n).toLocaleString('ar-EG');

  let s = fresh(), mirror = { flags: {} };
  let runId = 0, running = false, sayDone = null, pickFn = null, chapterClose = null, lastDialog = null;
  const minis = {};

  // ---------- output (local + broadcast) ----------
  function out(fn, ...args) {
    View[fn](...args);
    if (fn === 'say' || fn === 'choices') lastDialog = [fn, ...args];
    if (fn === 'hideDialog' || fn === 'world') lastDialog = null;
    if (Net.mode === 'host' && Net.connected) Net.send({ t: 'v', fn, args });
  }
  const pushHud = () => out('hud', s.hud, s.stats, s.day);
  const pushQuests = () => out('quests', s.quests);
  const pushFlags = () => out('state', { flags: s.flags });

  // ---------- save ----------
  let demo = false;
  function save(offset = 0) {
    if (Net.mode === 'guest' || demo) return;
    if (s.mode === 'world') s.pos = World.positions();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, i: s.i + offset })); } catch (e) {}
  }
  function loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && Story[d.label] ? d : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function endings() { try { return JSON.parse(localStorage.getItem(END_KEY)) || []; } catch (e) { return []; } }
  function unlockEnding(id) {
    const list = endings();
    if (!list.includes(id)) { list.push(id); try { localStorage.setItem(END_KEY, JSON.stringify(list)); } catch (e) {} }
  }

  // ---------- stats / quests / objects ----------
  function applyStats(d) {
    const names = { hull: 'الهيكل', supplies: 'المؤن', resolve: 'العزيمة', bond: 'قربك من ساس' };
    for (const k in d) {
      const v = d[k];
      s.stats[k] = Math.max(0, Math.min(MAX, s.stats[k] + v));
      out('toast', `${names[k]} ${v > 0 ? '+' : '−'}${ar(Math.abs(v))}`, v > 0);
      out('sfx', v > 0 ? 'up' : 'down');
      if (k === 'bond' && s.mode === 'world') out('wfx', 'emote', 0, 0, 'sas', v > 0 ? 'heart' : 'sad');
    }
    pushHud();
  }

  // list items: [id, text, need = 1, owner?, mpOnly?] — owner = 'yunus' | 'sas' (personal quest in co-op)
  function setQuests(q) {
    s.quests = q && {
      title: q.title, done: q.done || null,
      list: q.list
        .filter(([, , , , mpOnly]) => !mpOnly || Net.connected)
        .map(([id, text, need = 1, owner = null]) => ({ id, text, need, owner, n: 0 })),
    };
    pushQuests();
  }
  const findQuest = id => s.quests && s.quests.list.find(x => x.id === id);
  const questDone = id => { const q = findQuest(id); return !!q && q.n >= q.need; };
  function progress(id, n = 1) {
    const q = findQuest(id);
    if (!q || q.n >= q.need) return;
    q.n = Math.min(q.need, q.n + n);
    if (q.n >= q.need) { out('toast', '✔ ' + q.text, true); out('sfx', 'quest'); }
    pushQuests(); save();
    checkQuestsDone();
  }
  function checkQuestsDone() {
    if (running || busyPersonal() || !s.quests || !s.quests.done || !s.quests.list.every(q => q.n >= q.need)) return;
    const label = s.quests.done;
    s.quests.done = null;
    setTimeout(() => jump(label), 600);
  }
  function setObj(key, val) { s.objs[key] = val; out('obj', key, val); }

  // ---------- personal dialogs (co-op): run for one player only, the other keeps playing ----------
  const personal = { yunus: null, sas: null };
  const personalCache = {};
  const busyPersonal = () => !!(personal.yunus || personal.sas);

  function sendTo(who, fn, ...args) {
    if (who === localId()) View[fn](...args);
    else if (Net.connected) Net.send({ t: 'v', fn, args });
  }

  // a label can run privately if nothing reachable from it changes the shared scene/map/music
  function personalOK(label) {
    if (label in personalCache) return personalCache[label];
    const seen = new Set(), stack = [label];
    let ok = true;
    while (stack.length && ok) {
      const l = stack.pop();
      if (seen.has(l)) continue;
      seen.add(l);
      for (const c of Story[l] || []) {
        if ('scene' in c || c.explore || c.chapter || 'music' in c || 'amb' in c || c.ending || c.end || 'quests' in c) { ok = false; break; }
        if (c.goto) stack.push(c.goto);
        if (c.choice) c.choice.forEach(o => o.goto && stack.push(o.goto));
      }
    }
    return (personalCache[label] = ok);
  }

  async function runPersonal(label, who) {
    const r = personal[who] = { label, i: 0, sayDone: null, pickFn: null };
    sendTo(who, 'freeze', true);
    while (true) {
      const seq = Story[r.label], c = seq && seq[r.i];
      if (!c) break;
      r.i++;
      if (c.when && !c.when(s)) continue;
      if (c.set) { Object.assign(s.flags, c.set); pushFlags(); }
      if (c.stat) applyStats(c.stat);
      if (c.progress) progress(c.progress, c.n);
      if (c.obj) for (const k in c.obj) setObj(k, c.obj[k]);
      if (c.sfx) sendTo(who, 'sfx', c.sfx);
      if (c.fx) sendTo(who, 'fx', c.fx);
      if (c.wait) await sleep(c.wait);
      if (c.cg) { await new Promise(done => { sendTo(who, 'cg', c.cg, typeof c.text === 'function' ? c.text(s) : c.text || ''); r.sayDone = done; }); sendTo(who, 'cgEnd'); }
      if (c.say) await new Promise(done => { sendTo(who, 'say', c.say, typeof c.text === 'function' ? c.text(s) : c.text); r.sayDone = done; });
      if (c.choice) {
        await new Promise(done => {
          const opts = c.choice.filter(o => !o.when || o.when(s));
          sendTo(who, 'choices', opts.map(o => o.text), who);
          r.pickFn = k => {
            const o = opts[k];
            if (!o) return;
            r.pickFn = null;
            sendTo(who, 'hideDialog'); sendTo(who, 'sfx', 'ui');
            if (o.set) { Object.assign(s.flags, o.set); pushFlags(); }
            if (o.stat) applyStats(o.stat);
            if (o.goto) { r.label = o.goto; r.i = 0; }
            done();
          };
        });
      }
      if (c.goto) { r.label = c.goto; r.i = 0; }
      if (c.resume) break;
    }
    personal[who] = null;
    sendTo(who, 'freeze', false);
    save();
    checkQuestsDone();
  }

  // ---------- story commands ----------
  async function setScene(name, opts, fade) {
    s.scene = name; s.sceneOpts = opts || {};
    if (!fade) return out('scene', name, s.sceneOpts);
    out('hideDialog'); out('fade', true); await sleep(650);
    out('scene', name, s.sceneOpts);
    out('fade', false); await sleep(450);
  }

  function say(c) {
    return new Promise(done => {
      out('say', c.say, typeof c.text === 'function' ? c.text(s) : c.text);
      sayDone = done;
    });
  }

  function choice(c) {
    return new Promise(done => {
      const opts = c.choice.filter(o => !o.when || o.when(s));
      // `who` makes it one player's decision in co-op; the other sees them thinking
      const decider = Net.connected && c.who ? c.who : null;
      if (decider) {
        const other = decider === 'sas' ? 'yunus' : 'sas';
        sendTo(decider, 'choices', opts.map(o => o.text), decider);
        sendTo(other, 'say', 'narrator', decider === 'sas' ? 'ساس تفكّر في قرارها...' : 'يونس يفكّر في قراره...');
        lastDialog = null;
      } else out('choices', opts.map(o => o.text), 'yunus');
      pickFn = (k, remote) => {
        const o = opts[k];
        if (!o || (decider && (remote ? 'sas' : 'yunus') !== decider)) return;
        pickFn = null;
        out('hideDialog'); out('sfx', 'ui');
        if (Net.connected) out('toast', remote ? `ساس اختارت: ${o.text}` : `يونس اختار: ${o.text}`, true);
        if (o.set) { Object.assign(s.flags, o.set); pushFlags(); }
        if (o.stat) applyStats(o.stat);
        if (o.goto) { s.label = o.goto; s.i = 0; }
        done();
      };
    });
  }

  function chapter(title, sub) {
    return new Promise(done => {
      const id = runId;
      out('chapter', title, sub);
      let closed = false;
      const close = () => {
        if (closed || id !== runId) return;
        closed = true; chapterClose = null;
        out('chapterHide');
        setTimeout(() => id === runId && done(), 700);
      };
      setTimeout(() => { if (!closed && id === runId) chapterClose = close; }, 800);
      setTimeout(close, 4500);
    });
  }

  function enterWorld(map, at) {
    const m = Maps[map];
    Object.assign(s, { mode: 'world', map, scene: 'world', frozen: false, music: m.music, amb: m.amb, pos: null });
    out('hideDialog');
    out('music', m.music); out('amb', m.amb);
    out('world', map, at || null, s.objs, null);
    out('freeze', false);
    out('toast', m.name, true);
    save();
  }
  function leaveWorld() { s.mode = 'vn'; s.map = null; out('world', null); }

  async function exec(c) {
    if (c.when && !c.when(s)) return;
    if ('scene' in c) {
      if (s.mode === 'world') {
        out('hideDialog'); out('fade', true); await sleep(650);
        leaveWorld(); await setScene(c.scene, c.opts, false);
        out('fade', false); await sleep(450);
      } else await setScene(c.scene, c.opts, c.fade !== false);
    }
    if ('music' in c) { s.music = c.music; out('music', c.music); }
    if ('amb' in c) { s.amb = c.amb; out('amb', c.amb); }
    if ('hud' in c) s.hud = c.hud;
    if (c.day) s.day = c.day;
    if ('hud' in c || c.day) pushHud();
    if (c.set) { Object.assign(s.flags, c.set); pushFlags(); }
    if (c.stat) applyStats(c.stat);
    if ('quests' in c) setQuests(c.quests);
    if (c.progress) progress(c.progress, c.n);
    if (c.obj) for (const k in c.obj) setObj(k, c.obj[k]);
    if (c.sfx) out('sfx', c.sfx);
    if (c.fx) out('fx', c.fx);
    if (c.wait) await sleep(c.wait);
    if (c.chapter) { save(-1); await chapter(c.chapter, c.sub); }
    if (c.cg) {
      save(-1);
      await new Promise(done => { out('hideDialog'); out('cg', c.cg, typeof c.text === 'function' ? c.text(s) : c.text || ''); sayDone = done; });
      out('cgEnd');
    }
    if (c.say) { save(-1); await say(c); }
    if (c.choice) { save(-1); await choice(c); }
    if (c.goto) { s.label = c.goto; s.i = 0; }
    if (c.explore) {
      out('fade', true); await sleep(650);
      enterWorld(c.explore, c.at);
      out('fade', false);
      return 'stop';
    }
    if (c.resume) { s.frozen = false; out('freeze', false); save(); return 'stop'; }
    if (c.ending) { unlockEnding(c.ending); out('chapter', 'النهاية', ENDINGS[c.ending]); await sleep(5000); out('chapterHide'); await sleep(800); }
    if (c.end) { clearSave(); toTitle(); return 'stop'; }
  }

  async function play() {
    const id = ++runId;
    running = true;
    while (id === runId) {
      const seq = Story[s.label], c = seq && seq[s.i];
      if (!c) { console.error(`Story stopped: "${s.label}"[${s.i}] missing`); break; }
      s.i++;
      if (await exec(c) === 'stop') break;
    }
    if (id === runId) { running = false; checkQuestsDone(); }
  }

  // called from the world (host side)
  function jump(label, who) {
    if (who === 'sas' && Story[label + '@sas']) label += '@sas';
    if (!Story[label] || (who && personal[who])) return;
    if (Net.connected && who && personalOK(label)) { runPersonal(label, who); return; }
    if (busyPersonal()) { setTimeout(() => jump(label), 500); return; }
    if (running) return;
    s.label = label; s.i = 0; s.frozen = true;
    out('freeze', true);
    play();
  }

  async function changeMap(to, at) {
    if (running) return;
    if (busyPersonal()) { out('toast', 'انتظر حتى ينهي رفيقك ما يفعله.', false); return; }
    running = true;
    out('fade', true); await sleep(600);
    enterWorld(to, at);
    out('fade', false);
    running = false;
    const m = Maps[to];
    if (m.onEnter && !s.objs['enter:' + to]) { setObj('enter:' + to, 1); jump(m.onEnter); }
  }

  // ---------- input ----------
  function input(kind, data) {
    if (Net.mode === 'guest') {
      if (kind === 'adv' && View.isTyping()) return View.finish();
      Net.send({ t: 'in', k: kind, d: data });
      return;
    }
    handle(kind, data, false);
  }

  function handle(kind, d, remote) {
    const who = remote ? 'sas' : 'yunus', p = personal[who];
    if (p && (kind === 'adv' || kind === 'pick')) {
      if (kind === 'pick') return p.pickFn && p.pickFn(d);
      if (!remote && View.isTyping()) return View.finish();
      if (p.sayDone) { const f = p.sayDone; p.sayDone = null; f(); }
      return;
    }
    if (kind === 'adv') {
      if (chapterClose) return chapterClose();
      if (View.isTyping()) return out('finish');
      if (sayDone) { const f = sayDone; sayDone = null; f(); }
    } else if (kind === 'pick') {
      if (pickFn) pickFn(d, remote);
    } else if (kind === 'act') {
      if (s.mode === 'world' && !running && !s.frozen && !personal[who]) World.hostInteract(d.key, who);
    } else if (kind === 'mini') {
      const cb = minis[d.key]; delete minis[d.key];
      if (cb) cb(d.ok);
    }
  }

  // API the world uses on the host
  const api = {
    get s() { return s; },
    get running() { return running; },
    out, progress, questDone, setObj, jump, changeMap, applyStats, save,
    hasQuest: id => !!findQuest(id),
    setFlag(k, v) { s.flags[k] = v; pushFlags(); },
    mini(who, kind, key, text, cb) {
      minis[key] = cb;
      if (who === localId()) World.mini(kind, text, ok => handle('mini', { key, ok }), key);
      else Net.send({ t: 'mini', kind, key, text });
    },
  };

  const localId = () => (Net.mode === 'guest' ? 'sas' : 'yunus');
  const flags = () => (Net.mode === 'guest' ? mirror.flags : s.flags);

  // ---------- flow ----------
  function resetRun() {
    runId++; running = false;
    sayDone = pickFn = chapterClose = null; lastDialog = null;
  }

  function toTitle() {
    demo = false;
    resetRun();
    View.hideDialog(); View.chapterHide(); View.fade(false);
    View.hud(false); View.quests(null); View.world(null); View.prompt(null);
    Renderer.set('title');
    Sound.music('night'); Sound.ambience(['ocean']);
    Menu.show();
  }

  function snapshot() {
    return {
      scene: s.scene, sceneOpts: s.sceneOpts, music: s.music, amb: s.amb, hud: s.hud, stats: s.stats, day: s.day,
      quests: s.quests, flags: s.flags, mode: s.mode, map: s.map, objs: s.objs,
      pos: s.mode === 'world' ? World.positions() : null, frozen: s.frozen, dialog: lastDialog,
    };
  }

  function applySync(p) {
    Menu.hide();
    mirror.flags = p.flags;
    View.world(null);
    View.scene(p.scene === 'world' ? 'black' : p.scene, p.sceneOpts);
    Sound.music(p.music); Sound.ambience(p.amb);
    View.hud(p.hud, p.stats, p.day); View.quests(p.quests);
    if (p.mode === 'world') View.world(p.map, null, p.objs, p.pos);
    View.freeze(p.frozen);
    if (p.dialog) { View[p.dialog[0]](...p.dialog.slice(1)); View.finish(); }
  }

  function start(saved) {
    Sound.init(); Sound.sfx('ui');
    Menu.hide();
    resetRun();
    s = saved ? { ...fresh(), ...saved } : fresh();
    if (!saved) clearSave();
    out('scene', s.scene === 'world' ? 'black' : s.scene, s.sceneOpts);
    out('music', s.music); out('amb', s.amb);
    pushHud(); pushQuests(); pushFlags();
    if (s.mode === 'world') {
      out('world', s.map, null, s.objs, s.pos);
      if (Net.connected) Net.send({ t: 'sync', snap: snapshot() });
      if (s.frozen) play(); else out('freeze', false);
    } else {
      if (Net.connected) Net.send({ t: 'sync', snap: snapshot() });
      play();
    }
  }

  function boot() {
    View.init();
    Menu.init();

    View.el.app.addEventListener('click', e => {
      if (e.target.closest('button, input, #touch') || Menu.visible) return;
      if (World.active && !World.frozen) return;
      input('adv');
    });
    document.addEventListener('keydown', e => {
      if (Menu.visible || e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase(), act = e.code === 'Space' || k === 'enter' || k === 'e' || k === 'ث';
      if (World.active && !World.frozen) { if (act) { e.preventDefault(); World.tryInteract(); } return; }
      if (e.repeat) return;
      if (act) { e.preventDefault(); input('adv'); }
      else if (/^[1-9]$/.test(e.key)) input('pick', +e.key - 1);
    });

    Net.on('data', m => {
      if (Net.mode === 'guest') {
        if (m.t === 'v') { Menu.hide(); if (m.fn === 'state') mirror = m.args[0]; else View[m.fn](...m.args); }
        else if (m.t === 'sync') applySync(m.snap);
        else if (m.t === 'pos') World.remotePos(m);
        else if (m.t === 'mini') World.mini(m.kind, m.text, ok => Net.send({ t: 'in', k: 'mini', d: { key: m.key, ok } }), m.key);
        else if (m.t === 'full') { Menu.status('الغرفة ممتلئة.'); Net.leave(); }
      } else if (m.t === 'in') handle(m.k, m.d, true);
      else if (m.t === 'pos') World.remotePos(m);
    });
    Net.on('join', () => {
      View.toast('انضمت ساس إلى الرحلة!', true);
      Menu.status('انضمت ساس! اضغط «ابدأ».');
      World.setRemote(true);
      if (!Menu.visible) Net.send({ t: 'sync', snap: snapshot() });
    });
    Net.on('leave', () => {
      World.setRemote(false);
      if (Net.mode === 'guest') { Net.leave(); View.toast('انقطع الاتصال بالمضيف', false); toTitle(); }
      else View.toast('غادرت ساس. ستكمل معك كرفيقة.', false);
    });

    toTitle();
  }

  return {
    boot, start, input, toTitle,
    // play without touching the save (used by automated playthrough tests)
    demo(snap) { demo = true; start({ ...fresh(), ...snap }); }, api, loadSave, endings, ENDINGS, localId, flags,
    mirror(p) { mirror = p; },
  };
})();
