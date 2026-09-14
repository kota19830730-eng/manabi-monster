/* v14.3 カットインを 軽く する 案の 見くらべ（build_cidemo.js が 1まいの HTML に 入れる）
   下の パネルで 案を えらんで わざの ボタンを 押す。わざの あと「いちばん 長く 止まった じかん」を 出す
   （requestAnimationFrame の あいだ。GPU の おくれは 入らない ので めやす） */
(function () {
  const VARS = [
    { id: 'now', name: 'いま', sub: 'くらべる 用', o: { late: 0, hero: '3d' },
      note: 'いまの ゲームと 同じです。' },
    { id: 'A', name: '案A', sub: 'あとから', o: { late: 300, hero: '3d' },
      note: '見た目は 同じ。画面が 広がる わざで、下の カットインが 0.3秒 あとから 出ます。' },
    { id: 'B', name: '案B', sub: '1まいの 絵', o: { late: 300, hero: 'snap' },
      note: '案A ＋ カットインの 主人公を「同じ 3D を 1まいの 絵に した もの」に。ポーズ・向き・色は 同じです。' },
    { id: 'C', name: '案C', sub: 'ドット絵', o: { late: 300, hero: 'flat' },
      note: '案A ＋ カットインの 主人公を 2D の ドット絵に。いちばん 軽いが、立体と ポーズは なくなります（少し かたむくだけ）。' }
  ];
  const SP = [['bolt', 'いなずま おとし', 8], ['star', 'ひかりの メテオ', 12], ['nova', 'ぎんがの ビッグバン', 16], ['starburst', 'スターバースト', 20], ['fire', 'ほのお ギリ', 5]];
  let cur = VARS[0], busy = false, endT = null;
  const hist = {};
  VARS.forEach(function (v) { hist[v.id] = []; });
  let note, meter, vbtns = [], table;

  function setup() {
    try { localStorage.clear(); } catch (e) {}
    MQ.save.load();
    MQ.save.setSetting('bgm', false);
    MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
    MQ.save.update(function (pl) {
      pl.xp = 1400; pl.battles = 5; pl.seenUnlock = true; pl.seenNews = (MQ.news && MQ.news.latest) ? MQ.news.latest() : pl.seenNews;
      MQ.hero.gear.forEach(function (g) { if (!MQ.hero.isDensetsu(g.id) && g.gradeNo <= 3) { pl.gear.push(g.id); pl.equipped[g.slot] = g.id; } });
    });
    MQ.ui.battle.start('rikashakai3-1');
    buildPanel();
    pick(VARS[0]);
  }
  function pick(v) {
    cur = v;
    MQ.ui.battle.ciOption(v.o);
    vbtns.forEach(function (b) { b.classList.toggle('is-on', b.dataset.id === v.id); });
    note.textContent = v.name + '：' + v.note;
    waitReady();
  }
  /* 案B は はじめに ポーズの 絵を 作る（1〜2秒）。そのあいだ わざの ボタンを 休ませる */
  function waitReady() {
    const snap = cur.o.hero === 'snap' && MQ.ui.ciSnap && MQ.ui.ciSnap.busy();
    document.querySelectorAll('.mihon__b--sp').forEach(function (b) { b.disabled = !!snap; });
    if (snap) { meter.textContent = 'じゅんび中…（主人公の 絵を 作って います）'; setTimeout(waitReady, 200); }
    else if (/じゅんび中/.test(meter.textContent)) meter.textContent = 'わざの ボタンを 押してください';
  }
  function run(id) {
    if (busy) return;
    busy = true;
    if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd();
    const gaps = [];
    let last = performance.now();
    const t0 = last;
    const tick = function (t) { gaps.push([t - t0, t - last]); last = t; if (t - t0 < 900) requestAnimationFrame(tick); else report(); };
    const sp = MQ.ui.battle.demoSpecial(id, {});
    requestAnimationFrame(tick);
    function report() {
      let worst = 0, n = 0;
      gaps.forEach(function (g) { if (g[0] < 800) { if (g[1] > worst) worst = g[1]; if (g[1] > 34) n++; } });
      worst = Math.round(worst);
      hist[cur.id].push(worst); if (hist[cur.id].length > 6) hist[cur.id].shift();
      meter.textContent = cur.name + '・' + sp.name.replace('！', '') + '：いちばん 長く 止まった ' + worst + 'ms（カクッ ' + n + '回）';
      drawTable();
    }
    clearTimeout(endT);
    endT = setTimeout(function () { if (MQ.ui.battle.demoEnd) MQ.ui.battle.demoEnd(); busy = false; }, (sp && sp.ms ? sp.ms : 1200) + 700);
  }
  function drawTable() {
    table.innerHTML = '';
    VARS.forEach(function (v) {
      const h = hist[v.id];
      const c = document.createElement('span');
      c.className = 'cid__cell' + (v.id === cur.id ? ' is-on' : '');
      c.textContent = v.name + ' ' + (h.length ? Math.round(h.reduce(function (a, b) { return a + b; }, 0) / h.length) + 'ms（' + h.length + '回）' : '―');
      table.appendChild(c);
    });
  }
  function buildPanel() {
    const p = document.createElement('div');
    p.className = 'mihon';
    note = document.createElement('div');
    note.className = 'mihon__note';
    p.appendChild(note);
    const vr = document.createElement('div');
    vr.className = 'mihon__row';
    VARS.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--var'; b.dataset.id = v.id;
      b.innerHTML = '<small>' + v.sub + '</small>' + v.name;
      b.onclick = function () { if (!busy) pick(v); };
      vbtns.push(b);
      vr.appendChild(b);
    });
    p.appendChild(vr);
    const row = document.createElement('div');
    row.className = 'mihon__row';
    row.style.marginTop = '6px';
    SP.forEach(function (s) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mihon__b mihon__b--sp mihon__b--' + s[0];
      b.innerHTML = '<small>' + s[2] + 'コンボ</small>' + s[1];
      b.onclick = function () { run(s[0]); };
      row.appendChild(b);
    });
    p.appendChild(row);
    meter = document.createElement('div');
    meter.className = 'cid__meter';
    meter.textContent = 'わざの ボタンを 押してください';
    p.appendChild(meter);
    table = document.createElement('div');
    table.className = 'cid__table';
    p.appendChild(table);
    drawTable();
    document.body.appendChild(p);
    fitAbove(p);
  }
  /* ゲームの 画面を パネルの 上に おさめる（パネルの 下に カットインが かくれない ように）。
     stage.js は window.innerHeight で 大きさを 決めるので、パネルの ぶんを 引いた 高さを かえす */
  function fitAbove(p) {
    const ph = p.offsetHeight;
    const st = document.createElement('style');
    st.textContent = '.stage { top: calc((100% - ' + ph + 'px) / 2) !important; }';
    document.head.appendChild(st);
    try { Object.defineProperty(window, 'innerHeight', { configurable: true, get: function () { return document.documentElement.clientHeight - ph; } }); } catch (e) {}
    window.dispatchEvent(new Event('resize'));
  }
  function wait() { if (window.MQ && MQ.ui && MQ.ui.battle && MQ.ui.battle.ciOption && MQ.save && MQ.save.createPlayer) setup(); else setTimeout(wait, 100); }
  setTimeout(wait, 400);
})();
