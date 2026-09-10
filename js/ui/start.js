/* ---------------------------------------------------------
   01 はじめの画面（タイトル）

   v5.0（2026-09-04）ユーザーが えらんだ モック
   「モンスター だいしゅうごう」の とおりに 作り直した：
     明るい 青空 ＋ まん中の 光 ＋ 色とりどりの かみふぶき
     金グラデ＋こい茶ぶちの ロゴ ＋ ✦3つ
     うしろ：大きな ボスドラゴン（ドラゴニクス）と うかぶ「A」ブロック
     まん中：勇者（黒かみ・青マント・ダイヤの けん）と なかまたち
     手まえ：にんじゃ・ゴールデンスライム・ゴージャスな たからばこ・マグマゴン
     いちばん下：緑の 主ボタン ＋ クリームと 紺の サブボタン

   **モンスターは ゲームの 本物の 絵**（MQ.enemies.node）を つかう。
   タイトルだけの にせの 絵を 作ると 図かんと ちがって しまうため。
   勇者だけは 決まった 一枚絵（MQ.hero.poster）。マス目は
   `node tools/gen-title-art.js` で 作る（手で 打たない）。

   画面は たてに flex で 4つに 分ける。
     head（ロゴ）→ scene（空・のびちぢみ）→ land（地面）→ actions
   みんなは land の 中に「下から の 位置」で おいて あるので、
   画面が 高く なっても ボタンの すぐ 上に そろう。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.start = (function () {
  const h = MQ.util.h;

  /* かみふぶき：[左px, 上 %（ロゴと 地面の あいだ の 高さの わりあい）, 大きさ, 色, かたむき] */
  const BITS = [
    [30, 8, 8, '#ffd447', 12], [356, 14, 7, '#ef6ea3', -16],
    [70, 26, 6, '#63d94f', 24], [320, 30, 8, '#5ab0ff', -10],
    [180, 20, 6, '#ff8f5e', 18], [240, 42, 7, '#ffd447', -22],
    [128, 50, 6, '#ef6ea3', 8], [288, 58, 6, '#63d94f', -14],
    [48, 64, 6, '#63d94f', 20], [200, 72, 7, '#ffd447', -12]
  ];

  /* ゲームの 本物の モンスターを 1体 おく（場所と 大きさは CSS の .tmob--*） */
  /* りったい（v12.0）：左がわの 子は 右むき（+22°）・右がわの 子は 左むき（−22°）。やさしく ゆれる mo-title */
  const TITLE_RY = { dragon: -22, bat: 22, robo: 22, slime: 22, lizard: 22, ghost: -22, golem: -22, ninja: 22, gold: 22, magma: -22 };
  function v3on() { return !!(MQ.ui.v3 && MQ.ui.v3.on()); }
  function mob(id, size, cls) {
    const art = v3on() ? MQ.ui.v3.monster(id, size, { ry: TITLE_RY[cls] == null ? -22 : TITLE_RY[cls], mo: 'mo-title' }) : null;
    return h('div', { class: 'tmob tmob--' + cls }, [art || MQ.enemies.node(id, { size: size })]);
  }
  /* タイトルの 勇者（3D）＝ 見本の この キャラ（青い かみ・ひかる けん・Lv30）。その子の アバターでは ない（v5.0 の きまりは そのまま） */
  const TITLE_HERO = { level: 30, look: {}, equipped: { weapon: 'tetsu-weapon' } };
  function heroFig() {
    if (v3on()) {
      return h('div', { class: 'title__hero is-3d' }, [
        MQ.ui.v3.hero(TITLE_HERO, 138, { ry: 22, mo: 'mo-idle', cls: 'v3scene--title' }),
        h('div', { class: 'shadow shadow--poster' })
      ]);
    }
    return h('div', { class: 'title__hero' }, [
      h('img', { class: 'sprite title__heroimg', src: MQ.hero.poster(), alt: '勇者' }),
      h('div', { class: 'shadow shadow--poster' })
    ]);
  }

  function begin(name, look, grade) {
    name = (name || '').trim();
    if (!name) { MQ.ui.toast('なまえを 入れてね'); return; }
    MQ.sfx.unlock();
    MQ.sfx.coin();
    MQ.save.createPlayer(name, look, grade || 3);
    MQ.save.update(function (pl) {
      MQ.hero.checkTitles(pl);
      MQ.save.addLog(pl, name + ' が ぼうけんに 出た');
    });
    MQ.ui.syncCustom();
    MQ.ui.goMap();
  }

  /* =======================================================
     空（背景・光・かみふぶき）
     ======================================================= */
  function sky() {
    return [
      h('div', { class: 'title__sky' }),
      h('div', { class: 'title__glow' })
    ];
  }

  /* =======================================================
     ゴージャスな たからばこ（ふたが ひらいて 金貨が 見える）
     ======================================================= */
  function chest() {
    if (v3on()) {
      // 3D（v12.0）：ひらいた まま・金貨が 見える。光と きらめきは 2D の まま
      return h('div', { class: 'title__chest is-3d' }, [
        h('div', { class: 'glow' }),
        MQ.ui.v3.chest(96, { ry: -22, mo: 'mo-chest-title', cls: 'v3scene--chest', open: true }),
        h('span', { class: 'spark spark--a' }),
        h('span', { class: 'spark spark--b' })
      ]);
    }
    return h('div', { class: 'title__chest' }, [
      h('div', { class: 'glow' }),
      h('div', { class: 'lid' }, [h('i', { class: 'gem' })]),
      h('div', { class: 'coins' }, [h('i'), h('i'), h('i')]),
      h('div', { class: 'box' }, [
        h('i', { class: 'band band--l' }),
        h('i', { class: 'band band--r' }),
        h('div', { class: 'lock' })
      ]),
      h('span', { class: 'spark spark--a' }),
      h('span', { class: 'spark spark--b' })
    ]);
  }

  /* =======================================================
     空の あき（画面が 高い ぶんは ここが のびる）
     ======================================================= */
  function scene() {
    // かみふぶきは ここ（ロゴと 地面の あいだ）に 出す。
    // 画面が 高い ほど ここが 広がるので、空が さびしく ならない。
    return h('div', { class: 'title__scene' }, [
      h('div', { class: 'title__bits' }, BITS.map(function (b) {
        return h('i', {
          style: {
            left: b[0] + 'px', top: b[1] + '%',
            width: b[2] + 'px', height: b[2] + 'px',
            background: b[3], transform: 'rotate(' + b[4] + 'deg)'
          }
        });
      }))
    ]);
  }

  /* =======================================================
     地面（草 → 土）と そこに いる みんな
     ======================================================= */
  function land() {
    return h('div', { class: 'title__land' }, [
      h('div', { class: 'title__grass' }),
      h('div', { class: 'title__dirt' }),
      h('div', { class: 'title__speck title__speck--a' }),
      h('div', { class: 'title__speck title__speck--b' }),
      h('div', { class: 'title__speck title__speck--c' }),

      // うしろ：ボスの ドラゴンと 空の なかま、うかぶ「A」ブロック
      mob('drago-3', 128, 'dragon'),
      mob('bat-purple', 52, 'bat'),
      mob('mecha-1', 50, 'robo'),
      h('div', { class: 'title__cube', text: 'A' }),

      // まん中：なかまたち
      mob('slime-green', 62, 'slime'),
      mob('lizard-fire', 60, 'lizard'),
      mob('ghost-white', 58, 'ghost'),
      mob('golem-gray', 58, 'golem'),

      // 勇者（その子の アバターでは なく、決まった キャラ。3D なら 見本の キャラ・2D なら 一枚絵）
      heroFig(),

      // 手まえ：にんじゃ・ゴールデンスライム・たからばこ・マグマゴン
      mob('ninja-2', 62, 'ninja'),
      mob('slime-golden', 58, 'gold'),
      chest(),
      mob('magma-3', 62, 'magma'),

      // オープニング（v10.4）だけで 見える：勇者の 足もとの 土ぼこり 6つ・たからばこから とぶ コイン 5まい
      h('div', { class: 'title__dust' }, [h('i'), h('i'), h('i'), h('i'), h('i'), h('i')]),
      h('div', { class: 'title__fly' }, [h('i'), h('i'), h('i'), h('i'), h('i')])
    ]);
  }

  /* =======================================================
     オープニング（v10.4）：アプリを ひらいた とき みんなが とびこんで くる
     - 1回の 起動で 1回だけ（地図から「プレイヤー」で もどった ときは 出ない）
     - フォントが 読めて 描き直す とき（boot.js）は さいしょから やり直さず、つづきから（--tshift）
     - タップで とばせる。おわると is-opening が 外れて いつもの bob に もどる
     - 絵と 時間は css/style.css の「オープニング（v10.4）」
     ======================================================= */
  const OPEN_MS = 1750;
  let openedAt = 0;   // オープニングを はじめた 時刻（0＝まだ）

  // 出すなら「何ミリ秒 おくれて 入るか」（0＝さいしょから）、出さないなら null
  function openingShift() {
    const now = Date.now();
    if (!openedAt) { openedAt = now; return 0; }
    const d = now - openedAt;
    return d < OPEN_MS ? d : null;
  }
  function resetOpening() { openedAt = 0; }   // テスト用（harness #open）

  function attachOpening(wrap) {
    let m = null;
    try { m = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
    if (m && m.matches) return;
    const shift = openingShift();
    if (shift === null) return;
    wrap.classList.add('is-opening');
    wrap.style.setProperty('--tshift', (-shift / 1000) + 's');
    let timer = 0;
    function done() { wrap.classList.remove('is-opening'); clearTimeout(timer); }
    timer = setTimeout(done, OPEN_MS - shift);
    wrap.addEventListener('pointerdown', done);   // どこを タップしても とばせる（ボタンは そのまま 効く）
  }

  /* =======================================================
     タイトル
     ======================================================= */
  function render() {
    const save = MQ.save.get();
    MQ.bgm.play('title');

    const players = save.players.slice();

    function go(p) {
      MQ.sfx.unlock(); MQ.sfx.tap();
      MQ.save.setCurrent(p.id);
      MQ.ui.syncCustom();
      MQ.ui.goMap();
    }

    /* おうちの人ページ（v7.8）。地図から ここに ひっこした。
       どの子の レポートか 決まって いない ときは 1人めを えらぶ（中で 切りかえられる） */
    function openParent() {
      MQ.sfx.unlock(); MQ.sfx.tap();
      if (!MQ.save.current() && players.length) MQ.save.setCurrent(players[0].id);
      if (!MQ.save.current()) { MQ.ui.toast('まずは ぼうけんを はじめてね'); return; }
      MQ.ui.syncCustom();
      MQ.ui.parent.open('home', { from: 'title' });
    }

    const actions = [];

    if (players.length === 1) {
      actions.push(h('button', {
        class: 'btn btn--big', type: 'button',
        onclick: function () { go(players[0]); }
      }, [
        h('span', { text: '▶ ぼうけんの つづき' }),
        h('span', { class: 'btn__shine' })
      ]));
    } else if (players.length > 1) {
      actions.push(h('div', { class: 'players' }, players.map(function (p) {
        const pr = MQ.hero.progress(p.xp);
        return h('button', { class: 'player', type: 'button', onclick: function () { go(p); } }, [
          MQ.ui.heroImg(p, 'player__img'),
          h('span', { class: 'player__name', text: p.name }),
          h('span', { class: 'player__grade', text: '小' + (p.grade || 3) }),
          h('span', { class: 'player__lv', text: 'Lv.' + pr.level })
        ]);
      })));
    }

    actions.push(h('div', { class: 'title__row' }, [
      h('button', {
        class: 'btn btn--cream', type: 'button', text: '＋ はじめから',
        onclick: function () { MQ.sfx.unlock(); MQ.sfx.tap(); maker(); }
      }),
      h('button', {
        class: 'btn btn--stone btn--fix', type: 'button', text: 'ずかん',
        onclick: function () {
          MQ.sfx.unlock(); MQ.sfx.tap();
          if (!MQ.save.current() && players.length) MQ.save.setCurrent(players[0].id);
          if (!MQ.save.current()) { MQ.ui.toast('まずは ぼうけんを はじめてね'); return; }
          MQ.ui.syncCustom();
          MQ.ui.dex.render('hero');
          MQ.ui.show('screen-dex');
        }
      })
    ]));

    const wrap = h('div', { class: 'title' }, sky().concat([
      h('div', { class: 'title__sound' }, MQ.ui.soundButtons()),
      // 右上：おうちの人ページ（大人むけ。子どもの ボタンとは 分けて 小さく おく）
      h('button', { class: 'sw sw--parent', type: 'button', text: 'おうちの人', onclick: openParent }),
      // 上の あき（ロゴを 下げる ため。画面が 高い ほど 大きく なる）
      h('div', { class: 'title__top' }),
      h('div', { class: 'title__head' }, [
        MQ.ui.logo(),
        h('div', { class: 'title__tagrow' }, [
          h('i', { class: 'tag__gem' }),
          h('p', { class: 'title__tag', text: 'こたえた ぶんだけ つよくなる' }),
          h('i', { class: 'tag__gem' })
        ])
      ]),
      scene(),
      land(),
      h('div', { class: 'title__actions' }, actions)
    ]));

    attachOpening(wrap);   // v10.4：1回の 起動で 1回だけ
    MQ.ui.mount('screen-start', wrap);
  }

  /* =======================================================
     あたらしい ぼうけん（なまえ と すがた）
     ======================================================= */
  function maker() {
    const look = MQ.hero.defaultLook();
    let grade = 3;      // えらんだ がくねん（いまは 小3 だけ あそべる）
    const input = h('input', { class: 'input', type: 'text', maxlength: '10', placeholder: 'なまえ', autocomplete: 'off', 'aria-label': 'なまえ' });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') begin(input.value, look, grade); });

    /* がくねん えらび（v2.1）：小1〜小6。あそべる ワールド（locked が ない）だけ えらべる。
       ほかは「じゅんびちゅう」＝ 問題が できたら world3.js の worlds を 開けるだけで ここも 開く */
    const gradeRow = h('div', { class: 'grades' }, MQ.content.worlds.map(function (w) {
      const open = !w.locked;
      return h('button', {
        class: 'gradecell' + (open ? '' : ' is-prep') + (w.grade === grade ? ' is-on' : ''),
        type: 'button', 'aria-label': w.name,
        onclick: function () {
          MQ.sfx.tap();
          if (!open) { MQ.ui.toast(w.name + 'は じゅんびちゅう。もう すこし まってね'); return; }
          grade = w.grade;
          gradeRow.querySelectorAll('.gradecell').forEach(function (el, i) {
            el.classList.toggle('is-on', MQ.content.worlds[i].grade === grade);
          });
        }
      }, [
        h('b', { class: 'gradecell__g', text: '小' + w.grade }),
        h('span', { class: 'gradecell__s', text: open ? 'あそべる' : 'じゅんびちゅう' })
      ]);
    }));

    // 新しい 子は Lv1 なので、さいしょから 使える パーツだけ えらべる
    const picker = MQ.ui.look.panel(look, {
      level: 1, name: '', title: 'すがたを つくる',
      actions: [
        h('button', { class: 'btn btn--big', type: 'button', onclick: function () { begin(input.value, look, grade); } }, [
          h('span', { text: 'これで ぼうけんへ！' }),
          h('span', { class: 'btn__shine' })
        ]),
        h('button', { class: 'btn btn--small btn--stone', type: 'button', text: 'もどる', onclick: function () { MQ.sfx.tap(); render(); } })
      ]
    });
    input.addEventListener('input', function () { picker.setName(input.value.trim()); });

    const wrap = h('div', { class: 'page', style: { background: 'linear-gradient(#1a2544, #131c36)' } }, [
      h('div', { class: 'page__body' }, [
        h('div', { class: 'maker' }, [
          h('h2', { class: 'label', text: 'なまえを 入れてね', style: { marginTop: '2px' } }),
          input,
          h('h2', { class: 'label', text: 'がくねんを えらんでね' }),
          gradeRow,
          picker.el
        ])
      ])
    ]);

    MQ.ui.mount('screen-start', wrap);
    MQ.ui.show('screen-start');
  }

  return { render: render, maker: maker, resetOpening: resetOpening, OPEN_MS: OPEN_MS };
})();
