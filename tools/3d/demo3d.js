/* ---------------------------------------------------------
   デモ：本物の タイトル画面・バトル画面の 上で、主人公と モンスターだけ 3D に 置きかえる
   （ゲームに 入れる 前に「どんな 感じに なるか」を 見せる ため。harness の #demo3d / #demo3dbattle が 呼ぶ）

   絵は 1つも 描き直さない。2D の 部品（.bxbox）を 見つけて、同じ 場所・同じ 大きさの 3D に かえる だけ。
   主人公は「見本の この キャラ」（青い かみ・てつの けん・Lv30）＝ ユーザー指定（2026-09-10）。
   --------------------------------------------------------- */
window.DEMO3D = (function () {
  const TITLE_MOBS = {      // start.js の mob(...) と 同じ ならび（クラス → id）
    dragon: 'drago-3', bat: 'bat-purple', robo: 'mecha-1', slime: 'slime-green', lizard: 'lizard-fire',
    ghost: 'ghost-white', golem: 'golem-gray', ninja: 'ninja-2', gold: 'slime-golden', magma: 'magma-3'
  };
  const figs = [];

  function demoPlayer() {
    const p = { level: 30, look: {}, equipped: {} };
    const weapons = MQ.hero.gear.filter(function (g) { return g.slot === 'weapon'; });
    if (weapons[1]) p.equipped.weapon = weapons[1].id;      // てつの けん
    return p;
  }

  /* 3D の 図を、size px の わく（perspective つき）に 入れる。from＝作った 大きさ */
  function figWrap(v3, size, ry, from, cls) {
    const scene = document.createElement('div');
    scene.className = 'v3scene' + (cls ? ' ' + cls : '');
    scene.style.cssText = 'position:relative;width:' + size + 'px;height:' + size + 'px;perspective:900px;';
    const fig = document.createElement('div');
    fig.className = 'v3fig';
    fig.style.cssText = 'position:absolute;left:0;top:0;width:' + size + 'px;height:' + size + 'px;transform-style:preserve-3d;transform:rotateX(8deg) rotateY(' + ry + 'deg);';
    const hold = document.createElement('div');
    hold.className = 'v3hold';
    const k = size / from;
    hold.style.cssText = 'position:absolute;left:' + ((size - from) / 2) + 'px;top:' + (size - from) + 'px;width:' + from + 'px;height:' + from + 'px;transform-style:preserve-3d;transform-origin:center bottom;transform:scale3d(' + k + ',' + k + ',' + k + ');';
    hold.appendChild(v3);
    fig.appendChild(hold);
    scene.appendChild(fig);
    return scene;
  }
  function monster3d(id, size, ry, mo, cls) {
    const holder = MQ.enemies.node(id, { size: 48 });
    const bx = holder.querySelector('.bx');
    if (!bx) return null;                                     // 写真の モンスター（img）は この デモでは 2D の まま
    const U = Math.max(1, Math.floor(size / 48));
    const v = VOX2.fromBx(bx, { unit: U });
    v.classList.add(mo || 'mo-menace');
    figs.push(v);
    return figWrap(v, size, ry, 48 * U, cls);
  }
  /* たからばこ（chest3d.js）。size＝わくの 1辺（絵の 48マスが この 大きさ）。open＝ひらいた まま（タイトル） */
  function chest3d(size, ry, mo, cls, open) {
    const U = 2;                                              // 2px/マス で 作って scale3d（72px でも くっきり）
    const v = VOX2.chest({ unit: U, open: !!open });
    v.classList.add(mo || 'mo-chest');
    figs.push(v);
    return figWrap(v, size, ry, 48 * U, cls);
  }
  function hero3d(player, size, ry, mo, cls, cb) {
    const src = MQ.hero.sprite(player);
    const img = new Image();
    img.onload = function () {
      const U = Math.max(2, Math.floor(size / 48));
      const v = VOX2.fromHero(img, src, { unit: U });
      v.classList.add('v3--hero', mo || 'mo-idle');
      figs.push(v);
      cb(figWrap(v, size, ry, 48 * U, cls));
    };
    img.src = src;
  }

  /* ---------- タイトル ---------- */
  function title(player) {
    player = player || demoPlayer();
    document.querySelectorAll('.tmob').forEach(function (t) {
      const box = t.querySelector('.bxbox');
      const cls = (t.className.match(/tmob--(\w+)/) || [])[1];
      const id = TITLE_MOBS[cls];
      if (!box || !id) return;
      const size = Math.round(parseFloat(box.style.width) || 48);
      const left = parseFloat(getComputedStyle(t).left) || 0;
      const n = monster3d(id, size, left < 200 ? 22 : -22, 'mo-title');
      if (n) t.replaceChild(n, box);
    });
    const ch = document.querySelector('.title__chest');
    if (ch) {
      /* 2D の 部品（ふた・金貨・箱）を 外し、同じ 場所に 3D を おく。
         2D は はば 74・高さ 63（箱の 下＝bottom 6px）。3D は 48マス×2＝96px の わくで、箱は x 10〜86・y 16〜82。
         → 箱の 左と 下が 前と 同じ 場所に なる ように left −8・bottom −16。影は 3D の 足もとの だ円に。 */
      ['.lid', '.coins', '.box'].forEach(function (sel) { const n = ch.querySelector(sel); if (n) n.remove(); });
      const n = chest3d(96, -22, 'mo-chest-title', 'v3scene--chest', true);
      ch.insertBefore(n, ch.querySelector('.spark'));
      ch.style.filter = 'none';
      ch.style.width = '96px';
      ch.style.left = (232 - 8) + 'px';
      ch.style.bottom = (6 - 16) + 'px';
      ch.dataset.chest3d = '1';
    }
    const hero = document.querySelector('.title__hero');
    const img = hero && hero.querySelector('.title__heroimg');
    if (img) {
      hero3d(player, 138, 22, 'mo-idle', 'v3scene--title', function (n) {
        n.style.marginLeft = '-4px';
        hero.replaceChild(n, img);
        document.body.dataset.demo3d = 'title';
      });
    }
  }

  /* ---------- バトル ---------- */
  function battle(player) {
    player = player || demoPlayer();
    const byName = {};
    MQ.enemies.dexList().forEach(function (e) { byName[e.name] = e.id; });
    byName['たからばこ'] = 'chest';                             // 図かんに のせない（hidden）ので 手で 足す
    document.querySelectorAll('.enemy').forEach(function (en) {
      const box = en.querySelector('.enemy__img');
      const nm = en.querySelector('.enemy__name');
      if (!box || !nm) return;
      const id = byName[nm.textContent.replace(/^ボス /, '').replace(/^ラスボス /, '')];
      if (!id) return;
      const size = Math.round(parseFloat(box.style.width) || 96);
      const n = id === 'chest' ? chest3d(size, -22, 'mo-chest', 'enemy__img3d') : monster3d(id, size, -22, 'mo-menace', 'enemy__img3d');
      if (!n) return;
      en.replaceChild(n, box);
      const sh = en.querySelector('.shadow'); if (sh) sh.hidden = true;   // 影は 3D の 足もとの だ円に
    });
    const heroBox = document.querySelector('.hero');
    const heroImg = heroBox && heroBox.querySelector('.hero__img');
    if (heroImg) {
      hero3d(player, 84, 22, 'mo-idle', 'hero__img3d', function (n) {
        heroBox.replaceChild(n, heroImg);
        const sh = heroBox.querySelector('.shadow'); if (sh) sh.hidden = true;
        document.body.dataset.demo3d = 'battle';
        /* ダッシュの きょり：主人公の 器の 右はし から てきの 左はし まで（−8px＝けんの ぶん）。画面は 拡大されて いるので 割りもどす */
        const foe = document.querySelector('.foes .enemy');
        if (foe) {
          const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
          const dx = (foe.getBoundingClientRect().left - n.getBoundingClientRect().right) / k - 8;
          n.style.setProperty('--dash', Math.max(40, Math.round(dx)) + 'px');
          n.dataset.dash = Math.round(dx);
        }
      });
    }
    const palBox = document.querySelector('.pal__box');
    const palImg = palBox && palBox.querySelector('.pal__img');
    const palName = document.querySelector('.pal__name');
    if (palImg && palName && byName[palName.textContent.trim()]) {
      const n = monster3d(byName[palName.textContent.trim()], 40, 22, 'mo-title', 'pal__img3d');
      if (n) palBox.replaceChild(n, palImg);
    }
  }

  /* 動きを 再生（デモの ボタン用）：主人公は こうげき、てきは くらう など */
  function play(name) {
    const map = {
      attack: { hero: 'mo-attack', mon: 'mo-hurt', ms: 600 },
      hurt:   { hero: 'mo-hurt', mon: 'mo-attack', ms: 600 },
      lunge:  { hero: null, mon: 'mo-lunge', ms: 800 },
      fall:   { hero: 'mo-win', mon: 'mo-fall', ms: 1900 },
      walk:   { hero: null, mon: 'mo-walk', ms: 800 },
      hop:    { hero: null, mon: 'mo-hop', ms: 800 },
      crumble: { hero: 'mo-win', mon: 'mo-crumble', ms: 2000 },
      open:   { hero: null, mon: null, chest: 'mo-chest-open', ms: 1000 }
    };
    const m = map[name]; if (!m) return;
    figs.forEach(function (v) {
      const isHero = v.classList.contains('v3--hero');
      const isChest = v.classList.contains('v3--chest');
      const mo = isChest ? m.chest : isHero ? m.hero : m.mon;
      if (!mo) return;
      v.className = v.className.replace(/\bmo-\S+/g, '').trim();
      void v.offsetWidth;
      v.classList.add(mo);
      const scene = v.closest('.v3scene');
      if (scene) { scene.classList.remove('mo-dash'); if (isHero && mo === 'mo-attack') { void scene.offsetWidth; scene.classList.add('mo-dash'); } }
    });
    setTimeout(function () {
      figs.forEach(function (v) {
        v.className = v.className.replace(/\bmo-\S+/g, '').trim();
        const title = document.body.dataset.demo3d === 'title';
        if (v.classList.contains('v3--chest')) { if (name === 'open') v.classList.add('is-open'); v.classList.add(title ? 'mo-chest-title' : 'mo-chest'); return; }
        v.classList.add(v.classList.contains('v3--hero') ? 'mo-idle' : (title ? 'mo-title' : 'mo-menace'));
      });
    }, m.ms);
  }

  /* 止めて 撮る 用：play と 同じ だが もどさない */
  function pose(name) {
    const map = { attack: ['mo-attack', 'mo-hurt'], hurt: ['mo-hurt', 'mo-attack'], lunge: [null, 'mo-lunge'], fall: ['mo-win', 'mo-fall'], walk: [null, 'mo-walk'],
      hop: [null, 'mo-hop'], crumble: ['mo-win', 'mo-crumble'], open: [null, null, 'mo-chest-open'] };
    const m = map[name]; if (!m) return;
    figs.forEach(function (v) {
      const isHero = v.classList.contains('v3--hero');
      const mo = v.classList.contains('v3--chest') ? m[2] : isHero ? m[0] : m[1];
      if (!mo) return;
      v.className = v.className.replace(/\bmo-\S+/g, '').trim();
      void v.offsetWidth;
      v.classList.add(mo);
      const scene = v.closest('.v3scene');
      if (scene && isHero && mo === 'mo-attack') scene.classList.add('mo-dash');
    });
  }
  /* タイトルの オープニング（v10.4）を もう一度（デモの ボタン用）。style.css の is-opening を つけ直すだけ */
  function opening() {
    const t = document.querySelector('.title');
    if (!t) return;
    t.classList.remove('is-opening');
    void t.offsetWidth;
    t.style.setProperty('--tshift', '0s');
    t.classList.add('is-opening');
    setTimeout(function () { t.classList.remove('is-opening'); }, 1750);
  }
  return { title: title, battle: battle, play: play, pose: pose, opening: opening, figs: figs, demoPlayer: demoPlayer };
})();
