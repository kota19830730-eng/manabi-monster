/* ---------------------------------------------------------
   りったい（3D・v12.0）：主人公・モンスター・たからばこ・相棒を 箱に して 画面に おく

   ユーザー「キャラと モンスターを 3D に」→ 試作 v3（tools/3d）→「完璧」→「ゲーム本体に 全て いれて」（2026-09-10）。
   ルールも 絵も 変えない。2D の 部品（.bxbox・.hero__img）を **同じ 場所・同じ 大きさの 3D**に 置きかえるだけ。
   箱を 作るのは js/core/vox.js（MQ.vox）、たからばこは js/content/chest3d.js、動きは css/motion3d.css の mo-*。

   出す ところ：バトル（js/ui/battle.js）・タイトル（start.js）・カプセルマシン（capsule.js）。
   ずかん・地図・けっか画面・HUD は 2D の まま（275体が いっせいに 3D だと 重い）。
   せってい「りったい」（はじめは つける）で 2D に もどせる → MQ.ui.v3.on()。

   器の ならび： .v3scene（perspective）> .v3fig（向き ±22°・カメラ 8°）> .v3hold（大きさ scale3d）> .v3（部品）
   主人公の 箱は 絵（data URL）が 読めてから 作る ので、先に 器を かえして あとから 中身を 入れる（scene.v3）。
   --------------------------------------------------------- */
