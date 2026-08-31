/* ---------------------------------------------------------
   図かん

   タブ： 主人公（そうび・しょうごう）／たからばこ／モンスター／
          おうちの人／せってい（きろくの ほぞん）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.dex = (function () {
  const h = MQ.util.h;
  let tab = 'hero';
  let picked = null;   // たからばこの たなで えらんだ たからもの（せつめいを 出す）

  function render(which) {
    if (which && which !== tab) picked = null;
    if (which) tab = which;
    const player = MQ.save.current();
    if (!player) { MQ.ui.start.render(); MQ.ui.show('screen-start'); return; }
    MQ.ui.syncCustom();
    // 同じ 画面を 書きなおす とき（もちものの 出し入れなど）は スクロールの 位置を のこす
    const scr = document.getElementById('screen-dex');
    const oldWrap = scr && scr.querySelector('.wrap');
    const keepTop = oldWrap && scr.classList.contains('is-active') ? oldWrap.scrollTop : 0;

    const tabs = h('div', { class: 'tabs' }, [
      ['hero', '主人公'], ['treasure', 'たからばこ'], ['mons', 'モンスター'],
      ['parent', 'おうちの人'], ['set', 'せってい']
    ].map(function (t) {
      return h('button', {
        class: 'tab' + (tab === t[0] ? ' is-on' : ''), type: 'button', text: t[1],
        onclick: function () { MQ.sfx.tap(); render(t[0]); }
      });
    }));

    let body = null;
    if (tab === 'hero') body = heroTab(player);
    else if (tab === 'treasure') body = treasureTab(player);
    else if (tab === 'mons') body = monsTab(player);
    else if (tab === 'parent') body = parentTab(player);
    else body = settingsTab(player);

    const mounted = MQ.ui.mount('screen-dex', h('div', { class: 'wrap' }, [
      MQ.ui.hud(player),
      tabs,
      body,
      h('button', {
        class: 'btn btn--big btn--stone', type: 'button', text: 'マップへ もどる',
        style: { marginTop: '18px' },
        onclick: function () { MQ.sfx.tap(); MQ.ui.goMap(); }
      })
    ]));
    const wrap = mounted && mounted.querySelector('.wrap');
    if (keepTop && wrap) wrap.scrollTop = keepTop;
  }

  /* =======================================================
     主人公（そうび・しょうごう）
     ======================================================= */
  function heroTab(player) {
    const pr = MQ.hero.progress(player.xp);
    const card = h('section', { class: 'dexcard' }, [
      MQ.ui.heroImg(player, 'dexcard__img'),
      h('div', { class: 'dexcard__body' }, [
        h('h2', { class: 'dexcard__name', text: player.name }),
        h('p', { class: 'dexcard__title', text: MQ.hero.titleName(player) }),
        h('p', { class: 'dexcard__lv', text: 'Lv.' + pr.level + '　つぎまで ' + (pr.need - pr.into) }),
        h('div', { class: 'xpbar' }, [h('div', { class: 'xpbar__fill', style: { width: Math.round(pr.ratio * 100) + '%' } })]),
        h('p', { class: 'dexcard__stats', text: 'たたかい ' + (player.battles || 0) + '回　たおした モンスター ' + (player.defeated || 0) + '体　コイン ' + (player.coins || 0) }),
        h('button', {
          class: 'btn btn--small', type: 'button', text: 'すがたを かえる',
          style: { marginTop: '8px' },
          onclick: function () { MQ.sfx.tap(); MQ.ui.look.edit(); }
        })
      ])
    ]);

    // しょうごう
    const titleGrid = h('div', { class: 'grid' }, MQ.hero.titles.map(function (t) {
      const owned = (player.titles || []).indexOf(t.id) !== -1;
      const on = player.title === t.id;
      return h('button', {
        class: 'cell' + (owned ? '' : ' is-unknown') + (on ? ' is-on' : ''), type: 'button', disabled: !owned,
        onclick: function () {
          MQ.sfx.tap();
          MQ.save.update(function (p) { p.title = t.id; });
          render();
        }
      }, [
        h('span', { class: 'cell__name', text: owned ? t.name : '？？？' }),
        h('span', { class: 'cell__tag', text: owned ? (on ? 'つけてる' : 'つける') : t.how })
      ]);
    }));

    // そうび（グレードごと）
    const gearBlocks = MQ.hero.grades.map(function (g) {
      const items = MQ.hero.gear.filter(function (x) { return x.grade === g.id; });
      const got = items.filter(function (x) { return player.gear.indexOf(x.id) !== -1; }).length;
      return h('div', {}, [
        h('h3', { class: 'label', text: g.name + ' 一式　' + got + ' / 5' + (got === 5 ? '　✓' : '') }),
        h('div', { class: 'grid' }, items.map(function (item) {
          const owned = player.gear.indexOf(item.id) !== -1;
          const on = player.equipped[item.slot] === item.id;
          return h('button', {
            class: 'cell' + (owned ? '' : ' is-unknown') + (on ? ' is-on' : ''), type: 'button', disabled: !owned,
            onclick: function () {
              MQ.sfx.tap();
              MQ.save.update(function (p) { p.equipped[item.slot] = on ? null : item.id; });
              render();
            }
          }, [
            h('img', { class: 'sprite cell__img', src: owned ? MQ.hero.gearSprite(item.id) : MQ.hero.gearShadow(item.id), alt: '' }),
            h('span', { class: 'cell__name', text: owned ? item.name : '？？？' }),
            h('span', { class: 'cell__tag', text: owned ? (on ? 'そうび中' : 'そうびする') : (g.id === 'densetsu' ? 'かけら／ラスボス' : '★2つで もらえる') })
          ]);
        }))
      ]);
    });

    return h('div', {}, [
      card,
      h('h2', { class: 'label', text: 'しょうごう（すきなものを えらべる）' }),
      titleGrid,
      h('h2', { class: 'label', text: 'そうび（けん・たて・かぶと・よろい・マント × 4しゅるい）' })
    ].concat(gearBlocks));
  }

  /* 見出し ＋ あつめぐあいの バー ＋ かず */
  function dexHead(title, have, total, chip) {
    const kids = [
      h('h2', { class: 'dexhead__t', text: title }),
      h('div', { class: 'dexbar' }, [h('i', { style: { width: Math.round(have / Math.max(1, total) * 100) + '%' } })]),
      h('span', { class: 'dexhead__n' }, [h('b', { text: String(have) }), h('span', { text: ' / ' + total })])
    ];
    if (chip) kids.push(h('span', { class: 'dexhead__chip', text: chip }));
    return h('div', { class: 'dexhead' }, kids);
  }

  /* =======================================================
     たからばこ
     ======================================================= */
  /* たからものは たたかいで 使える どうぐ（v2.0）。
       上：もちもの 3つ（たたかいに もっていく）
       下：たからものの たな。タップすると 下に せつめい（わざ・効果）と
           「もっていく／はずす」が 出る（画面の 下に はりつく） */
  function treasureTab(player) {
    const owned = MQ.treasure.countOwned(player);
    const gold = MQ.treasure.countGold(player);
    const bag = player.bag || [];
    const MAX = MQ.save.BAG_MAX;

    // ---- もちもの（インベントリ風：番号チップ＋種類の 色で 光る 台座） ----
    const slots = [];
    for (let i = 0; i < MAX; i++) {
      const it = bag[i] ? MQ.treasure.item(player, bag[i]) : null;
      if (it) {
        slots.push(h('button', {
          class: 'invslot k--' + it.kind, type: 'button',
          onclick: function () { MQ.sfx.tap(); picked = it.id; render(); }
        }, [
          h('span', { class: 'invslot__no', text: String(i + 1) }),
          h('div', { class: 'invslot__art' }, [MQ.treasure.node(it.id, { gold: it.gold, size: 48 })]),
          h('span', { class: 'invslot__pw', text: it.powerName }),
          h('span', { class: 'invslot__name', text: it.short })
        ]));
      } else {
        slots.push(h('div', { class: 'invslot invslot--empty' }, [
          h('span', { class: 'invslot__no', text: String(i + 1) }),
          h('span', { class: 'invslot__plus' }),
          h('span', { class: 'invslot__name', text: '下から えらぶ' })
        ]));
      }
    }
    const inv = h('div', { class: 'inv' }, [
      h('div', { class: 'inv__head' }, [
        h('span', { class: 'inv__t', text: 'もちもの' }),
        h('span', { class: 'inv__sub', text: 'たたかいに もっていく アイテム' }),
        h('span', { class: 'inv__n', text: bag.length + ' / ' + MAX })
      ]),
      h('div', { class: 'inv__slots' }, slots)
    ]);

    // ---- えらんだ たからものの せつめい（種類の 色の 帯＋効果の チップ） ----
    let panel = null;
    if (picked && MQ.treasure.get(picked)) {
      const t = MQ.treasure.get(picked);
      const pw = MQ.treasure.powerOf(picked);
      const it = MQ.treasure.item(player, picked);
      const found = MQ.content.findStage(t.stage);
      const inBag = bag.indexOf(picked) !== -1;
      const close = function () { MQ.sfx.tap(); picked = null; render(); };
      const btns = [];
      if (it) {
        btns.push(h('button', {
          class: 'btn btn--small' + (inBag ? ' btn--stone' : ''), type: 'button',
          onclick: function () {
            MQ.sfx.tap();
            if (inBag) {
              MQ.save.update(function (p) { p.bag = (p.bag || []).filter(function (x) { return x !== picked; }); });
            } else if (bag.length >= MAX) {
              MQ.ui.toast('もちものは ' + MAX + 'つまで。はずしてから えらんでね');
              return;
            } else {
              MQ.save.update(function (p) { if (!Array.isArray(p.bag)) p.bag = []; p.bag.push(picked); });
              MQ.sfx.item(it.kind);
            }
            render();
          }
        }, [h('span', { text: inBag ? 'はずす' : 'もっていく' }), inBag ? null : h('span', { class: 'btn__shine' })]));
      }
      const chips = it ? it.chips : pw.chips(pw.val[0]);
      panel = h('div', { class: 'itempanel k--' + pw.kind + (it && it.gold ? ' is-gold' : '') }, [
        h('div', { class: 'itempanel__band' }, [
          h('span', { class: 'itempanel__kind', text: MQ.treasure.kindName[pw.kind] }),
          h('h3', { class: 'itempanel__pw', text: pw.name }),
          h('button', { class: 'itempanel__x', type: 'button', text: '×', 'aria-label': 'とじる', onclick: close })
        ]),
        h('div', { class: 'itempanel__main' }, [
          h('div', { class: 'itempanel__art' }, [it ? MQ.treasure.node(picked, { gold: it.gold, size: 60 }) : MQ.treasure.shadowNode(picked, { size: 60 })]),
          h('div', { class: 'itempanel__body' }, [
            h('h4', { class: 'itempanel__name' }, [
              h('span', { text: it ? t.name : '？？？' }),
              it && it.gold ? h('span', { class: 'itempanel__spark' }) : null
            ]),
            h('div', { class: 'itempanel__chips' }, chips.map(function (c) { return h('span', { class: 'itempanel__chip', text: c }); })),
            h('p', { class: 'itempanel__sub', text: it
              ? (it.gold ? 'ぴかぴか：効果アップ！' : '★3で クリアすると ぴかぴかに なって 効果アップ')
              : (found ? found.stage.name + ' の ボスが おとす' : '') })
          ]),
          btns.length ? h('div', { class: 'itempanel__btns' }, btns) : null
        ])
      ]);
    }

    // いま あそんでいる がくねんの たからものだけ ならべる（v2.2）
    const mine = MQ.treasure.listFor(MQ.content.activeWorld());
    const cells = mine.map(function (t) {
      const lv = (player.treasure && player.treasure[t.id]) || 0;
      const pw = MQ.treasure.powerOf(t.id);
      const found = MQ.content.findStage(t.stage);
      const stageName = found ? found.stage.name : '';
      const inBag = bag.indexOf(t.id) !== -1;
      const kids = [];
      if (lv >= 2) kids.push(h('span', { class: 'dexcell__badge badge--gold', text: 'ぴかぴか' }));
      if (lv >= 2) kids.push(h('span', { class: 'dexcell__spark', text: '✦' }));
      if (inBag) kids.push(h('span', { class: 'dexcell__bag', text: 'もちもの' }));
      kids.push(h('div', { class: 'dexcell__art' }, [
        lv ? MQ.treasure.node(t.id, { gold: lv >= 2, size: 52 }) : MQ.treasure.shadowNode(t.id, { size: 52 })
      ]));
      kids.push(h('span', { class: 'dexcell__name', text: lv ? t.name : '？？？' }));
      if (pw) kids.push(h('span', { class: 'dexcell__pw pw--' + pw.kind, text: pw.name }));
      kids.push(h('span', { class: 'dexcell__sub', text: stageName }));
      return h('div', {
        class: 'dexcell' + (lv ? (lv >= 2 ? ' is-gold' : '') : ' is-unknown') + (picked === t.id ? ' is-pick' : ''),
        onclick: function () { MQ.sfx.tap(); picked = t.id; render(); }
      }, kids);
    });

    return h('div', {}, [
      inv,
      h('p', { class: 'note', text: 'たからものは たたかいの 中で 使える アイテム。下の たなから えらんで「もっていく」を おしてね。' }),
      dexHead('たからもの', owned, mine.length, gold ? 'ぴかぴか ' + gold : ''),
      h('p', { class: 'note', text: 'ステージの ボスを たおすと 1つ もらえるよ。★3で クリアすると 金色（ぴかぴか）に なって 効果アップ！' }),
      h('div', { class: 'dexgrid dexgrid--tr' }, cells),
      h('h2', { class: 'label', text: 'きんのコイン' }),
      h('div', { class: 'reward' }, [
        MQ.ui.coinNode(40),
        h('span', { class: 'reward__k', text: 'たからばこ・ゴールデンスライム・ボスから。★3で ＋1まい' }),
        h('span', { class: 'reward__v', text: (player.coins || 0) + 'まい' })
      ]),
      h('p', { class: 'note', text: 'たたかいの 中で、使いおわった アイテムを コイン2まいで もう1回 つかえるよ（1回の たたかいに 1回）。' }),
      panel
    ]);
  }
  /* =======================================================
     モンスター図かん
     ======================================================= */
  function monsTab(player) {
    const list = MQ.enemies.dexList();
    const seen = list.filter(function (e) { return (player.dex[e.id] || 0) > 0; }).length;
    // 「NEW」は 1回 見たら 消える（見つけた よろこびを 1度だけ 出す）
    const fresh = Object.assign({}, player.dexNew || {});
    if (Object.keys(fresh).length) {
      MQ.save.update(function (p) { p.dexNew = {}; });
    }

    function cell(e, unit) {
      const n = player.dex[e.id] || 0;
      const rare = e.rare ? 'sr' : ((e.rank || 0) >= 3 ? 'r' : '');
      const kids = [];
      if (n) {
        if (fresh[e.id]) kids.push(h('span', { class: 'dexcell__new', text: 'NEW' }));
        if (rare) kids.push(h('span', { class: 'dexcell__badge badge--' + rare, text: rare === 'sr' ? 'SR' : 'レア' }));
      }
      kids.push(h('div', { class: 'dexcell__art' }, [
        n ? MQ.enemies.node(e.id, { size: 52 }) : MQ.enemies.shadowNode(e.id, { size: 52 })
      ]));
      kids.push(h('span', { class: 'dexcell__name', text: n ? e.name : '？？？' }));
      if (n) {
        kids.push(h('span', { class: 'dexcell__num', text: '×' + n }));
      } else {
        kids.push(h('span', { class: 'dexcell__sub', text: e.by === 'son' ? 'レア' : (unit || 'ひみつ') }));
      }
      return h('div', { class: 'dexcell' + (n ? (rare === 'sr' ? ' is-sr' : '') : ' is-unknown') }, kids);
    }

    return h('div', {}, [
      h('button', {
        class: 'btn', type: 'button', style: { width: '100%', marginTop: '12px' },
        onclick: function () { MQ.sfx.tap(); MQ.ui.photo.render(); }
      }, [h('i', { class: 'ic ic--cam' }), h('span', { text: 'じぶんの モンスターを つくる' })]),
      h('p', { class: 'note', text: '紙に かいた モンスターを 写真に とると、ドット絵に なって バトルに 出てくるよ。' }),
      dexHead('モンスター', seen, list.length),
      h('div', { class: 'dexgrid' }, list.map(function (e) { return cell(e); })),
      h('h2', { class: 'label', text: 'ボス' }),
      h('div', { class: 'dexgrid' }, MQ.enemies.bosses.map(function (e) { return cell(e, 'つぎの ボス'); }))
    ]);
  }
  /* =======================================================
     おうちの人ページ
     ======================================================= */
  function parentTab(player) {
    const rows = [];
    MQ.content.subjectAreas().forEach(function (area) {
      area.stages.forEach(function (st) {
        const b = player.best && player.best[st.id];
        if (!b || !b.total) return;
        const pct = Math.round(b.correct / b.total * 100);
        const cls = pct >= 80 ? '' : pct >= 50 ? ' pbar__fill--low' : ' pbar__fill--bad';
        rows.push(h('div', { class: 'pbar' }, [
          h('span', { class: 'pbar__name', text: st.name }),
          h('span', { class: 'pbar__track' }, [h('span', { class: 'pbar__fill' + cls, style: { width: pct + '%' } })]),
          h('span', { class: 'pbar__pct', text: pct + '%' })
        ]));
      });
    });

    // よく まちがえる 問題
    const weak = [];
    Object.keys(player.escaped || {}).forEach(function (areaId) {
      MQ.save.escapedIn(player, areaId).forEach(function (e) {
        weak.push(MQ.util.stripTags(e.q && e.q.prompt ? e.q.prompt : e.key));
      });
    });

    const log = (player.log || []).slice(0, 30).map(function (l) {
      const dt = new Date(l.at);
      const at = (dt.getMonth() + 1) + '/' + dt.getDate();
      return h('div', { class: 'plog__row' }, [
        h('span', { class: 'plog__at', text: at }),
        h('span', { text: l.text })
      ]);
    });

    return h('div', {}, [
      termsSection(player),
      judgeSection(),
      aiSection(),
      h('h2', { class: 'label', text: 'たんげんごとの できぐあい（じぶんの さいこう記ろく）' }),
      rows.length ? h('div', { class: 'parent' }, rows) : h('p', { class: 'note', text: 'まだ 記ろくが ありません。' }),
      h('h2', { class: 'label', text: 'いま つまずいている 問題（' + weak.length + '）' }),
      weak.length
        ? h('div', { class: 'plog' }, weak.slice(0, 20).map(function (t) { return h('div', { class: 'plog__row', text: t }); }))
        : h('p', { class: 'note', text: 'にげられた 問題は ありません。' }),
      h('h2', { class: 'label', text: 'ぼうけんの きろく' }),
      log.length ? h('div', { class: 'plog' }, log) : h('p', { class: 'note', text: 'まだ ありません。' }),
      h('p', { class: 'note', style: { marginTop: '14px' }, text: 'この ページの 内よう は この タブレットの 中だけに あります。ほかの 子と くらべる 機能は ありません。' })
    ]);
  }

  /* =======================================================
     学校で ならった ところ（v2.6・おうちの人が 決める）
       学期ボタン（1〜3・ぜんぶ）＋ 単元ごとの チェック。表は js/content/terms.js
     ======================================================= */
  function termsSection(player) {
    const grade = player.grade || 3;
    const term = MQ.terms.termOf(player);
    const btns = h('div', { class: 'termrow' }, [[1, '1学期まで'], [2, '2学期まで'], [3, '3学期まで'], [0, 'ぜんぶ']].map(function (t) {
      return h('button', {
        class: 'chip' + (term === t[0] ? ' is-on' : ''), type: 'button', text: t[1],
        onclick: function () {
          MQ.sfx.tap();
          MQ.save.update(function (pl) { pl.term = t[0]; pl.units = {}; });
          MQ.ui.toast(t[0] ? t[1] + ' ならった ところだけ 出します' : 'ぜんぶの 問題を 出します');
          render('parent');
        }
      });
    }));
    // いまの 月と ちがう 学期に なっていたら すすめる（v3.0）
    const sug = MQ.terms.suggested ? MQ.terms.suggested() : 0;
    const month = (MQ.terms.now ? MQ.terms.now() : new Date()).getMonth() + 1;
    const sugRow = sug && term !== sug ? h('div', { class: 'termsug' }, [
      h('span', { class: 'termsug__t', text: 'いまは ' + month + '月。学校は ' + sug + '学期の ころです。' + (term === 0 ? '「' + sug + '学期まで」に すると、まだ ならっていない 単元は 出ません。' : '') }),
      h('button', {
        class: 'btn btn--small', type: 'button', text: sug + '学期まで に する',
        onclick: function () {
          MQ.sfx.tap();
          MQ.save.update(function (pl) { pl.term = sug; pl.units = {}; });
          MQ.ui.toast(sug + '学期まで ならった ところだけ 出します');
          render('parent');
        }
      })
    ]) : null;
    const groups = {};
    MQ.content.subjectAreas().forEach(function (a) { groups[a.id] = { name: a.name, items: [] }; });
    MQ.terms.entries(grade).forEach(function (e) { if (groups[e.area]) groups[e.area].items.push(e); });
    Object.keys(groups).forEach(function (id) { groups[id].items.sort(function (a, b) { return a.term - b.term; }); });   // 1学期 → 3学期 → 小4
    const lists = Object.keys(groups).map(function (id) {
      const g = groups[id];
      if (!g.items.length) return null;
      return h('div', { class: 'ulist' }, [
        h('h3', { class: 'ulist__name', text: g.name }),
        h('div', { class: 'ulist__grid' }, g.items.map(function (e) {
          const on = e.ready && MQ.terms.learned(player, e.key);
          return h('button', {
            class: 'unit' + (on ? ' is-on' : '') + (e.ready ? '' : ' unit--soon'), type: 'button',
            onclick: function () {
              if (!e.ready) { MQ.sfx.tap(); MQ.ui.toast('この 単元の 問題は じゅんびちゅう です'); return; }
              MQ.sfx.tap();
              MQ.save.update(function (pl) { pl.units = pl.units || {}; pl.units[e.key] = !on; });
              render('parent');
            }
          }, [
            h('span', { class: 'unit__mark', text: on ? '✓' : '' }),
            h('span', { class: 'unit__name', text: e.name }),
            h('span', { class: 'unit__term', text: e.ready ? MQ.terms.TERM_NAMES[e.term] : 'じゅんびちゅう' })
          ]);
        }))
      ]);
    });
    return h('div', { class: 'terms' }, [
      h('h2', { class: 'label', text: '学校で ならった ところ' }),
      h('p', { class: 'note', text: 'チェックの ある 単元の 問題だけ 出ます。学期を えらぶと 教科書の じゅんに そろい、単元を 押すと 1つずつ 変えられます（学校の 進み方に 合わせて）。' }),
      btns,
      sugRow
    ].concat(lists));
  }

  /* =======================================================
     かん字を 書く問題の はんてい（v2.9）：きびしさ
     ======================================================= */
  function judgeSection() {
    if (!MQ.handwrite) return null;
    const cur = MQ.save.getSetting('judge', 'normal');
    const wrap = h('div', { class: 'chips chips--tight' });
    [['easy', 'やさしい'], ['normal', 'ふつう'], ['strict', 'きびしい']].forEach(function (t) {
      const b = h('button', {
        class: 'chip' + (cur === t[0] ? ' is-on' : ''), type: 'button', text: t[1],
        onclick: function () {
          MQ.sfx.tap();
          MQ.save.setSetting('judge', t[0]);
          MQ.handwrite.setLevel(t[0]);
          wrap.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
          b.classList.add('is-on');
        }
      });
      wrap.appendChild(b);
    });
    return h('div', { class: 'terms' }, [
      h('h2', { class: 'label', text: 'かん字を 書く問題の はんてい' }),
      h('p', { class: 'note', text: '書いた 字の 形を おてほんと くらべて、自動で ○×を つけます（なぐりがき・画数の 足りない 字・ぬりつぶしは ×）。まよう ときだけ、おてほんと ならべて 子どもが ◯✕を えらびます。きびしさを 変えられます。' }),
      wrap
    ]);
  }

  /* =======================================================
     AIで モンスターを かっこよく（v2.8・おうちの人が かぎを 入れる）
       かぎは js/core/ai.js が この タブレットの 中だけに ほぞんする。
       かぎが ある ときだけ、写真の 画面に「AIで かっこよく する」が 出る。
     ======================================================= */
  function aiSection() {
    if (!MQ.ai) return null;
    const c = MQ.ai.config();
    const keyIn = h('input', {
      class: 'input ai__key', type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: 'AIの かぎ（AIza… で はじまる 文字）', value: c.key || ''
    });
    const status = h('p', { class: 'ai__status' });
    function paintStatus(text, kind) {
      status.textContent = text;
      status.className = 'ai__status' + (kind ? ' ai__status--' + kind : '');
    }
    function showState() {
      if (MQ.ai.ready()) paintStatus('いま: つかえます（きょう ' + MQ.ai.usedToday() + ' / ' + MQ.ai.config().limit + ' 回・' + MQ.ai.modelName() + '）', 'ok');
      else paintStatus('いま: かぎが 入っていません（子どもの 画面に AIの ボタンは 出ません）', '');
    }
    function saveKey(quiet) {
      MQ.ai.setConfig({ key: keyIn.value });
      if (!quiet) MQ.ui.toast(MQ.ai.ready() ? 'かぎを ほぞんしました' : 'かぎを 消しました');
      showState();
    }
    const showBtn = h('button', {
      class: 'btn btn--small btn--stone', type: 'button', text: '見せる',
      onclick: function () {
        MQ.sfx.tap();
        const hide = keyIn.type === 'text';
        keyIn.type = hide ? 'password' : 'text';
        showBtn.textContent = hide ? '見せる' : 'かくす';
      }
    });
    const checkBtn = h('button', {
      class: 'btn btn--small btn--cream', type: 'button', text: 'しらべる',
      onclick: function () {
        MQ.sfx.tap();
        saveKey(true);
        paintStatus('しらべています…', '');
        checkBtn.disabled = true;
        MQ.ai.check().then(function (r) {
          checkBtn.disabled = false;
          paintStatus(r.text, r.ok ? 'ok' : 'bad');
        });
      }
    });
    const chips = function (list, isOn, onPick) {
      const wrap = h('div', { class: 'chips chips--tight' });
      list.forEach(function (it) {
        const b = h('button', {
          class: 'chip chip--s' + (isOn(it) ? ' is-on' : ''), type: 'button', text: it.label,
          onclick: function () {
            MQ.sfx.tap();
            onPick(it);
            wrap.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
            b.classList.add('is-on');
            showState();
          }
        });
        wrap.appendChild(b);
      });
      return wrap;
    };
    const modelChips = chips(
      MQ.ai.MODELS.map(function (m) { return { id: m.id, label: m.name + '（' + m.note + '）' }; }),
      function (it) { return it.id === c.model; },
      function (it) { MQ.ai.setConfig({ model: it.id }); }
    );
    const limitChips = chips(
      MQ.ai.LIMITS.map(function (n) { return { n: n, label: n + '回' }; }),
      function (it) { return it.n === c.limit; },
      function (it) { MQ.ai.setConfig({ limit: it.n }); }
    );
    showState();
    return h('div', { class: 'ai' }, [
      h('h2', { class: 'label', text: 'AIで モンスターを かっこよく' }),
      h('p', { class: 'note', text: '「じぶんの モンスターを つくる」で とった 絵を、AI（Google の Gemini）に 送って、絵に 忠実な まま ゲームの モンスターらしく かき直します。かぎを 入れた ときだけ、子どもの 画面に「AIで かっこよく する」の ボタンが 出ます。' }),
      h('p', { class: 'note', text: '送るのは 切りぬいた 絵の 部分だけです（なまえ・きろくは 送りません）。かぎは この タブレットの 中だけに ほぞんされ、「きろくの ほぞん」の ファイルには 入りません。' }),
      h('ol', { class: 'ai__steps' }, [
        h('li', {}, ['Google の ', h('a', { class: 'ai__link', href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener', text: 'aistudio.google.com/apikey' }), ' を ひらいて ログインする']),
        h('li', { text: '「APIキーを 作成」を 押して、出てきた 文字（AIza… で はじまる）を コピーする' }),
        h('li', { text: '下の わくに はりつけて「しらべる」。OK が 出たら つかえます' }),
        h('li', { text: 'おかね：1まい 約5〜20円（Google に はらいます）。無料わくの ない AIなので、Google AI Studio で Billing（お支払い）の 設定が いります。上限は「1日に つかえる 回数」で' })
      ]),
      keyIn,
      h('div', { class: 'ai__row' }, [
        h('button', { class: 'btn btn--small', type: 'button', text: 'ほぞん', onclick: function () { MQ.sfx.tap(); saveKey(false); } }),
        checkBtn,
        showBtn,
        h('button', {
          class: 'btn btn--small btn--danger', type: 'button', text: 'けす',
          onclick: function () {
            if (!window.confirm('AIの かぎを 消します。いいですか？')) return;
            MQ.ai.clearKey();
            keyIn.value = '';
            MQ.ui.toast('AIの かぎを 消しました');
            showState();
          }
        })
      ]),
      status,
      h('p', { class: 'ai__sub', text: 'AIの しゅるい' }),
      modelChips,
      h('p', { class: 'ai__sub', text: '1日に つかえる 回数（この タブレット）' }),
      limitChips
    ]);
  }

  /* =======================================================
     せってい（音・きろくの ほぞん）
     ======================================================= */
  function settingsTab(player) {
    const area = h('textarea', {
      class: 'input', rows: '4',
      style: { minHeight: '90px', fontSize: '0.8rem', fontFamily: 'monospace', padding: '8px' },
      placeholder: 'ここに ひかえの 文字を はりつけて「もどす」を おしてください'
    });

    function backup() {
      const text = MQ.save.exportText();
      area.value = text;
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (e) {}
      // ファイルとしても 保存できるように する
      try {
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dt = new Date();
        a.href = url;
        a.download = 'manabi-monster-' + dt.getFullYear() + ('0' + (dt.getMonth() + 1)).slice(-2) + ('0' + dt.getDate()).slice(-2) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        MQ.ui.toast('きろくを ファイルに ほぞんしました');
        return;
      } catch (e) {}
      MQ.ui.toast(copied ? 'きろくを コピーしました' : 'したの 文字を ぜんぶ コピーして ほぞんしてください');
    }

    function restore() {
      const text = area.value.trim();
      if (!text) { MQ.ui.toast('ひかえの 文字を はりつけてね'); return; }
      if (!window.confirm('いまの きろくを 上書きします。いいですか？')) return;
      try {
        MQ.save.importText(text);
        MQ.ui.toast('きろくを もどしました');
        MQ.ui.start.render();
        MQ.ui.show('screen-start');
      } catch (e) {
        MQ.ui.toast('形式が ちがうようです');
      }
    }

    const fileIn = h('input', { class: 'file', type: 'file', accept: 'application/json,.json' });
    fileIn.addEventListener('change', function () {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () { area.value = String(r.result); MQ.ui.toast('よみこみました。「きろくを もどす」を おしてね'); };
      r.readAsText(f);
    });

    return h('div', {}, [
      h('h2', { class: 'label', text: 'おと' }),
      h('div', { style: { display: 'flex', gap: '8px' } }, MQ.ui.soundButtons()),

      h('h2', { class: 'label', text: 'きろくの ほぞん（大事）' }),
      h('p', { class: 'note', text: 'きろくは この タブレットの 中だけに あります。タブレットが こわれたり、ブラウザの データを 消すと 全部 なくなります。ときどき ほぞんして おいてください。' }),
      h('div', { style: { display: 'grid', gap: '14px', marginTop: '10px' } }, [
        h('button', { class: 'btn', type: 'button', text: '💾 きろくを ほぞん', onclick: function () { MQ.sfx.tap(); backup(); } }),
        h('button', { class: 'btn btn--stone', type: 'button', text: '📂 ファイルから よみこむ', onclick: function () { MQ.sfx.tap(); fileIn.click(); } }),
        fileIn,
        area,
        h('button', { class: 'btn btn--stone', type: 'button', text: '↩ きろくを もどす', onclick: function () { MQ.sfx.tap(); restore(); } })
      ]),

      h('h2', { class: 'label', text: 'バージョン' }),
      h('p', { class: 'note', id: 'ver-note', text: 'いまの バージョン: ' + (MQ.version || 'しらべています…') }),
      h('p', { class: 'note', text: 'あたらしい バージョンが 入ると、画面の 下に「こうしん」の お知らせが 出ます。' }),
      h('button', { class: 'btn btn--small btn--stone', type: 'button', text: 'あたらしい バージョンを しらべる', onclick: function () { MQ.sfx.tap(); if (MQ.ui.checkUpdate) MQ.ui.checkUpdate(); } }),

      h('h2', { class: 'label', text: 'プレイヤー' }),
      h('button', {
        class: 'btn btn--small btn--danger', type: 'button', text: 'この プレイヤーを 消す',
        onclick: function () {
          if (!window.confirm(player.name + ' の きろくを 消します。もどせません。いいですか？')) return;
          MQ.save.deletePlayer(player.id);
          MQ.ui.start.render();
          MQ.ui.show('screen-start');
        }
      })
    ]);
  }

  // たからものを えらんだ 状態に する（harness 用）。タブも たからばこに 合わせる
  function pick(id) { picked = id; tab = 'treasure'; }

  return { render: render, pick: pick };
})();
