/* ---------------------------------------------------------
   あたらしい こと！（お知らせの 画面・v8.3）

   中身は js/content/news.js（MQ.news）。ここは 見せかただけ。

   出す ところ … タイトル →「ぼうけんの つづき」→ 地図に 行った すぐ あと
                 （MQ.ui.goMap の さいご）。**1回の 起動で 1回だけ**。
   とじかた   … ×／「あそぶ！」。とじたら もう 出ない（p.seenNews）。
   見た目     … アイテムの モーダル（.bag）と 同じ 作り
                 ＝紺の カード＋金わく＋金グラデの バナー文字＋✦。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.news = (function () {
  const h = MQ.util.h;
  let shownThisLaunch = false;   // 1回の 起動で 1回だけ
  let el = null;                 // いま 出て いる モーダル

  /* お知らせ 1つぶんの 絵。ゲームに ある 部品だけを つかう */
  function art(it, player) {
    if (it.kind === 'coin') return MQ.ui.coinNode(44);
    if (it.kind === 'hero') return h('img', { class: 'sprite newsrow__hero', src: MQ.hero.sprite(player), alt: '' });
    if (it.kind === 'item') return MQ.treasure.node(it.id, { gold: !!it.gold, size: 44 });
    /* mons：id が 配列なら 小さく よこに ならべる（進化・ごちゃまぜ）。
       grow: true の ときは 右へ 行くほど 大きく＝しんかが ひと目で わかる */
    const ids = Array.isArray(it.id) ? it.id : [it.id];
    if (ids.length === 1) return MQ.enemies.node(ids[0], { size: 46 });
    const grow = [22, 27, 33];
    return h('div', { class: 'newsrow__row' }, ids.map(function (id, i) {
      return MQ.enemies.node(id, { size: it.grow ? grow[i] || 33 : 26 });
    }));
  }

  function row(it, player) {
    return h('div', { class: 'newsrow' }, [
      h('div', { class: 'newsrow__art' }, [art(it, player)]),
      h('div', { class: 'newsrow__body' }, [
        h('span', { class: 'newsrow__t', text: it.title }),
        h('span', { class: 'newsrow__d', text: it.text })
      ])
    ]);
  }

  /* 見せる。pages＝[[お知らせ, …], …]（3つずつ） */
  function open(pages, player, onClose) {
    // 前の が のこって いたら 消すだけ（seenNews は さわらない）
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null;
    if (!pages.length) { if (onClose) onClose(); return null; }
    let page = 0;
    const big = MQ.news.big(player);

    const list = h('div', { class: 'news__list' });
    const dots = h('div', { class: 'news__dots' });
    const next = h('button', { class: 'btn btn--big news__next', type: 'button' }, [
      h('span', { class: 'news__nexttx', text: '' }),
      h('span', { class: 'btn__shine' })
    ]);

    function paint() {
      list.innerHTML = '';
      pages[page].forEach(function (it) { list.appendChild(row(it, player)); });
      dots.innerHTML = '';
      if (pages.length > 1) {
        for (let i = 0; i < pages.length; i++) dots.appendChild(h('i', { class: 'news__dot' + (i === page ? ' is-on' : '') }));
      }
      next.querySelector('.news__nexttx').textContent = (page < pages.length - 1) ? 'つぎ ▶' : 'あそぶ！';
    }

    next.addEventListener('click', function () {
      MQ.sfx.tap();
      if (page < pages.length - 1) { page++; paint(); return; }
      close();
    });

    el = h('div', { class: 'news', onclick: function (e) { if (e.target === el) close(); } }, [
      h('div', { class: 'newscard' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('button', { class: 'news__x', type: 'button', text: '×', 'aria-label': 'とじる', onclick: function () { MQ.sfx.tap(); close(); } }),
        h('div', { class: 'bagcard__head' }, [
          h('h3', { class: 'bagcard__title news__title', text: 'あたらしい こと！' }),
          h('div', { class: 'bagcard__subrow' }, [
            h('span', { class: 'bagcard__sub', text: big ? 'ひさしぶりの 大アップデート！' : 'できる ことが ふえたよ' })
          ])
        ]),
        list,
        h('div', { class: 'news__foot' }, [dots, next])
      ])
    ]);

    function close() {
      if (!el) return;
      const gone = el;
      el = null;
      if (gone.parentNode) gone.parentNode.removeChild(gone);
      MQ.save.update(function (p) { MQ.news.markSeen(p); });
      if (onClose) onClose();
    }
    MQ.ui.news.close = close;

    paint();
    (document.getElementById('stage') || document.body).appendChild(el);
    MQ.sfx.coin();
    return el;
  }

  /* 地図に 来た ときに よぶ。出す ものが なければ 何も しない */
  function maybeShow(force) {
    if (el) return null;
    if (shownThisLaunch && !force) return null;
    const p = MQ.save.current();
    if (!p || !MQ.news) return null;
    const pages = MQ.news.pages(p);
    if (!pages.length) { shownThisLaunch = true; return null; }
    shownThisLaunch = true;
    return open(pages, p);
  }

  return {
    maybeShow: maybeShow,
    open: open,
    close: function () {},          // open() の 中で 本物に 差しかわる
    isOpen: function () { return !!el; },
    reset: function () { shownThisLaunch = false; }   // テスト用
  };
})();
