/* ---------------------------------------------------------
   学期（v2.6）：「学校で ならった ところ」だけ 出す

   単元ごとに term を 決めてある。
     1 = 1学期   2 = 2学期   3 = 3学期   4 = この学年では ならわない（小4 の 内容）
   プレイヤーの
     p.term  … 0 = ぜんぶ（いままで どおり）／1〜3 = その学期まで
     p.units … 単元ごとの 上書き { key: true（ならった）/ false（まだ） }
   で、その単元が「ならった」か 決まる（おうちの人ページで 変える）。

   ・算数（と 小1・小2の ぜんぶ）は ステージ＝単元。key は ステージ id
   ・小3の 国語・理科社会・英語は 問題の unit の 文字で 単元に まとめる。key は 'unit:名前'
   ・時期は 教科書の 一般的な じゅん（算数は 日本文教出版の 年間計画）。
     学校で 前後するので、単元ごとの チェックで 直せる。
   ・表に ない unit は「ならった」あつかい（出す）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.terms = (function () {
  const TERM_NAMES = { 1: '1学期', 2: '2学期', 3: '3学期', 4: '小4で ならう' };

  /* ステージ（単元）→ 学期。ステージ id の 番号で */
  const STAGE_TERM = {
    // 小3 算数（日本文教出版『小学算数』3年）
    'sansu3': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 3, 15: 3, 16: 3, 17: 3, 18: 3 },
    // 小3 国語の ローマ字ステージ（ほかの 国語は 単元で）
    'kokugo3': { 5: 2 },
    // 小1
    'sansu1': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 3, 12: 3 },
    'kokugo1': { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2 },
    // 小2
    'sansu2': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 3, 13: 3, 14: 3 },
    'kokugo2': { 1: 1, 2: 1, 3: 1, 4: 2 },
    // 小4 算数（日本文教出版『小学算数』4年）v4.4
    'sansu4': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 3, 13: 3, 14: 3, 15: 3 },
    // 小5 算数（日本文教出版『小学算数』5年・目安）v6.5
    'sansu5': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 3, 16: 3, 17: 3, 18: 3 },
    // 小5 国語（v6.6）。かん字は 1年分 まとめて 1学期あつかい
    'kokugo5': { 1: 1, 2: 1, 3: 1, 4: 2 },
    // 小5 理科・社会（v6.7）
    'rika5': { 1: 1, 2: 1, 3: 2, 4: 3 },
    'shakai5': { 1: 1, 2: 1, 3: 2, 4: 3 },
    // 小4 国語（東京書籍）。かん字は 1年分 まとめて 1学期あつかい（小1〜小3と 同じ）
    'kokugo4': { 1: 1, 2: 1, 3: 1, 4: 2 },
    // 小4 理科・社会（v4.6）
    'rika4': { 1: 1, 2: 1, 3: 2, 4: 3 },
    'shakai4': { 1: 1, 2: 1, 3: 2, 4: 3 },
    // 小4 英語（Let's Try! 2）v4.7
    'eigo4': { 1: 1, 2: 1, 3: 2, 4: 3 }
  };

  /* 小3 リスト教科の 単元（unit の 文字 → 学期）。name は おうちの人ページに 出す */
  const UNITS3 = [
    // 国語（東京書籍）
    { name: 'かん字（読み・書き）', area: 'kokugo', term: 1, units: ['かん字の読み', 'かん字を書く', 'かん字を書く（ゆびで）'] },
    { name: '国語辞典', area: 'kokugo', term: 1, units: ['国語辞典'] },
    { name: '音と訓', area: 'kokugo', term: 1, units: ['音と訓'] },
    { name: '送りがな', area: 'kokugo', term: 1, units: ['送りがな'] },
    { name: '主語と述語', area: 'kokugo', term: 1, units: ['主語と述語'] },
    { name: 'ふごう（、。「」）', area: 'kokugo', term: 1, units: ['ふごう'] },
    { name: 'はんたいの ことば', area: 'kokugo', term: 1, units: ['はんたいのことば'] },
    { name: 'ローマ字', area: 'kokugo', term: 2, units: ['ローマ字'] },
    { name: '修飾語', area: 'kokugo', term: 2, units: ['修飾語'] },
    { name: 'こそあど ことば', area: 'kokugo', term: 2, units: ['こそあどことば'] },
    { name: 'つなぎ ことば', area: 'kokugo', term: 2, units: ['つなぎことば'] },
    { name: 'じゅく語', area: 'kokugo', term: 2, units: ['じゅく語'] },
    { name: 'にた いみの ことば', area: 'kokugo', term: 2, units: ['にたいみのことば'] },
    { name: 'ことわざ', area: 'kokugo', term: 3, units: ['ことわざ'] },
    { name: 'かんようく', area: 'kokugo', term: 3, units: ['かんようく'] },
    // 理科
    { name: '理科：こん虫', area: 'rikashakai', term: 1, units: ['理科／こん虫'] },
    { name: '理科：植物', area: 'rikashakai', term: 1, units: ['理科／植物'] },
    { name: '理科：風と ゴム', area: 'rikashakai', term: 1, units: ['理科／風とゴム'] },
    { name: '理科：太陽と かげ', area: 'rikashakai', term: 2, units: ['理科／太陽とかげ'] },
    { name: '理科：光', area: 'rikashakai', term: 2, units: ['理科／光'] },
    { name: '理科：音', area: 'rikashakai', term: 2, units: ['理科／音'] },
    { name: '理科：電気', area: 'rikashakai', term: 3, units: ['理科／電気'] },
    { name: '理科：じしゃく', area: 'rikashakai', term: 3, units: ['理科／じしゃく'] },
    { name: '理科：ものの 重さ', area: 'rikashakai', term: 3, units: ['理科／重さ'] },
    // 社会
    { name: '社会：まち たんけん', area: 'rikashakai', term: 1, units: ['社会／まちたんけん', '社会／地いき'] },
    { name: '社会：方位', area: 'rikashakai', term: 1, units: ['社会／方位'] },
    { name: '社会：地図記号', area: 'rikashakai', term: 1, units: ['社会／地図記号'] },
    { name: '社会：市役所', area: 'rikashakai', term: 1, units: ['社会／市役所'] },
    { name: '社会：はたらく 人（農家）', area: 'rikashakai', term: 2, units: ['社会／はたらく人', '社会／農家'] },
    { name: '社会：工場', area: 'rikashakai', term: 2, units: ['社会／工場'] },
    { name: '社会：店の しごと', area: 'rikashakai', term: 2, units: ['社会／店のしごと'] },
    { name: '社会：消防', area: 'rikashakai', term: 3, units: ['社会／消防'] },
    { name: '社会：警察', area: 'rikashakai', term: 3, units: ['社会／警察'] },
    { name: '社会：むかしの 道具', area: 'rikashakai', term: 3, units: ['社会／むかしの道具'] },
    // 英語（Let's Try! 1）
    { name: 'あいさつ', area: 'eigo', term: 1, units: ['あいさつ', 'よびかけ', 'しつもん'] },
    { name: '気もち（How are you?）', area: 'eigo', term: 1, units: ['気もち'] },
    { name: '数（How many?）', area: 'eigo', term: 1, units: ['数'] },
    { name: '色（I like blue.）', area: 'eigo', term: 1, units: ['色'] },
    { name: 'すきな もの（What do you like?）', area: 'eigo', term: 2, units: ['すきなもの'] },
    { name: 'たべもの', area: 'eigo', term: 2, units: ['たべもの'] },
    { name: 'アルファベット', area: 'eigo', term: 2, units: ['アルファベット'] },
    { name: 'どうぶつ（What\'s this?）', area: 'eigo', term: 3, units: ['どうぶつ'] },
    { name: 'じこしょうかい（Who are you?）', area: 'eigo', term: 3, units: ['じこしょうかい'] },
    { name: '曜日', area: 'eigo', term: 4, units: ['曜日'] },
    { name: '月', area: 'eigo', term: 4, units: ['月'] },
    { name: '天気', area: 'eigo', term: 4, units: ['天気'] },
    { name: '季節', area: 'eigo', term: 4, units: ['季節'] }
  ];
  UNITS3.forEach(function (u) { u.key = 'unit:' + u.units[0]; u.kind = 'unit'; });

  // unit の 文字 → 表の 行（小3 だけ。ほかの 学年は null＝ならった あつかい）
  const UNIT_INDEX = {};
  UNITS3.forEach(function (u) { u.units.forEach(function (s) { UNIT_INDEX[s] = u; }); });

  function unitEntryOf(unitStr, grade) {
    if ((grade || 3) !== 3) return null;
    return UNIT_INDEX[unitStr] || null;
  }

  // 'sansu3-7' → { prefix: 'sansu3', no: 7, grade: 3 }
  function parseStageId(id) {
    const m = /^([a-z]+)(\d)-(\d+)$/.exec(String(id || ''));
    if (!m) return null;
    return { prefix: m[1] + m[2], no: parseInt(m[3], 10), grade: parseInt(m[2], 10) };
  }
  function stageTerm(stageId) {
    const p = parseStageId(stageId);
    if (!p || !STAGE_TERM[p.prefix]) return 0;
    return STAGE_TERM[p.prefix][p.no] || 0;
  }

  /* ---- だれの 設定を 見るか ---- */
  let forced = null;   // テスト用
  function current() {
    if (forced) return forced;
    try { return (MQ.save && MQ.save.current) ? MQ.save.current() : null; } catch (e) { return null; }
  }
  function forcePlayer(p) { forced = p || null; }
  /* v4.5：学期の せっていは **その子の 学年**の ときだけ かかる。
     ふくしゅう（下の 学年）・よしゅう（上の 学年）では ぜんぶ 出す */
  function reviewing(player) {
    if (!player || !player.playGrade || !player.grade) return false;
    return player.playGrade !== player.grade;
  }
  // 画面に 出す ための せってい（ふくしゅう中でも そのまま 見せる）
  function settingTerm(player) {
    const t = player && player.term;
    return (t === 1 || t === 2 || t === 3) ? t : 0;
  }
  function termOf(player) {
    if (reviewing(player)) return 0;
    const t = player && player.term;
    return (t === 1 || t === 2 || t === 3) ? t : 0;
  }

  // その単元を ならったか（term の きまり ＋ 上書き）
  function learnedTerm(player, term, key) {
    const ov = player && player.units && player.units[key];
    if (ov === true || ov === false) return ov;
    const t = termOf(player);
    if (t === 0) return true;          // ぜんぶ
    return !!term && term <= t;         // term 4（小4）は ぜんぶ の ときだけ
  }
  function stageLearned(player, stageId) {
    const term = stageTerm(stageId);
    if (!term) return true;             // 表に ない ステージ（塔など）
    return learnedTerm(player, term, stageId);
  }
  function unitLearned(player, unitStr, grade) {
    const e = unitEntryOf(unitStr, grade);
    if (!e) return true;
    return learnedTerm(player, e.term, e.key);
  }
  // 問題を 出して よいか（単元の チェック）
  function allowQ(player, q, grade) {
    return unitLearned(player, q && q.unit, grade);
  }
  // key（ステージ id か 'unit:…'）で ならったか（おうちの人ページ用）
  function learned(player, key) {
    if (String(key).indexOf('unit:') === 0) {
      const e = UNITS3.filter(function (u) { return u.key === key; })[0];
      return e ? learnedTerm(player, e.term, e.key) : true;
    }
    return stageLearned(player, key);
  }

  /* おうちの人ページ用：その学年の 単元の 一覧
       { key, name, area, term, kind: 'stage'|'unit', ready }  ready=false は 問題が まだ ない ステージ */
  /* いまの 月から おすすめの 学期（4〜8月=1・9〜12月=2・1〜3月=3）。おうちの人ページが「2学期に しますか？」と 聞く（v3.0）。
     テスト用に 日付を 入れかえられる（setNow） */
  let NOW = null;
  function now() { return NOW || new Date(); }
  function suggested(date) {
    const m = (date || now()).getMonth() + 1;
    return m >= 9 ? 2 : m <= 3 ? 3 : 1;
  }

  function entries(grade) {
    const g = grade || 3;
    const out = [];
    const w = MQ.content && MQ.content.worldForGrade ? MQ.content.worldForGrade(g) : null;
    if (w) {
      w.areas.forEach(function (a) {
        if (a.id === 'tower') return;
        a.stages.forEach(function (st) {
          const term = stageTerm(st.id);
          if (!term) return;
          if (g === 3 && a.id === 'kokugo' && st.no !== 5) return;   // 小3 国語は 単元で（ローマ字だけ ステージ）
          out.push({ key: st.id, name: st.name, area: a.id, term: term, kind: 'stage', ready: st.available !== false });
        });
      });
    }
    if (g === 3) {
      UNITS3.forEach(function (u) {
        if (u.units[0] === 'ローマ字') return;   // ローマ字は ステージ kokugo3-5 の 行で
        out.push({ key: u.key, name: u.name, area: u.area, term: u.term, kind: 'unit', ready: true });
      });
    }
    return out;
  }

  // 学期の 文字（地図の「まだ」の ところに 出す）
  function whenText(term) {
    return term === 4 ? '小4で' : term ? TERM_NAMES[term] + 'から' : '';
  }

  return {
    TERM_NAMES: TERM_NAMES, UNITS3: UNITS3,
    unitEntryOf: unitEntryOf, stageTerm: stageTerm, termOf: termOf, reviewing: reviewing, settingTerm: settingTerm,
    stageLearned: stageLearned, unitLearned: unitLearned, allowQ: allowQ, learned: learned,
    entries: entries, whenText: whenText,
    suggested: suggested, now: now, setNow: function (d) { NOW = d || null; },
    current: current, forcePlayer: forcePlayer
  };
})();
