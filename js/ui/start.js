/* ---------------------------------------------------------
   01 はじめの画面（タイトル）

   モックの とおり：
     明るい 青空 → 夕陽の グラデーション
     上から 放射状の 後光 ＋ まん中に 白い グロー
     四角い 雲が 2つ ゆっくり ながれる
     金グラデ＋こい茶ぶちの ロゴ ＋ ✦3つ
     空：ボスの 赤い ドラゴン（炎を はく）と
         うかぶ もんだいブロック（？・A・算）
     地面：草 → 土 → 草 の 3層（市松）
         木・勇者・さいごの塔／なかま3体・たからばこ
     いちばん下：緑の 主ボタン ＋ クリームと 紺の サブボタン

   画面は たてに flex で 3つに 分ける。
     head（ロゴ）→ scene（空・のびちぢみ）→ land（地面）→ actions
   こうすると 端末の たての 長さが 変わっても 重ならない。

   絵は ぜんぶ CSS の div か ドット絵（js/core/pixel.js）。
   画像ファイルは 使いません。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.start = (function () {
  const h = MQ.util.h;

  /* =======================================================
     タイトルだけで 使う ドット絵
     （マス目は 生成スクリプトで 作った もの。
       ボスの 赤い ドラゴンは 図かんの「まおう」とは 別の、看板用の 一枚絵）
     ======================================================= */
  const DRAGON_ROWS = [
    '.GG......................................GG.',
    '.pppp..................................pppp.',
    '.ppPPpp.G..........................G.ppPPpp.',
    '.ppPPPPpG..........................GpPPPPpp.',
    '..pPPPPPPpp......................ppPPPPPPp..',
    '..pPPPPPPPPpp.G..............G.ppPPPPPPPPp..',
    '..pPPPPPPPPPPpG..............GpPPPPPPPPPPp..',
    '...PPPGPPPPPPPPpp..........ppPPPPPPPPGPPP...',
    '...PPPPPPPPPPPPPPpp......ppPPPPPPPPPPPPPP...',
    '...pPPPPPPPGPPPPPPPpG..GpPPPPPPPGPPPPPPPp...',
    '....PPPPPPPPPPPPPPPPG..GPPPPPPPPPPPPPPPP....',
    '....PGPPpPPPPpPPGPpPG..GPpPGPPpPPPPpPPPP....',
    '....pGPPGPPPP.NNNNNNNNNNNNNNNNDDPPP.PPPp....',
    '.....GppGpppp.KKKKKKKKKKKKKKKKDDppp.ppp.....',
    '....NNNNNNNN..KKKKKKKKKKKKKKKKDD............',
    '....KKYYKKKKKKKKKGGKKKGGKKKGGKDD............',
    '..KKKKYYKKKKKKKKKGGKKKGGKKKGGKDDKKKKKK......',
    '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKDDKKKKKKK.....',
    '..KKKKKKKKKK..KKKKKKKKKKKKKKKKDD.....KK.....',
    '..DDDDDDDKKK..DDDDDDDDDDDDDDDDDD.....KK.....',
    '...GKKKKKKKK......KKK.....KKK........KKP....',
    '..................KKK.....KKK........PPPPP..',
    '..................KKK.....KKK........PPPPPP.',
    '.................GGGG....GGGG..........P....'
  ];
  const DRAGON_PAL = {
    P: '#ee4a34', p: '#9c1e0c',        // はね（赤）／へり・ほね（こい赤）
    K: '#7a1608', N: '#b0301a', D: '#4c0b03',   // からだ（こい赤／あかるい／かげ）
    G: '#ffd447', Y: '#ffe95e'         // 金の つの・かぎづめ・はん点／光る 目
  };

  const SLIME_ROWS = [
    '....gggggggg....',
    '..gggggggggggg..',
    '.glllgggggggggg.',
    'gllgggggggggggdd',
    'gllgggggggggggdd',
    'ggggkkggggkkggdd',
    'ggggkkggggkkggdd',
    'ggggkkggggkkggdd',
    'ggggkkggggkkggdd',
    'ggggggggggggggdd',
    'ggggggkkkkggggdd',
    'ggggggggggggggdd',
    '.ggggggggggggdd.',
    '..ggggggggggdd..'
  ];
  const SLIME_PAL = { g: '#63d94f', d: '#3f9c33', l: '#c2f7b4', k: '#1a2540' };

  const LIZARD_ROWS = [
    '...lllllllldd...',
    '...oooooooodd...',
    '...ookkookkdd...',
    '...ookkookkdd...',
    '...oooooooodd...',
    '...oodddddddd...',
    '...oooooooodd...',
    '.oooooooooodood.',
    '.oooooccccodood.',
    '.oooooccccodood.',
    '....ooccccod....',
    '....ooccccod....',
    '....oooooood....',
    '....ooo..ooo....',
    '....ddd..ddd....'
  ];
  const LIZARD_PAL = { o: '#ff9436', d: '#d96a15', c: '#ffd9a0', l: '#ffc07a', k: '#1a2540' };

  const GOLEM_ROWS = [
    '....lllllldd....',
    '....bbbbbbdd....',
    '....byybbyyd....',
    '....byybbyyd....',
    '....bbbbbbdd....',
    '....bbbbbbdd....',
    '....bbbbbbdd....',
    'bbbdllllllddbbbd',
    'bbbdbbbbbbddbbbd',
    'bbbdbbbbbbddbbbd',
    'bbbdbbbbbbddbbbd',
    'bbbdbbbbbbddbbbd',
    'bbbdbbbbbbddbbbd',
    '....bbbbbbdd....',
    '....bbb..bbb....',
    '....ddd..ddd....'
  ];
  const GOLEM_PAL = { b: '#4d8ce0', d: '#2f5fae', l: '#9fd0ff', y: '#ffd447' };

  function dot(key, rows, pal, cls) {
    return h('img', {
      class: 'sprite ' + cls, alt: '',
      src: MQ.pixel.url(key, [{ rows: rows, palette: pal }], { bevel: true })   // ふち取りなし（モックに 合わせる）
    });
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
     空（背景・後光・雲）
     ======================================================= */
  function sky() {
    return [
      h('div', { class: 'title__sky' }),
      h('div', { class: 'title__rays' }),
      h('div', { class: 'title__glow' }),
      h('div', { class: 'cloud cloud--a' }, [h('i'), h('i'), h('i')]),
      h('div', { class: 'cloud cloud--b' }, [h('i'), h('i'), h('i')])
    ];
  }

  /* =======================================================
     空に うかぶ もの（ボスと もんだいブロック）
     ======================================================= */
  function scene() {
    return h('div', { class: 'title__scene' }, [
      // ボスの 赤い ドラゴン（炎を はく）
      h('div', { class: 'title__boss' }, [
        dot('t-dragon', DRAGON_ROWS, DRAGON_PAL, 'title__bossimg'),
        h('div', { class: 'title__fire' }, [h('i'), h('i'), h('i')])
      ]),
      // うかぶ もんだいブロック（左の 空に まとめる）
      h('div', { class: 'title__cube title__cube--q', text: '？' }),
      h('div', { class: 'title__cube title__cube--a', text: 'A' }),
      h('div', { class: 'title__cube title__cube--s', text: '算' })
    ]);
  }

  /* =======================================================
     地面（草→土→草）と そこに 立つ もの
     ======================================================= */
  function land() {
    return h('div', { class: 'title__land' }, [
      h('div', { class: 'title__grass title__grass--far' }),
      h('div', { class: 'title__dirt' }),
      h('div', { class: 'title__grass title__grass--near' }),

      // 木と 塔の ねもとの 白い 石
      h('div', { class: 'title__stone title__stone--a' }),
      h('div', { class: 'title__stone title__stone--b' }),

      // 木
      h('div', { class: 'title__tree' }, [h('i'), h('i'), h('i'), h('i')]),

      // さいごの塔
      h('div', { class: 'title__tower' }, [
        h('div', { class: 'top' }, [h('i'), h('i'), h('i')]),
        h('div', { class: 'body' }, [
          h('div', { class: 'win win--on' }),
          h('div', { class: 'win win--off' }),
          h('div', { class: 'door' })
        ])
      ]),

      // 勇者（その子の アバターでは なく、決まった 一枚絵）
      h('div', { class: 'title__hero' }, [
        h('img', { class: 'sprite title__heroimg', src: MQ.hero.poster(), alt: '勇者' }),
        h('div', { class: 'shadow shadow--poster' })
      ]),

      // なかまの モンスター 3体
      h('div', { class: 'title__pals' }, [
        h('div', { class: 'pal pal--a' }, [dot('t-slime', SLIME_ROWS, SLIME_PAL, 'pal__img')]),
        h('div', { class: 'pal pal--b' }, [dot('t-lizard', LIZARD_ROWS, LIZARD_PAL, 'pal__img')]),
        h('div', { class: 'pal pal--c' }, [dot('t-golem', GOLEM_ROWS, GOLEM_PAL, 'pal__img')])
      ]),

      // たからばこ
      h('div', { class: 'title__chest' }, [
        h('span', { class: 'spark' }),
        h('div', { class: 'lid' }),
        h('div', { class: 'box' }, [h('div', { class: 'key' })])
      ])
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
