/* =========================================================
   セットわざ（v14.2）
   ユーザー「装備品を 一式 揃えると それに 合わせた 必殺技が 出せるとか どう？」
   →「技の 名前が ダサい」→「もっと 中二病っぽいのが いい」→「めちゃくちゃ カッコいい。最高！」（2026-09-13）

   ・同じ グレードの そうびを 5点 **つけて** いると、その セットの わざが 使える。
   ・たたかいの 中に セットゲージ（NEED マス）。**正解で たまり、まちがえても へらない**
     （なかまゲージと 同じ・ばつを 与えない きまり）。いっぱいに なった 正解で わざが 出る。
   ・1回の たたかいで MAX 回まで。ボスには BOSS_DMG ダメージまで（カウンターと 同じ。v12.7 の ボスの 強さを こわさない）。
     ザコ・よばれた ザコは けいけんち ＋XP、中ボスは 一発（2ダメージ）。
   ・とっくん・タイムアタックでは 出ない（core/battle.js の start）。
   ・名前は 漢字＋カタカナの ルビ（画面は 漢字を 大きく、上に ルビ）。**ほかの 作品の わざ名 そのものは 使わない**。
   ・ready＝演出（js/ui/setwaza.js の 台本）が できて いる もの。ready で ない セットは ゲージも 出さない。
   ここは 表だけ（DOM を 知らない）。
   ========================================================= */
