// Procedural audio (Web Audio API): music, ambience and SFX are synthesized — no sound files.
const Sound = (() => {
  let ctx = null, master, noise, music = null, muted = false, vol = 0.7;
  const buses = {}, active = new Map(), pending = { music: undefined, amb: undefined };
  try { muted = localStorage.getItem('tib.muted') === '1'; const v = parseFloat(localStorage.getItem('tib.vol')); if (!isNaN(v)) vol = v; } catch (e) {}

  const now = () => ctx.currentTime;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  function node(type, props = {}) {
    const n = ctx['create' + type]();
    for (const k in props) n[k] instanceof AudioParam ? (n[k].value = props[k]) : (n[k] = props[k]);
    return n;
  }
  function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function noiseSrc() { const s = node('BufferSource', { buffer: noise, loop: true }); return s; }
  function lfo(param, freq, depth, at) {
    const o = node('Oscillator', { frequency: freq }), g = node('Gain', { gain: depth });
    chain(o, g); g.connect(param); o.start(at || now());
    return o;
  }
  function tone(out, freq, t, dur, type, vol, filter) {
    const o = node('Oscillator', { type, frequency: freq }), g = node('Gain');
    if (filter) { const f = node('BiquadFilter', { type: 'lowpass', frequency: filter }); chain(o, g, f, out); }
    else chain(o, g, out);
    env(g, t, 0.01, vol, dur); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function burst(out, t, dur, peak, type, freq, q = 1) {
    const s = noiseSrc(), f = node('BiquadFilter', { type, frequency: freq, Q: q }), g = node('Gain');
    chain(s, f, g, out); env(g, t, 0.005, peak, dur); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return f;
  }

  // ---------- one-shot effects ----------
  const SFX = {
    thunder(out, t) {
      const f = burst(out, t, 3.2, 1.1, 'lowpass', 1800);
      f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(110, t + 3);
    },
    bell(out, t) {
      [[523, .3], [1046, .1], [1568, .05], [787, .07]].forEach(([f, v]) => tone(out, f, t, 2.6, 'sine', v));
      [[523, .2], [1046, .06]].forEach(([f, v]) => { tone(out, f, t + .9, 2.2, 'sine', v); tone(out, f, t + 1.8, 2.2, 'sine', v); });
    },
    creak(out, t) {
      const o = node('Oscillator', { type: 'sawtooth' }), f = node('BiquadFilter', { type: 'bandpass', frequency: 700, Q: 6 }), g = node('Gain');
      o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(115, t + .5); o.frequency.linearRampToValueAtTime(85, t + .9);
      chain(o, f, g, out); env(g, t, .15, .12, .8); o.start(t); o.stop(t + 1.1);
    },
    gull(out, t) {
      for (let i = 0; i < 3; i++) {
        const s = t + i * .22, o = tone(out, 1500, s, .16, 'triangle', .05);
        o.frequency.setValueAtTime(1500, s); o.frequency.exponentialRampToValueAtTime(900, s + .16);
      }
    },
    crow(out, t) {
      for (let i = 0; i < 3; i++) {
        const s = t + i * .34, o = node('Oscillator', { type: 'sawtooth' }), f = node('BiquadFilter', { type: 'bandpass', frequency: 1100, Q: 2.5 }), g = node('Gain');
        o.frequency.setValueAtTime(520, s); o.frequency.exponentialRampToValueAtTime(320, s + .24);
        chain(o, f, g, out); env(g, s, .02, .4, .24); o.start(s); o.stop(s + .3);
      }
    },
    splash(out, t) {
      const f = burst(out, t, .7, .6, 'bandpass', 2500, .8);
      f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(400, t + .7);
    },
    tie(out, t) { for (let i = 0; i < 3; i++) burst(out, t + i * .13, .08, .4, 'highpass', 1500); },
    phone(out, t) {
      // distant, filtered office phone — something that doesn't belong at sea
      for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) {
        const s = t + r * 1.1 + k * .45;
        tone(out, 440, s, .35, 'sine', .06, 1400); tone(out, 480, s, .35, 'sine', .06, 1400);
      }
    },
    tick(out, t) { burst(out, t, .03, .15, 'highpass', 3000); },
    exhale(out, t) {
      const f = burst(out, t, 4, .9, 'lowpass', 500);
      f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(120, t + 4);
      tone(out, 40, t, 3.5, 'sine', .35);
    },
    ui(out, t) { tone(out, 660, t, .05, 'square', .03, 2500); tone(out, 990, t + .04, .06, 'square', .03, 2500); },
    pickup(out, t) { tone(out, 880, t, .08, 'square', .03, 3000); tone(out, 1320, t + .06, .12, 'square', .03, 3000); },
    quest(out, t) { [523, 659, 784, 1046].forEach((f, i) => tone(out, f, t + i * .09, .3, 'triangle', .08)); },
    hurt(out, t) { const o = tone(out, 300, t, .25, 'sawtooth', .12, 1200); o.frequency.exponentialRampToValueAtTime(90, t + .25); burst(out, t, .15, .3, 'lowpass', 800); },
    fire(out, t) { for (let i = 0; i < 8; i++) burst(out, t + Math.random() * .8, .03, .25, 'highpass', 2000); burst(out, t, .9, .2, 'lowpass', 400); },
    hiss(out, t) { const f = burst(out, t, 1.2, .25, 'highpass', 4000); f.frequency.setValueAtTime(3000, t); f.frequency.linearRampToValueAtTime(6000, t + 1.2); },
    heartbeat(out, t) { tone(out, 55, t, .18, 'sine', .6); tone(out, 48, t + .28, .22, 'sine', .45); },
    door(out, t) { burst(out, t, .3, .5, 'lowpass', 300); tone(out, 90, t, .2, 'sine', .3); },
    slam(out, t) { burst(out, t, .5, 1, 'lowpass', 500); tone(out, 60, t, .4, 'sine', .5); },
    type(out, t) { for (let i = 0; i < 6; i++) burst(out, t + i * .09 + Math.random() * .04, .02, .2, 'bandpass', 2500 + Math.random() * 1500, 2); },
    print(out, t) { const o = tone(out, 160, t, 1.2, 'sawtooth', .05, 700); o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(220, t + 1.2); },
    drip(out, t) { const o = tone(out, 1400, t, .12, 'sine', .08); o.frequency.exponentialRampToValueAtTime(700, t + .12); },
    whoosh(out, t) { const f = burst(out, t, .6, .35, 'bandpass', 400, 1.5); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2400, t + .5); },
    up(out, t) { tone(out, 660, t, .15, 'triangle', .08); tone(out, 990, t + .09, .25, 'triangle', .08); },
    down(out, t) { tone(out, 330, t, .18, 'triangle', .09); tone(out, 220, t + .12, .3, 'triangle', .09); },
  };

  // ---------- looping ambience ----------
  function periodic(out, name, min, max) {
    let alive = true, id;
    const loop = () => { if (!alive) return; SFX[name](out, now()); id = setTimeout(loop, (min + Math.random() * (max - min)) * 1000); };
    id = setTimeout(loop, Math.random() * min * 1000);
    return { stop() { alive = false; clearTimeout(id); } };
  }
  function noiseLayer(out, type, freq, gain, q = 1) {
    const s = noiseSrc(), f = node('BiquadFilter', { type, frequency: freq, Q: q }), g = node('Gain', { gain });
    chain(s, f, g, out); s.start(now(), Math.random() * 2);
    return { s, f, g };
  }

  const AMB = {
    ocean(out) { const n = noiseLayer(out, 'lowpass', 600, .45); return [n.s, lfo(n.g.gain, .11, .3), lfo(n.f.frequency, .11, 250)]; },
    ocean_rough(out) { const n = noiseLayer(out, 'lowpass', 900, .7); return [n.s, lfo(n.g.gain, .23, .45), lfo(n.f.frequency, .23, 400)]; },
    wind(out) { const n = noiseLayer(out, 'bandpass', 700, .12, 2); return [n.s, lfo(n.f.frequency, .07, 400), lfo(n.g.gain, .05, .08)]; },
    storm_wind(out) { const n = noiseLayer(out, 'bandpass', 900, .38, 1.2); return [n.s, lfo(n.f.frequency, .15, 600), lfo(n.g.gain, .2, .22)]; },
    rain(out) { const n = noiseLayer(out, 'highpass', 3000, .2); return [n.s]; },
    breath(out) {
      // phase-locked to Renderer's breath(): LFO starts on a 10s boundary of performance.now()
      const at = now() + (10 - (Date.now() / 1000) % 10);
      const n = noiseLayer(out, 'lowpass', 320, .28);
      const o = node('Oscillator', { frequency: 46 }), g = node('Gain', { gain: .14 });
      chain(o, g, out); o.start();
      return [n.s, o, lfo(n.g.gain, .1, .27, at), lfo(g.gain, .1, .13, at), lfo(n.f.frequency, .1, 140, at)];
    },
    hum(out) { const a = node('Oscillator', { frequency: 100 }), b = node('Oscillator', { frequency: 200 }), g = node('Gain', { gain: .04 }); chain(a, g, out); b.connect(g); a.start(); b.start(); return [a, b]; },
    jungle(out) {
      const n = noiseLayer(out, 'bandpass', 5200, .05, 6);
      return [n.s, lfo(n.g.gain, 7, .04), periodic(out, 'gull', 9, 16), periodic(out, 'drip', 3, 7)];
    },
    drip: out => [periodic(out, 'drip', 1.5, 4)],
    heartbeat: out => { let alive = true; const id = setInterval(() => alive && SFX.heartbeat(out, now()), 1100); return [{ stop() { alive = false; clearInterval(id); } }]; },
    keys: out => [periodic(out, 'type', 2, 6)],
    creak: out => [periodic(out, 'creak', 5, 11)],
    gulls: out => [periodic(out, 'gull', 4, 9)],
    clock(out) { let alive = true; const id = setInterval(() => alive && SFX.tick(out, now()), 1000); return [{ stop() { alive = false; clearInterval(id); } }]; },
  };

  // ---------- generative music ----------
  const MUSIC = {
    calm: { bpm: 88, root: 60, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], lead: .45, wave: 'triangle' },
    sea: { bpm: 76, root: 62, scale: [0, 2, 3, 5, 7, 9], chords: [[0, 3, 7], [5, 9, 12], [3, 7, 10], [5, 9, 12]], lead: .35, wave: 'triangle' },
    night: { bpm: 60, root: 57, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], lead: .3, wave: 'sine', up: 12 },
    tension: { bpm: 104, root: 45, scale: [0, 1, 3, 7, 8], chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]], lead: .2, wave: 'sawtooth', filter: 900, drone: true },
    island: { bpm: 80, root: 57, scale: [0, 2, 3, 7, 8], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], lead: .3, wave: 'triangle' },
    cave: { bpm: 50, root: 45, scale: [0, 1, 5, 7], chords: [[0, 7, 12], [1, 8, 13], [0, 7, 12], [-1, 6, 11]], lead: .15, wave: 'sine', up: 12, drone: true },
    heart: { bpm: 66, root: 43, scale: [0, 1, 3, 6, 7], chords: [[0, 3, 6], [1, 4, 7], [0, 3, 6], [-1, 3, 6]], lead: .12, wave: 'sawtooth', filter: 600, drone: true },
    chase: { bpm: 140, root: 50, scale: [0, 1, 3, 5, 7, 8], chords: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 7]], lead: .35, wave: 'square', filter: 1200, drone: true },
    office: { bpm: 96, root: 65, scale: [0, 4, 7], chords: [[0, 4, 7], [0, 4, 7], [5, 9, 12], [7, 11, 14]], lead: .05, wave: 'sine' },
    ending: { bpm: 70, root: 64, scale: [0, 2, 4, 7, 9, 11], chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], lead: .4, wave: 'triangle' },
    mystery: { bpm: 54, root: 50, scale: [0, 2, 4, 6, 8, 10], chords: [[0, 4, 8], [2, 6, 10], [0, 4, 8], [-2, 2, 6]], lead: .3, wave: 'sine', up: 12 },
  };

  function schedule(d, m, spb) {
    const st = m.step, ch = d.chords[Math.floor(st / 8) % d.chords.length], t = m.next, r = d.root;
    if (st % 8 === 0) { tone(m.out, hz(r + ch[0] - 12), t, spb * 7, 'sine', .22); if (d.drone) tone(m.out, hz(r - 12), t, spb * 8, 'sawtooth', .05, 400); }
    if (st % 8 === 4) tone(m.out, hz(r + ch[0] - 12), t, spb * 3, 'sine', .13);
    tone(m.out, hz(r + ch[[0, 1, 2, 1][st % 4]] + (d.up || 0)), t, spb * 1.6, d.wave, .06, d.filter);
    if (st % 2 === 0 && Math.random() < d.lead) {
      tone(m.out, hz(r + 12 + d.scale[Math.floor(Math.random() * d.scale.length)]), t, spb * (Math.random() < .3 ? 4 : 2), 'triangle', .07);
    }
  }

  // ---------- recorded soundtrack (Ninja Adventure, CC0); generative music is the fallback ----------
  const TRACKS = new Set(['calm', 'sea', 'tension', 'night', 'mystery', 'island', 'cave', 'heart', 'chase', 'office', 'ending']);
  const TRACK_VOL = 0.45;
  const canOgg = !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"');
  let track = null;

  function fadeEl(el, to, ms, done) {
    const from = el.volume, t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) setTimeout(step, 40); else if (done) done();
    };
    step();
  }

  function playTrack(name) {
    if (track && track.name === name) return;
    if (track) { const old = track.el; fadeEl(old, 0, 900, () => old.pause()); }
    track = null;
    if (!name) return;
    const el = new Audio(`assets/music/${name}.ogg`);
    el.loop = true; el.volume = 0;
    el.play().then(() => fadeEl(el, muted ? 0 : TRACK_VOL * vol, 1200)).catch(() => {});
    track = { name, el };
  }

  function playMusic(name) {
    if (!ctx) { pending.music = name; return; }
    if (canOgg && (name == null || TRACKS.has(name))) {
      if (music) { const old = music; old.alive = false; old.out.gain.setTargetAtTime(0, now(), .6); setTimeout(() => old.out.disconnect(), 4000); music = null; }
      return playTrack(name);
    }
    playTrack(null);
    if (music && music.name === name) return;
    if (music) { const old = music; old.alive = false; old.out.gain.setTargetAtTime(0, now(), .6); setTimeout(() => old.out.disconnect(), 4000); }
    music = null;
    const d = MUSIC[name];
    if (!d) return;
    const out = node('Gain', { gain: 0 }); out.connect(buses.music); out.gain.setTargetAtTime(1, now(), 1);
    const m = music = { name, out, alive: true, step: 0, next: now() + .1 }, spb = 60 / d.bpm / 2;
    const tick = () => { if (!m.alive) return; while (m.next < now() + .3) { schedule(d, m, spb); m.next += spb; m.step++; } setTimeout(tick, 80); };
    tick();
  }

  function apply() {
    const g = muted ? 0 : vol;
    if (master) master.gain.setTargetAtTime(.9 * g, now(), .05);
    if (track) track.el.volume = TRACK_VOL * g;
  }

  function setAmbience(list) {
    list = list || [];
    if (!ctx) { pending.amb = list; return; }
    for (const [k, a] of active) if (!list.includes(k)) {
      a.out.gain.setTargetAtTime(0, now(), .5); active.delete(k);
      setTimeout(() => { a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); a.out.disconnect(); }, 3000);
    }
    for (const k of list) if (!active.has(k) && AMB[k]) {
      const out = node('Gain', { gain: 0 }); out.connect(buses.amb); out.gain.setTargetAtTime(1, now(), .8);
      active.set(k, { out, nodes: AMB[k](out) });
    }
  }

  function init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = node('DynamicsCompressor'); comp.connect(ctx.destination);
    master = node('Gain', { gain: muted ? 0 : .9 * vol }); master.connect(comp);
    for (const [k, v] of Object.entries({ music: .3, amb: .55, sfx: .7 })) { buses[k] = node('Gain', { gain: v }); buses[k].connect(master); }
    const dl = node('Delay', { delayTime: .36 }), fb = node('Gain', { gain: .28 }), wet = node('Gain', { gain: .3 });
    buses.music.connect(dl); chain(dl, fb, dl); chain(dl, wet, master);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    if (pending.music !== undefined) playMusic(pending.music);
    if (pending.amb !== undefined) setAmbience(pending.amb);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { ctx.suspend(); if (track) track.el.pause(); }
      else { ctx.resume(); if (track) track.el.play().catch(() => {}); }
    });
  }

  let lastBlip = 0;
  return {
    init,
    music: playMusic,
    ambience: setAmbience,
    sfx(name) { if (ctx && SFX[name]) SFX[name](buses.sfx, now()); },
    blip(freq) {
      if (!ctx || now() - lastBlip < .06) return;
      lastBlip = now(); tone(buses.sfx, freq + Math.random() * 30, now(), .05, 'triangle', .035);
    },
    muted: () => muted || vol === 0,
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('tib.muted', m ? '1' : '0'); } catch (e) {}
      apply();
    },
    volume: () => vol,
    setVolume(v) {
      vol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
      try { localStorage.setItem('tib.vol', vol); } catch (e) {}
      if (vol > 0 && muted) muted = false;
      apply();
    },
  };
})();
