/* そうびの すがた 見くらべ（tools/gearlab）。ゲームの 本物の 描き方（pixel.js の HD → vox.js の 3D）で 出す */
(function () {
  function h(tag, attrs, kids) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'style') el.style.cssText = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  const GRADES = [
    { id: 'tetsu',  name: 'てつ',     dot: '#aebfe3' },
    { id: 'ryu',    name: 'りゅう',   dot: '#e05a26' },
    { id: 'yami',   name: 'やみ',     dot: '#8a6be0' },
    { id: 'aurora', name: 'オーロラ', dot: '#cdb8ff' }
  ];
  const COLS = [
    { id: 'now', tag: 'いま',    name: 'いまの そうび' },
    { id: 'B',   tag: 'B',       name: '見せ方を 変える' },
    { id: 'A',   tag: 'B＋A',    name: 'グレードごとの 形' },
    { id: 'C',   tag: 'B＋A＋C', name: 'オーラも つける', rec: true }
  ];
  const NOTE = {
    now: function () {
      return ['どのグレードも「てつ」の形に四角を2〜6個足しただけで、<b>色ちがいに見える</b>。',
              '<b>たてが体の前をふさぎ</b>、よろいが見えない。かぶとは髪の上に色をぬった形で、<b>髪に見える</b>。'];
    },
    B: function () {
      return ['<b>たてを左うでの横へ</b>ずらして、よろいを見せる。<b>けんを太く長く</b>、つばも大きく。',
              'かぶとに<b>金のひたい当てとほほ当て</b>を付けて、髪と見分けがつくように。肩当て・こて・ひざ・くつも足す。',
              '形はどのグレードも同じで、色だけちがう（ここが A との差）。'];
    },
    A: {
      tetsu: ['「てつ」は B の形そのもの（きしの基本形）。', 'ほかのグレードは、ここから<b>輪郭ごと</b>変える。'],
      ryu: ['かぶとに<b>金のつのとりゅうの目</b>。<b>左肩に金のかぎづめ3本</b>。',
            'たては<b>りゅうの顔のまるいたて</b>。けんは<b>ほのおのギザギザ</b>と光るしん。マントのすそがほのお。'],
      yami: ['かぶとに<b>光るスリットのひさし</b>とつの。<b>左肩にとげ3本</b>（先が光る）。',
             'たては<b>光る目のカイト形</b>。けんは<b>光る文字の大けん</b>。マントのすそはボロボロ。'],
      aurora: ['かぶとは<b>金の王冠</b>と宝石。<b>左肩ははねのような3だん</b>。',
               'たては<b>クリスタルに大きな宝石</b>。けんは<b>光るふち</b>と<b>金のはねのつば</b>。']
    },
    C: {
      tetsu: ['5点そろえたとき、<b>白い光のつぶ</b>がのぼる。', 'いまはオーロラだけ光る → <b>どのグレードにも</b>そろえたごほうびの光。'],
      ryu: ['5点そろえたとき、<b>足もとからほのお</b>がふき上がる。', 'いまはオーロラだけ光る → どのグレードにも。'],
      yami: ['5点そろえたとき、<b>黒いけむりと光る火の粉</b>。', 'いまはオーロラだけ光る → どのグレードにも。'],
      aurora: ['5点そろえたとき、<b>光の柱と金のきらめき</b>（いまの光を強くした形）。', '一番出にくいそうびが、一番はでに見える。']
    }
  };

  const look = MQ.hero.lookOf({});
  const origSprite = MQ.hero.sprite;
  MQ.hero.sprite = function (p, o) { return p && p.__src ? p.__src : origSprite(p, o); };

  function srcOf(gid, col) {
    if (col === 'now') {
      const eq = {};
      MQ.hero.slots.forEach(function (s) { eq[s] = gid + '-' + s; });
      return origSprite({ name: 'こうた', look: look, equipped: eq });
    }
    return MQ.gearProto.sprite({ look: look }, gid, col === 'B' ? 'B' : 'A');
  }

  function aura(gid, front, k) {
    const a = h('div', { class: 'aura aura--' + gid + ' aura--' + (front ? 'front' : 'back'), style: '--k:' + k });
    if (!front) {
      a.appendChild(h('div', { class: 'aura__glow' }));
      a.appendChild(h('div', { class: 'aura__floor' }));
      if (gid === 'aurora') [18, 40, 62, 80].forEach(function (x, i) {
        a.appendChild(h('i', { class: 'aura__pillar', style: 'left:' + x + '%;animation-delay:' + (-i * 0.6) + 's' }));
      });
    }
    const P = front ? [[14, 0], [82, .7], [22, 1.4], [74, 2.0]] : [[8, .3], [30, 1.1], [62, .6], [90, 1.7], [20, 2.1], [48, 1.5], [78, .9], [38, 2.4]];
    P.forEach(function (p, i) {
      const d = gid === 'yami' ? 3.2 : gid === 'ryu' ? 1.5 : 2.4;
      a.appendChild(h('i', { class: 'aura__p', style: 'left:' + p[0] + '%;--d:' + (d + (i % 3) * 0.3) + 's;--w:' + (-p[1]) + 's' }));
    });
    return a;
  }

  function hero3d(box, src, size, unit, gid, withAura) {
    if (withAura) box.appendChild(aura(gid, false, size / 84));
    box.appendChild(MQ.ui.v3.hero({ __src: src }, size, { ry: 22, unit: unit, mo: 'mo-idle' }));
    if (withAura) box.appendChild(aura(gid, true, size / 84));
  }

  let grade = (location.hash.match(/g=([a-z]+)/) || [])[1] || 'ryu', scale = 1.8;
  const root = document.getElementById('lab');

  function battleSlot(gid, col) {
    const arena = h('div', { class: 'arena', style: 'transform:scale(' + scale + ')' }, [
      h('div', { class: 'arena__hill' }), h('div', { class: 'arena__floor' })
    ]);
    const hb = h('div', { class: 'arena__hero' });
    hero3d(hb, srcOf(gid, col), 84, 2, gid, col === 'C');
    arena.appendChild(hb);
    const fb = h('div', { class: 'arena__foe' });
    try { fb.appendChild(MQ.ui.v3.monster('slime-green', 56, { ry: -22, mo: 'mo-menace' })); } catch (e) {}
    arena.appendChild(fb);
    return h('div', { class: 'slot', style: 'width:' + (184 * scale) + 'px;height:' + (150 * scale) + 'px' }, [arena]);
  }
  function bigSlot(gid, col) {
    const hb = h('div', { class: 'big__hero' });
    hero3d(hb, srcOf(gid, col), 220, 4, gid, col === 'C');
    return h('div', { class: 'big' }, [hb]);
  }
  function noteOf(gid, col) {
    const n = NOTE[col];
    return typeof n === 'function' ? n() : n[gid];
  }

  function render() {
    root.textContent = '';
    root.appendChild(h('header', { class: 'top' }, [
      h('h1', { text: 'そうびの すがた 見くらべ' }),
      h('p', { html: 'いまの装備と、案 B（見せ方）・A（グレードごとの形）・C（オーラ）を、<b>ゲームと同じ描き方</b>（2D の絵 → 3D の箱）で並べました。まだゲームには入れていません。' })
    ]));

    const gbar = h('div', { class: 'seg' }, [h('span', { class: 'seg__label', text: 'グレード' })]);
    GRADES.forEach(function (g) {
      gbar.appendChild(h('button', { class: 'chip' + (g.id === grade ? ' is-on' : ''), onclick: function () { grade = g.id; render(); } },
        [h('span', { class: 'chip__dot', style: 'background:' + g.dot }), g.name]));
    });
    const sbar = h('div', { class: 'seg' }, [h('span', { class: 'seg__label', text: '見る 大きさ' })]);
    [[1, 'スマホ（×1）'], [1.8, 'タブレット（×1.8）']].forEach(function (s) {
      sbar.appendChild(h('button', { class: 'chip' + (s[0] === scale ? ' is-on' : ''), onclick: function () { scale = s[0]; render(); } }, [s[1]]));
    });
    root.appendChild(h('div', { class: 'bar' }, [gbar, sbar]));

    const cols = h('div', { class: 'cols', style: '--colw:' + Math.max(280, 184 * scale + 4) + 'px' });
    COLS.forEach(function (c) {
      const col = h('article', { class: 'col' + (c.rec ? ' is-rec' : '') }, [
        h('div', { class: 'col__head' }, [h('span', { class: 'col__tag' + (c.id === 'now' ? ' col__tag--now' : ''), text: c.tag }), h('span', { class: 'col__name', text: c.name })]),
        battleSlot(grade, c.id),
        bigSlot(grade, c.id),
        h('div', { class: 'col__note' }, noteOf(grade, c.id).map(function (t) { return h('span', { html: t }); }))
      ]);
      cols.appendChild(col);
    });
    root.appendChild(h('section', { class: 'sec' }, [
      h('h2', {}, ['バトルでの 見え方', h('small', { text: '上＝バトル画面と同じ大きさ（主人公 84px をタブレットの倍率で）／下＝大きくしたもの。ゆれるのはゲームと同じ待機の動き' })]),
      cols
    ]));

    // メニュー（2D）
    const table = h('table', {}, []);
    const hr = h('tr', {}, [h('th', { text: '' })]);
    ['いま', 'B 見せ方', 'B＋A 形'].forEach(function (t) { hr.appendChild(h('th', { text: t })); });
    table.appendChild(hr);
    GRADES.forEach(function (g) {
      const tr = h('tr', {}, [h('th', { text: g.name })]);
      ['now', 'B', 'A'].forEach(function (c) {
        tr.appendChild(h('td', { class: g.id === grade ? 'is-sel' : '' }, [h('img', { src: srcOf(g.id, c), alt: g.name + ' ' + c })]));
      });
      table.appendChild(tr);
    });
    root.appendChild(h('section', { class: 'sec' }, [
      h('h2', {}, ['メニューでの 見え方（4グレード）', h('small', { text: '「じぶん」の画面に出る 2D の絵。A は輪郭がグレードごとにちがう' })]),
      h('div', { class: 'grid2d' }, [table])
    ]));

    root.appendChild(h('section', { class: 'plan' }, [
      h('h2', { text: 'おすすめの 進め方' }),
      h('ol', {}, [
        h('li', { html: '<b>B 見せ方</b>：たて・けん・かぶと・よろいの土台を作り直す（全グレードに効く）' }),
        h('li', { html: '<b>A 形</b>：でんせつ・ほし・やみ・オーロラ（がんばって手に入れるもの）から、グレードごとの輪郭を描く' }),
        h('li', { html: '<b>C オーラ</b>：5点そろえたときの光を、全グレードに' })
      ]),
      h('p', { text: 'のこりの かわ・カプセルと、ここに出していない でんせつ・ほしも、同じ作り方で描きます。' })
    ]));
  }
  render();
})();
