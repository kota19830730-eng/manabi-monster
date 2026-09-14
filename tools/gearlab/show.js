/* そうび 8グレードの できあがり（v13.19）。ゲームの 本物の 絵（MQ.hero.sprite → 3D）と オーラ（MQ.ui.gearAura）で ならべる */
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
  const NOTE = {
    kihon: 'たびの かわぼうし（みどりの はね）・かわの ベスト・まるい 木の たて・みじかい 鉄の けん',
    tetsu: 'きしの かぶと（金の ひたい当て）・銀の よろい・十字の たて・長い けん',
    ryu: '金の つのと りゅうの 目・左かたに かぎづめ・りゅうの 顔の たて・ほのおの けん',
    densetsu: '白い はねの 金の かぶと・たいようの かた当て・青い たいようの たて・青く 光る けん',
    hoshi: 'ひたいに 星の 銀の かぶと・星の とんがりの かた当て・星の たて・星の つばの けん',
    yami: '光る スリットの 黒い かぶと・とげ 3本・光る 目の たて・光る もじの 大けん',
    capsule: 'アンテナの まるい ヘルメット・カプセルの かた当てと たて・光の 刃の けん',
    aurora: '金の 王冠の かぶと・はねの かた当て・クリスタルの たて・光る ふちの けん'
  };
  const AURA = { kihon: 'みどりの つぶ', tetsu: '白い 光の つぶ', ryu: 'ほのお', densetsu: '金の 光の はしら', hoshi: 'またたく 星', yami: '黒い けむりと 火の粉', capsule: '水色の あわ', aurora: 'むらさきの 光の はしら' };
  const look = MQ.hero.lookOf({});
  const root = document.getElementById('lab');
  let scale = 1.8;

  function player(gid) {
    const eq = {};
    MQ.hero.slots.forEach(function (s) { eq[s] = gid + '-' + s; });
    return { name: 'こうた', look: look, equipped: eq };
  }
  function slot(gid) {
    const arena = h('div', { class: 'arena', style: 'transform:scale(' + scale + ')' }, [h('div', { class: 'arena__hill' }), h('div', { class: 'arena__floor' })]);
    const hb = h('div', { class: 'arena__hero' });
    const sc = MQ.ui.v3.hero(player(gid), 84, { ry: 22, mo: 'mo-idle' });
    hb.appendChild(sc);
    MQ.ui.gearAura.attach(sc, player(gid), 1);
    arena.appendChild(hb);
    const fb = h('div', { class: 'arena__foe' });
    try { fb.appendChild(MQ.ui.v3.monster('slime-green', 56, { ry: -22, mo: 'mo-menace' })); } catch (e) {}
    arena.appendChild(fb);
    return h('div', { class: 'slot', style: 'height:' + (150 * scale) + 'px' }, [arena]);
  }
  function render() {
    root.textContent = '';
    root.appendChild(h('header', { class: 'top' }, [
      h('h1', { text: 'そうび 8グレードの できあがり' }),
      h('p', { html: 'ゲームに入れた新しいそうびです（まだ公開していません）。8グレードとも<b>りんかくから</b>ちがい、5点そろえると<b>グレードごとのオーラ</b>が出ます。上はバトル画面と同じ大きさ、下はメニューの「じぶん」の絵です。' })
    ]));
    const sbar = h('div', { class: 'seg' }, [h('span', { class: 'seg__label', text: '見る 大きさ' })]);
    [[1, 'スマホ（×1）'], [1.8, 'タブレット（×1.8）']].forEach(function (s) {
      sbar.appendChild(h('button', { class: 'chip' + (s[0] === scale ? ' is-on' : ''), onclick: function () { scale = s[0]; render(); } }, [s[1]]));
    });
    root.appendChild(h('div', { class: 'bar' }, [sbar]));
    const cols = h('div', { class: 'cols', style: '--colw:' + Math.max(260, 184 * scale + 4) + 'px' });
    MQ.hero.grades.forEach(function (g) {
      const img = MQ.ui.heroImg ? MQ.ui.heroImg(player(g.id), 'show__img') : h('img', { class: 'sprite show__img is-gearaura ga--' + g.id, src: MQ.hero.sprite(player(g.id)) });
      cols.appendChild(h('article', { class: 'col' + (g.aurora ? ' is-rec' : '') }, [
        h('div', { class: 'col__head' }, [h('span', { class: 'col__tag', text: g.name }), h('span', { class: 'col__name', text: g.how })]),
        slot(g.id),
        h('div', { class: 'show__menu' }, [img]),
        h('div', { class: 'col__note' }, [h('span', { html: NOTE[g.id] }), h('span', { html: '5点そろえると：<b>' + AURA[g.id] + '</b>' })])
      ]));
    });
    root.appendChild(h('section', { class: 'sec' }, [h('h2', {}, ['8グレード', h('small', { text: 'ゆれるのはゲームと同じ待機の動き' })]), cols]));
  }
  render();
})();
