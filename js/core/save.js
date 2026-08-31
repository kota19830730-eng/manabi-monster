/* ---------------------------------------------------------
   セーブデータ

   タブレットの中（localStorage）だけに 保存します。
   サーバーには 何も送りません。
   子どもごとに「プレイヤー」を分けられます（パスワードなし）。

   プレイヤー1人ぶんの中身：
     name      なまえ
     grade     がくねん（1〜6。いまは 3 だけ あそべる。ほかは じゅんびちゅう）
     look      { face, skin, eye, eyeColor, brow, nose, mouth,
                 style, hair, glass }         … 主人公の 見た目（絵は face.js）
     xp        けいけんち（レベルは xp から 計算する。hero.js）
     gear      持っている装備の id の一覧
     equipped  { weapon, shield, helm, armor, cape }  いま身につけている装備
     titles    もらった しょうごうの id の一覧
     title     いま つけている しょうごう
     stars     { ステージid: 星の数 }
     best      { ステージid: { correct, total, time } } … じぶんの さいこう記ろく
     treasure  { ステージid: 1 or 2 }   1=ふつう 2=金色（★3）
     frags     { エリアid: true }        … まなびの かけら
     coins     きんのコインの 数
     bag       [ たからもの id ]   … もちもの（たたかいに もっていく アイテム・3つまで）
     itemUses / fastCount / bestCombo … しょうごう用の カウンター
     dex       { 敵id: たおした回数 }      … 図鑑
     escaped   { エリアid: [にげた敵の一覧] }  … まちがえた問題
     custom    [ { id, name, area, png } ]  … 写真から 作った モンスター
     log       [ { at, text } ]             … おうちの人ページ用の きろく
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.save = (function () {
  const KEY = 'manabi-quest-save-v1';
  const MAX_ESCAPED = 30;
  const MAX_LOG = 120;
  const MAX_CUSTOM = 40;
  const BAG_MAX = 3;         // もちものは 3つまで
  let state = null;

  function blank() {
    return { version: 2, players: [], currentId: null, settings: { sfx: true, bgm: true } };
  }

  // 古いセーブでも 動くように、足りない ところを うめる
  function migratePlayer(p) {
    // 見た目は 足りない ところを きほんの 顔で うめる
    // （v1.2 までの セーブは かみ・はだ・かみがた だけ。それは そのまま のこる）
    if (MQ.hero) p.look = MQ.hero.lookOf(p);
    else if (!p.look) p.look = {};
    if (!p.equipped) p.equipped = {};
    ['weapon', 'shield', 'helm', 'armor', 'cape'].forEach(function (slot) {
      if (!(slot in p.equipped)) p.equipped[slot] = null;
    });
    // がくねん（1〜6）。古い セーブは 小3
    if (typeof p.grade !== 'number' || p.grade < 1 || p.grade > 6) p.grade = 3;
    if (!Array.isArray(p.gear)) p.gear = [];
    if (!Array.isArray(p.titles)) p.titles = ['t-minarai'];
    if (!p.title) p.title = 't-minarai';
    if (!p.stars) p.stars = {};
    if (!p.best) p.best = {};
    if (!p.treasure) p.treasure = {};
    if (!p.frags) p.frags = {};
    if (typeof p.coins !== 'number') p.coins = 0;
    // もちもの（どうぐ）：持っている たからものだけ・3つまで。あきは 自動で うめる
    if (!Array.isArray(p.bag)) p.bag = [];
    p.bag = p.bag.filter(function (id, i) { return !!p.treasure[id] && p.bag.indexOf(id) === i; }).slice(0, BAG_MAX);
    if (MQ.treasure) {
      MQ.treasure.list.forEach(function (t) {
        if (p.bag.length < BAG_MAX && p.treasure[t.id] && p.bag.indexOf(t.id) === -1) p.bag.push(t.id);
      });
    }
    if (!p.dex) p.dex = {};
    if (!p.dexNew) p.dexNew = {};   // まだ 見ていない「NEW」の しるし
    if (!p.escaped) p.escaped = {};
    if (!Array.isArray(p.custom)) p.custom = [];
    if (!Array.isArray(p.log)) p.log = [];
    if (typeof p.battles !== 'number') p.battles = 0;
    if (typeof p.defeated !== 'number') p.defeated = 0;
    // しょうごうの ための カウンター（v2.0）
    if (typeof p.itemUses !== 'number') p.itemUses = 0;     // アイテムを 使った 回数
    if (typeof p.fastCount !== 'number') p.fastCount = 0;   // はやとき ボーナスを とった 回数
    if (typeof p.bestCombo !== 'number') p.bestCombo = 0;   // いちばん 長い コンボ
    // v1.1 までの 装備 id は そのまま 使えないので 消す（新しい20点に 置きかわる）
    p.gear = p.gear.filter(function (id) { return MQ.hero && MQ.hero.getGear(id); });
    Object.keys(p.equipped).forEach(function (slot) {
      if (p.equipped[slot] && MQ.hero && !MQ.hero.getGear(p.equipped[slot])) p.equipped[slot] = null;
    });
    return p;
  }

  function migrate(s) {
    if (!s.settings) s.settings = {};
    // 「おと」1つ → 効果音 と BGM に 分ける
    if ('sound' in s.settings) {
      const on = s.settings.sound;
      if (!('sfx' in s.settings)) s.settings.sfx = on;
      if (!('bgm' in s.settings)) s.settings.bgm = on;
      delete s.settings.sound;
    }
    if (!('sfx' in s.settings)) s.settings.sfx = true;
    if (!('bgm' in s.settings)) s.settings.bgm = true;
    s.players.forEach(migratePlayer);
    s.version = 2;
    return s;
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : blank();
    } catch (e) {
      state = blank();
    }
    if (!state || !Array.isArray(state.players)) state = blank();
    migrate(state);
    return state;
  }

  function persist() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // 保存できない環境でも ゲームは 続けられる
    }
  }

  function get() {
    return state || load();
  }

  function newPlayer(name, look, grade) {
    return migratePlayer({
      id: MQ.util.uid(),
      name: name,
      grade: grade || 3,
      look: look || (MQ.hero ? MQ.hero.defaultLook() : {}),
      createdAt: new Date().toISOString(),
      xp: 0
    });
  }

  function createPlayer(name, look, grade) {
    const p = newPlayer(name, look, grade);
    get().players.push(p);
    get().currentId = p.id;
    persist();
    return p;
  }

  function current() {
    const s = get();
    for (let i = 0; i < s.players.length; i++) {
      if (s.players[i].id === s.currentId) return s.players[i];
    }
    return null;
  }

  function setCurrent(id) {
    get().currentId = id;
    persist();
  }

  // いまのプレイヤーを 書きかえて 保存する： update(function (p) { p.xp += 10; })
  function update(fn) {
    const p = current();
    if (!p) return null;
    fn(p);
    persist();
    return p;
  }

  function deletePlayer(id) {
    const s = get();
    s.players = s.players.filter(function (p) { return p.id !== id; });
    if (s.currentId === id) s.currentId = null;
    persist();
  }

  function getSetting(name, fallback) {
    const st = get().settings;
    return (name in st) ? st[name] : fallback;
  }

  function setSetting(name, value) {
    get().settings[name] = value;
    persist();
  }

  /* ---- にげた敵（まちがえた問題） ---- */
  function escapedIn(player, areaId) {
    if (!player.escaped) player.escaped = {};
    if (!player.escaped[areaId]) player.escaped[areaId] = [];
    return player.escaped[areaId];
  }

  function addEscaped(player, areaId, entry) {
    const list = escapedIn(player, areaId).filter(function (e) { return e.key !== entry.key; });
    list.unshift(entry);
    player.escaped[areaId] = list.slice(0, MAX_ESCAPED);
  }

  function removeEscaped(player, areaId, key) {
    player.escaped[areaId] = escapedIn(player, areaId).filter(function (e) { return e.key !== key; });
  }

  function countEscaped(player, areaId) {
    return escapedIn(player, areaId).length;
  }

  // ぜんぶの エリアの にげた敵（とっくんバトル用）
  function allEscaped(player) {
    const out = [];
    Object.keys(player.escaped || {}).forEach(function (areaId) {
      escapedIn(player, areaId).forEach(function (e) {
        out.push({ areaId: areaId, entry: e });
      });
    });
    return out;
  }

  function countAllEscaped(player) {
    return allEscaped(player).length;
  }

  /* ---- ぼうけんの きろく（おうちの人ページ） ---- */
  function addLog(player, text) {
    if (!Array.isArray(player.log)) player.log = [];
    player.log.unshift({ at: new Date().toISOString(), text: text });
    player.log = player.log.slice(0, MAX_LOG);
  }

  /* ---- じぶんの モンスター ---- */
  function addCustom(player, mon) {
    if (!Array.isArray(player.custom)) player.custom = [];
    player.custom = player.custom.filter(function (m) { return m.id !== mon.id; });
    player.custom.unshift(mon);
    player.custom = player.custom.slice(0, MAX_CUSTOM);
  }

  function removeCustom(player, id) {
    player.custom = (player.custom || []).filter(function (m) { return m.id !== id; });
  }

  /* ---- ひかえ（バックアップ）用 ---- */
  function exportText() {
    return JSON.stringify(get());
  }

  function importText(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.players)) throw new Error('形式がちがいます');
    state = migrate(data);
    persist();
  }

  return {
    load: load, get: get, persist: persist,
    createPlayer: createPlayer, current: current, setCurrent: setCurrent, update: update, deletePlayer: deletePlayer,
    getSetting: getSetting, setSetting: setSetting,
    escapedIn: escapedIn, addEscaped: addEscaped, removeEscaped: removeEscaped, countEscaped: countEscaped,
    allEscaped: allEscaped, countAllEscaped: countAllEscaped,
    addLog: addLog, addCustom: addCustom, removeCustom: removeCustom,
    exportText: exportText, importText: importText,
    BAG_MAX: BAG_MAX
  };
})();
