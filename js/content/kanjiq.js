/* ---------------------------------------------------------
   かん字の 表から「よみ」と「かく」の 問題を 作る（v2.4）

   表の 1行：
     { k: '山', r: 'やま', w: ['出', '止', '工'], h: 'ヒント', n: '答え合わせの ひとこと', lv: 1, b: true }
       k … かん字（おくりがな つき OK。「大きい」「学校」）
       r … よみ（ひらがな）。同じ 学年の 中で かぶらない こと（かく問題の 文に なる）
       w … まちがい用の かん字 3つ（にた 形）。ないときは 表の ほかの 行から 自動
       d … まちがい用の よみ 3つ。ないときは 表の ほかの 行から 自動（同じ 長さを 先に）
       lv … 1〜3。ないときは 表の ならびで 前 40% が 1・つぎ 35% が 2・のこりが 3
       b … true で ボスの 問題

   作られる 問題（kokugo3.js と 同じ 形）：
     よみ：「山」の よみかたは？ → やま
     かく：「やま」を かん字で かくと？ → 山（world3.js の writeMixStage が「ゆびで 書く」問題も 作る）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.kanjiQ = (function () {
  const STEPS = [7, 13, 29, 41, 53, 67, 71, 83, 97, 101];

  // i 行目と ちがう 行から、決まった とびで n こ えらぶ（毎回 同じ ならびに なる）
  function others(table, i, field, n, avoid) {
    const N = table.length, out = [];
    function scan(sameLen) {
      for (let s = 0; s < STEPS.length && out.length < n; s++) {
        const e = table[(i + STEPS[s]) % N];
        const v = e[field];
        if (v === avoid || out.indexOf(v) !== -1) continue;
        if (sameLen && v.length !== avoid.length) continue;
        out.push(v);
      }
    }
    scan(true);
    scan(false);
    for (let j = 1; j < N && out.length < n; j++) {
      const v = table[(i + j) % N][field];
      if (v !== avoid && out.indexOf(v) === -1) out.push(v);
    }
    return out.slice(0, n);
  }

  function make(table, stageYomi, stageKaki) {
    const N = table.length, qs = [];
    table.forEach(function (e, i) {
      const lv = e.lv || (i < N * 0.4 ? 1 : i < N * 0.75 ? 2 : 3);
      const yomiD = (e.d && e.d.length >= 3) ? e.d.slice(0, 3) : others(table, i, 'r', 3, e.r);
      const kakiD = (e.w && e.w.length >= 3) ? e.w.slice(0, 3) : others(table, i, 'k', 3, e.k);
      const tail = e.n ? '。' + e.n : '。';
      const yq = { stage: stageYomi, lv: lv, unit: 'かん字の よみ', text: '「' + e.k + '」の よみかたは？', choices: [e.r].concat(yomiD), note: e.k + '（' + e.r + '）' + tail };
      const kq = { stage: stageKaki, lv: lv, unit: 'かん字を かく', text: '「' + e.r + '」を かん字で かくと？', choices: [e.k].concat(kakiD), note: e.r + ' → ' + e.k + tail };
      if (e.h) { yq.hint = e.h; kq.hint = e.hk || e.h; } else if (e.hk) { kq.hint = e.hk; }
      if (e.b) { yq.boss = true; kq.boss = true; }
      qs.push(yq, kq);
    });
    return qs;
  }

  // 表の 検査（smoke 用）：かん字と よみが かぶっていないか
  function validate(table) {
    const errs = [], ks = {}, rs = {};
    table.forEach(function (e, i) {
      if (!e.k || !e.r) errs.push('#' + i + ' k/r');
      if (ks[e.k]) errs.push('かん字 かぶり: ' + e.k); ks[e.k] = true;
      if (rs[e.r]) errs.push('よみ かぶり: ' + e.r); rs[e.r] = true;
      if (e.w && (e.w.length !== 3 || new Set(e.w.concat([e.k])).size !== 4)) errs.push('w: ' + e.k);
    });
    return errs;
  }

  return { make: make, others: others, validate: validate };
})();
