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
  const KIND_NAME = { mon: 'なかま', gear: 'そうび', look: 'すがた', home: 'おうち' };

  /* v13.12 おうちの人の マシン（しゅるい 'home'）。ルールは js/core/prize.js。
     おうちの人が 景品を 入れた ときだけ 4つめの チップが 出る。
     カプセルマシンを かくして いる（capsuleOff）ときは おうちの マシンだけ。 */
  function homeOn(p) { return !!(MQ.prize && MQ.prize.hasAny(p)); }
  function kinds() {
    const p = MQ.save.current();
    const list = p && p.capsuleOff === true ? [] : MQ.capsule.KIND_IDS.slice();
    if (homeOn(p)) list.push('home');
    return list.length ? list : MQ.capsule.KIND_IDS.slice();
  }
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

  /* ---- マシンの 絵 ----
     3D が 入って いる ときは まわす 演出（capsulefx.js）と 同じ 3D の マシン（2026-09-13）。
     「りったい」を 切って いる とき・3D が 作れない ときは いままでの CSS の div */
  const MC3D = { mon: 150, home: 124 };   // 3D の マシンの 大きさ（px。おうちは 景品の 一覧が あるので 小さめ）
  function machine(variant) {
    const fx = MQ.ui.capsuleFx;
    const v3 = fx && fx.menuMachine && fx.menuMachine(variant === 'home' ? MC3D.home : MC3D.mon, variant);
    if (v3) return v3;
    return h('div', { class: 'capmc' + (variant ? ' capmc--' + variant : '') }, [
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
    if (kind === 'home') { paintHome(p); return; }
    const pool = MQ.capsule.pool(kind);
    const prog = MQ.capsule.progress(p, kind);
    const left = MQ.capsule.pityLeft(p, kind);
    const can = MQ.capsule.canPull(p, kind);
    const rates = MQ.capsule.rates(kind);

    const body = root.querySelector('.capsule__body');
    body.textContent = '';

    // ① しゅるいの チップ
    body.appendChild(chips());

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

  /* ---- しゅるいの チップ（おうちの マシンは 金の チップ）---- */
  function chips() {
    const list = kinds();
    if (list.length < 2) return h('div', { class: 'capchips capchips--one' });
    return h('div', { class: 'capchips' }, list.map(function (k) {
      return h('button', {
        class: 'capchip' + (k === 'home' ? ' capchip--home' : '') + (k === kind ? ' is-on' : ''), type: 'button',
        text: KIND_NAME[k],
        onclick: function () { if (rolling) return; MQ.sfx.tap(); kind = k; paint(); }
      });
    }));
  }

  /* ---- おうちの人の マシン（v13.12）----
     景品ごとに 絵・名前・%・「あと 〇回で かくてい」・のこり・期限を 引く 前から 見せる（うそを つかない） */
  function paintHome(p) {
    const Z = MQ.prize;
    const z = Z.ensure(p);
    const L = Z.live(p);
    const rates = Z.rates(p);
    const can = Z.canPull(p);
    const body = root.querySelector('.capsule__body');
    body.textContent = '';
    body.appendChild(chips());
    body.appendChild(h('div', { class: 'capstage capstage--home' }, [machine('home')]));
    body.appendChild(h('p', { class: 'caphome__lead', text: 'おうちの人が 入れて くれた ごほうび' }));
    body.appendChild(h('div', { class: 'caphome__list' }, L.length ? L.map(function (it) {
      const left = Z.pityLeft(it);
      const notes = [];
      if (left) notes.push(left <= 1 ? 'つぎは かならず 出る！' : 'あと ' + left + 'かいで かくてい');
      if (it.stock > 0) notes.push('のこり ' + Math.max(0, it.stock - it.got) + 'こ');
      if (it.until) { const a = it.until.split('-'); notes.push(Number(a[1]) + 'がつ ' + Number(a[2]) + 'にち まで'); }
      return h('div', { class: 'caphome__one lv--' + it.level + (left && left <= 1 ? ' is-due' : '') }, [
        MQ.ui.prize.icon(it.icon, 38),
        h('div', { class: 'caphome__txt' }, [
          h('span', { class: 'caphome__name', raw: true, text: it.name }),
          notes.length ? h('span', { class: 'caphome__note', text: notes.join('・') }) : null
        ]),
        h('span', { class: 'caphome__pct', text: Z.pctText(rates[it.id] || 0) })
      ]);
    }) : [h('p', { class: 'caphome__none', text: 'いまは じゅんびちゅう。おうちの人に きいてみてね' })]));

    const btn = h('button', {
      class: 'btn capgo capgo--home', type: 'button',
      onclick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); pull(); }   // stopPropagation を 外さない（上の まわす と 同じ）
    }, [
      h('span', { class: 'capgo__t', text: can.ok ? 'まわす' : (L.length ? 'あと ' + (can.short || 0) + 'まい' : 'じゅんびちゅう') }),
      h('span', { class: 'capgo__c', text: 'コイン ' + z.price })
    ]);
    if (!can.ok) btn.disabled = true;
    body.appendChild(btn);
    const wait = Z.waiting(p).length;
    body.appendChild(h('p', { class: 'capcoins', text: 'もっている コイン ' + (p.coins || 0) + (wait ? '　ごほうび チケット ' + wait + 'まい' : '') }));
  }

  /* ---- 引く ---- */
  function pull() {
    if (rolling || !root) return;
    const p = MQ.save.current();
    const home = kind === 'home';
    if (home ? !MQ.prize.canPull(p).ok : !MQ.capsule.canPull(p, kind).ok) return;

    let res = null;
    MQ.save.update(function (pl) { res = home ? MQ.prize.pull(pl) : MQ.capsule.pull(pl, kind); });
    if (!res || !res.ok) return;
    if (home) res.home = true;

    /* ---- 期待度で 演出を 変える（2026-09-07・ユーザー「期待度で演出ちょっと変えて下さい」）----
       レアなほど **長く・はでに**。ただし ウソは つかない
       （金の カプセル＝レア いじょう、むらさき＝げきレア。出てから 変わる のでは なく
         出る 前の 色で 分かる ＝ ここが「期待」）。

         ノーマル… ゆれる → オレンジの カプセルが ころん（ぜんぶで 1.5秒）
         レア    … ゆれが 強く なり マシンが 金色に 光る → 金の カプセル（2.1秒）
         げきレア… 光の すじ ＋ 画面が 暗く なる ため → むらさきの カプセル（2.9秒）

       どの だんかいでも **タップで すぐ 結果へ**（毎日 引く ものなので）。 */
    rolling = true;
    /* v13.14：まわす 演出は capsulefx.js（全画面の 夜空・3D の マシン・期待度の はしご・タップで 割る・登場）。
       出た ものの 中身は revealOf が 決める。うらでは いつもの 結果（showResult）も 作る（テストと 保険）。 */
    if (MQ.ui.capsuleFx) {
      skip = function () { MQ.ui.capsuleFx.skip(); };
      MQ.ui.capsuleFx.play({
        rarity: res.rarity,
        tone: home ? 'home' : null,
        reveal: revealOf(res),
        onReveal: function () { skip = null; showResult(res); },
        onNext: function () {
          rolling = false; skip = null;
          if (!root) return;
          const box = root.querySelector('.capsule__result');
          if (box) box.hidden = true;
          paint();
        }
      });
      return;
    }
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

  /* ---- 演出の ⑤ 登場に わたす 中身（v13.14）。ことばと 絵は showResult と 同じ ---- */
  function revealOf(res) {
    const it = res.item;
    if (res.home) {
      return {
        badge: res.pity ? 'かくてい！' : 'ごほうび！',
        art: function (s) { return MQ.ui.prize.icon(it.icon, s); },
        name: it.name, nameRaw: true, msg: 'もちもの に 入ったよ',
        extra: h('div', { class: 'capticket' }, [
          h('span', { class: 'capticket__t', text: 'ごほうび チケット' }),
          h('span', { class: 'capticket__s', text: 'おうちの人に 見せてね' })
        ])
      };
    }
    return {
      badge: RARE_NAME[res.rarity],
      art: function (s) { return artOf(it, s); },
      name: it.name,
      msg: res.dup ? 'コインが ' + res.refund + 'まい もどって きた！'
        : (it.kind === 'mon' ? 'あたらしい なかま！' : it.kind === 'gear' ? 'あたらしい そうび！' : 'あたらしい すがた！'),
      isNew: !res.dup, dup: !!res.dup, refund: res.refund
    };
  }

  /* ---- 出た ものを 見せる ---- */
  function showResult(res) {
    if (!root) return;
    const it = res.item;
    const box = root.querySelector('.capsule__result');
    box.textContent = '';
    box.hidden = false;
    box.className = 'capsule__result r--' + res.rarity + (res.home ? ' capsule__result--home' : '');
    if (res.home) {   // v13.12 おうちの人の マシン：ごほうび チケット
      box.appendChild(h('span', { class: 'capres__rare', text: res.pity ? 'かくてい！' : 'ごほうび！' }));
      box.appendChild(h('div', { class: 'capres__art' }, [MQ.ui.prize.icon(it.icon, 96)]));
      box.appendChild(h('p', { class: 'capres__name', raw: true, text: it.name }));
      box.appendChild(h('div', { class: 'capticket' }, [
        h('span', { class: 'capticket__t', text: 'ごほうび チケット' }),
        h('span', { class: 'capticket__s', text: 'おうちの人に 見せてね' })
      ]));
      box.appendChild(h('p', { class: 'capres__msg', text: 'もちもの に 入ったよ' }));
      box.appendChild(h('button', {
        class: 'btn btn--cream capres__ok', type: 'button', text: 'つぎへ',
        onclick: function () { MQ.sfx.tap(); box.hidden = true; paint(); }
      }));
      paint();
      return;
    }

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
    const ks = kinds();
    kind = opts.kind && ks.indexOf(opts.kind) >= 0 ? opts.kind : ks[0];
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
            h('span', { class: 'bagcard__sub', text: kinds().indexOf('home') >= 0 && kinds().length === 1 ? 'おうちの人が 入れた ごほうびが 出る' : 'ここでしか 手に 入らない ものが 出る' })
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
    /* v13.14：3D の マシンと カプセルを 先に 組んで おく（まわした 1コマめが 重く ならない ように） */
    if (MQ.ui.capsuleFx && MQ.ui.capsuleFx.warm) setTimeout(MQ.ui.capsuleFx.warm, 120);
  }

  function close(quiet) {
    if (MQ.ui.capsuleFx) MQ.ui.capsuleFx.close();
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
