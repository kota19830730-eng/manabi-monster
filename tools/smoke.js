// Smoke test for まなびモンスター logic (no browser). Usage: node tools/smoke.js <path-to-app>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = process.argv[2] || '.';
let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('FAIL: ' + msg); } }

// ---- minimal browser shims ----
global.window = global;
global.localStorage = {
  _d: {},
  getItem(k) { return (k in this._d) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};
function fakeCtx() {
  return {
    fillRect() {}, clearRect() {}, drawImage() {}, setTransform() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    getImageData() { return { data: new Uint8ClampedArray(4) }; }, putImageData() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    fillText() {}, measureText() { return { width: 10 }; }
  };
}
function fakeEl() {
  return {
    style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} },
    getContext() { return fakeCtx(); },
    toDataURL() { return 'data:image/png;base64,x'; },
    addEventListener() {}, setAttribute() {}, appendChild() {},
    getBoundingClientRect() { return { width: 400, height: 200, left: 0, top: 0 }; },
    width: 0, height: 0
  };
}
global.document = { createElement() { return fakeEl(); }, addEventListener() {}, querySelectorAll() { return []; }, getElementById() { return null; }, documentElement: fakeEl() };
global.navigator = {};
global.location = { protocol: 'file:' };
global.setInterval = function () { return 0; };
global.clearInterval = function () {};

function load(rel) {
  const code = fs.readFileSync(path.join(base, rel), 'utf8');
  vm.runInThisContext(code, { filename: rel });
}
/* 読む じゅんばん：**教科の ファイルは index.html から そのまま 読みとる**（v5.0.1）。
   ここに 手で ならべると 本物と ずれて、アプリだけ 落ちる バグを 見のがす。
   （v4.9 で zu.js が rika4.js より 後に なって いて、テストは ぜんぶ 通るのに
     本物の アプリでは 小4の 理科・社会が 読みこみ時に 落ちて いた） */
const INDEX_HTML = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const CONTENT_ORDER = INDEX_HTML.split(String.fromCharCode(34)).filter(function (s) { return /^js.content.[a-z0-9]+[.]js$/.test(s); });
['js/core/guard.js', 'js/core/util.js', 'js/core/pixel.js', 'js/core/tiles.js', 'js/core/sfx.js', 'js/core/bgm.js',
 'js/core/save.js', 'js/core/stats.js', 'js/core/ai.js', 'js/core/handwrite.js', 'js/core/missions.js', 'js/core/fever.js', 'js/core/pals.js', 'js/core/streak.js', 'js/core/letter.js', 'js/core/speech.js', 'js/core/battle.js',
 'js/core/blocks.js'].concat(CONTENT_ORDER).forEach(load);

const MQ = global.MQ;
const TYPES = ['number', 'choice', 'divrem', 'roma', 'write', 'frac'];

/* =======================================================
   問題の 形が 正しいか
   ======================================================= */
