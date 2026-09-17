// Title menu, multiplayer lobby, top bar buttons.
const Menu = (() => {
  let el;
  const ar = n => Number(n).toLocaleString('ar-EG');

  function soundLabel() {
    el.btnSound.classList.toggle('muted', Sound.muted());
    el.volLevel.textContent = Math.round((Sound.muted() ? 0 : Sound.volume()) * 100) + '%';
  }
  function badge() {
    el.netBadge.hidden = Net.mode === 'solo';
    el.netBadge.textContent = Net.mode === 'host' ? `الغرفة: ${Net.code}` : 'متصل كـ ساس';
  }
  function lobby(open) {
    el.mainMenu.hidden = open; el.lobby.hidden = !open;
    const hosting = Net.mode === 'host';
    el.roomCode.hidden = !hosting; el.roomCode.textContent = Net.code;
    el.hostControls.hidden = !hosting;
    el.btnContinueRoom.hidden = !(hosting && Game.loadSave());
  }

  const M = {
    visible: true,

    init() {
      el = View.el;
      el.btnNew.onclick = () => Game.start(null);
      el.btnContinue.onclick = () => Game.start(Game.loadSave());
      el.btnMulti.onclick = () => { Sound.init(); lobby(true); M.status(''); };
      el.btnBack.onclick = () => { Net.leave(); badge(); lobby(false); };
      el.btnHost.onclick = async () => {
        M.status('جارٍ إنشاء الغرفة...');
        try { await Net.host(); lobby(true); badge(); M.status('أرسل الرمز لصديقك. تستطيع البدء الآن، وينضم في أي وقت.'); }
        catch (e) { M.status('تعذّر إنشاء الغرفة. ' + (e.message || '')); }
      };
      el.btnJoin.onclick = async () => {
        const code = el.codeInput.value.trim();
        if (code.length < 5) return M.status('الرمز من ٥ خانات.');
        M.status('جارٍ الاتصال...');
        try { await Net.join(code); badge(); el.hostControls.hidden = true; M.status('متصل! أنت ساس. انتظر المضيف ليبدأ الرحلة...'); }
        catch (e) { M.status(e.message); }
      };
      el.codeInput.addEventListener('input', () => { el.codeInput.value = el.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      el.btnStartRoom.onclick = () => Game.start(null);
      el.btnContinueRoom.onclick = () => Game.start(Game.loadSave());
      el.btnSound.onclick = e => { e.currentTarget.blur(); Sound.init(); if (Sound.volume() === 0) Sound.setVolume(.5); else Sound.setMuted(!Sound.muted()); soundLabel(); };
      el.btnVolDown.onclick = e => { e.currentTarget.blur(); Sound.init(); Sound.setVolume(Sound.volume() - .1); soundLabel(); };
      el.btnVolUp.onclick = e => { e.currentTarget.blur(); Sound.init(); Sound.setVolume(Sound.volume() + .1); soundLabel(); };
      el.btnMenu.onclick = e => { e.currentTarget.blur(); if (Net.mode === 'guest') Net.leave(); Game.toTitle(); };
      // phones: full screen + landscape lock (iPhone Safari has no fullscreen API: explain Add to Home Screen)
      const fs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
      const ios = /iPhone|iPod/.test(navigator.userAgent);
      el.btnFull.hidden = standalone || !matchMedia('(pointer: coarse)').matches;
      el.btnFull.onclick = async e => {
        e.currentTarget.blur();
        if (!fs || ios) return View.toast('للشاشة الكاملة: زر المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية»، وافتح اللعبة من أيقونتها');
        try {
          if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          else { await fs.call(document.documentElement); if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {}); }
        } catch (err) {}
      };
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
      soundLabel();
    },

    show() {
      M.visible = true;
      el.title.hidden = false;
      lobby(Net.mode === 'host');
      el.btnContinue.hidden = !Game.loadSave();
      const got = Game.endings().length, total = Object.keys(Game.ENDINGS).length;
      el.endingCount.textContent = got ? `النهايات المكتشفة: ${ar(got)} من ${ar(total)}` : '';
      badge();
    },
    hide() { M.visible = false; el.title.hidden = true; badge(); },
    status(t) { el.lobbyStatus.textContent = t; },
  };
  return M;
})();
