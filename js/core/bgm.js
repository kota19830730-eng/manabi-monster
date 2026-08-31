/* ---------------------------------------------------------
   BGM（ファイルを使わず、プログラムが 演奏する 音楽）

   v1.9（2026-08-30）で 大きく 作り直しました。
     ・曲は 8曲
         title / map …… おだやか（マイクラの 音楽の ような すきま の ある 音）
         battle / boss / maou …… はやくて ノリのいい チップチューン（ポケモン風）
         fanfare …… ボスを たおした 瞬間の ファンファーレ（1回だけ 鳴る）
         victory …… ボスを たおした あとの けっか画面
         ending  …… まおうを たおした あとの けっか画面（長い・堂々）
     ・イントロ …… battle / boss / maou は 曲の 頭に「デデン！」が 1回 つく
     ・もりあがり（setIntensity）
         コンボ 3〜 … ドラムが 激しく なる
         コンボ 5〜 … 高い 音の メロディが もう1本 かさなり、テンポが 上がる
       ボスが おこったら（setEnrage）… さらに 速く
     ・音色 … square（チップ）／soft（やわらかい）／brass（ラッパ）
     ・stabs … コードが 変わる ところで「ジャーン」と わおんを 鳴らす（ファンファーレ用）

   曲は 数字の列。数字は 音の高さ（MIDI番号）、0は おやすみ。
   1セクション ＝ 32個 ＝ 2小節（16分音符きざみ）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.bgm = (function () {
  let ctx = null;
  let master = null, comp = null, delay = null, delayGain = null, leadBus = null;
  let timer = null;
  let playing = null;   // いま鳴っている曲の名前
  let desired = null;   // 鳴らしたい曲（最初のタップ前は 鳴らせないので おぼえておく）
  let queued = null;    // 1回だけの 曲（fanfare）の あとに 鳴らす 曲
  let enabled = true;
  let volume = 1;
  let step = 0;
  let nextTime = 0;
  let level = 0;        // もりあがり 0 / 1 / 2
  let enrage = false;   // ボスが おこっている

  /* =======================================================
     コード（わおん）
     ======================================================= */
  const CHORD = {
    maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], sus: [0, 5, 7],
    maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10]
  };

  /* =======================================================
     曲

     melody / bass … 32個 ＝ 2小節ぶん（16分音符）
     chords        … 8ステップごとに 1つ（4つで 32ステップ）
     order         … セクションを ならべた 順番（ここを くり返す）
     intro         … いちばん 最初に 1回だけ 鳴らす セクション
     once          … true なら くり返さない（おわったら queued の 曲へ）
     lead          … 'square' / 'soft' / 'brass'
     drums         … 'none' / 'soft' / 'rock' / 'fast' / 'fast2' / 'heavy' / 'march'
     stabs         … コードの 頭で わおんを ジャーンと 鳴らす
     ======================================================= */
  const SONGS = {
    /* ---- タイトル：しずかで りっぱ（マイクラ風の すきま） ---- */
    title: {
      bpm: 76, lead: 'soft', drums: 'none', leadVol: 0.07, bassVol: 0.06, arpVol: 0.03,
      order: ['A', 'B', 'A', 'C'],
      chords: {
        A: [[48, 'maj'], [43, 'maj'], [45, 'min'], [41, 'maj']],
        B: [[41, 'maj'], [43, 'maj'], [48, 'maj'], [48, 'maj']],
        C: [[45, 'min'], [41, 'maj'], [43, 'maj'], [48, 'maj']]
      },
      melody: {
        A: [76, 0, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 81, 0, 0, 0,
            79, 0, 0, 0, 0, 0, 0, 0, 76, 0, 0, 0, 74, 0, 0, 0],
        B: [77, 0, 0, 0, 0, 0, 0, 0, 79, 0, 0, 0, 0, 0, 76, 0,
            72, 0, 0, 0, 0, 0, 0, 0, 74, 0, 76, 0, 0, 0, 0, 0],
        C: [81, 0, 0, 0, 79, 0, 0, 0, 77, 0, 0, 0, 76, 0, 0, 0,
            74, 0, 0, 0, 76, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        A: [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,
            45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
        B: [41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,
            36, 0, 0, 0, 0, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0],
        C: [45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0,
            43, 0, 0, 0, 0, 0, 0, 0, 36, 0, 0, 0, 0, 0, 0, 0]
      }
    },

    /* ---- マップ：おだやかで 少し うきうき ---- */
    map: {
      bpm: 92, lead: 'soft', drums: 'soft', leadVol: 0.062, bassVol: 0.06, arpVol: 0.026,
      order: ['A', 'A', 'B', 'C'],
      chords: {
        A: [[41, 'maj'], [45, 'min'], [46, 'maj'], [48, 'maj']],
        B: [[38, 'min'], [46, 'maj'], [48, 'maj'], [41, 'maj']],
        C: [[41, 'maj'], [45, 'min'], [46, 'maj'], [48, 'maj']]
      },
      melody: {
        A: [69, 0, 0, 0, 72, 0, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0,
            70, 0, 0, 0, 72, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0],
        B: [74, 0, 0, 0, 77, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0,
            70, 0, 72, 0, 74, 0, 72, 0, 69, 0, 0, 0, 0, 0, 0, 0],
        C: [69, 0, 0, 0, 72, 0, 74, 0, 77, 0, 0, 0, 76, 0, 0, 0,
            74, 0, 0, 0, 72, 0, 70, 0, 69, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        A: [41, 0, 0, 0, 48, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0,
            46, 0, 0, 0, 53, 0, 0, 0, 48, 0, 0, 0, 55, 0, 0, 0],
        B: [38, 0, 0, 0, 45, 0, 0, 0, 46, 0, 0, 0, 53, 0, 0, 0,
            48, 0, 0, 0, 55, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0],
        C: [41, 0, 0, 0, 48, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0,
            46, 0, 0, 0, 53, 0, 0, 0, 48, 0, 0, 0, 55, 0, 0, 0]
      }
    },

    /* ---- たたかい：はやい・ノリノリ（ポケモン風）。頭に「デデン！」 ---- */
    battle: {
      bpm: 152, lead: 'square', drums: 'rock', leadVol: 0.05, bassVol: 0.07, arpVol: 0.024,
      intro: 'I', order: ['A', 'A', 'B', 'C', 'C', 'D'],
      chords: {
        I: [[45, 'min'], [45, 'min'], [40, 'dom7'], [40, 'dom7']],
        A: [[45, 'min'], [41, 'maj'], [48, 'maj'], [43, 'maj']],
        B: [[45, 'min'], [43, 'maj'], [41, 'maj'], [40, 'dom7']],
        C: [[41, 'maj'], [43, 'maj'], [45, 'min'], [40, 'dom7']],
        D: [[41, 'maj'], [43, 'maj'], [48, 'maj'], [43, 'maj']]
      },
      melody: {
        I: [69, 0, 0, 0, 69, 0, 0, 0, 81, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 76, 0, 0, 0, 80, 0, 0, 0],
        A: [69, 0, 69, 0, 72, 0, 71, 72, 76, 0, 0, 0, 74, 0, 72, 0,
            69, 0, 69, 0, 72, 0, 71, 72, 79, 0, 0, 0, 76, 0, 74, 0],
        B: [69, 0, 72, 0, 76, 0, 0, 0, 74, 0, 72, 0, 71, 0, 0, 0,
            69, 0, 72, 0, 77, 0, 0, 0, 76, 0, 74, 0, 71, 0, 68, 0],
        C: [81, 0, 0, 0, 79, 0, 81, 0, 84, 0, 0, 0, 83, 0, 81, 0,
            79, 0, 81, 0, 76, 0, 0, 0, 74, 0, 76, 0, 71, 0, 68, 0],
        D: [77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 79, 0, 0, 0,
            72, 0, 74, 0, 76, 0, 79, 0, 81, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        I: [33, 0, 0, 0, 33, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 40, 0, 0, 0],
        A: [33, 0, 45, 0, 33, 0, 45, 0, 29, 0, 41, 0, 29, 0, 41, 0,
            36, 0, 48, 0, 36, 0, 48, 0, 31, 0, 43, 0, 31, 0, 43, 0],
        B: [33, 0, 45, 0, 33, 0, 45, 0, 31, 0, 43, 0, 31, 0, 43, 0,
            29, 0, 41, 0, 29, 0, 41, 0, 28, 0, 40, 0, 28, 0, 40, 0],
        C: [29, 0, 41, 0, 29, 0, 41, 0, 31, 0, 43, 0, 31, 0, 43, 0,
            33, 0, 45, 0, 33, 0, 45, 0, 28, 0, 40, 0, 28, 40, 28, 40],
        D: [29, 0, 41, 0, 29, 0, 41, 0, 31, 0, 43, 0, 31, 0, 43, 0,
            36, 0, 48, 0, 36, 0, 48, 0, 31, 0, 43, 0, 31, 43, 31, 43]
      }
    },

    /* ---- ボス：もっと はやい・きんちょう ---- */
    boss: {
      bpm: 172, lead: 'square', drums: 'fast', leadVol: 0.052, bassVol: 0.08, arpVol: 0.026,
      intro: 'I', order: ['A', 'A', 'B', 'A', 'B', 'C'],
      chords: {
        I: [[38, 'min'], [38, 'min'], [38, 'min'], [45, 'dom7']],
        A: [[38, 'min'], [46, 'maj'], [43, 'min'], [45, 'dom7']],
        B: [[38, 'min'], [48, 'maj'], [46, 'maj'], [45, 'dom7']],
        C: [[43, 'min'], [46, 'maj'], [38, 'min'], [45, 'dom7']]
      },
      melody: {
        I: [62, 0, 0, 0, 0, 0, 0, 0, 62, 0, 0, 0, 0, 0, 0, 0,
            62, 0, 61, 0, 62, 0, 65, 0, 69, 0, 0, 0, 73, 0, 0, 0],
        A: [62, 0, 62, 0, 65, 0, 67, 0, 69, 0, 0, 0, 67, 65, 64, 0,
            62, 0, 62, 0, 65, 0, 67, 0, 70, 0, 69, 0, 67, 0, 65, 0],
        B: [74, 0, 0, 0, 72, 0, 70, 0, 69, 0, 0, 0, 70, 0, 72, 0,
            74, 0, 77, 0, 74, 0, 72, 0, 70, 0, 69, 0, 73, 0, 0, 0],
        C: [77, 0, 79, 0, 81, 0, 0, 0, 79, 0, 77, 0, 74, 0, 0, 0,
            77, 0, 79, 0, 81, 0, 84, 0, 81, 0, 79, 0, 77, 0, 73, 0]
      },
      bass: {
        I: [26, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0,
            26, 0, 26, 0, 26, 0, 26, 0, 33, 0, 0, 0, 33, 0, 0, 0],
        A: [26, 26, 38, 26, 26, 26, 38, 26, 34, 34, 46, 34, 34, 34, 46, 34,
            31, 31, 43, 31, 31, 31, 43, 31, 33, 33, 45, 33, 33, 33, 45, 33],
        B: [26, 26, 38, 26, 26, 26, 38, 26, 36, 36, 48, 36, 36, 36, 48, 36,
            34, 34, 46, 34, 34, 34, 46, 34, 33, 33, 45, 33, 33, 45, 33, 45],
        C: [31, 31, 43, 31, 31, 31, 43, 31, 34, 34, 46, 34, 34, 34, 46, 34,
            26, 26, 38, 26, 26, 26, 38, 26, 33, 33, 45, 33, 33, 45, 33, 45]
      }
    },

    /* ---- ラスボス「まおう」：おもくて 暗い。サビで 一気に 上がる ---- */
    maou: {
      bpm: 156, lead: 'square', drums: 'heavy', leadVol: 0.055, bassVol: 0.095, arpVol: 0.03,
      intro: 'I', order: ['A', 'A', 'B', 'A', 'C', 'C'],
      chords: {
        I: [[40, 'min'], [40, 'min'], [47, 'dom7'], [40, 'min']],
        A: [[40, 'min'], [40, 'min'], [48, 'maj'], [47, 'dom7']],
        B: [[40, 'min'], [45, 'min'], [48, 'maj'], [47, 'dom7']],
        C: [[48, 'maj'], [50, 'maj'], [40, 'min'], [47, 'dom7']]
      },
      melody: {
        I: [52, 0, 0, 0, 52, 0, 0, 0, 52, 0, 0, 0, 0, 0, 0, 0,
            63, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0],
        A: [64, 0, 0, 0, 67, 0, 64, 0, 63, 0, 0, 0, 0, 0, 0, 0,
            64, 0, 0, 0, 67, 0, 71, 0, 75, 0, 0, 0, 76, 0, 0, 0],
        B: [76, 0, 75, 0, 76, 0, 79, 0, 76, 0, 72, 0, 69, 0, 0, 0,
            72, 0, 71, 0, 72, 0, 76, 0, 75, 0, 0, 0, 71, 0, 0, 0],
        C: [72, 0, 72, 0, 74, 0, 74, 0, 76, 0, 0, 0, 79, 0, 76, 0,
            83, 0, 0, 0, 79, 0, 76, 0, 75, 0, 76, 0, 75, 0, 71, 0]
      },
      bass: {
        I: [28, 0, 0, 0, 28, 0, 0, 0, 28, 0, 0, 0, 0, 0, 0, 0,
            23, 0, 0, 0, 0, 0, 0, 0, 28, 0, 0, 0, 0, 0, 0, 0],
        A: [28, 0, 28, 0, 28, 0, 28, 28, 28, 0, 28, 0, 28, 0, 28, 28,
            24, 0, 24, 0, 24, 0, 24, 24, 23, 0, 23, 0, 23, 0, 23, 23],
        B: [28, 0, 28, 0, 28, 0, 28, 28, 21, 0, 21, 0, 21, 0, 21, 21,
            24, 0, 24, 0, 24, 0, 24, 24, 23, 0, 23, 0, 23, 0, 23, 23],
        C: [24, 24, 36, 24, 24, 24, 36, 24, 26, 26, 38, 26, 26, 26, 38, 26,
            28, 28, 40, 28, 28, 28, 40, 28, 23, 23, 35, 23, 23, 35, 23, 35]
      }
    },

    /* ---- ファンファーレ：ボスを たおした 瞬間（1回だけ・むかしの RPG風） ---- */
    fanfare: {
      bpm: 132, lead: 'brass', drums: 'none', stabs: true, once: true,
      leadVol: 0.085, bassVol: 0.08, arpVol: 0,
      order: ['A'],
      chords: { A: [[48, 'maj'], [48, 'maj'], [43, 'dom7'], [48, 'maj']] },
      melody: {
        A: [67, 0, 67, 0, 67, 0, 72, 0, 0, 0, 0, 0, 76, 0, 0, 0,
            79, 0, 0, 0, 0, 0, 76, 0, 84, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        A: [36, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 36, 0, 0, 0,
            43, 0, 0, 0, 0, 0, 43, 0, 36, 0, 0, 0, 0, 0, 0, 0]
      }
    },

    /* ---- しょうり：ボスを たおした あとの けっか画面（堂々・こうしん） ---- */
    victory: {
      bpm: 124, lead: 'brass', drums: 'march', stabs: true,
      leadVol: 0.07, bassVol: 0.07, arpVol: 0.022,
      order: ['A', 'A', 'B', 'C'],
      chords: {
        A: [[48, 'maj'], [41, 'maj'], [43, 'maj'], [48, 'maj']],
        B: [[45, 'min'], [41, 'maj'], [43, 'maj'], [48, 'maj']],
        C: [[41, 'maj'], [43, 'maj'], [48, 'maj'], [48, 'maj']]
      },
      melody: {
        A: [72, 0, 0, 0, 76, 0, 79, 0, 81, 0, 79, 0, 77, 0, 0, 0,
            79, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0],
        B: [76, 0, 0, 0, 79, 0, 81, 0, 84, 0, 0, 0, 81, 0, 79, 0,
            81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0, 0, 0, 0, 0],
        C: [77, 0, 77, 0, 81, 0, 0, 0, 79, 0, 79, 0, 83, 0, 0, 0,
            84, 0, 0, 0, 79, 0, 76, 0, 72, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        A: [36, 0, 0, 0, 48, 0, 0, 0, 41, 0, 0, 0, 53, 0, 0, 0,
            43, 0, 0, 0, 55, 0, 0, 0, 36, 0, 0, 0, 48, 0, 0, 0],
        B: [45, 0, 0, 0, 57, 0, 0, 0, 41, 0, 0, 0, 53, 0, 0, 0,
            43, 0, 0, 0, 55, 0, 0, 0, 36, 0, 0, 0, 48, 0, 0, 0],
        C: [41, 0, 0, 0, 53, 0, 0, 0, 43, 0, 0, 0, 55, 0, 0, 0,
            36, 0, 0, 0, 48, 0, 0, 0, 36, 0, 43, 0, 48, 0, 55, 0]
      }
    },

    /* ---- エンディング：まおうを たおした あと（長い・堂々・さいごは 高く） ---- */
    ending: {
      bpm: 108, lead: 'brass', drums: 'march', stabs: true,
      leadVol: 0.072, bassVol: 0.07, arpVol: 0.026,
      order: ['A', 'B', 'A', 'C', 'D'],
      chords: {
        A: [[48, 'maj'], [43, 'maj'], [45, 'min'], [41, 'maj']],
        B: [[41, 'maj'], [43, 'maj'], [40, 'min'], [45, 'min']],
        C: [[41, 'maj'], [43, 'maj'], [48, 'maj'], [48, 'maj']],
        D: [[41, 'maj'], [43, 'maj'], [48, 'maj'], [48, 'maj']]
      },
      melody: {
        A: [72, 0, 0, 0, 74, 0, 76, 0, 79, 0, 0, 0, 0, 0, 76, 0,
            81, 0, 0, 0, 79, 0, 76, 0, 77, 0, 0, 0, 0, 0, 0, 0],
        B: [77, 0, 0, 0, 79, 0, 81, 0, 79, 0, 0, 0, 0, 0, 76, 0,
            74, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0],
        C: [81, 0, 0, 0, 84, 0, 0, 0, 83, 0, 0, 0, 79, 0, 0, 0,
            84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        D: [77, 0, 79, 0, 81, 0, 84, 0, 83, 0, 0, 0, 79, 0, 0, 0,
            84, 0, 0, 0, 88, 0, 0, 0, 84, 0, 0, 0, 0, 0, 0, 0]
      },
      bass: {
        A: [36, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,
            45, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0],
        B: [41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,
            40, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0],
        C: [41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,
            36, 0, 0, 0, 0, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0],
        D: [41, 0, 0, 0, 53, 0, 0, 0, 43, 0, 0, 0, 55, 0, 0, 0,
            36, 0, 0, 0, 48, 0, 0, 0, 36, 0, 0, 0, 0, 0, 0, 0]
      }
    }
  };

  /* =======================================================
     ドラムの パターン（16ステップで 1小節）
       K バスドラ  S スネア  h ハイハット  H あいた ハイハット
     ======================================================= */
  const DRUMS = {
    none:  [],
    soft:  ['K..h..h.K..h..h.', '..S...S...S...S.'],
    rock:  ['K..K..K...K.K...', '....S.......S...', 'hhhhhhhhhhhhhhHh'],
    fast:  ['K.K.K.K.K.K.K.K.', '....S.......S..S', 'hhhhhhhhhhhhhhhh'],
    fast2: ['K.K.KK.KK.K.KK.K', '....S..S....S..S', 'hhhhhhhhhhhhhhhH'],
    heavy: ['K.....K...K.....', '....S.......S...', 'h.h.h.h.h.h.h.hH'],
    march: ['K...K...K...K...', '..S...S...S.S.S.', 'h.h.h.h.h.h.h.h.']
  };
  // もりあがったときの ドラム（1だんかい 激しく）
  const DRUMS_UP = { none: 'soft', soft: 'rock', rock: 'fast', fast: 'fast2', fast2: 'fast2', heavy: 'fast2', march: 'rock' };

  /* =======================================================
     おと を 出す
     ======================================================= */
  function context() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;

        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 20;
        comp.ratio.value = 6;
        comp.attack.value = 0.004;
        comp.release.value = 0.18;

        // リードだけ 山びこ（ディレイ）を かける
        leadBus = ctx.createGain();
        leadBus.gain.value = 1;
        delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.19;
        delayGain = ctx.createGain();
        delayGain.gain.value = 0.26;
        const damp = ctx.createBiquadFilter();
        damp.type = 'lowpass';
        damp.frequency.value = 2400;

        leadBus.connect(master);
        leadBus.connect(delay);
        delay.connect(damp);
        damp.connect(delayGain);
        delayGain.connect(delay);      // フィードバック
        delayGain.connect(master);

        master.connect(comp);
        comp.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function env(gain, t, dur, vol, attack) {
    const a = attack || 0.008;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.65), t + Math.min(dur * 0.5, a + 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // リード（チップ）：2つの四角い音を 少し ずらして 重ねる（あつみが 出る）
  function leadSquare(t, midi, dur, vol) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5200, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + dur);
    [-7, 7].forEach(function (cents) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(freq(midi), t);
      o.detune.setValueAtTime(cents, t);
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.03);
    });
    env(g, t, dur, vol * volume, 0.006);
    f.connect(g);
    g.connect(leadBus);
  }

  // リード（やわらかい）：三角＋1オクターブ下の サイン。ゆっくり 立ち上がる
  function leadSoft(t, midi, dur, vol) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq(midi), t);
    o.connect(f);
    o.start(t); o.stop(t + dur + 0.05);
    const s = ctx.createOscillator();
    s.type = 'sine';
    s.frequency.setValueAtTime(freq(midi - 12), t);
    const sg = ctx.createGain();
    sg.gain.value = 0.45;
    s.connect(sg); sg.connect(f);
    s.start(t); s.stop(t + dur + 0.05);
    // ゆっくり 立ち上がって、ゆっくり 消える
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * volume), t + 0.04);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * volume * 0.7), t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g);
    g.connect(leadBus);
  }

  // リード（ラッパ）：2つの のこぎり波を 少し ずらす。ファンファーレ用
  function leadBrass(t, midi, dur, vol) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(3400, t + 0.05);
    f.frequency.exponentialRampToValueAtTime(1600, t + dur);
    [-6, 6].forEach(function (cents) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq(midi), t);
      o.detune.setValueAtTime(cents, t);
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.03);
    });
    env(g, t, dur, vol * volume, 0.02);
    f.connect(g);
    g.connect(leadBus);
  }

  const LEADS = { square: leadSquare, soft: leadSoft, brass: leadBrass };

  // もりあがり用の 2本目（1オクターブ上・三角の音）
  function harmony(t, midi, dur, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq(midi + 12), t);
    env(g, t, dur, vol * volume, 0.006);
    o.connect(g); g.connect(leadBus);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // ベース：のこぎり＋低いサイン
  function bassNote(t, midi, dur, vol) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(320, t + dur);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq(midi), t);
    o.connect(f);
    o.start(t); o.stop(t + dur + 0.03);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq(midi - 12), t);
    const sg = ctx.createGain();
    env(sg, t, dur, vol * 0.6 * volume, 0.006);
    sub.connect(sg); sg.connect(master);
    sub.start(t); sub.stop(t + dur + 0.03);

    env(g, t, dur, vol * volume, 0.005);
    f.connect(g); g.connect(master);
  }

  // わおん（アルペジオ）：やわらかい 三角の音
  function arpNote(t, midi, dur, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq(midi), t);
    env(g, t, dur, vol * volume, 0.01);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // わおんを ジャーンと 鳴らす（ファンファーレ・しょうり用）
  function stab(t, root, type, dur, vol) {
    const notes = CHORD[type] || CHORD.maj;
    notes.forEach(function (n) { leadBrass(t, root + 12 + n, dur, vol); });
    leadBrass(t, root + 24, dur, vol * 0.5);
  }

  function noiseBuf(dur) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buf;
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * volume, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.2);
  }

  function snare(t) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(0.14);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.075 * volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);

    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    og.gain.setValueAtTime(0.05 * volume, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.1);
  }

  function hat(t, open) {
    const dur = open ? 0.12 : 0.032;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf(dur);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime((open ? 0.026 : 0.018) * volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* =======================================================
     曲を ひろげる（イントロ＋セクションの ならびを 1本の 配列に）
     ======================================================= */
  const expanded = {};
  function expand(name) {
    if (expanded[name]) return expanded[name];
    const song = SONGS[name];
    const mel = [], bas = [], arp = [], chd = [];
    const secs = (song.intro ? [song.intro] : []).concat(song.order);
    secs.forEach(function (sec) {
      const m = song.melody[sec] || song.melody.A;
      const b = song.bass[sec] || song.bass.A;
      const ch = song.chords[sec] || song.chords.A;
      for (let i = 0; i < 32; i++) {
        mel.push(m[i] || 0);
        bas.push(b[i] || 0);
        // アルペジオ：8ステップごとの コードを 上下に なぞる
        const c = ch[Math.floor(i / 8) % ch.length];
        const notes = CHORD[c[1]] || CHORD.maj;
        const seq = [0, 1, 2, 1];
        arp.push(i % 2 === 0 ? c[0] + 12 + notes[seq[(i / 2) % 4 | 0] % notes.length] : 0);
        chd.push(i % 8 === 0 ? c : null);
      }
    });
    expanded[name] = {
      melody: mel, bass: bas, arp: arp, chords: chd,
      len: mel.length, loopStart: song.intro ? 32 : 0, song: song
    };
    return expanded[name];
  }

  // 曲の データに まちがいが ないか（tools/smoke.js から よぶ）
  function validate() {
    const errs = [];
    Object.keys(SONGS).forEach(function (name) {
      const s = SONGS[name];
      const secs = (s.intro ? [s.intro] : []).concat(s.order);
      secs.forEach(function (sec) {
        ['melody', 'bass'].forEach(function (k) {
          const arr = s[k][sec];
          if (!arr) errs.push(name + '.' + k + '.' + sec + ' が ない');
          else if (arr.length !== 32) errs.push(name + '.' + k + '.' + sec + ' が ' + arr.length + '個（32 でないと いけない）');
        });
        const ch = s.chords[sec];
        if (!ch || ch.length !== 4) errs.push(name + '.chords.' + sec + ' は 4つ 必要');
      });
      if (!LEADS[s.lead || 'square']) errs.push(name + '.lead が へん');
      if (!DRUMS[s.drums]) errs.push(name + '.drums が へん');
    });
    return errs;
  }

  function drumsOf(song) {
    const base = song.drums || 'none';
    return (level >= 1 || enrage) ? (DRUMS_UP[base] || base) : base;
  }

  function drumAt(song, i) {
    const pats = DRUMS[drumsOf(song)] || [];
    const out = [];
    pats.forEach(function (p) {
      const ch = p[i % p.length];
      if (ch && ch !== '.') out.push(ch);
    });
    return out;
  }

  /* =======================================================
     演奏
     ======================================================= */
  function tempoMul() {
    return (level >= 2 ? 1.07 : 1) * (enrage ? 1.06 : 1);
  }

  function tick() {
    if (!ctx || !playing || ctx.state !== 'running') return;
    const ex = expand(playing);
    const song = ex.song;
    const leadFn = LEADS[song.lead || 'square'];
    const held = song.lead === 'soft' ? 2.6 : (song.lead === 'brass' ? 1.5 : 1.7);
    while (nextTime < ctx.currentTime + 0.28) {
      if (step >= ex.len) {
        if (song.once) {
          // 1回だけの 曲が おわった → つぎの 曲へ（つなぎ目 なし）
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
      if (ex.melody[i]) {
        leadFn(nextTime, ex.melody[i], stepDur * held, song.leadVol);
        if (level >= 2) harmony(nextTime, ex.melody[i], stepDur * 1.5, song.leadVol * 0.42);
      }
      if (ex.bass[i]) bassNote(nextTime, ex.bass[i], stepDur * 0.95, song.bassVol);
      if (ex.arp[i] && song.arpVol) arpNote(nextTime, ex.arp[i], stepDur * 0.8, song.arpVol * (level >= 1 ? 1.3 : 1));
      if (song.stabs && ex.chords[i]) stab(nextTime, ex.chords[i][0], ex.chords[i][1], stepDur * 3.5, song.leadVol * 0.5);
      drumAt(song, i).forEach(function (ch) {
        if (ch === 'K') kick(nextTime);
        else if (ch === 'S') snare(nextTime);
        else if (ch === 'h') hat(nextTime, false);
        else if (ch === 'H') hat(nextTime, true);
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

  /* 曲を たのむ。まだ タップ前なら おぼえておいて kick() で 鳴らす。
       play('fanfare', { then: 'victory' }) … 1回 鳴らして そのあと victory へ
       at … 始める 時刻（1回だけの 曲から つなぐ ときに 使う） */
  function play(name, opts) {
    if (typeof opts === 'number') opts = { at: opts };
    opts = opts || {};
    if (!SONGS[name]) name = 'map';
    const song = SONGS[name];
    if (song.once) {
      queued = opts.then || null;
      desired = queued || desired;        // 音を あとから ON にしたら つづきの 曲を 鳴らす
    } else {
      desired = name;
    }
    if (!enabled) return;
    const c = context();
    if (!c) return;
    if (c.state !== 'running') return;   // タップ前
    if (playing === name && !song.once) return;
    playing = name;
    step = 0;
    level = 0;
    enrage = false;
    nextTime = opts.at || (c.currentTime + 0.06);
    startTimer();
  }

  // 1回だけの 曲（fanfare）の あとに 鳴らす 曲を きめる。鳴っていなければ すぐ 鳴らす
  function then(name) {
    if (playing && SONGS[playing] && SONGS[playing].once) { queued = name; desired = name; return; }
    play(name);
  }

  // もりあがり（コンボ）… 0 / 1 / 2
  function setIntensity(n) {
    level = Math.max(0, Math.min(2, n | 0));
  }
  function setEnrage(on) { enrage = !!on; }

  // 最初のタップのあとに 呼ぶ
  function kickStart() {
    const c = context();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().then(function () { if (desired) { playing = null; play(desired); } }).catch(function () {});
    } else if (desired && !playing) {
      play(desired);
    }
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!on) stop();
    else if (desired) { playing = null; play(desired); }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
  }

  return {
    play: play, then: then, stop: stop, kick: kickStart,
    setIntensity: setIntensity, setEnrage: setEnrage,
    setEnabled: setEnabled, setVolume: setVolume, validate: validate,
    isEnabled: function () { return enabled; },
    current: function () { return playing; },
    intensity: function () { return level; },
    songs: SONGS
  };
})();
