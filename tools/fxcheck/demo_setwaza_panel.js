(function () {
  // セットわざ（v14.2）の 動く 見本の パネル：8つの ボタン（押すと その グレードの そうびを 5点 つけて わざを 出す）
  let busy = false, endT = null, pal = false, cur = null;
  const WAIT_EQUIP = 1200;   // そうびを かえた ときは たたかいを はじめ直して から わざ（rt_setwaza.js で 撮る ときは この ぶん おそく）
  function setup() {
    try { localStorage.clear(); } catch (e) {}
    MQ.save.load();
    MQ.save.setSetting('bgm', false);
    MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
    MQ.save.update(function (pl) {
      pl.xp = 1400; pl.battles = 5; pl.seenUnlock = true; pl.seenNews = (MQ.news && MQ.news.latest) ? MQ.news.latest() : pl.seenNews;
      MQ.hero.gear.forEach(function (g) { if (pl.gear.indexOf(g.id) < 0) pl.gear.push(g.id); });
      MQ.pals.add(pl, 'drago-1');
    });
    equip('yami');
    startBattle();
    buildPanel();
  }
  function equip(grade) {
    cur = grade;
    MQ.save.update(function (pl) { MQ.hero.gear.forEach(function (g) { if (g.grade === grade) pl.equipped[g.slot] = g.id; }); });
  }
  function startBattle() {
    MQ.save.update(function (pl) { MQ.pals.setActive(pl, pal ? 'drago-1' : null); });
    MQ.ui.battle.start('rikashakai3-1');
  }
  function run(w) {
    if (busy) return;
    busy = true;
    const go = function () {
      const sp = MQ.ui.battle.demoSpecial(w.id, { pal: pal });
      clearTimeout(endT);
      endT = setTimeout(function () { busy = false; }, (sp && sp.ms ? sp.ms : 1200) + 700);
    };
    if (cur !== w.grade) { equip(w.grade); startBattle(); setTimeout(go, WAIT_EQUIP); } else go();
  }
  function buildPanel() {
    const p = document.createElement('div');
    p.className = 'mihon';
    const note = document.createElement('div');
    note.className = 'mihon__note';
    note.textContent = 'おなじ グレードの そうびを 5点 つけると、足もとの ◆ が セットゲージ（正解で たまり、まちがえても へらない）。6つ たまった 正解で わざが 出ます。ボタンで その そうびを つけて わざだけ 見られます。';
    p.appendChild(note);
    const row = document.createElement('div');
    row.className = 'mihon__row';
    MQ.setwaza.list().forEach(function (w) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--' + w.id;
      b.style.background = 'linear-gradient(#0000, #0006), ' + w.color;
      b.style.color = '#fff';
      b.style.textShadow = '0 1px 2px #000';
      b.innerHTML = '<small>' + w.gradeName + '・' + w.ruby + '</small>' + w.name;
      b.onclick = function () { run(w); };
      row.appendChild(b);
    });
    const tog = document.createElement('button');
    tog.type = 'button'; tog.className = 'mihon__b mihon__b--pal';
    const sync = function () { tog.innerHTML = '<small>相棒</small>' + (pal ? 'いっしょ ON' : 'OFF'); tog.classList.toggle('is-on', pal); };
    tog.onclick = function () { if (busy) return; pal = !pal; sync(); startBattle(); };
    sync();
    row.appendChild(tog);
    p.appendChild(row);
    document.body.appendChild(p);
  }
  if (/auto=([a-z-]+)/.test(location.hash)) { const id = RegExp.$1; setTimeout(function () { const w = MQ.setwaza.byId(id); if (w) run(w); }, 1400); }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.save && MQ.save.createPlayer && MQ.setwaza) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