function validate(q, where) {
  check(q && typeof q.prompt === 'string' && q.prompt.length > 0, where + ': prompt');
  check(typeof q.id === 'string' && q.id.length > 0, where + ': id');
  check(TYPES.indexOf(q.type) !== -1, where + ': type ' + q.type);
  if (q.type === 'number') {
    if (q.decimal) check(typeof q.answer === 'number' && q.answer >= 0 && Math.abs(q.answer * 1000 - Math.round(q.answer * 1000)) < 1e-9, where + ': decimal answer ' + JSON.stringify(q.answer) + ' ' + q.prompt);
    else check(Number.isInteger(q.answer) && q.answer >= 0, where + ': integer answer ' + JSON.stringify(q.answer) + ' ' + q.prompt);
    if (q.layout === 'vertical') check(q.a != null && q.b != null && q.sign, where + ': vertical fields');
  }
  if (q.type === 'choice') {
    check(Array.isArray(q.choices) && q.choices.length >= 2, where + ': choices >= 2');
    check(new Set(q.choices).size === q.choices.length, where + ': unique choices ' + JSON.stringify(q.choices));
    check(q.answer === 0, where + ': choice answer 0');
  }
  if (q.type === 'divrem') {
    check(q.answer.q * q.b + q.answer.r === q.a && q.answer.r < q.b && q.answer.r >= 1, where + ': divrem math ' + q.a + '/' + q.b);
  }
  if (q.type === 'frac') {   // 分数（v6.5）：分子・分母は 正の 整数、約分ずみ
    const n = q.answer && q.answer.n, d = q.answer && q.answer.d;
    check(Number.isInteger(n) && Number.isInteger(d) && n >= 1 && d >= 2, where + ': frac answer ' + JSON.stringify(q.answer));
    let a = n, b = d; while (b) { const t = a % b; a = b; b = t; }
    check(a === 1, where + ': frac は 約分ずみ ' + n + '/' + d);
  }
  if (q.type === 'roma') {
    check(typeof q.answer === 'string' && /^[a-z'-]+$/.test(q.answer), where + ': roma answer ' + q.answer);
    check(Array.isArray(q.accept) && q.accept.indexOf(q.answer) !== -1, where + ': roma accept contains answer');
  }
  if (q.type === 'write') {
    check(typeof q.answer === 'string' && q.answer.length > 0, where + ': write answer');
  }
}

let sansuCount = 0;
function levelsNonDecreasing(qs) {
  for (let i = 1; i < qs.length; i++) if ((qs[i].lv || 2) < (qs[i - 1].lv || 2)) return false;
  return true;
}
for (let s = 1; s <= 18; s++) {
  const st = MQ.sansu3.stages[s];
  check(!!st, 'sansu3 stage ' + s + ' が ある');
  if (!st) continue;
  ['easy', 'normal', 'hard', 'boss'].forEach(function (t) {
    check(Array.isArray(st[t]) && st[t].length >= 2, 'sansu' + s + ' の ' + t + ' が 2しゅるい いじょう: ' + (st[t] ? st[t].length : 0));
  });
  MQ.sansu3.make(s, 60).forEach(function (q, i) { validate(q, 'sansu' + s + '#' + i); check(typeof q.hint === 'string' && q.hint.length > 0, 'sansu' + s + '#' + i + ' hint'); sansuCount++; });
  MQ.sansu3.make(s, 5, { boss: true }).forEach(function (q, i) { validate(q, 'sansuboss' + s + '#' + i); check(q.lv === 3, 'sansuboss' + s + '#' + i + ' は lv3'); });
  // やさしい → ふつう → むずかしい の じゅんに 出る（12問なら 4/4/4）
  const twelve = MQ.sansu3.make(s, 12);
  const lvs = twelve.map(function (q) { return q.lv; });
  check(levelsNonDecreasing(twelve), 'sansu' + s + ' の むずかしさが じゅんばん: ' + lvs.join(''));
  check(lvs.filter(function (l) { return l === 1; }).length === 4 && lvs.filter(function (l) { return l === 3; }).length === 4, 'sansu' + s + ' は 4/4/4: ' + lvs.join(''));
  check(MQ.sansu3.make(s, 1, { lv: 2 })[0].lv === 2, 'sansu' + s + ' lv2 だけ');
  // 12問 かぶりなし（2学期の ステージも）
  for (let r = 0; r < 3; r++) {
    const ids = MQ.sansu3.make(s, 12).map(function (q) { return q.id; });
    check(new Set(ids).size === 12, 'sansu' + s + ' 12問 かぶりなし: ' + ids.filter(function (x, i) { return ids.indexOf(x) !== i; }).join(' | '));
  }
  // 問題の 種類が じゅうぶん（60問 作って 30種類 いじょう）
  const kinds = new Set(MQ.sansu3.make(s, 60).map(function (q) { return q.id; })).size;
  check(kinds >= 30, 'sansu' + s + ' 種類 ' + kinds);
}
// 2学期の 道具（v3.0）
(function () {
  const F = MQ.sansu3.figs3;
  check(F.kanjiNum(23500) === '二万三千五百' && F.kanjiNum(100000000) === '一億' && F.kanjiNum(10000000) === '千万' && F.kanjiNum(15000) === '一万五千' && F.kanjiNum(120500) === '十二万五百' && F.kanjiNum(250000000) === '二億五千万', 'kanjiNum: ' + [23500, 100000000, 10000000, 15000, 120500, 250000000].map(F.kanjiNum).join(' '));
  check(F.dialSvg(340).indexOf('<svg') >= 0 && F.circleSvg('radius', '4cm').indexOf('<circle') >= 0 && F.ballsSvg(3, '6cm', '？cm').split('<circle').length === 4 && F.lineSvg(10000, 10, 3, 5).indexOf('？') >= 0, '2学期の 図');
  // 小数の 問題は decimal つき・小数の 答え
  const s11 = MQ.sansu3.make(11, 60);
  check(s11.some(function (q) { return q.decimal && !Number.isInteger(q.answer); }), 'sansu11 に 小数の 答えが ある');
  check(s11.every(function (q) { return !q.decimal || (q.answer * 10) % 1 < 1e-9; }), 'sansu11 の 小数は 0.1 きざみ');
  // 3学期の 図（v6.3）
  check(F.triSvg('iso', ['5cm', '5cm', '3cm'], ['あ', 'い', 'う']).split('<text').length === 7 && F.anglesSvg(40, 50, 100, 30).split('<path').length === 3 && F.setSquareSvg(false).split('<polygon').length === 3 && F.circleTriSvg('4cm').indexOf('<polygon') >= 0 && F.tapeSvg(3, ['12cm', '4cm']).split('<rect').length === 3, '3学期の 図');
  // そろばん：5 いじょうは 五玉が はりに つく（赤）・一玉は d%5 こ
  const sb = F.sorobanSvg([0, 7, 3, 0], 3);
  check(sb.split('#D42A20').length - 1 === 1 + 2 + 3, 'そろばん 703 の 赤い 玉は 6こ: ' + (sb.split('#D42A20').length - 1));
  // ステージ 14〜18 の 中身
  const s14 = MQ.sansu3.make(14, 60);
  check(s14.every(function (q) { return q.prompt.indexOf('□') >= 0 || (q.choices || []).some(function (c) { return c.indexOf('□') >= 0; }); }), 'sansu14 は ぜんぶ □つき');
  check(s14.filter(function (q) { return q.type === 'choice'; }).length >= 8, 'sansu14 に 式を えらぶ 問題');
  const s15 = MQ.sansu3.make(15, 60);
  check(s15.filter(function (q) { return q.prompt.indexOf('<svg') >= 0; }).length >= 8, 'sansu15 に テープ図');
  const s16 = MQ.sansu3.make(16, 60).concat(MQ.sansu3.make(16, 8, { boss: true }));
  check(s16.filter(function (q) { return q.prompt.indexOf('<svg') >= 0; }).length >= 20, 'sansu16 は 図が 多い');
  s16.forEach(function (q) { if (q.type === 'choice' && q.choices.indexOf('二等辺三角形') >= 0 && q.choices.indexOf('正三角形') >= 0 && q.key && q.key.indexOf('sides:') === 0) {
    const s = q.key.slice(6).split(',').map(Number); const eq = new Set(s).size; const want = eq === 1 ? '正三角形' : eq === 2 ? '二等辺三角形' : 'どちらでも ない';
    check(q.choices[0] === want, 'sansu16 辺の 長さ → 名前: ' + q.key + ' → ' + q.choices[0]); } });
  const s17 = MQ.sansu3.make(17, 60).concat(MQ.sansu3.make(17, 8, { boss: true }));
  check(s17.some(function (q) { return q.layout === 'vertical' && q.b >= 10 && q.a >= 100; }), 'sansu17 に 3けた × 2けた の 筆算');
  s17.forEach(function (q) { if (q.layout === 'vertical') check(q.answer === q.a * q.b, 'sansu17 筆算の 答え ' + q.a + '×' + q.b); });
  const s18 = MQ.sansu3.make(18, 60).concat(MQ.sansu3.make(18, 8, { boss: true }));
  check(s18.filter(function (q) { return q.prompt.indexOf('<svg') >= 0; }).length >= 20, 'sansu18 は そろばんの 図が 多い');
  check(s18.some(function (q) { return q.decimal; }), 'sansu18 に 小数の そろばん');
  // そろばんを 読む 問題は 図の 玉と 答えが 合う（赤い 玉の 数 = 各けたの 五玉＋一玉）
  s18.forEach(function (q) { if (q.key && q.key.indexOf('sr:') === 0) {
    const n = q.answer; let beads = 0; String(n).split('').forEach(function (ch) { const d = +ch; beads += (d >= 5 ? 1 : 0) + d % 5; });
    check(q.prompt.split('#D42A20').length - 1 === beads, 'そろばん ' + n + ' の 玉: ' + (q.prompt.split('#D42A20').length - 1) + ' vs ' + beads); } });
  // 学期の おすすめ
  const Tm = MQ.terms;
  check(Tm.suggested(new Date(2026, 8, 1)) === 2 && Tm.suggested(new Date(2026, 3, 10)) === 1 && Tm.suggested(new Date(2027, 0, 10)) === 3 && Tm.suggested(new Date(2026, 7, 31)) === 1 && Tm.suggested(new Date(2026, 11, 20)) === 2, '学期の おすすめ');
})();
console.log('sansu generated ok: ' + sansuCount);

/* ---- 小1 さんすう（v2.2）：11ステージ・問題文は ひらがな・12問 かぶりなし ---- */
let sansu1Count = 0;
for (let s = 1; s <= 12; s++) {
  const st = MQ.sansu1.stages[s];
  check(!!st, 'sansu1 stage ' + s + ' が ある');
  if (!st) continue;
  ['easy', 'normal', 'hard', 'boss'].forEach(function (t) {
    check(Array.isArray(st[t]) && st[t].length >= 2, 'sansu1-' + s + ' の ' + t + ' が 2しゅるい いじょう: ' + (st[t] ? st[t].length : 0));
  });
  MQ.sansu1.make(s, 60).forEach(function (q, i) {
    validate(q, 'sansu1-' + s + '#' + i);
    check(typeof q.hint === 'string' && q.hint.length > 0, 'sansu1-' + s + '#' + i + ' hint');
    check(typeof q.note === 'string' && q.note.length > 0, 'sansu1-' + s + '#' + i + ' note');
    check(!/[一-龠]/.test(MQ.util.stripTags(q.prompt)), 'sansu1-' + s + '#' + i + ' の 問題文に かん字: ' + q.prompt);
    sansu1Count++;
  });
  MQ.sansu1.make(s, 5, { boss: true }).forEach(function (q, i) { validate(q, 'sansu1boss' + s + '#' + i); check(q.lv === 3, 'sansu1boss' + s + '#' + i + ' は lv3'); });
  const twelve = MQ.sansu1.make(s, 12);
  const lvs = twelve.map(function (q) { return q.lv; });
  check(levelsNonDecreasing(twelve), 'sansu1-' + s + ' の むずかしさが じゅんばん: ' + lvs.join(''));
  check(lvs.filter(function (l) { return l === 1; }).length === 4 && lvs.filter(function (l) { return l === 3; }).length === 4, 'sansu1-' + s + ' は 4/4/4: ' + lvs.join(''));
  check(new Set(twelve.map(function (q) { return q.id; })).size === 12, 'sansu1-' + s + ' の 12問は かぶらない');
  check(MQ.sansu1.make(s, 1, { lv: 2 })[0].lv === 2, 'sansu1-' + s + ' lv2 だけ');
}
console.log('sansu1 generated ok: ' + sansu1Count);

/* ---- 小2 さんすう（v2.3）：14ステージ・問題文は ひらがな＋小1の かん字だけ ---- */
/* 小1の かん字 80字。v8.3 で 中・田・八 を 足した（もともと 小1の 字なのに ぬけて いた） */
const G1_KANJI = /[中田八大小上下右左一二三四五六七八九十百千円人口目耳手足日月火水木金土山川子女男本字学校年生早正出入立休見音天雨花草虫犬玉王石竹糸貝車町村林森気力文名先夕空白赤青]/g;
function onlyG1Kanji(s) { return !/[一-龠]/.test(String(s).replace(G1_KANJI, '')); }
let sansu2Count = 0;
for (let s = 1; s <= 14; s++) {
  const st = MQ.sansu2.stages[s];
  check(!!st, 'sansu2 stage ' + s + ' が ある');
  if (!st) continue;
  ['easy', 'normal', 'hard', 'boss'].forEach(function (t) {
    check(Array.isArray(st[t]) && st[t].length >= 2, 'sansu2-' + s + ' の ' + t + ' が 2しゅるい いじょう: ' + (st[t] ? st[t].length : 0));
  });
  MQ.sansu2.make(s, 60).forEach(function (q, i) {
    validate(q, 'sansu2-' + s + '#' + i);
    check(typeof q.hint === 'string' && q.hint.length > 0, 'sansu2-' + s + '#' + i + ' hint');
    check(q.note != null && String(q.note).length > 0, 'sansu2-' + s + '#' + i + ' note');
    check(onlyG1Kanji(MQ.util.stripTags(q.prompt)), 'sansu2-' + s + '#' + i + ' の 問題文に 小2いじょうの かん字: ' + MQ.util.stripTags(q.prompt));
    sansu2Count++;
  });
  MQ.sansu2.make(s, 5, { boss: true }).forEach(function (q, i) { validate(q, 'sansu2boss' + s + '#' + i); check(q.lv === 3, 'sansu2boss' + s + '#' + i + ' は lv3'); });
  const twelve = MQ.sansu2.make(s, 12);
  const lvs = twelve.map(function (q) { return q.lv; });
  check(levelsNonDecreasing(twelve), 'sansu2-' + s + ' の むずかしさが じゅんばん: ' + lvs.join(''));
  check(lvs.filter(function (l) { return l === 1; }).length === 4 && lvs.filter(function (l) { return l === 3; }).length === 4, 'sansu2-' + s + ' は 4/4/4: ' + lvs.join(''));
  check(new Set(twelve.map(function (q) { return q.id; })).size === 12, 'sansu2-' + s + ' の 12問は かぶらない');
  check(MQ.sansu2.make(s, 1, { lv: 2 })[0].lv === 2, 'sansu2-' + s + ' lv2 だけ');
}
console.log('sansu2 generated ok: ' + sansu2Count);
check(MQ.sansu2.make(7, 30).some(function (q) { return q.prompt.indexOf('class="clock"') !== -1; }), '小2の とけいにも 絵が 出る');
check(MQ.sansu2.make(2, 12).some(function (q) { return q.layout === 'vertical'; }), '小2の ひっさんは たての ならび');
check(MQ.sansu2.make(9, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 10, '小2の かたちは ほぼ ぜんぶ 図つき');
(function () {
  const ids = new Set();
  for (let k = 0; k < 200; k++) { MQ.sansu2.make(9, 12).forEach(function (q) { ids.add(q.id); }); MQ.sansu2.make(9, 5, { boss: true }).forEach(function (q) { ids.add(q.id); }); }
  check(ids.size >= 50, '小2の かたちは 50しゅるい いじょう: ' + ids.size);
})();
check(MQ.sansu2.make(14, 12).some(function (q) { return q.prompt.indexOf('<svg') !== -1; }), '小2の ぶんすうに 図が 出る');

/* ---- 小4 算数（v4.4）：15ステージ ----
   問題文は 小3までの かん字（kakusu.js の 表）＋ 4年の 単元で つかう かん字だけ。
   四捨五入の「捨」と 展開図の「展」は 教科書の ことばなので 通す（prompt には ふりがな）。 */
const G4_EXTRA = '位億兆単辺以捨積量帯置展';
function badG4Kanji(s) {
  const bad = [];
  (String(s).match(/[一-龠]/g) || []).forEach(function (k) {
    if (!MQ.kakusu.upTo(k, 3) && G4_EXTRA.indexOf(k) < 0 && bad.indexOf(k) < 0) bad.push(k);
  });
  return bad;
}
let sansu4Count = 0;
for (let s = 1; s <= 15; s++) {
  const st = MQ.sansu4.stages[s];
  check(!!st, 'sansu4 stage ' + s + ' が ある');
  if (!st) continue;
  ['easy', 'normal', 'hard', 'boss'].forEach(function (t) {
    check(Array.isArray(st[t]) && st[t].length >= 3, 'sansu4-' + s + ' の ' + t + ' が 3しゅるい いじょう: ' + (st[t] ? st[t].length : 0));
  });
  MQ.sansu4.make(s, 60).forEach(function (q, i) {
    validate(q, 'sansu4-' + s + '#' + i);
    check(typeof q.hint === 'string' && q.hint.length > 0, 'sansu4-' + s + '#' + i + ' hint');
    check(q.note != null && String(q.note).length > 0, 'sansu4-' + s + '#' + i + ' note');
    const bad = badG4Kanji(MQ.util.stripTags(q.prompt) + (q.hint || '') + (q.note || '') + (q.unit || ''));
    check(bad.length === 0, 'sansu4-' + s + '#' + i + ' に むずかしい かん字 ' + bad.join('') + ': ' + MQ.util.stripTags(q.prompt));
    sansu4Count++;
  });
  MQ.sansu4.make(s, 5, { boss: true }).forEach(function (q, i) { validate(q, 'sansu4boss' + s + '#' + i); check(q.lv === 3, 'sansu4boss' + s + '#' + i + ' は lv3'); });
  const twelve4 = MQ.sansu4.make(s, 12);
  const lvs4 = twelve4.map(function (q) { return q.lv; });
  check(levelsNonDecreasing(twelve4), 'sansu4-' + s + ' の むずかしさが じゅんばん: ' + lvs4.join(''));
  check(lvs4.filter(function (l) { return l === 1; }).length === 4 && lvs4.filter(function (l) { return l === 3; }).length === 4, 'sansu4-' + s + ' は 4/4/4: ' + lvs4.join(''));
  check(new Set(twelve4.map(function (q) { return q.id; })).size === 12, 'sansu4-' + s + ' の 12問は かぶらない');
  check(MQ.sansu4.make(s, 1, { lv: 2 })[0].lv === 2, 'sansu4-' + s + ' lv2 だけ');
  // 1ステージ＝たたかい 2〜3回分（40〜60問）の 別問題が 出るか
  const ids4 = new Set();
  for (let k = 0; k < 60; k++) MQ.sansu4.make(s, 12).forEach(function (q) { ids4.add(q.id); });
  check(ids4.size >= 30, 'sansu4-' + s + ' は 30しゅるい いじょう: ' + ids4.size);
}
console.log('sansu4 generated ok: ' + sansu4Count);

/* ---- 小5 算数（v6.5）：18ステージ ----
   ことばは 小4までの かん字 ＋ 5年の 単元の かん字（G5_EXTRA）。6年・中学の 字（割・偶・奇・捨）は
   問題文では ふりがな、ヒント・note では そのまま（HTML が 使えない）ので 白リストに 入れて ある */
const G5_EXTRA = '比率均応仮容増減厚個割偶奇捨条展';
function badG5Kanji(s) {
  const bad = [];
  (String(s).match(/[一-龠]/g) || []).forEach(function (k) {
    if (!MQ.kakusu.upTo(k, 4) && G5_EXTRA.indexOf(k) < 0 && bad.indexOf(k) < 0) bad.push(k);
  });
  return bad;
}
let sansu5Count = 0;
for (let s = 1; s <= 18; s++) {
  const st = MQ.sansu5.stages[s];
  check(!!st, 'sansu5 stage ' + s + ' が ある');
  if (!st) continue;
  ['easy', 'normal', 'hard', 'boss'].forEach(function (t) { check(Array.isArray(st[t]) && st[t].length >= 3, 'sansu5-' + s + ' の ' + t + ' が 3しゅるい いじょう: ' + (st[t] ? st[t].length : 0)); });
  MQ.sansu5.make(s, 60).forEach(function (q, i) {
    validate(q, 'sansu5-' + s + '#' + i);
    check(typeof q.hint === 'string' && q.hint.length > 0, 'sansu5-' + s + '#' + i + ' hint');
    check(q.note != null && String(q.note).length > 0, 'sansu5-' + s + '#' + i + ' note');
    const bad = badG5Kanji(MQ.util.stripTags(q.prompt) + (q.hint || '') + (q.note || '') + (q.unit || '') + (q.choices || []).join(''));
    check(bad.length === 0, 'sansu5-' + s + '#' + i + ' に むずかしい かん字 ' + bad.join('') + ': ' + MQ.util.stripTags(q.prompt));
    if (q.type === 'choice') check(q.choices.every(function (c) { return c.indexOf('<') < 0; }), 'sansu5-' + s + '#' + i + ' の choices に HTML: ' + q.choices.join('|'));
    sansu5Count++;
  });
  MQ.sansu5.make(s, 5, { boss: true }).forEach(function (q, i) { validate(q, 'sansu5boss' + s + '#' + i); check(q.lv === 3, 'sansu5boss' + s + '#' + i + ' は lv3'); });
  const twelve5 = MQ.sansu5.make(s, 12);
  const lvs5 = twelve5.map(function (q) { return q.lv; });
  check(levelsNonDecreasing(twelve5), 'sansu5-' + s + ' の むずかしさが じゅんばん: ' + lvs5.join(''));
  check(lvs5.filter(function (l) { return l === 1; }).length === 4 && lvs5.filter(function (l) { return l === 3; }).length === 4, 'sansu5-' + s + ' は 4/4/4: ' + lvs5.join(''));
  check(new Set(twelve5.map(function (q) { return q.id; })).size === 12, 'sansu5-' + s + ' の 12問は かぶらない');
  check(MQ.sansu5.make(s, 1, { lv: 2 })[0].lv === 2, 'sansu5-' + s + ' lv2 だけ');
  const ids5 = new Set();
  for (let k = 0; k < 40; k++) MQ.sansu5.make(s, 12).forEach(function (q) { ids5.add(q.id); });
  check(ids5.size >= 45, 'sansu5-' + s + ' は 45しゅるい いじょう: ' + ids5.size);
}
console.log('sansu5 generated ok: ' + sansu5Count);
check(MQ.sansu5.make(9, 30).some(function (q) { return q.type === 'frac'; }) && MQ.sansu5.make(10, 30).every(function (q) { return q.type === 'frac'; }), '小5の 分数は 分子・分母の 入力（frac）');
check(MQ.sansu5.make(4, 30).some(function (q) { return q.layout === 'vertical' && q.decimal; }), '小5の 小数の かけ算に 筆算');
check(MQ.sansu5.make(14, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 4, '小5の 面積は 図つき');
check(MQ.sansu5.make(16, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 8, '小5の 帯グラフ・円グラフは 図つき');
check(MQ.sansu5.make(18, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 6, '小5の 角柱は 図つき');
// 分数の 答えの 検査（core）
(function () {
  const fq = { type: 'frac', answer: { n: 3, d: 4 } };
  check(MQ.battle.isCorrect(fq, { q: 3, r: 4 }) === true && MQ.battle.isCorrect(fq, { q: 6, r: 8 }) === false && MQ.battle.isCorrect(fq, null) === false, 'frac の 正解 判定');
  check(MQ.battle.answerText(fq) === '4分の3', 'frac の 答えの 文: ' + MQ.battle.answerText(fq));
})();
(function () {
  // 小4は いま 算数だけ。できない ミッション（かん字を 書く）を 出さない
  const p4 = { grade: 4, bag: [], escaped: {}, coins: 0, xp: 0 };
  MQ.content.setActive(MQ.content.world4);
  MQ.terms.forcePlayer(p4);
  check(MQ.missions.KINDS.filter(function (k) { return k.id === 'write'; })[0].ok(p4) === true, '小4にも かん字を 書く ミッションが 出る');
  for (let i = 0; i < 30; i++) {
    p4.missions = null; p4.missionDay = null;
    const ms = MQ.missions.generate(p4);
    ms.forEach(function (m) {
      const k = MQ.missions.KINDS.filter(function (x) { return x.id === m.id; })[0];
      check(!!k && (!k.ok || k.ok(p4)), '小4の ミッションが できる もの: ' + m.id);
    });
  }
  MQ.terms.forcePlayer(null);
  MQ.content.setActive(null);
})();
check(MQ.sansu4.make(2, 12).filter(function (q) { return q.prompt.indexOf('class="graph"') !== -1; }).length >= 7, '小4の おれ線グラフは ほとんど 図つき（きまりの 問題だけ 文字）');
/* 図と メモ欄は たて700の 端末（＝タブレット）で 両方 入らない（v4.4）。図の ある 問題は scratch:false。
   v5.6：小4だけ 見て いたので **小3の ぼうグラフ・球の 問題が すりぬけて いた**
   （実機の 写真で「問題が 見えない」と 分かった）。ぜんぶの 学年を しらべる。 */
(function () {
  const FIG = /figbox|class="graph"|class="figwide"|class="tbl"|class="clock"|<svg/;
  [['sansu1', 12], ['sansu2', 14], ['sansu3', 18], ['sansu4', 15], ['sansu5', 18]].forEach(function (pair) {
    const mod = MQ[pair[0]];
    for (let s = 1; s <= pair[1]; s++) {
      [mod.make(s, 40), mod.make(s, 6, { boss: true })].forEach(function (list) {
        list.forEach(function (q) {
          if (q.type !== 'choice' && FIG.test(q.prompt)) {
            check(q.scratch === false, pair[0] + '-' + s + ' 図の ある 問題に メモ欄が ある: ' + MQ.util.stripTags(q.prompt).slice(0, 30));
          }
        });
      });
    }
  });
})();
check(MQ.sansu4.make(4, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 3, '小4の 角に 図が 出る');
check(MQ.sansu4.make(7, 12).every(function (q) { return q.prompt.indexOf('class="tbl"') !== -1 || q.type === 'choice'; }), '小4の 整理の しかたは 表つき');
check(MQ.sansu4.make(8, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 6, '小4の 四角形は 図つき');
check(MQ.sansu4.make(11, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 3, '小4の 面積に 図が 出る');
check(MQ.sansu4.make(5, 30).some(function (q) { return q.decimal; }), '小4の 小数は 小数の こたえ');
check(MQ.sansu4.make(3, 30).some(function (q) { return q.type === 'divrem'; }), '小4の わり算に あまりの 問題が ある');
check(MQ.sansu4.make(14, 12).some(function (q) { return q.prompt.indexOf('class="tbl"') !== -1; }), '小4の かわり方に 表が 出る');

[['kokugo', MQ.kokugo3.questions], ['rikashakai', MQ.rikashakai3.questions], ['eigo', MQ.eigo3.questions], ['kokugo1', MQ.kokugo1.questions], ['kokugo2', MQ.kokugo2.questions], ['rika4', MQ.rika4.questions], ['shakai4', MQ.shakai4.questions], ['eigo4', MQ.eigo4.questions], ['rika5', MQ.rika5.questions], ['shakai5', MQ.shakai5.questions], ['eigo5', MQ.eigo5.questions]].forEach(function (pair) {
  const name = pair[0], list = pair[1];
  const perStage = {}, perLevel = {}, bossPer = {}, texts = {};
  list.forEach(function (q, i) {
    perStage[q.stage] = (perStage[q.stage] || 0) + 1;
    check(q.choices.length === 4 && new Set(q.choices).size === 4, name + '#' + i + ' choices: ' + q.text);
    check(typeof q.note === 'string' && q.note.length > 0, name + '#' + i + ' note');
    check(q.lv === 1 || q.lv === 2 || q.lv === 3, name + '#' + i + ' に lv（1〜3）が ない: ' + q.text);
    check(!texts[q.stage + q.text], name + ' 同じ 問題文が 2回: ' + q.text);
    texts[q.stage + q.text] = true;
    const key = q.stage + ':' + q.lv;
    perLevel[key] = (perLevel[key] || 0) + 1;
    if (q.boss || q.lv === 3) bossPer[q.stage] = (bossPer[q.stage] || 0) + 1;
  });
  Object.keys(perStage).forEach(function (s) {
    check(perStage[s] >= 30, name + ' stage ' + s + ' は 30問 いじょう: ' + perStage[s]);
    [1, 2, 3].forEach(function (l) { check((perLevel[s + ':' + l] || 0) >= 4, name + ' stage ' + s + ' の lv' + l + ' が 4問 いじょう: ' + (perLevel[s + ':' + l] || 0)); });
    check((bossPer[s] || 0) >= 4, name + ' stage ' + s + ' の ボス問題（boss か lv3）が 4問 いじょう: ' + (bossPer[s] || 0));
  });
  const lvSummary = Object.keys(perStage).map(function (s) { return s + '=' + [1, 2, 3].map(function (l) { return perLevel[s + ':' + l] || 0; }).join('/'); }).join(' ');
  console.log(name + ': ' + list.length + ' questions ' + JSON.stringify(perStage) + ' (lv1/2/3: ' + lvSummary + ')');
});

/* ---- 小1 こくご（v2.2）：問題文は ひらがな（かん字は 「」の 中だけ）。5ステージ ---- */
(function () {
  const kanji = /[一-龠]/;
  const perStage = {};
  MQ.kokugo1.questions.forEach(function (q, i) {
    perStage[q.stage] = (perStage[q.stage] || 0) + 1;
    const body = q.text.replace(/「[^」]*」/g, '').replace(/字/g, '');
    check(!kanji.test(body), 'kokugo1#' + i + ' の 問題文に かん字: ' + q.text);
    if (q.stage === 1 || q.stage === 2 || q.stage === 5) {
      q.choices.forEach(function (c) { check(!kanji.test(c), 'kokugo1#' + i + ' の えらぶ ことばに かん字: ' + c); });
    }
    if (q.stage === 4) check(/「[^」]+」を かん字で/.test(q.text), 'kokugo1#' + i + ' は「〜」を かん字で の 形: ' + q.text);
  });
  check(Object.keys(perStage).length === 5, 'kokugo1 は 5ステージ: ' + JSON.stringify(perStage));
})();

/* ---- 小2 こくご（v2.3）：問題文は ひらがな＋小1の かん字（かん字の 問題は 「」の 中だけ）。4ステージ ---- */
(function () {
  const perStage = {};
  MQ.kokugo2.questions.forEach(function (q, i) {
    perStage[q.stage] = (perStage[q.stage] || 0) + 1;
    const body = q.text.replace(/「[^」]*」/g, '');
    check(onlyG1Kanji(body), 'kokugo2#' + i + ' の 問題文に 小2いじょうの かん字: ' + q.text);
    if (q.stage === 3 || q.stage === 4) {
      q.choices.forEach(function (c) { check(onlyG1Kanji(c), 'kokugo2#' + i + ' の えらぶ ことばに かん字: ' + c); });
    }
    if (q.stage === 2) check(/「[^」]+」を かん字で/.test(q.text), 'kokugo2#' + i + ' は「〜」を かん字で の 形: ' + q.text);
  });
  check(Object.keys(perStage).length === 4, 'kokugo2 は 4ステージ: ' + JSON.stringify(perStage));
})();

/* ---- かん字の 表（v2.4）：小1 80字・小2 160字 ぜんぶ。よみ・かく の 両方 ---- */
check(MQ.kokugo1.kanji.length === 80, '小1の かん字は 80字: ' + MQ.kokugo1.kanji.length);
check(MQ.kokugo2.kanji.length === 160, '小2の かん字は 160字: ' + MQ.kokugo2.kanji.length);
[['kokugo1', MQ.kokugo1.kanji], ['kokugo2', MQ.kokugo2.kanji]].forEach(function (p) {
  const errs = MQ.kanjiQ.validate(p[1]);
  check(errs.length === 0, p[0] + ' の かん字の 表: ' + errs.join(' / '));
});
function stageCount(qs, s) { return qs.filter(function (q) { return q.stage === s; }).length; }
check(stageCount(MQ.kokugo1.questions, 3) === 80 && stageCount(MQ.kokugo1.questions, 4) === 80, '小1 かん字は よみ 80・かく 80');
check(stageCount(MQ.kokugo2.questions, 1) === 160 && stageCount(MQ.kokugo2.questions, 2) === 160, '小2 かん字は よみ 160・かく 160');
check(MQ.kokugo1.kotoba.length >= 140 && MQ.kokugo2.kotoba.length >= 100, 'ことばの 問題を ふやした: ' + MQ.kokugo1.kotoba.length + ' / ' + MQ.kokugo2.kotoba.length);

/* ---- 小4 こくご（v4.5）：かん字 219字 ＋ ことば ---- */
(function () {
  const K4 = MQ.kokugo4.kanji;
  const errs4 = MQ.kanjiQ.validate(K4);
  check(errs4.length === 0, 'kokugo4 の かん字の 表: ' + errs4.join(' / '));
  // 4年で 教える 字（小1〜3の 表に ない 字）が 219字
  const nw = new Set();
  K4.forEach(function (e) { (String(e.k).match(/[一-龠]/g) || []).forEach(function (c) { if (!MQ.kakusu.upTo(c, 3)) nw.add(c); }); });
  check(nw.size === 219, '小4の かん字は 219字: ' + nw.size);
  // どの 行にも 4年の 字が 入って いる（小1〜3の 字だけの 行は むだ）
  const nores = K4.filter(function (e) { return (String(e.k).match(/[一-龠]/g) || []).every(function (c) { return MQ.kakusu.upTo(c, 3); }); });
  check(nores.length === 0, '4年の 字が ない 行: ' + nores.map(function (e) { return e.k; }).join(' '));
  // ことばの 問題に 5年いじょうの かん字を つかわない（4年で ならう 字は OK）
  const okc = new Set(); K4.forEach(function (e) { (String(e.k).match(/[一-龠]/g) || []).forEach(function (c) { okc.add(c); }); });
  MQ.kokugo4.kotoba.forEach(function (q, i) {
    const t = q.text + (q.choices || []).join('') + (q.note || '') + (q.hint || '') + (q.unit || '');
    const bad = [];
    (t.match(/[一-龠]/g) || []).forEach(function (c) { if (!MQ.kakusu.upTo(c, 3) && !okc.has(c) && bad.indexOf(c) < 0) bad.push(c); });
    check(bad.length === 0, 'kokugo4 ことば#' + i + ' に むずかしい かん字 ' + bad.join('') + ': ' + q.text);
  });
  check(stageCount(MQ.kokugo4.questions, 1) === K4.length && stageCount(MQ.kokugo4.questions, 2) === K4.length, '小4 かん字は よみ・かく 各 ' + K4.length + '問');
  check(MQ.kokugo4.kotoba.length >= 70, '小4の ことばの 問題: ' + MQ.kokugo4.kotoba.length);
  // ステージごとに 30問いじょう・各 lv 4問いじょう・ボス候補 4問いじょう
  [1, 2, 3, 4].forEach(function (st) {
    const list = MQ.kokugo4.questions.filter(function (q) { return q.stage === st; });
    const lv = { 1: 0, 2: 0, 3: 0 };
    list.forEach(function (q) { lv[q.lv === 1 || q.lv === 3 ? q.lv : 2]++; });
    const boss = list.filter(function (q) { return q.boss || q.lv === 3; }).length;
    check(list.length >= 30, 'kokugo4-' + st + ' は 30問いじょう: ' + list.length);
    check(lv[1] >= 4 && lv[2] >= 4 && lv[3] >= 4, 'kokugo4-' + st + ' の lv: ' + lv[1] + '/' + lv[2] + '/' + lv[3]);
    check(boss >= 4, 'kokugo4-' + st + ' の ボス候補: ' + boss);
  });
  // ステージから 出して みる
  const w4k = MQ.content.world('g4').areas.filter(function (a) { return a.id === 'kokugo'; })[0];
  check(!!w4k && w4k.stages.length === 4, '小4の 国語の森は 4ステージ');
  MQ.terms.forcePlayer({ grade: 4, term: 0, units: {} });
  w4k.stages.forEach(function (st) {
    const twelve = st.make(12);
    check(twelve.length === 12, st.id + ' は 12問 出る: ' + twelve.length);
    twelve.forEach(function (q, i) { validate(q, st.id + '#' + i); });
    check(levelsNonDecreasing(twelve), st.id + ' の むずかしさが じゅんばん');
    st.make(5, { boss: true }).forEach(function (q, i) { validate(q, st.id + 'boss#' + i); check(q.lv === 3, st.id + 'boss#' + i + ' は lv3'); });
  });
  const writes = MQ.content.findStage('kokugo4-2').stage.make(12);
  check(writes.some(function (q) { return q.type === 'write'; }), 'kokugo4-2 に ゆびで 書く 問題が ある');
  MQ.terms.forcePlayer(null);
})();

/* ---- 小5 こくご（v6.6）：かん字 177字 ＋ ことば ---- */
(function () {
  const K5 = MQ.kokugo5.kanji;
  const errs5 = MQ.kanjiQ.validate(K5);
  check(errs5.length === 0, 'kokugo5 の かん字の 表: ' + errs5.join(' / '));
  const nw = new Set();
  K5.forEach(function (e) { (String(e.k).match(/[一-龠]/g) || []).forEach(function (c) { if (!MQ.kakusu.upTo(c, 4)) nw.add(c); }); });
  check(nw.size === 177, '小5の かん字は 177字: ' + nw.size);
  nw.forEach(function (c) { check(MQ.kakusu.gradeOf(c) === 5, '小5の かん字 ' + c + ' が kakusu の 表に ない（' + MQ.kakusu.gradeOf(c) + '）'); });
  const nores = K5.filter(function (e) { return (String(e.k).match(/[一-龠]/g) || []).every(function (c) { return MQ.kakusu.upTo(c, 4); }); });
  check(nores.length === 0, 'kokugo5 に 小4までの 字だけの 行: ' + nores.map(function (e) { return e.k; }).join(' '));
  // ことばの 文体：小4までの 字 ＋ 5年の 表の 字 ＋ 単元の 名前で つかう 字
  const okc = new Set(); K5.forEach(function (e) { (String(e.k).match(/[一-龠]/g) || []).forEach(function (c) { okc.add(c); }); });
  '敬語漢語外来複合語慣句故事熟類義対方言共通述修飾象形指事会意声推敲漁夫矛盾臨機応変温故知新絶体絶命異口同音縮鼻血殖植贈勤権利否認拝善了純簡'.split('').forEach(function (c) { okc.add(c); });
  MQ.kokugo5.kotoba.forEach(function (q, i) {
    const t = q.text + q.choices.join('') + (q.note || '') + (q.hint || '');
    const bad = [];
    (t.match(/[一-龠]/g) || []).forEach(function (c) { if (!MQ.kakusu.upTo(c, 5) && !okc.has(c) && bad.indexOf(c) < 0) bad.push(c); });
    check(bad.length === 0, 'kokugo5 ことば#' + i + ' に むずかしい かん字 ' + bad.join('') + ': ' + q.text);
    check(q.choices.length === 4 && new Set(q.choices).size === 4, 'kokugo5 ことば#' + i + ' の choices');
  });
  check(stageCount(MQ.kokugo5.questions, 1) === K5.length && stageCount(MQ.kokugo5.questions, 2) === K5.length, '小5 かん字は よみ・かく 各 ' + K5.length + '問');
  check(MQ.kokugo5.kotoba.length >= 90, '小5の ことばの 問題: ' + MQ.kokugo5.kotoba.length);
  [1, 2, 3, 4].forEach(function (st) {
    const list = MQ.kokugo5.questions.filter(function (q) { return q.stage === st; });
    const lv = { 1: 0, 2: 0, 3: 0 }; let boss = 0;
    list.forEach(function (q) { lv[q.lv || 2]++; if (q.boss || q.lv === 3) boss++; });
    check(list.length >= 30, 'kokugo5-' + st + ' は 30問いじょう: ' + list.length);
    check(lv[1] >= 4 && lv[2] >= 4 && lv[3] >= 4, 'kokugo5-' + st + ' の lv: ' + lv[1] + '/' + lv[2] + '/' + lv[3]);
    check(boss >= 4, 'kokugo5-' + st + ' の ボス候補: ' + boss);
  });
  const w5k = MQ.content.world('g5').areas.filter(function (a) { return a.id === 'kokugo'; })[0];
  check(!!w5k && w5k.stages.length === 4, '小5の 国語の森は 4ステージ');
  MQ.terms.forcePlayer({ grade: 5, term: 0, units: {} });
  MQ.content.setActive(MQ.content.world('g5'));
  w5k.stages.forEach(function (st) {
    for (let r = 0; r < 3; r++) {
      const twelve = st.make(12);
      check(twelve.length === 12 && new Set(twelve.map(function (q) { return q.id; })).size === 12, st.id + ' 12問 かぶりなし');
      twelve.forEach(function (q, i) { validate(q, st.id + '#' + i); });
      check(levelsNonDecreasing(twelve), st.id + ' の むずかしさが じゅんばん');
    }
    st.make(5, { boss: true }).forEach(function (q, i) { check(q.lv === 3, st.id + 'boss#' + i + ' は lv3'); });
  });
  const writes5 = MQ.content.findStage('kokugo5-2').stage.make(12);
  check(writes5.some(function (q) { return q.type === 'write'; }), 'kokugo5-2 に ゆびで 書く 問題が ある');
  MQ.content.setActive(null);
  MQ.terms.forcePlayer(null);
})();

/* ---- 小5 理科・社会（v6.7）：各4ステージ。かん字は 小5まで ＋ 地名などの 白リスト ---- */
(function () {
  const OK5 = '緯与那択捉尖閣笠原丹舞驒曽濃狩琵琶霞浦瀬嬬恋銚釧俣排済域乳衛条尾津畿浜';   // 地名・教科書の ことば（ふりがな つきで 出る 字）
  function badKanji5(s) { const bad = []; (String(s).match(/[一-龠]/g) || []).forEach(function (k) { if (!MQ.kakusu.upTo(k, 5) && OK5.indexOf(k) < 0 && bad.indexOf(k) < 0) bad.push(k); }); return bad; }
  [['rika5', MQ.rika5.questions], ['shakai5', MQ.shakai5.questions]].forEach(function (pair) {
    const name = pair[0], list = pair[1];
    const seen = new Set();
    list.forEach(function (q, i) {
      const t = q.text + q.choices.join('') + (q.note || '') + (q.hint || '') + (q.unit || '');
      const bad = badKanji5(t);
      check(bad.length === 0, name + '#' + i + ' に 6年いじょうの かん字 ' + bad.join('') + ': ' + q.text);
      check(q.unit.indexOf('／') > 0, name + '#' + i + ' の unit');
      check(q.choices.length === 4 && new Set(q.choices).size === 4, name + '#' + i + ' の choices');
      check(!seen.has(q.text), name + '#' + i + ' 同じ 問題文: ' + q.text); seen.add(q.text);
    });
  });
  // 英語（v6.8）は 英文が 入る ので かん字だけ 見る
  MQ.eigo5.questions.forEach(function (q, i) {
    const bad = badKanji5(q.text + q.choices.join('') + (q.note || '') + (q.unit || ''));
    check(bad.length === 0, 'eigo5#' + i + ' に 6年いじょうの かん字 ' + bad.join('') + ': ' + q.text);
    check(q.choices.length === 4 && new Set(q.choices).size === 4, 'eigo5#' + i + ' の choices');
  });
  check(MQ.eigo5.questions.filter(function (q) { return /"[^"]+"/.test(q.text); }).length >= 100, '小5 英語の 問題文に 英文（きく ボタン用）: ' + MQ.eigo5.questions.filter(function (q) { return /"[^"]+"/.test(q.text); }).length);
  const w5 = MQ.content.world('g5');
  const eigo5Area = w5.areas.filter(function (a) { return a.id === 'eigo'; })[0];
  check(!!eigo5Area && eigo5Area.stages.length === 4, '小5の 英語の空は 4ステージ');
  const rika5Area = w5.areas.filter(function (a) { return a.id === 'rika'; })[0];
  const shakai5Area = w5.areas.filter(function (a) { return a.id === 'shakai'; })[0];
  check(!!rika5Area && rika5Area.stages.length === 4, '小5の 理科の 湖は 4ステージ');
  check(!!shakai5Area && shakai5Area.stages.length === 4, '小5の 社会の 町は 4ステージ');
  MQ.terms.forcePlayer({ grade: 5, term: 0, units: {} });
  MQ.content.setActive(w5);
  [rika5Area, shakai5Area, eigo5Area].forEach(function (area) {
    area.stages.forEach(function (st) {
      for (let r = 0; r < 3; r++) {
        const twelve = st.make(12);
        check(twelve.length === 12 && new Set(twelve.map(function (q) { return q.id; })).size === 12, st.id + ' 12問 かぶりなし');
        twelve.forEach(function (q, i) { validate(q, st.id + '#' + i); });
        check(levelsNonDecreasing(twelve), st.id + ' の むずかしさが じゅんばん');
      }
      st.make(5, { boss: true }).forEach(function (q, i) { check(q.lv === 3, st.id + 'boss#' + i + ' は lv3'); });
      check(st.pool({ grade: 5, term: 0, units: {} }) >= 30, st.id + ' の 出せる 問題: ' + st.pool({ grade: 5, term: 0, units: {} }));
    });
  });
  MQ.content.setActive(null);
  MQ.terms.forcePlayer(null);
})();

/* ---- 小4 理科・社会（v4.6）：べつべつの エリア 各4ステージ ----
   問題文の かん字は 小1〜小4 の 字だけ（kakusu.js の 表で 見る）。
   「災」「防」「震」「警」などは 5年いじょうなので ひらがなで 書く。 */
(function () {
  function badKanji(s) {
    const bad = [];
    (String(s).match(/[一-龠]/g) || []).forEach(function (k) {
      if (!MQ.kakusu.upTo(k, 4) && bad.indexOf(k) < 0) bad.push(k);
    });
    return bad;
  }
  [['rika4', MQ.rika4.questions], ['shakai4', MQ.shakai4.questions]].forEach(function (pair) {
    const name = pair[0], list = pair[1];
    list.forEach(function (q, i) {
      const t = q.text + q.choices.join('') + (q.note || '') + (q.hint || '') + (q.unit || '');
      const bad = badKanji(t);
      check(bad.length === 0, name + '#' + i + ' に 5年いじょうの かん字 ' + bad.join('') + ': ' + q.text);
      check(!/[A-Za-z]{3,}/.test(MQ.util.stripTags(t).replace(/km|cm|mm/g, '')), name + '#' + i + ' に 英語が まざって いる: ' + q.text);
      check(q.unit.indexOf('／') > 0, name + '#' + i + ' の unit');
    });
  });
  // 英語（v4.7）は 英文が 入る ので かん字だけ 見る
  MQ.eigo4.questions.forEach(function (q, i) {
    const bad = badKanji(q.text + q.choices.join('') + (q.note || '') + (q.unit || ''));
    check(bad.length === 0, 'eigo4#' + i + ' に 5年いじょうの かん字 ' + bad.join('') + ': ' + q.text);
  });
  const w4 = MQ.content.world('g4');
  const rikaArea = w4.areas.filter(function (a) { return a.id === 'rika'; })[0];
  const shakaiArea = w4.areas.filter(function (a) { return a.id === 'shakai'; })[0];
  const eigoArea = w4.areas.filter(function (a) { return a.id === 'eigo'; })[0];
  check(!!eigoArea && eigoArea.stages.length === 4, '小4の 英語の空は 4ステージ');
  check(!!rikaArea && rikaArea.stages.length === 4, '小4の 理科の 山は 4ステージ');
  check(!!shakaiArea && shakaiArea.stages.length === 4, '小4の 社会の 町は 4ステージ');
  MQ.terms.forcePlayer({ grade: 4, term: 0, units: {} });
  [rikaArea, shakaiArea, eigoArea].forEach(function (area) {
    area.stages.forEach(function (st) {
      for (let r = 0; r < 3; r++) {
        const twelve = st.make(12);
        check(twelve.length === 12, st.id + ' は 12問 出る: ' + twelve.length);
        const ids = twelve.map(function (q) { return q.id; });
        check(new Set(ids).size === 12, st.id + ' 12問 かぶりなし');
        twelve.forEach(function (q, i) { validate(q, st.id + '#' + i); });
        check(levelsNonDecreasing(twelve), st.id + ' の むずかしさが じゅんばん');
      }
      st.make(5, { boss: true }).forEach(function (q, i) { check(q.lv === 3, st.id + 'boss#' + i + ' は lv3'); });
      check(st.pool({ grade: 4, term: 0, units: {} }) >= 30, st.id + ' の 出せる 問題: ' + st.pool({ grade: 4, term: 0, units: {} }));
    });
  });
  MQ.terms.forcePlayer(null);
  // 学期（1学期に すると 2学期・3学期の ステージは 出ない）
  const p1 = { grade: 4, playGrade: 4, term: 1, units: {} };
  MQ.terms.forcePlayer(p1);
  check(MQ.content.isAvailable(rikaArea.stages[0]) && MQ.content.isAvailable(rikaArea.stages[1]), '1学期: 理科1・2は 開く');
  check(!MQ.content.isAvailable(rikaArea.stages[2]) && !MQ.content.isAvailable(rikaArea.stages[3]), '1学期: 理科3・4は まだ');
  check(!MQ.content.isAvailable(shakaiArea.stages[2]), '1学期: 社会3は まだ');
  check(MQ.content.lockedReason(rikaArea.stages[2]) === '2学期から', '理科3の りゆう: ' + MQ.content.lockedReason(rikaArea.stages[2]));
  MQ.terms.forcePlayer(null);
  // モンスター（ザコは 理社の 顔ぶれ・ボスは 理科＝メカナイト／社会＝グランドタイタン）
  check(MQ.enemies.pickIds('rika', 12, 0.5).length === 12, '理科の 顔ぶれが 12体');
  check(MQ.enemies.pickIds('shakai', 12, 0.5).length === 12, '社会の 顔ぶれが 12体');
  check(MQ.enemies.bossFor('rika').id === 'boss-knight', '理科の ボスは メカナイト');
  check(MQ.enemies.bossFor('shakai').id === 'boss-titan', '社会の ボスは グランドタイタン');
  check(MQ.enemies.bossFor('eigo').id === 'boss-slime', '英語の ボスは キングスライム');
  console.log('rika4: ' + MQ.rika4.questions.length + ' / shakai4: ' + MQ.shakai4.questions.length + ' / eigo4: ' + MQ.eigo4.questions.length + ' questions');
})();

/* ---- ローマ字 ---- */
check(MQ.romaji3.kunrei('さくら') === 'sakura', 'kunrei sakura');
check(MQ.romaji3.kunrei('きって') === 'kitte', 'kunrei kitte（小さい っ）');
check(MQ.romaji3.kunrei('しんぶん') === 'sinbun', 'kunrei sinbun（ん は n）');
check(MQ.romaji3.kunrei('でんしゃ') === 'densya', 'kunrei densya');
check(MQ.romaji3.spellings('しんぶん').indexOf('shinbun') >= 0, 'ヘボン式 shinbun も 正解');
check(MQ.romaji3.spellings('つくえ').indexOf('tsukue') >= 0, 'ヘボン式 tsukue も 正解');
check(MQ.romaji3.spellings('しんぶん').indexOf('shimbun') === -1, 'm の しんぶん は 不正解（IMEで 変かんできない）');
check(MQ.romaji3.count() >= 60, 'ローマ字 60問以上: ' + MQ.romaji3.count());
// 「えらぶ」の まちがい選たくしに、正解に なる 書き方が まざっていない
MQ.romaji3.chooseItems.forEach(function (it) {
  const ok = MQ.romaji3.spellings(it.kana);
  it.wrong.forEach(function (w) { check(ok.indexOf(w) === -1, 'ローマ字「' + it.kana + '」の まちがい「' + w + '」は 正解に なってしまう'); });
  check(it.wrong.length === 3 && new Set(it.wrong.concat([MQ.romaji3.kunrei(it.kana)])).size === 4, 'ローマ字「' + it.kana + '」の 選たくし');
});
// 「うつ」問題に のばす音・「ん＋母音／や行／な行」が ない
MQ.romaji3.typeWords.filter(function (w) { return !w.skip; }).forEach(function (w) {
  check(!/[ぁ-ん]う$|おう|こう|そう|とう|のう|ほう|もう|よう|ろう|ごう|ぞう|どう|ぼう|ぽう|ゅう|ょう|ええ|えい$/.test(w.kana) || /^(とけい)$/.test(w.kana) || w.kana === 'えんぴつ', 'うつ問題「' + w.kana + '」に のばす音が ある');
  check(!/ん[あいうえおやゆよなにぬねの]/.test(w.kana), 'うつ問題「' + w.kana + '」は ん の あとが 分けにくい');
});
// やさしい → むずかしい の じゅん
const romaTwelve = MQ.romaji3.make(12, {});
check(levelsNonDecreasing(romaTwelve) && romaTwelve[0].lv === 1 && romaTwelve[11].lv === 3, 'ローマ字の むずかしさが じゅんばん: ' + romaTwelve.map(function (q) { return q.lv; }).join(''));
MQ.romaji3.make(5, { boss: true }).forEach(function (q, i) { check(q.type === 'roma' && q.lv === 3, 'ローマ字の ボスは うつ問題 #' + i); });
console.log('romaji: ' + MQ.romaji3.count() + ' questions');

/* ---- ワールド・ステージ ---- */
const w3 = MQ.content.world('g3');
const w1 = MQ.content.world('g1');
const w2 = MQ.content.world('g2');
const w4 = MQ.content.world('g4');
let writeSeen = false, romaSeen = false;
function checkWorldStages(wld) { wld.areas.forEach(function (area) {
  area.stages.forEach(function (st) {
    if (!st.available) return;
    const qs = st.make(8, { boss: false });
    check(qs.length === 8, st.id + ' make 8, got ' + qs.length);
    qs.forEach(function (q, i) {
      validate(q, st.id + '#' + i);
      if (q.type === 'write') writeSeen = true;
      if (q.type === 'roma') romaSeen = true;
    });
    validate(st.make(1, { boss: true })[0], st.id + ' boss');
    // むずかしさ：12問が やさしい → むずかしい の じゅんで、ボスは lv3、たからばこ用（lv2）も 出せる
    if (!st.tower) {
      const tw = st.make(12, { boss: false });
      const lvs = tw.map(function (q) { return q.lv; });
      check(tw.length === 12 && levelsNonDecreasing(tw), st.id + ' の むずかしさが じゅんばん: ' + lvs.join(''));
      check(lvs[0] === 1 && lvs[11] === 3, st.id + ' は やさしい で はじまり むずかしい で おわる: ' + lvs.join(''));
      const ids = tw.map(function (q) { return q.id; });
      check(new Set(ids).size >= 11, st.id + ' の 12問は ほぼ かぶらない: ' + new Set(ids).size);
      for (let b = 0; b < 5; b++) { const bq = st.make(1, { boss: true })[0]; check(bq.lv === 3, st.id + ' の ボス問題は lv3'); }
      const ch = st.make(1, { boss: false, lv: 2 })[0];
      validate(ch, st.id + ' chest');
      check(ch.lv === 2, st.id + ' の たからばこ問題は lv2: ' + ch.lv);
    }
  });
}); }
checkWorldStages(w3);
checkWorldStages(w1);
checkWorldStages(w2);
check(w2.areas.length === 3 && w2.areas[0].stages.length === 14 && w2.areas[1].stages.length === 4 && w2.areas[2].id === 'tower', '小2は さんすう14＋こくご4＋とう');
check(w2.areas[1].stages[1].make(8, {}).some(function (q) { return q.type === 'write' && q.prompt.indexOf('かこう') !== -1; }), '小2の かん字を かく問題も ひらがなの 言いかた');
check(w1.areas.length === 3 && w1.areas[0].stages.length === 12 && w1.areas[1].stages.length === 5 && w1.areas[2].id === 'tower', '小1は さんすう12＋こくご5＋とう');
// とけいの 絵：はりの むきが 正しい（8じ47ふん → みじかい はり 263.5度・ながい はり 282度）
(function () {
  const q = MQ.sansu1.make(12, 20).filter(function (x) { return x.prompt.indexOf('class="clock"') !== -1; })[0];
  check(!!q, 'なんじ なんぷんに とけいの 絵が 出る');
  const p8 = MQ.sansu1.make(8, 20).filter(function (x) { return x.prompt.indexOf('class="clock"') !== -1; }).length;
  check(p8 >= 18, 'なんじ なんじはんは ほぼ ぜんぶ とけいの 絵つき: ' + p8);
  const html = MQ.sansu1.make(12, 1, { lv: 2 })[0].prompt;
  check(/clock__hand--h" style="transform:rotate\([0-9.]+deg\)/.test(html) && /clock__num/.test(html) && (html.match(/class="clock__tick/g) || []).length === 60, 'とけいの 絵の 部品（はり2本・数字・目もり60）');
})();
check(w1.areas[1].stages[3].make(8, {}).some(function (q) { return q.type === 'write' && q.prompt.indexOf('かこう') !== -1; }), '小1の かん字を かく問題は ひらがなの 言いかた');
check(writeSeen, 'かん字を ゆびで 書く問題が 出る');
check(romaSeen, 'ローマ字を うつ問題が 出る');

// さいごの塔は 5教科が じゅんばんに 出る
const tower = MQ.content.findStage('tower3').stage;
const towerQs = [];
for (let i = 0; i < 5; i++) towerQs.push(tower.make(1, { boss: true, index: i })[0]);
towerQs.forEach(function (q, i) { validate(q, 'tower#' + i); });
const kinds = towerQs.map(function (q) { return q.id.split(':')[1]; });
check(JSON.stringify(kinds) === JSON.stringify(['sansu', 'kokugo', 'romaji', 'rika', 'eigo']),
  'ラスボスは 算数→国語→ローマ字→理社→英語: ' + kinds.join(','));

/* ---- 小4の さいごの塔（v4.8）---- */
(function () {
  const w4 = MQ.content.world('g4');
  const area = w4.areas.filter(function (a) { return a.id === 'tower'; })[0];
  check(!!area && area.stages.length === 1, '小4に さいごの塔の エリアが ある');
  const st4 = area.stages[0];
  check(st4.id === 'tower4' && st4.tower === true, '小4の 塔は tower4');
  check(st4.bossId === 'boss-dark', '小4の ラスボスは ダークロード: ' + st4.bossId);
  check(MQ.content.towerStage.bossId === 'boss-maou', '小3の ラスボスは まおう');
  MQ.terms.forcePlayer({ grade: 4, term: 0, units: {} });
  MQ.content.setActive(w4);
  const qs = [];
  for (let i = 0; i < 5; i++) qs.push(st4.make(1, { boss: true, index: i })[0]);
  qs.forEach(function (q, i) { validate(q, 'tower4#' + i); check(q.lv === 3, 'tower4#' + i + ' は lv3'); });
  const k4 = qs.map(function (q) { return q.id.split(':')[1]; });
  check(JSON.stringify(k4) === JSON.stringify(['sansu', 'kokugo', 'rika', 'shakai', 'eigo']),
    '小4の 塔は 算数→国語→理科→社会→英語: ' + k4.join(','));
  check(st4.make(8, { boss: true }).length === 8, '小4の 塔は 8問 出る');
  // ローマ字は 小4には ない
  check(st4.make(20, { boss: true }).every(function (q) { return q.type !== 'roma'; }), '小4の 塔に ローマ字は 出ない');
  // ラスボスの 名前（画面の 文字は ここを 見る）
  check(MQ.content.lastBoss().name === 'ダークロード' && MQ.content.towerStageId() === 'tower4', '小4の lastBoss: ' + MQ.content.lastBoss().name);
  // かけらは 5つ ひつよう（小4は 5教科）
  const p5 = { grade: 4, playGrade: 4, frags: {} };
  check(MQ.content.towerOpen(p5) === false, 'かけらが ないと 小4の 塔は 開かない');
  ['sansu', 'kokugo', 'rika', 'shakai'].forEach(function (id) { p5.frags[MQ.content.fragKey(id, p5)] = true; });
  check(MQ.content.towerOpen(p5) === false, 'かけら 4つでは 小4の 塔は まだ 開かない');
  p5.frags[MQ.content.fragKey('eigo', p5)] = true;
  check(MQ.content.towerOpen(p5) === true, 'かけら 5つで 小4の 塔が 開く');
  MQ.content.setActive(MQ.content.world3);
  check(MQ.content.lastBoss().name === 'まおう' && MQ.content.towerStageId() === 'tower3', '小3の lastBoss: ' + MQ.content.lastBoss().name);
  MQ.content.setActive(null);
  MQ.terms.forcePlayer(null);
  check(!!MQ.treasure.forStage('tower4'), '小4の 塔の たからもの');
  check(MQ.enemies.get('boss-dark').shape === 'dark' && !!MQ.monsterArt.mons.dark, 'ダークロードの 絵');
})();

/* ---- 小1・小2の さいごの とう（v6.4） ---- */
[[1, 'boss-obake', 'おばけキング', 'obakeking', MQ.content.world('g1')], [2, 'boss-kaizoku', 'かいぞくキャプテン', 'kaizoku', MQ.content.world('g2')]].forEach(function (row) {
  const g = row[0], w = row[4];
  const area = w.areas.filter(function (a) { return a.id === 'tower'; })[0];
  check(!!area && area.stages.length === 1 && area.name === 'さいごの とう', '小' + g + 'に さいごの とう が ある（ひらがな）');
  const st = area.stages[0];
  check(st.id === 'tower' + g && st.tower === true && st.bossId === row[1] && st.name === 'さいごの とう', '小' + g + 'の 塔: ' + st.id + ' ' + st.bossId + ' ' + st.name);
  MQ.terms.forcePlayer({ grade: g, term: 0, units: {} });
  MQ.content.setActive(w);
  const qs = [];
  for (let i = 0; i < 4; i++) qs.push(st.make(1, { boss: true, index: i })[0]);
  qs.forEach(function (q, i) { validate(q, 'tower' + g + '#' + i); check(q.lv === 3, 'tower' + g + '#' + i + ' は lv3'); });
  const kinds = qs.map(function (q) { return q.id.split(':')[1]; });
  check(JSON.stringify(kinds) === JSON.stringify(['sansu', 'kokugo', 'sansu', 'kokugo']), '小' + g + 'の 塔は さんすう→こくご→さんすう→こくご: ' + kinds.join(','));
  check(st.make(8, { boss: true }).length === 8, '小' + g + 'の 塔は 8問 出る');
  // 問題文は ひらがな中心（小1は かん字なし・小2は 小1の かん字まで）＝ ふつうの ステージと 同じ きまり
  st.make(20, { boss: true }).forEach(function (q) { check(q.unit.indexOf('さいごの もんだい') === 0, '小' + g + 'の 塔の unit: ' + q.unit); });
  check(MQ.content.lastBoss().name === row[2] && MQ.content.towerStageId() === 'tower' + g && MQ.content.towerName() === 'さいごの とう', '小' + g + 'の lastBoss: ' + MQ.content.lastBoss().name);
  // かけらは 2つ（2教科）
  const p = { grade: g, playGrade: g, frags: {} };
  check(MQ.content.towerOpen(p) === false, 'かけらが ないと 小' + g + 'の 塔は 開かない');
  p.frags[MQ.content.fragKey('sansu', p)] = true;
  check(MQ.content.towerOpen(p) === false, 'かけら 1つでは 小' + g + 'の 塔は まだ');
  p.frags[MQ.content.fragKey('kokugo', p)] = true;
  check(MQ.content.towerOpen(p) === true, 'かけら 2つで 小' + g + 'の 塔が 開く');
  MQ.content.setActive(null);
  MQ.terms.forcePlayer(null);
  check(!!MQ.treasure.forStage('tower' + g), '小' + g + 'の 塔の たからもの');
  const e = MQ.enemies.get(row[1]);
  check(!!e && e.last === true && e.shape === row[3] && !!e.phase2 && !!MQ.monsterArt.mons[row[3]], row[2] + 'の データと 絵');
  check(/^[ぁ-んァ-ヶー]+$/.test(e.name), row[2] + ' の 名前は ひらがな・カタカナだけ');
});
check(MQ.hero.titles.some(function (t) { return t.id === 't-obake'; }) && MQ.hero.titles.some(function (t) { return t.id === 't-kaizoku'; }), 'しょうごう おばけ・うみの ゆうしゃ');

/* ---- 小5の さいごの塔（v6.9） ---- */
(function () {
  const w5 = MQ.content.world('g5');
  const area = w5.areas.filter(function (a) { return a.id === 'tower'; })[0];
  check(!!area && area.stages.length === 1, '小5に さいごの塔の エリアが ある');
  const st5 = area.stages[0];
  check(st5.id === 'tower5' && st5.tower === true && st5.bossId === 'boss-blizzard', '小5の 塔: ' + st5.id + ' ' + st5.bossId);
  MQ.terms.forcePlayer({ grade: 5, term: 0, units: {} });
  MQ.content.setActive(w5);
  const qs = [];
  for (let i = 0; i < 5; i++) qs.push(st5.make(1, { boss: true, index: i })[0]);
  qs.forEach(function (q, i) { validate(q, 'tower5#' + i); check(q.lv === 3, 'tower5#' + i + ' は lv3'); });
  check(JSON.stringify(qs.map(function (q) { return q.id.split(':')[1]; })) === JSON.stringify(['sansu', 'kokugo', 'rika', 'shakai', 'eigo']), '小5の 塔は 算数→国語→理科→社会→英語');
  check(st5.make(8, { boss: true }).length === 8, '小5の 塔は 8問 出る');
  check(MQ.content.lastBoss().name === 'ブリザードキング' && MQ.content.towerStageId() === 'tower5' && MQ.content.towerName() === 'さいごの 塔', '小5の lastBoss: ' + MQ.content.lastBoss().name);
  const p5 = { grade: 5, playGrade: 5, frags: {} };
  ['sansu', 'kokugo', 'rika', 'shakai'].forEach(function (id) { p5.frags[MQ.content.fragKey(id, p5)] = true; });
  check(MQ.content.towerOpen(p5) === false, 'かけら 4つでは 小5の 塔は まだ');
  p5.frags[MQ.content.fragKey('eigo', p5)] = true;
  check(MQ.content.towerOpen(p5) === true, 'かけら 5つで 小5の 塔が 開く');
  MQ.content.setActive(null);
  MQ.terms.forcePlayer(null);
  check(!!MQ.treasure.forStage('tower5'), '小5の 塔の たからもの');
  const e = MQ.enemies.get('boss-blizzard');
  check(!!e && e.last === true && e.shape === 'blizzard' && !!e.phase2 && !!MQ.monsterArt.mons.blizzard, 'ブリザードキングの データと 絵');
  check(MQ.hero.titles.some(function (t) { return t.id === 't-blizzard'; }), 'しょうごう ふぶきを こえた 者');
})();

/* ---- 問題の 図（v4.9）：地図記号・方位・じしゃく・回路・月 ---- */
(function () {
  check(MQ.zu.names.length === 17, '地図記号は 17こ: ' + MQ.zu.names.length);
  MQ.zu.names.forEach(function (nm) { check(MQ.zu.kigoSvg(nm).indexOf('<svg') === 0, '地図記号 ' + nm); });
  const st3 = MQ.rikashakai3.questions.filter(function (q) { return q.stage === 3; });
  const withFig = st3.filter(function (q) { return q.text.indexOf('<svg') !== -1; }).length;
  check(withFig >= 24, '地図と方位の 図つきが 24問 いじょう: ' + withFig);
  // stripTags した 問題文（＝出題 id の もと）が かぶらない（同じ 文だと 12問かぶりなしが こわれる）
  [1, 2, 3, 4].forEach(function (st) {
    const seen = {};
    MQ.rikashakai3.questions.filter(function (q) { return q.stage === st; }).forEach(function (q) {
      const k = MQ.util.stripTags(q.text);
      check(!seen[k], 'rikashakai stage' + st + ' の 問題文が かぶる: ' + k);
      seen[k] = 1;
    });
  });
  const mag = MQ.rikashakai3.questions.filter(function (q) { return q.stage === 2 && q.text.indexOf('<svg') !== -1; }).length;
  check(mag >= 6, 'じしゃくの 図つきが 6問 いじょう: ' + mag);
  // N/S の 字が 答えに なる 問題は 字を かくした じしゃくの 図
  const ryohashi = MQ.rikashakai3.questions.filter(function (q) { return q.text.indexOf('両はしの 名前') !== -1; })[0];
  check(!!ryohashi && ryohashi.text.indexOf('>N<') === -1, '両はしの 名前の 図に N/S の 字が ない');
  check(MQ.rika4.questions.filter(function (q) { return q.text.indexOf('<svg') !== -1; }).length >= 7, '小4理科の 図つき（回路・月）');
  check(MQ.shakai4.questions.filter(function (q) { return q.text.indexOf('<svg') !== -1; }).length >= 1, '小4社会の 図つき');
  check(MQ.zu.circuit('parallel', 'bulb').indexOf('<svg') === 0 && MQ.zu.moon('phases').indexOf('<svg') === 0, '回路と 月の 図が 作れる');
})();

/* ---- 学年ごとの 地図（v4.7）---- */
(function () {
  const T = MQ.tiles;
  check(!!T.THEMES.g1 && !!T.THEMES.g2 && !!T.THEMES.g3 && !!T.THEMES.g4, '学年ごとの 地図の テーマが 4つ');
  const grass = ['g1', 'g2', 'g3', 'g4'].map(function (k) { return T.THEMES[k].colors[T.GRASS][0]; });
  check(new Set(grass).size === 4, '学年ごとに 草の 色が ちがう: ' + grass.join(' '));
  const sea = ['g1', 'g2', 'g3', 'g4'].map(function (k) { return T.THEMES[k].colors[T.SEA][0]; });
  check(new Set(sea).size === 4, '学年ごとに 海の 色が ちがう: ' + sea.join(' '));
  // 島の 形（海岸線の 平きんの 幅）も 学年で ちがう
  function widthOf(theme) {
    const g = T.build({ height: 900, island: { top: 40, bottom: 860 }, bands: [], path: [], theme: theme });
    let sum = 0, n = 0;
    for (let y = 8; y < g.rows - 8; y++) {
      let w = 0;
      for (let x = 0; x < g.cols; x++) if (T.isLand(g.cells[y][x])) w++;
      sum += w; n++;
    }
    return Math.round(sum / n * 10) / 10;
  }
  const ws = ['g1', 'g2', 'g3', 'g4'].map(widthOf);
  check(ws[0] < ws[2] && ws[2] < ws[1], '島の 大きさ 小1 < 小3 < 小2: ' + ws.join(' '));
  // どの 学年でも ノードの よこの いち（v8.0：18%・50%・82% の 3列）は 陸の 上に ある（道が 切れない）
  ['g1', 'g2', 'g3', 'g4'].forEach(function (k) {
    const g = T.build({ height: 900, island: { top: 40, bottom: 860 }, bands: [], path: [], theme: k });
    [18, 50, 82].forEach(function (pct) {
      const x = Math.round(g.cols * pct / 100);
      let ok = true;
      for (let y = 8; y < g.rows - 8; y++) if (!T.isLand(g.cells[y][x]) || !T.isLand(g.cells[y][x + 1])) ok = false;
      check(ok, k + ' の ' + pct + '% は 陸の 上（道が 通る）');
    });
  });
  // 理科の 湖：水の マスが できる
  const lake = T.build({
    height: 400, island: { top: 20, bottom: 380 },
    bands: [{ top: 60, height: 198, biome: 'lake' }], path: [], theme: 'g4'
  });
  let water = 0;
  for (let y = 0; y < lake.rows; y++) for (let x = 0; x < lake.cols; x++) if (lake.cells[y][x] === T.RIVER) water++;
  check(water >= 12, '理科の 湖に 水の マスが ある: ' + water);
})();

/* ---- たからもの ---- */
check(MQ.treasure.total() === 136, 'たからもの 136個（小3 32＋小1 18＋小2 19＋小4 32＋小5 35）: ' + MQ.treasure.total());
check(MQ.treasure.listFor(w3).length === 32 && MQ.treasure.listFor(w1).length === 18 && MQ.treasure.listFor(w2).length === 19 && MQ.treasure.listFor(w4).length === 32 && MQ.treasure.listFor(MQ.content.world('g5')).length === 35, 'listFor: 小3 32・小1 18・小2 19・小4 32・小5 35');
[w3, w1, w2, w4].forEach(function (wld) {
  wld.areas.forEach(function (a) {
    a.stages.forEach(function (st) { check(!!MQ.treasure.forStage(st.id), 'たからもの なし: ' + st.id); });
  });
});
const trIds = MQ.treasure.list.map(function (t) { return t.id; });
check(new Set(trIds).size === trIds.length, 'たからものの id が かぶっていない');

/* ---- 主人公・そうび ---- */
check(MQ.hero.gear.length === 30, 'そうび 30点（5部位 × 6グレード）: ' + MQ.hero.gear.length);
check(MQ.hero.grades.length === 6, 'グレード 6しゅるい: ' + MQ.hero.grades.length);
(function () {
  // v5.4：かたちが グレードごとに ちがう（前は 色だけ ちがった）
  MQ.hero.slots.forEach(function (slot) {
    const shapes = MQ.hero.gear.filter(function (g) { return g.slot === slot; })
      .map(function (g) { return g.rows.join('\n'); });
    check(new Set(shapes).size === 6, slot + ' の かたちが 6つ とも ちがう: ' + new Set(shapes).size);
  });
  // そうびの 効果：どの グレードも 0 では ない・上の グレードほど 強い
  MQ.hero.slots.forEach(function (slot) {
    const vals = MQ.hero.gearSlotPower[slot].vals;
    check(vals.length === 6 && vals[0] >= 1, slot + ' の 効果は 6つ・かわでも 1いじょう');
    for (let i = 1; i < 6; i++) check(vals[i] >= vals[i - 1], slot + ' の 効果は 下がらない');
  });
  const none = MQ.hero.gearPower({ equipped: {} });
  check(none.xpAdd === 0 && none.setMul === 1, 'そうび なしなら 効果 0');
  const full = {};
  MQ.hero.slots.forEach(function (slot) { full[slot] = 'yami-' + slot; });
  const gp = MQ.hero.gearPower({ equipped: full });
  check(gp.xpAdd === 10 && gp.safe === 3 && gp.special === 2 && gp.keep === 3 && gp.coins === 3, 'やみ 一式の 効果: ' + JSON.stringify(gp));
  check(Math.abs(gp.setMul - 1.6) < 1e-9 && gp.setName === 'やみ', 'セットボーナス ×1.6');
  // もらい方：★2の ごほうびで でんせつ・ほし・やみ は 出ない
  const pl = { gear: [], equipped: {} };
  for (let i = 0; i < 30; i++) {
    const g = MQ.hero.nextGear(pl);
    if (!g) break;
    check(!MQ.hero.isSpecial(g.id), '★2で もらえるのは グレード1〜3 だけ: ' + g.id);
    pl.gear.push(g.id);
  }
  check(pl.gear.length === 15 && MQ.hero.nextGear(pl) === null, '★2で もらえるのは 15点: ' + pl.gear.length);
  check(MQ.hero.nextHoshi({ gear: [] }, 2) === null, '★3が 2つでは ほしは まだ');
  check(MQ.hero.nextHoshi({ gear: [] }, 3).id === 'hoshi-weapon', '★3が 3つで ほしの けん');
  check(MQ.hero.nextHoshi({ gear: ['hoshi-weapon'] }, 3) === null, 'つぎの ほしは ★3が 6つから');
  check(MQ.hero.nextYami({ gear: [] }).id === 'yami-weapon', 'やみは 塔を クリアするたび');
})();
check(MQ.hero.bodyRows.length === 48 && MQ.hero.bodyRows[0].length === 48, '主人公は 48×48');
MQ.hero.gear.forEach(function (g) {
  check(g.rows.length === 48, 'そうび ' + g.id + ' rows');
  g.rows.forEach(function (r, i) { check(r.length === 48, 'そうび ' + g.id + ' row ' + i); });
});
check(MQ.hero.slots.length === 5, '5部位');
check(MQ.hero.levelOf(0) === 1 && MQ.hero.levelOf(100) === 2 && MQ.hero.levelOf(250) === 3, 'levels');
check(MQ.hero.titles.length >= 30, 'しょうごう 30しゅるい いじょう: ' + MQ.hero.titles.length);
(function () {
  const ids = MQ.hero.titles.map(function (t) { return t.id; });
  check(new Set(ids).size === ids.length, 'しょうごうの id が かぶっていない');
  MQ.hero.titles.forEach(function (t) {
    check(!!t.name && !!t.how && typeof t.test === 'function', 'しょうごう ' + t.id + ' の 中身');
    check(t.name.length <= 14, 'しょうごう「' + t.name + '」が 長すぎる');
  });
  // からっぽの プレイヤーでも おちない・さいしょの 1つだけ
  const empty = { xp: 0 };
  const got0 = MQ.hero.checkTitles(empty);
  check(got0.length === 1 && empty.title === 't-minarai', 'さいしょは みならいだけ: ' + got0.length);
  // ぜんぶ そろった プレイヤーは ぜんぶ もらえる
  const dex = {};
  MQ.enemies.list.slice(0, 80).forEach(function (e) { dex[e.id] = 1; });
  ['boss-dragon', 'boss-oni', 'boss-knight', 'boss-slime', 'boss-titan', 'boss-maou', 'boss-dark', 'boss-obake', 'boss-kaizoku', 'boss-blizzard', 'slime-golden'].forEach(function (id) { dex[id] = 1; });
  const stars = {}; MQ.content.subjectAreas().forEach(function (a) { a.stages.forEach(function (st) { stars[st.id] = 3; }); });
  const tr = {}; MQ.treasure.list.forEach(function (t) { tr[t.id] = 2; });
  const rich = {
    xp: 999999, dex: dex, stars: stars, treasure: tr, coins: 50, battles: 40, defeated: 600,
    frags: { sansu: true, kokugo: true, rikashakai: true, eigo: true },
    best: { 'sansu3-1': { correct: 13, total: 13, time: 100 } },
    fastCount: 9, bestCombo: 18, itemUses: 12, custom: [{ id: 'c1' }],
    missionsDone: 12, revengeWins: 6,  // v3.1 の しょうごう
    counters: 10,                      // v7.7 カウンターの たつじん
    elites: 10, weakHits: 10,          // v8.1 中ボス ハンター・弱点を つく 者
    gear: MQ.hero.gear.map(function (g) { return g.id; }),   // v5.4 の そうびの しょうごう
    // v5.2 の しょうごう：なかま 10体・そのうち 1体は Lv10
    pals: (function () {
      const o = {};
      MQ.enemies.list.slice(0, 10).forEach(function (e, i) {
        o[e.id] = { exp: i === 0 ? MQ.pals.expFor(10) : 0 };
      });
      return o;
    })(),
    pal: MQ.enemies.list[0].id
  };
  const gotAll = MQ.hero.checkTitles(rich);
  check(gotAll.length === MQ.hero.titles.length, 'ぜんぶ そろえば ぜんぶ もらえる: ' + gotAll.length + ' / ' + MQ.hero.titles.length);
  const lastTitle = MQ.hero.titles[MQ.hero.titles.length - 1].id;
  check(rich.title === lastTitle, 'さいごに もらった しょうごうが つく: ' + rich.title);
})();

/* ---- 見た目（ブロック調：かみ／め／ふく／いろ／アクセ） ---- */
(function () {
  const F = MQ.face;
  const PART_KEYS = ['hairStyles', 'eyeStyles', 'clothStyles', 'glassStyles', 'accStyles'];
  PART_KEYS.forEach(function (k) {
    check(F[k].length >= 6, k + ' は 6種いじょう: ' + F[k].length);
    const ids = F[k].map(function (it) { return it.id; });
    check(new Set(ids).size === ids.length, k + ' の id が かぶっている');
    F[k].forEach(function (it) {
      check(!!it.name, k + ' ' + it.id + ' に なまえが ない');
      check(it.rows.length === F.SIZE, k + ' ' + it.id + ' は ' + it.rows.length + ' 行');
      it.rows.forEach(function (r, i) { check(r.length === F.SIZE, k + ' ' + it.id + ' row ' + i + ' len ' + r.length); });
      if (it.rare) check(it.rare === 'r' || it.rare === 'sr', k + ' ' + it.id + ' の rare が おかしい');
      if (it.lv) check(it.lv >= 2 && it.lv <= 20, k + ' ' + it.id + ' の lv が おかしい: ' + it.lv);
    });
  });
  check(F.hairStyles.length >= 8, 'かみがたは 8種いじょう: ' + F.hairStyles.length);
  check(F.headRows.length === 48 && F.bodyRows.length === 48, '顔と 体は 48×48');

  function pts(rows) {
    const o = [];
    rows.forEach(function (row, y) { for (let x = 0; x < row.length; x++) if (row[x] !== '.') o.push([x, y]); });
    return o;
  }
  function inArea(p, ar) { return p[0] >= ar.x0 && p[0] <= ar.x1 && p[1] >= ar.y0 && p[1] <= ar.y1; }

  // どの かみがたでも 目と 口が かくれない ／ ひたいは かくれる
  F.hairStyles.forEach(function (hs) {
    const hair = pts(hs.rows);
    const hit = hair.filter(function (p) { return inArea(p, F.EYE_AREA) || inArea(p, F.MOUTH_AREA); });
    check(hit.length === 0, 'かみがた「' + hs.name + '」が 目か 口を かくす: ' + hit.length + 'マス');
    for (let x = F.HEAD.x0; x <= F.HEAD.x1; x++) {
      check(hs.rows[F.HEAD.y0][x] !== '.', 'かみがた「' + hs.name + '」で ひたい（列' + x + '）が 出る');
    }
  });
  // め・かざり（おうかん いがい）・めがね は 顔の 中に おさまる
  F.eyeStyles.forEach(function (es) {
    const out = pts(es.rows).filter(function (p) { return !inArea(p, F.HEAD); });
    check(out.length === 0, 'め「' + es.name + '」が 顔から はみ出す');
  });

  // えらべる 数（企画：ぜんぶで 100万とおり いじょう）
  let combos = 1;
  MQ.hero.lookGroups.forEach(function (g) { combos *= g.list.length; });
  check(MQ.hero.lookGroups.length === 10, 'えらべるのは 10しゅるい: ' + MQ.hero.lookGroups.length);
  check(combos >= 1000000, '組み合わせが 100万とおり いじょう: ' + combos);
  console.log('  すがたの 組み合わせ: ' + combos.toLocaleString('ja-JP') + ' とおり');

  // タブに ぜんぶの しゅるいが 入っている
  const inTabs = [];
  MQ.hero.lookTabs.forEach(function (t) { t.keys.forEach(function (k) { inTabs.push(k); }); });
  MQ.hero.lookGroups.forEach(function (g) { check(inTabs.indexOf(g.key) !== -1, g.key + ' が どの タブにも ない'); });
  check(MQ.hero.lookTabs.length === 5, 'タブは 5つ');

  // レベルで かいほう
  const c1 = MQ.hero.partsCount(1), c20 = MQ.hero.partsCount(20);
  check(c1.have < c1.total && c20.have === c20.total, 'パーツの かいほう: Lv1 ' + c1.have + '/' + c1.total + ' Lv20 ' + c20.have + '/' + c20.total);
  console.log('  パーツ: Lv1 で ' + c1.have + ' / ' + c1.total);
  for (let i = 0; i < 40; i++) {
    const l = MQ.hero.randomLook(1);
    MQ.hero.lookGroups.forEach(function (g) {
      const it = MQ.face.pick(g.list, l[g.key]);
      check(it.id === l[g.key], 'randomLook の ' + g.key + ' が おかしい: ' + l[g.key]);
      check(MQ.hero.owns(it, 1), 'Lv1 の おまかせ で まだ 使えない ' + g.key + '「' + it.name + '」が 出た');
    });
    check(MQ.hero.layersFor({ look: l, equipped: {} }, { noGear: true }).length === 7, 'かさねる 絵は 7まい');
    check(typeof MQ.hero.faceSprite(l) === 'string' && typeof MQ.hero.bodySprite(l) === 'string', 'faceSprite / bodySprite');
  }

  // 古い セーブが 新しい 形に うつる
  const v12 = MQ.hero.lookOf({ look: { hair: 'gold', skin: 'dark', style: 'long' } });
  check(v12.hairColor === 'gold' && v12.skin === 'dark' && v12.hair === 'pony', 'v1.2 の 見た目が うつる: ' + JSON.stringify(v12));
  const v13 = MQ.hero.lookOf({ look: { face: 'maru', skin: 'mid', eye: 'kirakira', eyeColor: 'gold', brow: 'futsu', nose: 'futsu', mouth: 'niko', style: 'twin', hair: 'cyan', glass: 'sun' } });
  check(v13.hair === 'twin' && v13.hairColor === 'mint' && v13.eye === 'kira' && v13.glass === 'sun' && v13.cloth === 'hoshi', 'v1.3 の 見た目が うつる: ' + JSON.stringify(v13));
  const now = MQ.hero.lookOf({ look: { hair: 'wolf', hairColor: 'rainbow', cloth: 'robe' } });
  check(now.hair === 'wolf' && now.hairColor === 'rainbow' && now.cloth === 'robe', '新しい 見た目は そのまま');
  const bad = MQ.hero.lookOf({ look: { hairColor: 'にじいろ', eye: 'xxx' } });
  check(bad.hairColor === 'blue' && bad.eye === 'futsu', '知らない id は きほんに もどる');
})();

/* ---- 敵 ---- */
['sansu', 'kokugo', 'rikashakai', 'eigo'].forEach(function (a) {
  const ids = MQ.enemies.pickIds(a, 9);
  check(ids.length === 9, 'pickIds ' + a);
  ids.forEach(function (id) {
    const e = MQ.enemies.get(id);
    check(e && (e.area === a || e.any) && !e.rare && !e.hidden, 'enemy ' + id + ' belongs to ' + a);
  });
  check(MQ.enemies.bossFor(a).area === a, 'boss for ' + a);
  const rare = MQ.enemies.get(MQ.enemies.rareIdFor(a));
  check(rare && rare.rare === true, 'レア敵 for ' + a);
});
check(MQ.enemies.trioFor('eigo').length === 3, 'ABC3きょうだい');

/* ---- ブロックの 絵（CSS の div で 描く）が ただしいか ---- */
function checkShape(name, shape, side, where) {
  check(Array.isArray(shape) && shape.length > 0, where + ' の 絵が ない: ' + name);
  if (!Array.isArray(shape)) return;
  check(shape.length >= 2, name + ' の ブロックが 少なすぎる: ' + shape.length);
  shape.forEach(function (p, i) {
    const at = name + ' の ' + i + 'ばんめ';
    check(Array.isArray(p) && p.length >= 5, at + ' の かたちが おかしい');
    if (!Array.isArray(p)) return;
    const x = p[0], y = p[1], w = p[2], hh = p[3];
    check(typeof x === 'number' && typeof y === 'number', at + ' の 場所が 数でない');
    check(w >= 1 && hh >= 1, at + ' の 大きさが 0いか');
    check(x >= 0 && y >= 0, at + ' が 左／上に はみ出す: ' + x + ',' + y);
    check(x + w <= side && y + hh <= side, at + ' が 右／下に はみ出す: ' + (x + w) + ',' + (y + hh) + ' > ' + side);
    check(typeof p[4] === 'string' && p[4].length > 0, at + ' に 色が ない');
    if (p[5]) check(/^[hgnd o]+$/.test(p[5]), at + ' の フラグが おかしい: ' + p[5]);
  });
}
MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) {
  const shape = MQ.enemies.shapes[e.shape];
  check(!!shape, 'shape exists: ' + e.shape);
  if (shape) checkShape(e.shape, shape, 48, 'モンスター');
});
check(Object.keys(MQ.monsterArt.mons).length >= 50, '形は 50しゅるい いじょう: ' + Object.keys(MQ.monsterArt.mons).length);

/* ---------- v4.2 あたらしい 51体（17系統 × 3段階・相棒に できる） ---------- */
(function () {
  // v8.2 で 系統が ふえた ので、ここは v4.2 の 17系統（id が -1/-2/-3）だけを 見る
  // 息子さんの モンスターの 進化形（v8.3）も id が -2/-3 で おわる ので rare で よける
  const L = MQ.enemies.list.filter(function (e) { return e.line && /-[123]$/.test(e.id) && !e.rare; });
  check(L.length === 51, 'あたらしい モンスターは 51体（' + L.length + '）');
  const lines = {};
  L.forEach(function (e) { (lines[e.line] = lines[e.line] || []).push(e); });
  check(Object.keys(lines).length === 17, '系統は 17（' + Object.keys(lines).length + '）');
  let bad = 0;
  Object.keys(lines).forEach(function (k) {
    const g = lines[k].slice().sort(function (a, b) { return a.stage - b.stage; });
    if (g.length !== 3) { bad++; return; }
    g.forEach(function (e, i) {
      if (e.stage !== i + 1) bad++;                       // 1→2→3 の じゅん
      if (e.rank !== e.stage) bad++;                      // 1段階＝序盤（rank1）… と そろう
      if (i < 2 && e.evo !== g[i + 1].id) bad++;          // つぎの すがたを さして いる
      if (i === 2 && e.evo) bad++;                        // さいごは 進化しない
      if (!MQ.enemies.shapes[e.shape]) bad++;
    });
  });
  check(bad === 0, '3だんかいの ならびと 進化さきが 正しい（' + bad + '）');
  // 名前と id が かぶらない
  const names = {}, ids = {};
  let dup = 0;
  MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) {
    if (names[e.name]) dup++;
    if (ids[e.id]) dup++;
    names[e.name] = 1; ids[e.id] = 1;
  });
  check(dup === 0, 'モンスターの 名前と id が かぶらない（' + dup + '）');
  // 図かん（ザコ＋ボス5体）
  const dex = MQ.enemies.dexList().length + MQ.enemies.bosses.length;
  check(dex === 220, '図かんは 220体（' + dex + '）');   // v8.3 で 息子さんの 進化形 12体（208 → 220）
  // エリアごとの 顔ぶれ
  ['sansu', 'kokugo', 'rikashakai', 'eigo'].forEach(function (a) {
    const pool = MQ.enemies.list.filter(function (e) { return (e.area === a || e.any) && !e.rare && !e.hidden; });
    check(pool.length >= 30, a + ' の ザコは 30体 いじょう（' + pool.length + '）');
    [1, 2, 3].forEach(function (r) {
      const n = pool.filter(function (e) { return (e.rank || 2) === r; }).length;
      check(n >= 8, a + ' の つよさ' + r + 'は 8体 いじょう（' + n + '）');
    });
    check(MQ.enemies.pickIds(a, 12, 0.5).length === 12, a + ' の 顔ぶれが 12体 えらべる');
  });
  /* ---- v8.2 王さま形（3段階め）と 系統 ---- */
  const kings = MQ.enemies.list.filter(function (e) { return /-king$/.test(e.id); });
  check(kings.length === 44, '王さま形は 44体（' + kings.length + '）');
  check(kings.every(function (e) { return e.stage === 3 && e.line && !e.evo && e.rank === 3; }), '王さまは 3段階め・rank3・つぎは ない');
  check(kings.every(function (e) { return !!MQ.enemies.shapes[e.shape]; }), '王さまの 絵が ぜんぶ ある');
  // むかしから いる 88体は ぜんぶ 系統に 入って 進化する（中ボスと レアは のぞく）
  const plain = MQ.enemies.list.filter(function (e) { return !e.mid && !e.rare && !e.hidden && e.id !== 'chest'; });
  const noEvo = plain.filter(function (e) { return !e.evo && e.stage !== 3; });
  check(noEvo.length === 0, '系統に 入って いない モンスターが ない（' + noEvo.map(function (e) { return e.name; }).join('・') + '）');
  // 中ボス（v8.1）は 系統に 入れない（claude-36 の たのみ）
  check(MQ.enemies.list.filter(function (e) { return e.mid; }).every(function (e) { return !e.line && !e.stage && !e.evo; }), '中ボスに 系統は つけない');
  // evo の 行き先が ある・ぐるぐる 回らない
  let evoBad = 0, evoLoop = 0;
  MQ.enemies.list.forEach(function (e) {
    if (!e.evo) return;
    const to = MQ.enemies.get(e.evo);
    if (!to) { evoBad++; return; }
    if (to.line !== e.line || (to.stage || 0) <= (e.stage || 0)) evoLoop++;
  });
  check(evoBad === 0, '進化の 行き先が ぜんぶ ある');
  check(evoLoop === 0, '進化は 同じ 系統で 1段ずつ 上がる');
  // 追い打ちの つよさ（v8.2）
  check(MQ.pals.POWER[1].xp === 10 && MQ.pals.POWER[2].xp === 15 && MQ.pals.POWER[3].dmg === 2, '追い打ちは 段階で 強く なる');

  /* ---- v8.2 じぶんの モンスターも 3段階（写真・ドット絵）---- */
  MQ.enemies.setCustom([{ id: 'my-1', name: 'ドラゴンくん', area: 'sansu', png: 'data:1', png2: 'data:2', png3: 'data:3' },
                        { id: 'my-2', name: 'ふるいの', area: 'kokugo', png: 'data:x' }]);
  const c1 = MQ.enemies.get('my-1'), c2 = MQ.enemies.get('my-1-2'), c3 = MQ.enemies.get('my-1-3');
  check(!!c1 && !!c2 && !!c3, 'じぶんの モンスターが 3段階に なる');
  check(c1.evo === 'my-1-2' && c2.evo === 'my-1-3' && !c3.evo, 'じぶんの モンスターの 進化さき');
  check(c2.name === 'つよい ドラゴンくん' && c3.name === 'でんせつの ドラゴンくん', '進化した ときの 名前: ' + c2.name + ' / ' + c3.name);
  check(c2.png === 'data:2' && c3.png === 'data:3', '段階ごとに 絵が ちがう');
  check(!!c2.evoOnly && !!c3.evoOnly && !c1.evoOnly, '2・3段階めは ふつうの たたかいに 出ない');
  check(!MQ.enemies.get('my-2').evo, 'むかしの セーブ（絵が 1つ）は そのまま');
  const rare = MQ.enemies.rareIdsFor('sansu');
  check(rare.indexOf('my-1') >= 0 && rare.indexOf('my-1-2') < 0, 'レアに 出るのは 1段階めだけ');
  MQ.enemies.setCustom([]);

  /* ---- v8.6 息子さんの モンスターの 進化形（専用の すがた 12体）---- */
  (function () {
    const LINES = ['skullhorse', 'sameoni', 'zukan', 'abc-a', 'abc-b', 'abc-c'];
    let ng = 0;
    LINES.forEach(function (ln) {
      const g = MQ.enemies.list.filter(function (e) { return e.line === ln; })
        .sort(function (a, b) { return a.stage - b.stage; });
      check(g.length === 3, '息子さんの ' + ln + ' は 3だんかい（' + g.length + '）');
      if (g.length !== 3) { ng++; return; }
      g.forEach(function (e, i) {
        if (e.stage !== i + 1) ng++;
        if (i < 2 && e.evo !== g[i + 1].id) ng++;      // つぎの すがたを さす
        if (i === 2 && e.evo) ng++;                    // さいごは 進化しない
        if (!e.rare || e.by !== 'son') ng++;           // レア・息子さんの ぶんの まま
        if (!MQ.enemies.shapes[e.shape]) ng++;         // 絵が ある
        if (i > 0 && (!e.evoOnly || e.trio)) ng++;     // 2・3段階めは 出ない・3きょうだいでは ない
        if (i === 0 && e.evoOnly) ng++;                // 1段階めは いままで どおり 出る
      });
    });
    check(ng === 0, '息子さんの 進化形の ならびが 正しい（' + ng + '）');
    // ふつうの たたかいで 出会うのは 1段階めだけ
    let leak = 0;
    ['sansu', 'kokugo', 'rikashakai', 'eigo'].forEach(function (a) {
      MQ.enemies.rareIdsFor(a).forEach(function (id) {
        const e = MQ.enemies.get(id);
        if (e && e.evoOnly) leak++;
      });
    });
    check(leak === 0, '進化した すがたは レア敵に 出ない（' + leak + '）');
    check(MQ.enemies.trioFor('eigo').length === 3, 'ABC3きょうだいは 3体の まま');
    // Lv10 → Lv20 で すがたが 2回 かわる
    const p = { pals: {}, pal: null, dex: {} };
    MQ.pals.add(p, 'skullhorse', 0);
    MQ.pals.setActive(p, 'skullhorse');
    p.pals['skullhorse'].exp = MQ.pals.expFor(10);
    MQ.pals.evolveIfReady(p);
    const lv10 = MQ.pals.active(p);
    p.pals[lv10.id].exp = MQ.pals.expFor(20);
    MQ.pals.evolveIfReady(p);
    const lv20 = MQ.pals.active(p);
    check(lv10.id === 'skullhorse-2' && lv20.id === 'skullhorse-3',
      'スカルホースは Lv10 → ' + lv10.name + ' / Lv20 → ' + lv20.name);
    check(MQ.pals.power(p).dmg === 2, '3段階めの 追い打ちは ボスに 2ダメージ');
  })();

  /* 進化の 部品（つの・かんむり・マント）が 48マスに おさまる */
  (function () {
    const N = 48;
    function box(x0, y0, w, hh) {
      const m = new Uint8Array(N * N);
      for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + w; x++) m[y * N + x] = 1;
      return m;
    }
    [[8, 8, 32, 32], [0, 0, 48, 48], [20, 30, 8, 18], [2, 2, 44, 10]].forEach(function (b2, i) {
      [2, 3].forEach(function (st) {
        const p = MQ.monsterGen.evoParts(box(b2[0], b2[1], b2[2], b2[3]), st, N);
        const all = p.back.concat(p.front);
        check(all.length > 0, '進化の 部品が できる（絵' + i + ' 段階' + st + '）');
        const out = all.filter(function (r) { return r[0] < 0 || r[1] < 0 || r[0] + r[2] > N || r[1] + r[3] > N; });
        check(out.length === 0, '進化の 部品が 48マスから はみ出さない（絵' + i + ' 段階' + st + '）');
      });
    });
    check(MQ.monsterGen.evoParts(new Uint8Array(N * N), 3, N).front.length === 0, 'まっしろの 絵では 部品を つけない');
  })();

  // にんじゃは どの エリアにも 出る
  const ninja = MQ.enemies.list.filter(function (e) { return e.line === 'ninja'; });
  check(ninja.length === 3 && ninja.every(function (e) { return e.any; }), 'にんじゃは どの エリアにも 出る');
  // 1段階は かんたんな ステージ、3段階は むずかしい ステージに 出やすい
  const easy = MQ.enemies.pickIds('sansu', 12, 0);
  const hardIds = MQ.enemies.pickIds('sansu', 12, 1);
  function rankOf(id) { const e = MQ.enemies.get(id); return e ? (e.rank || 2) : 2; }
  const easyAvg = easy.reduce(function (t, id) { return t + rankOf(id); }, 0) / easy.length;
  const hardAvg = hardIds.reduce(function (t, id) { return t + rankOf(id); }, 0) / hardIds.length;
  check(easyAvg < hardAvg, 'かんたんな ステージほど よわい 顔ぶれ（' + easyAvg.toFixed(1) + ' < ' + hardAvg.toFixed(1) + '）');
})();
// たからものの 絵
MQ.treasure.list.forEach(function (t) {
  const shape = MQ.treasure.shapes[t.shape];
  check(!!shape, 'たからものの 形が ない: ' + t.shape);
  if (shape) checkShape(t.shape, shape, 40, 'たからもの');
});
checkShape('coin', MQ.monsterArt.items.coin, 40, 'たからもの');
// 色は A だけでも 全部 そろう（blocks.js が 作る）
(function () {
  const p = MQ.blocks.fill({ A: '#4CD164' });
  ['A', 'B', 'C', 'D', 'P'].forEach(function (k) { check(!!p[k], 'パレット ' + k + ' が 作られない'); });
  check(MQ.blocks.darker('#ffffff', 0.5) === '#808080', 'darker が おかしい: ' + MQ.blocks.darker('#ffffff', 0.5));
})();
// 息子さんの モンスター
['skullhorse', 'sameoni', 'zukan', 'abc-a', 'abc-b', 'abc-c'].forEach(function (id) {
  const e = MQ.enemies.get(id);
  check(e && e.by === 'son' && e.rare, '息子さんの モンスター: ' + id);
});

/* =======================================================
   たたかい
   ======================================================= */
function correctValue(q) {
  if (q.type === 'number') return q.answer;
  if (q.type === 'choice') return q.answer;
  if (q.type === 'roma') return q.answer;
  if (q.type === 'write') return true;
  return { q: q.answer.q, r: q.answer.r };
}
function wrongValue(q) {
  if (q.type === 'number') return q.answer + 1;
  if (q.type === 'choice') return (q.answer + 1) % q.choices.length;
  if (q.type === 'roma') return 'zzzz';
  if (q.type === 'write') return false;
  return { q: q.answer.q + 1, r: q.answer.r };
}
function clearMobs(n) {
  for (let i = 0; i < n; i++) { MQ.battle.answer(correctValue(MQ.battle.current())); MQ.battle.next(); }
}

MQ.save.load();
MQ.save.createPlayer('テスト');
const st6 = MQ.content.findStage('sansu3-6').stage;
const stK = MQ.content.findStage('kokugo3-1').stage;

/* ---- run1: ぜんぶ 一発正解（2体同時の ダブルKO こみ） ---- */
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9 });
check(MQ.battle.mobTotal() === 9 && MQ.battle.phase() === 'mob', 'start state');
let pairSeen = 0, multi = 0;
for (let i = 0; i < 9; i++) {
  const q = MQ.battle.current();
  check(!q.boss, 'mob ' + i);
  if (q.groupId) pairSeen++;
  const r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'correct', 'mob correct ' + i);
  if (i === 2) check(r.crit === true && r.combo === 3, 'crit from combo 3');
  if (r.multi) multi = r.multi;
  const nx = MQ.battle.next();
  if (i === 8) check(nx.entering === true && MQ.battle.phase() === 'boss', 'boss entering');
}
check(pairSeen === 2, '2体同時が 1組 出る（' + pairSeen + '体）');
check(multi === 2, 'ダブルKO が 出る');
for (let hit = 1; hit <= 3; hit++) {
  const q = MQ.battle.current();
  check(q.boss === true && q.enemyId === 'boss-dragon', 'boss q ' + hit);
  const r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'bosshit' && r.hpLeft === 3 - hit, 'bosshit ' + hit + ' hp=' + r.hpLeft);
  if (hit === 2) check(r.enrage === true, 'enrage at hp1');
  if (hit === 3) check(r.defeated === true && MQ.battle.isOver(), 'boss defeated');
  else MQ.battle.next();
}
let sum = MQ.battle.summary();
// ザコ9×10=90 ＋ クリティカル7×5=35 ＋ ダブルKO20 ＋ ボス(15+5)×3=60 ＋ 討伐15 = 220
check(sum.correct === 12 && sum.total === 12 && sum.stars === 3 && sum.bossBeaten === true, 'run1 summary');
check(sum.baseXp === 220, 'run1 xp 220, got ' + sum.baseXp);
check(sum.time >= 0 && typeof sum.time === 'number', 'run1 タイムが 出る');

/* ---- run1b: 12体（ほんばんの 数）。やさしい → むずかしい の じゅんで、ボスは ザコより むずかしい ---- */
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 12, 0.5), bossId: 'boss-dragon', mobs: 12, chest: true });
check(MQ.battle.mobTotal() === 13, '12体 ＋ たからばこ: ' + MQ.battle.mobTotal());
(function () {
  const seq = [];
  for (let i = 0; i < 13; i++) {
    const q = MQ.battle.current();
    if (!q.chest) seq.push(q.lv);
    MQ.battle.answer(correctValue(q));
    MQ.battle.next();
  }
  check(seq.length === 12 && levelsNonDecreasing(seq.map(function (l) { return { lv: l }; })), '12体が やさしい → むずかしい の じゅん: ' + seq.join(''));
  check(seq[0] === 1 && seq[11] === 3, '1体目は lv1、12体目は lv3: ' + seq.join(''));
  check(MQ.battle.phase() === 'boss' && MQ.battle.current().lv === 3, 'ボスの 問題は lv3');
})();

