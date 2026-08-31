/* ---------------------------------------------------------
   ワールド・エリア・ステージ

   ワールド ＝ 学年（小1〜小6）。いまは 小3だけ 入れる。
   エリア   ＝ 教科（算数の山・国語の森・理科社会の海・英語の空）
   ステージ ＝ 単元。算数は 日本文教出版『小学算数』3年の順。

   算数の available: false は「まだ 学校で 習っていない」ステージ。
   習ったら true にすると 開きます（問題は sansu3.js に 足す）。

   ★を エリアごとに 8こ あつめると「まなびの かけら」が もらえます。
   かけら4つで マップ中央の「さいごの塔」が 開きます。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.content = (function () {
  const FRAG_STARS = 8;   // かけらを もらうのに 必要な ★の数（エリアごと）

  /* むずかしさ（lv）で えらぶ 道具。ぜんぶの 教科で 共通。
       lv 1 … やさしい（さいしょに 出る）
       lv 2 … ふつう（書いていない 問題は これ）
       lv 3 … むずかしい（ボスの 前に 出る）
     ボスの 問題は boss: true か lv 3 の ものだけ。 */
  function levelOf(q) { return q.lv === 1 || q.lv === 3 ? q.lv : 2; }

  // n 問を やさしい → ふつう → むずかしい の わりあいで（4/4/4 のように）
  function levelCounts(n) {
    const easy = Math.ceil(n / 3);
    const hard = Math.floor(n / 3);
    return [easy, n - easy - hard, hard];
  }

  /* pool から n 問。むずかしさの じゅんに ならべて かえす。
     たりない むずかしさは となりの むずかしさから かりる。 */
  function pickByLevel(pool, n, opts) {
    const by = { 1: [], 2: [], 3: [] };
    pool.forEach(function (q) { by[levelOf(q)].push(q); });
    [1, 2, 3].forEach(function (l) { by[l] = MQ.util.shuffle(by[l]); });

    function draw(level, m) {
      const out = [];
      const order = level === 1 ? [1, 2, 3] : level === 3 ? [3, 2, 1] : [2, 1, 3];
      for (let k = 0; k < order.length && out.length < m; k++) {
        const src = by[order[k]];
        while (src.length && out.length < m) out.push(src.shift());
      }
      // それでも たりないときは くり返す
      let all = MQ.util.shuffle(pool);
      while (out.length < m && all.length) {
        out.push(all.shift());
        if (!all.length) all = MQ.util.shuffle(pool);
      }
      return out;
    }

    if (opts && opts.lv) return draw(opts.lv, n);
    const c = levelCounts(n);
    return draw(1, c[0]).concat(draw(2, c[1]), draw(3, c[2]));
  }

  function bossPool(all) {
    const b = all.filter(function (q) { return q.boss || levelOf(q) === 3; });
    return b.length ? b : all;
  }

  // リスト型（国語・理社・英語）の ステージ用：問題リストから えらぶ
  function listStage(getList, areaId, stageNo) {
    return function make(n, opts) {
      const all = getList().filter(function (q) { return q.stage === stageNo; });
      let picked;
      if (opts && opts.boss) {
        const pool = bossPool(all);
        picked = MQ.util.shuffle(pool);
        while (picked.length < n && pool.length) picked = picked.concat(MQ.util.shuffle(pool));
        picked = picked.slice(0, n);
      } else {
        picked = pickByLevel(all, n, opts);
      }
      return picked.map(function (q) {
        return {
          id: areaId + '3-' + stageNo + ':' + MQ.util.stripTags(q.text),
          type: 'choice',
          unit: q.unit,
          prompt: q.text,
          choices: q.choices.slice(),
          answer: 0,
          hint: q.hint,
          note: q.note,
          lv: (opts && opts.boss) ? 3 : levelOf(q)
        };
      });
    };
  }

  /* かん字を「じっさいに ゆびで 書く」問題。
     えらぶ問題の データから 自動で 作ります。
     字を 見分ける しくみは 入れられないので、正しい字を 見せて
     じぶんで ○×を つける やり方（学校の 書きとりと 同じ）。 */
  function writeQuestion(q, areaId, stageNo) {
    const m = q.text.match(/「([^」]+)」を かん字で/) || q.text.match(/「([^」]+)」/);
    if (!m) return null;
    const kanji = q.choices[0];
    return {
      id: areaId + '3-' + stageNo + ':write:' + kanji,
      type: 'write',
      unit: 'かん字を書く（ゆびで）',
      prompt: '「<b>' + m[1] + '</b>」の かん字を ゆびで 書こう',
      answer: kanji,
      hint: q.hint,
      note: q.note,
      lv: levelOf(q),
      boss: !!q.boss
    };
  }

  // えらぶ問題と 書く問題を まぜる ステージ
  function writeMixStage(getList, areaId, stageNo) {
    const chooser = listStage(getList, areaId, stageNo);
    return function make(n, opts) {
      const all = getList().filter(function (q) { return q.stage === stageNo; });
      const writes = all.map(function (q) { return writeQuestion(q, areaId, stageNo); }).filter(Boolean);
      if (!writes.length) return chooser(n, opts);
      if (opts && opts.boss) {
        // ボスは むずかしい字を 書く
        return MQ.util.shuffle(bossPool(writes)).slice(0, n).map(function (q) {
          const c = Object.assign({}, q); c.lv = 3; delete c.boss; return c;
        });
      }

      // 半分は 書く問題、半分は えらぶ問題。まぜてから むずかしさの じゅんに ならべる
      const half = Math.max(1, Math.round(n / 2));
      const w = pickByLevel(writes, half, opts).map(function (q) { const c = Object.assign({}, q); delete c.boss; return c; });
      const c = chooser(n - w.length, opts);
      return MQ.util.shuffle(w.concat(c)).sort(function (a, b) { return levelOf(a) - levelOf(b); });
    };
  }

  function sansuStage(no, name, when, available) {
    return {
      id: 'sansu3-' + no, no: no, name: name, when: when, available: available,
      make: function (n, opts) { return MQ.sansu3.make(no, n, opts); }
    };
  }

  function stage(areaId, no, name, getList) {
    return { id: areaId + '3-' + no, no: no, name: name, available: true, make: listStage(getList, areaId, no) };
  }

  const kokugo = function () { return MQ.kokugo3.questions; };
  const rika = function () { return MQ.rikashakai3.questions; };
  const eigo = function () { return MQ.eigo3.questions; };

  /* =======================================================
     さいごの塔（ラスボス）
     出題は 5問。算数 → 国語 → ローマ字 → 理科社会 → 英語 の順。
     小3の 1年間の 総まとめに なる。
     ======================================================= */
  const TOWER_ORDER = [
    { kind: 'sansu',  label: '算数' },
    { kind: 'kokugo', label: '国語' },
    { kind: 'romaji', label: 'ローマ字' },
    { kind: 'rika',   label: '理科社会' },
    { kind: 'eigo',   label: '英語' }
  ];

  function openStagesOf(areaId) {
    const area = areaOf(areaId);
    if (!area) return [];
    return area.stages.filter(function (st) { return st.available; });
  }

  function towerQuestion(slot) {
    let q = null;
    if (slot.kind === 'romaji') {
      q = MQ.romaji3.make(1, {})[0];
    } else if (slot.kind === 'sansu') {
      const open = openStagesOf('sansu');
      const st = MQ.util.pick(open.length ? open : [null]);
      q = st ? st.make(1, { boss: true })[0] : null;
    } else {
      const areaId = slot.kind === 'kokugo' ? 'kokugo' : slot.kind === 'rika' ? 'rikashakai' : 'eigo';
      const open = openStagesOf(areaId).filter(function (st) { return st.id !== 'kokugo3-5'; });
      const st = MQ.util.pick(open.length ? open : [null]);
      q = st ? st.make(1, { boss: true })[0] : null;
    }
    if (!q) return null;
    q = Object.assign({}, q);
    q.unit = 'さいごの もんだい ・ ' + slot.label;
    q.id = 'tower3:' + slot.kind + ':' + q.id;
    return q;
  }

  const towerStage = {
    id: 'tower3', no: 1, name: 'さいごの 塔', available: true, tower: true,
    make: function (n, opts) {
      const out = [];
      const start = (opts && opts.index) || 0;
      for (let i = 0; i < n; i++) {
        let q = null;
        for (let t = 0; t < TOWER_ORDER.length && !q; t++) {
          q = towerQuestion(TOWER_ORDER[(start + i + t) % TOWER_ORDER.length]);
        }
        if (q) out.push(q);
      }
      return out;
    }
  };

  /* =======================================================
     小3ワールド
     ======================================================= */
  const world3 = {
    id: 'g3', grade: 3, name: '小3ワールド', locked: false,
    areas: [
      {
        id: 'sansu', name: '算数の山', short: '算数', color: 'var(--c-sansu)', biome: 'mountain',
        stages: [
          sansuStage(1, 'かけ算の きまり', '4月', true),
          sansuStage(2, 'わり算', '4〜5月', true),
          sansuStage(3, '時こくと 時間', '5月', true),
          sansuStage(4, 'たし算と ひき算の 筆算', '5〜6月', true),
          sansuStage(5, 'ぼうグラフ', '6月', true),
          sansuStage(6, 'あまりの あるわり算', '7月', true),
          sansuStage(7, '大きい 数', '9月', false),
          sansuStage(8, '長さ', '9月', false),
          sansuStage(9, '円と 球', '9〜10月', false),
          sansuStage(10, 'かけ算の 筆算（1）', '10月', false),
          sansuStage(11, '小数', '10〜11月', false),
          sansuStage(12, '重さ', '11月', false),
          sansuStage(13, '分数', '11〜12月', false),
          sansuStage(14, '□を 使った 式', '1月', false),
          sansuStage(15, '倍の 見方', '1月', false),
          sansuStage(16, '三角形と 角', '1〜2月', false),
          sansuStage(17, 'かけ算の 筆算（2）', '2月', false),
          sansuStage(18, 'そろばん', '3月', false)
        ]
      },
      {
        id: 'kokugo', name: '国語の森', short: '国語', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'かん字の 読み', kokugo),
          { id: 'kokugo3-2', no: 2, name: 'かん字を 書く', available: true,
            make: writeMixStage(kokugo, 'kokugo', 2) },
          stage('kokugo', 3, 'ことばの きまり', kokugo),
          stage('kokugo', 4, 'ことばの 意味', kokugo),
          { id: 'kokugo3-5', no: 5, name: 'ローマ字', available: true,
            make: function (n, opts) { return MQ.romaji3.make(n, opts); } }
        ]
      },
      {
        id: 'rikashakai', name: '理科社会の海', short: '理社', color: 'var(--c-rika)', biome: 'sea',
        stages: [
          stage('rikashakai', 1, 'こん虫と 植物', rika),
          stage('rikashakai', 2, '光・じしゃく・電気', rika),
          stage('rikashakai', 3, '地図と 方位', rika),
          stage('rikashakai', 4, 'まちの しごと', rika)
        ]
      },
      {
        id: 'eigo', name: '英語の空', short: '英語', color: 'var(--c-eigo)', biome: 'sky',
        stages: [
          stage('eigo', 1, 'あいさつ', eigo),
          stage('eigo', 2, '色と 数', eigo),
          stage('eigo', 3, 'どうぶつと たべもの', eigo),
          stage('eigo', 4, '曜日・月・天気', eigo)
        ]
      },
      {
        id: 'tower', name: 'さいごの 塔', short: '塔', color: 'var(--c-tower)', biome: 'tower',
        stages: [towerStage]
      }
    ]
  };

  const worlds = [
    { id: 'g1', grade: 1, name: '小1ワールド', locked: true, areas: [] },
    { id: 'g2', grade: 2, name: '小2ワールド', locked: true, areas: [] },
    world3,
    { id: 'g4', grade: 4, name: '小4ワールド', locked: true, areas: [] },
    { id: 'g5', grade: 5, name: '小5ワールド', locked: true, areas: [] },
    { id: 'g6', grade: 6, name: '小6ワールド', locked: true, areas: [] }
  ];

  function world(id) {
    for (let i = 0; i < worlds.length; i++) if (worlds[i].id === id) return worlds[i];
    return null;
  }

  // がくねん（1〜6）→ ワールド。あそべるのは locked が ない ワールドだけ（いまは 小3）
  function worldForGrade(grade) {
    for (let i = 0; i < worlds.length; i++) if (worlds[i].grade === grade) return worlds[i];
    return world3;
  }

  function areaOf(areaId) {
    for (let a = 0; a < world3.areas.length; a++) if (world3.areas[a].id === areaId) return world3.areas[a];
    return null;
  }

  // 教科の エリアだけ（塔は のぞく）
  function subjectAreas() {
    return world3.areas.filter(function (a) { return a.id !== 'tower'; });
  }

  // ステージ id から { world, area, stage } を さがす
  function findStage(stageId) {
    for (let w = 0; w < worlds.length; w++) {
      const areas = worlds[w].areas || [];
      for (let a = 0; a < areas.length; a++) {
        const stages = areas[a].stages;
        for (let s = 0; s < stages.length; s++) {
          if (stages[s].id === stageId) return { world: worlds[w], area: areas[a], stage: stages[s] };
        }
      }
    }
    return null;
  }

  /* ---- ★と かけら ---- */
  function starsIn(player, area) {
    let n = 0;
    area.stages.forEach(function (st) { n += (player && player.stars && player.stars[st.id]) || 0; });
    return n;
  }

  function fragNeed() { return FRAG_STARS; }

  // かけらが もらえる 条件を みたしたか
  function fragReady(player, area) {
    return starsIn(player, area) >= FRAG_STARS;
  }

  function hasFrag(player, areaId) {
    return !!(player && player.frags && player.frags[areaId]);
  }

  function fragCount(player) {
    return subjectAreas().filter(function (a) { return hasFrag(player, a.id); }).length;
  }

  function towerOpen(player) {
    return fragCount(player) >= subjectAreas().length;
  }

  // ステージが 開いているか：1つ前のステージで 星1つ以上（＋学校で習った）
  function isUnlocked(player, area, st) {
    if (st.tower) return towerOpen(player);
    if (!st.available) return false;
    if (st.no === 1) return true;
    const prev = area.stages[st.no - 2];
    if (!prev) return true;
    const stars = (player && player.stars && player.stars[prev.id]) || 0;
    return stars >= 1;
  }

  return {
    worlds: worlds, world: world, world3: world3, worldForGrade: worldForGrade,
    areaOf: areaOf, subjectAreas: subjectAreas, findStage: findStage, isUnlocked: isUnlocked,
    starsIn: starsIn, fragNeed: fragNeed, fragReady: fragReady, hasFrag: hasFrag,
    fragCount: fragCount, towerOpen: towerOpen,
    towerStage: towerStage, TOWER_ORDER: TOWER_ORDER
  };
})();
