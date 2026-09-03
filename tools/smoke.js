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
['js/core/util.js', 'js/core/pixel.js', 'js/core/tiles.js', 'js/core/sfx.js', 'js/core/bgm.js',
 'js/core/save.js', 'js/core/ai.js', 'js/core/handwrite.js', 'js/core/missions.js', 'js/core/pals.js', 'js/core/speech.js', 'js/core/battle.js',
 'js/core/blocks.js'].concat(CONTENT_ORDER).forEach(load);

const MQ = global.MQ;
const TYPES = ['number', 'choice', 'divrem', 'roma', 'write'];

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
for (let s = 1; s <= 13; s++) {
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
const G1_KANJI = /[大小上下右左一二三四五六七八九十百千円人口目耳手足日月火水木金土山川子女男本字学校年生早正出入立休見音天雨花草虫犬玉王石竹糸貝車町村林森気力文名先夕空白赤青]/g;
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
/* 図と メモ欄は たて700の 端末で 両方 入らない（v4.4）。図の ある 問題は scratch:false */
(function () {
  const FIG = /figbox|class="graph"|class="figwide"|class="tbl"/;
  for (let s = 1; s <= 15; s++) {
    [MQ.sansu4.make(s, 40), MQ.sansu4.make(s, 6, { boss: true })].forEach(function (list) {
      list.forEach(function (q) {
        if (q.type !== 'choice' && FIG.test(q.prompt)) {
          check(q.scratch === false, 'sansu4-' + s + ' 図の ある 問題に メモ欄が ある: ' + MQ.util.stripTags(q.prompt).slice(0, 30));
        }
      });
    });
  }
})();
check(MQ.sansu4.make(4, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 3, '小4の 角に 図が 出る');
check(MQ.sansu4.make(7, 12).every(function (q) { return q.prompt.indexOf('class="tbl"') !== -1 || q.type === 'choice'; }), '小4の 整理の しかたは 表つき');
check(MQ.sansu4.make(8, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 6, '小4の 四角形は 図つき');
check(MQ.sansu4.make(11, 12).filter(function (q) { return q.prompt.indexOf('<svg') !== -1; }).length >= 3, '小4の 面積に 図が 出る');
check(MQ.sansu4.make(5, 30).some(function (q) { return q.decimal; }), '小4の 小数は 小数の こたえ');
check(MQ.sansu4.make(3, 30).some(function (q) { return q.type === 'divrem'; }), '小4の わり算に あまりの 問題が ある');
check(MQ.sansu4.make(14, 12).some(function (q) { return q.prompt.indexOf('class="tbl"') !== -1; }), '小4の かわり方に 表が 出る');

[['kokugo', MQ.kokugo3.questions], ['rikashakai', MQ.rikashakai3.questions], ['eigo', MQ.eigo3.questions], ['kokugo1', MQ.kokugo1.questions], ['kokugo2', MQ.kokugo2.questions], ['rika4', MQ.rika4.questions], ['shakai4', MQ.shakai4.questions], ['eigo4', MQ.eigo4.questions]].forEach(function (pair) {
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
check(w2.areas.length === 2 && w2.areas[0].stages.length === 14 && w2.areas[1].stages.length === 4, '小2は さんすう14＋こくご4');
check(w2.areas[1].stages[1].make(8, {}).some(function (q) { return q.type === 'write' && q.prompt.indexOf('かこう') !== -1; }), '小2の かん字を かく問題も ひらがなの 言いかた');
check(w1.areas.length === 2 && w1.areas[0].stages.length === 12 && w1.areas[1].stages.length === 5, '小1は さんすう12＋こくご5');
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
  // どの 学年でも ノードの よこの いち（16%・82%）は 陸の 上に ある（道が 切れない）
  ['g1', 'g2', 'g3', 'g4'].forEach(function (k) {
    const g = T.build({ height: 900, island: { top: 40, bottom: 860 }, bands: [], path: [], theme: k });
    [16, 38, 60, 82].forEach(function (pct) {
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
check(MQ.treasure.total() === 99, 'たからもの 99個（小3 32＋小1 17＋小2 18＋小4 32）: ' + MQ.treasure.total());
check(MQ.treasure.listFor(w3).length === 32 && MQ.treasure.listFor(w1).length === 17 && MQ.treasure.listFor(w2).length === 18 && MQ.treasure.listFor(w4).length === 32, 'listFor: 小3 32・小1 17・小2 18・小4 32');
[w3, w1, w2, w4].forEach(function (wld) {
  wld.areas.forEach(function (a) {
    a.stages.forEach(function (st) { check(!!MQ.treasure.forStage(st.id), 'たからもの なし: ' + st.id); });
  });
});
const trIds = MQ.treasure.list.map(function (t) { return t.id; });
check(new Set(trIds).size === trIds.length, 'たからものの id が かぶっていない');

/* ---- 主人公・そうび ---- */
check(MQ.hero.gear.length === 20, 'そうび 20点: ' + MQ.hero.gear.length);
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
  ['boss-dragon', 'boss-oni', 'boss-knight', 'boss-slime', 'boss-titan', 'boss-maou', 'boss-dark', 'slime-golden'].forEach(function (id) { dex[id] = 1; });
  const stars = {}; MQ.content.subjectAreas().forEach(function (a) { a.stages.forEach(function (st) { stars[st.id] = 3; }); });
  const tr = {}; MQ.treasure.list.forEach(function (t) { tr[t.id] = 2; });
  const rich = {
    xp: 999999, dex: dex, stars: stars, treasure: tr, coins: 50, battles: 40, defeated: 600,
    frags: { sansu: true, kokugo: true, rikashakai: true, eigo: true },
    best: { 'sansu3-1': { correct: 13, total: 13, time: 100 } },
    fastCount: 9, bestCombo: 18, itemUses: 12, custom: [{ id: 'c1' }],
    missionsDone: 12, revengeWins: 6,  // v3.1 の しょうごう
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
  const L = MQ.enemies.list.filter(function (e) { return e.line; });
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
  check(dex === 153, '図かんは 153体（' + dex + '）');
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
  check(MQ.treasure.powers.length === 8, 'わざは 8しゅるい: ' + MQ.treasure.powers.length);
  const perPower = {};
  MQ.treasure.list.forEach(function (t) {
    const pw = MQ.treasure.powerOf(t.id);
    check(!!pw, 'たからもの ' + t.id + '（' + t.shape + '）に わざが ない');
    if (pw) perPower[pw.id] = (perPower[pw.id] || 0) + 1;
  });
  const want = { burst: 12, shield: 13, freeze: 12, guide: 25, golden: 7, chest: 7, power: 15, charge: 8 };
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
check(MQ.content.worlds.filter(function (w) { return !w.locked; }).length === 4, 'あそべる ワールドは 小1・小2・小3・小4');
check(MQ.content.worldForGrade(3).id === 'g3' && MQ.content.worldForGrade(1).id === 'g1' && !MQ.content.worldForGrade(1).locked, 'worldForGrade');
check(MQ.content.worldForGrade(2).id === 'g2' && !MQ.content.worldForGrade(2).locked, '小2は あそべる');
check(!MQ.content.worldForGrade(4).locked, '小4は あそべる');
check(MQ.content.worldForGrade(5).locked === true && MQ.content.worldForGrade(6).locked === true, '小5・小6 は じゅんびちゅう');
(function () {
  MQ.save.createPlayer('小1テスト', null, 1);
  check(MQ.content.activeWorld().id === 'g1', 'がくねん 1 の プレイヤーは 小1ワールド: ' + MQ.content.activeWorld().id);
  check(MQ.content.subjectAreas().length === 2 && !MQ.content.hasTower(), '小1は 2エリアで 塔なし');
  check(MQ.content.areaOf('sansu').name === 'さんすうの やま' && MQ.content.areaOf('eigo').id === 'eigo', '小1の areaOf（ほかの 学年の エリアも 見つかる）');
  check(MQ.content.towerOpen(MQ.save.current()) === false, '小1では 塔は 開かない');
  MQ.save.createPlayer('小2テスト', null, 2);
  check(MQ.content.activeWorld().id === 'g2' && MQ.content.subjectAreas()[0].stages.length === 14, 'がくねん 2 の プレイヤーは 小2ワールド');
  MQ.save.createPlayer('小4テスト', null, 4);
  check(MQ.content.activeWorld().id === 'g4' && MQ.content.subjectAreas().length === 5 && MQ.content.hasTower(), 'がくねん 4 の プレイヤーは 小4ワールド（5エリア＋さいごの塔）');
  check(MQ.content.areaOf('rika').name === '理科の 湖' && MQ.content.areaOf('shakai').name === '社会の 町', '小4は 理科と 社会が べつの エリア');
  MQ.save.createPlayer('小5テスト', null, 5);
  check(MQ.content.activeWorld().id === 'g3', 'まだ 開いていない がくねんは 小3 に たおす');
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
  check(MQ.save.setPlayGrade(5) === false && MQ.content.activeWorld().id === 'g2', 'じゅんびちゅうの 学年には 変えられない');
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
  check(Object.keys(K.table).filter(function (k) { return /[一-龠]/.test(k); }).length === 659, 'kakusu: かん字 659字 (' + K.count() + ' entries)');
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
  check(!MQ.content.isAvailable(rs[0]), '上書き: こん虫を 外すと 理社1は 閉じる（植物だけでは 少ない）');
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
    'dragon', 'robot', 'snake', 'squid', 'ghost', 'vehicle', 'spider'];
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
  check(['humanoid', 'blob', 'ghost'].indexOf(mTall.kind) >= 0, 'たて長は 立ちすがた／まる／ゆうれい（' + mTall.kind + '）');
  // ② よこ長の たまご → よこ長の しゅるい
  const fWide = G.analyze(blobArt(32, 32, 22, 11, [230, 140, 60], [[18, 26], [26, 26]]), N);
  check(fWide.wide === true, 'よこ長と わかる');
  check(fWide.main[0] > fWide.main[2], '主な 色は オレンジ（赤 > 青）');
  const kWide = G.make(fWide).kind;
  check(['fish', 'beast', 'bug', 'snake', 'blob', 'dragon'].indexOf(kWide) >= 0, 'よこ長の たまごは 生きもの（' + kWide + '）');
  check(['vehicle', 'box', 'robot', 'triple'].indexOf(kWide) < 0, 'よこ長の たまごは のりもの・はこに しない');
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
  check(KINDS.indexOf(m.kind) >= 0, 'しゅるいは 15の どれか');
  check(Object.keys(G.bodies).length === KINDS.length, '体は ' + KINDS.length + 'しゅるい（' + Object.keys(G.bodies).length + '）');
  // あたらしい 7しゅるいも 部品が そろって いる（目・つの・きばの 場所が ある）
  let miss = 0;
  ['dragon', 'robot', 'snake', 'squid', 'ghost', 'vehicle', 'spider'].forEach(function (k) {
    const sp = G.make({ main: [180, 120, 200], accent: null, eyes: 2, horns: 0, legs: 0, wings: false, skull: false, teeth: true, wide: false, tall: false, parts: 1, rectness: 0.5, sideOut: false }, k);
    if (!sp || sp.shape.length < 8) miss++;
    if (!sp.shape.some(function (p) { return p[4] === 'w'; })) miss++;      // 目か きばの 白が ある
  });
  check(miss === 0, 'あたらしい 7しゅるいに 目と 部品が ある（' + miss + '）');
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
// 非同期の 検査（AI の generate など）が おわってから まとめる
Promise.all(global.__pending || []).then(function () {
  console.log(failures === 0 ? 'ALL OK' : failures + ' failure(s)');
  process.exit(failures ? 1 : 0);
});
