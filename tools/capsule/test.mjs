/* capsule.js の 引く ルールだけを 単体で 動かす（絵も 画面も いらない）。
   node test-capsule.mjs */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const DIR = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const ctx = { window: {}, console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(DIR + 'js/core/capsule.js', 'utf8'), ctx, { filename: 'capsule.js' });

/* にせの データ（本物の モンスターは まだ 描いて いない）：
   きし 9（ふつう）／ほし 6（レア）／しんじゅう 3（げきレア） */
const mons = [];
for (let i = 1; i <= 9; i++) mons.push({ id: 'cap-kn-' + i, name: 'きし' + i, capsuleOnly: true, cap: 'n' });
for (let i = 1; i <= 6; i++) mons.push({ id: 'cap-st-' + i, name: 'ほし' + i, capsuleOnly: true, cap: 'r' });
for (let i = 1; i <= 3; i++) mons.push({ id: 'cap-sj-' + i, name: 'しんじゅう' + i, capsuleOnly: true, cap: 'sr' });
ctx.MQ.enemies = { dexList: () => mons.concat([{ id: 'slime', name: 'スライム' }]) };
ctx.MQ.pals = { add: (p, id) => { if (!p.pals) p.pals = {}; p.pals[id] = { exp: 0 }; } };
ctx.MQ.hero = {
  capsuleGear: () => [
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'cap-g-' + i, name: 'そうび' + i, cap: 'n' })),
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'cap-gs-' + i, name: 'げきそうび' + i, cap: 'sr' }))
  ],
  capsuleParts: () => Array.from({ length: 20 }, (_, i) => ({ id: 'cap-p-' + i, name: 'パーツ' + i, cap: i < 14 ? 'n' : i < 18 ? 'r' : 'sr' }))
};

const C = ctx.MQ.capsule;
let ng = 0;
const ok = (cond, msg) => { if (!cond) { ng++; console.log('FAIL: ' + msg); } else console.log('ok  : ' + msg); };

/* たねの ある でたらめ（毎回 同じ 結果に する） */
function seeded(seed) {
  let x = seed;
  return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
}
const P = () => ({ coins: 10000, dex: {}, pals: {}, gear: [], parts: {} });

/* 1. わりあいの 合計は 1 */
ok(Math.abs(C.RATES.n + C.RATES.r + C.RATES.sr - 1) < 1e-9, 'かくりつの 合計が 1');

/* 2. 景品の 数 */
ok(C.pool('mon').length === 18, 'なかまは 18（' + C.pool('mon').length + '）');
ok(C.pool('gear').length === 10, 'そうびは 10（' + C.pool('gear').length + '）');
ok(C.pool('look').length === 20, 'すがたは 20（' + C.pool('look').length + '）');
ok(C.byRarity('mon', 'n').length === 9 && C.byRarity('mon', 'r').length === 6 && C.byRarity('mon', 'sr').length === 3,
  'なかまの わけ方 9 / 6 / 3');

/* 3. ふつうに 引ける・コインが へる */
{
  const p = P(); p.coins = 25;
  const r = C.pull(p, 'mon', seeded(7));
  ok(r.ok && p.coins === 15, 'コインが 10まい へる（' + p.coins + '）');
  ok(!!r.item && !r.dup, 'はじめは かならず 新しい ものが 出る');
  ok(!!p.pals[r.item.id], 'なかまに 入る');
}

/* 4. コインが たりない ときは 引けない・コインは へらない */
{
  const p = P(); p.coins = 9;
  const r = C.pull(p, 'mon', seeded(1));
  ok(!r.ok && p.coins === 9, 'コインが たりないと 引けない（' + p.coins + '）');
  ok(r.short === 1, 'あと 何まいか わかる（' + r.short + '）');
}

/* 5. 天井：10回めは かならず げきレア（げきレアを 引かない たねで） */
{
  for (const seed of [3, 11, 29, 101]) {
    const p = P();
    let sawSr = -1;
    for (let i = 0; i < 10; i++) {
      const r = C.pull(p, 'mon', seeded(seed + i * 7));
      if (r.rarity === 'sr' && sawSr < 0) sawSr = i;
    }
    ok(sawSr >= 0 && sawSr <= 9, 'たね' + seed + '：10回いないに げきレアが 出る（' + (sawSr + 1) + '回め）');
  }
}
/* 天井の カウンターが 10を こえない */
{
  const p = P();
  let max = 0;
  for (let i = 0; i < 60; i++) { C.pull(p, 'mon', seeded(i * 13 + 5)); max = Math.max(max, p.capsule.pity.mon); }
  ok(max < C.PITY, '天井の カウンターは ' + C.PITY + ' に とどかない（さいだい ' + max + '）');
}