(function () {
  const heroCache = {};        // 主人公の 箱（絵の src ＋ unit → .v3）。cloneNode して 使う
  const monCache = {};         // モンスターの 箱（id ＋ unit ＋ おこり ＋ 向き → .v3）。v12.1：同じ 子は 作らずに cloneNode
  /* v12.1：カメラの 向き（rotateY）で ぜったいに 見えない がわの 面を 作らない。
     ry<0（左むき・てき）＝左の 面が 見えない／ry>0（右むき・主人公・相棒）＝右の 面が 見えない */
  function hideOf(ry) { return ry < 0 ? 'L' : ry > 0 ? 'R' : ''; }
  /* flat … 上の 面も 作らない。カメラは 8° 下から なので、ゆれる だけの 画面（タイトル・カプセル＝mo-title）では 上の 面は 見えない。
     バトルは フェイント（rotateX -15°）・とびかかり・歩き で 上が 見える ので つける */
  function hideFor(ry, opts) { return hideOf(ry) + (opts && opts.flat ? 'T' : ''); }

  function on() {
    if (!MQ.vox || !MQ.save || !MQ.save.getSetting) return false;
    return MQ.save.getSetting('v3', true) !== false;
  }

  /* 器を 作る。size＝わくの 1辺（px）・ry＝向き・from＝作った 大きさ（48×unit） */
  function scene(size, ry, from, cls) {
    const sc = document.createElement('div');
    sc.className = 'v3scene' + (cls ? ' ' + cls : '');
    sc.style.cssText = 'width:' + size + 'px;height:' + size + 'px;perspective:900px;';
    const fig = document.createElement('div');
    fig.className = 'v3fig';
    fig.style.cssText = 'width:' + size + 'px;height:' + size + 'px;transform:rotateX(8deg) rotateY(' + (ry || 0) + 'deg);';
    const hold = document.createElement('div');
    hold.className = 'v3hold';
    const k = size / from;
    hold.style.cssText = 'left:' + ((size - from) / 2) + 'px;top:' + (size - from) + 'px;width:' + from + 'px;height:' + from + 'px;transform:scale3d(' + k + ',' + k + ',' + k + ');';
    fig.appendChild(hold);
    sc.appendChild(fig);
    sc.hold = hold;
    sc.v3 = null;
    return sc;
  }
  function put(sc, v, mo) {
    if (!v) return sc;
    if (mo) v.classList.add(mo);
    sc.hold.appendChild(v);
    sc.v3 = v;
    if (sc.pendingMo) { setMo(v, sc.pendingMo); sc.pendingMo = null; }
    return sc;
  }
  function unitFor(size) { return size >= 60 ? 2 : 1; }

  /* ---------- モンスター（enemies.node の .bx → 箱。写真の モンスターは img から） ---------- */
  function monster(id, size, opts) {
    opts = opts || {};
    const U = opts.unit || unitFor(size);
    const ry = opts.ry == null ? -22 : opts.ry;
    const sc = scene(size, ry, 48 * U, opts.cls);
    const key = id + '|' + U + '|' + (opts.enrage ? 1 : 0) + '|' + (hideFor(ry, opts) || '-');
    if (monCache[key]) return put(sc, monCache[key].cloneNode(true), opts.mo || 'mo-menace');
    const holder = MQ.enemies.node(id, { size: 48, enrage: !!opts.enrage });
    const bx = holder.querySelector('.bx');
    if (bx) { monCache[key] = MQ.vox.fromBx(bx, { unit: U, hide: hideFor(ry, opts) }); return put(sc, monCache[key].cloneNode(true), opts.mo || 'mo-menace'); }
    const png = holder.querySelector('.bxbox__png');
    if (!png) return null;
    /* 写真の モンスター：絵が 読めてから 箱に する（data URL なので すぐ） */
    const img = new Image();
    img.onload = function () {
      const grid = Math.min(img.naturalWidth || 48, 64);
      const v = MQ.vox.fromImage(img, png.src, { unit: U, size: grid, hide: hideFor(ry, opts) });
      if (!v) return;
      // 器は 48マスの つもりで 作って ある → 大きさを 合わせ直す
      const k = size / (grid * U);
      sc.hold.style.left = ((size - grid * U) / 2) + 'px';
      sc.hold.style.top = (size - grid * U) + 'px';
      sc.hold.style.width = sc.hold.style.height = (grid * U) + 'px';
      sc.hold.style.transform = 'scale3d(' + k + ',' + k + ',' + k + ')';
      put(sc, v, opts.mo || 'mo-menace');
    };
    img.src = png.src;
    return sc;
  }

  /* ---------- 主人公（MQ.hero.sprite → 箱）。絵は data URL なので Image に 読ませてから ---------- */
  function hero(player, size, opts) {
    opts = opts || {};
    const src = MQ.hero.sprite(player);
    const U = opts.unit || 2;
    const ry = opts.ry == null ? 22 : opts.ry;
    const sc = scene(size, ry, 48 * U, opts.cls);
    const key = src.length + ':' + src.slice(-64) + '|' + U + '|' + (hideFor(ry, opts) || '-');   // data URL は 長い ので 末尾で 見分ける
    sc.style.setProperty('--bw', (-Math.random() * 5).toFixed(2) + 's');   // v13.6：まばたきを 1人ずつ ずらす
    const done = function (v) { put(sc, v.cloneNode(true), opts.mo || 'mo-idle'); };
    if (heroCache[key]) { done(heroCache[key]); return sc; }
    const img = new Image();
    img.onload = function () {
      const v = MQ.vox.fromHero(img, src, { unit: U, hide: hideFor(ry, opts) });
      v.classList.add('v3--hero');
      heroCache[key] = v;
      done(v);
    };
    img.src = src;
    return sc;
  }

  /* ---------- たからばこ ---------- */
  function chest(size, opts) {
    opts = opts || {};
    const U = 2;
    const ry = opts.ry == null ? -22 : opts.ry;
    const sc = scene(size, ry, 48 * U, opts.cls);
    return put(sc, MQ.vox.chest({ unit: U, open: !!opts.open, hide: hideFor(ry, opts) }), opts.mo || 'mo-chest');
  }

  /* ---------- 動き ---------- */
  function sceneOf(el) {
    if (!el) return null;
    if (el.classList && el.classList.contains('v3scene')) return el;
    return el.querySelector ? el.querySelector('.v3scene') : null;
  }
  function setMo(v, mo) {
    v.className = v.className.replace(/\bmo-\S+/g, '').trim();
    void v.offsetWidth;
    if (mo) v.classList.add(mo);
  }
  function idleOf(v) {
    if (v.classList.contains('v3--chest')) return v.classList.contains('is-open') ? 'mo-chest-title' : 'mo-chest';
    if (v.classList.contains('v3--hero')) return 'mo-idle';
    return 'mo-menace';
  }
  /* 器（.v3scene）の 動き（走る・とぶ）を 外す。v12.2：mo-dash の ほかに mo-dash-sp／mo-dash-thru／mo-dash-jump／mo-rise */
  function clearSceneMo(sc) {
    sc.className = sc.className.replace(/\bmo-\S+/g, '').trim();
  }
  /* el（.hero／.enemy／.pal か 器）の 中の 箱に 動きを つける。ms の あと 待機に もどす。
     opts.scene（v12.2）＝器に つける 動き（'mo-dash-jump' など・null なら 動かさない）。ふつうの こうげきは mo-dash。
     opts.ms＝器の 動きの 長さ（--dms）。わざの 長さ（sp.ms）に そろえる */
  function play(el, mo, ms, opts) {
    const sc = sceneOf(el);
    if (!sc) return false;
    if (!sc.v3) { sc.pendingMo = mo; return false; }
    setMo(sc.v3, mo);
    const hero = sc.v3.classList.contains('v3--hero');
    const sceneMo = opts && ('scene' in opts) ? opts.scene : (mo === 'mo-attack' && hero ? 'mo-dash' : null);
    if (hero || (opts && ('scene' in opts))) {   /* v12.2.1：相棒も opts.scene で 器を 走らせる */
      clearSceneMo(sc);
      if (opts && opts.ms) sc.style.setProperty('--dms', opts.ms + 'ms');
      if (sceneMo) { void sc.offsetWidth; sc.classList.add(sceneMo); }
    }
    /* ms の あと 待機に もどす。ただし その あいだに 別の 動き（たおれる など）が 入って いたら もどさない */
    const token = (sc.moToken = (sc.moToken || 0) + 1);
    if (ms) setTimeout(function () { if (sc.moToken === token) idle(el); }, ms);
    return true;
  }
  function idle(el) {
    const sc = sceneOf(el);
    if (!sc || !sc.v3) return;
    clearSceneMo(sc);
    setMo(sc.v3, idleOf(sc.v3));
  }
  /* ダッシュの きょり：主人公の 器の 右はし → てきの 左はし（−8px＝けんの ぶん）。ステージの 拡大で 割りもどす */
  function dashTo(heroEl, foeEl) {
    const sc = sceneOf(heroEl);
    if (!sc || !foeEl) return;
    const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    const dx = (foeEl.getBoundingClientRect().left - sc.getBoundingClientRect().right) / k - 8;
    sc.style.setProperty('--dash', Math.max(40, Math.round(dx)) + 'px');
  }
  /* 登場：walk＝歩いて 出て くる（1体めと ボス）／それ いがいは はねて 出る。たからばこは ぽんと 出る */
  function enter(el, kind) {
    const mo = kind === 'walk' ? 'mo-walk' : kind === 'chest' ? null : 'mo-hop';
    if (!mo) { idle(el); return; }
    play(el, mo, 800);
  }

  MQ.ui = MQ.ui || {};
  MQ.ui.v3 = { on: on, monster: monster, hero: hero, chest: chest, play: play, idle: idle, dashTo: dashTo, enter: enter, sceneOf: sceneOf, hideOf: hideOf,
    clearCache: function () { Object.keys(monCache).forEach(function (k) { delete monCache[k]; }); Object.keys(heroCache).forEach(function (k) { delete heroCache[k]; }); } };
})();
