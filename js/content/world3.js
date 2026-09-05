/* ---------------------------------------------------------
   ワールド・エリア・ステージ

   ワールド ＝ 学年（小1〜小6）。小1・小2・小3 が あそべる（v2.3）。小4〜小6は じゅんびちゅう。
   いま あそんでいる ワールドは activeWorld()（プレイヤーの がくねん）で 決まる。
   エリア   ＝ 教科（算数の山・国語の森・理科社会の海・英語の空）
   ステージ ＝ 単元。算数は 日本文教出版『小学算数』3年の順。

   算数の available: false は「問題が まだ ない」ステージ（じゅんびちゅう）。
   問題を 作ったら true にする（sansu3.js に 足す）。
   **学校で 習ったか** は v2.6 から 学期（js/content/terms.js）で 決まる：
   isAvailable(st) ＝ available ＆ 学期で ならった ＆ 出せる 問題が 12問 いじょう。
   リスト教科の 問題は 単元ごとに 出す／出さない を 切りかえる（terms.allowQ）。

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
  function listStage(getList, areaId, stageNo, grade) {
    const g = grade || 3;
    return function make(n, opts) {
      const all = getList().filter(function (q) { return q.stage === stageNo && MQ.terms.allowQ(MQ.terms.current(), q, g); });
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
          id: areaId + g + '-' + stageNo + ':' + MQ.util.stripTags(q.text),
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
  function writeQuestion(q, areaId, stageNo, grade) {
    const g = grade || 3;
    const m = q.text.match(/「([^」]+)」を かん字で/) || q.text.match(/「([^」]+)」/);
    if (!m) return null;
    const kanji = q.choices[0];
    return {
      id: areaId + g + '-' + stageNo + ':write:' + kanji,
      type: 'write',
      unit: g <= 2 ? 'かん字を かく（ゆびで）' : 'かん字を書く（ゆびで）',
      prompt: '「<b>' + m[1] + '</b>」の かん字を ゆびで ' + (g <= 2 ? 'かこう' : '書こう'),
      answer: kanji,
      hint: q.hint,
      note: q.note,
      lv: levelOf(q),
      boss: !!q.boss
    };
  }

  // えらぶ問題と 書く問題を まぜる ステージ
  function writeMixStage(getList, areaId, stageNo, grade) {
    const chooser = listStage(getList, areaId, stageNo, grade);
    return function make(n, opts) {
      const all = getList().filter(function (q) { return q.stage === stageNo && MQ.terms.allowQ(MQ.terms.current(), q, grade || 3); });
      const writes = all.map(function (q) { return writeQuestion(q, areaId, stageNo, grade); }).filter(Boolean);
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

  // 小1の さんすう（sansu1.js の 生成器）。ぜんぶ 開いている
  function sansu1Stage(no, name) {
    return {
      id: 'sansu1-' + no, no: no, name: name, when: '', available: true,
      make: function (n, opts) { return MQ.sansu1.make(no, n, opts); }
    };
  }

  // 小2の さんすう（sansu2.js の 生成器）
  function sansu2Stage(no, name) {
    return {
      id: 'sansu2-' + no, no: no, name: name, when: '', available: true,
      make: function (n, opts) { return MQ.sansu2.make(no, n, opts); }
    };
  }

  // 小4の 算数（sansu4.js の 生成器・v4.4）
  function sansu4Stage(no, name) {
    return {
      id: 'sansu4-' + no, no: no, name: name, when: '', available: true,
      make: function (n, opts) { return MQ.sansu4.make(no, n, opts); }
    };
  }

  // 小5の 算数（sansu5.js の 生成器・v6.5）
  function sansu5Stage(no, name) {
    return {
      id: 'sansu5-' + no, no: no, name: name, when: '', available: true,
      make: function (n, opts) { return MQ.sansu5.make(no, n, opts); }
    };
  }

  // いま 出せる 問題の 数（学期の チェックを 通った もの）。少なすぎる ステージは 地図で ロック
  function listPool(getList, no, g) {
    return function (pl) {
      const who = pl || MQ.terms.current();
      return getList().filter(function (q) { return q.stage === no && MQ.terms.allowQ(who, q, g); }).length;
    };
  }

  function stage(areaId, no, name, getList, grade) {
    const g = grade || 3;
    return { id: areaId + g + '-' + no, no: no, name: name, available: true, make: listStage(getList, areaId, no, g), pool: listPool(getList, no, g) };
  }

  const kokugo = function () { return MQ.kokugo3.questions; };
  const rika = function () { return MQ.rikashakai3.questions; };
  const eigo = function () { return MQ.eigo3.questions; };

  /* =======================================================
     さいごの塔（ラスボス）

     学年ごとに 1つ（v4.8）。出題は 5問、その学年の 教科が じゅんばんに 出て、
     1年間の 総まとめに なります。
       小3 … 算数 → 国語 → ローマ字 → 理科社会 → 英語（ラスボス＝まおう）
       小4 … 算数 → 国語 → 理科 → 社会 → 英語（ラスボス＝ダークロード）
     slot の area を 書かない ときは kind を そのまま エリア id に します。
     ローマ字だけは ステージでは なく MQ.romaji3 から 直に 出します
     （国語の ローマ字ステージは noTower: true で 国語の わくから 外して あります）。
     ======================================================= */
  const TOWER_ORDER3 = [
    { kind: 'sansu',  label: '算数' },
    { kind: 'kokugo', label: '国語' },
    { kind: 'romaji', label: 'ローマ字' },
    { kind: 'rika',   label: '理科社会', area: 'rikashakai' },
    { kind: 'eigo',   label: '英語' }
  ];
  const TOWER_ORDER4 = [
    { kind: 'sansu',  label: '算数' },
    { kind: 'kokugo', label: '国語' },
    { kind: 'rika',   label: '理科', area: 'rika' },
    { kind: 'shakai', label: '社会', area: 'shakai' },
    { kind: 'eigo',   label: '英語' }
  ];

  function openStagesOf(areaId) {
    const area = areaOf(areaId);
    if (!area) return [];
    return area.stages.filter(isAvailable);
  }

  function towerQuestion(slot, grade) {
    let q = null;
    if (slot.kind === 'romaji') {
      q = MQ.romaji3.make(1, {})[0];
    } else {
      const open = openStagesOf(slot.area || slot.kind).filter(function (st) { return !st.noTower; });
      const st = MQ.util.pick(open.length ? open : [null]);
      q = st ? st.make(1, { boss: true })[0] : null;
    }
    if (!q) return null;
    q = Object.assign({}, q);
    q.unit = 'さいごの もんだい ・ ' + slot.label;
    q.id = 'tower' + grade + ':' + slot.kind + ':' + q.id;
    return q;
  }

  // 小1・小2は 2教科（さんすう・こくご）が こうたいで 出る（v6.4）
  const TOWER_ORDER12 = [
    { kind: 'sansu',  label: 'さんすう' },
    { kind: 'kokugo', label: 'こくご' }
  ];

  function makeTowerStage(grade, order, bossId) {
    return {
      id: 'tower' + grade, no: 1, name: grade <= 2 ? 'さいごの とう' : 'さいごの 塔', available: true, tower: true,
      bossId: bossId, order: order,
      make: function (n, opts) {
        const out = [];
        const start = (opts && opts.index) || 0;
        for (let i = 0; i < n; i++) {
          let q = null;
          for (let t = 0; t < order.length && !q; t++) {
            q = towerQuestion(order[(start + i + t) % order.length], grade);
          }
          if (q) out.push(q);
        }
        return out;
      }
    };
  }

  const towerStage = makeTowerStage(3, TOWER_ORDER3, 'boss-maou');
  const towerStage4 = makeTowerStage(4, TOWER_ORDER4, 'boss-dark');
  const towerStage1 = makeTowerStage(1, TOWER_ORDER12, 'boss-obake');      // 小1：おばけキング（v6.4）
  const towerStage2 = makeTowerStage(2, TOWER_ORDER12, 'boss-kaizoku');    // 小2：かいぞくキャプテン（v6.4）

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
          sansuStage(7, '大きい 数', '9月', true),
          sansuStage(8, '長さ', '9月', true),
          sansuStage(9, '円と 球', '9〜10月', true),
          sansuStage(10, 'かけ算の 筆算（1）', '10月', true),
          sansuStage(11, '小数', '10〜11月', true),
          sansuStage(12, '重さ', '11月', true),
          sansuStage(13, '分数', '11〜12月', true),
          sansuStage(14, '□を 使った 式', '1月', true),
          sansuStage(15, '倍の 見方', '1月', true),
          sansuStage(16, '三角形と 角', '1〜2月', true),
          sansuStage(17, 'かけ算の 筆算（2）', '2月', true),
          sansuStage(18, 'そろばん', '3月', true)
        ]
      },
      {
        id: 'kokugo', name: '国語の森', short: '国語', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'かん字の 読み', kokugo),
          { id: 'kokugo3-2', no: 2, name: 'かん字を 書く', available: true, pool: listPool(kokugo, 2, 3),
            make: writeMixStage(kokugo, 'kokugo', 2) },
          stage('kokugo', 3, 'ことばの きまり', kokugo),
          stage('kokugo', 4, 'ことばの 意味', kokugo),
          { id: 'kokugo3-5', no: 5, name: 'ローマ字', available: true, noTower: true,
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

  /* =======================================================
     小1ワールド（v2.2）
     小1には 理科社会・英語は ない（2教科）。さいごの とう は v6.4 で ついた。
     名前は ぜんぶ ひらがな（小1が じぶんで 読める ように）。
     ======================================================= */
  const kokugo1 = function () { return MQ.kokugo1.questions; };

  const world1 = {
    id: 'g1', grade: 1, name: '小1ワールド', locked: false,
    areas: [
      {
        id: 'sansu', name: 'さんすうの やま', short: 'さんすう', color: 'var(--c-sansu)', biome: 'mountain',
        stages: [
          sansu1Stage(1, '10までの かず'),
          sansu1Stage(2, 'なんばんめ'),
          sansu1Stage(3, 'いくつと いくつ'),
          sansu1Stage(4, 'たしざん（1）'),
          sansu1Stage(5, 'ひきざん（1）'),
          sansu1Stage(6, '20までの かず'),
          sansu1Stage(7, '3つの かずの けいさん'),
          sansu1Stage(8, 'なんじ なんじはん'),
          sansu1Stage(9, 'たしざん（2）'),
          sansu1Stage(10, 'ひきざん（2）'),
          sansu1Stage(11, '100までの かず'),
          sansu1Stage(12, 'なんじ なんぷん')
        ]
      },
      {
        id: 'kokugo', name: 'こくごの もり', short: 'こくご', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'ひらがな', kokugo1, 1),
          stage('kokugo', 2, 'かたかな', kokugo1, 1),
          stage('kokugo', 3, 'かん字の よみ', kokugo1, 1),
          { id: 'kokugo1-4', no: 4, name: 'かん字を かく', available: true, pool: listPool(kokugo1, 4, 1),
            make: writeMixStage(kokugo1, 'kokugo', 4, 1) },
          stage('kokugo', 5, 'ことばの きまり', kokugo1, 1)
        ]
      },
      /* 小1の さいごの とう（v6.4）。2教科の かけらで 開く。名前は ひらがな */
      {
        id: 'tower', name: 'さいごの とう', short: 'とう', color: 'var(--c-tower)', biome: 'tower',
        stages: [towerStage1]
      }
    ]
  };

  /* =======================================================
     小2ワールド（v2.3）。小1と 同じく さんすう＋こくごの 2教科（＋v6.4 で さいごの とう）
     ======================================================= */
  const kokugo2 = function () { return MQ.kokugo2.questions; };

  const world2 = {
    id: 'g2', grade: 2, name: '小2ワールド', locked: false,
    areas: [
      {
        id: 'sansu', name: 'さんすうの やま', short: 'さんすう', color: 'var(--c-sansu)', biome: 'mountain',
        stages: [
          sansu2Stage(1, 'ひょうと グラフ'),
          sansu2Stage(2, 'たしざんの ひっさん'),
          sansu2Stage(3, 'ひきざんの ひっさん'),
          sansu2Stage(4, 'ながさ（cm・mm）'),
          sansu2Stage(5, '100より 大きい かず'),
          sansu2Stage(6, 'かさ（L・dL）'),
          sansu2Stage(7, 'とけいと じかん'),
          sansu2Stage(8, '3けたの けいさん'),
          sansu2Stage(9, 'かたち'),
          sansu2Stage(10, 'かけざん（1）'),
          sansu2Stage(11, 'かけざん（2）'),
          sansu2Stage(12, 'ながい ものの ながさ（m）'),
          sansu2Stage(13, '1000より 大きい かず'),
          sansu2Stage(14, 'ぶんすう')
        ]
      },
      {
        id: 'kokugo', name: 'こくごの もり', short: 'こくご', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'かん字の よみ', kokugo2, 2),
          { id: 'kokugo2-2', no: 2, name: 'かん字を かく', available: true, pool: listPool(kokugo2, 2, 2),
            make: writeMixStage(kokugo2, 'kokugo', 2, 2) },
          stage('kokugo', 3, 'ことばの きまり', kokugo2, 2),
          stage('kokugo', 4, 'ことばの いみ', kokugo2, 2)
        ]
      },
      /* 小2の さいごの とう（v6.4） */
      {
        id: 'tower', name: 'さいごの とう', short: 'とう', color: 'var(--c-tower)', biome: 'tower',
        stages: [towerStage2]
      }
    ]
  };

  /* =======================================================
     小4ワールド（v4.4）
     いまは 算数だけ。国語・理科・社会・英語は これから 作る。
     小4から 理科と 社会は 分ける（「りかの 山」「しゃかいの 町」・2026-09-02 ユーザー決定）
     ので、足す ときは areas に 2つ 別々に 入れる。塔は 教科が そろってから。
     単元の じゅんは 日本文教出版『小学算数』4年。
     ======================================================= */
  const kokugo4 = function () { return MQ.kokugo4.questions; };
  const rika4 = function () { return MQ.rika4.questions; };
  const eigo4 = function () { return MQ.eigo4.questions; };
  const shakai4 = function () { return MQ.shakai4.questions; };

  const world4 = {
    id: 'g4', grade: 4, name: '小4ワールド', locked: false,
    areas: [
      {
        id: 'sansu', name: '算数の山', short: '算数', color: 'var(--c-sansu)', biome: 'mountain',
        stages: [
          sansu4Stage(1, '大きい 数'),
          sansu4Stage(2, 'おれ線グラフ'),
          sansu4Stage(3, 'わり算の 筆算（1）'),
          sansu4Stage(4, '角の 大きさ'),
          sansu4Stage(5, '小数'),
          sansu4Stage(6, 'わり算の 筆算（2）'),
          sansu4Stage(7, '整理の しかた'),
          sansu4Stage(8, 'すいちょくと 平行'),
          sansu4Stage(9, 'がい数'),
          sansu4Stage(10, '計算の きまり'),
          sansu4Stage(11, '面積'),
          sansu4Stage(12, '小数の かけ算と わり算'),
          sansu4Stage(13, '分数'),
          sansu4Stage(14, 'かわり方'),
          sansu4Stage(15, '直方体と 立方体')
        ]
      },
      {
        id: 'kokugo', name: '国語の森', short: '国語', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'かん字の 読み', kokugo4, 4),
          { id: 'kokugo4-2', no: 2, name: 'かん字を 書く', available: true, pool: listPool(kokugo4, 2, 4),
            make: writeMixStage(kokugo4, 'kokugo', 2, 4) },
          stage('kokugo', 3, 'ことばの きまり', kokugo4, 4),
          stage('kokugo', 4, 'ことばの 意味', kokugo4, 4)
        ]
      },
      /* 小4から 理科と 社会は べつの エリア（ユーザー決定 2026-09-02・v4.6） */
      {
        id: 'rika', name: '理科の 湖', short: '理科', color: 'var(--c-rika)', biome: 'lake',
        stages: [
          stage('rika', 1, '天気と 生き物', rika4, 4),
          stage('rika', 2, '電気・空気と 水', rika4, 4),
          stage('rika', 3, '月と 星・温度', rika4, 4),
          stage('rika', 4, 'あたたまり方と 体', rika4, 4)
        ]
      },
      {
        id: 'shakai', name: '社会の 町', short: '社会', color: 'var(--c-shakai)', biome: 'town',
        stages: [
          stage('shakai', 1, '県の 広がり', shakai4, 4),
          stage('shakai', 2, '水と ごみ', shakai4, 4),
          stage('shakai', 3, 'くらしを 守る', shakai4, 4),
          stage('shakai', 4, 'きょう土と 地いき', shakai4, 4)
        ]
      },
      /* 小4 英語（Let's Try! 2）v4.7 */
      {
        id: 'eigo', name: '英語の空', short: '英語', color: 'var(--c-eigo)', biome: 'sky',
        stages: [
          stage('eigo', 1, 'あいさつと 天気', eigo4, 4),
          stage('eigo', 2, '曜日と 時こく', eigo4, 4),
          stage('eigo', 3, '文ぼう具と ABC', eigo4, 4),
          stage('eigo', 4, 'ほしい もの・学校', eigo4, 4)
        ]
      },
      /* 小4の さいごの塔（v4.8）。5教科の かけらを ぜんぶ 集めると 開く */
      {
        id: 'tower', name: 'さいごの 塔', short: '塔', color: 'var(--c-tower)', biome: 'tower',
        stages: [towerStage4]
      }
    ]
  };

  /* =======================================================
     小5ワールド（v6.5 算数 18・v6.6 国語 4・v6.7 理科 4・社会 4）。英語・塔は これから。
     単元の じゅんは 日本文教出版『小学算数』5年（目安。学校で 前後する ので 学期の しくみで 直す）。
     ======================================================= */
  const kokugo5 = function () { return MQ.kokugo5.questions; };
  const rika5 = function () { return MQ.rika5.questions; };
  const shakai5 = function () { return MQ.shakai5.questions; };

  const world5 = {
    id: 'g5', grade: 5, name: '小5ワールド', locked: false,
    areas: [
      {
        id: 'sansu', name: '算数の山', short: '算数', color: 'var(--c-sansu)', biome: 'mountain',
        stages: [
          sansu5Stage(1, '整数と 小数'),
          sansu5Stage(2, '体積'),
          sansu5Stage(3, '比例'),
          sansu5Stage(4, '小数の かけ算'),
          sansu5Stage(5, '小数の わり算'),
          sansu5Stage(6, '合同な 図形'),
          sansu5Stage(7, '図形の 角'),
          sansu5Stage(8, '整数（倍数と 約数）'),
          sansu5Stage(9, '分数'),
          sansu5Stage(10, '分数の たし算と ひき算'),
          sansu5Stage(11, '平均'),
          sansu5Stage(12, '単位量あたりの 大きさ'),
          sansu5Stage(13, '速さ'),
          sansu5Stage(14, '四角形と 三角形の 面積'),
          sansu5Stage(15, '割合'),
          sansu5Stage(16, '帯グラフと 円グラフ'),
          sansu5Stage(17, '正多角形と 円周'),
          sansu5Stage(18, '角柱と 円柱')
        ]
      },
      /* 小5 国語（v6.6）：かん字 177字＋ことば */
      {
        id: 'kokugo', name: '国語の森', short: '国語', color: 'var(--c-kokugo)', biome: 'forest',
        stages: [
          stage('kokugo', 1, 'かん字の 読み', kokugo5, 5),
          { id: 'kokugo5-2', no: 2, name: 'かん字を 書く', available: true, pool: listPool(kokugo5, 2, 5),
            make: writeMixStage(kokugo5, 'kokugo', 2, 5) },
          stage('kokugo', 3, 'ことばの きまり', kokugo5, 5),
          stage('kokugo', 4, 'ことばの 意味', kokugo5, 5)
        ]
      },
      /* 小5 理科・社会（v6.7） */
      {
        id: 'rika', name: '理科の 湖', short: '理科', color: 'var(--c-rika)', biome: 'lake',
        stages: [
          stage('rika', 1, '天気と 発芽', rika5, 5),
          stage('rika', 2, 'メダカ・花・台風', rika5, 5),
          stage('rika', 3, '流れる 水・とけ方', rika5, 5),
          stage('rika', 4, 'ふりこ・電じしゃく・たんじょう', rika5, 5)
        ]
      },
      {
        id: 'shakai', name: '社会の 町', short: '社会', color: 'var(--c-shakai)', biome: 'town',
        stages: [
          stage('shakai', 1, '国土と 気候', shakai5, 5),
          stage('shakai', 2, '食料生産', shakai5, 5),
          stage('shakai', 3, '工業と 貿易', shakai5, 5),
          stage('shakai', 4, '情報と かん境', shakai5, 5)
        ]
      }
    ]
  };

  const worlds = [
    world1,
    world2,
    world3,
    world4,
    world5,
    { id: 'g6', grade: 6, name: '小6ワールド', locked: true, areas: [] }
  ];

  function world(id) {
    for (let i = 0; i < worlds.length; i++) if (worlds[i].id === id) return worlds[i];
    return null;
  }

  // がくねん（1〜6）→ ワールド。あそべるのは locked が ない ワールド（小1・小2・小3）
  function worldForGrade(grade) {
    for (let i = 0; i < worlds.length; i++) if (worlds[i].grade === grade) return worlds[i];
    return world3;
  }

  /* いま あそんでいる ワールド（v2.2 → v4.5）。
     **playGrade**（地図の 学年チップで いつでも 変えられる）で 決まる。
     playGrade が ない／開いていない ときは その子の 学年、それも だめなら 小3。
     マップ・かけら・図かん・にげた敵 は ぜんぶ ここを 見る。 */
  let forced = null;   // テストで ワールドを 決めうちに する とき
  function activeWorld() {
    if (forced) return forced;
    let p = null;
    try { p = (MQ.save && MQ.save.current) ? MQ.save.current() : null; } catch (e) { p = null; }
    const w = worldForGrade((p && p.playGrade) || (p && p.grade) || 3);
    if (!w.locked) return w;
    const own = worldForGrade((p && p.grade) || 3);
    return own.locked ? world3 : own;
  }
  function setActive(w) { forced = w || null; }

  function areaOf(areaId) {
    const w = activeWorld();
    for (let a = 0; a < w.areas.length; a++) if (w.areas[a].id === areaId) return w.areas[a];
    for (let i = 0; i < worlds.length; i++) {
      const areas = worlds[i].areas || [];
      for (let a = 0; a < areas.length; a++) if (areas[a].id === areaId) return areas[a];
    }
    return null;
  }

  // 教科の エリアだけ（塔は のぞく）
  function subjectAreas() {
    return activeWorld().areas.filter(function (a) { return a.id !== 'tower'; });
  }
  // さいごの塔の エリア（小1には ない）
  function towerArea() {
    const areas = activeWorld().areas;
    for (let a = 0; a < areas.length; a++) if (areas[a].id === 'tower') return areas[a];
    return null;
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

  // かけらに 必要な ★。学期で 開いている ステージが 少ない ときは ステージ×3（さいてい 3）
  function fragNeed(area) {
    if (!area) return FRAG_STARS;
    const open = area.stages.filter(isAvailable).length;
    return Math.max(3, Math.min(FRAG_STARS, open * 3));
  }

  // かけらが もらえる 条件を みたしたか
  function fragReady(player, area) {
    return starsIn(player, area) >= fragNeed(area);
  }

  // かけらは 学年ごと（v4.5）。'g4:sansu' の ような キー
  function fragKey(areaId, player) {
    return (MQ.save && MQ.save.areaKey) ? MQ.save.areaKey(areaId, player) : areaId;
  }
  function hasFrag(player, areaId) {
    return !!(player && player.frags && player.frags[fragKey(areaId, player)]);
  }

  function fragCount(player) {
    return subjectAreas().filter(function (a) { return hasFrag(player, a.id); }).length;
  }

  /* さいごの塔の ラスボス（学年で ちがう・v4.8）。
     小3＝まおう／小4＝ダークロード。画面の 文字は ぜんぶ ここを 見る。 */
  function lastBoss() {
    const area = towerArea();
    const st = area && area.stages[0];
    const id = (st && st.bossId) || 'boss-maou';
    return (MQ.enemies && MQ.enemies.get(id)) || { id: id, name: 'まおう' };
  }
  // いま あそんでいる 学年の 塔の ステージ id（'tower3' / 'tower4'）
  function towerStageId() {
    const area = towerArea();
    return (area && area.stages[0] && area.stages[0].id) || 'tower3';
  }

  function hasTower() { return !!towerArea(); }
  // 塔の 名前（小1・小2は「さいごの とう」・ほかは「さいごの 塔」。画面の 文字は ここを 見る・v6.4）
  function towerName() { const a = towerArea(); return (a && a.name) || 'さいごの 塔'; }
  function towerOpen(player) {
    if (!hasTower()) return false;
    return fragCount(player) >= subjectAreas().length;
  }

  /* ---- 学期（v2.6）：いま あそべる ステージか ---- */
  const MIN_POOL = 12;   // 1回の たたかいに 出す ザコの 数ぶん
  function isAvailable(st) {
    if (!st) return false;
    if (st.tower) return true;
    if (!st.available) return false;                                   // 問題が まだ ない
    if (!MQ.terms || !MQ.terms.stageLearned) return true;
    if (!MQ.terms.stageLearned(MQ.terms.current(), st.id)) return false; // まだ ならって いない
    if (st.pool && st.pool() < MIN_POOL) return false;                 // 出せる 問題が 少なすぎる
    return true;
  }
  // 地図の「まだ」に 出す ことば
  function lockedReason(st) {
    if (!st) return '';
    if (!st.available) return st.when ? st.when + 'ごろ' : 'じゅんびちゅう';
    const term = MQ.terms ? MQ.terms.stageTerm(st.id) : 0;
    if (term && !MQ.terms.stageLearned(MQ.terms.current(), st.id)) return MQ.terms.whenText(term);
    // 単元で 閉じている ステージ：何学期に なれば 問題が そろうか（学期どおりに した ばあい）
    if (st.pool) {
      const now = MQ.terms.termOf(MQ.terms.current());
      for (let t = Math.max(1, now + 1); t <= 3; t++) {
        if (st.pool({ term: t, units: {} }) >= MIN_POOL) return MQ.terms.whenText(t);
      }
      if (st.pool({ term: 0, units: {} }) >= MIN_POOL) return MQ.terms.whenText(4);
    }
    return 'まだ ならって いない';
  }

  // ステージが 開いているか：1つ前の（開いている）ステージで 星1つ以上
  function isUnlocked(player, area, st) {
    if (st.tower) return towerOpen(player);
    if (!isAvailable(st)) return false;
    // まえの ステージが 学期で 閉じている ときは、その前の 開いている ステージを 見る
    let prev = null;
    for (let i = area.stages.indexOf(st) - 1; i >= 0; i--) {
      if (isAvailable(area.stages[i])) { prev = area.stages[i]; break; }
    }
    if (!prev) return true;
    const stars = (player && player.stars && player.stars[prev.id]) || 0;
    return stars >= 1;
  }

  return {
    worlds: worlds, world: world, world3: world3, world1: world1, world2: world2, world4: world4, world5: world5, worldForGrade: worldForGrade,
    activeWorld: activeWorld, setActive: setActive, hasTower: hasTower,
    areaOf: areaOf, subjectAreas: subjectAreas, findStage: findStage, isUnlocked: isUnlocked,
    isAvailable: isAvailable, lockedReason: lockedReason, MIN_POOL: MIN_POOL,
    starsIn: starsIn, fragNeed: fragNeed, fragReady: fragReady, hasFrag: hasFrag,
    fragCount: fragCount, towerOpen: towerOpen, fragKey: fragKey,
    lastBoss: lastBoss, towerStageId: towerStageId, towerName: towerName,
    towerStage1: towerStage1, towerStage2: towerStage2,
    towerStage: towerStage, towerStage4: towerStage4,
    TOWER_ORDER: TOWER_ORDER3, TOWER_ORDER3: TOWER_ORDER3, TOWER_ORDER4: TOWER_ORDER4
  };
})();