/* ---- run2: 3体同時（トリプルKO） ---- */
MQ.battle.start({
  stage: stK, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('eigo', 9),
  bossId: 'boss-slime', mobs: 9, trioIds: MQ.enemies.trioFor('eigo')
});
let trioSeen = 0, triple = 0;
for (let i = 0; i < 9; i++) {
  const q = MQ.battle.current();
  if (q.groupSize === 3) trioSeen++;
  const r = MQ.battle.answer(correctValue(q));
  if (r.multi) triple = r.multi;
  MQ.battle.next();
}
check(trioSeen === 3, '3体同時（ABC3きょうだい）: ' + trioSeen);
check(triple === 3, 'トリプルKO');

/* ---- run3: たからばこ（まちがえても 罰なし） ---- */
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9, chest: true });
check(MQ.battle.mobTotal() === 10, 'たからばこで 1問 ふえる: ' + MQ.battle.mobTotal());
let chestQ = null, chestRes = null;
for (let i = 0; i < 10; i++) {
  const q = MQ.battle.current();
  if (q.chest) {
    chestQ = q;
    MQ.battle.answer(wrongValue(q));
    chestRes = MQ.battle.answer(wrongValue(q));
  } else {
    MQ.battle.answer(correctValue(q));
  }
  MQ.battle.next();
}
check(chestQ && chestQ.enemyId === 'chest', 'たからばこが 出る');
check(chestRes && chestRes.outcome === 'chestlost', 'たからばこは にげるだけ');
sum = MQ.battle.summary();
check(sum.escaped.length === 0, 'たからばこは にげた敵に ならない（罰なし）');

