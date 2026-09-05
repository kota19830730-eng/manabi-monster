/* ---------------------------------------------------------
   おうちの人ページ「学習レポート」（v7.3）

   子どもの 画面とは 別の 画面（#screen-parent・明るい 紙色・大人向けの 文体）。
   正本は Claude Design の モック「まなびモンスター 学習レポート」（B案 学習ダッシュボード）。
     home     … 今週の 数字 → 14日の 学習量 → 気になるところ → 成長 → 伸びた → 単元ごと → レポート／コピー
     detail   … 単元の くわしい 画面（つまずき・まちがえた 問題・練習させる）
     settings … 学期・フィーバー・かん字の 採点・記録の 保存・AI・この子の 記録
     report   … 先生用 レポート（画面で 見る＋印刷・PDF）
   数字は js/core/stats.js。子どもには 見せない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.parent = (function () {
  const h = MQ.util.h;
  let view = 'home';
  let stageId = null;
  let kind = 'week';        // 今週／今月／すべて
  let showAll = {};         // 教科ごとに「残りを見る」を ひらいたか
  let opened = false;
  let from = 'title';       // どこから 来たか（v7.8・タイトル／地図）。もどる 先が 変わる

  const LEVEL_TEXT = { good: 'よくできる', mid: 'ふつう', weak: '苦手', few: 'まだ少ない', none: '未学習' };

  /* ---- 入口 ---- */
  function open(v, opts) {
    opts = opts || {};
    view = v || 'home';
    if (opts.stageId) stageId = opts.stageId;
    if (opts.from) from = opts.from;
    opened = true;
    render();
    MQ.ui.show('screen-parent');
  }
  function isOpen() {
    const el = document.getElementById('screen-parent');
    return !!(el && el.classList.contains('is-active'));
  }
  function refresh() { if (opened) render(); else open('settings', { from: 'map' }); }
  /* もどる 先（v7.8）：タイトルから 来たら タイトル、子どもの 画面から 来たら 地図 */
  function back() {
    opened = false;
    if (from === 'title') { MQ.ui.start.render(); MQ.ui.show('screen-start'); return; }
    MQ.ui.goMap();
  }
  function backText() { return from === 'title' ? 'タイトルへ' : '子どもの画面へ'; }

  function gradeOf(p) { return p.grade || 3; }

  function render() {
    const p = MQ.save.current();
    if (!p) { MQ.ui.start.render(); MQ.ui.show('screen-start'); return; }
    let body;
    if (view === 'detail' && stageId) body = detailView(p);
    else if (view === 'settings') body = settingsView(p);
    else if (view === 'report') body = reportView(p);
    else { view = 'home'; body = homeView(p); }
    const scr = document.getElementById('screen-parent');
    const oldBody = scr && scr.querySelector('.pp__body');
    const keepTop = oldBody && scr.classList.contains('is-active') && oldBody.getAttribute('data-view') === view ? oldBody.scrollTop : 0;
    const page = h('div', { class: 'pp' }, [h('div', { class: 'pp__body', 'data-view': view }, body)]);
    MQ.ui.mount('screen-parent', page);
    const nb = page.querySelector('.pp__body');
    if (keepTop && nb) nb.scrollTop = keepTop;
  }

  /* ---- 部品 ---- */
  function icon(name, size) {
    const s = size || 18;
    const paths = {
      gear: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>',
      up: '<path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path>',
      down: '<path d="M12 5v14"></path><path d="M19 12l-7 7-7-7"></path>',
      right: '<path d="M9 18l6-6-6-6"></path>',
      left: '<path d="M15 18l-6-6 6-6"></path>',
      arrow: '<path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path>',
      print: '<path d="M6 9V3h12v6"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v7H6z"></path>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
      play: '<path d="M5 3l14 9-14 9V3z"></path>',
      home: '<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path>'
    };
    const el = h('span', { class: 'pp-ic' });
    el.innerHTML = '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
    return el;
  }
  function pctEl(pct, cls, big) {
    const size = big ? 'pp-num--big' : '';
    if (pct == null) return h('span', { class: 'pp-num pp-c-none ' + size, text: '－' });
    return h('span', { class: 'pp-num ' + (cls || '') + ' ' + size }, [h('span', { text: String(pct) }), h('small', { text: '%' })]);
  }
  function bar(pct, level, cls) {
    return h('span', { class: 'pp-bar ' + (cls || '') }, [h('i', { class: 'pp-f-' + (level || 'none'), style: { width: (pct || 0) + '%' } })]);
  }
  function dot(level) { return h('i', { class: 'pp-dot pp-f-' + (level || 'none') }); }
  function sec(title, right) {
    return h('div', { class: 'pp-sec' }, [h('h2', { class: 'pp-h', text: title }), right ? h('span', { class: 'pp-muted pp-small', text: right }) : null]);
  }
  function btn(text, cls, onclick, ic) {
    return h('button', { class: 'pp-btn ' + (cls || ''), type: 'button', onclick: function () { MQ.sfx.tap(); onclick(); } }, [ic ? icon(ic) : null, h('span', { text: text })]);
  }
  function backLink(text, to) {
    return h('button', { class: 'pp-back', type: 'button', onclick: function () { MQ.sfx.tap(); to(); } }, [icon('left', 16), h('span', { text: text })]);
  }
  function fmtDate(iso) { const d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function svgEl(inner, w, hgt) {
    const box = h('div', { class: 'pp-svg' });
    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + hgt + '" width="100%" height="' + hgt + '" style="display:block;overflow:visible">' + inner + '</svg>';
    return box;
  }

  /* お子さんの 切りかえ（v7.8）。タイトルから 来た ときだけ 出す
     （子どもの 画面から 来た ときに 切りかえると、もどった 先が 別の子の 地図に なって しまう） */
  function kidPicker(now) {
    if (from !== 'title') return null;
    const players = MQ.save.get().players || [];
    if (players.length < 2) return null;
    return h('div', { class: 'pp-segrow pp-kids' }, players.map(function (p) {
      return h('button', {
        class: 'pp-seg' + (p.id === now.id ? ' is-on' : ''), type: 'button', text: p.name,
        onclick: function () {
          if (p.id === now.id) return;
          MQ.sfx.tap();
          MQ.save.setCurrent(p.id);
          MQ.ui.syncCustom();
          render();
        }
      });
    }));
  }

  /* =======================================================
     ホーム
     ======================================================= */
  function homeView(p) {
    const g = gradeOf(p);
    const pr = MQ.stats.period(p, kind);
    const ov = MQ.stats.overview(p, g);
    const weak = MQ.stats.weakest(p, g, 3);
    const gr = MQ.stats.growth(p, g);
    const imp = MQ.stats.improved(p, g, 2);
    const kids = [];

    /* ヘッダー */
    kids.push(h('header', { class: 'pp-head' }, [
      h('div', { class: 'pp-head__row' }, [
        backLink(backText(), back),
        btn('設定', 'pp-btn--s pp-btn--sm', function () { open('settings'); }, 'gear')
      ]),
      h('span', { class: 'pp-kicker', text: '学習レポート' }),
      h('div', { class: 'pp-head__name' }, [
        h('span', { class: 'pp-title', text: p.name + ' さん' }),
        h('span', { class: 'pp-muted', text: '小学' + g + '年' })
      ]),
      kidPicker(p),
      h('div', { class: 'pp-head__period' }, [
        ['week', '今週'], ['month', '今月'], ['all', 'すべて']
      ].map(function (t) {
        return h('button', {
          class: 'pp-seg' + (kind === t[0] ? ' is-on' : ''), type: 'button', text: t[1],
          onclick: function () { MQ.sfx.tap(); kind = t[0]; render(); }
        });
      }).concat([h('span', { class: 'pp-muted pp-small pp-head__range', text: pr.label })]))
    ]));

    const main = [];

    if (!ov.played) {
      main.push(h('div', { class: 'pp-card pp-empty' }, [
        h('p', { class: 'pp-h', text: 'まだ記録がありません' }),
        h('p', { class: 'pp-muted', text: 'お子さんがバトルをすると、1問ごとの結果がここにたまり、得意・苦手や成長のようすが見えるようになります。正答率は1回目で正解した割合で数えます。' })
      ]));
    } else {
      /* 今週の 数字 */
      const delta = function (n, unit, better) {
        if (n == null) return h('span', { class: 'pp-muted pp-small', text: pr.prevName ? pr.prevName + 'の記録なし' : '' });
        const up = n > 0, same = n === 0;
        const good = same ? null : (better === 'up' ? up : !up);
        return h('span', { class: 'pp-small pp-delta ' + (same ? 'pp-muted' : good ? 'pp-c-good' : 'pp-c-weak') }, [
          same ? null : icon(up ? 'up' : 'down', 12),
          h('span', { text: same ? pr.prevName + 'と同じ' : pr.prevName + 'より ' + Math.abs(n) + unit })
        ]);
      };
      main.push(h('div', { class: 'pp-tiles' }, [
        h('div', { class: 'pp-card pp-tile' }, [
          h('span', { class: 'pp-muted pp-tiny', text: '解いた問題' }),
          h('span', { class: 'pp-num pp-num--big', text: String(pr.n) }),
          pr.kind === 'all' ? h('span', { class: 'pp-muted pp-small', text: pr.days + '日' }) : delta(pr.deltaN, '問', 'up')
        ]),
        h('div', { class: 'pp-card pp-tile' }, [
          h('span', { class: 'pp-muted pp-tiny', text: '正答率' }),
          pctEl(pr.pct, '', true),
          pr.kind === 'all' ? h('span', { class: 'pp-muted pp-small', text: pr.ok + ' / ' + pr.n }) : (pr.prev && pr.prev.pct != null ? h('span', { class: 'pp-small pp-delta ' + (pr.deltaPct > 0 ? 'pp-c-good' : pr.deltaPct < 0 ? 'pp-c-weak' : 'pp-muted') }, [pr.deltaPct ? icon(pr.deltaPct > 0 ? 'up' : 'down', 12) : null, h('span', { text: pr.prevName + ' ' + pr.prev.pct + '%' })]) : h('span', { class: 'pp-muted pp-small', text: pr.prevName + 'の記録なし' }))
        ]),
        h('div', { class: 'pp-card pp-tile' }, [
          h('span', { class: 'pp-muted pp-tiny', text: '学習した日' }),
          h('span', { class: 'pp-num pp-num--big' }, [h('span', { text: String(pr.days) }), pr.kind !== 'all' ? h('small', { class: 'pp-muted', text: '/' + pr.daysTotal }) : h('small', { text: '日' })]),
          pr.dots ? h('span', { class: 'pp-dots' }, pr.dots.map(function (d) { return h('i', { class: d.on ? 'is-on' : d.future ? 'is-future' : '' }); }))
            : h('span', { class: 'pp-muted pp-small', text: pr.n ? '1日 約' + Math.round(pr.n / Math.max(1, pr.days)) + '問' : '' })
        ])
      ]));

      /* 14日の 学習量 */
      const days = MQ.stats.daily(p, 14);
      const max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.n; })));
      main.push(h('div', { class: 'pp-card pp-chart' }, [
        h('div', { class: 'pp-card__hd' }, [h('span', { class: 'pp-h pp-h--s', text: '1日に解いた問題数' }), h('span', { class: 'pp-muted pp-small', text: '過去14日' })]),
        h('div', { class: 'pp-bars' }, days.map(function (d, i) {
          const el = h('div', { class: 'pp-bars__b' + (d.today ? ' is-today' : i >= 7 ? ' is-this' : ''), style: { height: Math.round(d.n / max * 100) + '%' } });
          if (d.today && d.n) el.appendChild(h('span', { class: 'pp-bars__v', text: String(d.n) }));
          return el;
        })),
        h('div', { class: 'pp-bars__x' }, days.map(function (d, i) {
          return h('span', { class: d.today ? 'is-today' : '', text: d.today ? '今日' : (i === 0 || i === 7) ? String(d.day) : '' });
        }))
      ]));

      /* 気になるところ */
      const wk = h('section', { class: 'pp-section' }, [sec('気になるところ', '正答率 70%未満の単元')]);
      if (!weak.length) {
        wk.appendChild(h('div', { class: 'pp-card pp-pad' }, [h('span', { class: 'pp-muted', text: '今、苦手といえる単元はありません（最近5問以上解いた中で正答率70%未満のもの）。' })]));
      } else {
        wk.appendChild(h('div', { class: 'pp-card pp-list' }, weak.map(function (s, i) { return weakRow(s, i + 1); })));
        wk.appendChild(h('p', { class: 'pp-muted pp-small pp-note', text: '正答率は1回目で正解した割合です（2回目で正解した問題は数えません）。' }));
      }
      main.push(wk);

      /* 成長の ようす */
      main.push(growthCard(gr, imp));

      /* 単元ごと */
      const um = h('section', { class: 'pp-section' }, [
        sec('単元ごとの正答率', '最近20問'),
        h('div', { class: 'pp-legend' }, [
          legend('good', '85%以上'), legend('mid', '60–84%'), legend('weak', '60%未満'), legend('few', 'まだ5問未満')
        ])
      ]);
      ov.areas.forEach(function (a) {
        const done = a.stages.filter(function (s) { return s.n > 0; }).length;
        const all = !!showAll[a.id];
        const played = a.stages.filter(function (s) { return s.n > 0; });
        const rest = a.stages.filter(function (s) { return !s.n; });
        const shown = all ? a.stages : played.concat(rest.slice(0, Math.max(0, 6 - played.length)));
        const hidden = a.stages.length - shown.length;
        const card = h('div', { class: 'pp-card pp-list' }, [
          h('div', { class: 'pp-card__hd pp-card__hd--in' }, [h('span', { class: 'pp-h pp-h--s', text: a.name }), h('span', { class: 'pp-muted pp-small', text: done + ' / ' + a.stages.length + ' 単元' })])
        ]);
        shown.forEach(function (s) { card.appendChild(unitRow(s)); });
        if (hidden > 0 || all) {
          card.appendChild(h('button', {
            class: 'pp-link', type: 'button', text: all ? 'とじる' : '残り' + hidden + '単元を見る',
            onclick: function () { MQ.sfx.tap(); showAll[a.id] = !all; render(); }
          }));
        }
        um.appendChild(card);
      });
      main.push(um);
    }

    /* アクション */
    main.push(h('section', { class: 'pp-actions' }, [
      btn('先生に見せるレポートを作る', 'pp-btn--p pp-btn--lg', function () { open('report'); }, 'print'),
      btn('文字でコピー（LINE・メール用）', 'pp-btn--s', function () { copyText(MQ.stats.summaryText(p, g)); }, 'copy'),
      h('p', { class: 'pp-muted pp-small pp-center', text: '記録はこのタブレットの中だけに保存されます。外部には送信しません。' })
    ]));

    kids.push(h('div', { class: 'pp-main' }, main));
    return kids;
  }

  function legend(level, text) { return h('span', { class: 'pp-legend__i' }, [dot(level), h('span', { text: text })]); }

  function weakRow(s, rank) {
    const sub = s.units.filter(function (u) { return u.level === 'weak' || u.level === 'mid'; }).slice(0, 2).map(function (u) { return '「' + u.unit + '」'; }).join('');
    const top = s.wrong[0];
    const hint = sub ? sub + 'でつまずき' : top && (top.miss || 1) >= 2 ? '「' + top.p.slice(0, 14) + (top.p.length > 14 ? '…' : '') + '」を' + top.miss + '回まちがい' : '';
    return h('button', { class: 'pp-row pp-row--weak', type: 'button', onclick: function () { MQ.sfx.tap(); stageId = s.id; open('detail'); } }, [
      h('span', { class: 'pp-rank', text: String(rank) }),
      h('span', { class: 'pp-row__body' }, [
        h('span', { class: 'pp-row__top' }, [
          h('span', { class: 'pp-row__name' }, [h('b', { text: s.name }), h('span', { class: 'pp-muted pp-small', text: '　' + s.areaName })]),
          pctEl(s.pct, 'pp-c-' + s.level)
        ]),
        bar(s.pct, s.level),
        h('span', { class: 'pp-muted pp-small', text: '最近' + s.recentN + '問中 ' + s.recentOk + '問' + (hint ? '　・' + hint : '') })
      ]),
      icon('right', 20)
    ]);
  }

  function unitRow(s) {
    const none = !s.n;
    return h('button', { class: 'pp-urow' + (none ? ' is-none' : ''), type: 'button', onclick: function () { MQ.sfx.tap(); stageId = s.id; open('detail'); } }, [
      dot(s.level),
      h('span', { class: 'pp-urow__name', text: s.name }),
      bar(s.level === 'few' ? (s.recentN ? Math.round(s.recentOk / s.recentN * 100) : 0) : s.pct, s.level, 'pp-bar--fixed'),
      h('span', { class: 'pp-num pp-small pp-urow__pct pp-c-' + s.level, text: none ? '–' : s.level === 'few' ? s.recentOk + '/' + s.recentN : s.pct + '%' })
    ]);
  }

  function growthCard(gr, imp) {
    const box = h('section', { class: 'pp-section' }, [sec('成長のようす', '週ごとの正答率・8週間')]);
    const card = h('div', { class: 'pp-card pp-pad pp-growth' });
    if (gr.weeksWithData < 2) {
      card.appendChild(h('p', { class: 'pp-muted', style: { margin: 0 }, text: '2週間以上の記録がたまると、週ごとの正答率の変化がここに出ます。' }));
    } else {
      const d = gr.delta;
      card.appendChild(h('div', { class: 'pp-growth__top' }, [
        h('div', { class: 'pp-growth__ft' }, [
          h('span', { class: 'pp-muted pp-tiny', text: gr.weeksWithData + '週間で' }),
          h('span', { class: 'pp-growth__ab' }, [pctEl(gr.first.pct), icon('arrow', 18), pctEl(gr.last.pct)])
        ]),
        h('span', { class: 'pp-pill ' + (d > 0 ? 'pp-pill--good' : d < 0 ? 'pp-pill--weak' : 'pp-pill--none'), text: (d > 0 ? '＋' : d < 0 ? '－' : '±') + Math.abs(d) + 'ポイント' })
      ]));
      // 折れ線（8週）
      const W = 326, H = 90, pts = [];
      const weeks = gr.weeks;
      weeks.forEach(function (w, i) {
        if (w.pct == null) return;
        const x = weeks.length > 1 ? Math.round(i / (weeks.length - 1) * (W - 4)) + 2 : W / 2;
        const y = Math.round(80 - w.pct / 100 * 70);
        pts.push([x, y]);
      });
      let inner = '<line x1="0" y1="80" x2="' + W + '" y2="80" stroke="#ece8df" stroke-width="1"></line>' +
        '<line x1="0" y1="' + Math.round(80 - 0.7 * 70) + '" x2="' + W + '" y2="' + Math.round(80 - 0.7 * 70) + '" stroke="#ece8df" stroke-width="1" stroke-dasharray="2 4"></line>' +
        '<text x="0" y="' + (Math.round(80 - 0.7 * 70) - 4) + '" font-size="10" fill="#9a9488">70%</text>';
      if (pts.length > 1) inner += '<polyline points="' + pts.map(function (q) { return q.join(','); }).join(' ') + '" fill="none" stroke="#c98c12" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>';
      pts.forEach(function (q, i) {
        const last = i === pts.length - 1;
        inner += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (last ? 5 : 3.5) + '" fill="' + (last ? '#c98c12' : '#fffdf9') + '" stroke="' + (last ? '#fffdf9' : '#c98c12') + '" stroke-width="2"></circle>';
      });
      card.appendChild(svgEl(inner, W, H));
      card.appendChild(h('div', { class: 'pp-growth__x' }, weeks.map(function (w, i) {
        return h('span', { class: w.current ? 'is-now' : '', text: w.current ? '今週' : (i % 2 === 0 ? w.label : '') });
      })));
    }
    card.appendChild(h('div', { class: 'pp-growth__grid' }, [
      h('div', { class: 'pp-growth__cell' }, [
        h('span', { class: 'pp-muted pp-tiny', text: '身についた単元（85%以上）' }),
        h('span', { class: 'pp-growth__v' }, [h('span', { class: 'pp-num', text: String(gr.masteredNow) }), h('span', { class: 'pp-small ' + (gr.masteredNow > gr.masteredPrev ? 'pp-c-good' : 'pp-muted'), text: '先月 ' + gr.masteredPrev })])
      ]),
      h('div', { class: 'pp-growth__cell' }, [
        h('span', { class: 'pp-muted pp-tiny', text: '1問にかかる時間' }),
        h('span', { class: 'pp-growth__v' }, gr.secNow == null ? [h('span', { class: 'pp-muted', text: '－' })] : [
          h('span', { class: 'pp-num' }, [h('span', { text: String(gr.secNow) }), h('small', { text: '秒' })]),
          h('span', { class: 'pp-small ' + (gr.secPrev != null && gr.secNow < gr.secPrev ? 'pp-c-good' : 'pp-muted'), text: gr.secPrev != null ? '先月 ' + gr.secPrev + '秒' : '' })
        ])
      ])
    ]));
    box.appendChild(card);
    if (imp.length) {
      box.appendChild(h('div', { class: 'pp-sec pp-sec--sub' }, [h('h3', { class: 'pp-h pp-h--s', text: '伸びたところ' }), h('span', { class: 'pp-muted pp-small', text: '先週と比べて' })]));
      box.appendChild(h('div', { class: 'pp-grid2' }, imp.map(function (s) {
        return h('button', { class: 'pp-card pp-good', type: 'button', onclick: function () { MQ.sfx.tap(); stageId = s.id; open('detail'); } }, [
          h('span', { class: 'pp-h pp-h--s', text: s.name }),
          h('span', { class: 'pp-growth__v' }, [pctEl(s.pctNow, 'pp-c-good'), h('span', { class: 'pp-small pp-c-good', text: '先週 ' + s.pctPrev + '%' })])
        ]);
      })));
    }
    return box;
  }

  /* =======================================================
     単元の くわしい 画面
     ======================================================= */
  function findRow(p, g, id) {
    const ov = MQ.stats.overview(p, g);
    let hit = null;
    ov.areas.forEach(function (a) { a.stages.forEach(function (s) { if (s.id === id) hit = s; }); });
    return hit;
  }
  function termLabel(g, id) {
    const e = MQ.terms.entries(g).filter(function (x) { return x.key === id; })[0];
    return e && e.term && MQ.terms.TERM_NAMES[e.term] ? MQ.terms.TERM_NAMES[e.term] : '';
  }

  function detailView(p) {
    const g = gradeOf(p);
    const s = findRow(p, g, stageId);
    if (!s) { view = 'home'; return homeView(p); }
    const kids = [];
    kids.push(h('header', { class: 'pp-head' }, [
      backLink('レポートにもどる', function () { open('home'); }),
      h('div', { class: 'pp-head__dt' }, [
        h('div', { class: 'pp-head__dtl' }, [
          h('span', { class: 'pp-muted pp-small', text: s.areaName + (termLabel(g, s.id) ? '　' + termLabel(g, s.id) : '') }),
          h('span', { class: 'pp-title', text: s.name })
        ]),
        h('div', { class: 'pp-head__dtr' }, [
          pctEl(s.pct, 'pp-c-' + s.level, true),
          h('span', { class: 'pp-muted pp-tiny', text: s.recentN ? '最近' + s.recentN + '問中 ' + s.recentOk + '問' : '未学習' })
        ])
      ]),
      bar(s.pct, s.level, 'pp-bar--thick'),
      h('div', { class: 'pp-head__meta' }, [
        h('span', { text: 'これまで ' + s.ok + ' / ' + s.n + '問' }),
        s.at ? h('span', { text: '最後に学習 ' + fmtDate(s.at) }) : null,
        h('span', { text: LEVEL_TEXT[s.level] })
      ])
    ]));
    const main = [];
    if (s.units.length) {
      const c = h('div', { class: 'pp-card pp-list' });
      s.units.forEach(function (u) {
        c.appendChild(h('div', { class: 'pp-urow pp-urow--u' }, [
          dot(u.level),
          h('span', { class: 'pp-urow__name', text: u.unit }),
          h('span', { class: 'pp-muted pp-small', text: u.recentOk + ' / ' + u.recentN + '問' }),
          h('span', { class: 'pp-num pp-small pp-urow__pct pp-c-' + u.level, text: u.pct == null ? '–' : u.pct + '%' })
        ]));
      });
      const few = s.units.filter(function (u) { return u.level === 'few'; });
      main.push(h('section', { class: 'pp-section' }, [
        sec('どこでつまずいているか'),
        c,
        few.length ? h('p', { class: 'pp-muted pp-small pp-note', text: few.map(function (u) { return '「' + u.unit + '」'; }).join('') + 'はまだ' + few[0].recentN + '問なので、あと数問で傾向がはっきりします。' }) : null
      ]));
    }
    if (s.wrong.length) {
      const c = h('div', { class: 'pp-card pp-list' });
      s.wrong.slice(0, 8).forEach(function (w) {
        const miss = w.miss || 1, ok = w.ok || 0;
        c.appendChild(h('div', { class: 'pp-q' }, [
          h('div', { class: 'pp-q__top' }, [
            h('span', { class: 'pp-q__t', text: w.p }),
            h('span', { class: 'pp-tag ' + (miss >= 2 ? 'pp-tag--weak' : ''), text: miss + '回まちがい' + (ok ? '・' + ok + '回正解' : '') })
          ]),
          h('div', { class: 'pp-q__a' }, [
            h('span', {}, [h('span', { class: 'pp-muted', text: '答え ' }), h('b', { class: 'pp-c-weak', text: w.g || '－' })]),
            h('span', {}, [h('span', { class: 'pp-muted', text: '正しくは ' }), h('b', { class: 'pp-c-good', text: w.a || '－' })]),
            h('span', { class: 'pp-muted', text: (w.u ? w.u + '・' : '') + fmtDate(w.at) })
          ])
        ]));
      });
      main.push(h('section', { class: 'pp-section' }, [sec('まちがえた問題', '多い順'), c]));
    }
    if (!s.n) main.push(h('div', { class: 'pp-card pp-pad' }, [h('span', { class: 'pp-muted', text: 'この単元はまだ学習していません。下のボタンで練習させることができます。' })]));
    const found = MQ.content.findStage(s.id);
    if (found && !found.stage.tower) {
      main.push(h('section', { class: 'pp-actions' }, [
        btn('この単元を練習させる（6問）', 'pp-btn--p pp-btn--lg', function () { opened = false; MQ.ui.battle.startDrill(s.id); }, 'play'),
        h('p', { class: 'pp-muted pp-small pp-center', text: '子どもの画面に「' + s.name + '」だけのバトルが始まります。★やコインはつきません。' })
      ]));
    }
    kids.push(h('div', { class: 'pp-main' }, main));
    return kids;
  }

  /* =======================================================
     設定
     ======================================================= */
  function settingsView(p) {
    const g = gradeOf(p);
    const S = MQ.ui.dex.sections;
    const kids = [];
    kids.push(h('header', { class: 'pp-head' }, [
      backLink('レポートにもどる', function () { open('home'); }),
      h('span', { class: 'pp-title', text: '設定' }),
      h('span', { class: 'pp-muted pp-small', text: p.name + ' さんの出題と採点に関する設定です。子どもの画面には表示されません。' })
    ]));
    const main = [];
    const wrapSec = function (node) { return node ? h('div', { class: 'pp-card pp-pad pp-legacy' }, [node]) : null; };
    main.push(wrapSec(S.terms(p)));
    main.push(wrapSec(S.fever(p)));
    main.push(wrapSec(S.judge()));
    main.push(wrapSec(S.records(p)));
    main.push(wrapSec(S.ai()));

    /* この子の 記録（名前・学年・消す） */
    const nameIn = h('input', { class: 'pp-input', type: 'text', maxlength: String(MQ.save.NAME_MAX), value: p.name, 'aria-label': '名前' });
    const gradeRow = h('div', { class: 'pp-segrow' }, MQ.content.worlds.map(function (w) {
      const on = w.grade === g;
      return h('button', {
        class: 'pp-seg' + (on ? ' is-on' : '') + (w.locked ? ' is-off' : ''), type: 'button', text: '小' + w.grade,
        onclick: function () {
          MQ.sfx.tap();
          if (w.locked) { MQ.ui.toast('小' + w.grade + 'は準備中です'); return; }
          if (on) return;
          if (!window.confirm('学年を 小' + w.grade + ' に変えます。学期の設定は「すべて」にもどります。よろしいですか？')) return;
          MQ.save.setGrade(w.grade);
          MQ.ui.toast('学年を 小' + w.grade + ' にしました');
          render();
        }
      });
    }));
    main.push(h('section', { class: 'pp-section' }, [
      sec('この子の記録'),
      h('div', { class: 'pp-card pp-list' }, [
        h('div', { class: 'pp-line pp-line--col' }, [
          h('span', { text: '名前' }),
          h('div', { class: 'pp-line__in' }, [
            nameIn,
            btn('変更', 'pp-btn--s pp-btn--sm', function () {
              const v = nameIn.value.trim();
              if (!v) { MQ.ui.toast('名前を入れてください'); return; }
              if (MQ.save.setName(v)) { MQ.ui.toast('名前を「' + v + '」にしました'); render(); }
            })
          ])
        ]),
        h('div', { class: 'pp-line pp-line--col' }, [
          h('span', { text: '学年（学校の学年）' }),
          gradeRow,
          h('span', { class: 'pp-muted pp-small', text: '予習・復習は、子どもの地図の「小1〜小6」でいつでも切りかえられます。' })
        ]),
        h('div', { class: 'pp-line' }, [
          h('span', { class: 'pp-c-weak', text: 'この子の記録をすべて消す' }),
          btn('消す', 'pp-btn--s pp-btn--sm pp-btn--danger', function () {
            if (!window.confirm(p.name + ' さんの記録をすべて消します。もどせません。よろしいですか？')) return;
            MQ.save.deletePlayer(p.id);
            opened = false;
            MQ.ui.start.render();
            MQ.ui.show('screen-start');
          })
        ])
      ])
    ]));
    main.push(troubleSection(p));
    main.push(h('p', { class: 'pp-muted pp-small pp-center', text: 'バージョン ' + (MQ.version || '－') }));
    kids.push(h('div', { class: 'pp-main' }, main));
    return kids;
  }

  /* =======================================================
     こまったとき・感想を送る（v7.6）
     エラーの きろく（js/core/guard.js）と 端末の 情報を 文字に して
     コピー → LINE などで 作った 人に 送って もらう。外には 何も 送らない。
     ======================================================= */
  function feedbackText(p) {
    const d = new Date();
    const G = MQ.guard;
    const lines = [];
    lines.push('まなびモンスター かんそう・ふぐあい ' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate());
    const lv = MQ.hero && MQ.hero.levelFor ? MQ.hero.levelFor(p) : '?';   // levelFor は 数（level）
    const playG = MQ.save.playGrade ? MQ.save.playGrade(p) : (p.playGrade || p.grade);
    lines.push('バージョン ' + (MQ.version || '不明') + '／小' + (p.grade || 3) + ' ' + p.name + '（いま 小' + playG + 'の地図・Lv' + lv + '）');
    if (G) lines.push('端末: ' + G.device().text);
    try {
      const wk = MQ.stats.period(p, 'week');
      const al = MQ.stats.period(p, 'all');
      lines.push('あそんだ: たたかい ' + (p.battles || 0) + '回／問題 ' + al.n + '問・正答率 ' + (al.pct == null ? '－' : al.pct + '%') +
        '／今週 ' + wk.n + '問' + (wk.pct == null ? '' : '・' + wk.pct + '%'));
    } catch (e) {}
    try {
      const st = MQ.save.getSetting ? { sfx: MQ.save.getSetting('sfx', true), bgm: MQ.save.getSetting('bgm', true), speech: MQ.save.getSetting('speech', true) } : {};
      lines.push('せってい: おと ' + (st.sfx ? 'オン' : 'オフ') + '・きょく ' + (st.bgm ? 'オン' : 'オフ') + '・よみあげ ' + (st.speech ? 'オン' : 'オフ') +
        '・学期 ' + (p.term ? p.term + '学期まで' : 'ぜんぶ') + '・AIのかぎ ' + (MQ.ai && MQ.ai.ready && MQ.ai.ready() ? 'あり' : 'なし'));
    } catch (e) {}
    lines.push(G ? G.text() : 'さいきんの エラー: （きろく なし）');
    lines.push('---');
    lines.push('【ここに 書いてください】');
    lines.push('・どの画面で（地図／バトル／図かん／おうちの人ページ）');
    lines.push('・何をしたとき');
    lines.push('・どうなった（止まった／字が切れた／音が出ない など）');
    lines.push('・子どもの感想');
    return lines.join('\n');
  }

  function troubleSection(p) {
    const G = MQ.guard;
    const errs = G ? G.all() : [];
    const ta = h('textarea', { class: 'pp-ta pp-ta--fb', readonly: 'readonly', 'aria-label': '感想・不具合の文' });
    ta.value = feedbackText(p);
    const errList = h('div', { class: 'pp-errlist' }, errs.length ? errs.slice(0, 4).map(function (e) {
      const d = new Date(e.at);
      const when = isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '/' + d.getDate();
      return h('div', { class: 'pp-err' }, [
        h('span', { class: 'pp-err__when', text: when + (e.screen ? '・' + e.screen : '') + ((e.n || 1) > 1 ? '・×' + e.n : '') }),
        h('span', { class: 'pp-err__msg', text: e.msg + (e.src ? ' @' + e.src : '') })
      ]);
    }) : [h('span', { class: 'pp-muted pp-small', text: '最近のエラーはありません' })]);
    return h('section', { class: 'pp-section', id: 'pp-trouble' }, [
      sec('こまったとき・感想を送る'),
      h('div', { class: 'pp-card pp-list' }, [
        h('div', { class: 'pp-line pp-line--col' }, [
          h('span', { text: '画面が動かない・おかしいとき' }),
          h('span', { class: 'pp-muted pp-small', text: 'いちど開き直すと直ることが多いです。地図が出ないときは「小3の地図で開き直す」を試してください（記録は消えません）。' }),
          h('div', { class: 'pp-line__in' }, [
            btn('アプリを開き直す', 'pp-btn--s pp-btn--sm', function () { location.reload(); }),
            btn('小3の地図で開き直す', 'pp-btn--s pp-btn--sm', function () {
              MQ.save.update(function (pl) { pl.playGrade = 3; });
              location.reload();
            })
          ])
        ]),
        h('div', { class: 'pp-line pp-line--col' }, [
          h('span', { text: '最近のエラー（この端末の中だけに記録・外には送りません）' }),
          errList,
          errs.length ? h('div', { class: 'pp-line__in' }, [
            btn('エラーの記録を消す', 'pp-btn--s pp-btn--sm', function () { if (G) G.clear(); render(); })
          ]) : null
        ]),
        h('div', { class: 'pp-line pp-line--col' }, [
          h('span', { text: '感想・不具合を作った人に送る' }),
          h('span', { class: 'pp-muted pp-small', text: '下の文をコピーして、LINEなどに貼り付けて送ってください。端末・バージョン・エラーの記録が入ります（名前と成績の数字以外の個人情報は入りません）。' }),
          ta,
          h('div', { class: 'pp-line__in' }, [
            btn('文字でコピー', 'pp-btn--p pp-btn--sm', function () { copyText(ta.value); }, 'copy')
          ])
        ])
      ])
    ]);
  }

  /* =======================================================
     先生用 レポート（画面で 見る・印刷）
     ======================================================= */
  const MARK = { good: '◎', mid: '○', weak: '△', few: '・', none: '－' };

  function reportView(p) {
    const g = gradeOf(p);
    const r = MQ.stats.report(p, g);
    const pr = r.period;
    const kids = [];
    kids.push(h('header', { class: 'pp-head' }, [
      backLink('レポートにもどる', function () { open('home'); }),
      h('span', { class: 'pp-title', text: '先生に見せるレポート' }),
      h('span', { class: 'pp-muted pp-small', text: '今週（' + pr.label + '）の学習のまとめ。印刷・PDFにして渡せます。' })
    ]));
    const main = [];
    main.push(h('section', { class: 'pp-actions pp-actions--top' }, [
      btn('印刷・PDFにする（A4）', 'pp-btn--p pp-btn--lg', function () { printReport(p, g); }, 'print'),
      btn('文字でコピー', 'pp-btn--s', function () { copyText(MQ.stats.summaryText(p, g)); }, 'copy')
    ]));
    /* 画面用の プレビュー（たてに ならべる） */
    const prev = h('div', { class: 'pp-card pp-report' });
    prev.appendChild(h('div', { class: 'pp-report__hd' }, [
      h('span', { class: 'pp-kicker', text: 'まなびモンスター　学習レポート' }),
      h('span', { class: 'pp-title', text: p.name + ' さん　' }),
      h('span', { class: 'pp-muted pp-small', text: '小学' + g + '年　期間 ' + pr.label + '　作成 ' + MQ.stats.mdLabel(r.madeAt) })
    ]));
    prev.appendChild(h('div', { class: 'pp-report__tiles' }, [
      rtile('解いた問題', pr.n + '問', pr.prev && pr.prev.n ? '先週 ' + pr.prev.n + '問' : ''),
      rtile('正答率（1回目）', pr.pct == null ? '－' : pr.pct + '%', pr.prev && pr.prev.pct != null ? '先週 ' + pr.prev.pct + '%' : ''),
      rtile('学習した日', pr.days + '/7日', pr.n ? '1日 約' + Math.round(pr.n / Math.max(1, pr.days)) + '問' : ''),
      rtile('8週間の正答率', r.growth.first && r.growth.last && r.growth.first !== r.growth.last ? r.growth.first.pct + '→' + r.growth.last.pct + '%' : '－', r.growth.delta != null ? (r.growth.delta >= 0 ? '＋' : '－') + Math.abs(r.growth.delta) + 'ポイント' : '')
    ]));
    if (r.rows.length) {
      const t = h('table', { class: 'pp-tbl' }, [
        h('thead', {}, [h('tr', {}, [h('th', { text: '教科' }), h('th', { text: '単元' }), h('th', { class: 'r', text: '正答率' }), h('th', { class: 'r', text: '正解/出題' }), h('th', { text: '' })])]),
        h('tbody', {}, r.rows.map(function (s, i) {
          const prevArea = i > 0 ? r.rows[i - 1].areaName : null;
          return h('tr', { class: s.level === 'weak' ? 'is-weak' : '' }, [
            h('td', { text: s.areaName !== prevArea ? s.areaName : '' }),
            h('td', { text: s.name }),
            h('td', { class: 'r pp-num', text: s.pct == null ? '–' : s.pct + '%' }),
            h('td', { class: 'r', text: s.recentOk + ' / ' + s.recentN }),
            h('td', { text: MARK[s.level] })
          ]);
        }))
      ]);
      prev.appendChild(h('div', { class: 'pp-report__sec' }, [
        h('div', { class: 'pp-sec' }, [h('h3', { class: 'pp-h pp-h--s', text: '単元別の正答率' }), h('span', { class: 'pp-muted pp-tiny', text: '◎85%以上 ○60〜84% △60%未満 ・5問未満' })]),
        t,
        r.notYet.length ? h('p', { class: 'pp-muted pp-tiny', text: 'まだ学習していない単元：' + r.notYet.map(function (x) { return x.name + ' ' + x.n; }).join('・') }) : null
      ]));
    } else {
      prev.appendChild(h('p', { class: 'pp-muted', text: 'まだ記録がありません。' }));
    }
    if (r.wrong.length) {
      prev.appendChild(h('div', { class: 'pp-report__sec' }, [
        h('div', { class: 'pp-sec' }, [h('h3', { class: 'pp-h pp-h--s', text: 'つまずいている問題' }), h('span', { class: 'pp-muted pp-tiny', text: 'まちがえた回数の多い順' })]),
        h('div', { class: 'pp-list' }, r.wrong.map(function (w) {
          return h('div', { class: 'pp-q' }, [
            h('div', { class: 'pp-q__top' }, [h('span', { class: 'pp-q__t', text: w.p }), h('span', { class: 'pp-tag', text: w.miss + '回' })]),
            h('div', { class: 'pp-q__a' }, [
              h('span', {}, [h('span', { class: 'pp-muted', text: '答え ' }), h('b', { class: 'pp-c-weak', text: w.g || '－' })]),
              h('span', {}, [h('span', { class: 'pp-muted', text: '正答 ' }), h('b', { text: w.a || '－' })]),
              h('span', { class: 'pp-muted', text: w.stage })
            ])
          ]);
        }))
      ]));
    }
    if (r.notes.length) {
      prev.appendChild(h('div', { class: 'pp-report__notes' }, [
        h('span', { class: 'pp-h pp-h--s', text: 'アプリからの見立て' }),
        h('ul', {}, r.notes.map(function (t) { return h('li', { text: t }); }))
      ]));
    }
    prev.appendChild(h('p', { class: 'pp-muted pp-tiny', text: '正答率は1回目に正解した割合。2回目で正解した問題は含みません。' }));
    main.push(prev);
    kids.push(h('div', { class: 'pp-main' }, main));
    return kids;
  }
  function rtile(label, v, sub) {
    return h('div', { class: 'pp-rtile' }, [h('span', { class: 'pp-muted pp-tiny', text: label }), h('span', { class: 'pp-num', text: v }), h('span', { class: 'pp-muted pp-tiny', text: sub })]);
  }

  /* A4 の HTML（印刷・PDF 用）。数字は report() から */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reportHtml(p, g) {
    const r = MQ.stats.report(p, g);
    const pr = r.period;
    const gr = r.growth;
    const d = r.madeAt;
    const fmt = function (x) { return x.getFullYear() + '年' + (x.getMonth() + 1) + '月' + x.getDate() + '日'; };
    const colorOf = { good: '#2e8b3f', mid: '#d99a1e', weak: '#c8413b', few: '#cfc9bd', none: '#cfc9bd' };
    const tile = function (label, v, sub) { return '<div class="t"><span class="m">' + esc(label) + '</span><span class="n">' + v + '</span><span class="m">' + esc(sub) + '</span></div>'; };
    let rows = '';
    let prevArea = null;
    r.rows.forEach(function (s) {
      const w = s.level === 'weak' ? ' class="w"' : '';
      rows += '<tr><td>' + (s.areaName !== prevArea ? esc(s.areaName) : '') + '</td><td' + w + '>' + esc(s.name) + '</td><td><div class="bar"><i style="width:' + (s.pct || 0) + '%;background:' + colorOf[s.level] + '"></i></div></td><td class="r n"' + w + '>' + (s.pct == null ? '–' : s.pct + '%') + '</td><td class="r">' + s.recentOk + ' / ' + s.recentN + '</td><td' + w + '>' + MARK[s.level] + '</td></tr>';
      prevArea = s.areaName;
    });
    let wrong = '';
    r.wrong.forEach(function (w) {
      wrong += '<tr><td>' + esc(w.stage) + '</td><td>' + esc(w.p) + '</td><td class="w">' + esc(w.g) + '</td><td>' + esc(w.a) + '</td><td class="r">' + w.miss + '回</td></tr>';
    });
    const notes = r.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    const growthV = gr.first && gr.last && gr.first !== gr.last ? gr.first.pct + '<small>→</small>' + gr.last.pct + '<small>%</small>' : '－';
    return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + esc(p.name) + ' さん 学習レポート</title>' +
      '<meta name="viewport" content="width=device-width">' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap">' +
      '<style>' +
      '@page{size:A4;margin:14mm 12mm}body{margin:0;background:#fff;color:#26231f;font-family:"BIZ UDPGothic","Hiragino Sans","Yu Gothic","Meiryo",sans-serif;font-size:11pt;line-height:1.55}' +
      '.pg{max-width:794px;margin:0 auto;padding:40px 44px;display:flex;flex-direction:column;gap:22px}' +
      '.h{font-family:"Zen Kaku Gothic New","Hiragino Sans","Yu Gothic",sans-serif;font-weight:700}.n{font-family:"Zen Kaku Gothic New",sans-serif;font-weight:900;font-variant-numeric:tabular-nums}' +
      '.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:3px solid #26231f}.k{font-size:9pt;letter-spacing:.14em;color:#a8741a}.name{font-size:20pt;line-height:1.2}.m{color:#756f64;font-size:9.5pt}' +
      '.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.t{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid #e7e2d7;border-radius:10px}.t .n{font-size:20pt;line-height:1.1}.t small{font-size:10pt}' +
      'table{width:100%;border-collapse:collapse;font-size:10.5pt}th{text-align:left;font-weight:700;color:#756f64;font-size:9.5pt;padding:5px 8px;border-bottom:2px solid #26231f}td{padding:6px 8px;border-bottom:1px solid #e7e2d7;vertical-align:top}.r{text-align:right}.w{color:#c8413b}' +
      '.bar{position:relative;height:6px;border-radius:3px;background:#ece8df;overflow:hidden;min-width:120px}.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px}' +
      '.sec{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 6px;font-size:12pt}.notes{padding:12px 14px;background:#f7f5ef;border-radius:10px}.notes ul{margin:4px 0 0;padding-left:18px}' +
      '.ft{margin-top:auto;display:flex;justify-content:space-between;font-size:8.5pt;color:#9a9488;border-top:1px solid #e7e2d7;padding-top:8px}' +
      '@media print{.pg{padding:0}}' +
      '</style></head><body><div class="pg">' +
      '<div class="hd"><div><div class="h k">まなびモンスター　学習レポート</div><div class="h name">' + esc(p.name) + ' さん　<span style="font-size:12pt;font-weight:500;color:#756f64">小学' + g + '年</span></div></div>' +
      '<div class="m" style="text-align:right">期間　' + esc(pr.from ? fmt(pr.from) + ' – ' + (pr.to.getMonth() + 1) + '月' + pr.to.getDate() + '日' : '') + '<br>作成　' + esc(fmt(d)) + '</div></div>' +
      '<div class="tiles">' +
      tile('解いた問題', pr.n + '<small>問</small>', pr.prev && pr.prev.n ? '先週 ' + pr.prev.n + '問' : '') +
      tile('正答率（1回目）', pr.pct == null ? '－' : pr.pct + '<small>%</small>', pr.prev && pr.prev.pct != null ? '先週 ' + pr.prev.pct + '%' : '') +
      tile('学習した日', pr.days + '<small>/7日</small>', pr.n ? '1日 約' + Math.round(pr.n / Math.max(1, pr.days)) + '問' : '') +
      tile('8週間の正答率', growthV, gr.delta != null ? (gr.delta >= 0 ? '＋' : '－') + Math.abs(gr.delta) + 'ポイント' : '') +
      '</div>' +
      (r.rows.length ? '<div><div class="sec"><span class="h">単元別の正答率</span><span class="m">最近20問の1回目正答率　◎ 85%以上　○ 60〜84%　△ 60%未満　・ 5問未満</span></div>' +
        '<table><thead><tr><th style="width:64px">教科</th><th>単元</th><th style="width:180px"></th><th class="r" style="width:60px">正答率</th><th class="r" style="width:80px">正解/出題</th><th style="width:36px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        (r.notYet.length ? '<p class="m" style="margin:6px 0 0">まだ学習していない単元：' + esc(r.notYet.map(function (x) { return x.name + ' ' + x.n; }).join('・')) + '</p>' : '') + '</div>' : '<p class="m">まだ記録がありません。</p>') +
      (r.wrong.length ? '<div><div class="sec"><span class="h">つまずいている問題</span><span class="m">まちがえた回数の多い順</span></div>' +
        '<table><thead><tr><th style="width:120px">単元</th><th>問題</th><th style="width:96px">子どもの答え</th><th style="width:96px">正答</th><th class="r" style="width:50px">回数</th></tr></thead><tbody>' + wrong + '</tbody></table></div>' : '') +
      (notes ? '<div class="notes"><span class="h">アプリからの見立て</span><ul>' + notes + '</ul></div>' : '') +
      '<div class="ft"><span>正答率は1回目に正解した割合。2回目で正解した問題は含みません。</span><span>まなびモンスター</span></div>' +
      '</div><script>window.addEventListener("load",function(){setTimeout(function(){try{window.print();}catch(e){}},400);});</script></body></html>';
  }

  function printReport(p, g) {
    const html = reportHtml(p, g);
    let w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (!w) { MQ.ui.toast('別の画面を開けませんでした。ブラウザのポップアップ設定を確認してください'); return; }
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) { MQ.ui.toast('レポートを開けませんでした'); }
  }

  /* 文字を コピー（LINE や メールに はりつける 用）。できない 端末は 文を 出して ながおし */
  function copyText(text) {
    const done = function () { MQ.ui.toast('コピーしました。LINEやメールに貼り付けられます'); };
    const fallback = function () {
      const ta = h('textarea', { class: 'pp-ta', readonly: 'readonly', 'aria-label': '学習レポート' });
      ta.value = text;
      const box = h('div', { class: 'pp-card pp-pad pp-tabox' }, [
        h('p', { class: 'pp-muted pp-small', style: { margin: '0 0 6px' }, text: '長押しで全部選んでコピーしてください' }),
        ta,
        btn('とじる', 'pp-btn--s pp-btn--sm', function () { box.remove(); })
      ]);
      const main = document.querySelector('#screen-parent .pp-main');
      if (main) main.insertBefore(box, main.firstChild);
      try { ta.focus(); ta.select(); } catch (e) {}
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  return {
    open: open, refresh: refresh, isOpen: isOpen, render: render,
    reportHtml: reportHtml,
    setKind: function (k) { kind = k; },
    view: function () { return view; }
  };
})();
