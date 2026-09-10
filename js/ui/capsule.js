/* ---------------------------------------------------------
   カプセルマシン（v9.0）— 画面

   ルール（かくりつ・天井・かぶり）は js/core/capsule.js。ここは 見た目だけ。
   仕様は docs/v9.0カプセルマシンとメニューメモ.md。

   きまり（もどさない）
     ・画面に「ガチャ」と 書かない。**カプセルマシン**
     ・いちばん 上の わくは「**げきレア**」（むらさき）。「SR」「キラキラ」と 書かない
     ・**はずれを 作らない。** かぶりは「コインが 5まい もどって きた！」と 出す
     ・コインが 足りない ときは **ボタンを おせない**（おして から 断らない）
     ・**天井の カウンターを 引く 前から 見せる**（これが いちばん 効く ワクワク）
     ・わりあいは 決めうちで 書かず `MQ.capsule.rates(kind)` を 出す
       （そうびは「レア」の わくが ないので 95 / 0 / 5 に なる）
     ・見た目は アイテムの モーダル（`.bag` `.bagcard`）を 借りる。
       **`.newscard` は 借りない**（harness の「お知らせは 1回だけ」検査が 取りちがえる）
     ・2秒の 演出は **タップで とばせる**（毎日 引く ものなので）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.capsule = (function () {
  const h = function () { return MQ.util.h.apply(null, arguments); };

  let root = null;      // かぶせる 1枚
  let kind = 'mon';     // いま えらんで いる カプセル
  let rolling = false;  // 演出ちゅう
  let skip = null;      // タップで とばす ための 関数
  let onClose = null;
  let held = false;     // harness で 演出を 止めて 撮る ため（本番では いつも false）

  // 引いた あと 中身が 出るまで。**レアなほど 長い**（期待度）。どれも タップで とばせる
  const ROLL_MS = { n: 1500, r: 2100, sr: 2900 };
  const KIND_NAME = { mon: 'なかま', gear: 'そうび', look: 'すがた' };
  // レアさの 名前（画面に 出す ことば。v10.2 で「ふつう」→「ノーマル」＝ユーザー指定）
  const RARE_NAME = { n: 'ノーマル', r: 'レア', sr: 'げきレア' };

  /* ---- 景品の 絵。しゅるいで 出し方が ちがう ---- */
  function artOf(item, size) {
    if (item.kind === 'mon') return (MQ.ui.v3 && MQ.ui.v3.on() && MQ.ui.v3.monster(item.id, size, { ry: -16, mo: 'mo-title', flat: true })) || MQ.enemies.node(item.id, { size: size });
    if (item.kind === 'gear') {
      return h('img', { class: 'sprite capart__img', src: MQ.hero.gearSprite(item.id), alt: '' });
    }
    // すがたは 主人公の 顔に つけて 見せる（何が 変わるか 分かる ように）
    const look = lookWith(item.id);
    return h('img', { class: 'sprite capart__img', src: MQ.hero.faceSprite(look), alt: '' });
  }
  // その パーツを つけた 見た目を 作る（見本用。セーブは しない）
  function lookWith(id) {
    const p = MQ.save.current();
    const look = Object.assign({}, MQ.hero.lookOf(p));
    MQ.hero.capsuleParts().forEach(function (t) { if (t.id === id) look[t.group] = id; });
    return look;
  }

  /* ---- マシンの 絵（CSS の div だけ。画像ファイルは 使わない）---- */
  function machine() {
    return h('div', { class: 'capmc' }, [
      h('span', { class: 'capmc__dome' }),
      h('span', { class: 'capmc__ball capmc__ball--1' }),
      h('span', { class: 'capmc__ball capmc__ball--2' }),
      h('span', { class: 'capmc__ball capmc__ball--3' }),
      h('span', { class: 'capmc__body' }),
      h('span', { class: 'capmc__knob' }),
      h('span', { class: 'capmc__slot' })
    ]);
  }

  /* ---- 画面を 作りなおす ---- */
  function paint() {
    if (!root) return;
    const p = MQ.save.current();
    const pool = MQ.capsule.pool(kind);
    const prog = MQ.capsule.progress(p, kind);
    const left = MQ.capsule.pityLeft(p, kind);
    const can = MQ.capsule.canPull(p, kind);
    const rates = MQ.capsule.rates(kind);

    const body = root.querySelector('.capsule__body');
    body.textContent = '';

    // ① しゅるいの チップ
    body.appendChild(h('div', { class: 'capchips' }, MQ.capsule.KIND_IDS.map(function (k) {
      return h('button', {
        class: 'capchip' + (k === kind ? ' is-on' : ''), type: 'button',
        text: KIND_NAME[k],
        onclick: function () { if (rolling) return; MQ.sfx.tap(); kind = k; paint(); }
      });
    })));

    // ② マシン
    body.appendChild(h('div', { class: 'capstage' }, [machine()]));

    // ③ あつめぐあい
    body.appendChild(h('div', { class: 'capbar' }, [
      h('div', { class: 'capbar__fill', style: { width: (prog.total ? Math.round(prog.have / prog.total * 100) : 0) + '%' } }),
      h('span', { class: 'capbar__t', text: 'あつめた ' + prog.have + ' / ' + prog.total })
    ]));

    // ④ 天井（引く 前から 見せる）
    body.appendChild(h('p', {
      class: 'capline', text: left <= 1 ? 'つぎは かならず げきレア！' : 'あと ' + left + 'かいで げきレア かくてい'
    }));

    // ⑤ わりあい
    body.appendChild(h('p', { class: 'caprate' }, MQ.capsule.KIND_IDS && ['n', 'r', 'sr'].filter(function (r) {
      return rates[r] > 0;
    }).map(function (r) {
      return h('span', { class: 'caprate__i caprate__i--' + r, text: RARE_NAME[r] + ' ' + Math.round(rates[r] * 100) + '%' });
    })));

    // ⑥ まわす ボタン
    const btn = h('button', {
      class: 'btn capgo', type: 'button',
      /* **stopPropagation を 外さない。**
         外すと「まわす」を 押した その クリックが 下の かぶせ 1枚にも 届き、
         「タップで とばす」が すぐ 走って **演出が 1つも 見えなく なる**
         （2026-09-07 に ユーザーが「こんな演出なかったけど」で 見つけた バグ）。 */
      onclick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); pull(); }
    }, [
      h('span', { class: 'capgo__t', text: can.ok ? 'まわす' : (pool.length ? 'あと ' + (can.short || 0) + 'まい' : 'じゅんびちゅう') }),
      h('span', { class: 'capgo__c', text: 'コイン ' + MQ.capsule.COST })
    ]);
    if (!can.ok) btn.disabled = true;
    body.appendChild(btn);

    body.appendChild(h('p', { class: 'capcoins', text: 'もっている コイン ' + (p.coins || 0) }));
  }

  /* ---- 引く ---- */
  function pull() {
    if (rolling || !root) return;
    const p = MQ.save.current();
    if (!MQ.capsule.canPull(p, kind).ok) return;

    let res = null;
    MQ.save.update(function (pl) { res = MQ.capsule.pull(pl, kind); });
    if (!res || !res.ok) return;

    /* ---- 期待度で 演出を 変える（2026-09-07・ユーザー「期待度で演出ちょっと変えて下さい」）----
       レアなほど **長く・はでに**。ただし ウソは つかない
       （金の カプセル＝レア いじょう、むらさき＝げきレア。出てから 変わる のでは なく
         出る 前の 色で 分かる ＝ ここが「期待」）。

         ノーマル… ゆれる → オレンジの カプセルが ころん（ぜんぶで 1.5秒）
         レア    … ゆれが 強く なり マシンが 金色に 光る → 金の カプセル（2.1秒）
         げきレア… 光の すじ ＋ 画面が 暗く なる ため → むらさきの カプセル（2.9秒）

       どの だんかいでも **タップで すぐ 結果へ**（毎日 引く ものなので）。 */
    rolling = true;
    MQ.sfx.capsuleLever();
    const mc = root.querySelector('.capmc');
    const stage = root.querySelector('.capstage');
    const rare = res.rarity;
    const ms = ROLL_MS[rare] || ROLL_MS.n;
    if (mc) mc.classList.add('is-roll', 'is-roll--' + rare);
    if (root) root.classList.add('is-rolling', 'is-rolling--' + rare);
    const timers = [];
    const extra = [];
    timers.push(setTimeout(function () { if (rolling) MQ.sfx.capsuleRoll(); }, 260));

    // レア いじょうは とちゅうで「ためる」だんかいが 入る
    if (rare !== 'n') {
      timers.push(setTimeout(function () {
        if (!rolling || !stage) return;
        if (mc) mc.classList.add('is-hot');
        const ray = h('span', { class: 'capray capray--' + rare });
        stage.appendChild(ray); extra.push(ray);
        if (MQ.sfx.capsuleHot) MQ.sfx.capsuleHot(rare === 'sr');
      }, 900));
    }

    // カプセルが ころころ 落ちて くる（色が レアさの しるし）
    timers.push(setTimeout(function () {
      if (!rolling || !stage) return;
      if (mc) mc.classList.remove('is-roll');
      const drop = h('span', { class: 'capdrop r--' + rare });
      stage.appendChild(drop); extra.push(drop);
    }, ms - 800));

    timers.push(setTimeout(finish, ms));
    skip = function () { finish(); };

    function finish() {
      if (!rolling || held) return;   // held … harness が 演出の とちゅうで 止めて 撮る ため
      rolling = false; skip = null;
      timers.forEach(clearTimeout);
      if (root) root.classList.remove('is-rolling', 'is-rolling--' + rare);
      if (mc) mc.classList.remove('is-roll', 'is-roll--' + rare, 'is-hot');
      extra.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      if (rare === 'sr') MQ.sfx.capsuleSr(); else MQ.sfx.capsuleOpen();
      showResult(res);
    }
  }

  /* ---- 出た ものを 見せる ---- */
  function showResult(res) {
    if (!root) return;
    const it = res.item;
    const box = root.querySelector('.capsule__result');
    box.textContent = '';
    box.hidden = false;
    box.className = 'capsule__result r--' + res.rarity;

    box.appendChild(h('span', { class: 'capres__rare', text: RARE_NAME[res.rarity] }));
    box.appendChild(h('div', { class: 'capres__art' }, [artOf(it, 96)]));
    box.appendChild(h('p', { class: 'capres__name', text: it.name }));
    box.appendChild(h('p', {
      class: 'capres__msg',
      text: res.dup ? 'コインが ' + res.refund + 'まい もどって きた！'
        : (it.kind === 'mon' ? 'あたらしい なかま！' : it.kind === 'gear' ? 'あたらしい そうび！' : 'あたらしい すがた！')
    }));
    box.appendChild(h('button', {
      class: 'btn btn--cream capres__ok', type: 'button', text: 'つぎへ',
      onclick: function () { MQ.sfx.tap(); box.hidden = true; paint(); }
    }));
    paint();
  }

  /* ---- ひらく・とじる ---- */
  function open(opts) {
    opts = opts || {};
    onClose = opts.onClose || null;
    kind = opts.kind && MQ.capsule.KIND_IDS.indexOf(opts.kind) >= 0 ? opts.kind : 'mon';
    rolling = false; skip = null;
    close(true);

    const stage = document.getElementById('stage') || document.body;
    root = h('div', {
      class: 'bag capsule',
      onclick: function (e) {
        if (skip) { skip(); return; }              // 演出ちゅうは タップで とばす
        if (e.target === root) close();
      }
    }, [
      h('div', { class: 'bagcard capsule__card' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [
          h('h3', { class: 'bagcard__title', text: 'カプセルマシン' }),
          h('div', { class: 'bagcard__subrow' }, [
            h('span', { class: 'bagcard__sub', text: 'ここでしか 手に 入らない ものが 出る' })
          ])
        ]),
        h('div', { class: 'capsule__body' }),
        h('div', { class: 'capsule__result', hidden: true }),
        h('button', {
          class: 'btn btn--stone capsule__close', type: 'button', text: 'とじる',
          onclick: function () { MQ.sfx.tap(); close(); }
        })
      ])
    ]);
    stage.appendChild(root);
    paint();
  }

  function close(quiet) {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; rolling = false; skip = null;
    if (!quiet && onClose) { const f = onClose; onClose = null; f(); }
  }

  return {
    open: open, close: close,
    // テスト用
    setKind: function (k) { kind = k; paint(); },
    kind: function () { return kind; },
    isOpen: function () { return !!root; },
    isRolling: function () { return rolling; },
    pull: pull, skip: function () { if (skip) skip(); },
    hold: function () { held = true; }
  };
})();