// 開けた とき
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9, chest: true });
let opened = null;
for (let i = 0; i < 10; i++) {
  const q = MQ.battle.current();
  const r = MQ.battle.answer(correctValue(q));
  if (q.chest) opened = r;
  MQ.battle.next();
}
check(opened && opened.outcome === 'chest' && opened.coins === 1, 'たからばこを 開けると コイン');

/* ---- run4: レア敵は けいけんち3倍 ---- */
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9, rareId: 'skullhorse' });
let rareXp = 0;
for (let i = 0; i < 9; i++) {
  const q = MQ.battle.current();
  const r = MQ.battle.answer(correctValue(q));
  if (q.rare && q.enemyId === 'skullhorse') rareXp = r.xp;
  MQ.battle.next();
}
check(rareXp >= 30, 'レア敵は 3倍: ' + rareXp);

/* ---- run5: ボスの ガード → たおす ---- */
MQ.battle.start({ stage: stK, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9 });
clearMobs(9);
check(MQ.battle.phase() === 'boss', 'run5 boss phase');
let q = MQ.battle.current();
let r = MQ.battle.answer(wrongValue(q));
check(r.outcome === 'retry', 'boss retry first');
r = MQ.battle.answer(wrongValue(q));
check(r.outcome === 'guard' && r.fled === false, 'boss guard, not fled');
MQ.battle.next();
let hits = 0;
while (!MQ.battle.isOver()) {
  q = MQ.battle.current();
  r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'bosshit', 'run5 hit');
  hits++;
  if (!r.defeated && !r.fled) MQ.battle.next();
}
sum = MQ.battle.summary();
check(hits === 3 && sum.bossBeaten === true && sum.escaped.length === 1, 'run5 beaten after guard');

/* ---- run6: ボスが にげる（5問） ---- */
MQ.battle.start({ stage: stK, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9 });
clearMobs(9);
let asked = 1;
while (!MQ.battle.isOver()) {
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q));
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'guard', 'run6 guard ' + asked);
  if (!r.fled) { MQ.battle.next(); asked++; }
}
check(asked === 5 && r.fled === true, 'boss fled after 5 (asked=' + asked + ')');
sum = MQ.battle.summary();
check(sum.bossFled === true && sum.bossBeaten === false, 'run6 summary');

/* ---- run7: さいごの塔（ラスボス） ---- */
MQ.battle.start({ stage: tower, mode: 'tower', bossId: 'boss-maou', bossHp: 5, bossMax: 8, enrageAt: 3 });
check(MQ.battle.phase() === 'boss' && MQ.battle.mobTotal() === 0, '塔は ザコなし');
check(MQ.battle.bossHpMax() === 5, 'ラスボス HP5');
let enraged = false, lastHits = 0;
while (!MQ.battle.isOver()) {
  q = MQ.battle.current();
  r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'bosshit' && r.last === true, '塔 hit');
  lastHits++;
  if (r.enrage) enraged = true;
  if (!r.defeated && !r.fled) MQ.battle.next();
}
check(lastHits === 5 && enraged, 'ラスボスは 5回で たおれ、とちゅうで 変身する');
sum = MQ.battle.summary();
check(sum.bossBeaten === true && sum.mode === 'tower', '塔 クリア');
check(sum.baseXp >= 5 * 25 + 60, '塔の けいけんち: ' + sum.baseXp);

// 負けは ない：8問 まちがえ つづけても にげられるだけ
MQ.battle.start({ stage: tower, mode: 'tower', bossId: 'boss-maou', bossHp: 5, bossMax: 8, enrageAt: 3 });
let tries = 0;
while (!MQ.battle.isOver() && tries < 20) {
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q));
  r = MQ.battle.answer(wrongValue(q));
  tries++;
  if (!r.fled) MQ.battle.next();
}
check(tries === 8 && MQ.battle.summary().bossFled === true, 'ラスボスも 負けは ない（' + tries + '問）');

/* ---- run8: とっくん（にげた敵だけ・ボスなし） ---- */
MQ.battle.start({ stage: stK, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9 });
const q0 = MQ.battle.current();
MQ.battle.answer(wrongValue(q0));
MQ.battle.answer(wrongValue(q0));
MQ.battle.next();
for (let i = 1; i < 9; i++) { MQ.battle.answer(correctValue(MQ.battle.current())); MQ.battle.next(); }
while (!MQ.battle.isOver()) { const rr = MQ.battle.answer(correctValue(MQ.battle.current())); if (!rr.defeated && !rr.fled) MQ.battle.next(); }
sum = MQ.battle.summary();
const esc = sum.escaped[0];
check(sum.escaped.length === 1 && esc.key === q0.id, 'run8 にげた敵');
MQ.save.update(function (p) { esc.areaId = 'kokugo'; MQ.save.addEscaped(p, 'kokugo', esc); });
check(MQ.save.countAllEscaped(MQ.save.current()) === 1, 'にげた敵の 合計');

MQ.battle.start({ stage: stK, mode: 'tokkun', escaped: MQ.save.allEscaped(MQ.save.current()).map(function (o) { const e = Object.assign({}, o.entry); e.areaId = o.areaId; return e; }) });
check(MQ.battle.mobTotal() === 1 && MQ.battle.phase() === 'mob', 'とっくんは にげた敵だけ');
r = MQ.battle.answer(correctValue(MQ.battle.current()));
check(r.outcome === 'correct', 'とっくん 正解');
check(MQ.battle.next().phase === 'done', 'とっくんに ボスは いない');
sum = MQ.battle.summary();
check(sum.revengeBeaten.length === 1, 'とっくんで リベンジ成功');

/* ---- run9: にげた敵が つぎの たたかいに もどってくる ---- */
MQ.battle.start({ stage: stK, mode: 'normal', escaped: MQ.save.escapedIn(MQ.save.current(), 'kokugo'), enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9 });
let revengeFound = false;
for (let i = 0; i < 9; i++) {
  const qq = MQ.battle.current();
  if (qq.revenge) { revengeFound = true; check(qq.id === esc.key, 'revenge restored'); }
  MQ.battle.answer(correctValue(qq));
  MQ.battle.next();
}
check(revengeFound, 'にげた敵が もどってくる');

/* ---- run10: タイムアタック（1回 まちがえたら すぐ 決着・負けは ない） ---- */
MQ.battle.start({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9, timeAttack: 20 });
q = MQ.battle.current();
r = MQ.battle.answer(wrongValue(q));
check(r.outcome === 'wrong', 'タイムアタックは 1回で 決まる');
MQ.battle.next();
r = MQ.battle.timeUp();
check(r.outcome === 'wrong', '時間切れも まちがい あつかい');

/* ---- ローマ字の 答え合わせ ---- */
const romaStage = MQ.content.findStage('kokugo3-5').stage;
MQ.battle.start({ stage: romaStage, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9 });
let romaChecked = false;
for (let i = 0; i < 9; i++) {
  const qq = MQ.battle.current();
  if (qq.type === 'roma' && !romaChecked) {
    romaChecked = true;
    const alt = qq.accept.filter(function (a) { return a !== qq.answer; })[0];
    const rr = MQ.battle.answer(alt || qq.answer);
    check(rr.outcome === 'correct', 'ヘボン式でも 正解に なる（' + qq.answer + ' / ' + alt + '）');
  } else {
    MQ.battle.answer(correctValue(qq));
  }
  MQ.battle.next();
}

/* ---- かん字を 書く問題（じぶんで ○×） ---- */
const kanjiStage = MQ.content.findStage('kokugo3-2').stage;
const wq = kanjiStage.make(20, {}).filter(function (x) { return x.type === 'write'; })[0];
check(!!wq, 'かん字を 書く問題が ある');
if (wq) {
  MQ.battle.start({ stage: kanjiStage, mode: 'tokkun', escaped: [{ key: wq.id, q: wq, enemyId: 'mush-red', areaId: 'kokugo' }] });
  r = MQ.battle.answer(true);
  check(r.outcome === 'correct', '「かけた」で 正解');
}

/* ---- かけら・塔の じょうけん ---- */
const p = MQ.save.current();
check(MQ.content.fragNeed() === 8, 'かけらは ★8');
const sansuArea = MQ.content.areaOf('sansu');
MQ.save.update(function (pl) { pl.stars = { 'sansu3-1': 3, 'sansu3-2': 3, 'sansu3-3': 2 }; });
check(MQ.content.starsIn(MQ.save.current(), sansuArea) === 8, '★の 合計');
check(MQ.content.fragReady(MQ.save.current(), sansuArea) === true, '★8で かけら');
MQ.save.update(function (pl) { pl.frags = {}; ['sansu', 'kokugo', 'rikashakai'].forEach(function (a) { pl.frags[MQ.content.fragKey(a, pl)] = true; }); });
check(MQ.content.towerOpen(MQ.save.current()) === false, 'かけら3つでは 塔は 開かない');
MQ.save.update(function (pl) { pl.frags[MQ.content.fragKey('eigo', pl)] = true; });
check(MQ.content.towerOpen(MQ.save.current()) === true, 'かけら4つで 塔が 開く');

/* =======================================================
   どうぐ（v2.0）：たからものを たたかいの 中で 使う
   ======================================================= */
(function () {
  // わざの 表
  check(MQ.treasure.powers.length === 13, 'わざは 13しゅるい: ' + MQ.treasure.powers.length);
  const perPower = {};
  MQ.treasure.list.forEach(function (t) {
    const pw = MQ.treasure.powerOf(t.id);
    check(!!pw, 'たからもの ' + t.id + '（' + t.shape + '）に わざが ない');
    if (pw) perPower[pw.id] = (perPower[pw.id] || 0) + 1;
  });
  const want = {
    burst: 16, shield: 12, freeze: 6, guide: 11, golden: 10, chest: 8, power: 13, charge: 11,
    bond: 9, rush: 11, find: 11, swift: 10, elixir: 8      // v5.4 で ふえた 5つ（小5の たからもの 34 で 数が ふえた）
  };
  Object.keys(want).forEach(function (k) { check(perPower[k] === want[k], 'わざ ' + k + ' は ' + want[k] + '個: ' + perPower[k]); });
  MQ.treasure.powers.forEach(function (p) {
    check(typeof p.desc(p.val[0]) === 'string' && p.desc(p.val[0]).length > 0 && p.short(p.val[1]).length > 0, 'わざ ' + p.id + ' の せつめい');
    check(p.val[1] >= p.val[0], 'わざ ' + p.id + ' の 金色は 効果が 上がる');
    check(!!MQ.treasure.kindName[p.kind], 'わざ ' + p.id + ' の 種類名');
  });
  function it(id, gold) { const t = {}; t[id] = gold ? 2 : 1; return MQ.treasure.item({ treasure: t }, id); }
  check(it('tr-wari').power === 'burst' && it('tr-wari').val === 2 && it('tr-wari', true).val === 3, '宝石は ばくれつ（2→3）');
  check(it('tr-hissan', true).uses === 2 && it('tr-wari', true).uses === 1, 'みちしるべの 金色だけ 2回');
  check(MQ.treasure.item({ treasure: {} }, 'tr-wari') === null, '持っていない たからものは どうぐに ならない');
  check(MQ.treasure.bagItems({ treasure: { 'tr-wari': 1 }, bag: ['tr-wari', 'tr-kake'] }).length === 1, 'bagItems は 持っている ものだけ');

  function startWith(items, opts) {
    MQ.battle.start(Object.assign({ stage: st6, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9, items: items }, opts || {}));
  }
  let sum2;

  /* ---- ばくれつ：ザコは けいけんち 2ばい、ボスは 2ダメージ ---- */
  startWith([it('tr-wari')]);
  let u = MQ.battle.useItem('tr-wari');
  check(u.ok && u.power === 'burst' && u.buff.dmg === 2, 'ばくれつを 使う');
  check(MQ.battle.canUse('tr-wari').ok === false && MQ.battle.canUse('tr-wari').why === 'つかった', '1回 使ったら 使えない');
  let r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.outcome === 'correct' && r.burst === 2 && r.xp === 20, 'ばくれつ ザコ: xp ' + r.xp);
  check(MQ.battle.buffs().dmg === 1, 'ばくれつは 1回で 消える');
  MQ.battle.next();
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.xp === 10 && !r.burst, 'つぎの ザコは ふつう: ' + r.xp);

  startWith([it('tr-wari'), it('tr-kake1', true)]);
  clearMobs(9);
  check(MQ.battle.phase() === 'boss', 'ボスへ');
  u = MQ.battle.useItem('tr-wari');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.outcome === 'bosshit' && r.dmg === 2 && r.hpLeft === 1 && r.burst === 2, 'ばくれつ ボス 2ダメージ: hp ' + r.hpLeft);
  check(r.xp === 15 * 2 + 5, 'ばくれつ ボスの けいけんちは 2回ぶん（クリティカルこみ）: ' + r.xp);
  MQ.battle.next();
  u = MQ.battle.useItem('tr-kake1');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.dmg === 1 && r.defeated === true, 'のこり HP1 なら ダメージは 1（金色でも）');

  startWith([it('tr-kake1', true)]);
  clearMobs(9);
  MQ.battle.useItem('tr-kake1');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.dmg === 3 && r.defeated === true && MQ.battle.isOver(), '金色の ばくれつは ボスを 一発（3ダメージ）');
  check(MQ.battle.summary().itemsUsed.length === 1, 'summary に 使った どうぐ');

  /* ---- てっぺき：2回 まちがえても にげられない ---- */
  startWith([it('tr-ookii')]);
  u = MQ.battle.useItem('tr-ookii');
  check(u.ok && u.buff.shield === 1, 'てっぺきを 使う');
  let q = MQ.battle.current();
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'retry' && r.combo === 0, 'てっぺき 1回目は ふつうの retry');
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'shielded' && r.left === 0 && MQ.battle.isRetry(), 'てっぺき 2回目は セーフ');
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'wrong', 'たてが なくなったら にげられる');
  // 金色は 2回、そのあと 正解すれば たおせる（けいけんちは 半分）
  startWith([it('tr-sankaku', true)]);
  MQ.battle.useItem('tr-sankaku');
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q));
  r = MQ.battle.answer(wrongValue(q)); check(r.outcome === 'shielded' && r.left === 1, '金色 てっぺき 1');
  r = MQ.battle.answer(wrongValue(q)); check(r.outcome === 'shielded' && r.left === 0, '金色 てっぺき 2');
  r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'correct' && r.xp === 5, 'てっぺきの あと 正解 → たおす（けいけんち 半分）: ' + r.xp);
  check(MQ.battle.summary().escaped.length === 0, 'てっぺきで にげた敵は 0');
  // ボスの ガードも ふせぐ
  startWith([it('tr-ookii')]);
  clearMobs(9);
  MQ.battle.useItem('tr-ookii');
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q));
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'shielded', 'ボスの ガードも てっぺきで ふせぐ');
  check(MQ.battle.bossAsked() === 1, 'ボスの 出題数は ふえない');

  /* ---- 時とめ：まちがえても コンボが 切れない ---- */
  startWith([it('tr-jikoku')]);
  clearMobs(3);
  check(MQ.battle.combo() === 3, 'コンボ 3');
  MQ.battle.useItem('tr-jikoku');
  q = MQ.battle.current();
  r = MQ.battle.answer(wrongValue(q));
  check(r.outcome === 'retry' && r.frozen === true && r.combo === 3, '時とめで コンボ そのまま: ' + r.combo);
  r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'correct' && r.combo === 3, '正解しても コンボは 3のまま（もう1回の 正解は ふえない）');
  MQ.battle.next();
  q = MQ.battle.current();
  r = MQ.battle.answer(wrongValue(q));
  check(r.frozen === false && r.combo === 0, '時とめは 1回だけ');

  /* ---- みちしるべ：先に ヒント。えらぶ問題は まちがいを 1つだけ 消す ---- */
  MQ.battle.start({ stage: stK, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('kokugo', 9), bossId: 'boss-oni', mobs: 9, items: [it('tr-hissan', true)] });
  u = MQ.battle.useItem('tr-hissan');
  check(u.ok && u.hint && typeof u.hint.text === 'string' && u.left === 1, 'みちしるべで ヒント（金色は 2回）');
  if (u.hint && u.hint.kind === 'eliminate') check(u.hint.remove.length === 1, 'みちしるべは まちがいを 1つだけ 消す');
  check(MQ.battle.canUse('tr-hissan').ok === false, '同じ 問題で 2回は 使えない');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.outcome === 'correct' && r.xp === 10 && r.combo === 1, 'ヒントの あとの 正解は ふつうの けいけんち');
  MQ.battle.next();
  check(MQ.battle.canUse('tr-hissan').ok === true, 'つぎの 問題では また 使える');

  /* ---- ゴールデンコール：ザコが ゴールデンスライムに、けいけんち 3ばい ＋ コイン ---- */
  startWith([it('tr-graph')]);
  u = MQ.battle.useItem('tr-graph');
  check(u.ok && u.targets.length === 1 && u.now === true, 'ゴールデンコール（いまの てきが 変わる）');
  let goldXp = 0, goldCoins = 0;
  for (let i = 0; i < 9; i++) {
    const qq = MQ.battle.current();
    const rr = MQ.battle.answer(correctValue(qq));
    if (qq.golden) { goldXp = rr.xp; goldCoins = rr.coins; check(qq.enemyId === 'slime-golden' && qq.rare === true, 'ゴールデンスライムに 変わる'); }
    MQ.battle.next();
  }
  check(goldXp >= 30 && goldCoins === 1, 'ゴールデンは 3ばい＋コイン: ' + goldXp + ' / ' + goldCoins);
  check(MQ.battle.summary().coins === 2, 'summary の コイン（ゴールデン1＋★3の 1）: ' + MQ.battle.summary().coins);
  check(MQ.battle.canUse('tr-graph').ok === false && MQ.battle.canUse('tr-graph').why === 'つかった', '使った あとは グレー');
  startWith([it('tr-tenki', true)]);
  u = MQ.battle.useItem('tr-tenki');
  check(u.targets.length === 2, '金色は 2体');
  startWith([it('tr-graph')]);
  clearMobs(9);
  check(MQ.battle.canUse('tr-graph').why === 'ボスには つかえない', 'ボス戦では ゴールデンコールは 使えない');

  /* ---- たからばこ よび：つぎに たからばこが 出る（金色は コイン 2まい） ---- */
  startWith([it('tr-amari', true)]);
  const before = MQ.battle.mobTotal();
  u = MQ.battle.useItem('tr-amari');
  check(u.ok && MQ.battle.mobTotal() === before + 1 && u.at === 1, 'たからばこが 1つ ふえる');
  MQ.battle.answer(correctValue(MQ.battle.current()));
  MQ.battle.next();
  q = MQ.battle.current();
  check(q.chest === true && q.coins === 2, 'つぎは たからばこ（コイン 2まい）');
  r = MQ.battle.answer(correctValue(q));
  check(r.outcome === 'chest' && r.coins === 2, 'たからばこを 開けて コイン 2まい');
  // まとめて 出た 組の とちゅうなら 組の あとに 入る
  startWith([it('tr-amari')]);
  for (let i = 0; i < 9; i++) {
    const qq = MQ.battle.current();
    if (qq.groupId && qq.groupPos === 0) {
      const at = MQ.battle.useItem('tr-amari').at;
      check(at === MQ.battle.mobIndex() + qq.groupSize, 'たからばこは 組の あとに 入る: ' + at);
      break;
    }
    MQ.battle.answer(correctValue(qq)); MQ.battle.next();
  }

  /* ---- パワーアップ：けいけんち 1.5ばい（金色 2ばい） ---- */
  startWith([it('tr-kake'), it('tr-en', true)]);
  MQ.battle.useItem('tr-kake');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.xp === 15, 'パワーアップ 1.5ばい: ' + r.xp);
  MQ.battle.next();
  MQ.battle.useItem('tr-en');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.xp === 20, '金色の パワーアップ 2ばい: ' + r.xp);

  /* ---- ひっさつ チャージ：コンボ ＋3 → つぎの 正解は クリティカル ---- */
  startWith([it('tr-omosa')]);
  u = MQ.battle.useItem('tr-omosa');
  check(u.combo === 3 && MQ.battle.combo() === 3, 'チャージで コンボ 3');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.crit === true && r.combo === 4 && r.xp === 15, 'チャージの あとは クリティカル: ' + r.xp);

  /* =======================================================
     v5.4 で ふえた 5つの わざ
     ======================================================= */
  const PAL = { id: 'slime-green', name: 'みどりん' };

  /* ---- きずなの わ：なかまゲージが 早く たまる（相棒が いる ときだけ） ---- */
  startWith([it('tr-nagasa')]);
  check(MQ.battle.canUse('tr-nagasa').why === 'なかまが いない', '相棒が いないと きずなの わは 使えない');
  startWith([it('tr-nagasa')], { pal: PAL });
  u = MQ.battle.useItem('tr-nagasa');
  check(u.ok && u.power === 'bond' && MQ.battle.buffs().palPlus === 1, 'きずなの わを 使う');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(MQ.battle.palGauge() === 2, '1問で ゲージ 2つ: ' + MQ.battle.palGauge());
  MQ.battle.next();
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.palHit === true, '2問で 追い打ち（ふつうは 3問）');

  /* ---- コンボの まきもの：コンボが ＋1 ずつ 多く たまる ---- */
  startWith([it('tr-kaki')]);
  MQ.battle.useItem('tr-kaki');
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.combo === 2, 'まきもので 1問め から コンボ 2: ' + r.combo);
  MQ.battle.next();
  r = MQ.battle.answer(correctValue(MQ.battle.current()));
  check(r.combo === 4 && r.crit === true, '2問めで コンボ 4: ' + r.combo);
  check(MQ.battle.summary().maxCombo === 4, 'さいだいコンボにも 入る');

  /* ---- たからの コンパス：コインが その場で ---- */
  startWith([it('tr-chizu', true)]);
  u = MQ.battle.useItem('tr-chizu');
  check(u.ok && u.coins === 3, '金色の コンパスは コイン 3まい: ' + u.coins);
  MQ.battle.answer(correctValue(MQ.battle.current()));
  check(MQ.battle.summary().coins >= 3, 'summary の コインに 入る');

  /* ---- はやての はね：はやとき ボーナスが かならず ---- */
  startWith([]);
  MQ.battle.answer(correctValue(MQ.battle.current()));
  const slowSum = MQ.battle.summary();
  startWith([it('tr-mushi')]);
  MQ.battle.useItem('tr-mushi');
  MQ.battle.answer(correctValue(MQ.battle.current()));
  check(MQ.battle.summary().fastBonus === 30, 'はやての はねで ボーナス 30: ' + MQ.battle.summary().fastBonus);
  check(typeof slowSum.fastBonus === 'number', 'ふつうの はやときも これまでどおり');

  /* ---- なかまの くすり：相棒の けいけんちが ばいに ---- */
  startWith([it('tr-iro')]);
  check(MQ.battle.canUse('tr-iro').why === 'なかまが いない', '相棒が いないと くすりは 使えない');
  startWith([it('tr-iro', true)], { pal: PAL });
  u = MQ.battle.useItem('tr-iro');
  check(u.ok && u.power === 'elixir', 'なかまの くすりを 使う');
  MQ.battle.answer(correctValue(MQ.battle.current()));
  check(MQ.battle.summary().palXpMul === 3, '金色は 相棒の けいけんち 3ばい: ' + MQ.battle.summary().palXpMul);

  /* =======================================================
     そうびの 効果（v5.4）。gear を わたした ときだけ 効く
     ======================================================= */
  (function () {
    const one = function (slot, grade) { const o = {}; o[slot] = grade + '-' + slot; return MQ.hero.gearPower({ equipped: o }); };
    // けん：正解 1もんごとに けいけんち ＋
    startWith([], { gear: one('weapon', 'yami') });
    let rr = MQ.battle.answer(correctValue(MQ.battle.current()));
    check(rr.xp === 20, 'やみの 大けんで ザコ 10 → 20: ' + rr.xp);
    // たて：はじめから セーフ
    startWith([], { gear: one('shield', 'kihon') });
    check(MQ.battle.buffs().shield === 1, 'かわの たてで セーフ 1回');
    const qq = MQ.battle.current();
    MQ.battle.answer(wrongValue(qq));
    check(MQ.battle.answer(wrongValue(qq)).outcome === 'shielded', 'たてが まもる');
    // よろい：はじめから コンボを まもる
    startWith([], { gear: one('armor', 'ryu') });
    check(MQ.battle.buffs().freeze === 2, 'りゅうの よろいで コンボを 2回 まもる');
    // かぶと：ひっさつが 早い（core は 数だけ、絵は ui）
    startWith([], { gear: one('helm', 'densetsu') });
    check(MQ.battle.specialBoost() === 2, 'でんせつの かぶとで 2コンボ 早い');
    // マント：おわりに コイン
    startWith([], { gear: one('cape', 'yami') });
    clearMobs(9);
    while (!MQ.battle.isOver()) { const x = MQ.battle.answer(correctValue(MQ.battle.current())); if (!x.defeated && !x.fled) MQ.battle.next(); }
    check(MQ.battle.summary().gearCoins === 3, 'やみの マントで コイン ＋3');
    // セット：けいけんちが ふえる
    const setEq = {}; MQ.hero.slots.forEach(function (slot) { setEq[slot] = 'kihon-' + slot; });
    startWith([], { gear: MQ.hero.gearPower({ equipped: setEq }) });
    rr = MQ.battle.answer(correctValue(MQ.battle.current()));
    check(rr.xp === 12, 'かわ 一式（10＋けん1）×1.1 = 12: ' + rr.xp);
    check(MQ.battle.summary().gearSet === 'かわ', 'summary に セットの 名前');
    // タイムアタックでは たて・よろいは 効かない（きろくの 公平さ）
    startWith([], { gear: MQ.hero.gearPower({ equipped: setEq }), timeAttack: 20 });
    check(MQ.battle.buffs().shield === 0 && MQ.battle.buffs().freeze === 0, 'タイムアタックでは たて・よろいは なし');
    // とっくんに マントの コインは ない
    MQ.battle.start({ stage: stK, mode: 'tokkun', gear: one('cape', 'yami'), escaped: [{ key: 'z8', q: { id: 'z8', type: 'number', prompt: '1+1は？', answer: 2, unit: 'テスト' }, enemyId: 'slime-green', areaId: 'kokugo' }] });
    MQ.battle.answer(2);
    check(MQ.battle.summary().gearCoins === 0, 'とっくんに マントの コインは ない');
  })();

  /* ---- タイムアタックでは 使えない ---- */
  startWith([it('tr-wari')], { timeAttack: 20 });
  check(MQ.battle.items().length === 0 && MQ.battle.useItem('tr-wari').ok === false, 'タイムアタックでは どうぐなし');

  /* ---- items() の 状態 ---- */
  startWith([it('tr-wari'), it('tr-graph')]);
  clearMobs(9);
  const st = MQ.battle.items();
  check(st.length === 2 && st[0].can === true && st[1].can === false && st[1].why === 'ボスには つかえない', 'items() の 使える／使えない');

  /* ---- 第2段階：ボスの コインと ★3の コイン ---- */
  startWith([]);
  clearMobs(9);
  while (!MQ.battle.isOver()) {
    const rr = MQ.battle.answer(correctValue(MQ.battle.current()));
    if (rr.defeated) check(rr.coins === 1, 'ボス討伐で コイン +1');
    if (!rr.defeated && !rr.fled) MQ.battle.next();
  }
  sum2 = MQ.battle.summary();
  check(sum2.stars === 3 && sum2.coins === 2 && sum2.starCoins === 1, 'ボスの 1＋★3の 1: ' + sum2.coins);
  // ★3で なければ ボスの ぶんだけ
  startWith([]);
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q)); MQ.battle.answer(wrongValue(q)); MQ.battle.next();
  for (let i = 1; i < 9; i++) { MQ.battle.answer(correctValue(MQ.battle.current())); MQ.battle.next(); }
  while (!MQ.battle.isOver()) { const rr = MQ.battle.answer(correctValue(MQ.battle.current())); if (!rr.defeated && !rr.fled) MQ.battle.next(); }
  sum2 = MQ.battle.summary();
  check(sum2.stars < 3 && sum2.coins === 1 && sum2.starCoins === 0, '★3じゃなければ ボスの 1まいだけ: ' + sum2.coins);
  // とっくんに ★コインは ない
  MQ.battle.start({ stage: stK, mode: 'tokkun', escaped: [{ key: 'z9', q: { id: 'z9', type: 'number', prompt: '1+1は？', answer: 2, unit: 'テスト' }, enemyId: 'slime-green', areaId: 'kokugo' }] });
  MQ.battle.answer(2);
  check(MQ.battle.summary().starCoins === 0, 'とっくんに ★3の コインは ない');

  /* ---- 第2段階：じゅうてん（コイン 2まいで もう1回・1たたかいに 1回） ---- */
  startWith([it('tr-wari'), it('tr-kake')], { coins: 5 });
  check(MQ.battle.coinsLeft() === 5, 'さいふ 5まい: ' + MQ.battle.coinsLeft());
  check(MQ.battle.canRecharge('tr-wari').why === 'まだ つかえる', 'つかう 前は じゅうてんできない');
  MQ.battle.useItem('tr-wari');
  check(MQ.battle.items()[0].reOk === true, 'つかいおわったら じゅうてんできる');
  let rc = MQ.battle.recharge('tr-wari');
  check(rc.ok && rc.spent === 2 && MQ.battle.coinsLeft() === 3, 'コイン2まいで じゅうてん: ' + MQ.battle.coinsLeft());
  check(MQ.battle.useItem('tr-wari').ok === true, 'じゅうてんしたら もう1回 つかえる');
  MQ.battle.useItem('tr-kake');
  check(MQ.battle.canRecharge('tr-kake').why === '1たたかいに 1回', 'じゅうてんは 1たたかいに 1回');
  check(MQ.battle.summary().coinsSpent === 2, 'つかった コインが summary に 入る');
  // コインが たりない とき
  startWith([it('tr-wari')], { coins: 1 });
  MQ.battle.useItem('tr-wari');
  check(MQ.battle.canRecharge('tr-wari').why === 'コインが たりない', 'コインが たりないと じゅうてんできない');
  // ボス戦では ザコ用の アイテムは じゅうてんできない
  startWith([it('tr-graph')], { coins: 9 });
  MQ.battle.useItem('tr-graph');
  clearMobs(9);
  check(MQ.battle.canRecharge('tr-graph').why === 'ボスには つかえない', 'ボス戦で ゴールデンコールは じゅうてんできない');
  // タイムアタックには アイテムじたいが ない
  startWith([it('tr-wari')], { coins: 9, timeAttack: 20 });
  check(MQ.battle.recharge('tr-wari').ok === false, 'タイムアタックでは じゅうてんも なし');

  /* ---- もちものの セーブ：持っている ものだけ、あきは 自動で うまる ---- */
  MQ.save.update(function (pl) { pl.treasure = { 'tr-kake': 1, 'tr-wari': 2, 'tr-jikoku': 1, 'tr-yomi': 1 }; pl.bag = ['tr-yomi', 'tr-nope', 'tr-yomi']; });
  MQ.save.importText(MQ.save.exportText());
  const mb = MQ.save.current();
  check(JSON.stringify(mb.bag) === JSON.stringify(['tr-yomi', 'tr-kake', 'tr-wari']), 'もちもの: ' + JSON.stringify(mb.bag));
  check(MQ.save.BAG_MAX === 3, 'もちものは 3つまで');
})();

