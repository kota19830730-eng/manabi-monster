/* ---------------------------------------------------------
   効果音

   音のファイルは 使わず、ブラウザの中で その場で 音を作ります。
   （ファイルを 用意しなくてよく、オフラインでも 鳴ります）
   ブラウザのきまりで、音は「何かを タップしたあと」でないと
   鳴らせないので、最初のタップで unlock() を呼びます。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sfx = (function () {
  let ctx = null;
  let enabled = true;

  function context() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    const c = context();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, delay, filterFreq, filterType) {
    const c = context();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (delay || 0);
    const length = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = filterType || 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t0);
  }

  // ノイズの 高さを 動かす（風の ヒュー・すいこむ音・落ちてくる音）
  function sweep(dur, vol, delay, fFrom, fTo, type) {
    const c = context();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (delay || 0);
    const length = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type || 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(fFrom, t0);
    filter.frequency.exponentialRampToValueAtTime(fTo, t0 + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + Math.min(0.05, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock:     function () { context(); },
    setEnabled: function (on) { enabled = !!on; },
    isEnabled:  function () { return enabled; },

    // ブロックを たたいたような 木の音
    tap:     function () { tone(520, 0.045, 'triangle', 0.12, 0, 300); noise(0.04, 0.10, 0, 2600); },
    key:     function () { tone(700, 0.03, 'square', 0.05); },
    appear:  function () { tone(220, 0.12, 'sawtooth', 0.1, 0, 440); tone(440, 0.1, 'square', 0.08, 0.12); },
    hit:     function () { noise(0.18, 0.35); tone(160, 0.15, 'square', 0.18, 0, 60); },
    crit:    function () { noise(0.2, 0.4); tone(1568, 0.09, 'square', 0.16); tone(2093, 0.18, 'square', 0.14, 0.07); tone(120, 0.18, 'square', 0.2, 0, 50); },
    defeat:  function () { tone(523, 0.1, 'square', 0.13, 0.05); tone(659, 0.1, 'square', 0.13, 0.15); tone(784, 0.22, 'square', 0.13, 0.25); },
    dodge:   function () { tone(500, 0.08, 'triangle', 0.12, 0, 900); },
    // 相棒の 追い打ち（v4.3）：ぴょんと とんで コツンと あてる
    palHit:  function () { tone(880, 0.06, 'triangle', 0.12, 0, 1320); tone(1320, 0.09, 'square', 0.12, 0.06); noise(0.1, 0.22, 0.1, 3000); },
    miss:    function () { tone(300, 0.28, 'sawtooth', 0.13, 0, 110); },
    guard:   function () { noise(0.12, 0.3, 0, 3500, 'highpass'); tone(190, 0.16, 'square', 0.2, 0, 140); },
    // とどめの 一撃（v7.5）：ためて ドン！と 当たり、きらっと のこる
    finish:  function () {
      tone(80, 0.10, 'sawtooth', 0.16, 0, 200);
      noise(0.26, 0.45, 0.06);
      tone(120, 0.22, 'square', 0.22, 0.08, 50);
      tone(1568, 0.10, 'square', 0.13, 0.10);
      tone(2093, 0.24, 'square', 0.11, 0.19);
    },
    /* ---- てきの ため → カウンター（v7.7） ---- */
    // 敵が こうげきに 出る（低く うなる → ぐっと 上がる）
    charge:  function () { tone(90, 0.36, 'sawtooth', 0.14, 0, 260); noise(0.3, 0.12, 0.05, 900, 'lowpass'); tone(660, 0.08, 'square', 0.1, 0.34); },
    // カウンター（キン！と はね返して ドン）
    counter: function () { tone(2093, 0.06, 'square', 0.14); tone(2794, 0.12, 'square', 0.12, 0.05); noise(0.08, 0.3, 0.02, 5000, 'highpass'); noise(0.22, 0.4, 0.14); tone(110, 0.2, 'square', 0.2, 0.14, 45); },
    // くらった（どすっ）
    enemyHit: function () { noise(0.14, 0.3, 0, 700, 'lowpass'); tone(140, 0.18, 'square', 0.18, 0, 70); },
    alarm:   function () { for (let i = 0; i < 3; i++) { tone(660, 0.16, 'sawtooth', 0.12, i * 0.36); tone(494, 0.16, 'sawtooth', 0.12, i * 0.36 + 0.18); } },
    enrage:  function () { tone(110, 0.5, 'sawtooth', 0.2, 0, 220); noise(0.4, 0.25, 0.05); },
    bossdown: function () {
      noise(0.5, 0.4);
      tone(400, 0.8, 'sawtooth', 0.22, 0, 55);
      // 上がっていく 音は やめた（ファンファーレ（bgm）が そのあと 鳴る）
    },
    clear:   function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i === 3 ? 0.45 : 0.12, 'square', 0.13, i * 0.12); }); },
    // レベルアップ：かけ上がる 音 → 高い わおん＋キラキラ
    levelup: function () {
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, 0.07, 'square', 0.13, 0.25 + i * 0.055); });
      [2093, 2637, 3136].forEach(function (f) { tone(f, 0.9, 'triangle', 0.15, 0.66); });
      noise(0.6, 0.12, 0.66, 7000, 'highpass');
    },
    item:    function () { tone(1047, 0.08, 'square', 0.12, 0); tone(1319, 0.2, 'square', 0.12, 0.09); },
    rare:    function () { [784, 988, 1175, 1568, 1976].forEach(function (f, i) { tone(f, 0.09, 'square', 0.12, i * 0.07); }); },

    /* ---- v1.2 で ふえた 音 ---- */
    // たからばこが 出る（カタカタ）
    chestAppear: function () {
      for (let i = 0; i < 4; i++) { noise(0.05, 0.16, i * 0.13, 1800); tone(300, 0.05, 'triangle', 0.07, i * 0.13); }
    },
    // たからばこが 開く
    chestOpen: function () {
      noise(0.12, 0.22, 0, 2200);
      [1047, 1319, 1568, 2093, 2637].forEach(function (f, i) { tone(f, i === 4 ? 0.4 : 0.1, 'square', 0.13, 0.12 + i * 0.08); });
    },
    // 2体・3体 まとめて たおした
    multiKO: function (n) {
      const base = n >= 3 ? [1047, 1319, 1568, 1976, 2349, 2637] : [880, 1109, 1319, 1760];
      noise(0.25, 0.4);
      base.forEach(function (f, i) { tone(f, i === base.length - 1 ? 0.45 : 0.09, 'square', 0.15, i * 0.06); });
      tone(110, 0.3, 'sawtooth', 0.2, 0, 55);
    },
    /* ひっさつわざ（v2.5）。level＝1〜4（コンボの だんかい）、id＝わざの 名前
       1 = 教科の わざ（fire ほのお／leaf はっぱ／ice こおり／wind かぜ）
       2 = いなずま おとし／3 = ひかりの メテオ／4 = ぎんがの ビッグバン */
    special: function (level, id) {
      const lv = level || 1;
      // オーロラ フィナーレ（20コンボ〜・v7.5）：
      // きらきら 上がる → 大きな わおん → 虹の アルペジオ → ながい 余いん
      if (lv >= 5) {
        sweep(0.55, 0.3, 0, 600, 4200, 'bandpass');
        [523, 659, 784, 988, 1175, 1319].forEach(function (f, i) {
          tone(f, 0.12, 'triangle', 0.13, i * 0.05);
        });
        noise(0.5, 0.35, 0.34);
        [261, 329, 392, 523].forEach(function (f) { tone(f, 1.1, 'square', 0.12, 0.36); });
        [1568, 1976, 2349, 2637, 3136].forEach(function (f, i) {
          tone(f, 0.14, 'square', 0.12, 0.5 + i * 0.07);
        });
        [784, 988, 1319, 1568].forEach(function (f, i) { tone(f, 0.9, 'triangle', 0.09, 1.0 + i * 0.05); });
        tone(98, 0.9, 'sawtooth', 0.16, 0.36, 60);
        return;
      }
      if (lv >= 4) {
        // ビッグバン：すいこむ（下がる ヒュー）→ 一しゅん しずか → 大ばくはつ＋わおん → 虹の アルペジオ → エコー
        sweep(0.5, 0.35, 0, 3000, 120, 'bandpass');
        tone(1400, 0.5, 'sawtooth', 0.12, 0, 60);
        [2093, 1760, 1568, 1319].forEach(function (f, i) { tone(f, 0.08, 'triangle', 0.1, i * 0.1); });
        noise(1.6, 0.6, 0.56, 500);
        tone(55, 1.4, 'sawtooth', 0.3, 0.56, 22);
        [523, 659, 784, 1047, 1319, 1568].forEach(function (f) { tone(f, 0.9, 'square', 0.07, 0.56); });
        [1047, 1319, 1568, 2093, 2637, 3136, 3520, 3136, 2637, 2093, 1568, 1319].forEach(function (f, i) { tone(f, 0.1, 'square', 0.13, 0.62 + i * 0.055); });
        noise(0.8, 0.28, 1.15, 400);
        noise(0.5, 0.15, 1.3, 8000, 'highpass');
        return;
      }
      if (lv === 3) {
        // メテオ：上がっていく 音 → 落ちてくる ヒュー → 大ばくはつ＋わおん → きらきら
        [1047, 1319, 1568, 1976, 2349, 2794, 3136].forEach(function (f, i) { tone(f, 0.09, 'square', 0.15, i * 0.045); });
        tone(2600, 0.32, 'triangle', 0.14, 0.18, 300);
        sweep(0.32, 0.22, 0.18, 4000, 400, 'bandpass');
        noise(1.1, 0.55, 0.42, 600);
        tone(3520, 0.6, 'square', 0.15, 0.42);
        tone(60, 1.1, 'sawtooth', 0.28, 0.42, 26);
        [523, 659, 784, 1047].forEach(function (f) { tone(f, 0.5, 'square', 0.08, 0.44); });
        noise(0.5, 0.2, 0.6, 7000, 'highpass');
        [2093, 2637, 3136, 4186].forEach(function (f, i) { tone(f, 0.12, 'square', 0.1, 0.8 + i * 0.07); });
        return;
      }
      if (lv === 2) {
        // かみなり：チッチッ（ため）→ バリッ！→ ゴロゴロ → もう1発
        tone(3520, 0.04, 'square', 0.12, 0);
        tone(3520, 0.04, 'square', 0.12, 0.08);
        noise(0.16, 0.55, 0.14, 9000, 'highpass');
        tone(3136, 0.12, 'square', 0.22, 0.14);
        tone(2349, 0.18, 'square', 0.2, 0.2, 1175);
        noise(1.0, 0.4, 0.22, 380);
        tone(90, 0.9, 'sawtooth', 0.26, 0.22, 40);
        noise(0.1, 0.35, 0.5, 9000, 'highpass');
        tone(2794, 0.1, 'square', 0.16, 0.5, 1400);
        return;
      }
      if (id === 'ice') {
        // こおり：キラキラ → シュッ → パリーン（われる）
        [2093, 2637, 3136, 3951].forEach(function (f, i) { tone(f, 0.1, 'triangle', 0.14, i * 0.05); });
        sweep(0.3, 0.25, 0.1, 1500, 6000, 'bandpass');
        for (let i = 0; i < 4; i++) noise(0.06, 0.3, 0.34 + i * 0.05, 7000, 'highpass');
        [4186, 3520, 4699, 3136].forEach(function (f, i) { tone(f, 0.12, 'triangle', 0.14, 0.34 + i * 0.05); });
        tone(90, 0.5, 'sawtooth', 0.2, 0.34, 45);
        return;
      }
      if (id === 'leaf') {
        // はっぱ：ヒュルル（風）→ サササッ（はっぱ）→ ザシュッ
        sweep(0.45, 0.3, 0, 600, 3200, 'bandpass');
        for (let i = 0; i < 6; i++) noise(0.05, 0.22, 0.1 + i * 0.06, 3000, 'bandpass');
        tone(2093, 0.1, 'square', 0.16, 0.36);
        tone(2637, 0.3, 'square', 0.14, 0.44);
        tone(100, 0.45, 'sawtooth', 0.18, 0.4, 50);
        return;
      }
      if (id === 'wind') {
        // かぜ：ゴオオ（うずまく）→ ピュー（高くなる）→ ドン
        sweep(0.7, 0.4, 0, 300, 2400, 'bandpass');
        tone(600, 0.6, 'triangle', 0.1, 0.05, 2400);
        for (let i = 0; i < 5; i++) noise(0.08, 0.2, 0.15 + i * 0.09, 1200, 'bandpass');
        noise(0.5, 0.35, 0.55, 700);
        tone(80, 0.5, 'sawtooth', 0.22, 0.55, 40);
        return;
      }
      // ほのお：ゴォッと もえる 音 → ザシュッ ザシュッ → ボワッ
      noise(0.7, 0.5, 0, 900);
      noise(0.35, 0.22, 0.08, 2600, 'bandpass');
      tone(2093, 0.12, 'square', 0.18);
      tone(2637, 0.12, 'square', 0.18, 0.09);
      tone(3136, 0.42, 'square', 0.15, 0.18);
      noise(0.12, 0.3, 0.3, 4000, 'bandpass');
      tone(80, 0.7, 'sawtooth', 0.24, 0.1, 36);
      noise(0.5, 0.3, 0.45, 500);
    },
    // どうぐを 使った（atk＝ゴゥッ／def＝キィン／wis＝ポロン／luck＝チャリン）
    item: function (kind) {
      if (kind === 'atk') {
        [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.08, 'square', 0.16, i * 0.05); });
        noise(0.4, 0.35, 0.2, 1200);
        tone(1568, 0.35, 'square', 0.14, 0.22);
        tone(90, 0.5, 'sawtooth', 0.2, 0.2, 45);
        return;
      }
      if (kind === 'def') {
        tone(1319, 0.12, 'triangle', 0.18);
        tone(1976, 0.5, 'triangle', 0.16, 0.1);
        tone(2637, 0.4, 'sine', 0.12, 0.16);
        noise(0.25, 0.12, 0.1, 5000, 'highpass');
        return;
      }
      if (kind === 'wis') {
        [784, 988, 1175, 1568, 1976].forEach(function (f, i) { tone(f, 0.14, 'triangle', 0.14, i * 0.08); });
        return;
      }
      [2093, 2637, 3136, 2637, 3520].forEach(function (f, i) { tone(f, 0.09, 'square', 0.13, i * 0.07); });
      noise(0.3, 0.12, 0.3, 7000, 'highpass');
    },
    // コインを つかう／もらう（チャリン）
    coin: function () {
      tone(2093, 0.06, 'square', 0.14);
      tone(2637, 0.2, 'square', 0.12, 0.06);
      noise(0.12, 0.1, 0.02, 8000, 'highpass');
    },
    // たからものを 手に入れた
    treasure: function () {
      [1319, 1568, 1976, 2637].forEach(function (f, i) { tone(f, i === 3 ? 0.5 : 0.12, 'triangle', 0.14, i * 0.11); });
    },
    // かけらを 手に入れた
    frag: function () {
      [1568, 2093, 2637, 3136].forEach(function (f, i) { tone(f, i === 3 ? 0.7 : 0.14, 'sine', 0.16, i * 0.14); });
      noise(0.6, 0.14, 0.2, 6000, 'highpass');
    },
    // ラスボス 登場
    towerIntro: function () {
      tone(55, 1.4, 'sawtooth', 0.26, 0, 28);
      noise(1.2, 0.3, 0, 500);
      for (let i = 0; i < 4; i++) tone(233, 0.3, 'sawtooth', 0.14, 0.6 + i * 0.3, 220);
    },
    // 第2形態に 変身
    henshin: function () {
      tone(200, 0.7, 'sawtooth', 0.24, 0, 900);
      noise(0.8, 0.35, 0.1, 1500);
      [1568, 1319, 1047, 880].forEach(function (f, i) { tone(f, 0.2, 'square', 0.14, 0.5 + i * 0.09); });
      tone(60, 1.0, 'sawtooth', 0.24, 0.5, 30);
    },
    // 写真を とる
    shutter: function () { noise(0.06, 0.3, 0, 4000, 'highpass'); tone(1200, 0.04, 'square', 0.1, 0.05); },
    // タイムアタックの のこり時間
    tick:    function () { tone(1400, 0.04, 'square', 0.07); },
    timeup:  function () { tone(400, 0.5, 'sawtooth', 0.16, 0, 120); noise(0.3, 0.2); }
  };
})();
