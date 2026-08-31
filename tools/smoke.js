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
['js/core/util.js', 'js/core/pixel.js', 'js/core/tiles.js', 'js/core/sfx.js', 'js/core/bgm.js',
 'js/core/save.js', 'js/core/battle.js',
 'js/core/blocks.js', 'js/content/monsterart.js', 'js/content/face.js', 'js/content/enemies.js', 'js/content/hero.js', 'js/content/art.js', 'js/content/treasure.js',
 'js/content/sansu3.js', 'js/content/kokugo3.js', 'js/content/rikashakai3.js', 'js/content/eigo3.js',
 'js/content/romaji3.js', 'js/content/sansu1.js', 'js/content/kokugo1.js', 'js/content/world3.js'].forEach(load);

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
    check(Number.isInteger(q.answer) && q.answer >= 0, where + ': integer answer ' + JSON.stringify(q.answer) + ' ' + q.prompt);
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
for (let s = 1; s <= 6; s++) {
  const st = MQ.sansu3.stages[s];
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
}
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

[['kokugo', MQ.kokugo3.questions], ['rikashakai', MQ.rikashakai3.questions], ['eigo', MQ.eigo3.questions], ['kokugo1', MQ.kokugo1.questions]].forEach(function (pair) {
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

/* ---- たからもの ---- */
check(MQ.treasure.total() === 49, 'たからもの 49個（小3 32＋小1 17）: ' + MQ.treasure.total());
check(MQ.treasure.listFor(w3).length === 32 && MQ.treasure.listFor(w1).length === 17, 'listFor: 小3 32・小1 17');
[w3, w1].forEach(function (wld) {
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
  ['boss-dragon', 'boss-oni', 'boss-knight', 'boss-slime', 'boss-maou', 'slime-golden'].forEach(function (id) { dex[id] = 1; });
  const stars = {}; MQ.content.subjectAreas().forEach(function (a) { a.stages.forEach(function (st) { stars[st.id] = 3; }); });
  const tr = {}; MQ.treasure.list.forEach(function (t) { tr[t.id] = 2; });
  const rich = {
    xp: 999999, dex: dex, stars: stars, treasure: tr, coins: 50, battles: 40, defeated: 600,
    frags: { sansu: true, kokugo: true, rikashakai: true, eigo: true },
    best: { 'sansu3-1': { correct: 13, total: 13, time: 100 } },
    fastCount: 9, bestCombo: 14, itemUses: 12, custom: [{ id: 'c1' }]
  };
  const gotAll = MQ.hero.checkTitles(rich);
  check(gotAll.length === MQ.hero.titles.length, 'ぜんぶ そろえば ぜんぶ もらえる: ' + gotAll.length + ' / ' + MQ.hero.titles.length);
  check(rich.title === 't-yusha', 'さいごに もらった しょうごうが つく: ' + rich.title);
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
    check(e && e.area === a && !e.rare && !e.hidden, 'enemy ' + id + ' belongs to ' + a);
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
MQ.save.update(function (pl) { pl.frags = { sansu: true, kokugo: true, rikashakai: true }; });
check(MQ.content.towerOpen(MQ.save.current()) === false, 'かけら3つでは 塔は 開かない');
MQ.save.update(function (pl) { pl.frags.eigo = true; });
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
  const want = { burst: 6, shield: 6, freeze: 5, guide: 12, golden: 4, chest: 4, power: 8, charge: 4 };
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
check(MQ.content.worlds.filter(function (w) { return !w.locked; }).length === 2, 'あそべる ワールドは 小1 と 小3');
check(MQ.content.worldForGrade(3).id === 'g3' && MQ.content.worldForGrade(1).id === 'g1' && !MQ.content.worldForGrade(1).locked, 'worldForGrade');
check(MQ.content.worldForGrade(2).locked === true && MQ.content.worldForGrade(6).locked === true, '小2・小6 は じゅんびちゅう');
(function () {
  MQ.save.createPlayer('小1テスト', null, 1);
  check(MQ.content.activeWorld().id === 'g1', 'がくねん 1 の プレイヤーは 小1ワールド: ' + MQ.content.activeWorld().id);
  check(MQ.content.subjectAreas().length === 2 && !MQ.content.hasTower(), '小1は 2エリアで 塔なし');
  check(MQ.content.areaOf('sansu').name === 'さんすうの やま' && MQ.content.areaOf('eigo').id === 'eigo', '小1の areaOf（ほかの 学年の エリアも 見つかる）');
  check(MQ.content.towerOpen(MQ.save.current()) === false, '小1では 塔は 開かない');
  MQ.save.createPlayer('小2テスト', null, 2);
  check(MQ.content.activeWorld().id === 'g3', 'まだ 開いていない がくねんは 小3 に たおす');
  MQ.content.setActive(MQ.content.world1);
  check(MQ.content.subjectAreas().length === 2, 'setActive で 決めうち');
  MQ.content.setActive(null);
})();
(function () {
  const gp = MQ.save.createPlayer('がくねんテスト', null, 3);
  check(gp.grade === 3, 'つくった プレイヤーに がくねんが 入る');
  MQ.save.update(function (pl) { delete pl.grade; });
  MQ.save.importText(MQ.save.exportText());
  check(MQ.save.current().grade === 3, 'がくねんの ない 古い セーブは 小3 に なる');
})();

/* ---- セーブの 引きつぎ（v1.1の データでも 動く） ---- */
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

console.log(failures === 0 ? 'ALL OK' : failures + ' failure(s)');
process.exit(failures ? 1 : 0);
