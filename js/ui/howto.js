/* ---------------------------------------------------------
   はじめての 案内（チュートリアル・v14.48・2026-10-10）
   ユーザー「初めての説明画面、チュートリアルみたいなのをまなびモンスターにも」（ころたまの 案内を 見て）
   → 決定：おうちの人むけ と 子どもむけ の 両方。**新しく はじめた 子だけ**（いま 遊んで いる 子には 出さない）。

   ① おうちの人むけ（大人の 文・data-noconv）：プレイヤーを 作った 直後、v14.40 の「はじめる前に 3つだけ」の 前に 6ページ（6ページめ＝感想フォームの お願い・v14.49）。
      おうちの人ページの 設定「使い方の案内を見る」から いつでも もう一度。
        MQ.ui.howto.parent({ onDone, from })  … onDone＝おわった あと（とばした ときも）
   ② 子どもむけ（ひらがな＋小1の かん字）：さいしょの 地図で 1回だけ 3つの ステップの カード（読み上げ つき）。
        MQ.ui.howto.kid(player)  … p.kidTour が true なら 出さない
      バトルの 中の ひとこと（まちがえた・たからばこ・ボス など）は js/ui/battle.js の renderGuide／coach。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

(function () {
  const h = MQ.util.h;

  /* ===================== ① おうちの人むけ ===================== */
  function mon(id, size) { try { return MQ.enemies.node(id, { size: size || 56 }); } catch (e) { return h('span'); } }
  function heroArt() {
    const p = MQ.save.current();
    try { return h('img', { class: 'phw__heroimg', src: MQ.hero.sprite(p), alt: '' }); } catch (e) { return h('span'); }
  }
  function item(art, title, text) {
    return h('div', { class: 'phw__item' }, [
      h('span', { class: 'phw__ico' }, [art]),
      h('div', { class: 'phw__it' }, [h('b', { text: title }), h('span', { text: text })])
    ]);
  }
  function dock(name) { try { return MQ.ui.map.dockIcon(name, 30); } catch (e) { return h('span'); } }

  const PAGES = [
    { title: 'まなびモンスターへようこそ', body: function () {
      return [
        h('div', { class: 'phw__hero' }, [heroArt(), mon('slime-green', 64), mon('boss-dragon', 72)]),
        h('p', { class: 'phw__p', text: '問題に答えて、モンスターをたおしながら進む学習RPGです。小1〜小6の算数・国語・理科・社会・英語に対応しています。' }),
        h('p', { class: 'phw__p', text: 'ライフや負けはなく、ふつうのバトルに制限時間もありません。課金・広告もありません。記録はこの端末の中だけに保存され、外には送りません。' }),
        h('p', { class: 'phw__note', text: 'この案内は5ページです。あとから「おうちの人」→「設定」でもう一度見られます。' })
      ];
    } },
    { title: '1回の遊び方', body: function () {
      return [
        h('div', { class: 'phw__list' }, [
          item(h('span', { class: 'kidtour__node phw__node' }, [h('i', { class: 'kidtour__nodein', text: '1' })]), '地図でステージを選ぶ', '教科ごとのエリアに、学校の単元の順でステージがならんでいます。'),
          item(mon('slime-green', 30), 'モンスター1体＝1問', '約12体（約18問・10分ほど）。最初はやさしく、ボスに近づくほどむずかしくなります。'),
          item(mon('boss-dragon', 30), '最後にボス', 'たおすと正答率に応じて星が1〜3個もらえ、星を集めると次のステージが開きます。')
        ]),
        h('p', { class: 'phw__note', text: '1問につき2回まで答えられます。2回まちがえると答えを見せ、その問題は後日「ふくしゅう」でもう一度出ます。バツや減点はありません。' })
      ];
    } },
    { title: '学びを続けるしかけ', body: function () {
      return [
        h('div', { class: 'phw__list' }, [
          item(h('i', { class: 'mapobi__star phw__star' }), 'きょうのフィーバー', 'いちばん遊んでいない教科が、毎日おトクになります（にがての教科へ自然に向かうしかけ）。'),
          item(MQ.ui.coinNode(28), 'きょうのミッション', '毎日3つの小さな目標。できるとコインがもらえます。'),
          item(dock('scroll'), 'しゅぎょうば', '相棒が解き方を教えてくれる予習・復習の場所です。'),
          item(dock('dice'), 'ごちゃまぜバトル', '複数の教科がまざったまとめのバトルです。')
        ])
      ];
    } },
    { title: '集める楽しみ', body: function () {
      return [
        h('div', { class: 'phw__list' }, [
          item(mon('golem-gray', 30), '図かん・相棒', 'たおしたモンスターが図かんに。仲間になった1体を相棒として連れて歩けます。'),
          item(MQ.ui.coinNode(28), 'コインとカプセル', 'コインは勉強でだけたまります（お金はかかりません）。カプセルマシンで装備や仲間が出ます。'),
          item(mon('skullhorse', 34), 'じぶんのモンスター', 'お子さんの絵を写真にとると、ゲームのモンスターになって登場します。'),
          item(dock('coin'), 'ごほうびマシン（おうちの人が作る）', 'コインで回すマシンに、本物のごほうび（おやつ・公園・新しいゲームなど）を入れられます。出やすさ（%）、何回で必ず当たるか、期限、1回のコイン数を決められます。当たると「ごほうびチケット」になり、おうちの人が渡します。')
        ])
      ];
    } },
    { title: 'おうちの人の画面', body: function () {
      return [
        h('p', { class: 'phw__p', text: 'タイトル画面の右上「おうちの人」から開けます。子どもには見せない大人用の画面です。' }),
        h('div', { class: 'phw__list' }, [
          item(h('span', { class: 'phw__dot', text: '1' }), '学習レポート', '今週の量・正答率・気になる単元・成長のようす。単元ごとに練習もさせられます。'),
          item(h('span', { class: 'phw__dot', text: '2' }), '設定', '学校で習ったところだけ出す・教科書会社・読み上げ・むずかしさ。'),
          item(h('span', { class: 'phw__dot', text: '3' }), 'てがみ・ごほうびマシン', 'お子さんへの手紙を送ったり、ごほうびマシンの中身と確率を決めたりできます（4けたの番号で鍵をかけられます）。'),
          item(h('span', { class: 'phw__dot', text: '4' }), '記録の保存', '記録をファイルに保存・復元できます。機種変更のときに使ってください。')
        ])
      ];
    } },
    { title: '感想フォームへのご協力のお願い', body: function () {
      const url = fbUrl();
      return [
        h('p', { class: 'phw__p', text: '使ってくださる方の声で作り直しています。しばらく遊んでみたら、一言いただけるととても助かります（1〜2分・名前なしでOK）。' }),
        h('div', { class: 'phw__list' }, [
          item(h('span', { class: 'phw__dot', text: '1' }), 'お子さんの一言だけでも', '「ここが好き」「ここがむずかしい」「こうなったらいい」など。'),
          item(h('span', { class: 'phw__dot', text: '2' }), 'タイトル画面で1日1回お願いします', 'しばらく遊ぶと案内が出ます。「送りました」を押すと出なくなります。'),
          item(h('span', { class: 'phw__dot', text: '3' }), 'いつでも送れます', '「おうちの人」のホームと設定からも送れます。')
        ]),
        url ? h('a', { class: 'phw__form', href: url, target: '_blank', rel: 'noopener', text: '感想フォームを開く', onclick: function () { fbOpened(); } }) : null,
        h('p', { class: 'phw__note', text: 'Googleのフォームが開きます。「送信」を押すまで何も送られません。' })
      ];
    } }
  ];

  /* ===================== ③ 感想フォームの お願い（v14.49） =====================
     ユーザー「感想を提出していないユーザーには1日1回ぐらい感想フォームにご協力をお願いします。みたいなの表示させて」。
     フォームは Google（送ったかは アプリから 分からない）→ おうちの人が「送りました」を 押すまで、
     **だれかが 3回 いじょう たたかった あと**、タイトル画面で 1日 1回（きろくの 案内 v14.46 が 出る 日は 出さない）。
     せってい：fbDone（送りました）・fbAskDay（出した 日）・fbOpenedAt（フォームを 開いた）。大人の 文（data-noconv）。 */
  function dayKey(t) { const d = new Date(t || Date.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function fbUrl() {
    const P = MQ.ui.parent;
    if (!P || !P.FEEDBACK_FORM || !P.FEEDBACK_FORM.url) return '';
    const st = MQ.save.get();
    const p = MQ.save.current() || (st && st.players && st.players[0]) || { grade: 3 };
    try { return P.feedbackUrl(p); } catch (e) { return P.FEEDBACK_FORM.url; }
  }
  function fbOpened() { MQ.save.setSetting('fbOpenedAt', Date.now()); }
  function fbSent() { MQ.save.setSetting('fbDone', true); }
  function fbDue(now) {
    if (!fbUrl()) return false;
    if (MQ.save.getSetting('fbDone', false)) return false;
    if (MQ.save.getSetting('fbAskDay', '') === dayKey(now)) return false;
    const st = MQ.save.get();
    return !!(st && (st.players || []).some(function (p) { return (p.battles || 0) >= 3; }));
  }
  /* タイトルに かぶせる カード（v14.46 の .keepguide と 同じ 見た目）。出した ときに その日は おしまい */
  function fbAsk(now) {
    if (!fbDue(now) || document.querySelector('.keepguide')) return null;
    const opened = !!MQ.save.getSetting('fbOpenedAt', 0);
    let box;
    const close = function () { if (box && box.parentNode) box.parentNode.removeChild(box); };
    if (MQ.text) MQ.text.pause(true);
    try {
      box = h('div', { class: 'keepguide fbask', role: 'dialog', 'aria-modal': 'true', 'data-noconv': '' }, [
        h('div', { class: 'keepguide__card' }, [
          h('p', { class: 'keepguide__kick', text: 'おうちの方へ' }),
          h('p', { class: 'keepguide__h', text: '感想フォームへのご協力をお願いします' }),
          h('p', { class: 'keepguide__p', text: opened
            ? '前にフォームを開いていただき、ありがとうございます。送信がお済みでしたら「送りました」を押してください。この案内は出なくなります。'
            : 'まなびモンスターは、使ってくださる方の声で作り直しています。お子さんの一言（「ここが好き」「ここがむずかしい」）だけでも、とても助かります。1〜2分・名前なしで送れます。' }),
          h('a', { class: 'keepguide__save fbask__go', href: fbUrl(), target: '_blank', rel: 'noopener', text: '感想フォームを開く',
            onclick: function () { MQ.sfx.unlock(); MQ.sfx.tap(); fbOpened(); close(); } }),
          h('button', { class: 'keepguide__ok fbask__sent', type: 'button', text: '送りました（もう表示しない）',
            onclick: function () { MQ.sfx.unlock(); MQ.sfx.tap(); fbSent(); close(); MQ.ui.toast('ありがとうございます'); } }),
          h('button', { class: 'fbask__later', type: 'button', text: 'きょうはあとで',
            onclick: function () { MQ.sfx.unlock(); MQ.sfx.tap(); close(); } }),
          h('p', { class: 'fbask__small', text: 'Googleのフォームが開きます。「送信」を押すまで何も送られません。' })
        ])
      ]);
    } finally { if (MQ.text) MQ.text.pause(false); }
    box.__onShow = function () { MQ.save.setSetting('fbAskDay', dayKey(now)); };
    return box;
  }

  function parent(opts) {
    opts = opts || {};
    let page = opts.page || 0;
    const last = opts.from === 'settings';   // 設定から 見た ときは さいごの ボタンが「とじる」
    function done() { MQ.sfx.tap(); if (opts.onDone) opts.onDone(); }
    function paint() {
      if (MQ.text) MQ.text.pause(true);
      try {
        const P = PAGES[page];
        const isLast = page === PAGES.length - 1;
        const dots = h('div', { class: 'phw__dots' }, PAGES.map(function (x, i) { return h('i', { class: i === page ? 'is-on' : '' }); }));
        const wrap = h('div', { class: 'pp pgd phw', 'data-noconv': '' }, [
          h('div', { class: 'pp__body' }, [
            h('div', { class: 'pgd__in' }, [
              h('div', { class: 'phw__top' }, [
                h('p', { class: 'pp-kicker', text: 'おうちの方へ　' + (page + 1) + ' / ' + PAGES.length }),
                isLast ? null : h('button', { class: 'phw__skip', type: 'button', text: last ? 'とじる' : 'とばす', onclick: done })
              ]),
              h('h1', { class: 'pgd__title', text: P.title })
            ].concat(P.body()))
          ]),
          h('div', { class: 'pgd__foot phw__foot' }, [
            page > 0 ? h('button', { class: 'phw__back', type: 'button', text: 'もどる', onclick: function () { MQ.sfx.tap(); page--; paint(); } }) : null,
            dots,
            h('button', { class: 'pgd__go phw__next', type: 'button',
              text: isLast ? (last ? 'とじる' : '設定へすすむ') : 'つぎへ',
              onclick: function () { if (isLast) { done(); return; } MQ.sfx.tap(); page++; paint(); } })
          ])
        ]);
        MQ.ui.mount('screen-start', wrap);
      } finally { if (MQ.text) MQ.text.pause(false); }
      MQ.ui.show('screen-start');
    }
    paint();
  }

  /* ===================== ② 子どもむけ ===================== */
  const KID_STEPS = [
    ['ステージを えらぶ', 'ちずの ひかって いる ところを おすよ'],
    ['もんだいに こたえる', 'せいかいすると モンスターに こうげき！'],
    ['ボスを たおす', '★を あつめて つぎの ステージへ すすもう']
  ];
  let kidEl = null;
  function kid(player, force) {
    if (kidEl) return null;
    if (!force && player && player.kidTour) return null;
    MQ.save.update(function (p) { p.kidTour = true; });
    const say = 'ようこそ！ ' + KID_STEPS.map(function (s) { return s[0] + '。' + s[1] + '。'; }).join(' ');
    function close() {
      if (!kidEl) return;
      const gone = kidEl; kidEl = null;
      try { if (MQ.speech) MQ.speech.stop(); } catch (e) { /* なし */ }
      if (gone.parentNode) gone.parentNode.removeChild(gone);
    }
    const arts = [
      h('span', { class: 'kidtour__node' }, [h('i', { class: 'kidtour__nodein', text: '1' })]),
      h('span', { class: 'kidtour__pair' }, [heroArt(), mon('slime-green', 34)]),
      h('span', { class: 'kidtour__pair' }, [mon('boss-dragon', 40), h('i', { class: 'mapobi__star kidtour__star' })])
    ];
    const listen = MQ.ui.listenButton ? MQ.ui.listenButton({ text: say, lang: 'ja' }) : null;
    kidEl = h('div', { class: 'news unlockpop kidtour', onclick: function (e) { if (e.target === kidEl) close(); } }, [
      h('div', { class: 'bagcard unlockpop__card' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [
          h('h3', { class: 'bagcard__title', text: 'ようこそ！' }),
          h('div', { class: 'bagcard__subrow' }, [h('span', { class: 'bagcard__sub', text: 'あそびかたは 3つだけ' })])
        ]),
        h('div', { class: 'unlockpop__list' }, KID_STEPS.map(function (s, i) {
          return h('div', { class: 'unlockpop__row kidtour__row' }, [
            h('span', { class: 'kidtour__no', text: String(i + 1) }),
            h('span', { class: 'unlockpop__ico kidtour__ico' }, [arts[i]]),
            h('span', { class: 'unlockpop__body' }, [
              h('b', { class: 'unlockpop__t', text: s[0] }),
              h('span', { class: 'unlockpop__s', text: s[1] })
            ])
          ]);
        })),
        listen ? h('div', { class: 'kidtour__listen' }, [listen]) : null,
        h('button', { class: 'btn btn--big', type: 'button', onclick: function () { MQ.sfx.tap(); close(); } },
          [h('span', { text: 'わかった！' }), h('span', { class: 'btn__shine' })])
      ])
    ]);
    (document.getElementById('stage') || document.body).appendChild(kidEl);
    if (MQ.sfx.coin) MQ.sfx.coin();
    // 読み上げ（声が ある 端末・せっていが 入って いる とき だけ。プレイヤーを 作った タップの あと なので 鳴らせる）
    try { if (MQ.ui.canSpeak && MQ.ui.canSpeak('ja')) setTimeout(function () { if (kidEl) MQ.speech.speak(say, 'ja'); }, 500); } catch (e) { /* なし */ }
    return kidEl;
  }

  MQ.ui.howto = { parent: parent, kid: kid, PAGES: PAGES, KID_STEPS: KID_STEPS,
    fbAsk: fbAsk, fbDue: fbDue, fbOpened: fbOpened, fbSent: fbSent };
})();
