/* ---------------------------------------------------------
   カプセルマシンを まわす 演出（v13.14・2026-09-13）
   ユーザー「ガチャの演出をもっとワクワクできるように。今のは単調すぎる。演出をもっと作成し期待度をつける」
   → 壁打ちで A＋B＋C＋D＋E＋F（全画面の 舞台／上がるだけの 期待度／じぶんで 割る／登場の 見せ場／相棒／ノーマルの おまけ）
   → デザインの 3案から 案C「ほしぞらの しょうかん」＋「カプセルマシンも 3D で」（ユーザー「めっちゃいいです」）。
   仕様は docs/v13.14カプセルの演出メモ.md、絵コンテは https://claude.ai/code/artifact/8f1014a8-3f81-4d70-b08c-188c3efb0f45

   ながれ（げきレアの 例）
     ① まわす   … 画面ぜんたいが 夜空に。3D の マシンが 大きく まん中へ。ハンドルを タップ → ぐるっと 回る・玉が はねる
     ② 光       … マシンの うしろに 光の すじ。地面の まほうじんの 1つめの わが 光る
     ③ カプセル … 出口から カプセルが ころがり出て、まほうじんの 上に うかぶ。色＝期待度。2つめの わ
     ④ ヒビ     … 3回 タップで ヒビが ふえ、光が もれる。3回めで 3つめの わ → パカッと 割れる
     ⑤ 登場     … 光の はしらから 出た ものが せりあがる。NEW!・名前・紙ふぶき。相棒も よろこぶ

   期待度の はしご（**色は 上がるだけ・下がらない＝うそを つかない**）
     レベル 0＝しろ（ふつう）・1＝金（レア いじょう かくてい）・2＝むらさき（げきレア かくてい）・3＝にじ（げきレア）
     plan(rarity) が ①〜④の 4つの レベルを 決める。ノーマルは ずっと 0、レアは 金に なる ところが 毎回 ちがう、
     げきレアは たまに さいごまで しろの まま → いきなり にじ（ぎゃくてん）。
   ノーマルの おまけ（5回に 1回 くらい）… マシンが くしゃみ／相棒が のぞきこむ／カプセルが 2回 はねる。色は 使わない。

   いつでも 右上の「とばす」で ⑤へ。タップが ない ときは しばらく して 自動で 進む（止まったまま に しない）。
   MQ.ui.capsuleFx.play({ rarity, reveal: { badge, badgeCls, art(size), name, msg, isNew, dup, refund, extra }, onReveal, onNext })
   --------------------------------------------------------- */