/* ---- がくねん（v2.1 えらぶ画面／v2.2 小1が あそべる） ---- */
check(MQ.content.worlds.length === 6, 'ワールドは 6つ: ' + MQ.content.worlds.length);
check(MQ.content.worlds.filter(function (w) { return !w.locked; }).length === 5, 'あそべる ワールドは 小1〜小5（v6.5）');
check(MQ.content.worldForGrade(3).id === 'g3' && MQ.content.worldForGrade(1).id === 'g1' && !MQ.content.worldForGrade(1).locked, 'worldForGrade');
check(MQ.content.worldForGrade(2).id === 'g2' && !MQ.content.worldForGrade(2).locked, '小2は あそべる');
check(!MQ.content.worldForGrade(4).locked, '小4は あそべる');
check(!MQ.content.worldForGrade(5).locked && MQ.content.worldForGrade(5).areas[0].stages.length === 18, '小5は あそべる（算数 18ステージ・v6.5）');
check(MQ.content.worldForGrade(6).locked === true, '小6 は じゅんびちゅう');
(function () {
  MQ.save.createPlayer('小1テスト', null, 1);
  check(MQ.content.activeWorld().id === 'g1', 'がくねん 1 の プレイヤーは 小1ワールド: ' + MQ.content.activeWorld().id);
  check(MQ.content.subjectAreas().length === 2 && MQ.content.hasTower(), '小1は 2教科＋さいごの とう（v6.4）');
  check(MQ.content.towerName() === 'さいごの とう' && MQ.content.lastBoss().id === 'boss-obake' && MQ.content.towerStageId() === 'tower1', '小1の 塔: ' + MQ.content.towerName() + ' / ' + MQ.content.lastBoss().name);
  check(MQ.content.areaOf('sansu').name === 'さんすうの やま' && MQ.content.areaOf('eigo').id === 'eigo', '小1の areaOf（ほかの 学年の エリアも 見つかる）');
  check(MQ.content.towerOpen(MQ.save.current()) === false, '小1では 塔は 開かない');
  MQ.save.createPlayer('小2テスト', null, 2);
  check(MQ.content.activeWorld().id === 'g2' && MQ.content.subjectAreas()[0].stages.length === 14, 'がくねん 2 の プレイヤーは 小2ワールド');
  MQ.save.createPlayer('小4テスト', null, 4);
  check(MQ.content.activeWorld().id === 'g4' && MQ.content.subjectAreas().length === 5 && MQ.content.hasTower(), 'がくねん 4 の プレイヤーは 小4ワールド（5エリア＋さいごの塔）');
  check(MQ.content.areaOf('rika').name === '理科の 湖' && MQ.content.areaOf('shakai').name === '社会の 町', '小4は 理科と 社会が べつの エリア');
  MQ.save.createPlayer('小5テスト', null, 5);
  check(MQ.content.activeWorld().id === 'g5', 'がくねん 5 の プレイヤーは 小5ワールド（v6.5）: ' + MQ.content.activeWorld().id);
  MQ.save.createPlayer('小6テスト', null, 6);
  check(MQ.content.activeWorld().id === 'g3', 'まだ 開いていない がくねん（小6）は 小3 に たおす');
  MQ.content.setActive(MQ.content.world1);
  check(MQ.content.subjectAreas().length === 2, 'setActive で 決めうち');
  MQ.content.setActive(null);

  /* ---- 学年を いつでも 変えられる（v4.5・予習復習） ---- */
  const gp = MQ.save.createPlayer('切りかえテスト', null, 3);
  check(gp.playGrade === 3, 'あそぶ 学年は はじめ 学校の 学年と 同じ: ' + gp.playGrade);
  check(MQ.content.activeWorld().id === 'g3', 'はじめは 小3ワールド');
  check(MQ.save.setPlayGrade(2) === true, '小2に 変えられる');
  check(MQ.content.activeWorld().id === 'g2', '小2ワールドに 変わる: ' + MQ.content.activeWorld().id);
  check(MQ.save.current().grade === 3, '学校の 学年は 変わらない');
  check(MQ.save.setPlayGrade(6) === false && MQ.content.activeWorld().id === 'g2', 'じゅんびちゅうの 学年（小6）には 変えられない');
  check(MQ.save.setPlayGrade(4) === true && MQ.content.activeWorld().id === 'g4', '小4（よしゅう）にも 変えられる');
  // ふくしゅう・よしゅう中は 学期で しぼらない
  MQ.save.update(function (pl) { pl.term = 1; pl.playGrade = 2; });
  check(MQ.terms.reviewing(MQ.save.current()) === true, 'ちがう 学年＝ふくしゅう中');
  check(MQ.terms.termOf(MQ.save.current()) === 0, 'ふくしゅう中は 学期で しぼらない');
  check(MQ.terms.settingTerm(MQ.save.current()) === 1, 'おうちの人ページには せっていが そのまま 出る');
  MQ.save.update(function (pl) { pl.playGrade = 3; });
  check(MQ.terms.termOf(MQ.save.current()) === 1, 'じぶんの 学年に もどると 学期が また かかる');
  // かけら・にげた敵は 学年ごとに 分かれる
  const q9 = { id: 'gx', type: 'number', prompt: '1+1は？', answer: 2, unit: 'テスト' };
  MQ.save.update(function (pl) { pl.escaped = {}; pl.frags = {}; MQ.save.addEscaped(pl, 'sansu', { key: 'g3a', q: q9, enemyId: 'slime-green' }); });
  check(MQ.save.countAllEscaped(MQ.save.current()) === 1, '小3で にげた敵 1体');
  MQ.save.setPlayGrade(2);
  check(MQ.save.countAllEscaped(MQ.save.current()) === 0, '小2では 小3の にげた敵は 出ない');
  MQ.save.update(function (pl) { MQ.save.addEscaped(pl, 'sansu', { key: 'g2a', q: q9, enemyId: 'slime-green' }); pl.frags[MQ.content.fragKey('sansu', pl)] = true; });
  check(MQ.save.countAllEscaped(MQ.save.current()) === 1, '小2の にげた敵は 小2で 出る');
  check(MQ.content.hasFrag(MQ.save.current(), 'sansu') === true, '小2の かけら');
  MQ.save.setPlayGrade(3);
  check(MQ.save.countAllEscaped(MQ.save.current()) === 1 && MQ.content.hasFrag(MQ.save.current(), 'sansu') === false,
    '小3に もどると 小3の ぶんだけ（かけらも 学年ごと）');
  // 古い セーブ（学年で 分けて いない）は その子の 学年の ぶんに なる
  MQ.save.update(function (pl) { pl.frags = { sansu: true, kokugo: true }; pl.escaped = { eigo: [{ key: 'z', q: q9, enemyId: 'slime-green' }] }; });
  MQ.save.load();
  const mig = MQ.save.current();
  check(!!mig.frags['g3:sansu'] && !!mig.frags['g3:kokugo'] && !mig.frags.sansu, '古い セーブの かけらは 小3の ぶんに なる: ' + Object.keys(mig.frags).join(','));
  check(!!mig.escaped['g3:eigo'], '古い セーブの にげた敵も 小3の ぶんに: ' + Object.keys(mig.escaped).join(','));
  MQ.save.deletePlayer(gp.id);
})();
/* ---- 主人公の なまえを かえる（v7.0） ---- */
(function () {
  const rp = MQ.save.createPlayer('なまえテスト', null, 3);
  check(MQ.save.setName('') === false && MQ.save.current().name === 'なまえテスト', 'からっぽでは 変わらない');
  check(MQ.save.setName('   ') === false && MQ.save.current().name === 'なまえテスト', '空白だけでも 変わらない');
  check(MQ.save.setName(' ゆうしゃ ') === true && MQ.save.current().name === 'ゆうしゃ', '前後の 空白は とる: ' + MQ.save.current().name);
  check(MQ.save.current().log[0].text.indexOf('なまえテスト は なまえを ゆうしゃ に') === 0, 'きろくに のこる: ' + MQ.save.current().log[0].text);
  check(MQ.save.setName('あいうえおかきくけこさしす') === true && MQ.save.current().name === 'あいうえおかきくけこ', '10文字まで: ' + MQ.save.current().name);
  MQ.save.load();
  check(MQ.save.current().name === 'あいうえおかきくけこ', '読み直しても のこる');
  MQ.save.deletePlayer(rp.id);
})();
/* ---- とくい・にがて（v7.1） ---- */
(function () {
  const sp = MQ.save.createPlayer('とくいテスト', null, 3);
  const st2 = MQ.content.findStage('sansu3-2').stage;
  // core：1問ごとの 結果
  MQ.battle.start({ stage: st2, mode: 'normal', escaped: [], enemies: MQ.enemies.pickIds('sansu', 9), bossId: 'boss-dragon', mobs: 9 });
  let q = MQ.battle.current();
  MQ.battle.answer(correctValue(q)); MQ.battle.next();
  q = MQ.battle.current();
  const wv = wrongValue(q);
  MQ.battle.answer(wv); MQ.battle.answer(correctValue(q)); MQ.battle.next();   // 2回目で 正解
  q = MQ.battle.current();
  MQ.battle.answer(wrongValue(q)); MQ.battle.answer(wrongValue(q)); MQ.battle.next();   // にげられた
  const rs = MQ.battle.summary().results;
  check(rs.length === 3, '3問の 結果: ' + rs.length);
  check(rs[0].ok === true && rs[0].given === null && rs[0].stageId === 'sansu3-2' && typeof rs[0].unit === 'string', '1回目で 正解 → ok');
  check(rs[1].ok === false && rs[1].given === MQ.battle.givenText(rs[1], wv) && rs[1].given.length > 0, '2回目で 正解 → ×・1回目の 答えを おぼえる: ' + rs[1].given);
  check(rs[2].ok === false && rs[2].answer.length > 0, 'にげられた → ×・正しい 答え: ' + rs[2].answer);
  check(MQ.battle.givenText({ type: 'choice', choices: ['あ', 'い'] }, 1) === 'い' && MQ.battle.givenText({ type: 'number' }, null) === 'じかんぎれ', 'givenText');
  // とっくん（れんしゅう）：リベンジ あつかいに しない・stageId を もつ
  const qs = st2.make(6, { boss: false });
  MQ.battle.start({ stage: st2, mode: 'tokkun', escaped: qs.map(function (x) { return { key: x.id, q: x, enemyId: 'slime-green', areaId: 'sansu', stageId: 'sansu3-2', revenge: false }; }) });
  check(MQ.battle.mobTotal() === 6 && MQ.battle.current().revenge === false && MQ.battle.current().stageId === 'sansu3-2', 'れんしゅうの とっくん: 6問・リベンジなし');
  // stats：ためる・はかる
  const mk = function (stageId, unit, pat) { return pat.split('').map(function (c, i) { return { stageId: stageId, unit: unit, type: 'number', ok: c === '1', given: c === '1' ? null : 'x', answer: 'y', prompt: '<span class="num">1</span><br><svg><text>9</text></svg> ' + unit + ' 問題' + i }; }); };
  MQ.save.update(function (p) {
    MQ.stats.record(p, { results: mk('sansu3-2', '秒', '0100').concat(mk('sansu3-2', '時間をもとめる', '100010')) });
    MQ.stats.record(p, { results: mk('sansu3-1', 'かけ算のきまり', '1111111111111111111111011') });   // 25問
    MQ.stats.record(p, { results: mk('kokugo3-1', 'かん字の読み', '111') });
  });
  const p2 = MQ.save.current();
  const m2 = MQ.stats.measure(p2.stats.rows['sansu3-2']);
  check(m2.n === 10 && m2.ok === 3 && m2.pct === 30 && m2.level === 'weak', 'sansu3-2 は 3/10 にがて: ' + JSON.stringify(m2));
  const m1 = MQ.stats.measure(p2.stats.rows['sansu3-1']);
  check(m1.n === 25 && m1.recentN === 20 && m1.recentOk === 19 && m1.pct === 95 && m1.level === 'good', 'さいきんは 20問まで: ' + JSON.stringify(m1));
  check(MQ.stats.measure(p2.stats.rows['kokugo3-1']).level === 'few', '5問みまんは まだ すこし');
  check(MQ.stats.measure(p2.stats.rows['sansu3-2|秒']).n === 4, 'こまかい 単元も ためる');
  check(p2.stats.wrong['sansu3-2'].length === 7 && p2.stats.wrong['sansu3-2'].every(function (w) { return w.miss === 1 && w.ok === 0; }), '落とした 問題 7つ（1回ずつ）: ' + p2.stats.wrong['sansu3-2'].length);
  check(p2.stats.wrong['sansu3-2'][0].p.indexOf('<') === -1 && p2.stats.wrong['sansu3-2'][0].p.indexOf('9') === -1 && p2.stats.wrong['sansu3-2'][0].p.indexOf('1 ') === 0, '問題文は 文字だけ（図は 落とす）: ' + p2.stats.wrong['sansu3-2'][0].p);
  MQ.save.update(function (p) { MQ.stats.record(p, { results: mk('sansu3-2', '秒', '000000000000') }); });   // 秒の 問題0〜11 を 落とす（0・2・3 は 2回目）
  const w2 = MQ.save.current().stats.wrong['sansu3-2'];
  check(w2.length === 16 && w2[0].miss === 2 && w2.filter(function (w) { return w.miss === 2; }).length === 3 && w2[0].u === '秒', '同じ 問題文は まとめて 回数（多い 順）: ' + w2.length + ' ' + JSON.stringify(w2[0]));
  MQ.save.update(function (p) { MQ.stats.record(p, { results: mk('sansu3-2', '秒', '1000000000000000000000000000000') }); });   // 問題0 に 正解・問題1〜30 を 落とす
  const w3 = MQ.save.current().stats.wrong['sansu3-2'];
  const w30 = w3.filter(function (w) { return w.p === '1 秒 問題0'; })[0];
  check(w3.length === MQ.stats.WRONG_MAX && w3[0].miss === 3 && w30 && w30.ok === 1 && w30.miss === 2, '落とした 問題は ' + MQ.stats.WRONG_MAX + '問まで・正解した 回数も 数える: ' + w3.length + ' ' + JSON.stringify(w3[0]) + ' ' + JSON.stringify(w30));
  check(MQ.stats.countText(w30) === 'まちがい 2回・正解 1回', 'countText: ' + MQ.stats.countText(w30));
  const ov = MQ.stats.overview(MQ.save.current(), 3);
  const sansu = ov.areas.filter(function (a) { return a.id === 'sansu'; })[0];
  check(!!sansu && sansu.stages.length === 18 && ov.areas.filter(function (a) { return a.id === 'tower'; }).length === 0, '小3の 一覧：算数 18・塔なし');
  const s2 = sansu.stages.filter(function (s) { return s.id === 'sansu3-2'; })[0];
  check(s2.units.length === 2 && s2.units[0].unit === '秒' && s2.wrong.length === MQ.stats.WRONG_MAX, '行に こまかい 単元（にがて 順）と 落とした 問題');
  check(sansu.stages.filter(function (s) { return s.id === 'sansu3-5'; })[0].level === 'none', 'やって いない ステージは まだ');
  const wk = MQ.stats.weakest(MQ.save.current(), 3, 3);
  check(wk.length === 1 && wk[0].id === 'sansu3-2', 'にがて トップ：sansu3-2 だけ（5問みまん・70%いじょうは 入らない）: ' + wk.map(function (s) { return s.id; }).join(','));
  check(MQ.stats.gradesWithData(MQ.save.current()).join(',') === '3', 'データの ある 学年: ' + MQ.stats.gradesWithData(MQ.save.current()).join(','));
  const txt = MQ.stats.summaryText(MQ.save.current(), 3);
  check(txt.indexOf('とくいテスト') > 0 && txt.indexOf('【算数') > 0 && txt.indexOf('△') > 0 && txt.indexOf('◎') > 0, '文字の まとめ');
  check(MQ.stats.overview({ }, 3).played === 0 && MQ.stats.summaryText({ name: 'x' }, 3).indexOf('まだ') > 0, '記ろくなし');
  check(MQ.stats.levelOf(85, 5) === 'good' && MQ.stats.levelOf(84, 5) === 'mid' && MQ.stats.levelOf(59, 5) === 'weak' && MQ.stats.levelOf(100, 4) === 'few', 'しきい値');
  MQ.save.deletePlayer(sp.id);
})();
/* ---- 期間・日ごと・成長（v7.3・おうちの人ページ） ---- */
(function () {
  const sp = MQ.save.createPlayer('期間テスト', null, 3);
  const S = MQ.stats;
  const mk = function (stageId, unit, pat, sec) { return pat.split('').map(function (c, i) { return { stageId: stageId, unit: unit, type: 'number', ok: c === '1', given: c === '1' ? null : 'x', answer: 'y', prompt: unit + ' 問題' + i, sec: sec || 10 }; }); };
  // 2026-09-05 は 土曜。今週＝8/30（日）〜9/5、先週＝8/23〜8/29
  S.setNow(new Date(2026, 7, 25)); MQ.save.update(function (p) { S.record(p, { results: mk('sansu3-1', 'a', '1111100000', 20) }); });
  S.setNow(new Date(2026, 8, 1));  MQ.save.update(function (p) { S.record(p, { results: mk('sansu3-1', 'a', '11111111', 10) }); });
  S.setNow(new Date(2026, 8, 5));  MQ.save.update(function (p) { S.record(p, { results: mk('sansu3-2', 'b', '1100', 10) }); });
  const p = MQ.save.current();
  check(Object.keys(p.stats.days).length === 3 && p.stats.days['2026-09-05'].u['sansu3-2'][1] === 4, '日ごとの 記録 3日: ' + Object.keys(p.stats.days).join(','));
  const w = S.period(p, 'week');
  check(w.n === 12 && w.ok === 10 && w.pct === 83 && w.days === 2 && w.daysTotal === 7 && w.label === '8/30 – 9/5', '今週: ' + JSON.stringify([w.n, w.ok, w.pct, w.days, w.label]));
  check(w.prev.n === 10 && w.prev.pct === 50 && w.deltaN === 2 && w.deltaPct === 33, '先週と くらべる: ' + JSON.stringify(w.prev));
  check(w.dots.length === 7 && w.dots.filter(function (d) { return d.on; }).length === 2 && w.dots[6].on === true && w.dots[6].future === false, '曜日の 点');
  check(w.avgSec === 10 && w.prev.avgSec === 20, '1問の 時間 ' + w.avgSec + '/' + w.prev.avgSec);
  const m = S.period(p, 'month'); check(m.n === 12 && m.prev.n === 10 && m.label === '9月', '今月: ' + JSON.stringify([m.n, m.prev.n, m.label]));
  const a = S.period(p, 'all'); check(a.n === 22 && a.days === 3 && a.prev === null, 'すべて');
  const d = S.daily(p, 14); check(d.length === 14 && d[13].today && d[13].n === 4 && d[9].n === 8 && d[0].n === 0, '14日: ' + d.map(function (x) { return x.n; }).join(','));
  const wk = S.weekly(p, 8); check(wk.length === 8 && wk[7].current && wk[7].pct === 83 && wk[6].pct === 50 && wk[0].pct === null, '8週: ' + wk.map(function (x) { return x.pct; }).join(','));
  const g = S.growth(p, 3);
  check(g.weeksWithData === 2 && g.first.pct === 50 && g.last.pct === 83 && g.delta === 33 && g.secNow === 10 && g.secPrev === 20, '成長: ' + JSON.stringify([g.first.pct, g.last.pct, g.delta, g.secNow, g.secPrev]));
  check(g.masteredNow === 0 && g.masteredPrev === 0, '身についた 単元（まだ 0）');
  const imp = S.improved(p, 3, 2); check(imp.length === 1 && imp[0].id === 'sansu3-1' && imp[0].pctNow === 100 && imp[0].pctPrev === 50, 'のびた: ' + JSON.stringify(imp));
  const rp = S.report(p, 3); check(rp.rows.length === 2 && rp.wrong.length >= 1 && rp.notes.length >= 1 && rp.period.n === 12, 'レポート: ' + rp.notes.join('/'));
  S.setNow(new Date(2026, 6, 20)); MQ.save.update(function (p2) { S.record(p2, { results: mk('kokugo3-1', 'c', '11111', 10) }); });
  check(S.masteredCount(MQ.save.current(), 3, new Date(2026, 7, 6)) === 1, '30日前に 身について いた 単元（kokugo3-1）');
  S.setNow(null);
  check(MQ.save.setGrade(6) === false && MQ.save.setGrade(2) === true && MQ.save.current().grade === 2 && MQ.save.current().playGrade === 2 && MQ.save.current().term === 0, 'setGrade');
  MQ.save.deletePlayer(sp.id);
})();
(function () {
  const gp = MQ.save.createPlayer('がくねんテスト', null, 3);
  check(gp.grade === 3, 'つくった プレイヤーに がくねんが 入る');
  MQ.save.update(function (pl) { delete pl.grade; });
  MQ.save.importText(MQ.save.exportText());
  check(MQ.save.current().grade === 3, 'がくねんの ない 古い セーブは 小3 に なる');
})();

/* ---- セーブの 引きつぎ（v1.1の データでも 動く） ---- */
// ---- かん字の はんてい（v2.9）：形の 特徴が「同じ形は 高く・ちがう形は 低く」なるか（DOM なし） ----
(function () {
  const HW = MQ.handwrite;
  function shape(w, hh, lines) {
    const a = new Uint8Array(w * hh); let n = 0;
    lines.forEach(function (L) { for (let y = L[1]; y <= L[3]; y++) for (let x = L[0]; x <= L[2]; x++) { if (!a[y * w + x]) { a[y * w + x] = 1; n++; } } });
    return { w: w, h: hh, a: a, n: n };
  }
  // 十（たて＋よこ）／口（四角）／一（よこの 線）／T
  const plus = shape(80, 80, [[38, 10, 42, 70], [10, 38, 70, 42]]);
  const plus2 = shape(120, 100, [[58, 20, 64, 85], [20, 50, 100, 56]]);   // 大きさ・場所・たてよこ が ちがう 十
  const box = shape(80, 80, [[10, 10, 70, 14], [10, 66, 70, 70], [10, 10, 14, 70], [66, 10, 70, 70]]);
  const bar = shape(80, 80, [[8, 38, 72, 42]]);
  const tee = shape(80, 80, [[10, 10, 70, 14], [38, 10, 42, 70]]);
  const np = HW.normalize(plus), np2 = HW.normalize(plus2), nb = HW.normalize(box), nbar = HW.normalize(bar), nt = HW.normalize(tee);
  check(np && Math.abs(np.aspect - 1) < 0.05 && nbar.aspect < 0.1, 'handwrite: たてよこ ' + (np && np.aspect) + ' ' + nbar.aspect);
  const fp = HW.features(np.g), fp2 = HW.features(np2.g), fb = HW.features(nb.g), ft = HW.features(nt.g);
  const same = HW.compare(fp, fp).score, moved = HW.compare(fp, fp2).score, diffBox = HW.compare(fp, fb).score, diffT = HW.compare(fp, ft).score;
  check(same > 0.999, 'handwrite: 同じ形 = 1 (' + same.toFixed(3) + ')');
  check(moved > 0.9, 'handwrite: 大きさ・場所が ちがっても 同じ形は 高い (' + moved.toFixed(3) + ')');
  check(diffBox < moved - 0.15 && diffT < moved - 0.08, 'handwrite: ちがう形は 低い box=' + diffBox.toFixed(3) + ' T=' + diffT.toFixed(3) + ' vs ' + moved.toFixed(3));
  // ぬりつぶし
  const blob = shape(80, 80, [[10, 10, 70, 70]]);
  check(HW.normalize(blob).fill > 0.95, 'handwrite: ぬりつぶし fill');
  // 細い 線を ふとらせる
  const thin = HW.normalize(shape(80, 80, [[39, 10, 40, 70], [10, 39, 70, 40]]));
  const thick = HW.matchThickness(thin.g, 0.3);
  check(HW.fillOf(thick) > HW.fillOf(thin.g) * 1.5, 'handwrite: matchThickness');
  check(HW.thresholds().ok > HW.thresholds().ng, 'handwrite: しきい値');
})();

// ---- きょうの ミッション（v3.1）と リベンジの 出番 ----
(function () {
  const M = MQ.missions;
  M.setNow(new Date(2026, 8, 5));
  const p = MQ.save.current();
  const ms = M.ensure(p);
  check(ms && ms.day === '2026-9-5' && ms.list.length === 3, 'missions: きょうの 3つ');
  const groups = ms.list.map(function (m) { return M.KINDS.filter(function (k) { return k.id === m.id; })[0].group; });
  check(groups.join('') === 'abc', 'missions: a/b/c から 1つずつ ' + groups.join(''));
  check(ms.list.every(function (m) { return typeof m.text === 'string' && m.text.length > 3 && m.target >= 1 && !m.done; }), 'missions: 文と 目あて');
  check(M.ensure(p) === ms, 'missions: 同じ日は 作り直さない');
  // 決めた 3つで 進める
  p.missions = { day: M.dayKey(), claimedAll: false, list: [
    { id: 'battle', target: 2, count: 0, done: false, text: 'x' }, { id: 'correct', target: 15, count: 0, done: false, text: 'y' }, { id: 'combo', target: 5, count: 0, done: false, text: 'z' }
  ] };
  const coins0 = p.coins, xp0 = p.xp;
  const r1 = M.progress(p, { mode: 'normal', correct: 9, total: 12, maxCombo: 3, bossBeaten: true }, { areaId: 'sansu' });
  check(r1.completed.length === 0 && p.missions.list[0].count === 1 && p.missions.list[1].count === 9 && p.coins === coins0, 'missions: 途中 ' + JSON.stringify(p.missions.list.map(function (m) { return m.count; })));
  const r2 = M.progress(p, { mode: 'normal', correct: 8, total: 12, maxCombo: 6 }, { areaId: 'sansu' });
  check(r2.completed.length === 3 && r2.allDone && r2.coins === 3 * M.REWARD_EACH + M.REWARD_ALL_COINS && r2.xp === M.REWARD_ALL_XP, 'missions: 3つ クリア ' + JSON.stringify(r2));
  check(p.coins === coins0 + 5 && p.xp === xp0 + M.REWARD_ALL_XP && p.missionsDone === 3 && p.missionDays === 1, 'missions: ごほうびが 入る');
  const r3 = M.progress(p, { mode: 'normal', correct: 12, total: 12, maxCombo: 12 }, { areaId: 'sansu' });
  check(r3.completed.length === 0 && r3.coins === 0 && !r3.allDone, 'missions: 2回目は もらえない');
  // 日が 変わると 作り直す
  M.setNow(new Date(2026, 8, 6));
  const ms2 = M.ensure(p);
  check(ms2.day === '2026-9-6' && ms2.list.every(function (m) { return !m.done && m.count === 0; }), 'missions: つぎの日');
  // かん字・とっくん・エリア・アイテム の 数え方
  p.missions = { day: M.dayKey(), claimedAll: false, list: [
    { id: 'write', target: 2, count: 0, done: false, text: 'w' }, { id: 'area', target: 1, count: 0, done: false, text: 'a', param: 'kokugo' }, { id: 'tokkun', target: 1, count: 0, done: false, text: 't' }
  ] };
  M.progress(p, { mode: 'normal', correct: 5, total: 12, typeOk: { write: 1 } }, { areaId: 'sansu' });
  check(p.missions.list[0].count === 1 && p.missions.list[1].count === 0 && p.missions.list[2].count === 0, 'missions: かん字 1・エリア ちがい');
  M.progress(p, { mode: 'tokkun', correct: 3, total: 3, typeOk: { write: 2 } }, { areaId: null });
  check(p.missions.list[0].done && p.missions.list[2].done && !p.missions.list[1].done, 'missions: かん字 2・とっくん');
  M.progress(p, { mode: 'normal', correct: 1, total: 12 }, { areaId: 'kokugo' });
  check(p.missions.list[1].done && p.missions.claimedAll, 'missions: エリア → ぜんぶ');
  M.setNow(null);
  // 出せない ものは 出ない（にげた敵 0 → revenge/tokkun なし・アイテム 0 → item なし）
  const p0 = { grade: 3, bag: [], escaped: {}, coins: 0, xp: 0 };   // にげた敵 0・アイテム 0 の 子
  let bad = 0;
  for (let i = 0; i < 40; i++) M.generate(p0).forEach(function (m) { if (m.id === 'revenge' || m.id === 'tokkun' || m.id === 'item') bad++; });
  check(bad === 0, 'missions: できない ミッションは 出ない ' + bad);
  // リベンジの 出番：にげた その日は 出ない・1日 たてば 出る・at が ない 古い entry は 出る
  const q = { type: 'number', prompt: '1+1', answer: 2 };
  MQ.save.addEscaped(p0, 'sansu', { key: 'a', q: q, enemyId: 'slime-green', at: new Date().toISOString() });
  MQ.save.addEscaped(p0, 'sansu', { key: 'b', q: q, enemyId: 'slime-green', at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() });
  MQ.save.addEscaped(p0, 'sansu', { key: 'c', q: q, enemyId: 'slime-green' });
  const ready = MQ.save.revengeReady(p0, 'sansu').map(function (e) { return e.key; }).sort().join('');
  check(ready === 'bc' && MQ.save.countEscaped(p0, 'sansu') === 3, 'revenge: 出番 ' + ready);
  check(MQ.battle.XP.revenge === 15, 'revenge: ボーナス 15');
})();

// ---- 画数の 表（v2.9）と 線の ならびの ルール ----
(function () {
  const K = MQ.kakusu, HW = MQ.handwrite;
  check(Object.keys(K.table).filter(function (k) { return /[一-龠]/.test(k); }).length === 837, 'kakusu: かん字 837字（小5 178字 ふくむ） (' + K.count() + ' entries)');
  (function () {
    const per = { 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.keys(K.grades).forEach(function (k) { per[K.grades[k]]++; });
    check(per[1] === 80 && per[2] === 160 && per[3] === 200 && per[4] === 219,
      'kakusu: 学年ごとの 字数 ' + JSON.stringify(per));
    // 小4の 画数表と kokugo4 の かん字が ぴったり 同じ
    const k4 = new Set();
    MQ.kokugo4.kanji.forEach(function (e) { (String(e.k).match(/[一-龠]/g) || []).forEach(function (c) { if (!K.upTo(c, 3)) k4.add(c); }); });
    const inTable = Object.keys(K.grades).filter(function (c) { return K.grades[c] === 4; });
    const missing = inTable.filter(function (c) { return !k4.has(c); });
    const extra = [...k4].filter(function (c) { return K.grades[c] !== 4; });
    check(!missing.length && !extra.length, 'kakusu の 小4は kokugo4 と 同じ（あまり ' + missing.join('') + ' / たりない ' + extra.join('') + '）');
    check(K.ofWord('成長') === 14 && K.ofWord('機会') === 22, 'kakusu: 小4の ことばの 画数 ' + K.ofWord('成長') + ' ' + K.ofWord('機会'));
  })();
  const miss = [];
  // 表の k は「一つ」「大きい」のような ことば（送りがなつき）→ かん字の 字だけ 見る
  MQ.kokugo1.kanji.concat(MQ.kokugo2.kanji).forEach(function (k) { String(k.k).split('').forEach(function (ch) { if (/[一-龠]/.test(ch) && !K.has(ch)) miss.push(ch); }); });
  MQ.kokugo3.questions.filter(function (q) { return q.stage === 2 && /「([^」]+)」を かん字で/.test(q.text); }).forEach(function (q) {
    String(q.choices[0]).split('').forEach(function (ch) { if (/[一-龠]/.test(ch) && !K.has(ch)) miss.push(ch); });
  });
  check(!miss.length, 'kakusu: 表に ない かん字 ' + miss.join(''));
  check(K.ofWord('花火') === 11 && K.ofWord('学校') === 18 && K.ofWord('大きい') === 9 && K.ofWord('が') === 5, 'kakusu: ofWord ' + K.ofWord('花火') + ' ' + K.ofWord('学校') + ' ' + K.ofWord('大きい') + ' ' + K.ofWord('が'));
  let bad = 0;
  Object.keys(K.table).forEach(function (k) { if (K.table[k] < 1 || K.table[k] > 20) bad++; });
  check(!bad, 'kakusu: 画数の 範囲');
  check(K.of('一') === 1 && K.of('森') === 12 && K.of('曜') === 18 && K.of('題') === 18 && K.of('氷') === 5, 'kakusu: 例');
  function line(a, b, n) { const p = []; for (let i = 0; i <= n; i++) p.push({ x: a[0] + (b[0] - a[0]) * i / n, y: a[1] + (b[1] - a[1]) * i / n }); return p; }
  const yama = [line([60, 20], [60, 120], 20), line([20, 40], [20, 120], 16).concat(line([20, 120], [100, 120], 16)), line([100, 40], [100, 120], 16)];
  const s1 = HW.pathStats(yama);
  check(s1.strokes === 3 && s1.sharpMax === 1 && s1.sharpTotal === 1, 'handwrite: 山の 線 ' + JSON.stringify(s1));
  const zig = [[]];
  for (let i = 0; i <= 8; i++) zig[0].push({ x: 20 + i * 15, y: i % 2 ? 100 : 20 });
  const s2 = HW.pathStats(zig);
  check(s2.strokes === 1 && s2.sharpMax >= 6, 'handwrite: ジグザグ ' + JSON.stringify(s2));
  check(!HW.pathRules(yama, '山'), 'handwrite: 山 は 通る');
  check((HW.pathRules(zig, '山') || {}).reason === 'scribble', 'handwrite: ジグザグ は scribble');
  check((HW.pathRules([yama[0]], '森') || {}).reason === 'strokes', 'handwrite: 森 を 1画 は strokes');
  check(!HW.pathRules([yama[0]], '一') && !HW.pathRules([yama[0], yama[2]], '山'), 'handwrite: 一 を 1画・山 を 2画 は 通る');
  const many = []; for (let i = 0; i < 12; i++) many.push(line([10 + i * 8, 10], [12 + i * 8, 20], 3));
  check((HW.pathRules(many, '山') || {}).reason === 'strokes', 'handwrite: ちょんちょん 12本 は strokes');
  HW.setLevel('strict'); check(HW.thresholds().ok === 0.9, 'handwrite: setLevel'); HW.setLevel('normal');
})();

// ---- AI（v2.8）：せってい・回数・こたえの 読みとり・まちがいの 分け方（通信は しない） ----
(function () {
  const ai = MQ.ai;
  ai._reset();
  localStorage.removeItem('manabi-monster-ai-v1');
  check(!ai.ready() && !ai.canUse(), 'ai: はじめは かぎ なし');
  check(ai.config().model === 'gemini-3.1-flash-image' && ai.config().limit === 20, 'ai: 初期の しゅるい・回数');
  ai.setConfig({ key: '  AIzaTEST  ', model: 'nope', limit: 7 });
  check(ai.config().key === 'AIzaTEST' && ai.config().model === 'gemini-3.1-flash-image' && ai.config().limit === 20, 'ai: 変な しゅるい・回数は 初期値に もどる');
  ai.setConfig({ model: 'gemini-3-pro-image', limit: 5 });
  check(ai.config().model === 'gemini-3-pro-image' && ai.config().limit === 5 && ai.modelName() === 'きれい', 'ai: しゅるい・回数を 変えられる');
  ai._reset();
  check(ai.config().key === 'AIzaTEST' && ai.config().limit === 5, 'ai: localStorage から もどる');
  check(ai.left() === 5 && ai.canUse(), 'ai: のこり回数');
  const okJson = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'hi' }, { inlineData: { mimeType: 'image/png', data: 'QUJD' } }] } }] };
  check(ai.parse(okJson) === 'data:image/png;base64,QUJD', 'ai: こたえから 絵を とりだす');
  check(ai.parse({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'Zg==' } }] } }] }) === 'data:image/jpeg;base64,Zg==', 'ai: snake_case でも 読める');
  function codeOf(fn) { try { fn(); return 'none'; } catch (e) { return e.code; } }
  check(codeOf(function () { ai.parse({ promptFeedback: { blockReason: 'SAFETY' } }); }) === 'safety', 'ai: 送った 絵が だめ → safety');
  check(codeOf(function () { ai.parse({ candidates: [{ finishReason: 'IMAGE_SAFETY', content: { parts: [{ text: 'no' }] } }] }); }) === 'safety', 'ai: かけない → safety');
  check(codeOf(function () { ai.parse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'only text' }] } }] }); }) === 'noimage', 'ai: 文字だけ → noimage');
  check(codeOf(function () { ai.parse(null); }) === 'noimage', 'ai: 空 → noimage');
  check(ai.fromStatus(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }).code === 'key', 'ai: 400 かぎ → key');
  check(ai.fromStatus(403, { error: { message: 'Permission denied', status: 'PERMISSION_DENIED' } }).code === 'billing', 'ai: 403 → billing');
  check(ai.fromStatus(404, { error: { message: 'models/x is not found', status: 'NOT_FOUND' } }).code === 'model', 'ai: 404 → model');
  check(ai.fromStatus(429, { error: { message: 'You exceeded your current quota, please check your plan and billing details.', status: 'RESOURCE_EXHAUSTED' } }).code === 'quota', 'ai: 429 quota → quota');
  check(ai.fromStatus(429, { error: { message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } }).code === 'quota', 'ai: 429 exhausted → quota');
  check(ai.fromStatus(503, { error: { message: 'The model is overloaded.', status: 'UNAVAILABLE' } }).code === 'busy', 'ai: 503 → busy');
  check(ai.message('limit').indexOf('あした') >= 0 && ai.message({ code: 'key' }, true).indexOf('AIza') >= 0 && ai.message('zzz') === ai.message('unknown'), 'ai: ことば');
  // にせの 通信で generate：回数が ふえる・まちがいが ことばに なる
  let calls = [];
  const done = [];
  ai.transport = function (url, init) {
    calls.push({ url: url, init: init });
    if (calls.length === 1) return Promise.resolve({ status: 200, json: okJson });
    if (calls.length === 2) return Promise.resolve({ status: 400, json: { error: { message: 'API key not valid', status: 'INVALID_ARGUMENT' } } });
    return Promise.reject(new TypeError('Failed to fetch'));
  };
  const img = 'data:image/jpeg;base64,/9j/AAAA';
  const chain = ai.generate(img).then(function (url) {
    done.push(url === 'data:image/png;base64,QUJD' && ai.usedToday() === 1 && ai.left() === 4);
    const body = JSON.parse(calls[0].init.body);
    done.push(calls[0].url.indexOf('models/gemini-3-pro-image:generateContent') > 0 && calls[0].init.headers['x-goog-api-key'] === 'AIzaTEST'
      && body.contents[0].parts[0].text === ai.PROMPT && body.contents[0].parts[1].inlineData.mimeType === 'image/jpeg' && body.contents[0].parts[1].inlineData.data === '/9j/AAAA'
      && body.generationConfig.imageConfig.aspectRatio === '1:1');
    return ai.generate(img);
  }).then(function () { done.push(false); }, function (e) {
    done.push(e.code === 'key' && ai.usedToday() === 1);   // まちがいは 数えない
    ai.transport = null;
    ai.setConfig({ limit: 5 });
    // のこり 0 なら 送らない
    ai.transport = function () { return Promise.resolve({ status: 200, json: okJson }); };
    return ai.generate(img).then(function () { return ai.generate(img); }).then(function () { return ai.generate(img); }).then(function () { return ai.generate(img); });
  }).then(function () {
    done.push(ai.left() === 0 && !ai.canUse());
    return ai.generate(img);
  }).then(function () { done.push(false); }, function (e) {
    done.push(e.code === 'limit');
    ai.transport = null;
    ai.clearKey();
    done.push(!ai.ready());
    return ai.check();
  }).then(function (r) {
    done.push(r.ok === false && r.code === 'nokey');
    check(done.every(Boolean), 'ai: generate の 流れ ' + JSON.stringify(done));
    localStorage.removeItem('manabi-monster-ai-v1');
    ai._reset();
  }).catch(function (e) { check(false, 'ai: generate で 例外 ' + (e && (e.code || e.message || e))); });
  (global.__pending = global.__pending || []).push(chain);
})();

