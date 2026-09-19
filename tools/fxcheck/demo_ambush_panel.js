// ボスの 先制こうげき（2026-09-19）の 動く 見本の ボタン。build_ambush.js が demo_ambush.html に 入れる
(function () {
  // [id, 上の 小さい字, ボタンの 字, ステージ, ボス（null＝ステージの まま）, しゅるい]
  const CASES = [
    ['fire', 'ほのおの ブレス', '竜王', 'sansu3-18', 'boss-dragon', 'boss'],
    ['bolt', 'ビリビリ ほうでん', 'ナマズ', 'rikashakai3-1', 'boss-namazu', 'boss'],
    ['ice', 'みずの ブレス', 'ミズチ', 'rikashakai3-2', 'boss-mizuchi', 'boss'],
    ['slash', 'なぎなた 大ぎり', '青鬼', 'kokugo3-4', 'boss-oni', 'boss'],
    ['quake', 'いわくだき とっしん', 'イワサイドン', 'sansu3-1', 'boss-saidon', 'boss'],
    ['dark', 'すうじの のろい', 'マジン', 'sansu3-9', 'boss-majin', 'boss'],
    ['gold', 'こばん シャワー', 'コバンネズミ', 'eigo3-1', 'boss-koban', 'boss'],
    ['last', 'やみの ほのお', 'ラスボス', 'tower3', null, 'last'],
    ['mid', 'まちがえると', '中ボス', 'sansu3-2', null, 'mid'],
    ['mob', 'まちがえると', 'ザコ', 'sansu3-2', null, 'mob']
  ];
  function correctValue(q) {
    if (q.type === 'number') return q.answer;
    if (q.type === 'choice') return q.answer;
    if (q.type === 'roma') return q.answer;
    if (q.type === 'write') return true;
    if (q.type === 'frac') return { q: q.answer.n, r: q.answer.d };
    return { q: q.answer.q, r: q.answer.r };
  }
  function wrongValue(q) {
    if (q.type === 'number') return q.answer + 1;
    if (q.type === 'choice') return (q.answer + 1) % q.choices.length;
    if (q.type === 'roma') return 'zzz';
    if (q.type === 'frac') return { q: q.answer.n + 1, r: q.answer.d };
    return { q: q.answer.q + 1, r: q.answer.r };
  }
  function setup() {
    try { localStorage.clear(); } catch (e) {}
    MQ.save.load();
    MQ.save.setSetting('bgm', false);
    MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
    MQ.save.update(function (pl) {
      pl.xp = 1400; pl.battles = 5; pl.seenUnlock = true; pl.seenNews = (MQ.news && MQ.news.latest) ? MQ.news.latest() : pl.seenNews;
      MQ.hero.gear.forEach(function (g) { if (!MQ.hero.isDensetsu(g.id) && g.gradeNo <= 3) { pl.gear.push(g.id); pl.equipped[g.slot] = g.id; } });
      pl.bag = [];
    });
    buildPanel();
    run(CASES[0]);
  }
  // ステージの ボスを すりかえる（見本だけ）
  function withBoss(id, fn) {
    if (!id) { fn(); return; }
    const orig = MQ.enemies.bossFor;
    MQ.enemies.bossFor = function () { return MQ.enemies.get(id); };
    try { fn(); } finally { MQ.enemies.bossFor = orig; }
  }
  // core だけ 進める（ザコは 1回 まちがえてから 正解＝コンボを 出さない）
  function skip(until) {
    for (let i = 0; i < 80; i++) {
      if (MQ.battle.phase() !== 'mob') return;
      const q = MQ.battle.current();
      if (until && until(q)) return;
      if (q.type !== 'write' && !q.chest) MQ.battle.answer(wrongValue(q));
      MQ.battle.answer(correctValue(q));
      const nx = MQ.battle.next();
      if (nx.entering) return 'boss';
    }
  }
  function run(c) {
    withBoss(c[4], function () { MQ.ui.battle.start(c[3]); });
    if (c[5] === 'last') return;
    if (c[5] === 'boss') { skip(); MQ.ui.battle.demoWarning(false); return; }
    if (c[5] === 'mid') { skip(function (q) { return q.elite; }); MQ.ui.battle.demoQuestion(); setTimeout(wrong, 900); return; }
    setTimeout(wrong, 2900);   // 1問めの 帯（しゅうまつ まつり など）が 消えてから
  }
  // 画面の ボタンを 押して まちがえる
  function wrong() {
    const q = MQ.battle.current();
    if (!q || MQ.battle.phase() !== 'mob') return;
    const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    if (q.type === 'choice') {
      const btns = $$('#screen-battle .choice');
      for (let i = 0; i < btns.length; i++) { const j = (q.answer + 1 + i) % btns.length; if (btns[j] && !btns[j].disabled) { btns[j].click(); return; } }
      return;
    }
    const keys = $$('#screen-battle .key');
    const press = function (label) { const want = MQ.text ? MQ.text.fit(label) : label; const b = keys.filter(function (k) { return k.textContent === label || k.textContent === want; })[0]; if (b) b.click(); };
    if (q.type === 'divrem' || q.type === 'frac') { String(q.type === 'frac' ? q.answer.n + 1 : q.answer.q + 1).split('').forEach(press); press('こたえる'); String(q.type === 'frac' ? q.answer.d : q.answer.r).split('').forEach(press); press('こたえる'); return; }
    String(q.type === 'number' ? q.answer + 1 : 'zzz').split('').forEach(press);
    press('こたえる');
  }
  function buildPanel() {
    const p = document.createElement('div');
    p.className = 'mihon';
    const note = document.createElement('div');
    note.className = 'mihon__note';
    note.textContent = 'ボスの ボタン＝あらわれて すぐ 大わざ（音も 出ます）。中ボス・ザコ＝1回 まちがえた ときの はんげき（「まちがえる」で もう1回）。自分で 答えを 押しても 見られます。';
    p.appendChild(note);
    const row = document.createElement('div');
    row.className = 'mihon__row';
    CASES.forEach(function (c) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--amb-' + c[0];
      b.innerHTML = '<small>' + c[1] + '</small>' + c[2];
      b.onclick = function () { run(c); };
      row.appendChild(b);
    });
    const w = document.createElement('button');
    w.type = 'button'; w.className = 'mihon__b mihon__b--amb-wrong';
    w.innerHTML = '<small>いまの てきで</small>まちがえる';
    w.onclick = wrong;
    row.appendChild(w);
    p.appendChild(row);
    document.body.appendChild(p);
  }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.save && MQ.save.createPlayer) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
