/* ---------------------------------------------------------
   すがたを えらぶ ところ（v1.4 ／ 今どきの ゲーム風）

   上から：
     1. プレビュー（むらさきの 空 ＋ ドットの 星 ＋ スポットライト）
        全身の アバターが ゆっくり 上下に ゆれる。
        左上「すがたを かえる」／右上「おまかせ」（サイコロ）
        左下 なまえ＋Lv の チップ／右下「もってる パーツ n / m」
     2. カテゴリの タブ：かみ／め／ふく／いろ／アクセ
     3. パーツの 一覧（4れつ）。レア＝金・SR＝むらさきの バッジ、
        まだ 使えない ものは「Lv.15で かいほう」の ロック表示
     4. いろの 四角（かみの いろ・はだの いろ など）
     5. 決定ボタン（外から わたす）

   2つの ばめんで 使います：
     ・あたらしい ぼうけん（start.js）… なまえと いっしょに えらぶ
     ・図かん → 主人公 → すがたを かえる（dex.js）… あとから かえる

   panel(look, opts)
     opts.level   … いまの レベル（かいほうの 判定に 使う）
     opts.name    … チップに 出す なまえ
     opts.title   … 左上の 見出し
     opts.actions … いちばん下に ならべる ボタン
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.look = (function () {
  const h = MQ.util.h;

  function badge(item) {
    if (!item.rare) return null;
    return h('span', { class: 'badge badge--' + item.rare, text: item.rare === 'sr' ? 'SR' : 'レア' });
  }

  function panel(look, opts) {
    opts = opts || {};
    const level = opts.level == null ? 99 : opts.level;
    const tabs = MQ.hero.lookTabs;
    let tabId = tabs[0].id;

    /* ---- プレビュー ---- */
    const heroImg = h('img', { class: 'sprite look__hero', alt: '主人公' });
    const nameEl = h('b', { text: opts.name || 'なまえ' });
    const countHave = h('b');
    const countTotal = h('b');
    const body = h('div', { class: 'look__body' });

    const tabsEl = h('div', { class: 'look__tabs' }, tabs.map(function (t) {
      return h('button', {
        class: 'look__tab', type: 'button', text: t.name,
        onclick: function () { MQ.sfx.tap(); tabId = t.id; paint(); }
      });
    }));

    // その パーツだけ かえた 見た目（ボタンの 絵を 作るのに 使う）
    function swapped(key, id) {
      const l = {};
      Object.keys(look).forEach(function (k) { l[k] = look[k]; });
      l[key] = id;
      return l;
    }

    function choose(group, item) {
      if (!MQ.hero.owns(item, level)) {
        MQ.sfx.tap();
        MQ.ui.toast('Lv.' + item.lv + ' に なると つかえるよ');
        return;
      }
      if (look[group.key] === item.id) return;
      look[group.key] = item.id;
      MQ.sfx.tap();
      paint();
    }

    // かたちの ボタン（ミニの 顔／からだ ＋ なまえ）
    function partCell(group, item) {
      const on = look[group.key] === item.id;
      const owned = MQ.hero.owns(item, level);
      const kids = [
        h('img', { class: 'sprite lookcell__img', src: MQ.hero.partSprite(swapped(group.key, item.id), group.preview), alt: '' }),
        h('span', { class: 'lookcell__name', text: item.name })
      ];
      if (!owned) kids.push(h('span', { class: 'lookcell__lock', text: 'Lv.' + item.lv + 'で かいほう' }));
      kids.push(badge(item));
      return h('button', {
        class: 'lookcell' + (on ? ' is-on' : '') + (owned ? '' : ' is-lock'),
        type: 'button', 'aria-pressed': on ? 'true' : 'false',
        onclick: function () { choose(group, item); }
      }, kids);
    }

    // いろの ボタン
    function colorCell(group, item) {
      const on = look[group.key] === item.id;
      const owned = MQ.hero.owns(item, level);
      const kids = [h('i', { class: 'swatch__chip', style: { background: item.color } })];
      if (item.rainbow) kids.push(h('span', { class: 'swatch__spark', text: '✦' }));
      if (!owned) kids.push(h('span', { class: 'swatch__lock', text: 'Lv.' + item.lv }));
      return h('button', {
        class: 'swatch' + (on ? ' is-on' : '') + (owned ? '' : ' is-lock'),
        type: 'button', 'aria-label': item.name, 'aria-pressed': on ? 'true' : 'false',
        onclick: function () { choose(group, item); }
      }, kids);
    }

    function section(group) {
      const head = [h('h3', { class: 'look__sechead', text: group.label })];
      if (group.hint) head.push(h('span', { class: 'look__hint', text: group.hint }));
      const cells = group.list.map(function (item) {
        return group.kind === 'color' ? colorCell(group, item) : partCell(group, item);
      });
      return h('div', { class: 'look__sec' }, [
        h('div', { class: 'look__sectop' }, head),
        h('div', { class: group.kind === 'color' ? 'swatches' : 'lookgrid' }, cells)
      ]);
    }

    function paint() {
      heroImg.src = MQ.hero.sprite({ look: look, equipped: {} }, { noGear: true });
      const c = MQ.hero.partsCount(level);
      countHave.textContent = c.have;
      countTotal.textContent = c.total;

      const tab = tabs.filter(function (t) { return t.id === tabId; })[0] || tabs[0];
      body.textContent = '';
      tab.keys.forEach(function (key) { body.appendChild(section(MQ.hero.groupByKey[key])); });

      const btns = tabsEl.querySelectorAll('.look__tab');
      for (let i = 0; i < btns.length; i++) btns[i].classList.toggle('is-on', tabs[i].id === tabId);
    }

    const stage = h('div', { class: 'look__stage' }, [
      h('div', { class: 'look__stars' }),
      h('div', { class: 'look__floor' }),
      h('h2', { class: 'look__title', text: opts.title || 'すがたを かえる' }),
      h('button', {
        class: 'look__random', type: 'button',
        onclick: function () {
          const r = MQ.hero.randomLook(level);
          Object.keys(r).forEach(function (k) { look[k] = r[k]; });
          MQ.sfx.item();
          paint();
        }
      }, [h('i', { class: 'dice' }), h('span', { text: 'おまかせ' })]),
      h('div', { class: 'look__spot' }),
      h('div', { class: 'look__shadow' }),
      heroImg,
      h('div', { class: 'look__chip look__chip--name' }, [nameEl, h('span', { text: 'Lv. ' + (opts.level == null ? 1 : opts.level) })]),
      h('div', { class: 'look__chip look__chip--count' }, [
        h('span', { text: 'もってる パーツ ' }), countHave, h('span', { text: ' / ' }), countTotal
      ])
    ]);

    const el = h('div', { class: 'look' }, [
      stage,
      tabsEl,
      body,
      h('div', { class: 'look__actions' }, opts.actions || [])
    ]);

    paint();
    return {
      el: el, look: look, paint: paint,
      setName: function (name) { nameEl.textContent = name || 'なまえ'; }
    };
  }

  /* =======================================================
     あとから すがたを かえる（図かん → 主人公 から くる）
     ======================================================= */
  function edit() {
    const player = MQ.save.current();
    if (!player) return;
    const look = MQ.hero.lookOf(player);
    const p = panel(look, {
      level: MQ.hero.levelFor(player),
      name: player.name,
      title: 'すがたを かえる',
      actions: [
        h('button', {
          class: 'btn btn--big', type: 'button',
          onclick: function () {
            MQ.sfx.item();
            MQ.save.update(function (pl) { pl.look = look; });
            MQ.ui.toast('すがたが かわった！');
            MQ.ui.goMap();
          }
        }, [h('span', { text: 'これで ぼうけんへ！' }), h('span', { class: 'btn__shine' })]),
        h('button', {
          class: 'btn btn--small btn--stone', type: 'button', text: 'やめる',
          onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render('hero'); }
        })
      ]
    });

    MQ.ui.mount('screen-dex', h('div', { class: 'wrap wrap--look' }, [p.el]));
    MQ.ui.show('screen-dex');
  }

  return { panel: panel, edit: edit };
})();
