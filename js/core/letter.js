/* ---------------------------------------------------------
   おうちの人からの てがみ（v8.5）

   おうちの人ページで 40文字の 手紙を 書くと、子どもの 地図に 封筒が 出る。
   タップして 読むと、おまけの ミッション（教科を 1つ）が
   きょうの ミッションに 1つ ふえる。

   きまり（企画メモ v8.3ワクワクをつくる3つメモ.md の D）
     ・**外には 送らない**（同じ タブレットの localStorage だけ。
       企画書の「データの 外部送信 なし」を くずさない）
     ・**1通だけ**。新しく 書くと 上書き。読んだら 封筒は 消える
     ・**子どもの 画面に「にがて」と 書かない**。ミッションの 文は
       いつもの ミッションと 同じ 言い方（「〇〇で 1かい たたかう」）
     ・ごほうびは コイン 1〜3まい。
       ミッションが ある ときは **できたら** もらえる（いつもの ミッションと 同じ）。
       ミッションが ない ときは **読んだ ときに** もらえる

   セーブ：p.letter = { text, areaId, areaName, reward, at, read, readAt, done }

   DOM を 知らない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.letter = (function () {
  const MAX = 40;            // 文の 長さ
  const MAX_REWARD = 3;      // コインは 3まいまで

  function get(player) { return (player && player.letter) || null; }
  function pending(player) { const l = get(player); return !!(l && !l.read); }

  /* 手紙を 書く（おうちの人）。1通だけ・上書き。
     opts: { text, areaId, reward } … areaId は なくても よい */
  function write(player, opts) {
    if (!player) return null;
    opts = opts || {};
    const text = String(opts.text == null ? '' : opts.text).trim().slice(0, MAX);
    if (!text) return null;                                  // からっぽは 送れない
    let areaId = opts.areaId || null, areaName = null;
    if (areaId) {
      const a = areaOf(areaId);
      if (!a) areaId = null; else areaName = a.name;
    }
    let reward = Math.round(Number(opts.reward) || 0);
    if (reward < 0) reward = 0;
    if (reward > MAX_REWARD) reward = MAX_REWARD;
    player.letter = {
      text: text, areaId: areaId, areaName: areaName, reward: reward,
      at: new Date().toISOString(), read: false, readAt: null, done: false
    };
    return player.letter;
  }

  // いま あそべる 教科（おうちの人が えらぶ ときの 一覧）
  function areas() {
    try {
      return MQ.content.subjectAreas().filter(function (a) {
        return (a.stages || []).some(function (st) { return MQ.content.isAvailable(st); });
      }).map(function (a) { return { id: a.id, name: a.name }; });
    } catch (e) { return []; }
  }
  function areaOf(id) {
    const list = areas();
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* 子どもが 読んだ。かえり値 { coins, mission }
       ・ミッションつき … きょうの ミッションに 1つ ふえる（ごほうびは できた とき）
       ・ミッションなし … コインは その場で */
  function read(player) {
    const l = get(player);
    if (!l || l.read) return null;
    l.read = true;
    l.readAt = new Date().toISOString();
    let coins = 0, mission = null;
    if (l.areaId && MQ.missions) {
      const ms = MQ.missions.ensure(player);
      const already = ms.list.filter(function (m) { return m.letter; })[0];
      if (already) {
        mission = already;                                   // 前の てがみの ぶんが のこって いたら つかい回さない
      } else {
        mission = {
          id: 'area', target: 1, count: 0, done: false,
          param: l.areaId, name: l.areaName, letter: true,
          reward: l.reward || MQ.missions.REWARD_EACH,
          text: 'おうちの人から：' + l.areaName + 'で 1かい たたかう'
        };
        ms.list.push(mission);
      }
    } else {
      coins = l.reward || 0;
      player.coins = (player.coins || 0) + coins;
      l.done = true;                                         // する ことは ない ので これで おしまい
    }
    return { coins: coins, mission: mission };
  }

  function clear(player) { if (player) player.letter = null; }

  /* おうちの人ページ用の ようす */
  function status(player) {
    const l = get(player);
    if (!l) return null;
    return {
      text: l.text, at: l.at, read: !!l.read, readAt: l.readAt,
      areaName: l.areaName || null, reward: l.reward || 0,
      done: !!l.done
    };
  }

  return {
    MAX: MAX, MAX_REWARD: MAX_REWARD,
    get: get, pending: pending, write: write, read: read, clear: clear, status: status, areas: areas
  };
})();
