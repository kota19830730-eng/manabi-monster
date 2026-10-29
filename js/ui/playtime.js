/* ---------------------------------------------------------
   あそぶ 時間の 画面（v14.56）。ルールは js/core/playtime.js。

   ・gate()        … 地図に もどる／たたかいを はじめる 前に よぶ。止める ときは「きょうは ここまで」を 出して true
   ・afterResult() … けっか画面が 出た あとに よぶ。止める／ひとやすみ／もう すこしで おしまい の どれか
   たたかいの とちゅうでは 何も 出さない（ばつに しない）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.playtime = (function () {
  const h = MQ.util.h;
  const T = MQ.playtime;
  const REST_SEC = 180;      // ひとやすみの めやす（3分・いつでも もどれる）
  let el = null;
  let restTimer = null;

  function stageEl() { return document.getElementById('stage') || document.body; }
  function close() {
    clearInterval(restTimer); restTimer = null;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null;
  }
  function isOpen() { return !!el; }

  // 相棒（いなければ 主人公の 顔）
  function buddy(p, cls) {
    const pal = MQ.pals && MQ.pals.active(p);
    const art = pal ? MQ.enemies.node(pal.id, { size: 96 }) : MQ.ui.heroImg(p, 'ptcard__hero');
    return { node: h('div', { class: 'ptcard__art ' + (cls || '') }, [art]), name: pal ? pal.name : null };
  }

  function card(cls, kids) {
    close();
    el = h('div', { class: 'news ptpop ' + cls }, [
      h('div', { class: 'bagcard ptcard' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' })
      ].concat(kids))
    ]);
    stageEl().appendChild(el);
    return el;
  }
  // おうちの人むけの 文（学年の 変換を かけない＝h() の text は 作る ときに 変換される ので あとから 入れる）
  function adult(text) { const p = h('p', { class: 'ptcard__note', 'data-noconv': '' }); p.textContent = text; return p; }
  function title(text) { return h('div', { class: 'bagcard__head' }, [h('h3', { class: 'bagcard__title ptcard__title', text: text })]); }
  function bigBtn(text, fn) {
    return h('button', { class: 'btn btn--big', type: 'button', onclick: function () { MQ.sfx.tap(); fn(); } }, [h('span', { text: text }), h('span', { class: 'btn__shine' })]);
  }
  function stoneBtn(text, fn, cls) {
    return h('button', { class: 'btn btn--stone ' + (cls || ''), type: 'button', text: text, onclick: function () { MQ.sfx.tap(); fn(); } });
  }

  /* ---------- きょうは ここまで ---------- */
  function toTitle() {
    close();
    MQ.ui.start.render();
    MQ.ui.show('screen-start');
  }

  function showStop(why) {
    const p = MQ.save.current();
    if (!p) return null;
    const night = why === 'bed';
    const b = buddy(p, 'is-sleep');
    const s = T.settings(p);
    const line = night ? 'もう ねる じかんだよ。' : 'きょうは たくさん がんばったね！';
    const sub = night ? 'また あした あそぼうね。おやすみ！' : 'きょうは ここまで。また あした あそぼうね。';
    const parentBox = h('div', { class: 'ptcard__parent' });
    const parentLink = h('button', {
      class: 'ptcard__plink', type: 'button', text: 'おうちの人',
      onclick: function () { MQ.sfx.tap(); parentLink.style.display = 'none'; if (el) el.classList.add('is-pin'); openParent(parentBox, why); }
    });
    card('ptpop--stop' + (night ? ' ptpop--night' : ''), [
      title(night ? 'おやすみの じかん' : 'きょうは ここまで'),
      b.node,
      h('p', { class: 'ptcard__line', text: (b.name ? b.name + '「' + line + '」' : line) }),
      h('p', { class: 'ptcard__sub', text: sub }),
      h('div', { class: 'ptcard__foot' }, [bigBtn('タイトルへ', toTitle)]),
      parentLink,
      parentBox,
      adult(night
        ? '夜' + s.bedtime + '時〜朝' + T.MORNING + '時は遊べない設定です（おうちの人ページ → 設定）。'
        : '1日の遊ぶ時間（' + s.limitMin + '分）になりました（おうちの人ページ → 設定）。')
    ]);
    if (MQ.sfx.sleep) MQ.sfx.sleep();
    return el;
  }

  // おうちの人：番号を 入れて 今日だけ のばす
  function openParent(box, why) {
    box.innerHTML = '';
    if (!MQ.prize || !MQ.prize.hasPin() || !MQ.ui.prize || !MQ.ui.prize.pinPad) {
      box.appendChild(adult('時間をのばすには、おうちの人ページの「ごほうびマシン」で4けたの番号を決めてください。'));
      return;
    }
    const wrap = h('div', { class: 'pp ptpp', 'data-noconv': '' });
    wrap.appendChild(MQ.ui.prize.pinPad({
      title: 'おうちの人の番号',
      sub: 'ごほうびマシンと同じ4けたの番号です。',
      onDone: function (pin, fail) {
        if (!MQ.prize.checkPin(pin)) { if (MQ.sfx.wrong) MQ.sfx.wrong(); fail(); return; }
        wrap.innerHTML = '';
        const opts = why === 'bed'
          ? [{ t: '今夜だけ遊べるようにする', f: function (q) { T.allowTonight(q); } }]
          : T.EXTENDS.map(function (m) { return { t: '今日だけ あと' + m + '分', f: function (q) { T.extend(q, m); } }; });
        wrap.appendChild(h('div', { class: 'ptpp__opts' }, opts.map(function (o) {
          return h('button', { class: 'pp-btn pp-btn--p', type: 'button', onclick: function () {
            MQ.sfx.tap();
            T.flush();
            MQ.save.update(function (q) { o.f(q); });
            close();
            MQ.ui.toast('のばしました');
            MQ.ui.goMap();
          } }, [h('span', { text: o.t })]);
        })));
      }
    }));
    box.appendChild(wrap);
  }

  /* ---------- ひとやすみ ---------- */
  function showBreak() {
    const p = MQ.save.current();
    if (!p) return null;
    const b = buddy(p);
    const line = 'ちょっと 目を やすめよう！';
    card('ptpop--break', [
      title('ひとやすみ'),
      b.node,
      h('p', { class: 'ptcard__line', text: (b.name ? b.name + '「' + line + '」' : line) }),
      h('p', { class: 'ptcard__sub', text: 'とおくを 見たり、のびを したり しよう。' }),
      h('div', { class: 'ptcard__foot' }, [
        bigBtn('やすむ', function () { T.takeBreak(); showRest(); }),
        stoneBtn('あとで', function () { T.snooze(); close(); }, 'ptcard__later')
      ])
    ]);
    if (MQ.sfx.appear) MQ.sfx.appear();
    return el;
  }

  function mmss(s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function showRest() {
    const p = MQ.save.current();
    const b = buddy(p, 'is-stretch');
    let left = REST_SEC;
    const clock = h('span', { class: 'ptcard__clock', text: mmss(left) });
    const msg = h('p', { class: 'ptcard__sub', text: '目を とじたり、まどの 外を 見たり しよう。' });
    card('ptpop--rest', [
      title('ひとやすみ ちゅう'),
      b.node,
      h('div', { class: 'ptcard__clockrow' }, [clock]),
      msg,
      h('div', { class: 'ptcard__foot ptcard__foot--one' }, [stoneBtn('もどる', function () { T.takeBreak(); close(); })])
    ]);
    restTimer = setInterval(function () {
      left -= 1;
      clock.textContent = mmss(left);
      if (left <= 0) {
        clearInterval(restTimer); restTimer = null;
        msg.textContent = MQ.text && MQ.text.fit ? MQ.text.fit('げんき いっぱい！ また がんばろう！') : 'げんき いっぱい！';
        el && el.classList.add('is-done');
        if (MQ.sfx.coin) MQ.sfx.coin();
      }
    }, 1000);
    return el;
  }

  /* ---------- もう すこしで おしまい ---------- */
  function showSoon(p) {
    const b = buddy(p);
    const min = Math.max(1, Math.ceil(T.remain(p) / 60000));
    const line = 'あと ' + min + 'ぷんで きょうは おしまいだよ。';
    card('ptpop--soon', [
      title('もう すこしで おしまい'),
      b.node,
      h('p', { class: 'ptcard__line', text: (b.name ? b.name + '「' + line + '」' : line) }),
      h('p', { class: 'ptcard__sub', text: 'いまの たたかいが おわったら おしまいに しよう。' }),
      h('div', { class: 'ptcard__foot ptcard__foot--one' }, [bigBtn('わかった！', close)])
    ]);
    return el;
  }

  /* ---------- 入り口 ---------- */
  // 地図に もどる・たたかいを はじめる 前。止めたら true
  function gate() {
    const p = MQ.save.current();
    if (!p || !T) return false;
    const why = T.blocked(p);
    if (!why) return false;
    showStop(why);
    return true;
  }

  // けっか画面の あと（ごほうびを 見る 時間を あけてから）
  let resultTimer = null;
  function afterResult(delay) {
    clearTimeout(resultTimer);
    resultTimer = setTimeout(function () {
      const p = MQ.save.current();
      if (!p || !T || el) return;
      const rs = document.getElementById('screen-result');
      if (!rs || !rs.classList.contains('is-active')) return;     // もう つぎへ 進んで いる
      const why = T.blocked(p);
      if (why) { showStop(why); return; }
      if (T.breakDue(p)) { showBreak(); return; }
      if (T.soon(p) && !T.soonWarned(p)) {
        MQ.save.update(function (q) { T.markSoon(q); });
        showSoon(p);
      }
    }, delay == null ? 2600 : delay);
  }

  return { gate: gate, afterResult: afterResult, showStop: showStop, showBreak: showBreak, showRest: showRest, showSoon: showSoon, close: close, isOpen: isOpen };
})();