const old = { version: 1, currentId: 'x', settings: { sound: false }, players: [{ id: 'x', name: '古', xp: 300, gear: ['sword-wood'], equipped: { weapon: 'sword-wood', shield: null }, stars: { 'sansu3-1': 2 }, dex: { 'slime-green': 3 }, escaped: {} }] };
MQ.save.importText(JSON.stringify(old));
const migrated = MQ.save.current();
check(migrated.name === '古' && migrated.xp === 300, '古いセーブが 読める');
check(migrated.equipped.helm === null && migrated.gear.length === 0, '古い そうびは きれいに 消える');
check(MQ.save.getSetting('sfx', true) === false && MQ.save.getSetting('bgm', true) === false, 'おとの せっていが 引きつがれる');

/* ---- BGM の 曲データ（32個ずつ・コード4つ・音色と ドラムの 名前） ---- */
const bgmErrs = MQ.bgm.validate();
check(bgmErrs.length === 0, 'BGM の 曲データ' + (bgmErrs.length ? '：' + bgmErrs.join(' / ') : ''));
console.log('BGM: ' + Object.keys(MQ.bgm.songs).length + ' 曲');
check(Array.isArray(migrated.titles) && migrated.titles.length >= 1, 'しょうごうが 入る');

/* ---- 学期（v2.6）：ならった 単元だけ 出る ---- */
(function () {
  const T = MQ.terms;
  // 小3 リスト教科の unit は ぜんぶ 表に ある
  [['kokugo', MQ.kokugo3.questions], ['rikashakai', MQ.rikashakai3.questions], ['eigo', MQ.eigo3.questions]].forEach(function (pair) {
    const seen = {};
    pair[1].forEach(function (q) { seen[q.unit] = 1; });
    Object.keys(seen).forEach(function (u) { check(!!T.unitEntryOf(u, 3), '学期の 表に ない 単元: ' + pair[0] + ' ' + u); });
  });
  const g3 = MQ.content.world('g3');
  MQ.content.setActive(g3);
  const rs = MQ.content.areaOf('rikashakai').stages;
  const ks = MQ.content.areaOf('kokugo').stages;
  const es = MQ.content.areaOf('eigo').stages;
  const ss = MQ.content.areaOf('sansu').stages;
  // ぜんぶ（いままで どおり）
  T.forcePlayer({ grade: 3, term: 0, units: {} });
  check(rs.every(MQ.content.isAvailable) && es.every(MQ.content.isAvailable) && ks.every(MQ.content.isAvailable), 'ぜんぶ: 小3の リスト教科は 全ステージ 開く');
  check(MQ.content.fragNeed(MQ.content.areaOf('rikashakai')) === 8, 'ぜんぶ: かけらは ★8');
  // 1学期
  T.forcePlayer({ grade: 3, term: 1, units: {} });
  check(MQ.content.isAvailable(rs[0]) && !MQ.content.isAvailable(rs[1]) && MQ.content.isAvailable(rs[2]) && !MQ.content.isAvailable(rs[3]), '1学期の 理社: 1・3 だけ 開く');
  check(MQ.content.isAvailable(ks[0]) && MQ.content.isAvailable(ks[1]) && MQ.content.isAvailable(ks[2]) && !MQ.content.isAvailable(ks[3]) && !MQ.content.isAvailable(ks[4]), '1学期の 国語: 1・2・3 だけ 開く');
  check(MQ.content.isAvailable(es[0]) && MQ.content.isAvailable(es[1]) && !MQ.content.isAvailable(es[2]) && !MQ.content.isAvailable(es[3]), '1学期の 英語: 1・2 だけ 開く');
  check(ss.slice(0, 6).every(MQ.content.isAvailable) && !MQ.content.isAvailable(ss[6]), '1学期の 算数: 1〜6');
  check(MQ.content.isUnlocked({ stars: { 'rikashakai3-1': 1 } }, MQ.content.areaOf('rikashakai'), rs[2]), '1学期: 理社2が 閉じていても 1の ★で 3が 開く');
  check(!MQ.content.isUnlocked({ stars: {} }, MQ.content.areaOf('rikashakai'), rs[2]), '1学期: 理社1の ★が ないと 3は 開かない');
  check(MQ.content.fragNeed(MQ.content.areaOf('rikashakai')) === 6, '1学期: 理社の かけらは ★6（2ステージ×3）: ' + MQ.content.fragNeed(MQ.content.areaOf('rikashakai')));
  for (let i = 0; i < 60; i++) {
    [rs[0], rs[2], ks[2], es[0], es[1]].forEach(function (st) {
      st.make(12, {}).concat(st.make(3, { boss: true })).forEach(function (q) {
        const e = T.unitEntryOf(q.unit, 3);
        check(!e || e.term <= 1, '1学期に 先の 単元が 出た: ' + st.id + ' ' + q.unit);
      });
    });
  }
  // 塔も ならった ところだけ
  for (let i = 0; i < 30; i++) MQ.content.towerStage.make(5, { index: i }).forEach(function (q) {
    const u = String(q.unit).replace(/^さいごの もんだい ・ [^ ]+ ?/, '');
    const e = T.unitEntryOf(u, 3);
    check(!e || e.term <= 1, '1学期の 塔に 先の 単元が 出た: ' + q.unit);
  });
  // 2学期：理社2（風とゴム＋太陽とかげ＋光＋音）が 開く。3学期の じしゃくは 出ない
  T.forcePlayer({ grade: 3, term: 2, units: {} });
  check(MQ.content.isAvailable(rs[1]) && MQ.content.isAvailable(ks[4]) && MQ.content.isAvailable(es[2]) && !MQ.content.isAvailable(es[3]), '2学期: 理社2・ローマ字・英語3 が 開く。英語4（小4）は 閉じる');
  for (let i = 0; i < 40; i++) rs[1].make(12, {}).forEach(function (q) { check(T.unitEntryOf(q.unit, 3).term <= 2, '2学期に 3学期の 単元: ' + q.unit); });
  // 単元の 上書き：1学期でも「理科：電気」を ならった ことに できる／逆に こん虫を 外せる
  T.forcePlayer({ grade: 3, term: 1, units: { 'unit:理科／こん虫': false } });
  check(MQ.content.isAvailable(rs[0]), '上書き: こん虫を 外しても 理社1は 開く（v6.1で 植物だけでも 12問 いじょう）');
  T.forcePlayer({ grade: 3, term: 0, units: { 'unit:理科／太陽とかげ': false, 'unit:理科／光': false, 'unit:理科／音': false, 'unit:理科／風とゴム': false, 'unit:理科／じしゃく': false, 'unit:理科／電気': false } });
  check(!MQ.content.isAvailable(rs[1]), '上書き: 重さだけでは 少ないので 理社2は 閉じる');
  T.forcePlayer({ grade: 3, term: 0, units: { 'unit:曜日': false, 'unit:月': false, 'unit:天気': false, 'unit:季節': false } });
  check(!MQ.content.isAvailable(es[3]), '上書き: ぜんぶ でも 英語4の 単元を 外せば 閉じる');
  // おうちの人ページの 一覧
  const en = T.entries(3);
  check(en.length >= 60, '小3の 単元一覧: ' + en.length);
  check(en.filter(function (e) { return e.kind === 'stage' && e.area === 'sansu'; }).length === 18, '算数の 単元は 18');
  check(T.entries(1).length === 17 && T.entries(2).length === 18, '小1・小2の 単元一覧: ' + T.entries(1).length + ' / ' + T.entries(2).length);
  // 古い セーブ
  T.forcePlayer(null);
  MQ.content.setActive(null);
})();

/* ---------- よみあげ（v5.3・speech.js） ---------- */
(function () {
  const S = MQ.speech;
  check(!!S, 'speech が ある');

  // HTML の しるしを とる
  check(S.plain('<b>Good</b> morning<br>ね') === 'Good morning ね', 'HTML を とる: ' + S.plain('<b>Good</b> morning<br>ね'));

  // " " の 中の 英語だけ 読む
  check(S.englishIn('"Good morning." の いみは？') === 'Good morning.', '英語を とり出す: ' + S.englishIn('"Good morning." の いみは？'));
  check(S.englishIn('"How is the weather?" の いみは？') === 'How is the weather?', '文ぜんたいを とり出す');
  // カタカナの ふりがなは 読まない（読めない ので）
  check(S.englishIn('"Nǐ hǎo（ニーハオ）" は どの 国の あいさつ？').indexOf('ニーハオ') < 0, 'カタカナの ふりがなは 読まない');
  // かぎかっこが ない ときも ひろう
  check(S.englishIn('apple は なに？') === 'apple', 'かぎかっこ なしでも ひろう: ' + S.englishIn('apple は なに？'));
  // 英語が ない ときは から
  check(S.englishIn('3 たす 4 は？') === '', '英語が なければ から');
  check(S.englishIn('') === '', 'からの 文でも おちない');

  // 声が ない ところ（node）では ぜったいに 読まない
  check(S.ready('en') === false && S.ready('ja') === false, '声が ない ときは ready が false');
  check(S.speak('hello', 'en') === false, '声が ない ときは 読まない');

  // どの 問題に ボタンが つくか（読める か どうかは 画面がわが 見る）
  const en = S.forQuestion({ prompt: '"Good morning." の いみは？' }, { areaId: 'eigo', grade: 3 });
  check(!!en && en.lang === 'en' && en.text === 'Good morning.', '英語ステージ → 英語で 読む');
  const g1 = S.forQuestion({ prompt: 'あわせて いくつ？' }, { areaId: 'sansu', grade: 1 });
  check(!!g1 && g1.lang === 'ja' && g1.text === 'あわせて いくつ？', '小1 → 日本語で 問題文を 読む');
  check(S.forQuestion({ prompt: '3 たす 4 は？' }, { areaId: 'sansu', grade: 3 }) === null, '小3の 算数は 読まない');
  // 小1でも かん字の 入った 問題は 読まない（声が 答えを 言って しまう）
  check(S.forQuestion({ prompt: '「山」の よみかたは？' }, { areaId: 'kokugo', grade: 1 }) === null, '小1 かん字の よみは 読まない');
  check(S.forQuestion({ prompt: '「やま」を かん字で かくと？' }, { areaId: 'kokugo', grade: 1 }) === null, '小1 かん字を かくも 読まない（文に かん字）');
  check(S.forQuestion({ prompt: 'あわせて いくつ？' }, { areaId: 'sansu', grade: 1 }) !== null, '小1 ひらがなの 問題は 読む');
  check(S.hasKanji('やま') === false && S.hasKanji('山') === true, 'かん字の 見わけ');
  /* 小1の 問題を ぜんぶ 見る。
     読むのは **画面に 出て いる 問題文 そのもの** なので、読み上げで
     あたらしく ばれるのは「見ても わからないが 声に すると わかる」もの
     ＝ かん字の 読み だけ。だから たしかめるのは この 2つ：
       ① 読む 文が 画面の 文と 同じ（よけいな ものを 足して いない）
       ② かん字を ふくまない（ふくむ 問題は そもそも 読まない） */
  (function () {
    let bad = 0, kanji = 0, spoken = 0;
    (MQ.kokugo1 ? MQ.kokugo1.questions : []).forEach(function (q) {
      const say = S.forQuestion({ prompt: q.text }, { areaId: 'kokugo', grade: 1 });
      if (!say) { if (S.hasKanji(q.text)) kanji++; return; }
      spoken++;
      if (say.text !== S.plain(q.text)) bad++;
      if (S.hasKanji(say.text)) kanji--, bad++;
    });
    check(bad === 0, '小1 こくご：読む 文は 画面の 文と 同じ・かん字なし（ちがい ' + bad + '件）');
    check(spoken > 0 && kanji > 0, '小1 こくご：かん字の 問題は 読まない（' + kanji + '問 とばした）');
    console.log('  小1 こくご: きく ' + spoken + ' / ' + (MQ.kokugo1 ? MQ.kokugo1.questions.length : 0) + '問（かん字の ' + kanji + '問は 読まない）');
  })();
  check(S.forQuestion({ prompt: '「花」の 読みは？' }, { areaId: 'kokugo', grade: 3 }) === null, '小3の 国語は 読まない（答えが わかる）');
  check(S.forQuestion({ prompt: '"apple" の いみは？' }, { areaId: 'eigo', grade: 4 }) !== null, '小4の 英語も 読む');
  // 英語が 入って いない 英語ステージの 問題は ボタンを 出さない
  check(S.forQuestion({ prompt: 'アルファベットは ぜんぶで 何文字？' }, { areaId: 'eigo', grade: 4 }) === null, '英語が なければ ボタンなし');
  // ふきだし（note）
  const nt = S.forNote('朝の あいさつです。昼は "Good afternoon."', { areaId: 'eigo' });
  check(!!nt && nt.text === 'Good afternoon.', 'ふきだしの 英語も 読める: ' + (nt && nt.text));
  check(S.forNote('朝の あいさつです。', { areaId: 'eigo' }) === null, '英語の ない ふきだしは ボタンなし');
  check(S.forNote('てんとう虫の あしは 6本', { areaId: 'rika' }) === null, '英語ステージ いがいは 読まない');

  // 英語ステージの 問題の うち、どれくらい 読めるか（目やす）
  [['eigo3', MQ.eigo3], ['eigo4', MQ.eigo4]].forEach(function (pair) {
    const mod = pair[1];
    if (!mod || !mod.questions) return;
    const all = mod.questions;
    const ok = all.filter(function (q) {
      return S.forQuestion({ prompt: q.text }, { areaId: 'eigo', grade: 3 }) !== null;
    }).length;
    check(ok >= all.length * 0.5, pair[0] + ' の 半分いじょうに きくボタン: ' + ok + ' / ' + all.length);
    console.log('  ' + pair[0] + ': きく ' + ok + ' / ' + all.length + '問');
  });
})();

/* ---------- なかま（相棒・v4.3・pals.js） ---------- */
(function () {
  const P = MQ.pals;
  check(!!P, 'pals が ある');
  // レベルの 上がり方
  check(P.levelOf(0) === 1 && P.levelOf(P.expFor(2)) === 2 && P.levelOf(P.expFor(10)) === 10, 'けいけんち → レベル');
  check(P.expFor(10) > P.expFor(9) && P.expFor(20) > P.expFor(10), 'レベルが 上がるほど 必要な けいけんちが ふえる');
  // 3問 れんぞくで 追い打ち
  check(!P.hitOn(1) && !P.hitOn(2) && P.hitOn(3) && !P.hitOn(4) && P.hitOn(6) && P.hitOn(9), '3問ごとに 追い打ち');
  check(P.gaugeNeed() === 3, 'なかまゲージは 3問で たまる: ' + P.gaugeNeed());
  // なかまに する → 相棒に なる
  const p = { pals: {}, pal: null, coins: 10, dex: {}, dexNew: {} };
  P.add(p, 'drago-1');
  check(p.pal === 'drago-1' && P.own(p).length === 1, 'はじめての なかまは すぐ 相棒に なる');
  // けいけんちは 半分・Lv10 で 進化
  const g1 = P.gain(p, 100);
  check(g1 && g1.gained === 50, 'けいけんちは 主人公の 半分（' + (g1 && g1.gained) + '）');
  p.pals['drago-1'].exp = P.expFor(10) - 1;
  const g2 = P.gain(p, 200);
  check(!!g2.evolved && g2.evolved.to === 'drago-2' && p.pal === 'drago-2', 'Lv10 で つぎの すがたに なる（' + (g2.evolved && g2.evolved.to) + '）');
  check(!p.pals['drago-1'] && !!p.pals['drago-2'], '前の すがたは のこらない');
  check(p.dex['drago-2'] === 1, '進化した すがたは 図かんに のる');
  p.pals['drago-2'].exp = P.expFor(20);
  const g3 = P.gain(p, 10);
  check(!!g3.evolved && p.pal === 'drago-3', 'Lv20 で さいごの すがたに なる');
  const g4 = P.gain(p, 10);
  check(!g4.evolved, 'さいごの すがたは それ いじょう 進化しない');
  // コインで こうかん（会った ことが ある モンスターだけ）
  const q = { pals: {}, pal: null, coins: 6, dex: { 'serp-1': 2 }, dexNew: {} };
  check(!P.canBuy(q, 'krak-1'), '会った ことが ない モンスターは 買えない');
  check(P.canBuy(q, 'serp-1'), '会った ことが ある モンスターは 買える');
  const before = q.coins;
  P.buy(q, 'serp-1');
  check(q.coins === before - P.price('serp-1') && P.has(q, 'serp-1'), 'コインを はらって なかまに なる');
  check(!P.canBuy(q, 'serp-1'), 'もう なかまの モンスターは 買えない');
  // たおした 中から なかま候補（もう なかまの もの・ボス・たからばこは えらばない）
  /* なまえを つける（v5.2）。8文字まで・からっぽで もとの 名前に もどる・進化しても のこる */
  (function () {
    const n = { pals: {}, pal: null, coins: 0, dex: {}, dexNew: {} };
    P.add(n, 'drago-1');
    const base = P.info(n, 'drago-1').name;
    check(!P.info(n, 'drago-1').named, 'さいしょは もとの 名前');
    P.setName(n, 'drago-1', '  ドラ  ');
    check(P.info(n, 'drago-1').name === 'ドラ' && P.info(n, 'drago-1').named, 'なまえを つけられる: ' + P.info(n, 'drago-1').name);
    check(P.info(n, 'drago-1').baseName === base, 'もとの 名前も のこる');
    P.setName(n, 'drago-1', 'あいうえおかきくけこ');
    check(P.info(n, 'drago-1').name.length === P.NAME_MAX, 'なまえは ' + P.NAME_MAX + '文字まで: ' + P.info(n, 'drago-1').name);
    // 進化しても なまえは そのまま
    P.setName(n, 'drago-1', 'ドラ');
    n.pals['drago-1'].exp = P.expFor(10);
    P.evolveIfReady(n);
    check(!!n.pals['drago-2'] && n.pals['drago-2'].name === 'ドラ', 'しんかしても なまえは のこる');
    P.setName(n, 'drago-2', '');
    check(!P.info(n, 'drago-2').named, 'からっぽで もとの 名前に もどる');
  })();

  /* 3回 たおした 相手は かならず なかまに なりたがる（v5.2） */
  (function () {
    const n = { pals: {}, pal: null, coins: 0, dex: { 'serp-1': 3 }, dexNew: {} };
    const never = function () { return 1; };   // ぐうぜんでは ぜったい 出ない
    check(P.offerFrom(n, ['serp-1'], never) === 'serp-1', '3回 たおしたら かならず なかまに なりたがる');
    const m = { pals: {}, pal: null, coins: 0, dex: { 'serp-1': 2 }, dexNew: {} };
    check(P.offerFrom(m, ['serp-1'], never) === null, '2回では まだ（ぐうぜんだけ）');
    const k = { pals: { 'serp-1': { exp: 0 } }, pal: 'serp-1', coins: 0, dex: { 'serp-1': 9 }, dexNew: {} };
    check(P.offerFrom(k, ['serp-1'], never) === null, 'もう なかまの ものは 出さない');
  })();

  const r = { pals: { 'serp-1': { exp: 0 } }, pal: 'serp-1', coins: 0, dex: {}, dexNew: {} };
  check(P.offerFrom(r, ['chest', 'boss-dragon', 'serp-1'], function () { return 0; }) === null, 'たからばこ・ボス・なかまは 候補に ならない');
  check(P.offerFrom(r, ['drago-1'], function () { return 0; }) === 'drago-1', 'たおした ザコは 候補に なる');
  check(P.offerFrom(r, ['drago-1'], function () { return 0.99; }) === null, 'いつも なかまに なる わけでは ない');
})();

/* ---------- 絵から モンスターを 組み立てる（v3.6〜・monstergen.js） ---------- */
(function () {
  const G = MQ.monsterGen;
  check(!!G, 'monsterGen が ある');
  const KINDS = ['blob', 'beast', 'fish', 'bird', 'humanoid', 'bug', 'box', 'triple',
    'dragon', 'robot', 'snake', 'squid', 'ghost', 'vehicle', 'spider', 'bat',
    // v5.8
    'dino', 'shark', 'crab', 'rabbit', 'cat', 'bear', 'turtle', 'frog', 'penguin', 'golem',
    'pumpkin', 'tree', 'mushroom', 'devil', 'angel', 'king', 'wizard', 'sword', 'star', 'flame',
    'cloud', 'rocket', 'ufo', 'snowman', 'bee', 'butterfly', 'scorpion', 'ship', 'plane',
    // v5.9
    'giraffe', 'croc', 'wolf', 'elephant', 'lion', 'horse', 'dolphin', 'whale', 'jelly', 'mouse',
    'monkey', 'pig', 'sheep', 'snail', 'dragonfly', 'ant', 'witch', 'ninja', 'samurai', 'knight',
    'pirate', 'mummy', 'skeleton', 'eyeball', 'castle', 'train', 'bike', 'house', 'cactus', 'flower',
    'book', 'pencil', 'crystal', 'bomb', 'sun', 'moon', 'rainbow', 'egg', 'clock', 'key'];
  const N = 64;
  // まる／たまご形の 絵を 作る（目 2つ つき）
  function blobArt(cx, cy, rx, ry, col, eyes) {
    const cells = new Array(N * N).fill(null);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) cells[y * N + x] = { ink: false, c: col.slice() };
      }
    }
    (eyes || []).forEach(function (p) {
      for (let y = p[1]; y < p[1] + 3; y++) for (let x = p[0]; x < p[0] + 3; x++) cells[y * N + x] = { ink: true, c: [30, 28, 40] };
    });
    return cells;
  }
  function rectArt(x0, y0, w, h, col) {
    const cells = new Array(N * N).fill(null);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) cells[y * N + x] = { ink: false, c: col.slice() };
    return cells;
  }
  // ① たて長の たまご → 立ちすがた
  const fTall = G.analyze(blobArt(32, 32, 11, 22, [90, 150, 230], [[26, 16], [34, 16]]), N);
  check(!!fTall, 'たて長の 絵から 特徴が 読める');
  check(fTall.tall === true && fTall.wide === false, 'たて長と わかる（ratio ' + fTall.ratio.toFixed(2) + '）');
  check(fTall.main[2] > fTall.main[0], '主な 色は 青（青 > 赤）');
  const mTall = G.make(fTall);
  const WIDE_ONLY = ['fish', 'beast', 'crab', 'turtle', 'shark', 'ufo', 'cloud', 'plane', 'ship', 'vehicle', 'scorpion', 'bug', 'spider'];
  const TALLBOX_ONLY = ['box', 'robot', 'triple', 'sword', 'rocket', 'snowman', 'tree', 'penguin', 'wizard', 'angel', 'king', 'mushroom'];
  check(WIDE_ONLY.indexOf(mTall.kind) < 0, 'たて長の 絵を よこ長の しゅるいに しない（' + mTall.kind + '）');
  // ② よこ長の たまご → よこ長の しゅるい
  const fWide = G.analyze(blobArt(32, 32, 22, 11, [230, 140, 60], [[18, 26], [26, 26]]), N);
  check(fWide.wide === true, 'よこ長と わかる');
  check(fWide.main[0] > fWide.main[2], '主な 色は オレンジ（赤 > 青）');
  const kWide = G.make(fWide).kind;
  check(TALLBOX_ONLY.indexOf(kWide) < 0, 'よこ長の たまごを たて長・四角の しゅるいに しない（' + kWide + '）');
  // ③ 四角い 絵 → はこ
  check(G.make(G.analyze(rectArt(18, 16, 28, 26, [200, 120, 70]), N)).kind === 'box', '四角い 絵は はこ');
  // ④ 3つに 分かれた 絵 → 3つご
  (function () {
    const cells = new Array(N * N).fill(null);
    [[10, 24], [27, 24], [44, 24]].forEach(function (p, i) {
      for (let y = p[1]; y < p[1] + 16; y++) for (let x = p[0]; x < p[0] + 10; x++) cells[y * N + x] = { ink: false, c: [200, 80 + i * 60, 90] };
    });
    const f3 = G.analyze(cells, N);
    check(f3.parts === 3, '3つに 分かれて いると わかる（' + f3.parts + '）');
    check(G.make(f3).kind === 'triple', '3つに 分かれた 絵は 3つご');
  })();
  // ⑤ できあがりの きまりごと
  const m = G.make(fWide);
  check(m.shape.length >= 8, '四角の ならびが できる（' + m.shape.length + '個）');
  check(KINDS.indexOf(m.kind) >= 0, 'しゅるいは ' + KINDS.length + 'の どれか');
  check(Object.keys(G.bodies).length === KINDS.length, '体は ' + KINDS.length + 'しゅるい（' + Object.keys(G.bodies).length + '）');
  // あたらしい 7しゅるいも 部品が そろって いる（目・つの・きばの 場所が ある）
  let miss = 0;
  KINDS.forEach(function (k) {
    const sp = G.make({ main: [180, 120, 200], accent: null, eyes: 2, horns: 0, legs: 0, wings: false, skull: false, teeth: true, wide: false, tall: false, parts: 1, rectness: 0.5, sideOut: false }, k);
    if (!sp || sp.shape.length < 8) miss++;
    if (!sp.shape.some(function (p) { return p[4] === 'w'; })) miss++;      // 目か きばの 白が ある
  });
  check(miss === 0, 'ぜんぶの しゅるいに 目と 部品が ある（' + miss + '）');
  // v5.8：しゅるいごとに かたちが ちがう（同じ 四角の ならびを つかい回して いない）
  (function () {
    const seen = {};
    let dup = 0;
    KINDS.forEach(function (k) {
      const key = JSON.stringify(G.bodies[k]());
      if (seen[key]) dup++;
      seen[key] = k;
    });
    check(dup === 0, 'かたちが かぶって いない（かぶり ' + dup + '）');
    let thin = 0;
    KINDS.forEach(function (k) { if (G.bodies[k]().length < 5) thin++; });
    check(thin === 0, 'どの しゅるいも 四角 5個 いじょう（' + thin + '）');
    // v5.9：しゅるいごとに 名前と なかま分けが ある
    let noName = 0, noGroup = 0;
    KINDS.forEach(function (k) {
      if (!G.kindName(k) || G.kindName(k) === k) noName++;
      if (!G.kindGroup(k)) noGroup++;
    });
    check(noName === 0, 'ぜんぶの しゅるいに 日本語の 名前が ある（ない ' + noName + '）');
    check(noGroup === 0, 'ぜんぶの しゅるいに なかま分けが ある（ない ' + noGroup + '）');
    const gids = G.groups.map(function (g) { return g.id; });
    let badG = 0;
    KINDS.forEach(function (k) { if (gids.indexOf(G.kindGroup(k)) < 0) badG++; });
    check(badG === 0, 'なかま分けは ' + gids.length + 'つの どれか（ちがう ' + badG + '）');
  })();
  // ミミック（v5.7）：はこ＋中の 生きもの。M の 色が 中の 生きものの 色に なり、目の 数は 中から
  (function () {
    const mm = G.make({ main: [226, 150, 95], accent: [242, 201, 59], inner: { main: [58, 56, 68], eyes: 3 }, eyes: 2 }, 'mimic');
    check(mm && mm.kind === 'mimic' && mm.shape.length >= 14, 'ミミックが 組み立てられる（' + (mm ? mm.shape.length : 0) + '個）');
    check(mm.colors.M === '#3a3844', 'ミミックの 中の 色は 中の 生きものの 色（' + mm.colors.M + '）');
    check(mm.shape.filter(function (p) { return p[4] === 'w' && p[2] === 2 && p[3] === 3; }).length === 8, 'ミミックに 歯が 8本');
    const eyesW = mm.shape.filter(function (p) { return p[4] === 'w' && !(p[2] === 2 && p[3] === 3); }).length;
    check(eyesW === 3, 'ミミックの 目は 中の 生きものの 数（3）＝' + eyesW);
    const ov = mm.shape.filter(function (p) { return p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48; });
    check(ov.length === 0, 'ミミックは 48マスから はみ出さない');
    check(typeof G.variantsInner === 'function', 'variantsInner が ある');
  // v6.0：AIの こたえを つかう しくみ
  check(typeof G.kindList === 'function' && G.kindList().length >= 85, 'AIに わたす しゅるいの 一覧（' + (G.kindList ? G.kindList().length : 0) + '）');
  check(G.kindList().every(function (k) { return k.id && k.name && k.name !== k.id; }), '一覧は ぜんぶ 日本語の 名前つき');
  (function () {
    const f = { main: [200, 120, 60], accent: null, eyes: 2, horns: 0, legs: 0, wings: false, skull: false, teeth: false, wide: true, tall: false, parts: 1, rectness: 0.5, sideOut: false };
    const base = ['fish', 'beast', 'blob'].map(function (k) { const m = G.make(f, k); return { kind: m.kind, tag: k, png: '', shape: m.shape, colors: m.colors }; });
    const out = G.withFirst(base, ['blob', 'bat'], f);
    check(out[0].tag === 'blob', 'AIの 1番めが 先頭に くる（' + out[0].tag + '）');
    check(out.length === base.length + 1 && out[1].tag === 'bat', '候補に なかった すがたは その場で 作る');
    check(out.filter(function (v) { return v.tag === 'blob'; }).length === 1, 'おなじ すがたが 2つに ならない');
  })();
  })();
  check(/^#[0-9a-f]{6}$/.test(m.colors.A), '色 A が #xxxxxx（' + m.colors.A + '）');
  const over = m.shape.filter(function (p) { return p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48; });
  check(over.length === 0, '48マスから はみ出さない（はみ出し ' + over.length + '個）');
  // ぜんぶの しゅるいで はみ出さないか
  let bad = 0;
  KINDS.forEach(function (k) {
    const f = { main: [200, 120, 60], accent: [80, 160, 220], eyes: 3, horns: 3, wings: true, skull: true, teeth: true, legs: 4, wide: true, tall: false, parts: k === 'triple' ? 3 : 1, rectness: k === 'box' ? 0.9 : 0.5, sideOut: true };
    const sp = G.make(f).shape;
    sp.forEach(function (p) { if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48) bad++; });
  });
  check(bad === 0, 'おまけを ぜんぶ つけても はみ出さない（' + bad + '個）');
  check(G.analyze(new Array(N * N).fill(null), N) === null, '絵が なければ null');
  // 同じ 絵なら いつも 同じ すがた
  check(G.make(G.analyze(blobArt(32, 32, 22, 11, [230, 140, 60], [[18, 26], [26, 26]]), N)).kind === m.kind, '同じ 絵なら 同じ かたち');

  /* ---------- 字（A〜Z）と 馬に のった きし（v4.0） ---------- */
  check(G.letterList.length === 36, '字は A〜Z と 0〜9 の 36こ（' + G.letterList.length + '）');
  check(G.letterList[0] === 'A' && G.letterList[25] === 'Z', 'A が さいしょ・Z が 26ばんめ');
  let lbad = 0, lsmall = 0, noEye = 0;
  G.letterList.forEach(function (ch) {
    const sp = G.letterBody([ch], ['#e8544e']);
    if (sp.length < 3) lsmall++;
    sp.forEach(function (p) { if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48) lbad++; });
    if (!sp.some(function (p) { return p[4] === 'w'; })) noEye++;     // 白目が ある＝目が ついて いる
  });
  check(lbad === 0, '字は 48マスから はみ出さない（はみ出し ' + lbad + '個）');
  check(lsmall === 0, 'どの 字も 四角が 3つ いじょう（少ない 字 ' + lsmall + '）');
  check(noEye === 0, 'どの 字にも 目が ある（目なし ' + noEye + '）');
  let mbad = 0;
  [['A', 'B', 'C'], ['M', 'Q'], ['K', 'O', 'T', 'A']].forEach(function (list) {
    G.letterBody(list, ['#e8544e', '#4fbf6a', '#f2c93b', '#4f9bf0']).forEach(function (p) {
      if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48) mbad++;
    });
  });
  check(mbad === 0, 'ならべた 字も はみ出さない（' + mbad + '個）');
  [true, false].forEach(function (sk) {
    const sp = G.riderBody(sk);
    let bad2 = 0;
    sp.forEach(function (p) { if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48) bad2++; });
    check(bad2 === 0 && sp.length >= 25, '馬に のった きし（' + (sk ? 'ガイコツ' : 'かぶと') + '）は 部品 ' + sp.length + '個・はみ出し ' + bad2);
  });
  // 色ごとの かたまり：赤・緑・黄の 字が よこに ならんだ 絵 → 3つに 分かれて「ならんで いる」と わかる
  (function () {
    const cells = new Array(N * N).fill(null);
    const cols = [[220, 70, 70], [70, 190, 90], [230, 200, 60]];
    cols.forEach(function (c, i) {
      const x0 = 6 + i * 18;
      for (let y = 14; y < 50; y++) for (let x = x0; x < x0 + 12; x++) cells[y * N + x] = { ink: false, c: c.slice() };
      for (let y = 24; y < 34; y++) for (let x = x0 + 3; x < x0 + 9; x++) cells[y * N + x] = null;   // まん中に あな
    });
    const parts = G.drawParts(cells, N);
    check(parts.length === 3, '赤・緑・黄の 3つに 分かれる（' + parts.length + '）');
    const lg = G.letterGuess(cells, N);
    check(!!lg && lg.row === true && lg.chars.length === 3, '字が よこに ならんで いると わかる（' + (lg ? lg.chars.join('') + ' row=' + lg.row : 'なし') + '）');
  })();
  // まん中に 山が ある よこ長の 絵 → 何かが 乗って いる
  (function () {
    const cells = new Array(N * N).fill(null);
    for (let y = 34; y < 46; y++) for (let x = 6; x < 58; x++) cells[y * N + x] = { ink: false, c: [200, 150, 90] };   // 体
    for (let y = 12; y < 34; y++) for (let x = 26; x < 38; x++) cells[y * N + x] = { ink: false, c: [180, 180, 190] };  // 上に のって いる もの
    const rg = G.riderGuess(cells, N);
    check(!!rg && rg.score >= 0.62, '上に 乗って いると わかる（' + (rg ? rg.score.toFixed(2) : 'なし') + '）');
    // ただの まる（乗って いない）は ちがう
    const rg2 = G.riderGuess(blobArt(32, 32, 20, 14, [200, 150, 90], []), N);
    check(!rg2 || rg2.score < 0.62, 'ただの まるは 乗って いない（' + (rg2 ? rg2.score.toFixed(2) : 'なし') + '）');
  })();
})();

