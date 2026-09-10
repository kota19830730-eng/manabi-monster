/* ---------------------------------------------------------
   教科書（出版社）えらび（v12.4）

   学校で 使って いる 教科書の 出版社を 教科ごとに えらぶと、
   学期の 表（terms.js の STAGE_TERM / UNITS3）が その 教科書の じゅんばんに なる。
   転校した ときも おうちの人ページで 変えられる。

   きまり
   ・ならう 中身（単元・かん字）は どの 出版社も 同じ（国の 学習指導要領で 決まる）。
     ちがうのは「じゅんばんと 時期」だけ。だから **問題は 共通**で、
     ここには「単元 → 学期」の 差分だけを もつ。ステージ id も 変えない（★・記ろくは そのまま）。
   ・表は 各社の 年間指導計画を もとに した **目安**。学校で 前後する ぶんは
     おうちの人ページの 単元の ✓ で 直す（いままで どおり）。
   ・各教科の いちばん 上の 出版社が いままでの 表（terms.js の 表 そのもの）＝きほん。
     ほかの 出版社は「きほんと ちがう ところ」だけ 書く（書いて ない ステージは きほんの まま）。
   ・セーブは p.books = { sansu: 'tokyo', kokugo: 'mitsumura', ... }（ない 教科は きほん）。
   ・英語の 小3・小4は 文部科学省の Let's Try!（どの 学校も 同じ）なので 出版社は 小5・小6 だけ。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.textbooks = (function () {
  /* 教科（せっていの 単位）。areas＝地図の エリア id。
     小3の 理科・社会は 1つの エリア 'rikashakai' で、問題の unit が「理科／」「社会／」で 分かれる */
  const SUBJECTS = [
    { id: 'sansu', name: '算数', areas: ['sansu'], prefix: 'sansu' },
    { id: 'kokugo', name: '国語', areas: ['kokugo'], prefix: 'kokugo' },
    { id: 'rika', name: '理科', areas: ['rika', 'rikashakai'], unitHead: '理科／', prefix: 'rika' },
    { id: 'shakai', name: '社会', areas: ['shakai', 'rikashakai'], unitHead: '社会／', prefix: 'shakai' },
    { id: 'eigo', name: '英語', areas: ['eigo'], prefix: 'eigo', fromGrade: 5, sameNote: '小3・小4は どの 学校も 同じ（Let\'s Try!）。小5・小6の 教科書も、単元の じゅんばんは 出版社で ほとんど 変わりません。' }
  ];

  /* 出版社（いちばん 上＝きほん）。book は 教科書の 名前（おうちの人ページの 説明用） */
  const PUBLISHERS = {
    sansu: [
      { id: 'nichibun', name: '日本文教出版', book: '小学算数' },
      { id: 'tokyo', name: '東京書籍', book: '新しい算数' },
      { id: 'keirin', name: '啓林館', book: 'わくわく算数' },
      { id: 'gakuto', name: '学校図書', book: 'みんなと学ぶ 小学校算数' },
      { id: 'kyoiku', name: '教育出版', book: '小学算数' },
      { id: 'dainippon', name: '大日本図書', book: 'たのしい算数' }
    ],
    kokugo: [
      { id: 'tokyo', name: '東京書籍', book: '新しい国語' },
      { id: 'mitsumura', name: '光村図書', book: '国語' },
      { id: 'kyoiku', name: '教育出版', book: 'ひろがる言葉 小学国語' },
      { id: 'gakuto', name: '学校図書', book: 'みんなと学ぶ 小学校国語' }
    ],
    rika: [
      { id: 'tokyo', name: '東京書籍', book: '新しい理科' },
      { id: 'dainippon', name: '大日本図書', book: 'たのしい理科' },
      { id: 'keirin', name: '啓林館', book: 'わくわく理科' },
      { id: 'kyoiku', name: '教育出版', book: '未来をひらく 小学理科' },
      { id: 'gakuto', name: '学校図書', book: 'みんなと学ぶ 小学校理科' },
      { id: 'shinshu', name: '信州教育出版社', book: '楽しい理科' }
    ],
    shakai: [
      { id: 'tokyo', name: '東京書籍', book: '新しい社会' },
      { id: 'kyoiku', name: '教育出版', book: '小学社会' },
      { id: 'nichibun', name: '日本文教出版', book: '小学社会' }
    ],
    eigo: [
      { id: 'tokyo', name: '東京書籍', book: 'NEW HORIZON Elementary' },
      { id: 'mitsumura', name: '光村図書', book: 'Here We Go!' },
      { id: 'kairyudo', name: '開隆堂', book: 'Junior Sunshine' },
      { id: 'kyoiku', name: '教育出版', book: 'ONE WORLD Smiles' },
      { id: 'keirin', name: '啓林館', book: 'Blue Sky elementary' },
      { id: 'gakuto', name: '学校図書', book: 'JUNIOR TOTAL ENGLISH' },
      { id: 'sanseido', name: '三省堂', book: 'CROWN Jr.' }
    ]
  };

  /* ---- きほんと ちがう ところ（ステージ番号 → 学期）----
     ステージの 番号は world3.js の ならび（小3 算数なら 1 かけ算の きまり … 18 そろばん）。
     書いて ない ステージは terms.js の 表の まま。 */
  const STAGE = {
    sansu: {
      // 東京書籍『新しい算数』：表とグラフが 3年の さいご・4年の 小数が 2学期・5年の 面積が 2学期・6年の 比が 1学期
      tokyo: {
        sansu2: { 7: 1 },
        sansu3: { 5: 3, 8: 1 },
        sansu4: { 5: 2, 8: 1 },
        sansu5: { 7: 2, 8: 1 },
        sansu6: { 6: 1 }
      },
      // 啓林館『わくわく算数』：表とグラフが 2学期・4年の 小数が 1学期・5年の 速さが 3学期・6年の 円の面積が 1学期
      keirin: {
        sansu2: { 7: 1 },
        sansu3: { 5: 2, 8: 1 },
        sansu4: { 8: 1 },
        sansu5: { 7: 2, 8: 1, 13: 3 },
        sansu6: { 8: 1 }
      },
      // 学校図書『みんなと学ぶ 小学校算数』：東京書籍に 近い ならび
      gakuto: {
        sansu2: { 7: 1 },
        sansu3: { 8: 1 },
        sansu4: { 5: 2, 8: 1 },
        sansu5: { 7: 2, 8: 1 },
        sansu6: { 6: 1 }
      },
      // 教育出版『小学算数』：日文に 近い ならび（3年の 長さが 1学期）
      kyoiku: {
        sansu3: { 8: 1 },
        sansu5: { 8: 1 },
        sansu6: { 8: 1 }
      },
      // 大日本図書『たのしい算数』：3年の 表とグラフが 2学期・大きい数と 長さが 1学期
      dainippon: {
        sansu3: { 5: 2, 7: 1, 8: 1 },
        sansu5: { 13: 3 },
        sansu6: { 5: 2 }
      }
    },
    kokugo: {
      // かん字は どの 教科書も「1年分 まとめて 1学期あつかい」（terms.js の きまり）なので、ちがいは ことばの 単元だけ
      mitsumura: { kokugo3: { 5: 1 } },   // ローマ字の ステージ（単元の 表 UNIT と そろえる）
      kyoiku: {},
      gakuto: {}
    },
    rika: {
      dainippon: {},
      keirin: {},
      kyoiku: {},
      gakuto: {},
      shinshu: {}
    },
    shakai: {
      kyoiku: {},
      nichibun: {}
    },
    eigo: {
      // 小5・小6の 単元の じゅんばんは 7社とも ほぼ 同じ（自己紹介 → 誕生日 → 教科 → できる こと → 道案内 → 注文 → 日本紹介 → ヒーロー）
      mitsumura: {}, kairyudo: {}, kyoiku: {}, keirin: {}, gakuto: {}, sanseido: {}
    }
  };

  /* ---- 小3 リスト教科の 単元（UNITS3 の units[0] の 文字 → 学期）---- */
  const UNIT = {
    kokugo: {
      // 光村図書『国語』：ローマ字が 上巻（1学期）・修飾語と こそあどが 上巻
      mitsumura: { 'ローマ字': 1, '修飾語': 1, 'こそあどことば': 1 },
      // 教育出版：ことわざが 2学期
      kyoiku: { 'ことわざ': 2 },
      gakuto: {}
    },
    rika: {
      // 大日本図書：風とゴムが 2学期・ものの重さが 2学期
      dainippon: { '理科／風とゴム': 2, '理科／重さ': 2 },
      // 啓林館：電気が 2学期の おわり
      keirin: { '理科／電気': 2 },
      kyoiku: { '理科／風とゴム': 2 },
      gakuto: { '理科／風とゴム': 2, '理科／電気': 2 },
      shinshu: {}
    },
    shakai: {
      // 教育出版：消防が 2学期の おわり
      kyoiku: { '社会／消防': 2 },
      nichibun: {}
    },
    eigo: {}   // Let's Try! 1 は 共通
  };

  /* ---- しらべる ---- */
  function subject(id) { return SUBJECTS.filter(function (s) { return s.id === id; })[0] || null; }
  function list(subjectId) { return PUBLISHERS[subjectId] || []; }
  function defaultId(subjectId) { const l = list(subjectId); return l.length ? l[0].id : null; }
  function publisher(subjectId, pubId) { return list(subjectId).filter(function (p) { return p.id === pubId; })[0] || null; }

  // いまの プレイヤー（terms.js と 同じ）。テストの にせプレイヤーに books が ない ときは いまの 子の せっていを 借りる
  function booksOf(player) {
    if (player && player.books && typeof player.books === 'object') return player.books;
    try {
      const cur = MQ.save && MQ.save.current ? MQ.save.current() : null;
      return cur && cur.books && typeof cur.books === 'object' ? cur.books : {};
    } catch (e) { return {}; }
  }
  // その 教科で えらんで いる 出版社の id（せっていが なければ きほん）
  function pick(player, subjectId) {
    const id = booksOf(player)[subjectId];
    return publisher(subjectId, id) ? id : defaultId(subjectId);
  }
  function isDefault(player, subjectId) { return pick(player, subjectId) === defaultId(subjectId); }

  // 'sansu3' → 'sansu'／'rika5' → 'rika'
  function subjectOfPrefix(prefix) {
    const m = /^([a-z]+)\d$/.exec(String(prefix || ''));
    if (!m) return null;
    const s = subject(m[1]);
    return s ? s.id : null;
  }
  // ステージの 学期（きほんと ちがう ときだけ 数を かえす。ちがわなければ undefined）
  function stageTerm(player, prefix, no) {
    const sid = subjectOfPrefix(prefix);
    if (!sid) return undefined;
    const pub = pick(player, sid);
    const t = STAGE[sid] && STAGE[sid][pub] && STAGE[sid][pub][prefix];
    const v = t && t[no];
    return typeof v === 'number' ? v : undefined;
  }
  // 小3 リスト教科の 単元の 学期（同じく ちがう ときだけ）
  function unitTerm(player, entry) {
    if (!entry || !entry.units) return undefined;
    const sid = subjectOfUnitEntry(entry);
    if (!sid) return undefined;
    const pub = pick(player, sid);
    const t = UNIT[sid] && UNIT[sid][pub];
    const v = t && t[entry.units[0]];
    return typeof v === 'number' ? v : undefined;
  }
  function subjectOfUnitEntry(entry) {
    if (entry.area === 'rikashakai') {
      const u = String(entry.units[0]);
      return u.indexOf('理科／') === 0 ? 'rika' : u.indexOf('社会／') === 0 ? 'shakai' : null;
    }
    const s = subject(entry.area);
    return s ? s.id : null;
  }
  // おうちの人ページの ✓ の key（ステージ id か 'unit:…'）が どの 教科の ものか
  function subjectOfKey(key) {
    const k = String(key || '');
    if (k.indexOf('unit:') === 0) {
      const u = k.slice(5);
      if (u.indexOf('理科／') === 0) return 'rika';
      if (u.indexOf('社会／') === 0) return 'shakai';
      const e = MQ.terms && MQ.terms.UNITS3 ? MQ.terms.UNITS3.filter(function (x) { return x.key === k; })[0] : null;
      return e ? subjectOfUnitEntry(e) : null;
    }
    const m = /^([a-z]+)\d-\d+$/.exec(k);
    return m ? (subject(m[1]) ? m[1] : null) : null;
  }

  /* えらぶ（player を 書きかえる。MQ.save.update の 中で 呼ぶ）。
     その 教科の 単元の ✓（上書き）は 消す＝新しい 表が そのまま 効く。ほかの 教科の ✓は のこす */
  function setBook(player, subjectId, pubId) {
    if (!player || !subject(subjectId) || !publisher(subjectId, pubId)) return false;
    player.books = (player.books && typeof player.books === 'object') ? player.books : {};
    player.books[subjectId] = pubId;
    if (player.units) {
      Object.keys(player.units).forEach(function (k) { if (subjectOfKey(k) === subjectId) delete player.units[k]; });
    }
    return true;
  }

  /* その 学年の おうちの人ページに 出す 教科（地図の エリアから） */
  function subjectsFor(grade) {
    const w = MQ.content && MQ.content.worldForGrade ? MQ.content.worldForGrade(grade) : null;
    const areas = {};
    ((w && w.areas) || []).forEach(function (a) { areas[a.id] = true; });
    return SUBJECTS.filter(function (s) { return s.areas.some(function (a) { return areas[a]; }); });
  }

  // 感想の 文字用：「算数 東京書籍・国語 光村図書」（きほんの ままの 教科は 出さない）
  function summary(player) {
    const out = [];
    SUBJECTS.forEach(function (s) {
      if (isDefault(player, s.id)) return;
      const p = publisher(s.id, pick(player, s.id));
      if (p) out.push(s.name + ' ' + p.name);
    });
    return out.length ? out.join('・') : 'きほんの まま';
  }

  return {
    SUBJECTS: SUBJECTS, PUBLISHERS: PUBLISHERS, STAGE: STAGE, UNIT: UNIT,
    subject: subject, list: list, defaultId: defaultId, publisher: publisher,
    pick: pick, isDefault: isDefault, stageTerm: stageTerm, unitTerm: unitTerm,
    subjectOfPrefix: subjectOfPrefix, subjectOfKey: subjectOfKey, setBook: setBook,
    subjectsFor: subjectsFor, summary: summary
  };
})();
