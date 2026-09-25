/* ---------------------------------------------------------
   コインの もらい方（v14.31）— ★3 を とった ところは くり返しても 稼げない

   ユーザー「おうちカプセルマシンは 簡単な問題ばかりして コインを 稼げないように したい」
   → 数えたら、コインは **むずかしさを 1つも 見て いなかった**（実測・正答率98%・各150回）：
        小1 さんすう1 … 3.97まい／17.9問
        小3 さんすう1 … 3.95まい／17.8問
        小6 さんすう15 … 3.97まい／17.8問
     問題数も 同じ 18問。ちがうのは「子どもが 答えるのに かかる 時間」だけ だった。
     内わけも ぜんぶ「1回 おわらせた こと」への ごほうび（たからばこ＋ボス＋ゴールデン 2.95／★3 1.00）。
     だから 学年を 小1に して さんすう1 を くり返すのが いちばん 速い 稼ぎ方に なって いた。

   壁打ちで 決めた こと（B＋C）：
     B（ここ）… **もう ★3 を とった ステージ**を くり返した ときは コインが 1まいに なる。
     C（js/core/prize.js）… おうちの人の マシンは **1日 N回まで**（はじめは 2回・おうちの人が 決める）。

   ★もどさない きまり
     ・**学年では 見ない。** 小3の 子が 小2の 国語を 復習するのは 大事な 使い方（ユーザー談）。
       まだ ★3 で なければ 下の 学年でも 満額。「復習を 罰しない」が この 案を えらんだ 理由。
     ・**けいけんち・そうび・図かん・たからもの・ぴかぴか・なかまは 1つも へらさない。**
       へらすのは コインだけ（ばつを 与えない きまり）。
     ・**0まいに しない**（MASTERED_MAX = 1）。ぜんぶ 取り上げると ばつに なる。
     ・ふつうに 進めて いる 子（まだ ★3 で ない ところを やる）は **1まいも 変わらない**。
     ・ごちゃまぜ・とっくん・さいごの塔には かけない（★が つかない／稼ぎ道では ない）。

   DOM を 知らない。つかう のは js/ui/battle.js の applyRewards。
   仕様は docs/v14.31コイン稼ぎメモ.md。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.coins = (function () {
  const MASTERED_MAX = 1;   // ★3 ずみの ステージで もらえる コインの さいだい

  /* この ステージは もう ★3 か（この たたかいの 前の きろくで 見る） */
  function mastered(player, stageId) {
    if (!player || !stageId) return false;
    return ((player.stars || {})[stageId] || 0) >= 3;
  }

  /* この たたかいに ふたを かけるか。
     ★が つく ふつうの たたかい（タイムアタックを ふくむ）だけ。
     ごちゃまぜ（mix）・とっくん（tokkun）・さいごの塔（tower）には かけない */
  function capped(sum) {
    if (!sum) return false;
    if (sum.mix) return false;
    return sum.mode !== 'tokkun' && sum.mode !== 'tower';
  }

  /* この たたかいで ほんとうに もらう コイン
     かえり値 { coins, raw, capped } … capped が true なら けっか画面で 1行 出す */
  function earn(player, sum) {
    const raw = Math.max(0, (sum && sum.coins) || 0);
    const out = { coins: raw, raw: raw, capped: false, max: MASTERED_MAX };
    if (!capped(sum) || !mastered(player, sum.stageId)) return out;
    if (raw <= MASTERED_MAX) return out;
    out.coins = MASTERED_MAX;
    out.capped = true;
    return out;
  }

  return { MASTERED_MAX: MASTERED_MAX, mastered: mastered, capped: capped, earn: earn };
})();
