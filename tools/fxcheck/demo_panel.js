(function () {
  /* v14.12：はしごの じゅん（5 → 8 → 11 → 13 → 15 → 17）。NEW＝教科の 大わざ */
  const SP = [
    ['triple', 'トリプル スラッシュ', 3, true],
    ['fire', 'ほのお ギリ', 5], ['leaf', 'はっぱ カッター', 5], ['ice', 'こおりの やいば', 5], ['wind', 'かぜの たつまき', 5],
    ['blaze', 'クリムゾン クロス', 8, true], ['storm', 'リーフ ハリケーン', 8, true], ['icicle', 'アイシクル レイン', 8, true], ['gale', 'ツイン トルネード', 8, true],
    ['bolt', 'サンダー ドライブ', 11], ['star', 'メテオ ストーム', 13], ['nova', 'ビッグバン インパクト', 15], ['starburst', 'スターバースト', 17]
  ];
  // 「はしごを じゅんに」：算数の 子が コンボを のばした ときの ながれ
  const LADDER = ['triple', 'fire', 'blaze', 'bolt', 'star', 'nova', 'starburst'];
  let busy = false, endT = null, pal = false, chain = null;
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
  function run(id, then) {
    if (busy) return;
    busy = true;
    if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd();
    const sp = MQ.ui.battle.demoSpecial(id, { pal: pal });
    clearTimeout(endT);
    endT = setTimeout(function () { if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd(); busy = false; if (then) then(); }, (sp && sp.ms ? sp.ms : 1200) + 700);
  }
  function runLadder(i) {
    if (i >= LADDER.length) { chain = null; return; }
    chain = i;
    run(LADDER[i], function () { setTimeout(function () { runLadder(i + 1); }, 350); });
  }
  function buildPanel() {
    const p = document.createElement('div');
    p.className = 'mihon';
    const note = document.createElement('div');
    note.className = 'mihon__note';
    note.textContent = 'ボタンで わざが 出ます（音も 出ます）。NEW＝あたらしい わざ（3コンボと 8コンボ）。「はしご」は 算数の 子が 3 → 17コンボまで のばした ときの ながれ。';
    p.appendChild(note);
    const row = document.createElement('div');
    row.className = 'mihon__row';
    const lad = document.createElement('button');
    lad.type = 'button'; lad.className = 'mihon__b mihon__b--ladder';
    lad.innerHTML = '<small>3 → 17コンボ</small>はしごを じゅんに';
    lad.onclick = function () { if (busy || chain !== null) return; runLadder(0); };
    row.appendChild(lad);
    SP.forEach(function (s) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--' + s[0] + (s[3] ? ' is-new' : '');
      b.innerHTML = '<small>' + s[2] + 'コンボ' + (s[3] ? '・NEW' : '') + '</small>' + s[1];
      b.onclick = function () { if (chain !== null) return; run(s[0]); };
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
  if (/auto=([a-z]+)/.test(location.hash)) { const id = RegExp.$1; setTimeout(function () { run(id); }, 1400); }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.save && MQ.save.createPlayer) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
