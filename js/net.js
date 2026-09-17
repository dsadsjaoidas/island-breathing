// Two-player co-op over WebRTC (PeerJS). Host = Yunus and runs the game; guest = Sas and mirrors it.
// PeerJS is loaded only when multiplayer is used, so solo play stays tiny.
const Net = (() => {
  const LIB = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const handlers = {};
  let peer = null, conn = null, mode = 'solo', code = '';

  const emit = (ev, ...a) => (handlers[ev] || []).forEach(f => f(...a));
  const peerId = c => 'tib-room-' + c.toLowerCase();

  function load() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = LIB; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل مكتبة الاتصال. تأكد من الإنترنت.'));
      document.head.append(s);
    });
  }

  function attach(c) {
    conn = c;
    c.on('data', d => emit('data', d));
    c.on('close', () => { if (conn === c) { conn = null; emit('leave'); } });
    c.on('error', () => {});
  }

  async function host() {
    await load();
    leave();
    code = Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    return new Promise((res, rej) => {
      peer = new Peer(peerId(code));
      peer.on('open', () => { mode = 'host'; res(code); });
      peer.on('error', e => (mode === 'host' ? emit('error', e) : rej(e)));
      peer.on('connection', c => {
        if (conn) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
        c.on('open', () => { attach(c); emit('join'); });
      });
    });
  }

  async function join(roomCode) {
    await load();
    leave();
    code = roomCode.trim().toUpperCase();
    return new Promise((res, rej) => {
      const fail = msg => { leave(); rej(new Error(msg)); };
      const timer = setTimeout(() => fail('انتهت المهلة. تأكد من الرمز.'), 12000);
      peer = new Peer();
      peer.on('error', e => { clearTimeout(timer); fail(e.type === 'peer-unavailable' ? 'لا توجد غرفة بهذا الرمز.' : 'فشل الاتصال.'); });
      peer.on('open', () => {
        const c = peer.connect(peerId(code), { reliable: true });
        c.on('open', () => { clearTimeout(timer); mode = 'guest'; attach(c); res(); });
      });
    });
  }

  function leave() {
    try { conn && conn.close(); } catch (e) {}
    try { peer && peer.destroy(); } catch (e) {}
    peer = conn = null; mode = 'solo';
  }

  return {
    host, join, leave,
    send(msg) { if (conn && conn.open) conn.send(msg); },
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    get mode() { return mode; },
    get code() { return code; },
    get connected() { return !!(conn && conn.open); },
  };
})();
