/* ---------------------------------------------------------
   ふくしゅう（まちがえた 問題が また 出る・v11.1）

   ■ なにを 直すか
     いままで、1回目で まちがえて 2回目で 合った 問題は **どこにも 出てこなかった**。
     （2回 まちがえて にげられた 敵だけが「リベンジ」で 20時間後に もどって いた）
     おうちの人ページの「落とした 問題」には たまって いたが、子どもの 画面には 出ない。
     → **1回目で まちがえた 問題は、つぎの たたかいで もう一度 出す**。

   ■ きまり（このアプリの 大原則を くずさない）
     ・ばつを 与えない。もどって きた 問題は **けいけんち ボーナスの チャンス**（+10）。
     ・子どもの 画面に「にがて」と 書かない。リボンは **「もういちど！」**。
     ・答えは 見せない。むずかしさも 変えない（同じ 問題が そのまま 出る だけ）。

   ■ セーブ（player.review）
     { 'g3:sansu': [ { key, q, enemyId, stageId, areaId, at, miss } , … ] }
       キーは にげた敵（player.escaped）と 同じ 形（学年ごと・MQ.save.areaKey）。
       key … 問題の id。q … 問題まるごと（算数の 生成問題も 同じ 数字で もどる）
       miss … まちがえた 回数（多い ものから 先に 出す）

   ■ 出し方・消し方
     ・ふつうの たたかいの ときだけ、ザコの わくに 2問まで まぜる（core/battle.js）。
       にげた敵（リベンジ）と あわせて **3問まで**（画面の ui/battle.js が 決める）。
     ・1回目で 正解 → その問題は 消える（おぼえた）。
     ・また まちがえた → のこる（miss +1）。
     ・2回 まちがえて にげられた → リベンジに ひっこす ので ここからは 消す。

   DOM を 知らない。画面は js/ui/battle.js。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.review = (function () {
  const MAX_PER_AREA = 20;   // エリアごとに ためて おく 数
  const PER_BATTLE = 2;      // 1回の たたかいに まぜる 数

  function areaKey(areaId, player) {
    if (MQ.save && MQ.save.areaKey) return MQ.save.areaKey(areaId, player);
    return 'g3:' + areaId;
  }

  function ensure(p) {
    if (!p.review || typeof p.review !== 'object' || Array.isArray(p.review)) p.review = {};
    return p.review;
  }

  function listIn(player, areaId) {
    const all = ensure(player);
    const key = areaKey(areaId, player);
    if (!Array.isArray(all[key])) all[key] = [];
    return all[key];
  }

  /* まちがえた 問題を ためる。同じ 問題（key）は 1つに まとめて 回数を 数える */
  function add(player, areaId, entry) {
    if (!entry || !entry.key || !entry.q) return;
    const list = listIn(player, areaId);
    for (let i = 0; i < list.length; i++) {
      if (list[i].key === entry.key) {
        list[i].miss = (list[i].miss || 1) + 1;
        list[i].at = entry.at || new Date().toISOString();
        list[i].q = entry.q;
        if (entry.enemyId) list[i].enemyId = entry.enemyId;
        return;
      }
    }
    list.unshift({
      key: entry.key, q: entry.q, enemyId: entry.enemyId || null,
      stageId: entry.stageId || null, areaId: areaId,
      at: entry.at || new Date().toISOString(), miss: 1
    });
    if (list.length > MAX_PER_AREA) list.length = MAX_PER_AREA;
  }

  /* おぼえた（1回目で 正解した）／リベンジに ひっこした → 消す。
     どの エリアに いるか 分からない ことが ある ので ぜんぶ 見る */
  function done(player, key) {
    const all = ensure(player);
    Object.keys(all).forEach(function (k) {
      if (!Array.isArray(all[k])) return;
      all[k] = all[k].filter(function (e) { return e.key !== key; });
    });
  }

  /* この たたかいに まぜる 問題を えらぶ。
     まちがえた 回数の 多い ものから、同じなら 古い ものから */
  function pick(player, areaId, n) {
    const want = Math.max(0, n == null ? PER_BATTLE : n);
    if (!want) return [];
    return listIn(player, areaId).slice().sort(function (a, b) {
      const d = (b.miss || 1) - (a.miss || 1);
      if (d) return d;
      return Date.parse(a.at || 0) - Date.parse(b.at || 0);
    }).slice(0, want);
  }

  function count(player, areaId) { return listIn(player, areaId).length; }

  // いま あそんで いる 学年ぶん ぜんぶ（おうちの人ページ・しょうごう用）
  function countAll(player) {
    const all = ensure(player);
    const pre = 'g' + ((MQ.save && MQ.save.playGrade) ? MQ.save.playGrade(player) : (player.playGrade || player.grade || 3)) + ':';
    let n = 0;
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(pre) !== 0) return;
      n += (all[k] || []).length;
    });
    return n;
  }

  return {
    MAX_PER_AREA: MAX_PER_AREA, PER_BATTLE: PER_BATTLE,
    listIn: listIn, add: add, done: done, pick: pick, count: count, countAll: countAll
  };
})();
