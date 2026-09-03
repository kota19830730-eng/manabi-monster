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

  /* かみふぶき：[左px, 上 %（空の 高さに 合わせて 散らす）, 大きさ, 色, かたむき] */
  const BITS = [
    [30, 24, 8, '#ffd447', 12], [356, 27, 7, '#ef6ea3', -16],
    [70, 30, 6, '#63d94f', 24], [320, 30, 8, '#5ab0ff', -10],
    [180, 34, 6, '#ff8f5e', 18], [240, 34, 7, '#ffd447', -22],
    [128, 37, 6, '#ef6ea3', 8], [288, 38, 6, '#63d94f', -14],
    [48, 47, 6, '#63d94f', 20], [344, 50, 7, '#ffd447', -12]
  ];

  /* ゲームの 本物の モンスターを 1体 おく（場所と 大きさは CSS の .tmob--*） */
  function mob(id, size, cls) {
    return h('div', { class: 'tmob tmob--' + cls }, [MQ.enemies.node(id, { size: size })]);
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
      h('div', { class: 'title__glow' }),
      h('div', { class: 'title__bits' }, BITS.map(function (b) {
        return h('i', {
          style: {
            left: b[0] + 'px', top: b[1] + '%',
            width: b[2] + 'px', height: b[2] + 'px',
            background: b[3], transform: 'rotate(' + b[4] + 'deg)'
          }
        });
      }))
    ];
  }

  /* =======================================================
     ゴージャスな たからばこ（ふたが ひらいて 金貨が 見える）
     ======================================================= */
  function chest() {
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
    return h('div', { class: 'title__scene' });
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

      // 勇者（その子の アバターでは なく、決まった 一枚絵）
      h('div', { class: 'title__hero' }, [
        h('img', { class: 'sprite title__heroimg', src: MQ.hero.poster(), alt: '勇者' }),
        h('div', { class: 'shadow shadow--poster' })
      ]),

      // 手まえ：にんじゃ・ゴールデンスライム・たからばこ・マグマゴン
      mob('ninja-2', 62, 'ninja'),
      mob('slime-golden', 58, 'gold'),
      chest(),
      mob('magma-3', 62, 'magma')
    ]);
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
      h('div', { class: 'title__head' }, [
        MQ.ui.logo(),
        h('p', { class: 'title__tag', text: 'こたえた ぶんだけ つよくなる' })
      ]),
      scene(),
      land(),
      h('div', { class: 'title__actions' }, actions)
    ]));

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

  return { render: render, maker: maker };
})();
