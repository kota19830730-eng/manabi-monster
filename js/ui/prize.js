/* ---------------------------------------------------------
   おうちの人の マシン（v13.12）— 画面

   ルール（わりあい・かくてい・期限・チケット・番号）は js/core/prize.js。
   ここは ①景品の 絵（地図の ドックと 同じ ジオラマ仕上げの SVG）
          ②4けたの 番号の キー
          ③おうちの人ページの「ごほうびマシン」画面（parent.js が view 'prize' で よぶ）
   子どもの マシンは js/ui/capsule.js（しゅるい 'home'）。
   おうちの人ページは 大人の 文（ひらがなの きまりを 外す・parent.js が ことばの 学年を 止めて いる）。
   仕様は docs/v13.12おうちの人のマシンメモ.md。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.prize = (function () {
  const h = function () { return MQ.util.h.apply(null, arguments); };

  /* ---- ① 景品の 絵（64×64。面ごとに 平らな 3色＋足もとの かげ＝地図の ドックと 同じ）---- */
  const MAT = {
    gold: ['#ffe9a3', '#f3c545', '#b8801d'], gold2: ['#fff3c4', '#ffd447', '#d59a1b'],
    paper: ['#fffdf3', '#f6ebc9', '#d8c79a'], ink: ['#5a4a3a', '#3d3128', '#241c16'],
    red: ['#ff8a7a', '#e0463c', '#9f2b25'], wood: ['#d9a370', '#b07a48', '#7a4f2c'],
    blue: ['#7ea8ff', '#4f7de0', '#2f4f9e'], bluedk: ['#5a7ad0', '#3457b0', '#1f3776'],
    cream: ['#fffdf5', '#f4ecd8', '#d9cdb4'], glass: ['#e9f7ff', '#bfe4f7', '#8fc6e6'],
    sand: ['#ffe6a8', '#f2c76a', '#c99a3c'], pink: ['#ffc2da', '#ff8fb0', '#d65a86'],
    green: ['#a7ee7b', '#63d94f', '#3c9a33'], sky: ['#a6e9ff', '#4fd3ff', '#2a9cc9'],
    white: ['#ffffff', '#ffffff', '#e6e6e6']
  };
  function C(cx, cy, r) { return 'M' + cx + ' ' + (cy - r) + ' a' + r + ' ' + r + ' 0 1 0 0.1 0 Z'; }
  function E(cx, cy, rx, ry) { return 'M' + cx + ' ' + (cy - ry) + ' a' + rx + ' ' + ry + ' 0 1 0 0.1 0 Z'; }
  // [材料, 面（top／front／side／detail）, かたち]
  const ART = {
    gift: [
      ['red', 'top', 'M8 24 L32 13 L56 24 L32 35 Z'],
      ['red', 'front', 'M8 24 L32 35 L32 59 L8 48 Z'],
      ['red', 'side', 'M32 35 L56 24 L56 48 L32 59 Z'],
      ['gold', 'front', 'M18 28.6 L22.5 30.7 L22.5 54.7 L18 52.6 Z'],
      ['gold', 'side', 'M41.5 30.7 L46 28.6 L46 52.6 L41.5 54.7 Z'],
      ['gold2', 'top', 'M18 28.6 L41.5 17.8 L46 19.9 L22.5 30.7 Z M41.5 30.7 L18 19.9 L22.5 17.8 L46 28.6 Z'],
      ['gold2', 'front', 'M32 22 Q20 8 21 17 Q23 25 32 22 Z'],
      ['gold', 'side', 'M32 22 Q44 8 43 17 Q41 25 32 22 Z'],
      ['gold', 'detail', C(32, 22, 3)]
    ],
    game: [
      ['bluedk', 'front', 'M10 31 Q10 20 21 20 L43 20 Q54 20 54 31 L56 45 Q57 54 49 54 Q43 54 40 47 L24 47 Q21 54 15 54 Q7 54 8 45 Z'],
      ['blue', 'top', 'M13 30 Q13 23 21 23 L43 23 Q51 23 51 30 L51 32 L13 32 Z'],
      ['white', 'detail', 'M16 33 L21 33 L21 28 L25 28 L25 33 L30 33 L30 37 L25 37 L25 42 L21 42 L21 37 L16 37 Z'],
      ['red', 'front', C(43, 31, 3.2)],
      ['green', 'front', C(49, 37, 3.2)],
      ['gold2', 'front', C(37, 37, 3.2)],
      ['sky', 'front', C(43, 43, 3.2)]
    ],
    sweets: [
      ['pink', 'front', 'M15 36 L49 36 L45 58 L19 58 Z'],
      ['pink', 'side', 'M41 36 L49 36 L45 58 L40 58 Z'],
      ['white', 'detail', 'M22 36 L25 36 L25.5 58 L23 58 Z M31 36 L34 36 L33.6 58 L31.2 58 Z M40 36 L43 36 L41.5 58 L39 58 Z'],
      ['cream', 'front', 'M12 37 Q10 27 20 25 Q22 14 32 14 Q42 14 44 25 Q54 27 52 37 Z'],
      ['cream', 'top', 'M17 27 Q23 22 28 24 Q30 17 36 18 Q34 22 34 26 Q26 24 17 30 Z'],
      ['red', 'front', C(33, 11, 5)],
      ['white', 'detail', C(31.5, 9, 1.4)],
      ['green', 'detail', 'M34 6 Q38 2 42 3 L41 5 Q38 4 35 7 Z']
    ],
    outing: [
      ['red', 'front', 'M6 40 L11 31 Q13 27 18 27 L40 27 Q45 27 48 31 L54 36 Q59 37 59 42 L59 49 L6 49 Z'],
      ['red', 'top', 'M11 31 Q13 27 18 27 L40 27 Q45 27 48 31 Z'],
      ['glass', 'front', 'M16 31 L29 31 L29 37 L13 37 Z M33 31 L41 31 Q44 31 46 34 L48 37 L33 37 Z'],
      ['gold2', 'detail', 'M54 40 L59 40 L59 44 L55 44 Z'],
      ['ink', 'front', C(19, 49, 6.5)],
      ['ink', 'front', C(46, 49, 6.5)],
      ['white', 'detail', C(19, 49, 2.5)],
      ['white', 'detail', C(46, 49, 2.5)]
    ],
    time: [
      ['gold', 'side', 'M16 10 Q18 4 26 6 L22 14 Z M48 10 Q46 4 38 6 L42 14 Z'],
      ['gold', 'side', C(32, 35, 22)],
      ['gold2', 'front', C(32, 34, 21)],
      ['paper', 'front', C(32, 34, 16.5)],
      ['ink', 'detail', 'M31 21 L33 21 L33 35 L31 35 Z'],
      ['red', 'detail', 'M32 33 L43 29 L43.8 31.2 L33 35.6 Z'],
      ['ink', 'detail', C(32, 34, 2.4)],
      ['gold', 'front', 'M17 53 L22 50 L24 53 L19 57 Z M47 53 L42 50 L40 53 L45 57 Z']
    ],
    book: [
      ['cream', 'side', 'M50 12 L56 16 L56 58 L50 54 Z'],
      ['cream', 'front', 'M16 54 L50 54 L56 58 L22 58 Z'],
      ['bluedk', 'side', 'M10 12 L16 8 L16 54 L10 50 Z'],
      ['blue', 'top', 'M10 12 L16 8 L50 8 L44 12 Z'],
      ['blue', 'front', 'M10 12 L44 12 Q50 12 50 18 L50 54 L10 54 Z'],
      ['bluedk', 'detail', 'M10 12 L17 12 L17 54 L10 54 Z'],
      ['paper', 'detail', 'M22 22 L42 22 L42 25 L22 25 Z M22 30 L42 30 L42 33 L22 33 Z M22 38 L36 38 L36 41 L22 41 Z'],
      ['red', 'detail', 'M36 12 L44 12 L44 32 L40 28 L36 32 Z']
    ],
    toy: [
      ['wood', 'side', C(16, 16, 8)],
      ['wood', 'side', C(48, 16, 8)],
      ['sand', 'detail', C(16, 16, 4)],
      ['sand', 'detail', C(48, 16, 4)],
      ['wood', 'front', E(32, 34, 21, 20)],
      ['wood', 'top', 'M14 28 Q18 16 32 15 Q42 15 48 22 Q38 19 30 21 Q20 23 14 32 Z'],
      ['sand', 'front', E(32, 42, 10, 8)],
      ['ink', 'detail', C(24, 31, 2.6)],
      ['ink', 'detail', C(40, 31, 2.6)],
      ['ink', 'detail', 'M28.5 38 Q32 35 35.5 38 Q32 42 28.5 38 Z'],
      ['red', 'front', 'M22 52 L32 49 L42 52 L42 58 L32 55 L22 58 Z']
    ],
    star: [
      ['gold', 'side', 'M32 5 L39.6 22.6 L59 23.8 L44.2 36.4 L49 55.4 L32 45 L15 55.4 L19.8 36.4 L5 23.8 L24.4 22.6 Z'],
      ['gold2', 'top', 'M32 5 L32 45 L15 55.4 L19.8 36.4 L5 23.8 L24.4 22.6 Z'],
      ['gold2', 'front', 'M32 5 L39.6 22.6 L59 23.8 L32 30 Z'],
      ['white', 'detail', 'M24 18 L27 12 L28.5 14 L25.6 20 Z']
    ]
  };
  function svg(id, size) {
    const shapes = ART[id] || ART.gift;
    const body = shapes.map(function (s) {
      const t = MAT[s[0]];
      const fill = s[1] === 'top' ? t[0] : s[1] === 'side' ? t[2] : t[1];
      const edge = s[1] === 'top' ? ' stroke="rgba(255,255,255,.35)" stroke-width=".8" stroke-linejoin="round"' : '';
      return '<path d="' + s[2] + '" fill="' + fill + '"' + edge + '/>';
    }).join('');
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false"><ellipse cx="34" cy="60" rx="22" ry="3.6" fill="rgba(10,20,40,.26)"/>' + body + '</svg>';
  }
  function icon(id, size) {
    const el = document.createElement('span');
    el.className = 'przico';
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.innerHTML = svg(id, size);
    return el;
  }

  /* ---- ② 4けたの 番号の キー（おうちの人ページ・明るい 画面）----
     opts: { title, sub, onDone(pin, fail), foot }。4つ おしたら onDone。fail() で ゆらして からに する */
  function pinPad(opts) {
    let v = '';
    const dots = h('div', { class: 'przpin__dots' }, [0, 1, 2, 3].map(function () { return h('i'); }));
    const wrap = h('div', { class: 'pp-card pp-pad przpin' }, [
      h('p', { class: 'przpin__t', text: opts.title }),
      opts.sub ? h('p', { class: 'pp-muted pp-small przpin__s', text: opts.sub }) : null,
      dots
    ]);
    function paint() { dots.querySelectorAll('i').forEach(function (d, i) { d.classList.toggle('is-on', i < v.length); }); }
    function fail() {
      v = ''; paint();
      wrap.classList.remove('is-bad'); void wrap.offsetWidth; wrap.classList.add('is-bad');
    }
    function press(k) {
      if (k === 'del') { v = v.slice(0, -1); paint(); return; }
      if (v.length >= 4) return;
      v += k; paint();
      if (v.length === 4) { const pin = v; setTimeout(function () { opts.onDone(pin, fail); }, 120); }
    }
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    wrap.appendChild(h('div', { class: 'przpin__keys' }, keys.map(function (k) {
      if (!k) return h('span');
      return h('button', {
        class: 'przpin__k' + (k === 'del' ? ' przpin__k--del' : ''), type: 'button', text: k === 'del' ? '消す' : k,
        'aria-label': k === 'del' ? '1文字消す' : k,
        onclick: function () { MQ.sfx.tap(); press(k); }
      });
    })));
    if (opts.foot) wrap.appendChild(opts.foot);
    return wrap;
  }

  /* ---- ③ おうちの人ページの「ごほうびマシン」画面 ---- */
  let unlocked = false;       // 番号を 入れた あと（おうちの人ページを 出ると 鍵が かかる）
  let stage = 'pin';          // pin／new1／new2／forgot／edit
  let firstPin = '';
  let editId = null;          // 直して いる 景品（'new'＝あたらしく 足す）
  let draft = null;           // 書きかけ
  let untilMode = 'none';     // なし／week／month／date
  function lock() { unlocked = false; stage = 'pin'; firstPin = ''; editId = null; draft = null; }

  const STOCK_TEXT = { 1: '1回だけ', 2: '2回', 3: '3回', 5: '5回', 0: '何回でも' };
  function pityText(n) { return n ? n + '回' : 'なし'; }
  function mdText(ymd) { if (!ymd) return ''; const a = ymd.split('-'); return Number(a[1]) + '月' + Number(a[2]) + '日'; }
  function fmtAt(iso) { const d = new Date(iso); return isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '/' + d.getDate(); }

  function btn(text, cls, onclick) {
    return h('button', { class: 'pp-btn ' + (cls || ''), type: 'button', onclick: function () { MQ.sfx.tap(); onclick(); } }, [h('span', { text: text })]);
  }
  function seg(list, cur, onPick) {
    return h('div', { class: 'pp-segrow' }, list.map(function (x) {
      return h('button', {
        class: 'pp-seg' + (x.v === cur ? ' is-on' : ''), type: 'button', text: x.t,
        onclick: function () { MQ.sfx.tap(); onPick(x.v); }
      });
    }));
  }
  function sec(title, right) {
    return h('div', { class: 'pp-sec' }, [h('h2', { class: 'pp-h', text: title }), right ? h('span', { class: 'pp-muted pp-small', text: right }) : null]);
  }

  /* 1日に たまる コインの 目安（js/core/battle.js・missions.js・streak.js を 読んで 数えた）
     1回の たたかい：たからばこ 1・中ボス 1・ボス 1・★3で ＋1（ほかに マント・フィーバー・ゴールデンスライム）
     ミッション：1日 さいだい 5まい（フィーバーの ときは 6）・つづけた日：3〜7日めに 1〜3まい */
  const COIN_HINT = '目安：1回のたたかいで3〜5枚、ミッションで1日最大5枚。1日3回たたかう子で15〜20枚くらいたまります。';

  function view(p, api) {
    const P = MQ.prize;
    const kids = [];
    kids.push(h('header', { class: 'pp-head' }, [
      h('div', { class: 'pp-head__row' }, [api.backLink('レポートにもどる', function () { lock(); api.open('home'); })]),
      h('span', { class: 'pp-kicker', text: 'ごほうびマシン' }),
      h('div', { class: 'pp-head__name' }, [
        h('span', { class: 'pp-title', text: p.name + ' さん' }),
        h('span', { class: 'pp-muted', text: 'おうちの人が決める本物のごほうび' })
      ])
    ]));
    const main = [];

    if (!unlocked) {
      main.push(lockedView(api));
    } else if (stage === 'chg1' || stage === 'chg2') {
      main.push(changeView(api));
    } else {
      P.ensure(p);
      editorView(p, api).forEach(function (g) { main.push(g); });
    }
    kids.push(h('div', { class: 'pp-main' }, main));
    return kids;
  }
  /* 見出し＋中身を 1つの かたまりに（pp-main の gap で 間が あく） */
  function group(title, right, body) {
    return h('section', { class: 'pp-section' }, [title ? sec(title, right) : null].concat(body));
  }

  /* 番号の 画面（はじめて／ふだん／わすれた） */
  function lockedView(api) {
    const P = MQ.prize;
    if (!P.hasPin()) {
      if (stage !== 'new2') stage = 'new1';
      const first = stage === 'new1';
      return h('section', { class: 'pp-section' }, [
        intro(),
        pinPad({
          title: first ? '4けたの番号を決めてください' : 'もう一度、同じ番号を入れてください',
          sub: '景品と確率の設定を開くときに使います。お子さんに見られないように入れてください。',
          onDone: function (pin, fail) {
            if (first) { firstPin = pin; stage = 'new2'; api.render(); return; }
            if (pin !== firstPin) { firstPin = ''; stage = 'new1'; MQ.ui.toast('番号がちがいました。もう一度はじめから'); api.render(); return; }
            P.setPin(pin); unlocked = true; stage = 'edit'; firstPin = '';
            MQ.ui.toast('番号を決めました');
            api.render();
          }
        })
      ]);
    }
    if (stage === 'forgot') {
      return h('section', { class: 'pp-section' }, [
        h('div', { class: 'pp-card pp-pad przforgot' }, [
          h('p', { class: 'przpin__t', text: '番号を忘れたとき' }),
          h('p', { class: 'pp-small', text: '番号は取り出せません。番号と、全員の景品の設定を消して作り直せます。' }),
          h('p', { class: 'pp-small', text: 'すでに当たったチケットは残ります。お子さんが押しても景品が消えるだけで、自分にごほうびを出すことはできません。' }),
          h('div', { class: 'przrow' }, [
            btn('やめる', 'pp-btn--s pp-btn--sm', function () { stage = 'pin'; api.render(); }),
            btn('番号と景品を消して作り直す', 'pp-btn--p pp-btn--sm przbtn--danger', function () {
              if (!window.confirm('番号と、全員のごほうびマシンの景品を消します。よろしいですか？')) return;
              MQ.prize.forgetPin(); stage = 'new1'; MQ.ui.toast('消しました。新しい番号を決めてください'); api.render();
            })
          ])
        ])
      ]);
    }
    stage = 'pin';
    return h('section', { class: 'pp-section' }, [
      pinPad({
        title: '番号を入れてください',
        sub: 'ごほうびマシンの設定には鍵がかかっています。',
        onDone: function (pin, fail) {
          if (!P.checkPin(pin)) { MQ.sfx.wrong ? MQ.sfx.wrong() : null; fail(); return; }
          unlocked = true; stage = 'edit'; api.render();
        },
        foot: h('button', { class: 'pp-link przpin__forgot', type: 'button', text: '番号を忘れた', onclick: function () { MQ.sfx.tap(); stage = 'forgot'; api.render(); } })
      })
    ]);
  }

  /* 番号を 変える（前の 番号は 新しい 番号が 決まるまで のこす） */
  function changeView(api) {
    const first = stage === 'chg1';
    return h('section', { class: 'pp-section' }, [
      pinPad({
        title: first ? '新しい4けたの番号を入れてください' : 'もう一度、新しい番号を入れてください',
        sub: '決まるまでは前の番号のままです。',
        onDone: function (pin) {
          if (first) { firstPin = pin; stage = 'chg2'; api.render(); return; }
          if (pin !== firstPin) { firstPin = ''; stage = 'chg1'; MQ.ui.toast('番号がちがいました。もう一度はじめから'); api.render(); return; }
          MQ.prize.setPin(pin); firstPin = ''; stage = 'edit';
          MQ.ui.toast('番号を変えました'); api.render();
        },
        foot: h('button', { class: 'pp-link przpin__forgot', type: 'button', text: 'やめる', onclick: function () { MQ.sfx.tap(); firstPin = ''; stage = 'edit'; api.render(); } })
      })
    ]);
  }
  /* 「番号を 忘れた」で 作り直された しるし */
  function resetNote(withAck, api) {
    const at = MQ.prize.resetAt();
    if (!at) return null;
    const d = new Date(at);
    const when = isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return h('div', { class: 'przwarn' }, [
      h('span', { text: when + 'に「番号を忘れた」から番号と景品が作り直されました。心当たりがなければ、景品とチケットをたしかめてください。' }),
      withAck ? btn('確認した', 'pp-btn--s pp-btn--sm', function () { MQ.prize.ackReset(); api.render(); }) : null
    ]);
  }

  function intro() {
    return h('div', { class: 'pp-card pp-pad przintro' }, [
      h('p', { class: 'pp-small', text: 'カプセルマシンの中に「おうちの人のマシン」が出ます。お子さんが勉強でためたコインで回すと、ここで決めた本物のごほうび（新しいゲーム・おかし・おでかけ など）が当たります。' }),
      h('p', { class: 'pp-small', text: '当たると「ごほうびチケット」がお子さんのもちものに入ります。見せてもらったら、ここで「わたした」を押してください。お金はかかりません。データは外に送りません。' })
    ]);
  }

  /* 設定（番号を 入れた あと） */
  function editorView(p, api) {
    const P = MQ.prize;
    const z = p.prize;
    const box = [];
    const warn = resetNote(true, api);
    if (warn) box.push(group(null, null, [warn]));
    box.push(group(null, null, [intro()]));

    // --- 1回の ねだん ---
    box.push(group('1回のねだん', null, [h('div', { class: 'pp-card pp-list' }, [
      h('div', { class: 'pp-line pp-line--col' }, [
        seg(P.PRICES.map(function (v) { return { v: v, t: 'コイン ' + v }; }), z.price, function (v) {
          MQ.save.update(function (pl) { MQ.prize.setPrice(pl, v); }); api.render();
        }),
        h('span', { class: 'pp-muted pp-small', text: COIN_HINT + ' いま ' + p.name + ' さんは ' + (p.coins || 0) + '枚 もっています。' })
      ])
    ])]));

    /* --- 1日に まわせる 回数（v14.31） ---
       「かんたんな問題ばかりして コインを 稼げないように したい」への ふた。
       コインの もらい方そのものは ★3 を とったステージのくり返しを 1枚に する（js/core/coins.js）。 */
    box.push(group('1日にまわせる回数', null, [h('div', { class: 'pp-card pp-list' }, [
      h('div', { class: 'pp-line pp-line--col' }, [
        seg(P.LIMITS.map(function (v) { return { v: v, t: v ? '1日 ' + v + '回まで' : '上限なし' }; }), z.limit, function (v) {
          MQ.save.update(function (pl) { MQ.prize.setLimit(pl, v); }); api.render();
        }),
        h('span', { class: 'pp-muted pp-small', text:
          'コインをたくさんためた日でも、ごほうびはこの回数までです。'
          + 'かんたんな問題をくり返して一気に稼ぐ、ということができなくなります。'
          + '今日は' + P.usedToday(p) + '回まわしています'
          + (z.limit ? '（あと' + P.leftToday(p) + '回）。' : '。')
          + 'あわせて、すでに★3を取ったステージをくり返したときは、'
          + 'もらえるコインが' + (MQ.coins ? MQ.coins.MASTERED_MAX : 1) + '枚になります'
          + '（経験値・装備・図かんはこれまでどおりです）。' })
      ])
    ])]));

    // --- 景品 ---
    const list = z.items;
    const rates = P.rates(p);
    const rows = list.map(function (it) {
      if (editId === it.id) return formView(p, api, it);
      const live = P.isLive(it);
      const bits = [live ? P.pctText(rates[it.id] || 0) + ' で出る' : it.pct + '%（いまは出ません）'];
      bits.push(it.stock ? 'のこり ' + Math.max(0, it.stock - it.got) + ' / ' + it.stock : '何回でも');
      if (it.pity) bits.push(it.pity + '回で確定（あと' + P.pityLeft(it) + '回）');
      if (it.until) bits.push(mdText(it.until) + 'まで');
      const state = P.soldOut(it) ? 'もう出ません（数に達した）' : P.expired(it) ? '期限が切れました' : '';
      return h('div', { class: 'pp-line przitem' + (live ? '' : ' is-off') }, [
        icon(it.icon, 40),
        h('div', { class: 'przitem__txt' }, [
          h('span', { class: 'przitem__name', text: it.name }),
          h('span', { class: 'pp-muted pp-tiny', text: bits.join('・') }),
          state ? h('span', { class: 'przitem__state', text: state }) : null
        ]),
        btn('直す', 'pp-btn--s pp-btn--sm', function () { startEdit(it); api.render(); })
      ]);
    });
    if (editId === 'new') rows.push(formView(p, api, null));
    if (!rows.length) rows.push(h('div', { class: 'pp-line' }, [h('span', { class: 'pp-muted pp-small', text: 'まだ景品がありません。下のボタンから入れてください（はずれは作らないので、小さなごほうびも何個か入れるのがおすすめです）。' })]));
    box.push(group('景品', list.length + ' / ' + P.MAX_ITEMS + '個', [
      h('div', { class: 'pp-card pp-list przlist' }, rows),
      editId !== 'new' && list.length < P.MAX_ITEMS ? h('div', { class: 'przrow przrow--add' }, [btn('＋ 景品を入れる', 'pp-btn--p', function () { startEdit(null); api.render(); })]) : null
    ]));

    // --- 子どもの 画面での 見え方（わりあい。合計 100%） ---
    const liveList = P.live(p);
    if (liveList.length) {
      box.push(group('お子さんの画面での確率', '合計100%（景品が消えると残りでならします）', [h('div', { class: 'pp-card pp-pad przrates' }, liveList.map(function (it) {
        const r = rates[it.id] || 0;
        return h('div', { class: 'przrate' }, [
          h('span', { class: 'przrate__n', text: it.name }),
          h('span', { class: 'przrate__bar' }, [h('i', { style: { width: Math.max(2, Math.round(r * 100)) + '%' } })]),
          h('span', { class: 'przrate__p', text: P.pctText(r) })
        ]);
      }))]));
    }

    // --- まだ わたして いない チケット ---
    const wait = P.waiting(p);
    box.push(group('まだわたしていないチケット', wait.length + '枚', [h('div', { class: 'pp-card pp-list' }, wait.length ? wait.map(function (t) {
      return h('div', { class: 'pp-line przitem' }, [
        icon(t.icon, 36),
        h('div', { class: 'przitem__txt' }, [
          h('span', { class: 'przitem__name', text: t.name }),
          h('span', { class: 'pp-muted pp-tiny', text: fmtAt(t.at) + ' に当たりました' + (t.pity ? '（回数で確定）' : '') })
        ]),
        btn('わたした', 'pp-btn--p pp-btn--sm', function () {
          MQ.save.update(function (pl) { MQ.prize.give(pl, t.id); });
          MQ.ui.toast('「' + t.name + '」をわたしたことにしました'); api.render();
        })
      ]);
    }) : [h('div', { class: 'pp-line' }, [h('span', { class: 'pp-muted pp-small', text: 'ありません。' })])])]));

    // --- これまでの 記録 ---
    const done = P.tickets(p).filter(function (t) { return t.given; }).slice(0, 10);
    if (done.length) {
      box.push(group('これまでにわたしたもの', '新しい順・10件', [h('div', { class: 'pp-card pp-list' }, done.map(function (t) {
        return h('div', { class: 'pp-line' }, [
          h('span', { class: 'pp-small', text: t.name }),
          h('span', { class: 'pp-muted pp-tiny', text: fmtAt(t.at) + ' 当たり → ' + fmtAt(t.givenAt) + ' わたした' })
        ]);
      }))]));
    }

    box.push(h('div', { class: 'przrow przrow--foot' }, [
      btn('番号を変える', 'pp-btn--s pp-btn--sm', function () { firstPin = ''; stage = 'chg1'; api.render(); }),
      btn('鍵をかけてもどる', 'pp-btn--s pp-btn--sm', function () { lock(); api.open('home'); })
    ]));
    return box;
  }

  /* 景品の 書きかけ */
  function startEdit(it) {
    const P = MQ.prize;
    editId = it ? it.id : 'new';
    draft = it ? { name: it.name, icon: it.icon, pct: it.pct, stock: it.stock, pity: it.pity, until: it.until }
      : { name: '', icon: 'gift', pct: 20, stock: 1, pity: 0, until: null };
    untilMode = !draft.until ? 'none' : draft.until === P.endOfWeek() ? 'week' : draft.until === P.endOfMonth() ? 'month' : 'date';
  }

  /* 出やすさの つまみ（v14.30）。ユーザー「ちゃんと 確率で 調整できるように」。
     % を 直に 決める。ほかの 景品は 比を たもって 自動で ならされ、合計は かならず 100%。
     **0% は 作らない**（どの 景品も かならず 当たりうる＝はずれを 作らない きまりと 同じ）。 */
  function pctBox(p, d, myId, nameInput, api) {
    const P = MQ.prize;
    const cap = P.pctCap(p, myId);
    const big = h('span', { class: 'przpct__v', text: d.pct + '%' });
    const list = h('div', { class: 'przpct__list' });
    const range = h('input', { class: 'przpct__range', type: 'range', min: String(P.MIN_PCT), max: String(cap), step: '1' });
    range.value = String(d.pct);
    function paint() {
      big.textContent = d.pct + '%';
      if (range.value !== String(d.pct)) range.value = String(d.pct);
      const name = (nameInput && nameInput.value.trim()) || 'この ごほうび';
      const rows = P.preview(p, d.pct, myId, name);
      list.textContent = '';
      rows.forEach(function (r) {
        list.appendChild(h('div', { class: 'przrate' + (r.me ? ' is-me' : '') }, [
          h('span', { class: 'przrate__n', text: r.name }),
          h('span', { class: 'przrate__bar' }, [h('i', { style: { width: Math.max(2, r.pct) + '%' } })]),
          h('span', { class: 'przrate__p', text: r.pct + '%' })
        ]));
      });
    }
    function move(v) { d.pct = Math.min(cap, Math.max(P.MIN_PCT, Math.round(v))); paint(); }
    range.addEventListener('input', function () { move(+range.value); });
    paint();
    return h('div', { class: 'przpct' }, [
      h('div', { class: 'przpct__row' }, [
        h('button', { class: 'przpct__b', type: 'button', text: '−', 'aria-label': '1% へらす', onclick: function () { MQ.sfx.tap(); move(d.pct - 1); } }),
        range,
        h('button', { class: 'przpct__b', type: 'button', text: '＋', 'aria-label': '1% ふやす', onclick: function () { MQ.sfx.tap(); move(d.pct + 1); } }),
        big
      ]),
      h('div', { class: 'pp-segrow przpct__pre' }, P.PRESETS.map(function (x) {
        return h('button', {
          class: 'pp-seg' + (d.pct === Math.min(cap, x.pct) ? ' is-on' : ''), type: 'button',
          text: x.name + ' ' + Math.min(cap, x.pct) + '%',
          onclick: function () { MQ.sfx.tap(); move(x.pct); }
        });
      })),
      h('span', { class: 'pp-muted pp-tiny', text: 'ほかの景品は比をたもって自動でならします（合計100%）。0%にはできません。' }),
      list
    ]);
  }

  function formView(p, api, it) {
    const P = MQ.prize;
    const d = draft;
    const input = h('input', { class: 'pp-input przform__name', type: 'text', maxlength: String(P.NAME_MAX), placeholder: 'れい：あたらしいゲーム', value: d.name });
    input.value = d.name;
    input.addEventListener('input', function () { d.name = input.value; });
    function set(k, v) { d.name = input.value; d[k] = v; api.render(); }
    const myId = it ? it.id : null;
    const cap = P.pctCap(p, myId);
    if (d.pct > cap) d.pct = cap;

    const dateIn = h('input', { class: 'pp-input przform__date', type: 'date', min: P.ymd(), value: d.until || '' });
    dateIn.value = d.until || '';
    dateIn.addEventListener('change', function () { d.until = dateIn.value || null; });

    const f = [
      h('span', { class: 'przform__h', text: it ? '景品を直す' : '景品を入れる' }),
      h('label', { class: 'przform__f' }, [h('span', { text: '名前（' + P.NAME_MAX + '文字まで）' }), input]),
      h('div', { class: 'przform__f' }, [
        h('span', { text: '絵' }),
        h('div', { class: 'przicons' }, P.ICONS.map(function (x) {
          return h('button', {
            class: 'przicons__b' + (d.icon === x.id ? ' is-on' : ''), type: 'button', 'aria-label': x.name,
            onclick: function () { MQ.sfx.tap(); set('icon', x.id); }
          }, [icon(x.id, 36), h('span', { text: x.name })]);
        }))
      ]),
      h('div', { class: 'przform__f' }, [
        h('span', { text: '出やすさ（この景品が当たる確率）' }),
        pctBox(p, d, myId, input, api)
      ]),
      h('div', { class: 'przform__f' }, [
        h('span', { text: '当たる数（この数だけ当たったらマシンから消えます）' }),
        seg(P.STOCKS.map(function (v) { return { v: v, t: STOCK_TEXT[v] }; }), d.stock, function (v) { set('stock', v); })
      ]),
      h('div', { class: 'przform__f' }, [
        h('span', { text: '回数で確定（この回数回して出なければ、次でかならず出ます）' }),
        seg(P.PITIES.map(function (v) { return { v: v, t: pityText(v) }; }), d.pity, function (v) { set('pity', v); })
      ]),
      h('div', { class: 'przform__f' }, [
        h('span', { text: '期限（この日を過ぎるとマシンから消えます）' }),
        seg([{ v: 'none', t: 'なし' }, { v: 'week', t: '今週（日曜まで）' }, { v: 'month', t: '今月' }, { v: 'date', t: '日付をえらぶ' }], untilMode, function (v) {
          untilMode = v;
          if (v === 'none') d.until = null;
          else if (v === 'week') d.until = P.endOfWeek();
          else if (v === 'month') d.until = P.endOfMonth();
          else if (!d.until) d.until = P.endOfMonth();
          set('until', d.until);
        }),
        untilMode === 'date' ? dateIn : (d.until ? h('span', { class: 'pp-muted pp-small', text: mdText(d.until) + 'まで' }) : null)
      ]),
      h('div', { class: 'przrow' }, [
        btn('やめる', 'pp-btn--s pp-btn--sm', function () { editId = null; draft = null; api.render(); }),
        it ? btn('消す', 'pp-btn--s pp-btn--sm przbtn--danger', function () {
          if (!window.confirm('「' + it.name + '」をマシンから消しますか？（当たったチケットは残ります）')) return;
          MQ.save.update(function (pl) { MQ.prize.remove(pl, it.id); });
          editId = null; draft = null; api.render();
        }) : null,
        btn(it ? 'この内容にする' : 'マシンに入れる', 'pp-btn--p pp-btn--sm', function () {
          d.name = input.value.trim();
          if (untilMode === 'date') d.until = dateIn.value || null;
          if (!d.name) { MQ.ui.toast('名前を入れてください'); return; }
          if (d.until && d.until < P.ymd()) { MQ.ui.toast('期限が過ぎた日になっています'); return; }
          let ok = null;
          MQ.save.update(function (pl) { ok = MQ.prize.save(pl, d, it ? it.id : null); });
          if (!ok) { MQ.ui.toast('景品は' + P.MAX_ITEMS + '個までです'); return; }
          editId = null; draft = null;
          MQ.ui.toast(it ? '直しました' : 'マシンに入れました');
          api.render();
        })
      ])
    ];
    return h('div', { class: 'pp-line pp-line--col przform' }, f);
  }

  /* ホームに おく 小さな カード（番号は 設定を ひらく ときに 聞く） */
  function homeCard(p, api) {
    const P = MQ.prize;
    const n = P.items(p).length, live = P.live(p).length, wait = P.waiting(p).length;
    const z = P.ensure(p);
    const line = n ? '景品 ' + n + '個（出るもの ' + live + '個）・1回 コイン' + z.price
      + (z.limit ? '・1日' + z.limit + '回まで' : '')   // 1日の 上限（v14.31）
      + (wait ? '・まだわたしていないチケット ' + wait + '枚' : '')
      : '本物のごほうび（新しいゲーム・おかし など）をカプセルマシンに入れられます。';
    return h('section', { class: 'pp-section', id: 'pp-prize' }, [
      h('div', { class: 'pp-sec' }, [h('h2', { class: 'pp-h', text: 'ごほうびマシン' }), h('span', { class: 'pp-muted pp-small', text: '番号で鍵がかかっています' })]),
      h('div', { class: 'pp-card pp-list' }, [
        resetNote(false) ? h('div', { class: 'pp-line' }, [resetNote(false)]) : null,
        h('div', { class: 'pp-line przhome' }, [
          icon(wait ? 'gift' : 'star', 40),
          h('span', { class: 'pp-small przhome__t' + (wait ? ' is-wait' : ''), text: line }),
          btn(n ? '開く' : '始める', 'pp-btn--p pp-btn--sm', function () { api.open('prize'); })
        ])
      ])
    ]);
  }

  return {
    icon: icon, svg: svg, ART: ART, pinPad: pinPad,
    view: view, homeCard: homeCard, lock: lock,
    // テスト用
    isUnlocked: function () { return unlocked; }, unlock: function () { unlocked = true; stage = 'edit'; }, startEdit: startEdit
  };
})();
