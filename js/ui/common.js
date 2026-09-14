/* ---------------------------------------------------------
   画面で 共通に 使う 部品
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

(function () {
  const h = MQ.util.h;
  let toastTimer = null;

  // 画面を 切りかえる（id は screen-start / screen-map / ...）
  MQ.ui.show = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.id === id);
    });
    const el = document.getElementById(id);
    const sc = el && el.querySelector('.page__body, .map__scroll');
    if (sc) sc.scrollTop = 0;
  };

  // 画面の中身を 入れかえる
  MQ.ui.mount = function (id, node) {
    const s = document.getElementById(id);
    s.innerHTML = '';
    s.appendChild(node);
    return s;
  };

  // 下に ちょこっと出る お知らせ
  MQ.ui.toast = function (text) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-shown'); }, 2200);
  };

  /* あたらしい バージョンが 入った ときの お知らせ（v2.3）。「こうしん」で 読みなおす */
  MQ.ui.updateReady = function () {
    if (document.getElementById('upd')) return;
    const stage = document.getElementById('stage') || document.body;
    stage.appendChild(h('div', { id: 'upd', class: 'upd', role: 'status' }, [
      h('span', { class: 'upd__t', text: 'あたらしい バージョンが あるよ' }),
      h('button', { class: 'btn btn--small', type: 'button', text: 'こうしん', onclick: function () { location.reload(); } })
    ]));
  };
  // せっていに いまの バージョンを 出す（sw.js が こたえる）
  MQ.ui.showVersion = function () {
    const el = document.getElementById('ver-note');
    if (el) el.textContent = 'いまの バージョン: ' + (MQ.version || 'しらべています…');
  };

  // v1.2 までの なごり。いまは 何も しない（模様は CSS で 描いている）
  MQ.ui.setTextures = function () {};

  /* オーロラの そうびを 5点 そろえて つけて いると 主人公が 光る（げきレア・v9.0）。
     絵じたいは 変えず、CSS の .is-gearaura を つけるだけ */
  /* v13.19：オーロラだけ → **どの グレードも** 5点 そろえて つけると 光る（色は css/gearaura.css の .ga--<グレード>） */
  function auraCls(player) {
    const gid = MQ.hero.fullSetGrade ? MQ.hero.fullSetGrade(player) : ((MQ.hero.hasAuroraSet && MQ.hero.hasAuroraSet(player)) ? 'aurora' : null);
    return gid ? ' is-gearaura ga--' + gid : '';
  }

  MQ.ui.heroImg = function (player, cls) {
    return h('img', { class: 'sprite ' + (cls || '') + auraCls(player), src: MQ.hero.sprite(player), alt: '主人公' });
  };

  // 顔だけの 小さい絵（ヘッダーの アイコン）
  MQ.ui.faceImg = function (player, cls) {
    return h('img', { class: 'sprite ' + (cls || '') + auraCls(player), src: MQ.hero.faceSprite(MQ.hero.lookOf(player)), alt: '' });
  };

  // モンスターの 絵（CSS の div の かたまり）
  MQ.ui.enemyNode = function (id, opts) {
    return MQ.enemies.node(id, opts);
  };

  // ★★☆ のような 星
  MQ.ui.stars = function (n, cls) {
    const el = h('span', { class: 'stars ' + (cls || ''), 'aria-label': '星' + n + 'つ' });
    for (let i = 0; i < 3; i++) el.appendChild(h('span', { class: 'star' + (i < n ? ' is-on' : ''), text: '★' }));
    return el;
  };

  /* ---- まなびの かけら ---- */
  const FRAG_ROWS = ['........', '...yy...', '..yYYy..', '.yYYYYy.', '.yYYYYy.', '..yYYy..', '...yy...', '........'];
  MQ.ui.fragSprite = function () {
    return MQ.pixel.url('frag', [{ rows: FRAG_ROWS, palette: { y: '#FFF0A8', Y: '#F2C14E' } }]);
  };
  /* ---- きんのコイン ---- */
  const COIN_ROWS = [
    '................', '.....yyyyyy.....', '...yyYYYYYYyy...', '..yYYYYYYYYYYy..',
    '.yYYYwwwwwwYYYy.', '.yYYYwYYYYwYYYy.', 'yYYYwYYYYYYwYYYy', 'yYYYwYYYYYYwYYYy',
    'yYYYwYYYYYYwYYYy', 'yYYYwYYYYYYwYYYy', '.yYYYwYYYYwYYYy.', '.yYYYwwwwwwYYYy.',
    '..yYYYYYYYYYYy..', '...yyYYYYYYyy...', '.....yyyyyy.....', '................'
  ];
  // きんのコイン（これも div で 描く）
  MQ.ui.coinNode = function (size) {
    return MQ.treasure.coinNode({ size: size || 40 });
  };

  MQ.ui.frags = function (player) {
    const areas = MQ.content.subjectAreas();
    return h('div', { class: 'frags', 'aria-label': 'まなびのかけら' }, areas.map(function (a) {
      const got = MQ.content.hasFrag(player, a.id);
      return h('img', { class: 'frag' + (got ? '' : ' frag--off'), src: MQ.ui.fragSprite(), alt: '', title: a.name });
    }));
  };

  /* レベルの バッジ（v13.15）：Lv10 ブロンズ → 20 シルバー → 30 ゴールド → 40 プラチナ → 50 レインボー */
  function lvBadgeCls(lv) {
    const b = MQ.levelup ? MQ.levelup.badgeOf(lv) : null;
    return b ? ' lvb lvb--' + b.id : '';
  }
  MQ.ui.lvBadgeCls = lvBadgeCls;

  /* カプセルの むりょう券（v13.15）。CSS の div だけ（金の 券＋まん中に カプセル） */
  MQ.ui.ticketNode = function (size) {
    const s = size || 24;
    return h('span', { class: 'tkt', style: { width: s + 'px', height: Math.round(s * 0.66) + 'px' } }, [
      h('i', { class: 'tkt__cap' })
    ]);
  };

  /* 名前・しょうごう・レベル・けいけんちの バー
     opts.slim … 1行に つめた かたち（地図の 上・v8.0。80px → 60px）
     opts.home … 右はしに「タイトル」ボタン（地図の 上・2026-09-13・ユーザー「タイトル画面に もどる 方法が わかりにくい」）。
                 まえは 右下の「小3 ▾」→「プレイヤーを かえる」しか なかった */
  MQ.ui.hud = function (player, opts) {
    const pr = MQ.hero.progress(player.xp);
    // なかま（v4.3）：連れて 歩いて いる 相棒を 顔の 横に 小さく
    const pal = MQ.pals ? MQ.pals.active(player) : null;
    return h('div', { class: 'hud' + (opts && opts.slim ? ' hud--slim' : '') }, [
      MQ.ui.faceImg(player, 'hud__img'),
      pal ? h('div', { class: 'hud__pal', title: pal.name + ' Lv.' + pal.lv }, [MQ.enemies.node(pal.id, { size: 30 })]) : null,
      h('div', { class: 'hud__body' }, [
        h('div', { class: 'hud__name', text: player.name }),
        h('div', { class: 'hud__title', text: MQ.hero.titleName(player) }),
        h('div', { class: 'xpbar' }, [h('div', { class: 'xpbar__fill', style: { width: Math.round(pr.ratio * 100) + '%' } })])
      ]),
      h('div', { class: 'hud__right' }, [
        h('span', { class: 'hud__lv' + lvBadgeCls(pr.level), text: 'Lv.' + pr.level }),
        h('span', { class: 'hud__xp', text: pr.into + ' / ' + pr.need }),
        MQ.ui.frags(player)
      ]),
      opts && opts.home ? h('button', {
        class: 'hud__home', type: 'button', 'aria-label': 'タイトルへ もどる',
        onclick: function () { MQ.sfx.tap(); MQ.ui.start.render(); MQ.ui.show('screen-start'); }
      }, [
        h('i', { class: 'hud__homeico' }, [h('i', { class: 'roof' }), h('i', { class: 'wall' }), h('i', { class: 'door' })]),
        h('b', { class: 'hud__homet', text: 'タイトル' })
      ]) : null
    ]);
  };

  /* ---- 時間の 表示（3:07） ---- */
  MQ.ui.fmtTime = function (sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };

  /* =======================================================
     ロゴ（v5.1・ユーザーが 出した 見本の とおり）

     木の かんばんに はめた ロゴ。左上に 本（みどりの 宝石つき）、
     右上に えんぴつ、四すみに みどりの 宝石。文字は 金の グラデ＋
     こい茶の ふち。かんばんは -2度 かたむける。
     ぜんぶ CSS の div（画像ファイルは 使わない）。
     ======================================================= */
  MQ.ui.logo = function () {
    return h('div', { class: 'title__plaque' }, [
      // 本（左上）
      h('div', { class: 'plq__book' }, [
        h('i', { class: 'cover' }),
        h('i', { class: 'pages' }),
        h('i', { class: 'gem' })
      ]),
      // えんぴつ（右上）
      h('div', { class: 'plq__pen' }, [
        h('i', { class: 'tip' }),
        h('i', { class: 'lead' }),
        h('i', { class: 'body' }),
        h('i', { class: 'end' })
      ]),
      // みどりの 宝石
      h('i', { class: 'plq__gem plq__gem--a' }),
      h('i', { class: 'plq__gem plq__gem--b' }),
      h('i', { class: 'plq__gem plq__gem--c' }),
      h('div', { class: 'title__logowrap' }, [
        h('div', { class: 'title__logo', html: 'まなび<br>モンスター' }),
        // ✦ は 文字だと 細くて 安っぽいので、CSS で 4とがりの 星を 描く
        h('span', { class: 'title__spark title__spark--a' }),
        h('span', { class: 'title__spark title__spark--b' })
      ])
    ]);
  };

  /* =======================================================
     音の スイッチ（効果音と BGMを 分ける）
     ======================================================= */
  MQ.ui.soundButtons = function () {
    function mk(label, get, set) {
      const btn = h('button', { class: 'sw', type: 'button', text: label });
      function paint() { btn.classList.toggle('is-on', !!get()); }
      btn.addEventListener('click', function () {
        const on = !get();
        set(on);
        paint();
        MQ.sfx.unlock();
        MQ.bgm.kick();
        MQ.sfx.tap();
      });
      paint();
      return btn;
    }
    return [
      mk('おと', function () { return MQ.sfx.isEnabled(); }, function (on) {
        MQ.sfx.setEnabled(on); MQ.save.setSetting('sfx', on);
      }),
      mk('きょく', function () { return MQ.bgm.isEnabled(); }, function (on) {
        MQ.bgm.setEnabled(on); MQ.save.setSetting('bgm', on);
      }),
      // りったい（v12.0）：主人公・モンスター・たからばこを 3D に。重い 端末や 好みで 2D に もどせる（つぎの 画面から）
      MQ.vox ? mk('りったい',
        function () { return MQ.save.getSetting('v3', true) !== false; },
        function (on) { MQ.save.setSetting('v3', on); MQ.ui.toast(on ? 'りったいに するよ（つぎの 画面から）' : '2D に もどすよ（つぎの 画面から）'); })
        : null,
      // よみあげ（v5.3）。声が 入って いない 端末では 出さない
      (MQ.speech && (MQ.speech.ready('en') || MQ.speech.ready('ja')))
        ? mk('よみあげ',
            function () { return MQ.save.getSetting('speech', true); },
            function (on) { MQ.save.setSetting('speech', on); if (!on) MQ.speech.stop(); })
        : null
    ].filter(Boolean);
  };

  /* この 端末・この せってい で 読み上げて よいか（v5.3） */
  MQ.ui.canSpeak = function (lang) {
    if (!MQ.speech) return false;
    if (!MQ.save.getSetting('speech', true)) return false;
    return MQ.speech.ready(lang);
  };

  /* 「きく」ボタンを 作る（おしたら 読む・読んで いる あいだは 光る）。
     読める もの が ない ときは null → 画面に 出さない */
  MQ.ui.listenButton = function (say) {
    if (!say || !say.text) return null;
    if (!MQ.ui.canSpeak(say.lang)) return null;
    let off = null;
    const btn = h('button', {
      class: 'listen', type: 'button', 'aria-label': '読み上げ',
      onclick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        MQ.sfx.tap();
        btn.classList.add('is-playing');
        const done = function () { clearTimeout(off); btn.classList.remove('is-playing'); };
        const ok = MQ.speech.speak(say.text, say.lang, { onend: done });
        if (!ok) done();
        else off = setTimeout(done, 6000);   // 保険（onend が 来ない 端末が ある）
      }
    }, [
      h('span', { class: 'listen__ico' }, [h('i', {}), h('b', {})]),
      h('span', { class: 'listen__tx', text: say.label || 'きく' })
    ]);
    return btn;
  };

  /* いまの プレイヤーの じぶんモンスターを 敵として つかえるように する */
  /* じぶんの モンスターの 2・3段階めの 絵を 作る（v8.2）。
     もとの 絵に 金の つの／かんむりと マントを かさねる（monstergen.evoPng）。
     絵が 読めない ときも 先に すすめる ように、1.5秒で あきらめる。 */
  const growing = {};
  MQ.ui.growCustom = function (mon, cb) {
    const done = function () { if (cb) { const f = cb; cb = null; f(); } };
    if (!mon || !mon.png || !MQ.monsterGen || !MQ.monsterGen.evoPng) { done(); return; }
    if (mon.png2 && mon.png3) { done(); return; }
    let left = 2;
    const step = function () { if (--left <= 0) done(); };
    setTimeout(done, 1500);
    try {
      MQ.monsterGen.evoPng(mon.png, 2, function (u) { if (u) mon.png2 = u; step(); });
      MQ.monsterGen.evoPng(mon.png, 3, function (u) { if (u) mon.png3 = u; step(); });
    } catch (e) { done(); }
  };

  MQ.ui.syncCustom = function () {
    const p = MQ.save.current();
    MQ.enemies.setCustom(p ? p.custom : []);
    if (!p || !p.custom || !p.custom.length) return;
    // むかしの セーブ（1段階だけ）に あとから 2・3段階めの 絵を 足す
    const need = p.custom.filter(function (m) { return m.png && !(m.png2 && m.png3) && !m.noGrow && !growing[m.id]; });
    if (!need.length) return;
    need.forEach(function (m) { growing[m.id] = 1; });
    let left = need.length;
    need.forEach(function (m) {
      MQ.ui.growCustom(m, function () {
        if (!m.png2 || !m.png3) m.noGrow = true;
        if (--left > 0) return;
        MQ.save.update(function () {});          // いまの 中身を ほぞん
        MQ.enemies.setCustom(p.custom);
      });
    });
  };

  MQ.ui.goMap = function () {
    MQ.ui.map.render();
    MQ.ui.show('screen-map');
    // あたらしい こと！（v8.3）。1回の 起動で 1回だけ・見る ものが なければ 何も しない
    if (MQ.ui.news) MQ.ui.news.maybeShow();
    // さいごの塔が ひらいた お知らせ（v9.3）。お知らせ画面が 出て いる ときは 出さない
    if (!MQ.ui.news || !MQ.ui.news.isOpen()) MQ.ui.towerPop();
    // しゅうまつ イベント（v13.16）：土・日の はじめての 地図で 1回。ほかの ポップが 出て いる ときは つぎに まわす
    if (MQ.ui.map.weekendPop && !(MQ.ui.news && MQ.ui.news.isOpen()) && !(MQ.ui.towerPopOpen && MQ.ui.towerPopOpen())) MQ.ui.map.weekendPop();
  };

  /* =======================================================
     さいごの塔が ひらいた！（v9.3）

     ユーザー「ラスボスと 戦えるように なったら 告知の ポップも 出るように」。
     かけらが ぜんぶ そろった **その つぎに 地図へ 行った とき 1回だけ** 出す。

     出さない とき：
       ・まだ かけらが そろって いない
       ・**もう ラスボスを たおして いる**（あとから 入れた 子に「ひらいた！」は へん）
       ・その 学年で 1回 見た（`p.seenTower` に 学年ごとに おぼえる）
     学年ごとに 分けるのは、かけらも 塔も 学年ごとだから（v4.5）。
     ======================================================= */
  let towerPopEl = null;

  MQ.ui.towerPop = function (force) {
    if (towerPopEl) return null;
    const p = MQ.save.current();
    if (!p || !MQ.content || !MQ.content.towerOpen) return null;
    const key = 'g' + ((MQ.content.activeWorld() || {}).grade || 3);
    if (!force) {
      if (!MQ.content.towerOpen(p)) return null;
      if ((p.seenTower || {})[key]) return null;
      const last0 = MQ.content.lastBoss();
      if (last0 && p.dex && p.dex[last0.id] > 0) {      // もう たおして いる
        MQ.save.update(function (q) { q.seenTower = q.seenTower || {}; q.seenTower[key] = true; });
        return null;
      }
    }

    const last = MQ.content.lastBoss();
    const name = MQ.content.towerName();
    const kid = ((MQ.content.activeWorld() || {}).grade || 3) <= 2;

    function close() {
      if (!towerPopEl) return;
      const gone = towerPopEl;
      towerPopEl = null;
      if (gone.parentNode) gone.parentNode.removeChild(gone);
      MQ.save.update(function (q) { q.seenTower = q.seenTower || {}; q.seenTower[key] = true; });
    }

    towerPopEl = h('div', {
      class: 'news towerpop', onclick: function (e) { if (e.target === towerPopEl) close(); }
    }, [
      // カードの わくは アイテム画面と 同じ `.bagcard`。
      // **`.newscard` は 借りない**（harness と smoke が「お知らせ画面が 出て いるか」を
      // `.newscard` で 見て いる ので、同じ 名前を つかうと ここの ポップと 見分けが つかない）
      h('div', { class: 'bagcard towerpop__card' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [
          h('h3', { class: 'bagcard__title towerpop__title', text: name + 'が ひらいた！' }),
          h('div', { class: 'bagcard__subrow' }, [
            h('span', { class: 'bagcard__sub', text: 'まなびの かけらが ぜんぶ そろった' })
          ])
        ]),
        h('div', { class: 'towerpop__art' }, [
          MQ.enemies.node(last.id, { size: 104, cls: 'towerpop__boss' })
        ]),
        h('p', { class: 'towerpop__line', text: last.name + (kid ? 'が まって いる！' : 'が 待って いる！') }),
        // 教科の 数は 学年で ちがう（小3は 4・小4と 小5は 5・小1と 小2は 2）ので
        // 数字を 書かない
        h('p', { class: 'towerpop__sub', text: kid ? 'ぜんぶの きょうかの もんだいが 出るよ。' : 'ぜんぶの 教科の 問題が じゅんばんに 出るよ。' }),
        h('div', { class: 'towerpop__foot' }, [
          h('button', {
            class: 'btn btn--big', type: 'button',
            onclick: function () {
              MQ.sfx.tap();
              close();
              MQ.ui.battle.start(MQ.content.towerStageId());
            }
          }, [h('span', { text: 'いく！' }), h('span', { class: 'btn__shine' })]),
          h('button', {
            class: 'btn btn--stone towerpop__later', type: 'button', text: 'あとで',
            onclick: function () { MQ.sfx.tap(); close(); }
          })
        ])
      ])
    ]);
    (document.getElementById('stage') || document.body).appendChild(towerPopEl);
    if (MQ.sfx.towerIntro) MQ.sfx.towerIntro();
    return towerPopEl;
  };
  MQ.ui.towerPopOpen = function () { return !!towerPopEl; };
})();
