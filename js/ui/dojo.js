/* ---------------------------------------------------------
   しゅぎょうば の 画面（v13.0・v13.1 で 全学年・全教科）

   一覧（よしゅう／いまの ステージ／ふくしゅう）→ 修行（3だん）→ 合格
     ① せつめい      … 相棒の ふきだし＋例の カード（「つぎへ」で 進む）
     ② いっしょに とく … 問題 → 「まず なにを する？」の 3たく（手書きの 指導だけ）→ ヒント → 答えと 式
     ③ ひとりで やってみる … ヒントが 出て いる 問題に 答える。まちがえたら 声かけ → もう 1回。
                          2回めも ちがえば 答えを 見せて つぎへ。まちがい 1問まで で 合格
   ルールと 画面の 文は js/core/dojo.js（MQ.dojo.text()。小1・小2は 小1の かん字だけ）、
   手書きの 指導は js/content/lessonN.js。
   部品は バトルの もの（.card .keys .key .choice .display .hintbox）と .bagcard を 借りる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.dojo = (function () {
  const h = MQ.util.h;
  let S = null;        // いまの 修行
  let root = null;
  let T = null;        // 画面の 文（学年で かわる）
  let tab = 'all';     // v14.52：一覧の 教科の タブ

  function player() { return MQ.save.current(); }
  function strip(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
  function F(s, v) { return MQ.dojo.fmt(s, v); }
  /* 「こたえは ○○。 せつめい」の ふきだし。○○と せつめいは 問題の 中身 なので raw
     （辞書を 当てると 小2いじょうで「やま」の 答えが「山」に なる） */
  function ansSay(ans, note, tail) {
    const t = String(T.ansIs).split('$');
    const out = [t[0], h('span', { text: String(ans), raw: true }), t.slice(1).join('$')];
    if (note) out.push(' ', h('span', { text: strip(note), raw: true }));
    if (tail) out.push(' ' + tail);
    return out;
  }
  /* 歴史の 写真（v14.22）。**答えの わくの すぐ 下だけ**に 出す＝
     問題を 解いて いる あいだ（ask / hint / retry）は よばない ので 答えは ばれない。 */
  function picBox(q) {
    if (!MQ.rekishi || !q || !q.pic) return null;
    const n = MQ.rekishi.node(q.pic);
    return n ? h('div', { class: 'dojo__pic' }, [n]) : null;
  }
  function pushPic(kids, q) { const b = picBox(q); if (b) kids.push(b); }

  function dots() { return ['せつめい', 'いっしょに', 'ひとりで']; }

  /* =======================================================
     一覧
     ======================================================= */
  function openList() {
    const p = player();
    if (!p) return;
    S = null;
    T = MQ.dojo.text();
    const c = MQ.dojo.candidates(p);
    const sen = MQ.dojo.sensei(p);
    function row(e) {
      const st = e.stage;
      let sub = e.preview ? (e.done ? T.rowPreDone : T.rowPre)
        : (e.stars ? '★' + e.stars + '　' + (e.done ? F(T.rowDoneN, e.done) : T.rowReview) : (e.done ? F(T.rowDoneN, e.done) : T.rowNow));
      // v14.52：さいごに しゅぎょうした 日（ふくしゅうの めやす）
      const rec = MQ.dojo.rec(p, st.id);
      if (rec && rec.at && !e.preview) {
        const days = Math.floor((Date.now() - Date.parse(rec.at)) / 86400000);
        if (!isNaN(days)) sub += '　' + (days <= 0 ? T.lastToday : F(T.lastDays, days));
      }
      return h('button', {
        class: 'dojorow' + (e.preview ? ' dojorow--pre' : '') + (e.done ? ' dojorow--done' : ''), type: 'button',
        onclick: function () { MQ.sfx.tap(); open(st.id); }
      }, [
        h('span', { class: 'dojorow__sub', 'data-area': e.area.id, text: e.area.short || e.area.name }),
        h('span', { class: 'dojorow__body' }, [
          h('b', { class: 'dojorow__t', text: st.name }),
          h('span', { class: 'dojorow__s', text: sub })
        ]),
        h('span', { class: 'dojorow__go', text: e.done ? '✓' : '▶' })
      ]);
    }
    function section(title, list, note) {
      if (!list.length) return null;
      return h('div', { class: 'dojosec' }, [
        h('h3', { class: 'dojosec__t', text: title }),
        note ? h('p', { class: 'dojosec__n', text: note }) : null
      ].concat(list.map(row)));
    }
    const total = c.preview.length + c.now.length + c.review.length;
    /* v14.52：きょうの おすすめ（とき直し・もう いちど・よしゅう）＋ 教科の タブ */
    const recs = MQ.dojo.recommend(p, c);
    function recCard(r) {
      if (r.kind === 'fix') {
        return h('button', { class: 'dojorec dojorec--fix', type: 'button', onclick: function () { MQ.sfx.tap(); openFix(); } }, [
          h('span', { class: 'dojorec__tag', text: '✎' }),
          h('span', { class: 'dojorec__body' }, [h('b', { text: T.recFix }), h('span', { text: F(T.recFixSub, r.n) })]),
          h('span', { class: 'dojorec__go', text: '▶' })
        ]);
      }
      const e = r.entry;
      const label = r.why === 'review' ? T.recReview : r.why === 'preview' ? T.recPreview : T.recNow;
      return h('button', { class: 'dojorec dojorec--' + r.why, type: 'button', onclick: function () { MQ.sfx.tap(); open(e.stage.id); } }, [
        h('span', { class: 'dojorow__sub', 'data-area': e.area.id, text: e.area.short || e.area.name }),
        h('span', { class: 'dojorec__body' }, [h('b', { text: e.stage.name }), h('span', { text: label })]),
        h('span', { class: 'dojorec__go', text: '▶' })
      ]);
    }
    const areas = [];
    [c.preview, c.now, c.review].forEach(function (l) { l.forEach(function (e) { if (areas.indexOf(e.area) < 0) areas.push(e.area); }); });
    if (tab !== 'all' && !areas.some(function (a) { return a.id === tab; })) tab = 'all';
    function inTab(l) { return tab === 'all' ? l : l.filter(function (e) { return e.area.id === tab; }); }
    const tabs = areas.length > 1 ? h('div', { class: 'dojotabs' }, [{ id: 'all', name: T.tabAll }].concat(areas.map(function (a) { return { id: a.id, name: a.short || a.name }; })).map(function (t) {
      return h('button', { class: 'dojotab' + (tab === t.id ? ' is-on' : ''), type: 'button', 'data-area': t.id, text: t.name, onclick: function () { MQ.sfx.tap(); tab = t.id; openList(); } });
    })) : null;
    root = h('div', { class: 'dojo dojo--list' }, [
      topBar('しゅぎょうば', null, function () { MQ.ui.goMap(); }),
      h('div', { class: 'dojo__scroll' }, [
        h('div', { class: 'dojo__sensei dojo__sensei--list' }, [
          senseiImg(sen, 56),
          bubble(sen.name + '「' + (total || recs.length ? T.listHello : T.listEmpty) + '」')
        ]),
        recs.length ? h('div', { class: 'dojosec dojosec--rec' }, [h('h3', { class: 'dojosec__t', text: T.recTitle })].concat(recs.map(recCard))) : null,
        tabs,
        section(T.secPreview, inTab(c.preview), T.secPreviewNote),
        section(T.secNow, inTab(c.now), null),
        section(T.secReview, inTab(c.review), null)
      ])
    ]);
    MQ.ui.mount('screen-dojo', root);
    MQ.ui.show('screen-dojo');
    MQ.bgm.play('map');
  }

  /* =======================================================
     部品
     ======================================================= */
  function topBar(title, dot, onBack) {
    return h('div', { class: 'dojo__top' }, [
      h('button', { class: 'dojo__back', type: 'button', 'aria-label': 'もどる', text: '‹', onclick: function () { MQ.sfx.tap(); onBack(); } }),
      h('div', { class: 'dojo__title' }, [h('b', { text: title })]),
      dot != null ? h('div', { class: 'dojo__dots' }, dots().map(function (t, i) {
        return h('span', { class: 'dojo__dot' + (i < dot ? ' is-done' : '') + (i === dot ? ' is-on' : '') }, [h('i'), h('span', { text: t })]);
      })) : h('div', { class: 'dojo__dots' })
    ]);
  }
  function senseiImg(sen, size) {
    return h('div', { class: 'dojo__img' }, [MQ.enemies.node(sen.id, { size: size || 64, cls: 'dojo__mon' })]);
  }
  function bubble(text) {
    return h('div', { class: 'dojo__bubble' }, [h('i', { class: 'dojo__tail' }), h('div', { class: 'dojo__say', text: text })]);
  }
  function card(q) {
    const t = strip(q.prompt);
    const size = t.length > 44 ? ' card__q--xs' : t.length > 26 ? ' card__q--s' : ' card__q--m';
    const kids = [h('p', { class: 'card__unit', text: q.unit || '', raw: true })];
    // ものがたりを 読む（v14.13）：しゅぎょうばでも 話が 見えないと 答えられない
    if (q.story) {
      kids.push(h('div', { class: 'card__story', raw: true }, [
        h('p', { class: 'card__storytx', text: q.story, raw: true })
      ]));
    }
    kids.push(h('div', { class: 'card__q' + size, html: q.prompt, raw: true }));
    return h('div', { class: 'card dojo__card' + (q.story ? ' card--story' : ''), raw: true }, kids);
  }
  /* v14.52：書いて 考える メモ欄（バトルと 同じ しくみ・ひっさんは 方眼の マスに 数字）。
     ans を わたすと ひっさんの 3だんめに 答えを 書いて 見せる（いっしょに とく の 答え）。
     同じ 問題の あいだは 同じ メモ欄を 使い まわす（まちがえて もう 1回の とき 書いた ものが 消えない） */
  function memoBox(q, ans) {
    if (!MQ.dojo.wantsMemo(q) || !MQ.ui.battle || !MQ.ui.battle.makeMemo) return null;
    if (ans == null && S && S.memo && S.memo.q === q) return S.memo.el;
    const vert = q.layout === 'vertical';
    let canvas, clear, wide;
    const el = h('div', { class: 'memo dojo__memo' + (vert ? ' is-hissan' : '') + (ans != null ? ' is-answer' : '') }, [
      h('div', { class: 'memo__q', html: q.prompt, raw: true }),
      vert ? h('div', { class: 'hissan', raw: true }) : null,
      canvas = h('canvas', { class: 'memo__canvas' }),
      ans != null ? null : h('div', { class: 'memo__btns' }, [
        wide = h('button', { class: 'memo__btn', type: 'button', text: T.memoWide }),
        clear = h('button', { class: 'memo__btn', type: 'button', text: T.memoClear })
      ]),
      ans != null ? null : h('span', { class: 'memo__hint', text: vert ? T.memoHissan : T.memoHint })
    ]);
    if (vert) el.querySelector('.hissan').innerHTML = MQ.ui.battle.hissanHtml(q, el, ans);
    if (ans != null) return el;
    const m = MQ.ui.battle.makeMemo(canvas, clear);
    wide.addEventListener('click', function () {
      MQ.sfx.tap();
      const on = el.classList.toggle('memo--wide');
      wide.textContent = on ? T.memoBack : T.memoWide;
      if (root) root.classList.toggle('is-memowide', on);
      m.resizeKeep();
    });
    requestAnimationFrame(function () { m.resizeKeep(); });
    if (S) S.memo = { q: q, el: el, m: m };
    return el;
  }

  /* ひっさん（v14.52）：数字は メモ欄の 方眼に ある ので、上の カードは 単元の 見出しだけ（タブレットで キーまで 1画面に） */
  function qHead(q) {
    if (q.layout === 'vertical' && MQ.dojo.wantsMemo(q)) return h('p', { class: 'dojo__unit', text: q.unit || '', raw: true });
    return card(q);
  }
  function hintBox(q) {
    if (!q.hint) return null;
    return h('div', { class: 'hintbox dojo__hint' }, [h('span', { class: 'hintbox__label', text: 'ヒント' }), h('span', { text: strip(q.hint), raw: true })]);
  }
  function nextBtn(text, fn, cls) {
    return h('button', { class: 'btn ' + (cls || '') + ' dojo__next', type: 'button', text: text, onclick: function () { MQ.sfx.tap(); fn(); } });
  }
  function paint(node) {
    if (!root) return;
    const main = root.querySelector('.dojo__main');
    if (main) { main.innerHTML = ''; main.appendChild(node); main.scrollTop = 0; }
  }
  // text は 文字 か [文字, 部品, …]（答え・せつめいは raw の 部品＝学年の 辞書を 当てない）
  function say(text) {
    const b = root && root.querySelector('.dojo__say');
    if (b && Array.isArray(text)) {
      b.textContent = '';
      b.appendChild(h('span', null, S ? [S.sen.name + '「'].concat(text, ['」']) : text));
    } else if (b) b.textContent = S ? S.sen.name + '「' + text + '」' : text;
    const w = root && root.querySelector('.dojo__bubble');
    if (w) { w.classList.remove('is-pop'); void w.offsetWidth; w.classList.add('is-pop'); }
  }
  function setDot(i) {
    if (!root) return;
    root.querySelectorAll('.dojo__dot').forEach(function (d, k) { d.classList.toggle('is-done', k < i); d.classList.toggle('is-on', k === i); });
  }

  /* =======================================================
     修行を はじめる
     ======================================================= */
  function open(stageId) {
    const p = player();
    T = MQ.dojo.text();
    const ses = MQ.dojo.session(stageId, p);
    if (!ses) { MQ.ui.toast(T.none); return; }
    S = { ses: ses, sen: MQ.dojo.sensei(p), misses: 0, rounds: 0 };
    root = h('div', { class: 'dojo' }, [
      topBar(ses.stage.name, 0, function () { openList(); }),
      h('div', { class: 'dojo__sensei' }, [senseiImg(S.sen, 64), bubble('')]),
      h('div', { class: 'dojo__main' })
    ]);
    MQ.ui.mount('screen-dojo', root);
    MQ.ui.show('screen-dojo');
    MQ.bgm.play('map');
    intro();
  }

  function intro() {
    setDot(0);
    say(S.ses.lesson.intro);
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'dojo__hello' }, [
        h('b', { text: S.ses.stage.name }),
        h('span', { text: S.ses.preview ? T.helloPre : T.helloPlan }),
        h('div', { class: 'dojo__plan' }, dots().map(function (t, i) { return h('span', { text: (i + 1) + ' ' + t }); }))
      ]),
      // v14.52：もう しゅぎょうした ステージは せつめいを とばして すぐ ひとりで（ふくしゅう）
      S.ses.done > 0 ? nextBtn(T.quick, function () { practice(0, 'ask'); }) : null,
      nextBtn(S.ses.done > 0 ? T.fromStart : T.start, function () { explain(0); }, S.ses.done > 0 ? 'btn--cream' : '')
    ]));
  }

  /* ---- ① せつめい ---- */
  function explain(i) {
    const ex = S.ses.lesson.explain;
    if (i >= ex.length) { guided(0, 'ask'); return; }
    setDot(0);
    say(ex[i].say);
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'card dojo__card dojo__card--ex' }, [
        h('p', { class: 'card__unit', text: T.exLabel + ' ' + (i + 1) + ' / ' + ex.length }),
        h('div', { class: 'dojo__exbody', html: (typeof ex[i].ex === 'function' ? ex[i].ex() : ex[i].ex) || '' })   // 関数＝あとから 読む ファイルの 図（v14.18）
      ]),
      nextBtn(i + 1 < ex.length ? T.next : T.toGuided, function () { explain(i + 1); })
    ]));
  }

  /* ---- ② いっしょに とく ---- */
  function guided(i, phase, picked) {
    const qs = S.ses.guided;
    if (i >= qs.length) { practice(0, 'ask'); return; }
    setDot(1);
    const q = qs[i];
    const step = q.__step === undefined ? (q.__step = MQ.dojo.stepFor(S.ses.lesson, q)) : q.__step;
    const kids = [qHead(q)];
    const vert = q.layout === 'vertical';
    function stepBtns(showResult) {
      return h('div', { class: 'dojo__steps' }, step.options.map(function (o, k) {
        if (showResult) return h('button', { class: 'dojo__step' + (o.ok ? ' is-ok' : k === picked ? ' is-ng' : ''), type: 'button', text: o.text, disabled: true });
        return h('button', {
          class: 'dojo__step', type: 'button', text: o.text, 'data-ok': o.ok ? '1' : '0',
          onclick: function () {
            if (o.ok) { MQ.sfx.correct(); guided(i, 'step-ok', k); }
            else { MQ.sfx.wrong(); guided(i, 'step-ng', k); }
          }
        });
      }));
    }

    if (phase === 'ask' && step) {
      say(step.ask);
      kids.push(stepBtns(false));
    } else if ((phase === 'step-ng' || phase === 'step-ok') && step) {
      say((phase === 'step-ok' ? T.stepOk : T.stepNg) + step.why);
      kids.push(stepBtns(true));
      kids.push(nextBtn(T.seeHint, function () { guided(i, 'hint'); }));
    } else if (phase === 'ask' || phase === 'hint') {
      // 手順の 3たくが ない 問題（自動の 指導は ぜんぶ）は ヒントから
      say(q.hint ? T.hintIs : T.think);
      if (q.hint) kids.push(hintBox(q));
      const mb = memoBox(q);
      if (mb) kids.push(mb);
      kids.push(nextBtn(T.seeAns, function () { guided(i, 'answer'); }));
    } else {
      const ans = MQ.dojo.answerText(q);
      say(ansSay(ans, q.note));
      if (q.hint) kids.push(hintBox(q));
      // ひっさんは 方眼に 答えまで 書いた 形を 見せる（v14.52）
      if (vert) { const mb = memoBox(q, ans); if (mb) kids.push(mb); }
      kids.push(h('div', { class: 'dojo__answer' }, [h('span', { class: 'dojo__anslabel', text: T.ansLabel }), h('b', { text: ans, raw: true })]));
      pushPic(kids, q);
      kids.push(nextBtn(i + 1 < qs.length ? T.nextQ : T.toPractice, function () { guided(i + 1, 'ask'); }));
    }
    paint(h('div', { class: 'dojo__pane' }, [h('p', { class: 'dojo__label', text: T.guidedLabel + ' ' + (i + 1) + ' / ' + qs.length })].concat(kids)));
  }

  /* ---- ③ ひとりで やってみる ---- */
  let input = '', div = null;
  function practice(i, phase, given) {
    const qs = S.ses.practice;
    if (i >= qs.length) { finishRound(); return; }
    setDot(2);
    const q = qs[i];
    const kids = [qHead(q)];
    if (phase === 'ask') {
      input = ''; div = { q: '', r: '', active: 'q' };
      q.__tries = 0;
      say(i === 0 ? T.yourTurn : T.goOn);
    } else if (phase === 'retry') {
      say(MQ.dojo.missText(S.ses.lesson, q, given, T));
    } else if (phase === 'ok') {
      say(q.note ? [MQ.dojo.praise(T), ' ', h('span', { text: strip(q.note), raw: true })] : MQ.dojo.praise(T));
    } else if (phase === 'reveal') {
      say(ansSay(MQ.dojo.answerText(q), q.note, T.reveal));
    }
    if (q.hint) kids.push(hintBox(q));
    if (phase === 'ask' || phase === 'retry') {
      const mb = memoBox(q);
      if (mb) kids.push(mb);
      kids.push(inputArea(q, function (value) { submit(i, value); }));
    } else {
      kids.push(h('div', { class: 'dojo__answer' + (phase === 'ok' ? ' is-ok' : '') }, [h('span', { class: 'dojo__anslabel', text: T.ansLabel }), h('b', { text: MQ.dojo.answerText(q), raw: true })]));
      pushPic(kids, q);
      kids.push(nextBtn(i + 1 < qs.length ? T.nextQ : T.seeResult, function () { practice(i + 1, 'ask'); }));
    }
    paint(h('div', { class: 'dojo__pane' }, [h('p', { class: 'dojo__label', text: T.practiceLabel + ' ' + (i + 1) + ' / ' + qs.length })].concat(kids)));
  }

  function submit(i, value) {
    const q = S.ses.practice[i];
    if (MQ.dojo.judge(q, value)) {
      MQ.sfx.correct();
      // とき直し（v14.52）：1回めで 正解 → おぼえた
      if (S.ses.fix && q.__fix && !(q.__tries || 0)) S.fixed.push(q.__fix.key);
      practice(i, 'ok');
      return;
    }
    q.__tries = (q.__tries || 0) + 1;
    MQ.sfx.wrong();
    if (q.__tries >= 2) { S.misses++; practice(i, 'reveal'); }
    else practice(i, 'retry', value);
  }

  // こたえの 入れ方（バトルと 同じ 部品を 借りる）
  function inputArea(q, onSubmit) {
    if (q.type === 'choice') {
      return h('div', { class: 'choices dojo__choices' }, q.choices.map(function (t, k) {
        return h('button', { class: 'choice', type: 'button', text: t, raw: true, onclick: function () { MQ.sfx.tap(); onSubmit(k); } });
      }));
    }
    const two = q.type === 'divrem' || q.type === 'frac';
    const isFrac = q.type === 'frac';
    const decimal = !!q.decimal;
    const maxLen = q.maxLen || (decimal ? 6 : 5);
    const wrap = h('div', { class: 'dojo__input' });
    const displays = h('div', { class: 'displays' });
    function renderDisplays() {
      displays.innerHTML = '';
      if (two) {
        ['q', 'r'].forEach(function (f) {
          displays.appendChild(h('button', {
            class: 'display display--half' + (div.active === f ? ' is-on' : ''), type: 'button',
            onclick: function () { MQ.sfx.tap(); div.active = f; renderDisplays(); }
          }, [
            h('span', { class: 'display__label', text: isFrac ? (f === 'q' ? '分子（上）' : '分母（下）') : (f === 'q' ? T.ans : T.rem) }),
            h('span', { class: 'display__value', text: div[f] === '' ? '?' : div[f] })
          ]));
        });
      } else {
        displays.appendChild(h('div', { class: 'display is-on' }, [
          h('span', { class: 'display__label', text: T.ans }),
          h('span', { class: 'display__value', text: input === '' ? '?' : input })
        ]));
      }
    }
    function press(label) {
      if (MQ.sfx.key) MQ.sfx.key();
      if (label === 'こたえる') {
        if (two) { if (div.q === '' || div.r === '') { MQ.ui.toast(isFrac ? '分子と 分母を 入れてね' : T.needDiv); return; } onSubmit({ q: div.q, r: div.r }); return; }
        if (input === '' || input === '.' || input === '-') { MQ.ui.toast(T.needAns); return; }
        onSubmit(input);
        return;
      }
      if (two) {
        let v = div[div.active];
        if (label === 'けす') v = v.slice(0, -1);
        else if (v.length < 4) v += label;
        div[div.active] = v;
      } else {
        if (label === 'けす') input = input.slice(0, -1);
        else if (label === '.') { if (input.indexOf('.') < 0 && input !== '' && input.length < maxLen) input += '.'; }
        else if (input.length < maxLen) input += label;
      }
      renderDisplays();
    }
    const labels = decimal ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'けす', 'こたえる'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'けす', '0', 'こたえる'];
    const keys = h('div', { class: 'keys' + (decimal ? ' keys--dec' : '') }, labels.map(function (label) {
      const cls = 'key' + (label === 'けす' ? ' key--del' : '') + (label === 'こたえる' ? ' key--go' + (decimal ? ' key--go3' : '') : '') + (label === '.' ? ' key--dot' : '');
      return h('button', { class: cls, type: 'button', text: label, onclick: function () { press(label); } });
    }));
    renderDisplays();
    wrap.appendChild(displays);
    wrap.appendChild(keys);
    return wrap;
  }

  /* ---- 3問 おわった ---- */
  function finishRound() {
    if (S.ses.fix) { fixDone(); return; }
    S.rounds++;
    if (MQ.dojo.passed(S.misses)) { done(); return; }
    // 合格 ならず → 新しい 問題で ②から（ばつは ない）
    const fresh = MQ.dojo.session(S.ses.stageId, player());
    if (fresh) { S.ses.guided = fresh.guided; S.ses.practice = fresh.practice; }
    S.misses = 0;
    setDot(1);
    say(T.againSay);
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'dojo__hello' }, [
        h('b', { text: T.againTitle }),
        h('span', { text: T.againText })
      ]),
      nextBtn(T.againBtn, function () { guided(0, 'ask'); })
    ]));
  }

  /* ---- 合格 ---- */
  function done() {
    let res = null;
    const stageId = S.ses.stageId;
    MQ.save.update(function (p) { res = MQ.dojo.complete(p, stageId); });
    if (MQ.sfx.defeat) MQ.sfx.defeat();
    const p = player();
    const found = MQ.content.findStage(stageId);
    const canFight = found && MQ.content.isUnlocked(p, found.area, found.stage);
    setDot(3);
    say(S.ses.preview ? F(T.doneSayPre, S.ses.stage.name) : T.doneSay);
    const lines = [h('b', { class: 'dojodone__xp', text: 'けいけんち +' + res.xp })];
    if (res.first) lines.push(h('span', { text: T.first }));
    if (res.levelUp) lines.push(h('span', { class: 'dojodone__lv', text: F(T.lvUp, res.level) }));
    if (res.pal && S.sen.pal) lines.push(h('span', { text: F(T.palXp, S.sen.name) }));
    if (res.titles && res.titles.length) lines.push(h('span', { class: 'dojodone__lv', text: F(T.title, res.titles[0].name) }));
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'bagcard dojodone' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [h('h3', { class: 'bagcard__title', text: T.doneTitle })]),
        h('div', { class: 'dojodone__body' }, [
          h('span', { class: 'dojodone__stage', text: S.ses.stage.name + (S.ses.preview ? T.preTag : '') }),
          h('div', { class: 'dojodone__lines' }, lines)
        ]),
        h('div', { class: 'dojodone__btns' }, [
          canFight ? nextBtn(T.fight, function () { MQ.ui.battle.start(stageId); }, '') : null,
          nextBtn(T.toList, function () { openList(); }, 'btn--cream'),
          nextBtn(T.toMap, function () { MQ.ui.goMap(); }, 'btn--stone')
        ])
      ])
    ]));
  }

  /* ---- まちがえた 問題の とき直し（v14.52） ---- */
  function openFix() {
    const p = player();
    T = MQ.dojo.text();
    const ses = MQ.dojo.fixSession(p);
    if (!ses) { MQ.ui.toast(T.fixNone); return; }
    S = { ses: ses, sen: MQ.dojo.sensei(p), misses: 0, rounds: 0, fixed: [] };
    root = h('div', { class: 'dojo' }, [
      topBar(ses.stage.name, null, function () { openList(); }),
      h('div', { class: 'dojo__sensei' }, [senseiImg(S.sen, 64), bubble('')]),
      h('div', { class: 'dojo__main' })
    ]);
    MQ.ui.mount('screen-dojo', root);
    MQ.ui.show('screen-dojo');
    MQ.bgm.play('map');
    say(T.fixHello);
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'dojo__hello' }, [h('b', { text: ses.stage.name }), h('span', { text: F(T.recFixSub, MQ.dojo.fixCount(p)) })]),
      nextBtn(T.start, function () { practice(0, 'ask'); })
    ]));
  }
  function fixDone() {
    let res = null;
    const keys = S.fixed.slice();
    MQ.save.update(function (p) { res = MQ.dojo.fixComplete(p, keys); });
    if (MQ.sfx.defeat) MQ.sfx.defeat();
    say(res.n ? F(T.fixDoneN, res.n) : T.againSay);
    const lines = [h('b', { class: 'dojodone__xp', text: F(T.fixDoneN, res.n) })];
    if (res.xp) lines.push(h('span', { text: 'けいけんち +' + res.xp }));
    if (res.levelUp) lines.push(h('span', { class: 'dojodone__lv', text: F(T.lvUp, res.level) }));
    if (res.left) lines.push(h('span', { text: T.fixLeft }));
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'bagcard dojodone' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [h('h3', { class: 'bagcard__title', text: T.fixDoneTitle })]),
        h('div', { class: 'dojodone__body' }, [h('div', { class: 'dojodone__lines' }, lines)]),
        h('div', { class: 'dojodone__btns' }, [
          res.left ? nextBtn(T.recFix, function () { openFix(); }, '') : null,
          nextBtn(T.toList, function () { openList(); }, 'btn--cream'),
          nextBtn(T.toMap, function () { MQ.ui.goMap(); }, 'btn--stone')
        ])
      ])
    ]));
  }

  /* ---- テスト用 ---- */
  function state() { return S; }

  return { openList: openList, open: open, openFix: openFix, state: state, intro: intro, explain: explain, guided: guided, practice: practice, submit: submit, done: done };
})();
