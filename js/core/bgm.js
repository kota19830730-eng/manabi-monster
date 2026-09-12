/* ---------------------------------------------------------
   BGM（ファイルを使わず、プログラムが 演奏する 音楽）

   v14.0（2026-09-12）「今どきの ゲーム音楽」に 作り直した。
     ユーザー「ピコピコで 作りこまれて いない・ワクワクしない・派手さが ない」
     ・楽器 …… supersaw（のこぎり波 5本を 左右に ひろげた 太い リード）／pluck（16分の アルペジオ）／
               pad（コードを ささえる ひろい 音）／bass（のこぎり＋四角＋サイン）／chip（レトロの 四角）／brass
     ・ドラム …… バスドラ（ドン＋カッ）／スネア（胴＋ノイズ）／クラップ／ハイハット／クラッシュ／ロール
     ・サイドチェイン …… バスドラの たびに pad・arp・bass が ぐっと しずむ（今どきの「うねり」）
     ・ぜんたい …… 低音と 高音の 持ち上げ・リバーブ・コンプ＋リミッター
     ・曲の 組み立て …… イントロ（ライザーで ため）→ Aメロ → Bメロ（ロールで もりあげ）→ サビ（クラッシュ＋全部）
     ・もりあがり（setIntensity）… 1：arp と ハイハットが 入る／2：メロディが 1オクターブ下でも 重なり テンポ↑
       ボスが おこったら（setEnrage）… さらに 速く・バスドラ 2倍

   曲は 文字で 書く（1セクション ＝ 2小節 ＝ 16分音符 32こ）：
     "e5 - - . g5 - a5 -"  … e5 を 3つぶん のばす・「.」は おやすみ・「-」は 前の 音を のばす
     コードは "F G Em Am" の ように 4つ（1つ ＝ 2はく）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.bgm = (function () {
  let ctx = null;
  let master = null, comp = null, leadBus = null, duckBus = null, duckGain = null;
  let timer = null;
  let playing = null;
  let desired = null;
  let queued = null;
  let enabled = true;
  let volume = 1;
  let step = 0;
  let nextTime = 0;
  let level = 0;
  let enrage = false;

  /* =======================================================
     楽ふの 読み方
     ======================================================= */
  const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function noteMidi(tok) {
    const m = /^([a-g])(#|b)?(\d)$/.exec(tok);
    if (!m) return null;
    let n = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (Number(m[3]) + 1) + n;
  }
  // "e5 - - . g5 - a5 -" → { notes: [32], lens: [32] }
  function parseLine(str) {
    const toks = String(str).replace(/\|/g, ' ').trim().split(/\s+/);
    const notes = [], lens = [];
    let last = -1;
    toks.forEach(function (tk) {
      if (tk === '-') { notes.push(0); lens.push(0); if (last >= 0) lens[last]++; return; }
      if (tk === '.') { notes.push(0); lens.push(0); last = -1; return; }
      const mi = noteMidi(tk);
      if (mi == null) { notes.push(-1); lens.push(0); last = -1; return; }   // まちがい（validate で 見つける）
      notes.push(mi); lens.push(1); last = notes.length - 1;
    });
    return { notes: notes, lens: lens, count: toks.length };
  }
  const CHORD = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6], sus: [0, 5, 7] };
  const ROOT = { c: 48, 'c#': 49, db: 49, d: 38, 'd#': 39, eb: 39, e: 40, f: 41, 'f#': 42, gb: 42, g: 43, 'g#': 44, ab: 44, a: 45, 'a#': 46, bb: 46, b: 47 };
  // "Am" → { root: 45, notes: [0,3,7] }
  function parseChord(tok) {
    const m = /^([A-G])(#|b)?(m7|m|7|dim|sus)?$/.exec(tok);
    if (!m) return null;
    const root = ROOT[(m[1] + (m[2] || '')).toLowerCase()];
    if (root == null) return null;
    return { root: root, notes: CHORD[m[3] || ''] };
  }
  function parseChords(str) {
    return String(str).trim().split(/\s+/).map(parseChord);
  }

  /* =======================================================
     曲
       bpm / lead（supersaw / chip / brass / pluck）/ intro / order / once / then
       sec: { chords, mel, bass?, drums, pad, arp, crash, riser, stab, harm }
         bass … 書かなければ コードから 自動（8分の ルート・さいごに 5度）
         drums … none / kick / half / full / roll / hits
     ======================================================= */
  const SONGS = {
    /* ---- タイトル：ぼうけんの はじまり（王道進行 F G Em Am・128）
           ため（イントロ）→ Aメロ → Bメロ（ロール）→ サビ（クラッシュ・supersaw） ---- */
    title: {
      bpm: 128, lead: 'supersaw', intro: ['I1', 'I2'], order: ['A', 'A2', 'B', 'C', 'C2'],
      vol: { lead: 0.085, pad: 0.03, arp: 0.045, bass: 0.09 },
      sec: {
        I1: { chords: 'F G Em Am', pad: true, arp: true, drums: 'none',
              mel: 'e5 - - - g5 - - - | a5 - - - - - - - | . . . . . . . . | c6 - b5 - a5 - g5 -' },
        I2: { chords: 'F G Em Am', pad: true, arp: true, drums: 'roll', riser: true,
              mel: 'a5 - - - - - - - | . . . . a5 - b5 - | c6 - - - - - - - | . . . . . . . .' },
        A:  { chords: 'Am F C G', pad: true, arp: true, drums: 'half',
              mel: 'e5 - a5 - . a5 b5 - | c6 - b5 - a5 - - . | g5 - e5 - . e5 g5 - | a5 - - - - - . .' },
        A2: { chords: 'Am F C G', pad: true, arp: true, drums: 'half',
              mel: 'e5 - a5 - . a5 b5 - | c6 - d6 - c6 - - . | b5 - g5 - . g5 e5 - | g5 - - - a5 - b5 -' },
        B:  { chords: 'F G Am G', pad: true, arp: true, drums: 'roll', riser: true,
              mel: 'a5 . a5 . a5 - b5 - | b5 . b5 . b5 - c6 - | c6 . c6 . c6 - d6 - | e6 - - - - - - -' },
        C:  { chords: 'F G Em Am', pad: true, arp: true, drums: 'full', crash: true,
              mel: 'a5 - - c6 - - b5 - | g5 - - - . . a5 b5 | c6 - - b5 - - g5 - | a5 - - - - - - .' },
        C2: { chords: 'F G Em Am', pad: true, arp: true, drums: 'full', crash: true,
              mel: 'a5 - - c6 - - d6 - | e6 - - - - - d6 c6 | b5 - - g5 - - a5 - | c6 - - - - - - -' }
      }
    },

    /* ---- マップ：ゆったり・うきうき（F Am Bb C・100）。プラックの メロディ ---- */
    map: {
      bpm: 100, lead: 'pluck', order: ['A', 'A2', 'B', 'C'],
      vol: { lead: 0.09, pad: 0.026, arp: 0.036, bass: 0.075 },
      sec: {
        A:  { chords: 'F Am Bb C', pad: true, arp: false, drums: 'half',
              mel: 'a4 - c5 - . c5 d5 - | c5 - - - . . a4 - | bb4 - d5 - . d5 f5 - | e5 - - - - - . .' },
        A2: { chords: 'F Am Bb C', pad: true, arp: true, drums: 'half',
              mel: 'a4 - c5 - . c5 d5 - | c5 - d5 - c5 - a4 - | bb4 - d5 - . d5 f5 - | g5 - - - e5 - - .' },
        B:  { chords: 'Dm Bb C F', pad: true, arp: true, drums: 'half',
              mel: 'd5 - f5 - . f5 g5 - | f5 - e5 - d5 - - . | bb4 - c5 - d5 - f5 - | e5 - - - c5 - - .' },
        C:  { chords: 'F Am Bb C', pad: true, arp: true, drums: 'half',
              mel: 'a4 - c5 - d5 - f5 - | e5 - - - c5 - - . | d5 - c5 - bb4 - c5 - | a4 - - - - - - .' }
      }
    },

    /* ---- たたかい：はやい・ノリノリ（Am F C G・145）。頭に「デデン！」 ---- */
    battle: {
      bpm: 145, lead: 'supersaw', intro: ['I'], order: ['A', 'A', 'B', 'C', 'C', 'D'],
      vol: { lead: 0.08, pad: 0.024, arp: 0.045, bass: 0.1 },
      sec: {
        I: { chords: 'Am Am E7 E7', pad: false, arp: false, drums: 'hits', stab: true, riser: true,
             mel: 'a4 . . . a4 . . . a5 - - - . . . . | . . . . . . . . e5 . g5 . a5 - - -' },
        A: { chords: 'Am F C G', pad: true, arp: true, drums: 'full',
             mel: 'a5 . a5 . c6 - b5 a5 | g5 - - . e5 - g5 - | a5 . a5 . c6 - d6 c6 | b5 - g5 - e5 - - .' },
        B: { chords: 'Am G F E7', pad: true, arp: true, drums: 'full',
             mel: 'c6 - - b5 - a5 - . | g5 - a5 - b5 - - . | c6 - - d6 - c6 - . | b5 - - - g#5 - e5 -' },
        C: { chords: 'F G Am E7', pad: true, arp: true, drums: 'full', crash: true,
             mel: 'e6 - - - d6 - c6 - | b5 - - - g5 - a5 - | c6 - - - b5 - a5 - | g#5 - a5 - b5 - c6 -' },
        D: { chords: 'F G C G', pad: true, arp: true, drums: 'full',
             mel: 'e6 - d6 - c6 - b5 - | a5 - - - - - . . | e6 - d6 - c6 - b5 - | g5 - a5 - b5 - - -' }
      }
    },

    /* ---- ボス：きんちょう（Dm Bb Gm A7・152）。ひくい うなり＋重い ドラム ---- */
    boss: {
      bpm: 152, lead: 'supersaw', intro: ['I'], order: ['A', 'A', 'B', 'A', 'B', 'C'],
      vol: { lead: 0.082, pad: 0.03, arp: 0.04, bass: 0.11 },
      sec: {
        I: { chords: 'Dm Dm Dm A7', pad: true, arp: false, drums: 'hits', stab: true, riser: true,
             mel: 'd5 . d5 . d5 . f5 . | e5 - - - - - - - | d5 . d5 . d5 . f5 . | a5 - - - - - - -' },
        A: { chords: 'Dm Bb Gm A7', pad: true, arp: true, drums: 'full',
             mel: 'd5 . d5 . f5 - e5 d5 | c5 - - . d5 - f5 - | g5 . g5 . bb5 - a5 g5 | a5 - - - - - . .' },
        B: { chords: 'Bb C Dm A7', pad: true, arp: true, drums: 'full',
             mel: 'f5 - - g5 - a5 - . | bb5 - - a5 - g5 - . | f5 - g5 - a5 - bb5 - | c#6 - - - - - - .' },
        C: { chords: 'Dm Bb C A7', pad: true, arp: true, drums: 'full', crash: true,
             mel: 'd6 - - - c6 - a5 - | bb5 - - - a5 - g5 - | a5 - - - g5 - f5 - | e5 - - - c#6 - - -' }
      }
    },

    /* ---- まおう：さいごの たたかい（Em C D B7・160）。ひろい pad ＋ supersaw ---- */
    maou: {
      bpm: 160, lead: 'supersaw', intro: ['I'], order: ['A', 'A', 'B', 'A', 'C', 'D'],
      vol: { lead: 0.085, pad: 0.034, arp: 0.042, bass: 0.11 },
      sec: {
        I: { chords: 'Em Em C B7', pad: true, arp: false, drums: 'hits', stab: true, riser: true,
             mel: 'e5 - - - . . b4 . | e5 - - - . . . . | g5 - f#5 - e5 - d5 - | b4 - - - - - - -' },
        A: { chords: 'Em C D B7', pad: true, arp: true, drums: 'full',
             mel: 'e5 . e5 . g5 - f#5 e5 | c5 - - . e5 - g5 - | a5 . a5 . c6 - b5 a5 | b5 - - - - - . .' },
        B: { chords: 'C D Em B7', pad: true, arp: true, drums: 'full',
             mel: 'g5 - - a5 - b5 - . | c6 - - b5 - a5 - . | g5 - a5 - b5 - c6 - | d#6 - - - - - - .' },
        C: { chords: 'Em C D B7', pad: true, arp: true, drums: 'full', crash: true,
             mel: 'e6 - - - d6 - b5 - | c6 - - - b5 - a5 - | b5 - - - a5 - g5 - | f#5 - - - d#6 - - -' },
        D: { chords: 'C D Em Em', pad: true, arp: true, drums: 'full',
             mel: 'e6 - d6 - b5 - g5 - | a5 - - - - - . . | e6 - d6 - b5 - g5 - | b5 - c6 - d6 - e6 -' }
      }
    },

    /* ---- ファンファーレ：ボスを たおした 瞬間（1回だけ・ラッパ） ---- */
    fanfare: {
      bpm: 132, lead: 'brass', order: ['A'], once: true,
      vol: { lead: 0.1, pad: 0, arp: 0, bass: 0.09 },
      sec: {
        A: { chords: 'C C G7 C', pad: false, arp: false, drums: 'hits', stab: true, crash: true,
             mel: 'g4 . g4 . g4 . c5 . | . . . . e5 - - - | g5 - - - - - e5 - | c6 - - - - - - -' }
      }
    },

    /* ---- しょうり：けっか画面（C G Am F・124）。明るい ポップ ---- */
    victory: {
      bpm: 124, lead: 'supersaw', order: ['A', 'A', 'B', 'C'],
      vol: { lead: 0.08, pad: 0.028, arp: 0.04, bass: 0.09 },
      sec: {
        A: { chords: 'C G Am F', pad: true, arp: true, drums: 'full', crash: true,
             mel: 'c5 - - - e5 - g5 - | a5 - g5 - e5 - - . | g5 - - - e5 - d5 - | c5 - - - - - . .' },
        B: { chords: 'C G Am F', pad: true, arp: true, drums: 'full',
             mel: 'e5 - - - g5 - a5 - | c6 - - - a5 - g5 - | a5 - g5 - e5 - d5 - | e5 - - - - - . .' },
        C: { chords: 'F G C C', pad: true, arp: true, drums: 'full',
             mel: 'f5 - f5 - a5 - - . | g5 - g5 - b5 - - . | c6 - - - g5 - e5 - | c5 - - - - - - -' }
      }
    },

    /* ---- エンディング：まおうを たおした あと（F G Em Am・112）。ゆっくり・堂々 ---- */
    ending: {
      bpm: 112, lead: 'supersaw', order: ['A', 'B', 'A', 'C', 'D'],
      vol: { lead: 0.08, pad: 0.032, arp: 0.038, bass: 0.085 },
      sec: {
        A: { chords: 'C G Am F', pad: true, arp: true, drums: 'half',
             mel: 'c5 - - - d5 - e5 - | g5 - - - - - e5 - | a5 - - - g5 - e5 - | f5 - - - - - - .' },
        B: { chords: 'F G Em Am', pad: true, arp: true, drums: 'half',
             mel: 'f5 - - - g5 - a5 - | g5 - - - - - e5 - | d5 - - - e5 - d5 - | c5 - - - - - - .' },
        C: { chords: 'F G C Am', pad: true, arp: true, drums: 'full', crash: true,
             mel: 'a5 - - - c6 - - - | b5 - - - g5 - - - | c6 - - - - - - - | - - - - . . . .' },
        D: { chords: 'F G C C', pad: true, arp: true, drums: 'full',
             mel: 'f5 - g5 - a5 - c6 - | b5 - - - g5 - - - | c6 - - - e6 - - - | c6 - - - - - - -' }
      }
    }
  };

  /* =======================================================
     ドラムの パターン（16ステップ ＝ 1小節。2つ 書けば 2小節）
       K バスドラ  S スネア  C クラップ  h ハイハット  H あいた ハイハット  X クラッシュ  r ロール（スネア 小）
     ======================================================= */
  const DRUMS = {
    none: [],
    kick: ['K...K...K...K...'],
    half: ['K...K...K...K...', '....S.......S...', 'h.h.h.h.h.h.h.h.'],
    full: ['K...K...K...K...', '....S.......S...', 'hhhhhhhhhhhhhhhH', '....C.......C...'],
    hits: ['K.......K.......', 'X...............'],
    roll: ['K...K...K...K...K...K...K...K...', 'r.r.r.r.r.r.r.r.rrrrrrrrrrrrrrrr', 'h.h.h.h.h.h.h.h.hhhhhhhhhhhhhhhh']
  };
  const DRUMS_UP = { none: 'kick', kick: 'half', half: 'full', full: 'full', hits: 'hits', roll: 'roll' };

  /* =======================================================
     おとを 出す 土台
     ======================================================= */
  function makeReverb(sec) {
    try {
      const len = Math.floor(ctx.sampleRate * sec);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      const cv = ctx.createConvolver();
      cv.buffer = ir;
      return cv;
    } catch (e) { return null; }
  }

  function context() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.78;

        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5;
        comp.attack.value = 0.005; comp.release.value = 0.16;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -4; limiter.knee.value = 2; limiter.ratio.value = 20;
        limiter.attack.value = 0.002; limiter.release.value = 0.1;

        // リードだけ 山びこ
        leadBus = ctx.createGain();
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.2;
        const fb = ctx.createGain(); fb.gain.value = 0.28;
        const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
        leadBus.connect(master);
        leadBus.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay); fb.connect(master);

        // pad・arp・bass は バスドラで しずむ（サイドチェイン）
        duckBus = ctx.createGain();
        duckGain = ctx.createGain();
        duckBus.connect(duckGain); duckGain.connect(master);

        const lowShelf = ctx.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 150; lowShelf.gain.value = 3;
        const highShelf = ctx.createBiquadFilter(); highShelf.type = 'highshelf'; highShelf.frequency.value = 3200; highShelf.gain.value = 5;
        master.connect(lowShelf); lowShelf.connect(highShelf); highShelf.connect(comp);
        const verb = makeReverb(0.8);   // 1.6秒だと 重さの 半分が ひびきだった（実測）
        if (verb) {
          const wet = ctx.createGain(); wet.gain.value = 0.26;
          highShelf.connect(verb); verb.connect(wet); wet.connect(comp);
        }
        comp.connect(limiter);
        limiter.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /* おわった 音は 出口の つなぎを 外す。外さないと おわった 音が つみ上がり、
     長く 鳴らす ほど 重く なって タブレットで とぎれる（v14.0 で 実測：16秒で 47%） */
  let trash = [];
  function retire(node, endAt) { trash.push([endAt + 0.1, node]); }
  function sweepTrash() {
    if (!trash.length) return;
    const now = ctx.currentTime;
    const keep = [];
    for (let i = 0; i < trash.length; i++) {
      if (trash[i][0] < now) { try { trash[i][1].disconnect(); } catch (e) {} }
      else keep.push(trash[i]);
    }
    trash = keep;
  }
  function panned(node, pan) {
    if (!ctx.createStereoPanner) return node;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    return p;
  }
  function env(gain, t, dur, vol, attack, sus) {
    const a = attack || 0.008;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * (sus || 0.7)), t + Math.min(dur * 0.5, a + 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  // ゆれ（ビブラート）。1つの 音に 1つだけ 作って、重ねた 波 ぜんぶに つなぐ（タブレットで 重く しない）
  function vibrato(oscs, t, dur, depth) {
    if (dur < 0.24) return;
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 5.6;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(depth || 10, t + Math.min(0.3, dur * 0.5));
    lfo.connect(lg);
    (oscs.length ? oscs : [oscs]).forEach(function (o) { lg.connect(o.detune); });
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  function osc(type, midi, t, dur, detune) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq(midi), t);
    if (detune) o.detune.setValueAtTime(detune, t);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  /* ---- 楽器 ---- */
  // supersaw：のこぎり 5本を 左右に ひろげる。今どきの ゲームの リード
  function supersaw(t, midi, dur, vol) {
    const g = ctx.createGain();
    // 左・右の 2つの フィルターに まとめる（波は 5本・フィルターは 3つ）
    const sides = [-0.65, 0, 0.65].map(function (pan) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(9000, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + Math.max(0.12, dur));
      panned(f, pan).connect(g);
      return f;
    });
    const saws = [[-18, 0], [-9, 0], [0, 1], [9, 2], [18, 2]].map(function (v) {
      const o = osc('sawtooth', midi, t, dur, v[0]);
      o.connect(sides[v[1]]);
      return o;
    });
    vibrato(saws, t, dur, 8);
    // まん中に 1オクターブ下の 四角（芯）
    const sub = osc('square', midi - 12, t, dur);
    const sg = ctx.createGain(); sg.gain.value = 0.3;
    sub.connect(sg); sg.connect(g);
    env(g, t, dur, vol * volume * 0.42, 0.012, 0.8);
    g.connect(leadBus);
    retire(g, t + dur + 0.05);
  }
  // pluck：みじかく はじく。アルペジオと マップの メロディ
  function pluck(t, midi, dur, vol) {
    const g = ctx.createGain();
    const d = Math.min(dur, 0.32);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(7000, t);
    f.frequency.exponentialRampToValueAtTime(700, t + d);
    osc('sawtooth', midi, t, d, -6).connect(f);
    osc('sawtooth', midi, t, d, 6).connect(f);
    f.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * volume, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const out = panned(g, ((midi % 12) / 11 - 0.5) * 0.9);   // 音の 高さで 左右に ちらす
    out.connect(duckBus);
    retire(out, t + d + 0.05);
  }
  // pad：コードを ささえる ひろい 音（ゆっくり 立ち上がる）
  function pad(t, root, notes, dur, vol) {
    notes.forEach(function (n, i) {
      const g = ctx.createGain();
      const pan = (i / Math.max(1, notes.length - 1) - 0.5) * 1.2;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.5);
      osc('sawtooth', root + 12 + n, t, dur, -10).connect(f);
      osc('sawtooth', root + 12 + n, t, dur, 10).connect(f);
      panned(f, pan).connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * volume, t + dur * 0.3);
      g.gain.setValueAtTime(vol * volume, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      g.connect(duckBus);
      retire(g, t + dur + 0.1);
    });
  }
  // bass：のこぎり（フィルター）＋ 1オクターブ下の 四角 ＋ サイン
  function bass(t, midi, dur, vol) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(300, t + dur);
    osc('sawtooth', midi, t, dur).connect(f);
    f.connect(g);
    const sq = osc('square', midi - 12, t, dur);
    const sqg = ctx.createGain(); sqg.gain.value = 0.35; sq.connect(sqg); sqg.connect(g);
    const sn = osc('sine', midi - 12, t, dur);
    const sng = ctx.createGain(); sng.gain.value = 0.9; sn.connect(sng); sng.connect(g);
    env(g, t, dur, vol * volume, 0.006, 0.75);
    g.connect(duckBus);
    retire(g, t + dur + 0.05);
  }
  // chip：レトロの 四角（1オクターブ下に 三角）
  function chip(t, midi, dur, vol) {
    const g = ctx.createGain();
    const sq = [[-7, -0.3], [7, 0.3]].map(function (v) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(6400, t);
      f.frequency.exponentialRampToValueAtTime(3400, t + dur);
      const o = osc('square', midi, t, dur, v[0]);
      o.connect(f);
      panned(f, v[1]).connect(g);
      return o;
    });
    vibrato(sq, t, dur, 9);
    const b = osc('triangle', midi - 12, t, dur);
    const bg = ctx.createGain(); bg.gain.value = 0.45; b.connect(bg); bg.connect(g);
    env(g, t, dur, vol * volume, 0.006);
    g.connect(leadBus);
    retire(g, t + dur + 0.05);
  }
  // brass：ラッパ（のこぎり 2本 左右 ＋ 四角）
  function brass(t, midi, dur, vol) {
    const g = ctx.createGain();
    const os = [[-8, 'sawtooth', -0.3, 1], [8, 'sawtooth', 0.3, 1], [0, 'square', 0, 0.35]].map(function (v) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.Q.value = 2.2;
      f.frequency.setValueAtTime(1500, t);
      f.frequency.exponentialRampToValueAtTime(4400, t + 0.06);
      f.frequency.exponentialRampToValueAtTime(2000, t + dur);
      const o = osc(v[1], midi, t, dur, v[0]);
      const vg = ctx.createGain(); vg.gain.value = v[3];
      o.connect(f); f.connect(vg);
      panned(vg, v[2]).connect(g);
      return o;
    });
    vibrato(os, t, dur, 10);
    env(g, t, dur, vol * volume, 0.02, 0.8);
    g.connect(leadBus);
    retire(g, t + dur + 0.05);
  }
  const LEADS = { supersaw: supersaw, pluck: pluck, chip: chip, brass: brass };

  // コードの ジャーン（イントロ・ファンファーレ）
  function stab(t, ch, dur, vol) {
    ch.notes.forEach(function (n) { supersaw(t, ch.root + 12 + n, dur, vol * 0.6); });
    bass(t, ch.root - 12, dur, vol * 0.9);
  }

  /* ---- ドラム ---- */
  // ノイズは 長さごとに 1回だけ 作って 使いまわす（毎回 作ると タブレットで 音が とぎれる）
  const noiseCache = {};
  function noiseBuf(dur) {
    const key = Math.round(dur * 1000);
    if (noiseCache[key] && noiseCache[key].sampleRate === ctx.sampleRate) return noiseCache[key];
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noiseCache[key] = buf;
    return buf;
  }
  function noiseHit(t, dur, vol, type, fq, q, pan) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(dur);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = fq; if (q) f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const out = panned(g, pan || 0);
    src.connect(f); f.connect(g); out.connect(master);
    src.start(t);
    retire(out, t + dur + 0.02);
  }
  function duck(t) {
    if (!duckGain) return;
    const p = duckGain.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(1, t);
    p.linearRampToValueAtTime(0.42, t + 0.012);
    p.exponentialRampToValueAtTime(1, t + 0.24);
  }
  function kick(t, big) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(big ? 190 : 165, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((big ? 0.3 : 0.24) * volume, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.26);
    retire(g, t + 0.26);
    noiseHit(t, 0.018, 0.06, 'bandpass', 3400, 1);   // カッ
    duck(t);
  }
  function snare(t, soft) {
    const v = soft ? 0.5 : 1;
    noiseHit(t, 0.2, 0.11 * v, 'bandpass', 2400, 0.6);
    noiseHit(t, 0.05, 0.07 * v, 'highpass', 6000);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    og.gain.setValueAtTime(0.09 * v * volume, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.15);
    retire(og, t + 0.15);
  }
  function clap(t) {
    [0, 0.011, 0.022].forEach(function (d) { noiseHit(t + d, 0.03, 0.05, 'bandpass', 1800, 1.2, d * 20 - 0.2); });
    noiseHit(t + 0.03, 0.16, 0.05, 'bandpass', 1600, 0.9, 0.1);
  }
  function hat(t, open) {
    noiseHit(t, open ? 0.14 : 0.03, open ? 0.03 : 0.022, 'highpass', 7600, 0, 0.25);
  }
  function crash(t) {
    noiseHit(t, 1.4, 0.075, 'highpass', 4200, 0, -0.2);
    noiseHit(t, 0.5, 0.05, 'bandpass', 9000, 0.5, 0.2);
  }
  // ライザー：ノイズの 高さが 上がって いく（サビの 前の「ため」）
  function riser(t, dur) {
    const src = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09 * volume, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.1);
    retire(g, t + dur + 0.1);
  }

  /* =======================================================
     曲を ひろげる（イントロ＋セクションの ならびを 1本に）
     ======================================================= */
  const expanded = {};
  function secList(song) {
    return (song.intro || []).concat(song.order);
  }
  function autoBass(chords) {
    // 8分で ルート、コードの さいごの 8分は 5度（今どきの「うねる」ベース）
    const out = [], lens = [];
    for (let i = 0; i < 32; i++) {
      const c = chords[Math.floor(i / 8) % chords.length];
      const pos = i % 8;
      if (i % 2 === 0) { out.push(c.root - 12 + (pos === 6 ? 7 : 0)); lens.push(1); }
      else { out.push(0); lens.push(0); }
    }
    return { notes: out, lens: lens };
  }
  function expand(name) {
    if (expanded[name]) return expanded[name];
    const song = SONGS[name];
    const ex = { mel: [], melLen: [], bass: [], bassLen: [], arp: [], chords: [], flags: [], song: song };
    secList(song).forEach(function (id) {
      const s = song.sec[id];
      const chords = parseChords(s.chords);
      const m = parseLine(s.mel);
      const b = s.bass ? parseLine(s.bass) : autoBass(chords);
      for (let i = 0; i < 32; i++) {
        ex.mel.push(m.notes[i] > 0 ? m.notes[i] : 0);
        ex.melLen.push(m.lens[i] || 0);
        ex.bass.push(b.notes[i] > 0 ? b.notes[i] : 0);
        ex.bassLen.push(b.lens[i] || 0);
        const c = chords[Math.floor(i / 8) % chords.length];
        const seq = [0, 1, 2, 3, 2, 1];
        const n = c.notes;
        const k = seq[(i / 2 | 0) % seq.length];
        ex.arp.push(c.root + 24 + (k >= n.length ? n[0] + 12 : n[k]));
        ex.chords.push(i % 8 === 0 ? c : null);
        ex.flags.push(i === 0 ? s : (i % 8 === 0 ? { chords: chords } : null));
      }
    });
    ex.len = ex.mel.length;
    ex.loopStart = (song.intro || []).length * 32;
    expanded[name] = ex;
    return ex;
  }

  // 曲の データに まちがいが ないか（tools/smoke.js から よぶ）
  function validate() {
    const errs = [];
    Object.keys(SONGS).forEach(function (name) {
      const s = SONGS[name];
      if (!LEADS[s.lead]) errs.push(name + '.lead が へん');
      secList(s).forEach(function (id) {
        const sec = s.sec[id];
        if (!sec) { errs.push(name + '.' + id + ' が ない'); return; }
        const ch = parseChords(sec.chords);
        if (ch.length !== 4 || ch.some(function (c) { return !c; })) errs.push(name + '.' + id + '.chords は 4つ（' + sec.chords + '）');
        const m = parseLine(sec.mel);
        if (m.count !== 32) errs.push(name + '.' + id + '.mel が ' + m.count + '個（32 でないと いけない）');
        if (m.notes.some(function (n) { return n < 0; })) errs.push(name + '.' + id + '.mel に 読めない 音');
        if (sec.bass) {
          const b = parseLine(sec.bass);
          if (b.count !== 32 || b.notes.some(function (n) { return n < 0; })) errs.push(name + '.' + id + '.bass が へん');
        }
        if (!DRUMS[sec.drums || 'none']) errs.push(name + '.' + id + '.drums が へん');
      });
    });
    return errs;
  }

  function drumsOf(sec) {
    const base = sec.drums || 'none';
    if (enrage) return base === 'hits' || base === 'roll' ? base : 'full';
    return level >= 1 ? (DRUMS_UP[base] || base) : base;
  }
  function drumAt(sec, i) {
    const pats = DRUMS[drumsOf(sec)] || [];
    const out = [];
    pats.forEach(function (p) {
      const ch = p[i % p.length];
      if (ch && ch !== '.') out.push(ch);
    });
    if (enrage && i % 8 === 4 && out.indexOf('K') < 0) out.push('K');
    return out;
  }

  /* =======================================================
     演奏
     ======================================================= */
  function tempoMul() {
    return (level >= 2 ? 1.05 : 1) * (enrage ? 1.06 : 1);
  }

  function tick() {
    if (!ctx || !playing || ctx.state !== 'running') return;
    sweepTrash();
    const ex = expand(playing);
    const song = ex.song;
    const leadFn = LEADS[song.lead] || supersaw;
    const V = song.vol;
    let curSec = null;
    while (nextTime < ctx.currentTime + 0.3) {
      if (step >= ex.len) {
        if (song.once) {
          const nx = queued || song.then || null;
          queued = null;
          const at = nextTime;
          playing = null;
          if (nx) play(nx, at); else stop();
          return;
        }
        step = ex.loopStart;
      }
      const stepDur = 60 / (song.bpm * tempoMul()) / 4;
      const i = step;
      // セクションの 頭
      const secStart = Math.floor(i / 32) * 32;
      curSec = ex.flags[secStart];
      if (i === secStart) {
        if (curSec.crash) crash(nextTime);
        if (curSec.riser) riser(nextTime, stepDur * 32);
      }
      const ch = ex.chords[i];
      if (ch) {
        const cdur = stepDur * 8;
        if (curSec.pad && V.pad) pad(nextTime, ch.root, ch.notes, cdur, V.pad * (level >= 2 ? 1.2 : 1));
        if (curSec.stab) stab(nextTime, ch, stepDur * 3.5, V.lead * 0.8);
      }
      if (ex.mel[i]) {
        const dur = stepDur * Math.max(1, ex.melLen[i]) * 0.95;
        leadFn(nextTime, ex.mel[i], dur, V.lead);
        if (level >= 2 && song.lead !== 'pluck') supersaw(nextTime, ex.mel[i] - 12, dur, V.lead * 0.5);
      }
      if (ex.bass[i] && V.bass) bass(nextTime, ex.bass[i], stepDur * Math.max(1, ex.bassLen[i]) * 0.9, V.bass);
      const arpOn = (curSec.arp || level >= 1) && V.arp;
      if (arpOn && i % 2 === 0 && !(curSec.stab)) pluck(nextTime, ex.arp[i], stepDur * 1.6, V.arp * (level >= 1 ? 1.2 : 1));
      drumAt(curSec, i).forEach(function (c) {
        if (c === 'K') kick(nextTime, enrage);
        else if (c === 'S') snare(nextTime);
        else if (c === 'r') snare(nextTime, true);
        else if (c === 'C') clap(nextTime);
        else if (c === 'h') hat(nextTime, false);
        else if (c === 'H') hat(nextTime, true);
        else if (c === 'X') crash(nextTime);
      });
      step++;
      nextTime += stepDur;
    }
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(tick, 100);
  }

  function stop() {
    playing = null;
    queued = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function play(name, opts) {
    if (typeof opts === 'number') opts = { at: opts };
    opts = opts || {};
    if (!SONGS[name]) name = 'map';
    const song = SONGS[name];
    if (song.once) {
      queued = opts.then || null;
      desired = queued || desired;
    } else {
      desired = name;
    }
    if (!enabled) return;
    const c = context();
    if (!c) return;
    if (c.state !== 'running') return;
    if (playing === name && !song.once) return;
    playing = name;
    step = 0;
    level = 0;
    enrage = false;
    nextTime = opts.at || (c.currentTime + 0.06);
    startTimer();
  }

  function then(name) {
    if (playing && SONGS[playing] && SONGS[playing].once) { queued = name; desired = name; return; }
    play(name);
  }
  function setIntensity(n) { level = Math.max(0, Math.min(2, n | 0)); }
  function setEnrage(on) { enrage = !!on; }

  function kickStart() {
    const c = context();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().then(function () { if (desired) { playing = null; play(desired); } }).catch(function () {});
    } else if (desired && !playing) {
      play(desired);
    }
  }
  /* v13.11：iPad／iPhone の Safari の ため。タップ（touchend・click）の たびに boot.js が 呼ぶ。
     まだ ひらいて いない（suspended）か 電話・ほかの アプリで 止まった（interrupted）ときだけ ひらき直す。
     ひらいて いる ときは 何も しない（stop() で わざと 止めた 曲を 勝手に 鳴らし直さない） */
  function wake() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    ctx.resume().then(function () { if (enabled && desired && !playing) play(desired); }).catch(function () {});
  }
  function setEnabled(on) {
    enabled = !!on;
    if (!on) stop();
    else if (desired) { playing = null; play(desired); }
  }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); }

  return {
    play: play, then: then, stop: stop, kick: kickStart, wake: wake,
    setIntensity: setIntensity, setEnrage: setEnrage,
    setEnabled: setEnabled, isEnabled: function () { return enabled; },
    setVolume: setVolume, validate: validate,
    songs: SONGS, current: function () { return playing; },
    parseLine: parseLine, parseChords: parseChords
  };
})();
