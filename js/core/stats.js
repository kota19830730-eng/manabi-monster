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

  const DAYS_KEEP = 400;  // 日ごとの 記録は 400日ぶん
  let NOW = null;         // テスト用（setNow）
  function now() { return NOW ? new Date(NOW.getTime()) : new Date(); }

  function ensure(p) {
    if (!p.stats || typeof p.stats !== 'object') p.stats = {};
    if (!p.stats.rows) p.stats.rows = {};
    if (!p.stats.wrong) p.stats.wrong = {};
    if (!p.stats.days) p.stats.days = {};   // v7.3：日ごと { 'YYYY-MM-DD': { n, ok, t, u: { stageId: [ok, n] } } }
    return p.stats;
  }

  /* ---- 日づけ（その 端末の ローカル） ---- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dateOf(key) { const m = String(key).split('-'); return new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2])); }
  function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { return addDays(d, -d.getDay()); }   // 日曜はじまり
  function mdLabel(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

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
    const nowD = now();
    const at = nowD.toISOString();
    const touched = {};
    // 日ごとの 記録（今週／先週・14日の グラフ・成長 用）
    const dk = dayKey(nowD);
    const day = st.days[dk] || (st.days[dk] = { n: 0, ok: 0, t: 0, u: {} });
    list.forEach(function (r) {
      if (!r.stageId) return;
      bump(st.rows, r.stageId, !!r.ok, at);
      if (r.unit) bump(st.rows, r.stageId + '|' + r.unit, !!r.ok, at);
      day.n++;
      if (r.ok) day.ok++;
      day.t += Math.max(0, Math.min(600, Number(r.sec) || 0));
      const du = day.u[r.stageId] || (day.u[r.stageId] = [0, 0]);
      du[1]++;
      if (r.ok) du[0]++;
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
    // 古い 日を 落とす
    const keys = Object.keys(st.days).sort();
    while (keys.length > DAYS_KEEP) delete st.days[keys.shift()];
    return list.length;
  }

  /* =======================================================
     期間（今週／今月／すべて）と 日ごとの 集計（v7.3）
     ======================================================= */
  // from〜to（両はし ふくむ・null なら ぜんぶ）の 合計
  function sumDays(p, from, to) {
    const st = ensure(p);
    const out = { n: 0, ok: 0, t: 0, days: 0, byStage: {} };
    const fk = from ? dayKey(from) : null, tk = to ? dayKey(to) : null;
    Object.keys(st.days).forEach(function (k) {
      if ((fk && k < fk) || (tk && k > tk)) return;
      const d = st.days[k];
      if (!d || !d.n) return;
      out.n += d.n; out.ok += d.ok; out.t += d.t || 0; out.days++;
      Object.keys(d.u || {}).forEach(function (sid) {
        const b = out.byStage[sid] || (out.byStage[sid] = [0, 0]);
        b[0] += d.u[sid][0]; b[1] += d.u[sid][1];
      });
    });
    out.pct = out.n ? Math.round(out.ok / out.n * 100) : null;
    out.avgSec = out.n && out.t ? Math.round(out.t / out.n) : null;
    return out;
  }

  // kind: 'week' | 'month' | 'all'
  function range(kind, d) {
    d = d || now();
    const today = addDays(d, 0);
    if (kind === 'month') {
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const pf = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const pt = new Date(d.getFullYear(), d.getMonth(), 0);
      return { kind: kind, from: from, to: to, prevFrom: pf, prevTo: pt, label: (d.getMonth() + 1) + '月', prevName: '先月', daysTotal: to.getDate() };
    }
    if (kind === 'all') {
      return { kind: kind, from: null, to: null, prevFrom: null, prevTo: null, label: 'これまで', prevName: '', daysTotal: 0 };
    }
    const from = startOfWeek(today);
    const to = addDays(from, 6);
    return { kind: 'week', from: from, to: to, prevFrom: addDays(from, -7), prevTo: addDays(from, -1), label: mdLabel(from) + ' – ' + mdLabel(to), prevName: '先週', daysTotal: 7 };
  }

  function period(p, kind, d) {
    d = d || now();
    const r = range(kind, d);
    const cur = sumDays(p, r.from, r.to);
    const prev = r.prevFrom ? sumDays(p, r.prevFrom, r.prevTo) : null;
    const st = ensure(p);
    let dots = null;
    if (r.kind === 'week') {
      dots = [];
      for (let i = 0; i < 7; i++) {
        const k = dayKey(addDays(r.from, i));
        const dd = st.days[k];
        dots.push({ key: k, on: !!(dd && dd.n), future: k > dayKey(d) });
      }
    }
    return {
      kind: r.kind, label: r.label, prevName: r.prevName, from: r.from, to: r.to,
      n: cur.n, ok: cur.ok, pct: cur.pct, avgSec: cur.avgSec, days: cur.days,
      daysTotal: r.kind === 'all' ? cur.days : r.daysTotal, dots: dots,
      prev: prev ? { n: prev.n, ok: prev.ok, pct: prev.pct, avgSec: prev.avgSec, days: prev.days } : null,
      deltaN: prev && prev.n ? cur.n - prev.n : null,
      deltaPct: prev && prev.pct != null && cur.pct != null ? cur.pct - prev.pct : null,
      byStage: cur.byStage
    };
  }

  // 過去 count 日（古い → 今日）
  function daily(p, count, d) {
    d = d || now();
    const st = ensure(p);
    const out = [];
    for (let i = count - 1; i >= 0; i--) {
      const dd = addDays(d, -i);
      const k = dayKey(dd);
      const rec = st.days[k];
      out.push({ key: k, day: dd.getDate(), n: rec ? rec.n : 0, ok: rec ? rec.ok : 0, today: i === 0 });
    }
    return out;
  }

  // 過去 count 週（古い → 今週）。pct は その 週の 1回目 正答率
  function weekly(p, count, d) {
    d = d || now();
    const out = [];
    const thisFrom = startOfWeek(d);
    for (let i = count - 1; i >= 0; i--) {
      const from = addDays(thisFrom, -7 * i);
      const s = sumDays(p, from, addDays(from, 6));
      out.push({ from: from, label: mdLabel(from), n: s.n, ok: s.ok, pct: s.pct, current: i === 0 });
    }
    return out;
  }

  // 身に ついた 単元（85%〜・5問〜）の 数。asOf を わたすと その日までの 記録で
  function masteredCount(p, grade, asOf) {
    const ov = overview(p, grade);
    if (!asOf) return ov.areas.reduce(function (n, a) { return n + a.stages.filter(function (s) { return s.level === 'good'; }).length; }, 0);
    const s = sumDays(p, null, asOf);
    let n = 0;
    Object.keys(s.byStage).forEach(function (sid) {
      const b = s.byStage[sid];
      const f = MQ.content && MQ.content.findStage ? MQ.content.findStage(sid) : null;
      if (!f || !f.world || f.world.grade !== grade) return;
      if (b[1] >= FEW && Math.round(b[0] / b[1] * 100) >= GOOD) n++;
    });
    return n;
  }

  /* 成長：週ごとの 正答率（8週）・はじめと いま・身に ついた 単元・1問の 時間 */
  function growth(p, grade, d) {
    d = d || now();
    const weeks = weekly(p, 8, d);
    const withData = weeks.filter(function (w) { return w.pct != null; });
    const first = withData.length ? withData[0] : null;
    const last = withData.length ? withData[withData.length - 1] : null;
    const thisMonth = period(p, 'month', d);
    return {
      weeks: weeks, weeksWithData: withData.length,
      first: first, last: last,
      delta: first && last && first !== last ? last.pct - first.pct : null,
      masteredNow: masteredCount(p, grade),
      masteredPrev: masteredCount(p, grade, addDays(d, -30)),
      secNow: thisMonth.avgSec, secPrev: thisMonth.prev ? thisMonth.prev.avgSec : null
    };
  }

  /* 伸びた 単元：今週と 先週（それぞれ 5問〜）で 正答率が 上がった もの */
  function improved(p, grade, k, d) {
    d = d || now();
    const r = range('week', d);
    const cur = sumDays(p, r.from, r.to).byStage;
    const prev = sumDays(p, r.prevFrom, r.prevTo).byStage;
    const out = [];
    Object.keys(cur).forEach(function (sid) {
      const a = cur[sid], b = prev[sid];
      if (!b || a[1] < FEW || b[1] < FEW) return;
      const pn = Math.round(a[0] / a[1] * 100), pp = Math.round(b[0] / b[1] * 100);
      if (pn <= pp) return;
      const f = MQ.content && MQ.content.findStage ? MQ.content.findStage(sid) : null;
      if (!f || !f.world || f.world.grade !== grade) return;
      out.push({ id: sid, name: f.stage.name, areaName: f.area.name, pctNow: pn, pctPrev: pp, delta: pn - pp });
    });
    out.sort(function (x, y) { return y.delta - x.delta || y.pctNow - x.pctNow; });
    return out.slice(0, k || 2);
  }

  /* 先生用 レポートの もと（1週間）。notes は アプリからの 見立て */
  function report(p, grade, d) {
    d = d || now();
    const pr = period(p, 'week', d);
    const ov = overview(p, grade);
    const gr = growth(p, grade, d);
    const rows = [];
    ov.areas.forEach(function (a) { a.stages.forEach(function (s) { if (s.n) rows.push(s); }); });
    const notYet = ov.areas.map(function (a) { return { name: a.name, n: a.stages.filter(function (s) { return !s.n; }).length }; }).filter(function (x) { return x.n; });
    const wrong = [];
    rows.forEach(function (s) { s.wrong.forEach(function (w) { wrong.push({ stage: s.name, p: w.p, g: w.g, a: w.a, miss: w.miss || 1, ok: w.ok || 0, at: w.at }); }); });
    wrong.sort(byMiss);
    const notes = [];
    const weak = weakest(p, grade, 3);
    weak.forEach(function (s) {
      const u = s.units.filter(function (x) { return x.level === 'weak' || x.level === 'mid'; }).slice(0, 2).map(function (x) { return '「' + x.unit + '」'; });
      notes.push(s.name + 'は' + (u.length ? u.join('') + 'で' : '') + 'つまずいています（最近' + s.recentN + '問中 ' + s.recentOk + '問）。');
    });
    const good = rows.filter(function (s) { return s.level === 'good'; }).slice(0, 3).map(function (s) { return s.name; });
    if (good.length) notes.push(good.join('・') + 'は安定して身についています。');
    if (pr.n) notes.push('学習した日は週' + pr.days + '日。1日あたり約' + Math.round(pr.n / Math.max(1, pr.days)) + '問' + (pr.deltaN != null ? (pr.deltaN >= 0 ? '、先週より増えています。' : '、先週より減っています。') : '。'));
    return { period: pr, growth: gr, rows: rows, notYet: notYet, wrong: wrong.slice(0, 8), notes: notes, madeAt: d };
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
    record: record, measure: measure, countText: countText,
    period: period, daily: daily, weekly: weekly, growth: growth, improved: improved, report: report,
    masteredCount: masteredCount, sumDays: sumDays, range: range,
    dayKey: dayKey, addDays: addDays, mdLabel: mdLabel, now: now, setNow: function (d) { NOW = d || null; }, levelOf: levelOf, overview: overview, weakest: weakest,
    gradesWithData: gradesWithData, summaryText: summaryText, promptText: promptText,
    LEVEL_NAME: LEVEL_NAME, LEVEL_MARK: LEVEL_MARK,
    RECENT: RECENT, WRONG_MAX: WRONG_MAX, FEW: FEW, GOOD: GOOD, WEAK: WEAK, TOP_WEAK: TOP_WEAK
  };
})();
