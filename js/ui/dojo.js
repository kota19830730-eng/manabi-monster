/* ---------------------------------------------------------
   しゅぎょうば の 画面（v13.0）

   一覧（よしゅう／いまの ステージ／ふくしゅう）→ 修行（3だん）→ 合格
     ① せつめい      … 相棒の ふきだし＋例の カード（「つぎへ」で 進む）
     ② いっしょに とく … 問題 → 「まず なにを する？」の 3たく → ヒント → 答えと 式（相棒が 見せる）
     ③ ひとりで やってみる … ヒントが 出て いる 問題に 答える。まちがえたら 声かけ → もう 1回。
                          2回めも ちがえば 答えを 見せて つぎへ。まちがい 1問まで で 合格
   ルールは js/core/dojo.js、文は js/content/lessonN.js。
   部品は バトルの もの（.card .keys .key .choice .display .hintbox）と .bagcard を 借りる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.dojo = (function () {
  const h = MQ.util.h;
  const DOTS = ['せつめい', 'いっしょに', 'ひとりで'];
  let S = null;        // いまの 修行
  let root = null;

  function player() { return MQ.save.current(); }
  function strip(s) { return String(s || '').replace(/<[^>]+>/g, ''); }

  /* =======================================================
     一覧
     ======================================================= */
  function openList() {
    const p = player();
    if (!p) return;
    S = null;
    const c = MQ.dojo.candidates(p);
    const sen = MQ.dojo.sensei(p);
    const kid = (MQ.content.activeWorld().grade || 3) <= 2;
    function row(e) {
      const st = e.stage;
      return h('button', {
        class: 'dojorow' + (e.preview ? ' dojorow--pre' : '') + (e.done ? ' dojorow--done' : ''), type: 'button',
        onclick: function () { MQ.sfx.tap(); open(st.id); }
      }, [
        h('span', { class: 'dojorow__sub', 'data-area': e.area.id, text: e.area.short || e.area.name }),
        h('span', { class: 'dojorow__body' }, [
          h('b', { class: 'dojorow__t', text: st.name }),
          h('span', { class: 'dojorow__s', text: e.preview ? (e.done ? 'しゅぎょうずみ・地図で あそべる' : 'まだ 学校で ならって いない ところ') : (e.stars ? '★' + e.stars + '　' + (e.done ? 'しゅぎょう ' + e.done + '回' : 'もう いちど たしかめる') : (e.done ? 'しゅぎょう ' + e.done + '回' : 'これから たたかう ところ')) })
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
    root = h('div', { class: 'dojo dojo--list' }, [
      topBar('しゅぎょうば', null, function () { MQ.ui.goMap(); }),
      h('div', { class: 'dojo__scroll' }, [
        h('div', { class: 'dojo__sensei dojo__sensei--list' }, [
          senseiImg(sen, 56),
          bubble(sen.name + '「' + (total ? 'どこを べんきょう する？ いっしょに やろう！' : 'ここの しゅぎょうは じゅんびちゅう。小3の 算数から できるよ。') + '」')
        ]),
        section('よしゅう', c.preview, kid ? 'まだ ならって いない ところを さきに' : 'まだ 学校で ならって いない ところを 先に'),
        section('いまの ステージ', c.now, null),
        section('ふくしゅう', c.review, null),
        total ? null : h('p', { class: 'dojosec__n', text: '（いまは 小3の 算数だけ。ほかの 教科・学年は これから）' })
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
      dot != null ? h('div', { class: 'dojo__dots' }, DOTS.map(function (t, i) {
        return h('span', { class: 'dojo__dot' + (i < dot ? ' is-done' : '') + (i === dot ? ' is-on' : '') }, [h('i'), h('span', { text: t })]);
      })) : h('div', { class: 'dojo__dots' })
    ]);
  }
  function senseiImg(sen, size) {
    return h('div', { class: 'dojo__img' }, [MQ.enemies.node(sen.id, { size: size || 64, cls: 'dojo__mon' })]);
  }
  function bubble(text, cls) {
    return h('div', { class: 'dojo__bubble' + (cls ? ' ' + cls : '') }, [h('i', { class: 'dojo__tail' }), h('div', { class: 'dojo__say', text: text })]);
  }
  function card(q, extraCls) {
    const t = strip(q.prompt);
    const size = t.length > 44 ? ' card__q--xs' : t.length > 26 ? ' card__q--s' : ' card__q--m';
    return h('div', { class: 'card dojo__card' + (extraCls ? ' ' + extraCls : '') }, [
      h('p', { class: 'card__unit', text: q.unit || '' }),
      h('div', { class: 'card__q' + size, html: q.prompt })
    ]);
  }
  function hintBox(q) {
    if (!q.hint) return null;
    return h('div', { class: 'hintbox dojo__hint' }, [h('span', { class: 'hintbox__label', text: 'ヒント' }), h('span', { text: q.hint })]);
  }
  function nextBtn(text, fn, cls) {
    return h('button', { class: 'btn ' + (cls || '') + ' dojo__next', type: 'button', text: text, onclick: function () { MQ.sfx.tap(); fn(); } });
  }
  function paint(node) {
    if (!root) return;
    const main = root.querySelector('.dojo__main');
    if (main) { main.innerHTML = ''; main.appendChild(node); main.scrollTop = 0; }
  }
  function say(text) {
    const b = root && root.querySelector('.dojo__say');
    if (b) b.textContent = text;
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
    const ses = MQ.dojo.session(stageId, p);
    if (!ses) { MQ.ui.toast('この ステージの しゅぎょうは じゅんびちゅう'); return; }
    S = { ses: ses, sen: MQ.dojo.sensei(p), misses: 0, rounds: 0, again: false };
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
    say(S.sen.name + '「' + S.ses.lesson.intro + '」');
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'dojo__hello' }, [
        h('b', { text: S.ses.stage.name }),
        h('span', { text: S.ses.preview ? 'まだ 学校で ならって いない ところ。さきに 見て おこう！' : '3つの だんで すすむよ。' }),
        h('div', { class: 'dojo__plan' }, DOTS.map(function (t, i) { return h('span', { text: (i + 1) + ' ' + t }); }))
      ]),
      nextBtn('はじめる！', function () { explain(0); })
    ]));
  }

  /* ---- ① せつめい ---- */
  function explain(i) {
    const ex = S.ses.lesson.explain;
    if (i >= ex.length) { guided(0, 'ask'); return; }
    setDot(0);
    say(S.sen.name + '「' + ex[i].say + '」');
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'card dojo__card dojo__card--ex' }, [
        h('p', { class: 'card__unit', text: 'せつめい ' + (i + 1) + ' / ' + ex.length }),
        h('div', { class: 'dojo__exbody', html: ex[i].ex || '' })
      ]),
      nextBtn(i + 1 < ex.length ? 'つぎへ' : 'いっしょに といて みよう', function () { explain(i + 1); })
    ]));
  }

  /* ---- ② いっしょに とく ---- */
  function guided(i, phase, picked) {
    const qs = S.ses.guided;
    if (i >= qs.length) { practice(0, 'ask'); return; }
    setDot(1);
    const q = qs[i];
    const les = S.ses.lesson;
    const step = q.__step === undefined ? (q.__step = MQ.dojo.stepFor(les, q)) : q.__step;
    const label = 'いっしょに ' + (i + 1) + ' / ' + qs.length;
    const kids = [card(q)];

    if (phase === 'ask' && step) {
      say(S.sen.name + '「' + step.ask + '」');
      kids.push(h('div', { class: 'dojo__steps' }, step.options.map(function (o, k) {
        return h('button', {
          class: 'dojo__step', type: 'button', text: o.text, 'data-ok': o.ok ? '1' : '0',
          onclick: function () {
            if (o.ok) { MQ.sfx.crit(); guided(i, 'step-ok', k); }
            else { MQ.sfx.miss(); guided(i, 'step-ng', k); }
          }
        });
      })));
    } else if (phase === 'step-ng' && step) {
      say(S.sen.name + '「おしい。' + step.why + '」');
      kids.push(h('div', { class: 'dojo__steps' }, step.options.map(function (o, k) {
        return h('button', { class: 'dojo__step' + (o.ok ? ' is-ok' : k === picked ? ' is-ng' : ''), type: 'button', text: o.text, disabled: true });
      })));
      kids.push(nextBtn('ヒントを 見る', function () { guided(i, 'hint'); }));
    } else if (phase === 'step-ok' && step) {
      say(S.sen.name + '「そう！ ' + step.why + '」');
      kids.push(h('div', { class: 'dojo__steps' }, step.options.map(function (o) {
        return h('button', { class: 'dojo__step' + (o.ok ? ' is-ok' : ''), type: 'button', text: o.text, disabled: true });
      })));
      kids.push(nextBtn('ヒントを 見る', function () { guided(i, 'hint'); }));
    } else if (phase === 'ask' || phase === 'hint') {
      // 手順の 3たくが ない 問題は ヒントから
      say(S.sen.name + '「' + (q.hint ? 'ヒントは これ。' : 'いっしょに 考えよう。') + '」');
      if (q.hint) kids.push(hintBox(q));
      kids.push(nextBtn('答えを 見る', function () { guided(i, 'answer'); }));
    } else {
      const ans = MQ.dojo.answerText(q);
      say(S.sen.name + '「答えは ' + ans + '。' + (q.note ? strip(q.note) : '') + '」');
      if (q.hint) kids.push(hintBox(q));
      kids.push(h('div', { class: 'dojo__answer' }, [h('span', { class: 'dojo__anslabel', text: 'こたえ' }), h('b', { text: ans })]));
      kids.push(nextBtn(i + 1 < qs.length ? 'つぎの 問題' : 'ひとりで やって みよう', function () { guided(i + 1, 'ask'); }));
    }
    paint(h('div', { class: 'dojo__pane' }, [h('p', { class: 'dojo__label', text: label })].concat(kids)));
  }

  /* ---- ③ ひとりで やってみる ---- */
  let input = '', div = null;
  function practice(i, phase, given) {
    const qs = S.ses.practice;
    if (i >= qs.length) { finishRound(); return; }
    setDot(2);
    const q = qs[i];
    const label = 'ひとりで ' + (i + 1) + ' / ' + qs.length;
    const kids = [card(q)];
    if (phase === 'ask') {
      input = ''; div = { q: '', r: '', active: 'q' };
      q.__tries = 0;
      say(S.sen.name + '「' + (i === 0 ? 'こんどは きみの ばん。ヒントを 見ながら やって みよう！' : 'つぎ！ この ちょうしで。') + '」');
    } else if (phase === 'retry') {
      say(S.sen.name + '「' + MQ.dojo.missText(S.ses.lesson, q, given) + '」');
    } else if (phase === 'ok') {
      say(S.sen.name + '「' + MQ.dojo.praise() + (q.note ? ' ' + strip(q.note) : '') + '」');
    } else if (phase === 'reveal') {
      say(S.sen.name + '「答えは ' + MQ.dojo.answerText(q) + '。' + (q.note ? strip(q.note) + ' ' : '') + 'つぎで とりかえそう！」');
    }
    if (q.hint) kids.push(hintBox(q));
    if (phase === 'ask' || phase === 'retry') {
      kids.push(inputArea(q, function (value) { submit(i, value); }));
    } else {
      kids.push(h('div', { class: 'dojo__answer' + (phase === 'ok' ? ' is-ok' : '') }, [h('span', { class: 'dojo__anslabel', text: 'こたえ' }), h('b', { text: MQ.dojo.answerText(q) })]));
      kids.push(nextBtn(i + 1 < qs.length ? 'つぎの 問題' : 'けっかを 見る', function () { practice(i + 1, 'ask'); }));
    }
    paint(h('div', { class: 'dojo__pane' }, [h('p', { class: 'dojo__label', text: label })].concat(kids)));
  }

  function submit(i, value) {
    const q = S.ses.practice[i];
    if (MQ.dojo.judge(q, value)) {
      MQ.sfx.hit();
      practice(i, 'ok');
      return;
    }
    q.__tries = (q.__tries || 0) + 1;
    MQ.sfx.miss();
    if (q.__tries >= 2) { S.misses++; practice(i, 'reveal'); }
    else practice(i, 'retry', value);
  }

  // こたえの 入れ方（バトルと 同じ 部品を 借りる）
  function inputArea(q, onSubmit) {
    if (q.type === 'choice') {
      return h('div', { class: 'choices dojo__choices' }, q.choices.map(function (t, k) {
        return h('button', { class: 'choice', type: 'button', text: t, onclick: function () { MQ.sfx.tap(); onSubmit(k); } });
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
            h('span', { class: 'display__label', text: isFrac ? (f === 'q' ? '分子（上）' : '分母（下）') : (f === 'q' ? 'こたえ' : 'あまり') }),
            h('span', { class: 'display__value', text: div[f] === '' ? '?' : div[f] })
          ]));
        });
      } else {
        displays.appendChild(h('div', { class: 'display is-on' }, [
          h('span', { class: 'display__label', text: 'こたえ' }),
          h('span', { class: 'display__value', text: input === '' ? '?' : input })
        ]));
      }
    }
    function press(label) {
      MQ.sfx.key && MQ.sfx.key();
      if (label === 'こたえる') {
        if (two) { if (div.q === '' || div.r === '') { MQ.ui.toast(isFrac ? '分子と 分母を 入れてね' : 'こたえと あまりを 入れてね'); return; } onSubmit({ q: div.q, r: div.r }); return; }
        if (input === '' || input === '.' || input === '-') { MQ.ui.toast('こたえを 入れてね'); return; }
        onSubmit(input);
        return;
      }
      if (two) {
        let v = div[div.active];
        if (label === 'けす') v = v.slice(0, -1);
        else if (v.length < 4) v += label;
        div[div.active] = v;
        if (label !== 'けす' && div.active === 'q' && v.length >= 2 && div.r === '') { /* そのまま。わくは タップで かえる */ }
      } else {
        if (label === 'けす') input = input.slice(0, -1);
        else if (label === '.') { if (input.indexOf('.') < 0 && input !== '' && input.length < maxLen) input += '.'; }
        else if (label === '-') { if (input === '') input = '-'; }
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
    S.rounds++;
    if (MQ.dojo.passed(S.misses)) { done(); return; }
    // 合格 ならず → 新しい 問題で ②から（ばつは ない）
    const p = player();
    const fresh = MQ.dojo.session(S.ses.stageId, p);
    S.ses.guided = fresh.guided;
    S.ses.practice = fresh.practice;
    S.misses = 0;
    S.again = true;
    setDot(1);
    say(S.sen.name + '「おしい！ もう いちど いっしょに やろう。こんどは できるよ！」');
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'dojo__hello' }, [
        h('b', { text: 'もう いちど' }),
        h('span', { text: 'まちがえても だいじょうぶ。あたらしい 問題で もう 1回 いっしょに とこう。' })
      ]),
      nextBtn('いっしょに とく', function () { guided(0, 'ask'); })
    ]));
  }

  /* ---- 合格 ---- */
  function done() {
    let res = null;
    const stageId = S.ses.stageId;
    MQ.save.update(function (p) { res = MQ.dojo.complete(p, stageId); });
    MQ.sfx.defeat && MQ.sfx.defeat();
    const p = player();
    const found = MQ.content.findStage(stageId);
    const canFight = found && MQ.content.isUnlocked(p, found.area, found.stage);
    setDot(3);
    say(S.sen.name + '「しゅぎょう かんりょう！ ' + (S.ses.preview ? 'これで ' + S.ses.stage.name + ' が 地図で あそべるよ！' : 'ばっちり おぼえたね！') + '」');
    const lines = [h('b', { class: 'dojodone__xp', text: 'けいけんち +' + res.xp })];
    if (res.first) lines.push(h('span', { text: 'はじめての 合格！' }));
    if (res.levelUp) lines.push(h('span', { class: 'dojodone__lv', text: 'レベルアップ！ Lv.' + res.level }));
    if (res.pal && S.sen.pal) lines.push(h('span', { text: S.sen.name + ' にも けいけんち' }));
    if (res.titles && res.titles.length) lines.push(h('span', { class: 'dojodone__lv', text: 'しょうごう「' + res.titles[0].name + '」' }));
    paint(h('div', { class: 'dojo__pane' }, [
      h('div', { class: 'bagcard dojodone' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [h('h3', { class: 'bagcard__title', text: 'しゅぎょう かんりょう！' })]),
        h('div', { class: 'dojodone__body' }, [
          h('span', { class: 'dojodone__stage', text: S.ses.stage.name + (S.ses.preview ? '（よしゅう）' : '') }),
          h('div', { class: 'dojodone__lines' }, lines)
        ]),
        h('div', { class: 'dojodone__btns' }, [
          canFight ? nextBtn('たたかいに いく！', function () { MQ.ui.battle.start(stageId); }, '') : null,
          nextBtn('しゅぎょうばへ', function () { openList(); }, 'btn--cream'),
          nextBtn('ちずへ', function () { MQ.ui.goMap(); }, 'btn--stone')
        ])
      ])
    ]));
  }

  /* ---- テスト用 ---- */
  function state() { return S; }

  return { openList: openList, open: open, state: state, intro: intro, explain: explain, guided: guided, practice: practice, submit: submit, done: done };
})();
