/* ---------------------------------------------------------
   とくい・にがて（v7.1・おうちの人ページ用）

   たたかいの 1問ごとの 結果（正解／まちがい）を 単元ごとに ためて、
   おうちの人ページに「とくい・にがて マップ」と「にがて トップ3」を 出す。
   DOM を 知らない。画面は js/ui/dex.js の statsSection。

   セーブ（player.stats）:
     rows:  { 'sansu3-2':        { ok, n, r: '1101…', at },   ← ステージ（教科書の 単元）ごと
              'sansu3-2|暗算':   { ok, n, r, at } }            ← その中の こまかい 単元（問題の unit）ごと
              ok=正解した 数・n=出た 数・r=さいきん 20問の ○×（1=○ 0=×・右が 新しい）
     wrong: { 'sansu3-2': [ { u, p, g, a, at, miss, ok }, … ] } ← 落とした 問題（まちがいの 多い 順・20問まで）
              u=単元・p=問題文・g=子どもの 答え（さいご）・a=正しい 答え・
              miss=まちがえた 回数・ok=（落とした あとに）正解した 回数 → 問題ごとの 正答率
              ※ 算数は 毎回 数字が 変わる 生成式なので 問題文が 同じに なりにくい（単元ごとに 見る）

   「正解」は 1回目で 合った ときだけ（2回目で 合っても ×）。
   子どもには 見せない（おうちの人ページだけ）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.stats = (function () {
  const RECENT = 20;      // 「さいきん」は 20問
  const WRONG_MAX = 20;   // 落とした 問題は ステージごと 20問まで（まちがいの 多い 順に のこす）
  const FEW = 5;          // さいきん 5問 みまん は まだ 色を つけない
  const GOOD = 85;        // ％ いじょう → とくい
  const WEAK = 60;        // ％ みまん → にがて
  const TOP_WEAK = 70;    // にがて トップ3 に 入る 上限（％）

  function ensure(p) {
    if (!p.stats || typeof p.stats !== 'object') p.stats = {};
    if (!p.stats.rows) p.stats.rows = {};
    if (!p.stats.wrong) p.stats.wrong = {};
    return p.stats;
  }

  /* 問題文を 文字だけに（図・表は 落とす・60文字まで） */
  function promptText(html) {
    let s = String(html == null ? '' : html);
    s = s.replace(/<svg[\s\S]*<\/svg>/g, ' ').replace(/<table[\s\S]*<\/table>/g, ' ').replace(/<div[\s\S]*<\/div>/g, ' ');
    s = s.replace(/<rt>[\s\S]*?<\/rt>/g, '');      // ふりがなは 落とす
    s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > 60 ? s.slice(0, 59) + '…' : s;
  }

  function bump(rows, key, ok, at) {
    const row = rows[key] || (rows[key] = { ok: 0, n: 0, r: '', at: '' });
    row.n++;
    if (ok) row.ok++;
    row.r = (row.r + (ok ? '1' : '0')).slice(-RECENT);
    row.at = at;
  }

  /* たたかいの おわりに 1回。sum.results（core/battle.js の summary）を ためる */
  function record(p, sum) {
    const list = (sum && sum.results) || [];
    if (!list.length) return 0;
    const st = ensure(p);
    const at = new Date().toISOString();
    const touched = {};
    list.forEach(function (r) {
      if (!r.stageId) return;
      bump(st.rows, r.stageId, !!r.ok, at);
      if (r.unit) bump(st.rows, r.stageId + '|' + r.unit, !!r.ok, at);
      /* 落とした 問題：同じ 問題文なら 1つに まとめて 回数を 数える（問題ごとの 正答率）。
         正解した ときも、前に 落とした ことの ある 問題なら 正解の 回数を 足す */
      const arr = st.wrong[r.stageId] || (st.wrong[r.stageId] = []);
      const text = promptText(r.prompt);
      let hit = null;
      for (let i = 0; i < arr.length; i++) { if (arr[i].p === text) { hit = arr[i]; break; } }
      if (!r.ok) {
        if (hit) {
          hit.miss = (hit.miss || 1) + 1;
          hit.g = r.given == null ? '' : String(r.given);
          hit.a = r.answer == null ? '' : String(r.answer);
          hit.at = at;
          if (r.unit) hit.u = r.unit;
        } else {
          arr.push({ u: r.unit || '', p: text, g: r.given == null ? '' : String(r.given), a: r.answer == null ? '' : String(r.answer), at: at, miss: 1, ok: 0 });
        }
        touched[r.stageId] = true;
      } else if (hit) {
        hit.ok = (hit.ok || 0) + 1;
      }
    });
    Object.keys(touched).forEach(function (id) {
      const arr = st.wrong[id];
      arr.sort(byMiss);
      if (arr.length > WRONG_MAX) arr.length = WRONG_MAX;
    });
    return list.length;
  }

  // まちがいの 多い 順 → 新しい 順
  function byMiss(a, b) { return (b.miss || 1) - (a.miss || 1) || String(b.at).localeCompare(String(a.at)); }

  /* 1行の 数字：{ ok, n, recentOk, recentN, pct, level } */
  function measure(row) {
    if (!row) return { ok: 0, n: 0, recentOk: 0, recentN: 0, pct: null, level: 'none' };
    const r = row.r || '';
    const recentN = r.length;
    const recentOk = r.split('1').length - 1;
    const pct = recentN ? Math.round(recentOk / recentN * 100) : null;
    return { ok: row.ok, n: row.n, recentOk: recentOk, recentN: recentN, pct: pct, level: levelOf(pct, recentN), at: row.at || '' };
  }

  function levelOf(pct, n) {
    if (!n) return 'none';
    if (n < FEW) return 'few';
    if (pct >= GOOD) return 'good';
    if (pct >= WEAK) return 'mid';
    return 'weak';
  }

  const LEVEL_NAME = { good: 'とくい', mid: 'ふつう', weak: 'にがて', few: 'まだ すこし', none: 'まだ' };
  const LEVEL_MARK = { good: '◎', mid: '○', weak: '△', few: '・', none: '－' };

  /* その 学年の 教科 → ステージ → こまかい 単元 の 一覧（データの ない ステージも 入る） */
  function overview(p, grade) {
    const st = ensure(p);
    const w = MQ.content && MQ.content.worldForGrade ? MQ.content.worldForGrade(grade) : null;
    const areas = [];
    if (!w) return { grade: grade, areas: areas, played: 0 };
    let played = 0;
    (w.areas || []).forEach(function (a) {
      if (a.id === 'tower') return;
      const stages = [];
      (a.stages || []).forEach(function (s) {
        if (s.available === false) return;
        const m = measure(st.rows[s.id]);
        const units = [];
        Object.keys(st.rows).forEach(function (k) {
          if (k.indexOf(s.id + '|') !== 0) return;
          const um = measure(st.rows[k]);
          um.unit = k.slice(s.id.length + 1);
          units.push(um);
        });
        units.sort(function (x, y) { return (x.pct == null ? 999 : x.pct) - (y.pct == null ? 999 : y.pct); });
        m.id = s.id; m.name = s.name; m.areaId = a.id; m.areaName = a.name;
        m.units = units;
        m.wrong = (st.wrong[s.id] || []).slice();
        if (m.n) played++;
        stages.push(m);
      });
      areas.push({ id: a.id, name: a.name, stages: stages });
    });
    return { grade: grade, areas: areas, played: played };
  }

  /* いま いちばん にがて（さいきん 5問いじょう・70% みまん）を k こ */
  function weakest(p, grade, k) {
    const ov = overview(p, grade);
    const all = [];
    ov.areas.forEach(function (a) { a.stages.forEach(function (s) { if (s.recentN >= FEW && s.pct < TOP_WEAK) all.push(s); }); });
    all.sort(function (x, y) { return x.pct - y.pct || y.recentN - x.recentN; });
    return all.slice(0, k || 3);
  }

  /* データの ある 学年（小さい 順） */
  function gradesWithData(p) {
    const st = ensure(p);
    const out = {};
    Object.keys(st.rows).forEach(function (k) {
      if (k.indexOf('|') !== -1) return;
      const f = MQ.content && MQ.content.findStage ? MQ.content.findStage(k) : null;
      if (f && f.world) out[f.world.grade] = true;
    });
    return Object.keys(out).map(Number).sort(function (a, b) { return a - b; });
  }

  /* 文字で コピー する ときの 文 */
  function summaryText(p, grade) {
    const ov = overview(p, grade);
    const d = new Date();
    const lines = ['まなびモンスター とくい・にがて（' + p.name + '・小' + grade + '）' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()];
    if (!ov.played) { lines.push('まだ 記ろくが ありません。'); return lines.join('\n'); }
    ov.areas.forEach(function (a) {
      const rows = a.stages.filter(function (s) { return s.n > 0; });
      if (!rows.length) return;
      lines.push('【' + a.name + '】');
      rows.forEach(function (s) {
        lines.push(' ' + LEVEL_MARK[s.level] + ' ' + s.name + '　さいきん ' + s.recentOk + '/' + s.recentN + (s.pct != null ? '（' + s.pct + '%）' : '') + '　ぜんぶ ' + s.ok + '/' + s.n);
        if (s.level === 'weak' || s.level === 'mid') {
          s.wrong.slice(0, 3).forEach(function (wq) {
            lines.push('   ・「' + wq.p + '」→ 答え「' + wq.g + '」（正しくは ' + wq.a + '）' + countText(wq));
          });
        }
      });
    });
    lines.push('◎とくい（85%〜） ○ふつう △にがて（〜59%） ・まだ すこし');
    return lines.join('\n');
  }

  // 落とした 問題の 回数の 文（「まちがい 3回・正解 1回」）
  function countText(wq) {
    const miss = wq.miss || 1, ok = wq.ok || 0;
    return 'まちがい ' + miss + '回' + (ok ? '・正解 ' + ok + '回' : '');
  }

  return {
    record: record, measure: measure, countText: countText, levelOf: levelOf, overview: overview, weakest: weakest,
    gradesWithData: gradesWithData, summaryText: summaryText, promptText: promptText,
    LEVEL_NAME: LEVEL_NAME, LEVEL_MARK: LEVEL_MARK,
    RECENT: RECENT, WRONG_MAX: WRONG_MAX, FEW: FEW, GOOD: GOOD, WEAK: WEAK, TOP_WEAK: TOP_WEAK
  };
})();
