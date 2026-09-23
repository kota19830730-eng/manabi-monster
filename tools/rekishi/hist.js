const fs = require('fs'), vm = require('vm');
const dir = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const src = fs.readFileSync(dir + 'tools/smoke.js', 'utf8');
const head = src.slice(0, src.indexOf('const MQ = global.MQ;'));
global.require = require;
process.argv[2] = dir;
vm.runInNewContext(head, global);
const MQ = global.MQ;

// 理科・社会 の 全ステージで 図の わりあいを 数える
const worlds = [1, 2, 3, 4, 5, 6].map(function (g) { return MQ.content.worldForGrade(g); }).filter(Boolean);
const rows = [];
worlds.forEach(function (w) {
  (w.areas || []).forEach(function (a) {
    if (['rika', 'shakai', 'rikashakai'].indexOf(a.id) < 0) return;
    (a.stages || []).forEach(function (st) {
      if (!st.make) return;
      const seen = {}, fig = {};
      for (let i = 0; i < 60; i++) {
        let qs = [];
        try { qs = st.make(12, {}) || []; } catch (e) { }
        qs.forEach(function (q) {
          const t = String(q.text || q.prompt || '');
          const k = t.replace(/<[^>]*>/g, '');
          if (!seen[k]) seen[k] = (q.unit || '?');
          if (/<svg|<img|class="fig|figq/.test(t)) fig[k] = 1;
        });
      }
      const units = {};
      Object.keys(seen).forEach(function (k) {
        const u = seen[k];
        units[u] = units[u] || { n: 0, f: 0 };
        units[u].n++;
        if (fig[k]) units[u].f++;
      });
      Object.keys(units).forEach(function (u) {
        rows.push({ g: w.grade, stage: st.id, unit: u, n: units[u].n, f: units[u].f });
      });
    });
  });
});
rows.sort(function (a, b) { return (a.f / a.n) - (b.f / b.n); });
console.log('学年 ステージ 単元 問題の種類 図あり わりあい');
rows.forEach(function (r) {
  console.log('小' + r.g + ' ' + r.stage + ' ' + r.unit + ' ' + r.n + ' ' + r.f + ' ' + Math.round(r.f / r.n * 100) + '%');
});