/* ===== きょうの フィーバー教科 と サポート（v7.2）===== */
(function () {
  const F = MQ.fever;
  check(!!F, 'fever: MQ.fever が ある');
  if (!F) return;
  const prevId = MQ.save.get().currentId;
  const p = MQ.save.createPlayer('フィーバー', null, 3);
  F.setNow(new Date(2026, 8, 5));
  check(Array.isArray(Object.keys(p.areaPlays)) && p.fever === null && p.feverPick === null, 'fever: 新しい プレイヤーの 入れもの');
  const cands = F.candidates().map(function (a) { return a.id; });
  check(cands.join(',') === 'sansu,kokugo,rikashakai,eigo', 'fever: 小3の 候補は 4教科 ' + cands.join(','));

  // いちばん やって いない 教科 → 同じ 回数なら 正解率の 低い ほう
  p.areaPlays = { 'g3:sansu': 10, 'g3:kokugo': 2, 'g3:rikashakai': 2, 'g3:eigo': 2 };
  p.stats = { rows: { 'kokugo3-1': { ok: 10, n: 10, r: '1111111111' }, 'rikashakai3-1': { ok: 5, n: 10, r: '1010101010' } }, wrong: {} };
  check(F.choose(p) === 'eigo', 'fever: 回数が 同じなら 記ろくの ない 教科（英語）' + F.choose(p));
  p.stats.rows['eigo3-1'] = { ok: 5, n: 5, r: '11111' };
  check(F.choose(p) === 'rikashakai', 'fever: つぎは 正解率の 低い 理社 ' + F.choose(p));
  p.areaPlays['g3:kokugo'] = 0;
  check(F.choose(p) === 'kokugo', 'fever: 回数が いちばん 少ない 国語 ' + F.choose(p));
  const t1 = F.today(p);
  check(t1 && t1.areaId === 'kokugo' && t1.name === '国語の森' && t1.xpMul === 2 && t1.coins === 1 && t1.support === false && t1.level === 'ok', 'fever: today ' + JSON.stringify(t1 && { a: t1.areaId, s: t1.support, l: t1.level }));
  check(F.today(p) === t1 || F.today(p).areaId === 'kokugo', 'fever: 同じ日は 変わらない');
  check(F.isFever(p, 'kokugo') && !F.isFever(p, 'sansu'), 'fever: isFever');
  // おうちの人の えらび
  p.feverPick = 'sansu';
  check(F.today(p).areaId === 'sansu', 'fever: 教科を えらぶ');
  p.feverPick = 'off';
  check(F.today(p) === null, 'fever: なし');
  p.feverPick = 'xxx';
  check(F.today(p).areaId === 'kokugo', 'fever: 知らない えらびは おまかせ');
  p.feverPick = null;
  check(F.today(p).areaId === 'kokugo', 'fever: おまかせに もどす');
  // 日が 変わると 決め直す（国語を 3回 やったら 別の 教科へ）
  p.areaPlays['g3:kokugo'] = 3;
  check(F.today(p).areaId === 'kokugo', 'fever: その日の うちは 同じ');
  F.setNow(new Date(2026, 8, 6));
  check(F.today(p).areaId === 'rikashakai', 'fever: つぎの日は 正解率の 低い 理社 ' + F.today(p).areaId);
  // サポートの 見きわめ
  check(F.level(p, 'kokugo') === 'ok' && F.level(p, 'rikashakai') === 'weak' && F.level(p, 'sansu') === 'new', 'fever: level ' + [F.level(p, 'kokugo'), F.level(p, 'rikashakai'), F.level(p, 'sansu')].join(','));
  check(F.needsSupport(p, 'rikashakai') && F.needsSupport(p, 'sansu') && !F.needsSupport(p, 'kokugo'), 'fever: needsSupport');
  const bo = F.battleOpts(p, 'rikashakai');
  check(bo.fever && bo.fever.xpMul === 2 && bo.support && bo.support.level === 'weak' && bo.support.keep === 2, 'fever: battleOpts ' + JSON.stringify(bo));
  check(F.battleOpts(p, 'kokugo').fever === null && F.battleOpts(p, 'kokugo').support === null, 'fever: 国語は なし');
  // 相棒の おねがい
  check(F.palLine(p) === null, 'fever: 相棒が いなければ おねがい なし');
  MQ.pals.add(p, 'slime-green');
  const pl = F.palLine(p);
  check(pl && pl.pal.id === 'slime-green' && pl.text.indexOf('理科社会の海') !== -1, 'fever: 相棒の おねがい ' + (pl && pl.text));
  // たたかった 回数
  check(F.addPlay(p, 'eigo') === 3 && F.plays(p, 'eigo') === 3, 'fever: addPlay');
  check(F.overview(p).length === 4 && F.overview(p)[3].plays === 3, 'fever: overview');

  // ---- たたかいの 中 ----
  const st = MQ.content.findStage('kokugo3-1').stage;
  MQ.battle.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12,
    pal: { id: 'slime-green', name: 'スライム' },
    fever: { xpMul: 2, coins: 1, palPlus: 1 }, support: { easy: true, hint: true, keep: 2, extra: 3, level: 'weak' } });
  check(MQ.battle.mobTotal() === 12, 'fever: ザコは 12体の まま ' + MQ.battle.mobTotal());
  check(MQ.battle.buffs().freeze === 2 && MQ.battle.buffs().palPlus === 1, 'fever: コンボ ガード 2・なかまゲージ +1 ' + JSON.stringify(MQ.battle.buffs()));
  const q1 = MQ.battle.current();
  const h1 = MQ.battle.preHint();
  check(h1 && (h1.kind === 'text' ? !!h1.text : (h1.kind === 'eliminate' && h1.remove.length === 1)), 'support: ヒントが 先に 出る（文が あれば 文・なければ 1つ 消す） ' + JSON.stringify(h1));
  check(MQ.battle.preHint() === null, 'support: 同じ 問題に 2回は 出さない');
  check(MQ.battle.canUse('x').ok === false, 'support: canUse は こわれない');
  // むずかしさの ならび（5/5/2）と けいけんち 2ばい
  const lvs = [];
  let xp1 = null;
  while (MQ.battle.phase() === 'mob') {
    const q = MQ.battle.current();
    lvs.push(q.lv);
    const r = MQ.battle.answer(q.answer);
    if (xp1 === null) xp1 = r.xp;
    MQ.battle.next();
  }
  const cnt = { 1: 0, 2: 0, 3: 0 };
  lvs.forEach(function (l) { cnt[l]++; });
  check(cnt[1] === 5 && cnt[2] === 5 && cnt[3] === 2, 'support: やさしい 5・ふつう 5・むずかしい 2 ' + JSON.stringify(cnt));
  check(xp1 === MQ.battle.XP.mob * 2, 'fever: 1体めの けいけんちが 2ばい ' + xp1);
  check(MQ.battle.preHint() === null, 'support: ボスには ヒントを 先に 出さない');
  const sm = MQ.battle.summary();
  check(sm.fever === true && sm.feverBonus > 0 && sm.feverBonus === sm.baseXp / 2 && sm.feverCoins === 1 && sm.coins >= 1 && sm.support === 'weak', 'fever: summary ' + JSON.stringify({ b: sm.feverBonus, base: sm.baseXp, c: sm.feverCoins, coins: sm.coins, s: sm.support }));
  // タイムアタック・とっくんでは きかない
  MQ.battle.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, timeAttack: 20,
    fever: { xpMul: 2, coins: 1, palPlus: 1 }, support: { easy: true, hint: true, keep: 2, extra: 3, level: 'weak' } });
  check(MQ.battle.fever() === null && MQ.battle.support() === null && MQ.battle.buffs().freeze === 0 && MQ.battle.preHint() === null, 'fever: タイムアタックでは なし');
  const sq = { id: 'k1', type: 'number', prompt: '1+1', answer: 2, unit: 'x' };
  MQ.battle.start({ stage: st, mode: 'tokkun', escaped: [{ key: 'k1', q: sq, enemyId: 'slime-green' }], fever: { xpMul: 2, coins: 1, palPlus: 1 }, support: { easy: true, hint: true, keep: 2, level: 'weak' } });
  check(MQ.battle.fever() === null && MQ.battle.support() === null && MQ.battle.summary().feverBonus === 0, 'fever: とっくんでは なし');
  // サポートだけ（フィーバー なし）でも けいけんちは ふつう
  MQ.battle.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, support: { easy: true, hint: true, keep: 2, extra: 3, level: 'new' } });
  const r0 = MQ.battle.answer(MQ.battle.current().answer);
  check(r0.xp === MQ.battle.XP.mob && MQ.battle.summary().feverBonus === 0 && MQ.battle.summary().support === 'new', 'support だけ: けいけんち ふつう ' + r0.xp);
  // 古い セーブにも 入れものが つく
  const old = { id: 'o', name: 'o', grade: 3, xp: 0 };
  MQ.save.importText(JSON.stringify({ version: 2, players: [old], currentId: 'o', settings: {} }));
  const mig = MQ.save.current();
  check(mig && typeof mig.areaPlays === 'object' && mig.fever === null && mig.feverPick === null, 'fever: 古い セーブの 入れもの');
  F.setNow(null);
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  console.log('fever: 候補 ' + cands.length + '・ならび ' + lvs.join(''));
})();

/* ===== ごちゃまぜ バトル ＋ ミッションの 寄せ（v7.3）===== */
(function () {
  const F = MQ.fever, M = MQ.missions, C = MQ.content;
  const prevId = MQ.save.get().currentId;
  const p = MQ.save.createPlayer('ミックス', null, 3);
  F.setNow(new Date(2026, 8, 5));
  p.feverPick = 'kokugo';
  // 入口
  const f = C.findStage('mix3');
  check(f && f.stage.mix && f.area.id === 'mix' && f.world.grade === 3 && f.stage.id === C.mixStage().id, 'mix: findStage / mixStage');
  check(C.findStage('mix6') === null, 'mix: 開いて いない 学年は ない');
  check(C.mixOpen(p) === true && C.mixGroups(p).length === 4, 'mix: 小3は 4教科 ' + C.mixGroups(p).length);
  // 12問 → 教科ごとに 3問ずつ・id は mix3: で はじまる・教科の モンスター・単元に 教科名
  const qs = f.stage.make(12, {});
  const per = {};
  qs.forEach(function (q) { per[q.areaId] = (per[q.areaId] || 0) + 1; });
  check(qs.length === 12 && per.sansu === 3 && per.kokugo === 3 && per.rikashakai === 3 && per.eigo === 3, 'mix: 教科ごとに 3問 ' + JSON.stringify(per));
  check(qs.every(function (q) { return q.id.indexOf('mix3:') === 0 && q.stageId && q.enemyId && q.unit.indexOf(' ・ ') > 0 || q.unit.length > 0; }), 'mix: id・stageId・enemyId・単元');
  // v8.1：3体に 1体は「まよいこんだ 敵」（べつの 教科の モンスター・弱点＝この 問題の 教科）。のこりは その 教科の モンスター
  check(qs.every(function (q) {
    const e = MQ.enemies.get(q.enemyId);
    if (!e) return false;
    const same = MQ.enemies.poolArea(e.area) === MQ.enemies.poolArea(q.areaId) || e.any;
    return q.weak ? (q.weak === q.areaId && (!same || e.any)) : same;
  }), 'mix: モンスターは その 教科の もの（弱点もちは べつの 教科）');
  check(qs.filter(function (q) { return q.weak; }).length === 4, 'mix: 弱点もちは 12体に 4体 ' + qs.filter(function (q) { return q.weak; }).length);
  check(!f.stage.make(1, { boss: false, lv: 2 })[0].weak, 'mix: たからばこ（lv 指定）には 弱点を つけない');
  qs.forEach(function (q, i) { validate(q, 'mix ' + i); });
  const lv = { 1: 0, 2: 0, 3: 0 };
  qs.forEach(function (q) { lv[q.lv === 1 || q.lv === 3 ? q.lv : 2]++; });
  check(lv[1] === 4 && lv[2] === 4 && lv[3] === 4, 'mix: むずかしさ 4/4/4 ' + JSON.stringify(lv));
  // 13問（5教科）・2問（少ない とき）も こわれない
  check(f.stage.make(2, {}).length === 2 && f.stage.make(13, {}).length === 13, 'mix: 2問・13問');
  // ボスは えらんだ 教科から
  const bq = f.stage.make(1, { boss: true, index: 0, bossArea: 'eigo' })[0];
  check(bq && bq.areaId === 'eigo' && bq.lv === 3 && bq.id.indexOf('mix3:') === 0, 'mix: ボスは 英語 ' + (bq && bq.areaId));
  check(f.stage.make(1, { boss: true, index: 0, bossArea: 'zzz' })[0].areaId, 'mix: 知らない 教科なら くじ');
  // たからばこ（lv 2）
  const cq = f.stage.make(1, { boss: false, lv: 2 })[0];
  check(cq && cq.lv === 2, 'mix: たからばこの 問題 lv2');
  // core：問題の モンスターが そのまま・ボスは bossArea・コイン +1・★は 画面がわで つけない
  MQ.battle.start({ stage: f.stage, mode: 'normal', mix: true, bossArea: 'kokugo', enemies: [], bossId: 'boss-oni', mobs: 12, chest: true });
  check(MQ.battle.mobTotal() === 13, 'mix: 12体＋たからばこ ' + MQ.battle.mobTotal());
  let areas = {}, lvs = [];
  while (MQ.battle.phase() === 'mob') {
    const q = MQ.battle.current();
    if (!q.chest) { areas[q.areaId] = 1; lvs.push(q.lv); check(q.enemyId !== 'slime-green' || MQ.enemies.get(q.enemyId), 'mix core: enemyId'); }
    MQ.battle.answer(q.type === 'choice' ? q.answer : q.type === 'number' ? q.answer : q.type === 'roma' ? q.answer : q.type === 'write' ? true : q.type === 'frac' ? { q: q.answer.n, r: q.answer.d } : { q: q.answer.q, r: q.answer.r });
    MQ.battle.next();
  }
  check(Object.keys(areas).length === 4 && lvs.join('') === '111122223333', 'mix core: 4教科・やさしい → むずかしい ' + lvs.join(''));
  check(MQ.battle.phase() === 'boss' && MQ.battle.current().areaId === 'kokugo' && MQ.battle.current().boss, 'mix core: ボスは 国語 ' + MQ.battle.current().areaId);
  const sm = MQ.battle.summary();
  check(sm.mix === true && sm.mixCoins === 1 && sm.coins >= 2 && sm.results.every(function (r) { return r.stageId && r.stageId.indexOf('mix') !== 0; }), 'mix core: summary ' + JSON.stringify({ mix: sm.mix, c: sm.mixCoins, coins: sm.coins }));
  // ふつうの たたかいでは mixCoins 0
  MQ.battle.start({ stage: C.findStage('sansu3-1').stage, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12 });
  MQ.battle.answer(MQ.battle.current().answer);
  check(MQ.battle.summary().mixCoins === 0 && !MQ.battle.summary().mix, 'mix core: ふつうは なし');
  // 小1（2教科）でも 開く
  MQ.save.update(function (pl) { pl.playGrade = 1; });
  const f1 = C.findStage('mix1');
  check(f1 && C.mixOpen(MQ.save.current()) && f1.stage.make(12, {}).length === 12, 'mix: 小1でも 12問');
  MQ.save.update(function (pl) { pl.playGrade = 3; });

  // ---- ミッションの 寄せ（v7.3）：「○○で たたかう」は 7割 フィーバー教科・コイン 2 ----
  M.setNow(new Date(2026, 8, 5));
  let fevN = 0, N = 60, rewardOk = true, textOk = true;
  for (let i = 0; i < N; i++) {
    const list = M.generate(MQ.save.current());
    list.forEach(function (m) {
      if (m.id !== 'area') return;
      if (m.fever) { fevN++; if (m.reward !== M.REWARD_FEVER || m.param !== 'kokugo' || m.text.indexOf('（フィーバー）') === -1) rewardOk = false; }
      else if (m.reward !== M.REWARD_EACH || m.text.indexOf('フィーバー') !== -1) textOk = false;
    });
  }
  check(fevN > 0 && rewardOk && textOk, 'missions: フィーバーの「たたかう」は 国語・コイン 2・文に（フィーバー）' + fevN + '/' + N);
  // クリアで 2まい 入る
  const pm = MQ.save.current();
  pm.missions = { day: M.dayKey(), claimedAll: false, list: [
    { id: 'area', target: 1, count: 0, done: false, text: 'a', param: 'kokugo', fever: true, reward: 2 },
    { id: 'battle', target: 9, count: 0, done: false, text: 'b', reward: 1 },
    { id: 'correct', target: 99, count: 0, done: false, text: 'c' }
  ] };
  const c0 = pm.coins;
  const r = M.progress(pm, { mode: 'normal', correct: 5, total: 12 }, { areaId: 'kokugo' });
  check(r.completed.length === 1 && r.coins === 2 && pm.coins === c0 + 2, 'missions: フィーバーの ミッションは コイン 2 ' + r.coins);
  M.setNow(null); F.setNow(null);
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  console.log('mix: 12問 ' + JSON.stringify(per));
})();

/* ===== てきの ため → カウンター（v7.7）===== */
(function () {
  const B = MQ.battle, C = MQ.content;
  const prevId = MQ.save.get().currentId;
  const p = MQ.save.createPlayer('カウンター', null, 3);
  check(p.attacks === true && p.counters === 0, 'attack: 新しい プレイヤーは つける・0回');
  const st = C.findStage('sansu3-1').stage;
  function ans(q) { return q.type === 'choice' || q.type === 'number' || q.type === 'roma' ? q.answer : q.type === 'write' ? true : q.type === 'frac' ? { q: q.answer.n, r: q.answer.d } : { q: q.answer.q, r: q.answer.r }; }
  // 12体＋たからばこ：たからばこを 数えずに 3体ごとに こうげき（3・6・9・12体め）
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: true, attacks: true });
  const pat = [], xps = [];
  let seenChest = false;
  while (B.phase() === 'mob') {
    const q = B.current();
    const ci = B.chargeInfo();
    if (q.chest) { seenChest = true; check(ci === null, 'attack: たからばこには ためが ない'); }
    else pat.push(ci.attacking ? 'A' : String(ci.level));
    if (!q.chest && ci && ci.attacking && pat.length === 3) {
      // 3体め：わざと まちがえる → くらった（hit）→ 2回めで 正解しても カウンターは つかない
      const r1 = B.answer(q.type === 'choice' ? (q.answer + 1) % q.choices.length : -1);
      check(r1.outcome === 'retry' && r1.hit === true, 'attack: こうげきの 問題で まちがえると hit ' + JSON.stringify({ o: r1.outcome, h: r1.hit }));
      const r2 = B.answer(ans(q));
      check(r2.outcome === 'correct' && !r2.counter && r2.xp === B.XP.mobRetry, 'attack: 2回めの 正解は カウンターに ならない ' + r2.xp);
    } else {
      const r = B.answer(ans(q));
      if (!q.chest) {
        if (ci.attacking) xps.push(r.xp);
        if (ci.attacking) check(r.counter === true, 'attack: こうげきの 問題に 正解 → counter');
        else check(!r.counter && !r.hit, 'attack: ふつうの 問題は counter なし');
      }
    }
    B.next();
  }
  check(seenChest && pat.join('') === '12A12A12A12A', 'attack: ための ならび ' + pat.join(''));
  // カウンターの 問題の けいけんちは (10 + クリティカル 5)×1.5＝23 いじょう（2体同時の ボーナスが 足される ことも ある）
  check(B.summary().counters === 3, 'attack: カウンター 3回（3体めは まちがえた）' + B.summary().counters);
  check(xps.length === 3 && xps.every(function (x) { return x >= Math.round((B.XP.mob + B.XP.critBonus) * B.COUNTER_MUL); }), 'attack: カウンターの けいけんち 1.5ばい ' + xps.join(','));
  // ボス：2問めが 大わざ → 正解で 2ダメージ
  check(B.phase() === 'boss' && B.chargeInfo().boss === true && B.chargeInfo().level === 1 && !B.chargeInfo().attacking, 'attack: ボス 1問めは ため 1/2 ' + JSON.stringify(B.chargeInfo()));
  B.answer(ans(B.current())); B.next();
  check(B.chargeInfo().attacking === true, 'attack: ボス 2問めは 大わざ');
  const hp0 = B.bossHp();
  const rb = B.answer(ans(B.current()));
  check(rb.outcome === 'bosshit' && rb.counter === true && rb.dmg === 2 && B.bossHp() === hp0 - 2 && rb.burst === 0, 'attack: ボスに カウンター 2ダメージ ' + JSON.stringify({ d: rb.dmg, hp: B.bossHp(), b: rb.burst }));
  check(B.summary().counters === 4, 'attack: summary counters 4');
  // なし（おうちの人ページ・core の 初期値も なし）・とっくん・時間切れ
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12 });
  let none = true;
  while (B.phase() === 'mob') { if (B.chargeInfo() !== null) none = false; B.answer(ans(B.current())); B.next(); }
  check(none && B.chargeInfo() === null && B.summary().counters === 0, 'attack: attacks を わたさなければ ため なし');
  const sq = { id: 'k1', type: 'number', prompt: '1+1', answer: 2, unit: 'x' };
  B.start({ stage: st, mode: 'tokkun', attacks: true, escaped: [{ key: 'k1', q: sq, enemyId: 'slime-green' }, { key: 'k2', q: Object.assign({}, sq, { id: 'k2' }), enemyId: 'slime-green' }, { key: 'k3', q: Object.assign({}, sq, { id: 'k3' }), enemyId: 'slime-green' }] });
  check(B.chargeInfo() === null, 'attack: とっくんでは なし');
  // タイムアタックでも ため は ある（時間切れは hit を 返さない）
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, timeAttack: 20, attacks: true });
  B.answer(ans(B.current())); B.next(); B.answer(ans(B.current())); B.next();
  check(B.chargeInfo().attacking && B.timeUp().outcome === 'wrong', 'attack: タイムアタックの 時間切れは ふつうの まちがい');
  // しょうごう
  check(MQ.hero.titles.some(function (t) { return t.id === 't-counter10'; }), 'attack: しょうごう カウンターの たつじん');
  p.counters = 10;
  check(MQ.hero.checkTitles(p).some(function (t) { return t.id === 't-counter10'; }) || (p.titles || []).indexOf('t-counter10') !== -1, 'attack: 10回で もらえる');
  // 古い セーブ
  MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'o', name: 'o', grade: 3, xp: 0 }], currentId: 'o', settings: {} }));
  check(MQ.save.current().attacks === true && MQ.save.current().counters === 0, 'attack: 古い セーブは つける');
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  console.log('attack: ならび ' + pat.join(''));
})();

