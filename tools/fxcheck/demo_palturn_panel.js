/* 相棒の ターン（v14.37）の 動く 見本：下の ボタンで ①タッチ（かまえ）→ ②ターン（わざ）を 出す。系統ごとの わざも 1つずつ */
(function () {
  const KINDS = [
    ['bond', 'きずな ストライク', 'スライム など'], ['fang', 'ファング クラッシュ', 'オオカミ・サメ'], ['blaze', 'ブレイズ ブレス', 'ドラゴン・マグマ'],
    ['heavy', 'ヘビー タックル', 'ゴーレム・カメ'], ['sky', 'スカイ ダイブ', 'とり・タカ'], ['bolt', 'ボルト シュート', 'かみなり・UFO'],
    ['aqua', 'アクア バースト', 'タコ・さかな'], ['shadow', 'シャドウ スラッシュ', 'にんじゃ・ゆうれい'], ['holy', 'シャイン ブレイカー', 'きし・ユニコーン']
  ];
  const PALS = [['drago-1', 'ドラコ（ブレイズ）'], ['wolf-gray', 'ウルフン（ファング）'], ['ninja-1', 'にんじゃ（シャドウ）'], ['slime-green', 'スライム（きずな）']];
  let busy = false, palId = 'drago-1', armed = false;
  function setup() {
    try { localStorage.clear(); } catch (e) {}
    MQ.save.load();
    MQ.save.setSetting('bgm', false);
    MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
    MQ.save.update(function (pl) {
      pl.xp = 1400; pl.battles = 5; pl.seenUnlock = true; pl.seenNews = (MQ.news && MQ.news.latest) ? MQ.news.latest() : pl.seenNews;
      MQ.hero.gear.forEach(function (g) { if (!MQ.hero.isDensetsu(g.id) && g.gradeNo <= 3) { pl.gear.push(g.id); pl.equipped[g.slot] = g.id; } });
      PALS.forEach(function (p) { MQ.pals.add(pl, p[0]); });
    });
    startBattle();
    buildPanel();
  }
  function startBattle() {
    armed = false;
    MQ.save.update(function (pl) { MQ.pals.setActive(pl, palId); });
    MQ.ui.battle.start('rikashakai3-1');
  }
  function arm() {
    if (busy) return;
    armed = true;
    MQ.ui.battle.demoPalStance(true);
  }
  function turn(kind) {
    if (busy) return;
    busy = true;
    if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd();
    MQ.ui.battle.demoPalTurn(kind || null);
    setTimeout(function () { busy = false; armed = false; if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd(); MQ.ui.battle.demoPalStance(false); }, 1800);
  }
  function el(tag, cls, html) { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function buildPanel() {
    const p = el('div', 'mihon');
    p.appendChild(el('div', 'mihon__note', '相棒の ターン（v14.37）の 見本。①「タッチ」＝相棒が 前に 出て 主人公が さがる → ②「ターン」＝つぎの 正解の かわり（相棒だけが 動く・主人公は 見て いる）。下の 9つは 系統ごとの わざ。音も 出ます。'));
    const row1 = el('div', 'mihon__row');
    const a = el('button', 'mihon__b mihon__b--arm', '<small>① 相棒を タッチ</small>かまえ（ターン！）');
    a.type = 'button'; a.onclick = arm; row1.appendChild(a);
    const t = el('button', 'mihon__b mihon__b--turn', '<small>② つぎの 正解</small>相棒の ターン');
    t.type = 'button'; t.onclick = function () { turn(null); }; row1.appendChild(t);
    PALS.forEach(function (pr) {
      const b = el('button', 'mihon__b mihon__b--palsel' + (pr[0] === palId ? ' is-on' : ''), '<small>相棒を かえる</small>' + pr[1]);
      b.type = 'button';
      b.onclick = function () { if (busy) return; palId = pr[0]; Array.prototype.forEach.call(row1.querySelectorAll('.mihon__b--palsel'), function (x) { x.classList.toggle('is-on', x === b); }); startBattle(); };
      row1.appendChild(b);
    });
    p.appendChild(row1);
    const row2 = el('div', 'mihon__row');
    KINDS.forEach(function (k) {
      const b = el('button', 'mihon__b mihon__b--k-' + k[0], '<small>' + k[2] + '</small>' + k[1]);
      b.type = 'button'; b.onclick = function () { turn(k[0]); };
      row2.appendChild(b);
    });
    p.appendChild(row2);
    document.body.appendChild(p);
  }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.save && MQ.save.createPlayer && MQ.ui.battle.demoPalTurn) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