(function () {
  'use strict';
  const MQ = window.MQ = window.MQ || {};

  const NEED = 6;        // ゲージの マス（正解 6回で 1回）
  const MAX = 2;         // 1回の たたかいで 出せる 回数
  const BOSS_DMG = 2;    // ボスへの ダメージ（カウンターと 同じ）
  const XP = 20;         // ザコを たおした ときの けいけんち ボーナス

  /* grade＝hero.js の grades の id／gradeName＝その 名前（gearPower の setName）
     lines＝カットインの 詠唱（ひらがな中心）／color＝オーラと 光の 色／pose＝カットインの ポーズ（css/specialfx.css の ci-pose-*）
     mo＝3D の 動き（css/motion3d.css の mo-sp-<mo>／mo-hit-<mo> を 借りる）・scene＝器の 動き・hit＝当たる 時間・down＝ザコが たおれる 時間
     ms＝わざの 長さ・tier＝画面の 大きさ（4＝画面を 広げて まっくら・大きな カットイン） */
  const LIST = [
    { grade: 'kihon',    gradeName: 'かわ',     id: 'set-kihon',    name: '翠嵐ノ咆哮', ruby: 'エメラルド・テンペスト',   lines: ['もりよ、目ざめよ……！'],                color: '#7ee06a',
      ready: true, pose: 'sweep', mo: 'wind', scene: null, hit: 380, down: 1700, ms: 2300, tier: 4 },
    { grade: 'tetsu',    gradeName: 'てつ',     id: 'set-tetsu',    name: '鋼鉄ノ断罪', ruby: 'スチール・ジャッジメント', lines: ['この 一げきで さばく！'],               color: '#d8e2f0',
      ready: true, pose: 'guard', mo: 'bolt', scene: 'mo-dash-sp', hit: 600, down: 1650, ms: 2300, tier: 4 },
    { grade: 'ryu',      gradeName: 'りゅう',   id: 'set-ryu',      name: '煉獄龍皇波', ruby: 'インフェルノ・ドラグーン', lines: ['ねむれる りゅうよ、いまこそ ほえろ！'],  color: '#ff6a2a',
      ready: true, pose: 'point', mo: 'nova', scene: 'mo-rise', hit: 560, down: 1720, ms: 2300, tier: 4 },
    { grade: 'densetsu', gradeName: 'でんせつ', id: 'set-densetsu', name: '天光ノ聖剣', ruby: 'セイクリッド・ブレイド',   lines: ['天よ、わが けんに 光を！'],             color: '#ffe27a',
      ready: true, pose: 'sky', mo: 'fire', scene: 'mo-dash-sp', hit: 500, down: 1700, ms: 2300, tier: 4 },
    { grade: 'hoshi',    gradeName: 'ほし',     id: 'set-hoshi',    name: '星辰ノ黙示録', ruby: 'アストラル・アポカリプス', lines: ['ほしぼしよ、みちびけ……'],            color: '#8fb8ff',
      ready: true, pose: 'spread', mo: 'star', scene: null, hit: 620, down: 1650, ms: 2300, tier: 4 },
    { grade: 'yami',     gradeName: 'やみ',     id: 'set-yami',     name: '漆黒ノ終焉', ruby: 'エンド・オブ・ダークネス', lines: ['やみよ、すべてを のみこめ！'],          color: '#b04dff',
      ready: true, pose: 'charge', mo: 'nova', scene: 'mo-rise', hit: 560, down: 1750, ms: 2300, tier: 4 },
    { grade: 'capsule',  gradeName: 'カプセル', id: 'set-capsule',  name: '禁断ノ匣',   ruby: 'パンドラ・カプセル',       lines: ['あけては ならぬ はこ……いま ひらく！'], color: '#4fd3ff',
      ready: true, pose: 'thrust', mo: 'leaf', scene: null, hit: 340, down: 1650, ms: 2300, tier: 4 },
    { grade: 'aurora',   gradeName: 'オーロラ', id: 'set-aurora',   name: '極光ノ神域', ruby: 'オーロラ・サンクチュアリ', lines: ['きわみの 光よ、ここに あれ！'],         color: '#7cf9c4',
      ready: true, pose: 'raise', mo: 'starburst', scene: 'mo-dash-sp', hit: 500, down: 1650, ms: 2300, tier: 4 },
    // カプセル 第2弾（2026-09-17・ユーザーが 名前を えらんだ）
    { grade: 'prism',    gradeName: 'プリズム', id: 'set-prism',    name: '分光烈破',   ruby: 'スペクトル・ブレイク',     lines: ['ひかりよ、ななつに わかれて きりさけ！'], color: '#bfefff',
      ready: true, pose: 'sweep', mo: 'ice', scene: 'mo-dash-thru', hit: 360, down: 1650, ms: 2300, tier: 4 },
    { grade: 'ginga',    gradeName: 'ギンガ',   id: 'set-ginga',    name: '超新星ノ轟砲', ruby: 'スーパーノヴァ・カノン',   lines: ['ほしよ、もえつきて ほえろ！'],          color: '#9a6aff',
      ready: true, pose: 'point', mo: 'nova', scene: 'mo-rise', hit: 560, down: 1700, ms: 2300, tier: 4 }
  ];
  const byIdMap = {}, byGradeMap = {}, byNameMap = {};
  LIST.forEach(function (w) { byIdMap[w.id] = w; byGradeMap[w.grade] = w; byNameMap[w.gradeName] = w; });

  function byId(id) { return byIdMap[id] || null; }
  function byGrade(g) { return byGradeMap[g] || null; }
  // たたかいで 使える わざ（そうびの 効果 gearPower の setName から）。演出が まだの ものは null
  function forGear(gear) {
    const w = gear && gear.setName ? byNameMap[gear.setName] : null;
    return w && w.ready ? w : null;
  }
  // いま つけて いる そうびで 使える わざ（プレイヤーから）
  function forPlayer(player) {
    if (!MQ.hero || !MQ.hero.equippedSetOf) return null;
    const set = MQ.hero.equippedSetOf(player);
    const w = set ? byGradeMap[set.id] : null;
    return w && w.ready ? w : null;
  }

  MQ.setwaza = {
    NEED: NEED, MAX: MAX, BOSS_DMG: BOSS_DMG, XP: XP,
    list: function () { return LIST.slice(); },
    byId: byId, byGrade: byGrade, forGear: forGear, forPlayer: forPlayer
  };
})();