/* ===== 敵がわの 攻防（v8.1）：中ボス・弱点・ボスの わざ・なかまを よぶ ===== */
(function () {
  const B = MQ.battle, C = MQ.content;
  const prevId = MQ.save.get().currentId;
  const p = MQ.save.createPlayer('こうぼう', null, 3);
  check(p.elites === 0 && p.weakHits === 0, 'v8.1: 新しい プレイヤーは 0');
  const st = C.findStage('sansu3-1').stage;
  function ans(q) { return q.type === 'choice' || q.type === 'number' || q.type === 'roma' ? q.answer : q.type === 'write' ? true : q.type === 'frac' ? { q: q.answer.n, r: q.answer.d } : { q: q.answer.q, r: q.answer.r }; }
  function wrong(q) { return q.type === 'choice' ? (q.answer + 1) % q.choices.length : q.type === 'write' ? false : -1; }

  /* ---- 中ボス：12体 → 11体＋中ボス（2問）＋たからばこ＝14問。foeCount は 13体 ---- */
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: true, elite: true, areaId: 'sansu' });
  check(B.mobTotal() === 14 && B.foeCount().total === 13, 'elite: 14問・13体 ' + B.mobTotal() + '/' + B.foeCount().total);
  const mobs = [];
  while (B.phase() === 'mob') { mobs.push(B.current()); if (B.current().elite) break; B.answer(ans(B.current())); B.next(); }
  const eq = B.current();
  check(eq.elite === true && eq.elitePos === 0 && eq.eliteHp === 2 && (eq.lv || 2) === 3, 'elite: さいごは 中ボス・lv3 ' + JSON.stringify({ lv: eq.lv, pos: eq.elitePos }));
  check(B.chargeInfo() === null, 'elite: 中ボスには ため を 出さない（出来事は 1つ）');
  const eliteE = MQ.enemies.get(eq.enemyId);
  check(eliteE && eliteE.mid === true && eliteE.rank === 3, 'elite: 中ボス専用の モンスター ' + eq.enemyId);
  // 中ボスは エリアごとに 2体・ふつうの ザコには 出ない・図かんには のる
  ['sansu', 'kokugo', 'rikashakai', 'eigo'].forEach(function (a) {
    check(MQ.enemies.midIdsFor(a).length === 2, '中ボス: ' + a + ' は 2体 ' + MQ.enemies.midIdsFor(a).length);
    check(MQ.enemies.midIdsFor(a).indexOf(MQ.enemies.midFor(a)) >= 0, '中ボス: midFor は その エリアから ' + a);
    check(MQ.enemies.pickIds(a, 30, 1).every(function (id) { return !MQ.enemies.get(id).mid; }), '中ボス: ザコには 出ない ' + a);
  });
  // 小4・小5の 理科／社会は 理科社会の 中ボスを 借りる
  check(MQ.enemies.midIdsFor('rika').length === 2 && MQ.enemies.midIdsFor('shakai').length === 2, '中ボス: 理科・社会は 理科社会の を 借りる');
  check(MQ.enemies.list.filter(function (e) { return e.mid; }).length === 8, '中ボス: ぜんぶで 8体');
  MQ.enemies.list.filter(function (e) { return e.mid; }).forEach(function (e) {
    check(!e.hidden && !e.rare && MQ.enemies.dexList().some(function (x) { return x.id === e.id; }), '中ボス: 図かんに のる ' + e.id);
    check(!!MQ.enemies.shapes[e.shape], '中ボス: 絵が ある ' + e.shape);
  });
  check(B.mobs === undefined, 'elite: mobs は 外に 出さない');
  // 中ボスの 2問めは 同じ 敵・同じ しるし
  check(B.foeCount().no === 13, 'elite: 中ボスは 13体め ' + B.foeCount().no);
  // クリティカル なし（コンボを 切って から）→ 1ダメージ → elitehit
  B.answer(wrong(eq)); const r0 = B.answer(ans(eq));
  check(r0.outcome === 'elitehit' && r0.dmg === 1 && r0.hpLeft === 1 && B.eliteLeft() === 1, 'elite: 2回めの 正解は 1ダメージ・まだ たおれない ' + JSON.stringify({ o: r0.outcome, d: r0.dmg, l: r0.hpLeft }));
  B.next();
  const eq2 = B.current();
  check(eq2.elite && eq2.elitePos === 1 && eq2.enemyId === eq.enemyId && B.foeCount().no === 13, 'elite: 2問めも 中ボス・13体めの まま');
  const r1 = B.answer(ans(eq2));
  check(r1.outcome === 'correct' && r1.elite === true && r1.coins === 1 && r1.xp >= B.XP.mob + B.XP.eliteBonus, 'elite: たおした → けいけんち ＋20・コイン 1 ' + JSON.stringify({ o: r1.outcome, xp: r1.xp, c: r1.coins }));
  const nx = B.next();
  check(nx.phase === 'boss' && nx.entering === true, 'elite: 中ボスの あとは ボス');
  check(B.summary().elites === 1, 'elite: summary elites 1');
  // 一発（クリティカル＝コンボ 3いじょう）なら 2問めは とばす
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: false, elite: true, areaId: 'sansu' });
  while (!B.current().elite) { B.answer(ans(B.current())); B.next(); }
  const total0 = B.mobTotal();
  const r2 = B.answer(ans(B.current()));
  check(r2.outcome === 'correct' && r2.elite && r2.dmg === 2 && B.mobTotal() === total0 - 1 && B.next().phase === 'boss', 'elite: クリティカルで 一発 → 2問めは とばす ' + JSON.stringify({ o: r2.outcome, d: r2.dmg }));
  // にげられた → 2問めも とばす・にげた敵に 1体だけ
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: false, elite: true, areaId: 'sansu' });
  while (!B.current().elite) { B.answer(ans(B.current())); B.next(); }
  const eq3 = B.current();
  B.answer(wrong(eq3)); const r3 = B.answer(wrong(eq3));
  check(r3.outcome === 'wrong' && r3.elite === true && B.next().phase === 'boss', 'elite: にげられたら 2問めも とばす');
  const esc = B.summary().escaped;
  check(esc.length === 1 && !esc[0].q.elite && !esc[0].q.eliteHp, 'elite: にげた敵は 1体・elite の しるしは のこさない');
  // elite を わたさなければ いままで どおり（13問）
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: true });
  check(B.mobTotal() === 13 && B.foeCount().total === 13, 'elite: わたさなければ 13問 13体');
  // ゴールデンコールの まとに 中ボスは 入らない・たからばこは 中ボスの 2問の あと
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: false, elite: true, areaId: 'sansu',
    items: [{ id: 'g', name: 'g', power: 'golden', val: 9, uses: 1, mobOnly: true }, { id: 'c', name: 'c', power: 'chest', val: 1, uses: 1, mobOnly: true }] });
  const ug = B.useItem('g');
  check(ug.ok && ug.targets.every(function (i) { return !B.current().elite; }) && !B.summary().defeated.length, 'elite: ゴールデンコール ok');
  while (!B.current().elite) { B.answer(ans(B.current())); B.next(); }
  check(B.current().enemyId !== 'slime-golden', 'elite: 中ボスは ゴールデンに ならない');
  const uc = B.useItem('c');
  check(uc.ok && uc.at === B.mobIndex() + 2, 'elite: たからばこは 中ボスの 2問の あと ' + uc.at + ' / ' + B.mobIndex());

  /* ---- なかまを よぶ（ザコ）：2体同時が summon・2体めは 同じ 系統 か ゴールデン ---- */
  let summonSeen = 0, mateOk = 0, goldenSeen = 0;
  for (let t = 0; t < 30; t++) {
    B.start({ stage: st, mode: 'normal', enemies: ['drago-1', 'mecha-1', 'tank-1', 'magma-1'], bossId: 'boss-dragon', mobs: 12, chest: false, summon: true });
    while (B.phase() === 'mob') {
      const q = B.current();
      if (q.summon && q.groupPos === 0) {
        summonSeen++;
        const m1 = MQ.enemies.get(q.groupIds[1]);
        if (m1 && m1.id === 'slime-golden') goldenSeen++;
        else if (m1 && MQ.enemies.get(q.groupIds[0]) && m1.line === MQ.enemies.get(q.groupIds[0]).line) mateOk++;
      }
      B.answer(ans(q)); B.next();
    }
  }
  check(summonSeen === 30 && mateOk + goldenSeen === 30 && goldenSeen >= 0 && goldenSeen < 15, 'summon: 30回 ぜんぶ 呼ぶ・2体めは 同じ 系統 か ゴールデン ' + JSON.stringify({ s: summonSeen, m: mateOk, g: goldenSeen }));
  check(MQ.enemies.mateFor('drago-1') && MQ.enemies.get(MQ.enemies.mateFor('drago-1')).line === 'drago' && MQ.enemies.mateFor('mid-golem') === null, 'summon: mateFor');
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: false });
  let anySummon = false;
  while (B.phase() === 'mob') { if (B.current().summon) anySummon = true; B.answer(ans(B.current())); B.next(); }
  check(!anySummon, 'summon: わたさなければ いままで どおり');

  /* ---- 弱点（ごちゃまぜ）：weak の 問題に 1回めで 正解 → けいけんち 1.5ばい ---- */
  const mixSt = C.findStage('mix3').stage;
  B.start({ stage: mixSt, mode: 'normal', mix: true, bossArea: 'kokugo', enemies: [], bossId: 'boss-oni', mobs: 12, chest: false, areaId: 'kokugo' });
  let weakN = 0, weakXpOk = true, plainOk = true, retryOk = true;
  while (B.phase() === 'mob') {
    const q = B.current();
    if (q.weak) check(B.chargeInfo() === null, 'weak: ごちゃまぜでも 弱点の 問題に ため なし');
    if (q.weak && weakN === 0) {
      // 1体めは わざと まちがえてから 正解 → ばつぐんに ならない
      B.answer(wrong(q)); const rr = B.answer(ans(q));
      if (rr.weakHit || rr.xp !== B.XP.mobRetry) retryOk = false;
      weakN++;
    } else {
      const r = B.answer(ans(q));
      if (q.weak) { weakN++; if (!r.weakHit || r.xp < Math.round(B.XP.mob * B.WEAK_MUL)) weakXpOk = false; }
      else if (r.weakHit) plainOk = false;
    }
    B.next();
  }
  check(weakN === 4 && weakXpOk && plainOk && retryOk && B.summary().weakHits === 3, 'weak: 4体・1回めの 正解だけ 1.5ばい・summary 3 ' + JSON.stringify({ n: weakN, s: B.summary().weakHits }));
  // ふつうの たたかい（1教科）には 弱点が ない
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 12, chest: true, elite: true, summon: true, areaId: 'sansu' });
  let anyWeak = false;
  while (B.phase() === 'mob') { if (B.current().weak) anyWeak = true; B.answer(ans(B.current())); B.next(); }
  check(!anyWeak, 'weak: ふつうの たたかいには ない');

  /* ---- 弱点（塔）：weakArea の 教科の 問題に 正解 → 2ダメージ。しるしは その 問題だけ ---- */
  const tw = C.findStage('tower3').stage;
  check(C.towerSubjects(tw).join(',') === 'sansu,kokugo,rikashakai,eigo', 'weak: 塔の 教科（ローマ字は 入らない）' + C.towerSubjects(tw).join(','));
  B.start({ stage: tw, mode: 'tower', bossId: 'boss-maou', bossHp: 5, bossMax: 8, enrageAt: 3, weakArea: 'kokugo' });
  check(B.weakArea() === 'kokugo' && B.current().subject === 'sansu' && !B.current().weak, 'weak: 塔 1問めは 算数・弱点なし');
  B.answer(ans(B.current())); B.next();
  const tq = B.current();
  check(tq.subject === 'kokugo' && tq.weak === 'kokugo', 'weak: 塔 2問めは 国語＝弱点つき');
  check(B.chargeInfo() === null, 'weak: 弱点の 問題には ため を 出さない');
  const hpT = B.bossHp();
  const rt = B.answer(ans(tq));
  check(rt.outcome === 'bosshit' && rt.weakHit === true && rt.dmg === 2 && B.bossHp() === hpT - 2 && rt.burst === 0, 'weak: 塔の 弱点は 2ダメージ ' + JSON.stringify({ d: rt.dmg, hp: B.bossHp() }));
  check(B.summary().weakHits === 1, 'weak: 塔 summary 1');

  /* ---- ボスの わざ：3問め・5問め（ぶんしんは 2問）。大わざと かさならない。attacks なしなら 出ない ---- */
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 3, chest: false, attacks: true });
  while (B.phase() === 'mob') { B.answer(ans(B.current())); B.next(); }
  const plan = B.bossPlan();
  const ks = Object.keys(plan).map(Number).sort();
  check(plan[3] && (plan[3].kind === 'clone' ? ks.join(',') === '3,4' : ks.join(',') === '3,5') && ks.every(function (k) { return plan[k].kind !== 'clone' || k + 1 <= 5; }),
    'skill: 予定は 3問め（と 5問め）' + JSON.stringify(plan));
  check(Object.keys(plan).map(function (k) { return plan[k].kind; }).every(function (k) { return B.BOSS_SKILLS.indexOf(k) >= 0; }), 'skill: しゅるいは 3つの どれか');
  B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 3, chest: false });
  while (B.phase() === 'mob') { B.answer(ans(B.current())); B.next(); }
  check(Object.keys(B.bossPlan()).length === 0 && B.bossSkill() === null, 'skill: attacks なしなら わざ なし');
  // 塔は 3・5・7 に 3つ（ぶんしんが 入ると 2問 つかう）
  B.start({ stage: tw, mode: 'tower', bossId: 'boss-maou', bossHp: 5, bossMax: 8, enrageAt: 3, attacks: true });
  const planT = B.bossPlan();
  const kindsT = Object.keys(planT).map(function (k) { return planT[k].kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; });
  check(kindsT.length >= 2 && planT[3] && Object.keys(planT).every(function (k) { return Number(k) <= 8; }), 'skill: 塔は 3問めから 2つ いじょう ' + JSON.stringify(planT));

  // たての かまえ：正解で ガードブレイク → つぎの 1問が 2ダメージ。まちがえると すきは とじる
  // ボスの HP を 多めに して たおれる 前に わざを ぜんぶ 見る
  function bossStart(plan) {
    B.start({ stage: st, mode: 'normal', enemies: ['slime-green'], bossId: 'boss-dragon', mobs: 3, chest: false, attacks: true, bossHp: 12, bossMax: 8, enrageAt: 1 });
    while (B.phase() === 'mob') { B.answer(ans(B.current())); B.next(); }
    B._setBossPlan(plan);
  }
  bossStart({ 3: { kind: 'kamae', pos: 0 } });
  B.answer(ans(B.current())); B.next(); B.answer(ans(B.current())); B.next();
  check(B.bossAsked() === 3 && B.bossSkill().kind === 'kamae' && B.chargeInfo() === null, 'skill: 3問めは かまえ・ため なし');
  const hp3 = B.bossHp();
  const rk = B.answer(ans(B.current()));
  check(rk.outcome === 'bosshit' && rk.skill === 'kamae' && rk.broke === true && rk.dmg === 1 && rk.xp === B.XP.bossHit + B.XP.critBonus + B.XP.kamaeBreak && B.bossHp() === hp3 - 1, 'skill: ガードブレイク ＋10 ' + JSON.stringify({ b: rk.broke, xp: rk.xp }));
  B.next();
  check(B.bossSkill().open === true && B.bossSkill().kind === null && B.chargeInfo() === null, 'skill: 4問めは すきだらけ（ため とは かさならない）');
  const hp4 = B.bossHp();
  const ro = B.answer(ans(B.current()));
  check(ro.open === true && ro.dmg === 2 && B.bossHp() === hp4 - 2 && ro.burst === 0, 'skill: すきを ついて 2ダメージ ' + JSON.stringify({ o: ro.open, d: ro.dmg }));
  B.next();
  check(!B.bossSkill() || !B.bossSkill().open, 'skill: すきは 1問だけ');
  // かまえで まちがえる → ブレイクなし・すきなし
  bossStart({ 3: { kind: 'kamae', pos: 0 } });
  B.answer(ans(B.current())); B.next(); B.answer(ans(B.current())); B.next();
  const rkw = B.answer(wrong(B.current()));
  check(rkw.outcome === 'retry' && rkw.skill === 'kamae', 'skill: かまえで まちがい → retry・skill つき');
  const rk2 = B.answer(ans(B.current()));
  check(rk2.broke === false && rk2.dmg === 1, 'skill: 2回めの 正解は ブレイクに ならない');
  B.next();
  check(!(B.bossSkill() && B.bossSkill().open), 'skill: すきも 出ない');
  // ぶんしん：2問 つづけて 1回めで 正解 → ＋20
  bossStart({ 3: { kind: 'clone', pos: 0 }, 4: { kind: 'clone', pos: 1 } });
  B.answer(ans(B.current())); B.next(); B.answer(ans(B.current())); B.next();
  check(B.bossSkill().kind === 'clone' && B.bossSkill().pos === 0, 'skill: 3問め ぶんしん 1体め');
  const rc0 = B.answer(ans(B.current()));
  check(rc0.skill === 'clone' && rc0.clonePos === 0 && !rc0.cloneKO && rc0.dmg === 1, 'skill: ぶんしん 1問めは 1ダメージ');
  B.next();
  check(B.bossSkill().kind === 'clone' && B.bossSkill().pos === 1 && B.chargeInfo() === null, 'skill: 4問め ぶんしん 2体め・大わざ なし');
  const rc1 = B.answer(ans(B.current()));
  check(rc1.cloneKO === true && rc1.xp === B.XP.bossHit + B.XP.critBonus + B.XP.cloneBonus, 'skill: 見やぶった ＋20 ' + rc1.xp);
  bossStart({ 3: { kind: 'clone', pos: 0 }, 4: { kind: 'clone', pos: 1 } });
  B.answer(ans(B.current())); B.next(); B.answer(ans(B.current())); B.next();
  B.answer(wrong(B.current())); B.answer(ans(B.current())); B.next();
  check(B.answer(ans(B.current())).cloneKO === false, 'skill: 1問めを まちがえたら ボーナス なし');
  // なかまを よぶ：3問めの 前に ザコが 1体（ボスの 問題数は ふえない）
  bossStart({ 3: { kind: 'call', pos: 0 } });
  B.answer(ans(B.current())); B.next();
  const n3 = B.next();
  const cq = B.current();
  check(n3.call === true && cq.called === true && cq.id.indexOf('call:') === 0 && !cq.boss && B.bossAsked() === 3 && B.chargeInfo() === null, 'skill: 3問めの 前に 呼ばれた ザコ ' + JSON.stringify({ c: n3.call, id: cq.id, k: B.bossAsked() }));
  const ce = MQ.enemies.get(cq.enemyId);
  check(ce && !ce.rare && ce.id.indexOf('boss-') !== 0, 'skill: 呼ばれたのは ザコ ' + cq.enemyId);
  const hpC = B.bossHp();
  const rcall = B.answer(ans(cq));
  check(rcall.outcome === 'correct' && rcall.called === true && rcall.xp === B.XP.mob + B.XP.critBonus && B.bossHp() === hpC && B.summary().defeated.indexOf(cq.enemyId) >= 0, 'skill: 呼ばれた ザコ → ザコの けいけんち・ボスは そのまま ' + rcall.xp);
  const n4 = B.next();
  check(n4.afterCall === true && B.current().boss === true && B.bossAsked() === 3 && B.bossSkill().kind === 'call', 'skill: そのあと 3問めの ボスの 問題');
  check(B.answer(ans(B.current())).outcome === 'bosshit', 'skill: ボスの 問題は ふつうに 当たる');
  // 呼ばれた ザコに にげられても ボスの 問題へ
  bossStart({ 3: { kind: 'call', pos: 0 } });
  B.answer(ans(B.current())); B.next(); B.next();
  const cq2 = B.current();
  B.answer(wrong(cq2)); const rw2 = B.answer(wrong(cq2));
  check(rw2.outcome === 'wrong' && rw2.called === true && B.phase() === 'boss' && B.next().afterCall && B.current().boss, 'skill: にげられても ボスへ');
  check(B.summary().escaped.some(function (e) { return e.key.indexOf('call:') === 0 && !e.q.called; }), 'skill: にげた敵に 入る（called は のこさない）');
  // しょうごう
  check(MQ.hero.titles.some(function (t) { return t.id === 't-elite10'; }) && MQ.hero.titles.some(function (t) { return t.id === 't-weak10'; }), 'v8.1: しょうごう 2つ');
  check(MQ.hero.titles.length === 48, 'v8.1: しょうごう 48 ' + MQ.hero.titles.length);
  // 古い セーブ
  MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'o', name: 'o', grade: 3, xp: 0 }], currentId: 'o', settings: {} }));
  check(MQ.save.current().elites === 0 && MQ.save.current().weakHits === 0, 'v8.1: 古い セーブは 0');
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  console.log('v8.1: 中ボス・弱点・ボスの わざ・なかまを よぶ OK');
})();

/* ===== おうちの人からの てがみ（v8.5）===== */
(function () {
  const L = MQ.letter;
  check(!!L, 'MQ.letter が 読めて いる');
  if (!L) return;
  const prevId = MQ.save.current() && MQ.save.current().id;
  function fresh() {
    MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'l1', name: 'l', grade: 3, playGrade: 3, xp: 0 }], currentId: 'l1', settings: {} }));
    const p = MQ.save.current();
    p.missions = null;
    return p;
  }
  let p = fresh();
  check(p.letter === null, 'てがみ: はじめは ない');
  check(L.pending(p) === false, 'てがみ: 封筒は 出ない');
  // からっぽ・空白だけは 送れない
  check(L.write(p, { text: '   ' }) === null && !p.letter, 'てがみ: からっぽは 送れない');
  // 40文字まで
  const long = 'あ'.repeat(60);
  L.write(p, { text: long });
  check(p.letter.text.length === L.MAX, 'てがみ: ' + L.MAX + '文字まで（' + p.letter.text.length + '）');
  // 教科と コイン
  const areas = L.areas();
  check(areas.length >= 2, 'てがみ: えらべる 教科 ' + areas.length);
  L.write(p, { text: '  きょうも がんばってね  ', areaId: areas[0].id, reward: 9 });
  check(p.letter.text === 'きょうも がんばってね', 'てがみ: 前後の 空白を とる');
  check(p.letter.areaId === areas[0].id && p.letter.areaName === areas[0].name, 'てがみ: 教科を おぼえる');
  check(p.letter.reward === L.MAX_REWARD, 'てがみ: コインは ' + L.MAX_REWARD + 'まいまで（' + p.letter.reward + '）');
  check(L.pending(p), 'てがみ: 封筒が 出る');
  // 読む → ミッションが 1つ ふえる（コインは まだ）
  const before = (MQ.missions.ensure(p).list || []).length;
  const got = L.read(p);
  const ms = MQ.missions.ensure(p);
  check(ms.list.length === before + 1, 'てがみ: ミッションが 1つ ふえる（' + before + ' → ' + ms.list.length + '）');
  const lm = ms.list.filter(function (m) { return m.letter; })[0];
  check(!!lm && lm.param === areas[0].id && lm.reward === L.MAX_REWARD, 'てがみ: ミッションの 中身 ' + JSON.stringify(lm && [lm.param, lm.reward]));
  check(lm && lm.text.indexOf('にがて') === -1 && lm.text.indexOf(areas[0].name) >= 0, 'てがみ: 子どもの 文に「にがて」を 書かない（' + (lm && lm.text) + '）');
  check(got.coins === 0 && (p.coins || 0) === 0, 'てがみ: ミッションつきは 読んだ だけでは コインなし');
  check(!L.pending(p) && p.letter.read, 'てがみ: 読んだら 封筒は 消える');
  check(L.read(p) === null, 'てがみ: 2回は 読めない');
  // ミッションを クリア → コインと「できた」
  const r = MQ.missions.progress(p, { mode: 'normal', correct: 1 }, { areaId: areas[0].id });
  // ほかの ミッションも 同時に できる ことが ある ので、てがみの ぶんが 入って いるかを 見る
  const lc = r.completed.filter(function (m) { return m.letter; })[0];
  check(!!lc && r.coins >= L.MAX_REWARD && p.letter.done, 'てがみ: できたら コイン ' + r.coins + '（てがみ ' + (lc ? lc.reward : 'なし') + '）・done ' + p.letter.done);
  // てがみの ミッションは「3つ ぜんぶ」に 数えない
  const p2 = fresh();
  MQ.missions.ensure(p2);
  L.write(p2, { text: 'てがみ', areaId: areas[0].id, reward: 1 });
  L.read(p2);
  const ms2 = MQ.missions.ensure(p2);
  ms2.list.forEach(function (m) { if (!m.letter) { m.count = m.target; m.done = true; } });
  const r2 = MQ.missions.progress(p2, { mode: 'normal' }, {});
  check(r2.allDone === true, 'てがみ: 3つ ぜんぶの ボーナスは てがみを 待たない');
  // ミッションなしの てがみ → 読んだ ときに コイン
  const p3 = fresh();
  L.write(p3, { text: 'あそぼうね', reward: 2 });
  const g3 = L.read(p3);
  check(g3.coins === 2 && p3.coins === 2 && p3.letter.done, 'てがみ: ミッションなしは 読んだ ときに コイン');
  // 消す・上書き
  L.write(p3, { text: 'つぎの てがみ', reward: 1 });
  check(p3.letter.text === 'つぎの てがみ' && !p3.letter.read, 'てがみ: 新しく 書くと 上書き（1通だけ）');
  L.clear(p3);
  check(!p3.letter && !L.pending(p3), 'てがみ: 消せる');
  // 古い セーブ
  MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'o', name: 'o', grade: 3, xp: 0 }], currentId: 'o', settings: {} }));
  check(MQ.save.current().letter === null, 'てがみ: 古い セーブは null');
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  // 読みこみ
  check(INDEX_HTML.indexOf('js/core/letter.js') >= 0, 'index.html に letter.js');
  const swTx3 = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
  check(swTx3.indexOf("'./js/core/letter.js'") >= 0, 'sw.js の FILES に letter.js');
  const hx3 = fs.readFileSync(path.join(base, 'tools/harness.html'), 'utf8');
  check(hx3.indexOf('../js/core/letter.js') >= 0, 'harness.html に letter.js');
  console.log('おうちの人からの てがみ: 40文字・ミッション・ごほうび・1通だけ OK');
})();

/* ===== スタンプカレンダー（つづけた 日・v8.4）===== */
(function () {
  const S = MQ.streak;
  check(!!S, 'MQ.streak が 読めて いる');
  if (!S) return;
  const prevId = MQ.save.current() && MQ.save.current().id;
  const day = new Date(2026, 8, 20);           // 2026-09-20（テストの きょう）
  MQ.stats.setNow(day);
  function player(daysBack) {                   // daysBack = 何日前まで 答えたか の 一覧
    MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 's1', name: 's', grade: 3, xp: 0 }], currentId: 's1', settings: {} }));
    const p = MQ.save.current();
    p.stats = { rows: {}, wrong: [], days: {} };
    daysBack.forEach(function (i) { p.stats.days[MQ.stats.dayKey(MQ.stats.addDays(day, -i))] = { n: 3, ok: 2, t: 40, u: {} }; });
    return p;
  }
  // ① まだ 1問も 答えて いない
  let p = player([]);
  let st = S.info(p);
  check(st.days === 0 && !st.today && st.fill === 0 && st.here === 1, 'streak: なし → 0日・きょうは 1マスめ ' + JSON.stringify([st.days, st.today, st.fill, st.here]));
  check(st.cells.length === 7 && st.cells[0].today && !st.cells[0].on, 'streak: 7マス・1マスめが きょう');
  // ② きょう ふくめて 3日 つづいた → コイン 1
  p = player([0, 1, 2]);
  st = S.info(p);
  check(st.days === 3 && st.today && st.fill === 3 && st.here === 3, 'streak: 3日 ' + JSON.stringify([st.days, st.today, st.fill, st.here]));
  check(st.claimable === 1, 'streak: 3日で コイン 1（' + st.claimable + '）');
  check(st.next.n === 4 && st.next.coins === 0, 'streak: あしたは 4日め・ごほうびなし');
  let got = S.claim(p);
  check(got && got.coins === 1 && p.coins === 1, 'streak: コインを もらう ' + JSON.stringify(got));
  check(S.claim(p) === null && p.coins === 1, 'streak: 同じ 日に 2回は もらえない');
  // ③ きょう まだ・きのうまで 4日 → 4マス 光って きょうは 5マスめ（コイン 2が 見える）
  p = player([1, 2, 3, 4]);
  st = S.info(p);
  check(st.days === 4 && !st.today && st.fill === 4 && st.here === 5, 'streak: きのうまで 4日 → きょうは 5マスめ ' + JSON.stringify([st.days, st.today, st.fill, st.here]));
  check(st.claimable === 0, 'streak: きょう まだなら ごほうびは まだ');
  check(st.cells[4].reward === 2 && st.cells[2].reward === 1 && st.cells[6].reward === 3, 'streak: ごほうびは 3・5・7マスめ');
  // ④ 7日め → コイン 3・つぎの 日は また 1マスめ
  p = player([0, 1, 2, 3, 4, 5, 6]);
  st = S.info(p);
  check(st.days === 7 && st.here === 7 && st.claimable === 3, 'streak: 7日で コイン 3 ' + JSON.stringify([st.days, st.here, st.claimable]));
  check(st.next.n === 8 && st.next.pos === 1, 'streak: 8日めは また 1マスめ');
  // ⑤ 8日つづき → 1マスめ・光るのは 1つ
  p = player([0, 1, 2, 3, 4, 5, 6, 7]);
  st = S.info(p);
  check(st.days === 8 && st.here === 1 && st.fill === 1, 'streak: 8日 → 1マスめ ' + JSON.stringify([st.days, st.here, st.fill]));
  // ⑥ 切れた（3日前に 1日だけ）→ ばつは ない。0日から
  p = player([3]);
  st = S.info(p);
  check(st.days === 0 && st.here === 1 && st.claimable === 0, 'streak: 切れても 0から（へらす ものは ない）');
  check(p.coins === 0, 'streak: 切れても コインは へらない');
  // ⑦ 1週めの ごほうびは つぎの 週に また もらえる
  p = player([0, 1, 2]);
  S.claim(p);
  p.stats.days[MQ.stats.dayKey(MQ.stats.addDays(day, 0))] = { n: 3, ok: 2, t: 40, u: {} };
  const day2 = new Date(2026, 8, 30);                          // 10日 あとの 3日め
  MQ.stats.setNow(day2);
  const p2 = MQ.save.current();
  p2.stats = { rows: {}, wrong: [], days: {} };
  [0, 1, 2].forEach(function (i) { p2.stats.days[MQ.stats.dayKey(MQ.stats.addDays(day2, -i))] = { n: 3, ok: 2, t: 40, u: {} }; });
  p2.streak = { claimed: { '3': '2026-09-20' } };
  check(S.info(p2).claimable === 1, 'streak: 日が かわれば また もらえる');
  // ⑧ 古い セーブ
  MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'o', name: 'o', grade: 3, xp: 0 }], currentId: 'o', settings: {} }));
  check(MQ.save.current().streak && MQ.save.current().streak.claimed && S.info(MQ.save.current()).days === 0, 'streak: 古い セーブでも 落ちない');
  MQ.stats.setNow(null);
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  // 読みこみ
  check(INDEX_HTML.indexOf('js/core/streak.js') >= 0, 'index.html に streak.js');
  const swTx2 = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
  check(swTx2.indexOf("'./js/core/streak.js'") >= 0, 'sw.js の FILES に streak.js');
  const hx2 = fs.readFileSync(path.join(base, 'tools/harness.html'), 'utf8');
  check(hx2.indexOf('../js/core/streak.js') >= 0, 'harness.html に streak.js');
  console.log('スタンプカレンダー: 7マス・3/5/7の ごほうび・切れても ばつなし OK');
})();

/* ===== あたらしい こと！（お知らせ・v8.3）===== */
(function () {
  const N = MQ.news;
  check(!!N, 'MQ.news が 読めて いる');
  if (!N) return;
  const KINDS = ['mons', 'item', 'coin', 'hero'];
  const ids = {}; MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) { ids[e.id] = 1; });
  const tids = {}; MQ.treasure.list.forEach(function (t) { tids[t.id] = 1; });
  let itemN = 0;
  N.list.forEach(function (e, i) {
    check(/^v\d+\.\d+$/.test(e.v), 'news[' + i + ']: 版の 形 ' + e.v);
    check(/^20\d\d-\d\d-\d\d$/.test(e.date), 'news ' + e.v + ': 日づけ ' + e.date);
    check(typeof e.sw === 'number' && e.sw > 0, 'news ' + e.v + ': sw の 番号');
    check(Array.isArray(e.items) && e.items.length >= 1 && e.items.length <= 3, 'news ' + e.v + ': お知らせは 1〜3つ（' + (e.items || []).length + '）');
    if (i > 0) check(N.cmp(e.v, N.list[i - 1].v) > 0, 'news: 版は 古い → 新しい の じゅん（' + N.list[i - 1].v + ' → ' + e.v + '）');
    (e.items || []).forEach(function (it, j) {
      const w = 'news ' + e.v + '#' + j;
      itemN++;
      check(KINDS.indexOf(it.kind) !== -1, w + ': kind ' + it.kind);
      if (it.kind === 'mons') {
        (Array.isArray(it.id) ? it.id : [it.id]).forEach(function (id) {
          check(!!ids[id], w + ': モンスター ' + id + ' が いる');
        });
        check(!Array.isArray(it.id) || it.id.length <= 3, w + ': ならべるのは 3体まで');
      }
      if (it.kind === 'item') check(!!tids[it.id], w + ': たからもの ' + it.id + ' が ある');
      // 文は ひらがな＋小1の かん字だけ（どの 学年の 子も 読める）
      check(typeof it.title === 'string' && it.title.length > 0 && it.title.length <= 18, w + ': みだしは 18字まで（' + it.title + '）');
      check(typeof it.text === 'string' && it.text.length > 0 && it.text.length <= 62, w + ': 文は 62字まで（' + it.text.length + '字）');
      check(onlyG1Kanji(it.title), w + ': みだしの かん字は 小1まで（' + it.title + '）');
      check(onlyG1Kanji(it.text), w + ': 文の かん字は 小1まで（' + it.text + '）');
    });
  });
  // sw.js の 版を こえて いない こと（上げた ときに ここも 見直す ため）
  const swTx = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
  const swNo = parseInt((swTx.match(/manabi-monster-v(\d+)/) || [])[1], 10);
  const lastSw = N.list[N.list.length - 1].sw;
  check(lastSw <= swNo, 'news: さいごの 版の sw（' + lastSw + '）は sw.js（' + swNo + '）を こえない');
  // 読みこみ：index・harness・sw の ぜんぶに ある
  check(INDEX_HTML.indexOf('js/content/news.js') >= 0 && INDEX_HTML.indexOf('js/ui/news.js') >= 0, 'index.html に news.js（content と ui）');
  const hx = fs.readFileSync(path.join(base, 'tools/harness.html'), 'utf8');
  check(hx.indexOf('../js/content/news.js') >= 0 && hx.indexOf('../js/ui/news.js') >= 0, 'harness.html に news.js');
  check(swTx.indexOf("'./js/content/news.js'") >= 0 && swTx.indexOf("'./js/ui/news.js'") >= 0, 'sw.js の FILES に news.js');

  // ---- 出し分け ----
  const prevId = MQ.save.current() && MQ.save.current().id;
  check(N.cmp('v8.2', 'v8.10') < 0 && N.cmp('v8.2', 'v7.9') > 0 && N.cmp('v8.2', 'v8.2') === 0, 'news: 版の くらべ方');
  // ① まだ 見て いない 子（古い セーブ）＝ ぜんぶ
  MQ.save.importText(JSON.stringify({ version: 2, players: [{ id: 'n1', name: 'n', grade: 3, xp: 0 }], currentId: 'n1', settings: {} }));
  const old = MQ.save.current();
  check(old.seenNews === null, 'news: 古い セーブは まだ 見て いない');
  check(N.items(old).length === itemN, 'news: ぜんぶ 出る（' + N.items(old).length + '/' + itemN + '）');
  check(N.pages(old).length === Math.ceil(itemN / N.PER_PAGE), 'news: 3つずつの ページ（' + N.pages(old).length + '）');
  N.pages(old).forEach(function (pg, i) { check(pg.length >= 1 && pg.length <= 3, 'news: ページ' + i + ' は 1〜3つ'); });
  check(N.big(old), 'news: たまって いる ときは 大アップデート');
  // ② 見おわった あと
  N.markSeen(old);
  check(old.seenNews === N.latest() && N.items(old).length === 0 && N.pages(old).length === 0, 'news: 見たら もう 出ない');
  // ③ 3つ 前の 版まで 見て いる 子
  const mid = N.list[N.list.length - 3];
  old.seenNews = mid.v;
  const want = N.list.slice(N.list.length - 2).reduce(function (n, e) { return n + e.items.length; }, 0);
  check(N.items(old).length === want, 'news: 新しい ぶんだけ 出る（' + N.items(old).length + '/' + want + '）');
  check(N.items(old).every(function (it) { return N.cmp(it.v, mid.v) > 0; }), 'news: 見た 版は 出ない');
  // ④ あたらしく 作った 子には 出さない（ぜんぶ はじめて なので）
  const np = MQ.save.createPlayer('あたらし', { hair: 'gold', skin: 'mid', style: 'short' }, 3);
  check(np.seenNews === N.latest() && N.pages(np).length === 0, 'news: 新しい 子には 出さない（' + np.seenNews + '）');
  MQ.save.load();
  if (prevId) MQ.save.setCurrent(prevId);
  console.log('あたらしい こと！: ' + N.list.length + '版 ' + itemN + 'こ・出し分け OK');
})();

/* ===== 読みこみの じゅんばん（v5.0.1）=====
   本物の index.html・harness.html・この smoke が 同じ じゅんばんで 教科の
   ファイルを 読むか 見る。ずれると「テストは 通るのに アプリだけ 落ちる」に なる。
   （v4.9：zu.js が rika4.js より 後 → 小4の 理科・社会が 読みこみ時に 落ちて、
     小4に して いる 子は「ぼうけんの つづき」が きかなく なって いた） */
(function () {
  const harness = fs.readFileSync(path.join(base, 'tools/harness.html'), 'utf8');
  const hOrder = harness.split(String.fromCharCode(34)).filter(function (s) { return /^[.][.].js.content.[a-z0-9]+[.]js$/.test(s); })
    .map(function (s) { return s.slice(3); });
  check(hOrder.join(',') === CONTENT_ORDER.join(','),
    'harness.html の 教科ファイルの じゅんばんが index.html と 同じ');
  // 読みこみ中に 落ちて いたら この どれかが undefined に なる
  const need = { zu: MQ.zu, sansu3: MQ.sansu3, kokugo3: MQ.kokugo3, rikashakai3: MQ.rikashakai3,
    eigo3: MQ.eigo3, romaji3: MQ.romaji3, sansu1: MQ.sansu1, kokugo1: MQ.kokugo1, sansu2: MQ.sansu2,
    kokugo2: MQ.kokugo2, sansu4: MQ.sansu4, kokugo4: MQ.kokugo4, rika4: MQ.rika4, shakai4: MQ.shakai4,
    eigo4: MQ.eigo4, kanjiQ: MQ.kanjiQ, kakusu: MQ.kakusu, terms: MQ.terms, content: MQ.content };
  Object.keys(need).forEach(function (k) { check(!!need[k], 'MQ.' + k + ' が 読めて いる'); });
  // 図を つかう 教科は zu より 後に 読む こと
  const zuAt = CONTENT_ORDER.indexOf('js/content/zu.js');
  ['rika4', 'shakai4', 'rikashakai3'].forEach(function (f) {
    check(zuAt >= 0 && zuAt < CONTENT_ORDER.indexOf('js/content/' + f + '.js'),
      'zu.js を ' + f + '.js より 先に 読む');
  });
  console.log('読みこみ じゅんばん: index/harness/smoke そろい・教科 ' + CONTENT_ORDER.length + ' ファイル');
})();
/* ===== エラーの 保険（v7.6）===== */
(function () {
  const G = MQ.guard;
  check(!!G, 'MQ.guard が 読めて いる');
  if (!G) return;
  G.clear();
  check(G.count() === 0, 'guard: clear で 0件');
  G.record({ msg: 'TypeError: x is undefined', src: 'https://example.com/manabi/js/content/world3.js', line: 12, col: 5, screen: 'map' });
  check(G.count() === 1 && G.all()[0].src === 'world3.js:12:5', 'guard: src は ファイル名:行:列 ' + JSON.stringify(G.all()[0]));
  G.record({ msg: 'TypeError: x is undefined', src: 'https://example.com/manabi/js/content/world3.js', line: 12, col: 5, screen: 'map' });
  check(G.count() === 1 && G.all()[0].n === 2, 'guard: 同じ エラーは 回数だけ ふえる');
  for (let i = 0; i < 12; i++) G.record({ msg: 'err ' + i, src: 'a.js', line: i });
  check(G.count() === G.MAX, 'guard: ' + G.MAX + '件まで（' + G.count() + '）');
  check(G.text().indexOf('err 11') >= 0 && G.text().indexOf('a.js:11') >= 0, 'guard: text に さいきんの エラー');
  // 読みこみ順：index・harness・sw の ぜんぶに あり、index では いちばん 先
  const scripts = INDEX_HTML.split(String.fromCharCode(34)).filter(function (s) { return /^js.(core|content|ui).[a-z0-9]+[.]js$/.test(s); });
  check(scripts[0] === 'js/core/guard.js', 'index.html は guard.js を いちばん 先に 読む（' + scripts[0] + '）');
  const harness = fs.readFileSync(path.join(base, 'tools/harness.html'), 'utf8');
  check(harness.indexOf('../js/core/guard.js') >= 0 && harness.indexOf('../js/core/guard.js') < harness.indexOf('../js/core/util.js'), 'harness.html も guard.js を util.js より 先に 読む');
  const sw = fs.readFileSync(path.join(base, 'sw.js'), 'utf8');
  check(sw.indexOf("'./js/core/guard.js'") >= 0, 'sw.js の FILES に guard.js');
  const dev = G.device();
  check(typeof dev.text === 'string' && dev.text.indexOf('ホーム画面から') >= 0, 'guard: device の 文');
  G.clear();
  // 保存された ものを 読み直せる
  global.localStorage.setItem(G.KEY, JSON.stringify([{ at: '2026-09-05T01:02:03.000Z', v: 'v90', msg: 'saved', src: 'b.js:3', screen: 'battle', phase: '', n: 3 }]));
  const raw = JSON.parse(global.localStorage.getItem(G.KEY));
  check(raw.length === 1 && raw[0].msg === 'saved', 'guard: localStorage に のこる');
  G.clear();
  console.log('エラーの 保険: record/text/device/読みこみ順 OK');
})();

// 非同期の 検査（AI の generate など）が おわってから まとめる
Promise.all(global.__pending || []).then(function () {
  console.log(failures === 0 ? 'ALL OK' : failures + ' failure(s)');
  process.exit(failures ? 1 : 0);
});
