/* ---------------------------------------------------------
   写真から じぶんの モンスターを つくる

   ① カメラで 紙に かいた 絵を とる
   ② わくを あわせて 1体ぶんを かこむ
   ③ 白い紙を すけさせて、24×24マスの ドット絵に する
      （そのまま 写真を 出すと ほかの 敵から うくので、
        かならず ドット絵に そろえるのが 大事）
   ④ なまえと 出てくる エリアを えらぶ
   ⑤ つぎの バトルから ほんとうに 出てくる／図かんにも のる

   写真は 外に 送りません。24×24に した 小さな 絵だけを
   タブレットの 中に ほぞんします（1体 数キロバイト）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.photo = (function () {
  const h = MQ.util.h;
  const SIZE = 24;          // ドット絵の マス数
  let img = null;           // 読みこんだ 写真
  let crop = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };   // わく（0〜1の わりあい）
  let threshold = 200;
  let outUrl = '';

  /* =======================================================
     写真 → ドット絵
     ======================================================= */
  function build() {
    if (!img) return '';
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;

    const sx = Math.round(img.naturalWidth * crop.x);
    const sy = Math.round(img.naturalHeight * crop.y);
    const sw = Math.max(1, Math.round(img.naturalWidth * crop.w));
    const sh = Math.max(1, Math.round(img.naturalHeight * crop.h));
    x.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE);

    let data;
    try { data = x.getImageData(0, 0, SIZE, SIZE); } catch (e) { return c.toDataURL(); }
    const p = data.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum >= threshold) {
        p[i + 3] = 0;                       // 白い紙は すけさせる
        continue;
      }
      // 色を すこし はっきりさせて、ドット絵らしく 段を へらす
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const boost = mx - mn > 18 ? 1.35 : 1;
      const q = function (v) {
        const mid = (mx + mn) / 2;
        let out = mid + (v - mid) * boost;
        out = Math.round(Math.max(0, Math.min(255, out)) / 32) * 32;
        return Math.max(0, Math.min(255, out));
      };
      p[i] = q(r); p[i + 1] = q(g); p[i + 2] = q(b);
      p[i + 3] = 255;
    }
    x.putImageData(data, 0, 0);
    return c.toDataURL('image/png');
  }

  /* =======================================================
     画面
     ======================================================= */
  function render() {
    const player = MQ.save.current();
    if (!player) return;

    const fileIn = h('input', { class: 'file', type: 'file', accept: 'image/*', capture: 'environment' });
    const stage = h('div', { class: 'photo__stage' });
    const preview = h('img', { class: 'photo__out', alt: 'できあがり' });
    const nameIn = h('input', { class: 'input', type: 'text', maxlength: '8', placeholder: 'モンスターの なまえ' });

    let areaId = 'sansu';
    const areaChips = h('div', { class: 'chips' }, MQ.content.subjectAreas().map(function (a) {
      const b = h('button', {
        class: 'chip' + (areaId === a.id ? ' is-on' : ''), type: 'button', text: a.name,
        onclick: function () {
          areaId = a.id;
          MQ.sfx.tap();
          areaChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
        }
      });
      return b;
    }));

    const slider = h('input', {
      class: 'slider', type: 'range', min: '120', max: '245', value: String(threshold)
    });
    slider.addEventListener('input', function () {
      threshold = Number(slider.value);
      refresh();
    });

    // できあがりの みほん。しゃしんを とるまでは かくしておく
    const previewRow = h('div', { class: 'photo__preview', hidden: 'hidden' }, [
      preview,
      h('div', { style: { flex: '1' } }, [
        h('p', { class: 'note', style: { margin: '0 0 6px' }, text: '白い ところを 消す 強さ' }),
        slider
      ])
    ]);

    function refresh() {
      outUrl = build();
      preview.src = outUrl || '';
      previewRow.hidden = !outUrl;   // まだ しゃしんが ない ときは かくす
    }

    /* ---- わく（ドラッグして 動かす／右下で 大きさ） ---- */
    function drawStage() {
      stage.innerHTML = '';
      if (!img) {
        stage.appendChild(h('p', { class: 'note', style: { padding: '20px', textAlign: 'center' }, text: 'まず したの ボタンで しゃしんを とってね' }));
        return;
      }
      const el = h('img', { class: 'photo__img', src: img.src, alt: '' });
      const box = h('div', { class: 'photo__crop' });
      const handle = h('div', { class: 'photo__handle' });
      box.appendChild(handle);
      stage.appendChild(el);
      stage.appendChild(box);

      function place() {
        const r = el.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        const left = r.left - s.left, top = r.top - s.top;
        box.style.left = (left + r.width * crop.x) + 'px';
        box.style.top = (top + r.height * crop.y) + 'px';
        box.style.width = (r.width * crop.w) + 'px';
        box.style.height = (r.height * crop.h) + 'px';
      }
      el.addEventListener('load', place);
      setTimeout(place, 30);
      window.addEventListener('resize', place);

      let mode = null, startPt = null, startCrop = null;
      function down(e, m) {
        e.preventDefault();
        e.stopPropagation();
        mode = m;
        startPt = { x: e.clientX, y: e.clientY };
        startCrop = Object.assign({}, crop);
        try { (m === 'size' ? handle : box).setPointerCapture(e.pointerId); } catch (err) {}
      }
      function move(e) {
        if (!mode) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - startPt.x) / r.width;
        const dy = (e.clientY - startPt.y) / r.height;
        if (mode === 'move') {
          crop.x = Math.max(0, Math.min(1 - startCrop.w, startCrop.x + dx));
          crop.y = Math.max(0, Math.min(1 - startCrop.h, startCrop.y + dy));
        } else {
          const s = Math.max(dx, dy);
          const w = Math.max(0.08, Math.min(1 - startCrop.x, startCrop.w + s));
          crop.w = w;
          crop.h = Math.max(0.08, Math.min(1 - startCrop.y, startCrop.h + s));
        }
        place();
        refresh();
      }
      function up() { mode = null; }
      box.addEventListener('pointerdown', function (e) { down(e, 'move'); });
      handle.addEventListener('pointerdown', function (e) { down(e, 'size'); });
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    fileIn.addEventListener('change', function () {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      MQ.sfx.shutter();
      const r = new FileReader();
      r.onload = function () {
        const im = new Image();
        im.onload = function () {
          img = im;
          crop = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };
          drawStage();
          refresh();
        };
        im.src = String(r.result);
      };
      r.readAsDataURL(f);
    });

    function save() {
      if (!img || !outUrl) { MQ.ui.toast('まず しゃしんを とってね'); return; }
      const name = (nameIn.value || '').trim();
      if (!name) { MQ.ui.toast('なまえを 入れてね'); return; }
      const mon = { id: 'my-' + MQ.util.uid(), name: name, area: areaId, png: outUrl };
      MQ.save.update(function (p) {
        MQ.save.addCustom(p, mon);
        MQ.save.addLog(p, 'じぶんの モンスター「' + name + '」を つくった');
      });
      MQ.ui.syncCustom();
      MQ.sfx.rare();
      MQ.ui.toast(name + ' が なかまに なった！ バトルに 出てくるよ');
      img = null; outUrl = '';
      MQ.ui.dex.render('mons');
      MQ.ui.show('screen-dex');
    }

    /* ---- じぶんの モンスター 一覧 ---- */
    const mine = (player.custom || []).map(function (m) {
      const area = MQ.content.areaOf(m.area);
      return h('div', { class: 'cell' }, [
        MQ.blocks.imgBox(m.png, { size: 52, cls: 'cell__img' }),
        h('span', { class: 'cell__name', text: m.name }),
        h('span', { class: 'cell__tag', text: area ? area.short : '' }),
        h('button', {
          class: 'btn btn--small btn--danger', type: 'button', text: '消す',
          onclick: function () {
            if (!window.confirm(m.name + ' を 消しますか？')) return;
            MQ.save.update(function (p) { MQ.save.removeCustom(p, m.id); });
            MQ.ui.syncCustom();
            render();
          }
        })
      ]);
    });

    MQ.ui.mount('screen-dex', h('div', { class: 'wrap' }, [
      h('h2', { class: 'label', text: 'じぶんの モンスターを つくる', style: { marginTop: '6px' } }),
      h('p', { class: 'note', text: '紙に かいた 絵を しゃしんに とると、ドット絵に なって バトルに 出てくるよ。こい線で かくと きれいに 入るよ。' }),
      h('div', { class: 'photo' }, [
        stage,
        h('button', { class: 'btn', type: 'button', text: '📷 しゃしんを とる', onclick: function () { MQ.sfx.tap(); fileIn.click(); } }),
        fileIn,
        previewRow,
        nameIn,
        h('p', { class: 'note', style: { margin: '0' }, text: 'どの エリアに 出す？' }),
        areaChips,
        h('button', { class: 'btn btn--big', type: 'button', text: 'なかまに する！', onclick: function () { MQ.sfx.tap(); save(); } })
      ]),
      mine.length ? h('h2', { class: 'label', text: 'つくった モンスター' }) : null,
      mine.length ? h('div', { class: 'grid' }, mine) : null,
      h('button', {
        class: 'btn btn--big btn--stone', type: 'button', text: '図かんへ もどる',
        style: { marginTop: '18px' },
        onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render('mons'); MQ.ui.show('screen-dex'); }
      })
    ]));
    MQ.ui.show('screen-dex');
    drawStage();
  }

  return { render: render };
})();