/* 6. かぶりは コインが 5まい もどる */
{
  const p = P();
  // そうびの げきレア 5個を ぜんぶ 持たせて から げきレアを 引く
  C.ensure(p);
  C.byRarity('gear', 'sr').forEach(g => { p.capsule.got[g.id] = 1; });
  p.capsule.pity.gear = C.PITY - 1;          // つぎは かならず げきレア
  const before = p.coins;
  const r = C.pull(p, 'gear', seeded(5));
  ok(r.dup && r.refund === 5, 'かぶったら コイン 5まい もどる');
  ok(p.coins === before - C.COST + C.REFUND, 'さしひき 5まい（' + (before - p.coins) + '）');
}

/* 7. ぜんぶ あつめると すすみぐあいが いっぱいに なる */
{
  const p = P();
  for (let i = 0; i < 400 && C.progress(p, 'mon').have < 18; i++) C.pull(p, 'mon', seeded(i * 17 + 3));
  const pr = C.progress(p, 'mon');
  ok(pr.have === 18 && pr.total === 18, 'なかま 18体 ぜんぶ そろう（' + pr.have + '/' + pr.total + '）');
  ok(Object.keys(p.pals).length === 18, 'なかまに 18体 入って いる（' + Object.keys(p.pals).length + '）');
}

/* 8. 進化で pals から 消えても「かぶり」は 変わらない（got が 正本） */
{
  const p = P();
  const r = C.pull(p, 'mon', seeded(9));
  delete p.pals[r.item.id];                  // 進化した つもり
  ok(C.has(p, r.item.id), '進化で なかまから 消えても もっている あつかい');
}

/* 9. はずれが ない（400回 引いて かならず 何かが 出る） */
{
  const p = P(); p.coins = 100000;
  let miss = 0;
  for (let i = 0; i < 400; i++) { const r = C.pull(p, 'look', seeded(i * 31 + 2)); if (!r.ok || !r.item) miss++; }
  ok(miss === 0, 'はずれが 0（' + miss + '）');
}

/* 10. 古い セーブ・こわれた セーブでも 落ちない */
{
  const p = { coins: 50 };                   // capsule なし
  const r = C.pull(p, 'mon', seeded(2));
  ok(r.ok, 'capsule の ない セーブでも 引ける');
  const q = { coins: 50, capsule: { got: null, pity: { mon: -5 }, pulls: 'x' } };
  C.ensure(q);
  ok(q.capsule.pity.mon === 0 && q.capsule.pulls === 0 && typeof q.capsule.got === 'object', 'こわれた セーブを なおす');
}

/* 11. 画面に 出す わりあい（rates）— わくが 空の ときは pick と 同じ じゅんで 落ちる。
       そうびは カプセル 5（ふつう）と オーロラ 5（げきレア）だけで レアの わくが ない ので、
       25% は ふつうに 落ちて **ふつう 95% / げきレア 5%** に なる。
       ここが ずれると 画面に ウソの 数字が 出る。 */
{
  const rm = C.rates('mon');
  ok(Math.abs(rm.n - .70) < 1e-9 && Math.abs(rm.r - .25) < 1e-9 && Math.abs(rm.sr - .05) < 1e-9,
    'なかまの わりあいは 70 / 25 / 5（' + JSON.stringify(rm) + '）');
  const rg = C.rates('gear');
  ok(Math.abs(rg.n - .95) < 1e-9 && rg.r === 0 && Math.abs(rg.sr - .05) < 1e-9,
    'そうびの わりあいは 95 / 0 / 5（' + JSON.stringify(rg) + '）');
  ['mon', 'gear', 'look'].forEach(k => {
    const r = C.rates(k);
    ok(Math.abs(r.n + r.r + r.sr - 1) < 1e-9, k + ' の わりあいの 合計が 1');
  });
}

console.log(ng === 0 ? '\nALL OK' : '\n' + ng + ' 件 だめ');
process.exit(ng ? 1 : 0);
