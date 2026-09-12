(function () {
  const SP = [
    ['starburst', 'スターバースト', 20], ['fire', 'ほのお ギリ', 5], ['leaf', 'はっぱ カッター', 5], ['ice', 'こおりの やいば', 5], ['wind', 'かぜの たつまき', 5],
    ['bolt', 'いなずま おとし', 8], ['star', 'ひかりの メテオ', 12], ['nova', 'ぎんがの ビッグバン', 16]
  ];
  let busy = false, endT = null, pal = false;
  function setup() {
    try { localStorage.clear(); } catch (e) {}
    MQ.save.load();
    MQ.save.setSetting('bgm', false);
    MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
    MQ.save.update(function (pl) {
      pl.xp = 1400; pl.battles = 5; pl.seenUnlock = true; pl.seenNews = (MQ.news && MQ.news.latest) ? MQ.news.latest() : pl.seenNews;
      MQ.hero.gear.forEach(function (g) { if (!MQ.hero.isDensetsu(g.id) && g.gradeNo <= 3) { pl.gear.push(g.id); pl.equipped[g.slot] = g.id; } });
      MQ.pals.add(pl, 'drago-1');
    });
    startBattle();
    buildPanel();
  }
  function startBattle() {
    MQ.save.update(function (pl) { MQ.pals.setActive(pl, pal ? 'drago-1' : null); });
    MQ.ui.battle.start('rikashakai3-1');
  }
  function run(id) {
    if (busy) return;
    busy = true;
    if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd();
    const sp = MQ.ui.battle.demoSpecial(id, { pal: pal });
    clearTimeout(endT);
    endT = setTimeout(function () { if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd(); busy = false; }, (sp && sp.ms ? sp.ms : 1200) + 700);
  }
  function buildPanel() {
    const p = document.createElement('div');
    p.className = 'mihon';
    const note = document.createElement('div');
    note.className = 'mihon__note';
    note.textContent = 'ボタンを 押すと その わざが 出ます（音も 出ます）。スターバーストは さいごに 大ばくはつ。';
    p.appendChild(note);
    const row = document.createElement('div');
    row.className = 'mihon__row';
    SP.forEach(function (s) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--' + s[0];
      b.innerHTML = '<small>' + s[2] + 'コンボ</small>' + s[1];
      b.onclick = function () { run(s[0]); };
      row.appendChild(b);
    });
    const tog = document.createElement('button');
    tog.type = 'button'; tog.className = 'mihon__b mihon__b--pal';
    const sync = function () { tog.innerHTML = '<small>相棒</small>' + (pal ? 'いっしょ ON' : 'OFF'); tog.classList.toggle('is-on', pal); };
    tog.onclick = function () { if (busy) return; pal = !pal; sync(); startBattle(); };
    sync();
    row.appendChild(tog);
    [['old', 'まえの 音'], ['neu', 'あたらしい 音']].forEach(function (q) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--snd';
      b.innerHTML = '<small>スターバーストの</small>' + q[1];
      b.onclick = function () { const au = new Audio(window.__SND[q[0]]); au.play(); };
      row.appendChild(b);
    });
    p.appendChild(row);
    document.body.appendChild(p);
  }
  if (/auto=([a-z]+)/.test(location.hash)) { const id = RegExp.$1; setTimeout(function () { run(id); }, 1400); }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.save && MQ.save.createPlayer) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
