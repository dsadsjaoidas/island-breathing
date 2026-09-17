// Presentation layer (DOM, canvas, sound). Holds no game rules: the engine — or the host over
// the network — calls these functions, so both players see the same thing.
const View = (() => {
  const el = {};
  const ar = n => Number(n).toLocaleString('ar-EG');
  const STAT_NAMES = { hull: 'الهيكل', supplies: 'المؤن', resolve: 'العزيمة', bond: 'ساس' };
  let typing = null, lastPrompt = null, blinkFace = null;
  // blink animation for large portraits
  setInterval(() => {
    if (!blinkFace || el.portraitBox.hidden) return;
    const g = el.portrait.getContext('2d'), closed = Date.now() % 3400 < 170;
    g.clearRect(0, 0, 64, 64);
    g.drawImage(blinkFace, closed ? 64 : 0, 0, 64, 64, 0, 0, 64, 64);
  }, 80);

  function portrait(who) {
    const ch = Characters[who] || {};
    const ref = typeof ch.portrait === 'string' ? Characters[ch.portrait] : ch;
    const face = ref.face, has = !!(face || ref.portrait);
    el.portraitBox.hidden = !has;
    if (!has) return false;
    const c = el.portrait, g = c.getContext('2d');
    if (face) {
      const im = Assets.img[face];
      const big = im.width === 128;  // 2-frame 64px portrait (open / blink)
      const animal = face.startsWith('an_');
      c.width = c.height = big || animal ? 64 : 40;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, c.width, c.height);
      if (animal) g.drawImage(im, 0, 0, 24, 24, 4, 6, 56, 56);
      else if (big) g.drawImage(im, 0, 0, 64, 64, 0, 0, 64, 64);
      else g.drawImage(im, 0, 0, im.width, im.height, 1, 1, 38, 38);
      blinkFace = big ? im : null;
    } else {
      c.width = c.height = 16;
      Renderer.paint(c, ref.portrait, PAL);
    }
    el.portraitName.textContent = ch.name;
    return true;
  }

  function stopTyping() { if (typing) clearTimeout(typing.timer); typing = null; }

  const V = {
    el,

    init() {
      document.querySelectorAll('[id]').forEach(n => { el[n.id] = n; });
      Renderer.init(el.cv);
      const fit = () => el.app.style.setProperty('--w', el.app.clientWidth + 'px');
      new ResizeObserver(fit).observe(el.app); fit();
    },

    say(who, text) {
      const ch = Characters[who] || Characters.narrator;
      stopTyping();
      el.dialog.hidden = false;
      const hasPic = portrait(who);
      el.nameTag.hidden = hasPic || !ch.name;
      el.nameTag.textContent = ch.name || '';
      el.choices.hidden = true; el.text.hidden = false; el.next.hidden = true;
      el.text.className = ch.eerie ? 'eerie' : who === 'narrator' ? 'narr' : '';
      // word by word: Arabic letters reshape if revealed one character at a time
      const words = text.split(' ');
      let n = 0;
      typing = { text };
      const tick = () => {
        el.text.textContent = words.slice(0, ++n).join(' ');
        if (ch.blip && n % 2) Sound.blip(ch.blip);
        if (n >= words.length) V.finish(); else typing.timer = setTimeout(tick, 50);
      };
      tick();
    },
    finish() {
      if (!typing) return;
      const t = typing.text; stopTyping();
      el.text.textContent = t; el.next.hidden = false;
    },
    isTyping: () => !!typing,

    choices(texts, who) {
      stopTyping();
      el.dialog.hidden = false;
      portrait(who || 'yunus');
      el.nameTag.hidden = true; el.text.hidden = true; el.next.hidden = true;
      el.choices.hidden = false; el.choices.replaceChildren();
      texts.forEach((t, k) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = `<span class="num">${ar(k + 1)}</span>`;
        b.append(t);
        b.onclick = () => Game.input('pick', k);
        el.choices.append(b);
      });
    },
    hideDialog() { stopTyping(); el.dialog.hidden = true; },

    chapter(title, sub) {
      V.hideDialog();
      el.chapter.querySelector('.ch-title').textContent = title;
      el.chapter.querySelector('.ch-sub').textContent = sub || '';
      el.chapter.hidden = false; void el.chapter.offsetWidth;
      el.chapter.classList.add('show');
    },
    chapterHide() { el.chapter.classList.remove('show'); setTimeout(() => { if (!el.chapter.classList.contains('show')) el.chapter.hidden = true; }, 700); },
    fade(on) { el.fade.classList.toggle('on', on); },

    scene(name, opts) { V.lastScene = [name, opts]; Renderer.set(name, opts); },

    // animated illustration with a caption; the previous scene (or the map) returns afterwards
    cg(name, text) {
      el.cg.hidden = false;
      el.app.classList.add('cg-on');
      el.cg.classList.remove('show'); void el.cg.offsetWidth; el.cg.classList.add('show');
      el.cgText.textContent = text;
      Renderer.set('cg', { name, t0: performance.now() / 1000 });
      Sound.sfx('whoosh');
    },
    cgEnd() {
      el.cg.hidden = true;
      el.app.classList.remove('cg-on');
      if (World.active) Renderer.set('world');
      else if (V.lastScene) Renderer.set(...V.lastScene);
    },
    music(name) { Sound.music(name); },
    amb(list) { Sound.ambience(list); },
    sfx(name) { Sound.sfx(name); },
    fx(name) {
      if (name === 'lightning') { Renderer.lightning(); Sound.sfx('thunder'); }
      if (name === 'flash') Renderer.flash();
      if (name === 'shake') { el.stage.classList.remove('shake'); void el.stage.offsetWidth; el.stage.classList.add('shake'); }
    },

    hud(show, stats, day) {
      el.hud.hidden = !show;
      if (!show) return;
      const pips = v => Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('');
      el.hud.innerHTML = (day ? `<div class="day">اليوم ${ar(day)}</div>` : '') +
        Object.keys(STAT_NAMES).map(k => `<div class="stat ${k}"><span>${STAT_NAMES[k]}</span><b>${pips(stats[k])}</b></div>`).join('');
    },

    quests(q) {
      el.quests.hidden = !q;
      if (!q) return;
      const me = Game.localId(), coop = Net.connected;
      const tag = { yunus: 'يونس', sas: 'ساس' };
      el.quests.innerHTML = `<div class="q-title">${q.title}</div><ul>` + q.list.map(x => {
        const done = x.n >= x.need;
        const count = x.need > 1 ? ` <em>(${ar(x.n)} من ${ar(x.need)})</em>` : '';
        const owner = x.owner && coop ? `<b class="owner ${x.owner === me ? 'me' : ''}">${x.owner === me ? 'مهمتك' : tag[x.owner]}</b> ` : '';
        return `<li class="${done ? 'done' : ''} ${x.owner && coop && x.owner !== me ? 'theirs' : ''}"><i></i><span>${owner}${x.text}${count}</span></li>`;
      }).join('') + '</ul>';
    },

    toast(msg, good) {
      const t = document.createElement('div');
      t.className = 'toast panel ' + (good ? 'up' : 'down');
      t.textContent = msg;
      el.toasts.append(t);
      setTimeout(() => t.remove(), 2600);
    },

    mode(m) {
      el.app.dataset.mode = m;
      el.touch.hidden = !(m === 'world' && matchMedia('(pointer: coarse)').matches);
    },

    world(mapId, at, objs, pos) {
      if (!mapId) { World.stop(); V.mode('vn'); return; }
      World.load(mapId, at, objs, pos);
      Renderer.set('world');
      V.mode('world');
    },
    freeze(v) { World.frozen = v; if (!v) V.hideDialog(); },
    obj(key, val) { World.setObj(key, val); },
    wfx(kind, x, y, who, arg) { World.wfx(kind, x, y, who, arg); },
    state(p) { Game.mirror(p); },

    // local-only
    prompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      el.prompt.hidden = !text;
      el.prompt.textContent = text || '';
    },
  };
  return V;
})();
