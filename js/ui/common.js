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

  MQ.ui.heroImg = function (player, cls) {
    return h('img', { class: 'sprite ' + (cls || ''), src: MQ.hero.sprite(player), alt: '主人公' });
  };

  // 顔だけの 小さい絵（ヘッダーの アイコン）
  MQ.ui.faceImg = function (player, cls) {
    return h('img', { class: 'sprite ' + (cls || ''), src: MQ.hero.faceSprite(MQ.hero.lookOf(player)), alt: '' });
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

  /* 名前・しょうごう・レベル・けいけんちの バー
     opts.slim … 1行に つめた かたち（地図の 上・v8.0。80px → 60px） */
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
        h('span', { class: 'hud__lv', text: 'Lv.' + pr.level }),
        h('span', { class: 'hud__xp', text: pr.into + ' / ' + pr.need }),
        MQ.ui.frags(player)
      ])
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
  MQ.ui.syncCustom = function () {
    const p = MQ.save.current();
    MQ.enemies.setCustom(p ? p.custom : []);
  };

  MQ.ui.goMap = function () {
    MQ.ui.map.render();
    MQ.ui.show('screen-map');
  };
})();