MQ.ui.capsuleFx = (function () {
  const h = function () { return MQ.util.h.apply(null, arguments); };

  const LV = ['w', 'g', 'p', 'rb'];          // レベル → 色の しるし
  const TONE = ['n', 'r', 'sr'];             // ③の カプセルの 色（レベル 0/1/2）
  const T = { enter: 380, autoTurn: 2600, turn: 800, light: 760, capIn: 1000, autoTap: 2200, crack: 380, up: 620, burst: 460, btn: 700 };

  let root = null, st = null;
  /* 軽く（2026-09-13・ユーザー「クオリティは落とさずに重たくならないように」）：
     3D の マシン（面 150まい）と カプセル 3色を その場で 組むと、まわした 1コマめが 183ms・カプセルが 出る コマが 83ms かかった。
     → カプセルの 画面を ひらいた ときに 先に 組んで おき（warm）、まわす ときは cloneNode で 写す だけ。見た目は 同じ */
  const cache = {};
  function warm() {
    if (!on3d()) return;
    try {
      if (!cache.mc) cache.mc = MQ.vox.capsuleMachine({ unit: 2 });
      TONE.forEach(function (t) { if (!cache['ball-' + t]) cache['ball-' + t] = MQ.vox.capsuleBall({ unit: 2, tone: t }); });
      palNode();   // 相棒の 3D も three.js の しまい場所（monCache）に 入る
    } catch (e) { /* 先に 組めなくても まわす ときに 組む */ }
  }
  /* マシンは 色ごとに 1台 組んで しまって おき、つかう ときは cloneNode（tone 'home'＝おうちの人の 金の マシン） */
  function machineV(tone) {
    const key = tone === 'home' ? 'mc-home' : 'mc';
    if (!cache[key]) cache[key] = MQ.vox.capsuleMachine({ unit: 2, tone: tone === 'home' ? 'home' : null });
    return cache[key].cloneNode(true);
  }
  /* カプセルマシンの 画面（capsule.js）の マシンも 同じ 3D に（2026-09-13・ユーザー「ここの画面も 3D の 画面に」）。
     まわす 演出と 同じ 1台を 写すので 見た目が そろう。3D が 切って ある ときは null（2D の .capmc が 出る） */
  function menuMachine(size, tone) {
    if (!on3d()) return null;
    try {
      return h('div', { class: 'capmc3d' + (tone === 'home' ? ' capmc3d--home' : '') }, [scene3d(size, -18, machineV(tone), 'capfx__fig--mc capfx__fig--menu')]);
    } catch (e) { return null; }
  }
  function ballV(tone) { return cache['ball-' + tone] ? cache['ball-' + tone].cloneNode(true) : MQ.vox.capsuleBall({ unit: 2, tone: tone }); }

  /* ---- 期待度の はしご ---- */
  function plan(rarity, rnd) {
    const x = (rnd || Math.random)();
    if (rarity === 'sr') return x < 0.5 ? [1, 2, 2, 3] : x < 0.75 ? [0, 1, 2, 3] : x < 0.9 ? [0, 1, 1, 3] : [0, 0, 0, 3];
    if (rarity === 'r') return x < 0.4 ? [0, 1, 1, 1] : x < 0.75 ? [0, 0, 1, 1] : [0, 0, 0, 1];
    return [0, 0, 0, 0];
  }
  function bonusOf(rarity, rnd) {
    if (rarity === 'sr' || rarity === 'r') return null;
    const x = (rnd || Math.random)();
    return x < 0.07 ? 'sneeze' : x < 0.14 ? 'peek' : x < 0.21 ? 'double' : null;
  }

  function on3d() { return !!(MQ.ui.v3 && MQ.ui.v3.on() && MQ.vox && MQ.vox.capsuleMachine); }
  function later(fn, ms) { if (!st) return; st.timers.push(setTimeout(function () { if (st) fn(); }, ms)); }
  function sfx(name, arg) { if (MQ.sfx && MQ.sfx[name]) MQ.sfx[name](arg); }
  /* 場面を かえる。重さを はかる 道具（tools/3d/capfxperf.js）が window.__capfxTrace を 立てた ときだけ、Chrome の 記録に 目じるしを のこす */
  function setPhase(p) {
    st.phase = p;
    if (window.__capfxTrace && console.timeStamp) console.timeStamp('capfx:' + p);
  }
  function restart(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ---- 3D の 器（three.js の scene と 同じ 作り） ---- */
  function scene3d(size, ry, v, figCls) {
    const sc = h('div', { class: 'capfx__scene' });
    sc.style.cssText = 'width:' + size + 'px;height:' + size + 'px;';
    const fig = h('div', { class: 'capfx__fig ' + (figCls || '') });
    fig.style.setProperty('--ry', ry + 'deg');
    const hold = h('div', { class: 'capfx__hold' });
    const k = size / 96;
    hold.style.cssText = 'left:' + ((size - 96) / 2) + 'px;top:' + (size - 96) + 'px;transform:scale3d(' + k + ',' + k + ',' + k + ');';
    hold.appendChild(v); fig.appendChild(hold); sc.appendChild(fig);
    return sc;
  }
  /* 3D が 切って ある とき：いまの 2D の マシン（.capmc）を 大きく */
  function machine2d() {
    return h('div', { class: 'capmc capfx__mc2d' }, [
      h('span', { class: 'capmc__dome' }),
      h('span', { class: 'capmc__ball capmc__ball--1' }), h('span', { class: 'capmc__ball capmc__ball--2' }), h('span', { class: 'capmc__ball capmc__ball--3' }),
      h('span', { class: 'capmc__body' }), h('span', { class: 'capmc__knob' }), h('span', { class: 'capmc__slot' })
    ]);
  }

  /* 星（軽く・2026-09-13）：1こずつ の 要素に して 9こ またたかせたら、まわした 1コマめが 170〜200ms かかった
     （またたく 星が 1こずつ 別の 層に なり、上に かさなる ものまで 層に 分かれる）。
     → 星は 1つの 要素の box-shadow に まとめて 1回 描く。またたく 星も 1つに まとめて、層ごと ゆっくり 明るさを 変える */
  function stars() {
    const H = (MQ.stage && MQ.stage.size ? MQ.stage.size().h : 800) * 0.62;
    const dots = function (n, big, lo, hi) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const x = Math.round(Math.random() * 396), y = Math.round(Math.random() * H);
        const a = (lo + Math.random() * (hi - lo)).toFixed(2);
        out.push(x + 'px ' + y + 'px 0 ' + (Math.random() < big ? '0.6px' : '0') + ' rgba(255,255,255,' + a + ')');
      }
      return out.join(',');
    };
    const still = h('i', { class: 'capfx__stars' });
    still.style.boxShadow = dots(38, 0.18, 0.3, 0.85);
    const tw = h('i', { class: 'capfx__stars capfx__stars--tw' });
    tw.style.boxShadow = dots(10, 0.5, 0.8, 1);
    return [still, tw];
  }

  function palNode() {
    const p = MQ.save && MQ.save.current && MQ.save.current();
    const pal = p && MQ.pals && MQ.pals.active ? MQ.pals.active(p) : null;
    if (!pal || !pal.id) return null;
    let art = null;
    try { art = on3d() ? MQ.ui.v3.monster(pal.id, 76, { ry: 24, mo: 'mo-title' }) : MQ.enemies.node(pal.id, { size: 64 }); } catch (e) { art = null; }
    if (!art) return null;
    return h('div', { class: 'capfx__pal' }, [h('div', { class: 'capfx__palart' }, [art]), h('p', { class: 'capfx__palsay' })]);
  }
  function palSay(text) {
    if (!st || !st.pal) return;
    const b = st.pal.querySelector('.capfx__palsay');
    b.textContent = '';
    if (!text) { b.hidden = true; return; }
    b.appendChild(h('span', { text: text }));
    b.hidden = false;
    restart(b, 'is-pop');
  }
  function palMood(m) {
    if (!st || !st.pal) return;
    st.pal.classList.remove('is-jump', 'is-cheer');
    if (m) st.pal.classList.add(m);
  }

  const CHIP = { 1: '金の 光！ レア いじょう', 2: 'むらさきの 光！ げきレアだ', 3: 'にじいろ！！' };
  const PAL_LINE = { 0: 'ドキドキ…', 1: '金だ！ きた きた！', 2: 'むらさき！？ すごい！', 3: 'にじいろ！！' };
  function chip(level) {
    if (!st || !CHIP[level]) return;
    const c = st.el.chip;
    c.textContent = '';
    c.className = 'capfx__chip lv--' + LV[level];
    c.appendChild(h('span', { text: CHIP[level] }));
    c.hidden = false;
    restart(c, 'is-pop');
  }
  function say(text) {
    if (!st) return;
    st.el.say.textContent = '';
    if (!text) { st.el.say.hidden = true; return; }
    st.el.say.appendChild(h('span', { text: text }));
    st.el.say.hidden = false;
  }
  function setLevel(level) {
    // レベルを 画面に のせる（光・マシン・ガラス）。上がる ときだけ「上がった」合図
    if (!st) return;
    const prev = st.shown;
    st.shown = Math.max(st.shown, level);
    const up = st.shown > Math.max(prev, 0);   // しろ（0）から 始まるので、0 に なった ときは 合図なし
    root.classList.remove('lv--w', 'lv--g', 'lv--p', 'lv--rb');
    root.classList.add('lv--' + LV[st.shown]);
    if (up) {
      chip(st.shown);
      palSay(PAL_LINE[st.shown]);
      palMood('is-jump');
      restart(st.el.flash, 'is-up');
      sfx('capsuleHot', st.shown >= 2);
    }
  }
  function ring(i, level) {
    if (!st) return;
    const r = st.el.rings[i];
    r.className = 'capfx__ring capfx__ring--' + (i + 1) + ' is-on lv--' + LV[level];
  }

  /* ---- ながれ ---- */
  function build(opts) {
    const r = document.createElement('div');
    r.className = 'capfx is-in';
    const el = {};
    el.sky = h('div', { class: 'capfx__sky' }, stars());
    el.rays = h('div', { class: 'capfx__rays' });
    el.glow = h('div', { class: 'capfx__glow' });
    el.rings = [0, 1, 2].map(function (i) { return h('div', { class: 'capfx__ring capfx__ring--' + (i + 1) }); });
    el.circle = h('div', { class: 'capfx__circle' }, el.rings);
    // マシン
    el.mc = h('div', { class: 'capfx__mc is-enter' });
    if (on3d()) {
      el.mcv = machineV(opts && opts.tone);
      el.mc.appendChild(scene3d(300, -18, el.mcv, 'capfx__fig--mc'));
    } else {
      el.mcv = machine2d();
      el.mc.appendChild(el.mcv);
      el.mc.classList.add('is-2d');
    }
    el.puffs = h('div', { class: 'capfx__puffs' }, [h('i'), h('i'), h('i')]);
    el.mc.appendChild(el.puffs);
    // カプセル
    el.cap = h('div', { class: 'capfx__cap', hidden: true });
    el.leak = h('div', { class: 'capfx__leak' });
    el.capArt = h('div', { class: 'capfx__capart' });
    el.crack = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.crack.setAttribute('class', 'capfx__crack');
    el.crack.setAttribute('viewBox', '0 0 120 120');
    el.crack.innerHTML = '<path class="c1" d="M60 14 L54 36 L68 48"/><path class="c2" d="M68 48 L50 64 L64 76 M50 64 L30 58"/><path class="c3" d="M64 76 L54 104 M64 76 L88 88 M68 48 L92 40"/>';
    el.shards = h('div', { class: 'capfx__shards' });
    el.cap.appendChild(el.leak); el.cap.appendChild(el.capArt); el.cap.appendChild(el.crack); el.cap.appendChild(el.shards);
    // 文字・ゆび
    el.say = h('p', { class: 'capfx__say', hidden: true });
    el.chip = h('div', { class: 'capfx__chip', hidden: true });
    el.pips = h('div', { class: 'capfx__pips', hidden: true }, [h('i'), h('i'), h('i')]);
    el.finger = h('div', { class: 'capfx__finger', hidden: true });
    el.finger.innerHTML = '<svg width="44" height="50" viewBox="0 0 30 34" fill="none"><circle cx="11" cy="7" r="6" stroke="#fff" stroke-width="2" opacity=".75"/><path d="M9 8v14l-3-3c-1.5-1.4-3.6.3-2.5 2l5 8c1 1.6 2.6 2.5 4.4 2.5h7c2.7 0 4.8-2.1 4.8-4.8V17c0-1.3-1-2.3-2.3-2.3S20 15.7 20 17v-1.5c0-1.3-1-2.3-2.3-2.3s-2.3 1-2.3 2.3V15c0-1.3-1-2.3-2.3-2.3S13 13.7 13 15V8c0-1.1-.9-2-2-2s-2 .9-2 2z" fill="#fffdf4" stroke="#1c2340" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    // 登場
    el.pillar = h('div', { class: 'capfx__pillar' });
    el.reveal = h('div', { class: 'capfx__reveal', hidden: true });
    el.conf = h('div', { class: 'capfx__conf' });
    el.flash = h('div', { class: 'capfx__flash' });
    el.skip = h('button', {
      class: 'capfx__skip', type: 'button', text: 'とばす',
      onclick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); skip(); }
    });
    [el.sky, el.rays, el.glow, el.circle, el.pillar, el.mc, el.cap, el.say, el.chip, el.pips, el.finger, el.reveal, el.conf, el.flash, el.skip].forEach(function (x) { r.appendChild(x); });
    const pal = palNode();
    if (pal) { r.appendChild(pal); }
    r.addEventListener('click', onTap);
    return { root: r, el: el, pal: pal };
  }

  function play(opts) {
    close();
    opts = opts || {};
    const stage = document.getElementById('stage') || document.body;
    const b = build(opts);
    root = b.root;
    st = {
      opts: opts, el: b.el, pal: b.pal, timers: [], phase: 'enter', taps: 0, shown: -1,
      rarity: opts.rarity || 'n',
      lv: opts.plan || plan(opts.rarity),
      bonus: opts.bonus !== undefined ? opts.bonus : bonusOf(opts.rarity),
      held: false
    };
    root.classList.add('rare--' + st.rarity);
    if (window.__capfxTrace && console.timeStamp) console.timeStamp('capfx:enter');
    stage.appendChild(root);
    palSay('なにが 出るかな？');
    sfx('capsuleLever');
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { reveal(); return; }
    } catch (e) { /* なし */ }
    later(function () {
      /* is-in は 外さない（外すと 0.5秒の マシンの 登場を 0.38秒で 打ち切り、マシン ぜんたいを 描き直して いた） */
      later(function () { st.el.mc.classList.remove('is-enter'); }, 200);   // 登場（0.5秒）が おわって から 外す
      setPhase('turn');
      say('ハンドルを まわそう！');
      st.el.finger.hidden = false;
      st.el.finger.className = 'capfx__finger at--knob';
      later(turn, T.autoTurn);
    }, T.enter);
  }

  function onTap(e) {
    if (!st) return;
    if (st.phase === 'turn') turn();
    else if (st.phase === 'tap') crackTap();
  }

  /* ① ハンドルが 回る */
  function turn() {
    if (!st || st.phase !== 'turn') return;
    setPhase('turning');
    st.el.finger.hidden = true;
    say('');
    root.classList.add('is-turn');
    palSay('まわれ〜！');
    sfx('capsuleRoll');
    later(function () {
      root.classList.remove('is-turn');
      root.classList.add('is-tumble');
      setLevel(st.lv[0]);
      if (st.bonus === 'sneeze') sneeze();
      if (st.bonus === 'peek') peek();
      later(light, st.bonus === 'sneeze' || st.bonus === 'peek' ? T.light + 500 : 120);
    }, T.turn);
  }
  function sneeze() {
    restart(st.el.mc, 'is-sneeze');
    palSay('えっ？ くしゃみ？');
    sfx('tap');
  }
  function peek() {
    palSay('どれどれ…');
    st.pal && st.pal.classList.add('is-peek');
    later(function () { st.pal && st.pal.classList.remove('is-peek'); }, 1100);
  }

  /* ② 光（うしろの 光の すじ＋1つめの わ） */
  function light() {
    if (!st) return;
    setPhase('light');
    root.classList.add('is-light');
    setLevel(st.lv[1]);
    ring(0, st.lv[1]);
    if (st.lv[1] === 0) palSay(PAL_LINE[0]);
    later(capsuleIn, T.light);
  }

  /* ③ カプセルが 出る */
  function capsuleIn() {
    if (!st) return;
    setPhase('cap');
    root.classList.remove('is-tumble');
    root.classList.add('is-cap');
    const tone = TONE[Math.min(2, st.lv[2])];
    const cap = st.el.cap;
    st.el.capArt.textContent = '';
    if (on3d()) st.el.capArt.appendChild(scene3d(150, 0, ballV(tone), 'capfx__fig--cap'));
    else st.el.capArt.appendChild(h('div', { class: 'capfx__cap2d tone--' + tone }));
    cap.className = 'capfx__cap tone--' + tone + (st.bonus === 'double' ? ' is-double' : '');
    cap.hidden = false;
    restart(cap, 'is-drop');
    sfx('capsuleRoll');
    ring(1, st.lv[2]);
    later(function () {
      setLevel(st.lv[2]);
      if (st.bonus === 'double') palSay('ぽよん ぽよん！');
      setPhase('tap');
      say('タップで わろう！');
      st.el.pips.hidden = false;
      st.el.finger.hidden = false;
      st.el.finger.className = 'capfx__finger at--cap';
      armAutoTap();
    }, T.capIn + (st.bonus === 'double' ? 420 : 0));
  }
  function armAutoTap() {
    if (!st) return;
    const n = st.taps;
    later(function () { if (st && st.phase === 'tap' && st.taps === n) crackTap(); }, T.autoTap);
  }

  /* ④ タップで ヒビ（3回） */
  function crackTap() {
    if (!st || st.phase !== 'tap') return;
    st.taps++;
    st.el.finger.hidden = true;
    const pips = st.el.pips.children;
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < st.taps);
    st.el.cap.classList.add('crack--' + st.taps);
    restart(st.el.cap, 'is-hit');
    sfx(st.taps < 3 ? 'guardBreak' : 'crit');
    if (st.taps < 3) { armAutoTap(); return; }
    // 3回め：さいごの レベル（上がる なら ここで「ぎゃくてん」）
    setPhase('cracking');
    say('');
    st.el.pips.hidden = true;
    const up = st.lv[3] > st.shown;
    ring(2, st.lv[3]);
    setLevel(st.lv[3]);
    root.classList.add('is-crack');
    later(burst, T.crack + (up ? T.up : 0));
  }

  /* パカッ */
  function burst() {
    if (!st) return;
    setPhase('burst');
    root.classList.add('is-burst');
    restart(st.el.flash, 'is-burst');
    const cols = { w: ['#fff', '#ffe0c4', '#ff8f5e'], g: ['#fff', '#ffe89a', '#ffd447'], p: ['#fff', '#d6c2ff', '#b48cff'], rb: ['#ff5e7a', '#ffd447', '#63d94f', '#4fd3ff', '#b48cff'] }[LV[st.shown]];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, d = 70 + Math.random() * 70;
      const s = h('i');
      s.style.cssText = 'background:' + cols[i % cols.length] + ';--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) + 'px;--rz:' + Math.round(Math.random() * 360) + 'deg;';
      st.el.shards.appendChild(s);
    }
    later(reveal, T.burst);
  }

  /* ⑤ 登場 */
  function reveal() {
    if (!st || st.phase === 'reveal') return;
    st.timers.forEach(clearTimeout); st.timers = [];
    setPhase('reveal');
    const o = st.opts.reveal || {};
    // とばした ときも さいごの 色に そろえる
    ring(0, Math.max(st.lv[1], 0)); ring(1, st.lv[2]); ring(2, st.lv[3]);
    setLevel(st.lv[3]);
    root.classList.remove('is-turn', 'is-tumble');
    root.classList.add('is-cap', 'is-light', 'is-burst', 'is-reveal');
    st.el.cap.hidden = true;
    st.el.say.hidden = true; st.el.pips.hidden = true; st.el.finger.hidden = true; st.el.chip.hidden = true;
    st.el.skip.hidden = true;
    const rv = st.el.reveal;
    rv.textContent = '';
    if (o.badge) rv.appendChild(h('span', { class: 'capfx__badge ' + (o.badgeCls || ''), text: o.badge }));
    const art = h('div', { class: 'capfx__art' });
    try { const a = o.art && o.art(170); if (a) art.appendChild(a); } catch (e) { /* 絵が 作れなくても 名前は 出す */ }
    if (o.isNew) art.appendChild(h('span', { class: 'capfx__new', text: 'NEW!' }));
    rv.appendChild(art);
    if (o.name) rv.appendChild(h('p', { class: 'capfx__name', raw: !!o.nameRaw, text: o.name }));
    if (o.msg) rv.appendChild(h('p', { class: 'capfx__msg', text: o.msg }));
    if (o.extra) rv.appendChild(o.extra);
    const ok = h('button', {
      class: 'btn btn--cream capfx__ok', type: 'button', text: 'つぎへ',
      onclick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); MQ.sfx && MQ.sfx.tap && MQ.sfx.tap(); next(); }
    });
    ok.hidden = true;
    rv.appendChild(ok);
    rv.hidden = false;
    confetti(st.shown);
    if (o.dup) coins(o.refund || 5);
    palMood(st.shown >= 1 ? 'is-cheer' : 'is-jump');
    palSay(o.dup ? 'コイン もらえたね！' : st.shown >= 3 ? 'すごすぎる！！' : 'やったね！');
    sfx(st.rarity === 'sr' ? 'capsuleSr' : 'capsuleOpen');
    if (o.dup) later(function () { sfx('coin'); }, 500);
    if (st.opts.onReveal) { try { st.opts.onReveal(); } catch (e) { /* 画面の がわの まちがいで 演出を 止めない */ } }
    later(function () { ok.hidden = false; restart(ok, 'is-pop'); }, T.btn);
  }
  function confetti(level) {
    const n = level >= 3 ? 46 : level >= 1 ? 30 : 16;
    const cols = level >= 3 ? ['#ff5e7a', '#ffd447', '#63d94f', '#4fd3ff', '#b48cff', '#fff'] : level === 2 ? ['#b48cff', '#e9dcff', '#ffd447', '#fff'] : level === 1 ? ['#ffd447', '#ffe89a', '#fff', '#ff8f5e'] : ['#ff8f5e', '#63d94f', '#4fd3ff', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = h('i');
      const w = 5 + Math.round(Math.random() * 6);
      c.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;width:' + w + 'px;height:' + Math.round(w * 0.6) + 'px;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.9).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's;--rz:' + Math.round(Math.random() * 720 - 360) + 'deg;--dx:' + Math.round(Math.random() * 60 - 30) + 'px;';
      st.el.conf.appendChild(c);
    }
  }
  function coins(n) {
    const box = h('div', { class: 'capfx__coins' });
    for (let i = 0; i < Math.min(n, 6); i++) {
      const c = h('span', { class: 'capfx__coin' }, [MQ.ui.coinNode ? MQ.ui.coinNode(26) : h('i')]);
      c.style.cssText = '--dx:' + Math.round((i - 2.5) * 34) + 'px;animation-delay:' + (0.25 + i * 0.08).toFixed(2) + 's;';
      box.appendChild(c);
    }
    st.el.reveal.appendChild(box);
  }

  function skip() { if (st && st.phase !== 'reveal') reveal(); }
  function next() {
    const f = st && st.opts.onNext;
    close();
    if (f) f();
  }
  function close() {
    if (st) { st.timers.forEach(clearTimeout); }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; st = null;
  }

  return {
    play: play, skip: skip, close: close, next: next, warm: warm, menuMachine: menuMachine,
    plan: plan, bonusOf: bonusOf,
    // テスト用
    isOpen: function () { return !!root; },
    phase: function () { return st ? st.phase : null; },
    level: function () { return st ? st.shown : -1; },
    levels: function () { return st ? st.lv.slice() : null; },
    tap: function () { onTap(); }
  };
})();
