/* ---------------------------------------------------------
   セーブデータ

   タブレットの中（localStorage）だけに 保存します。
   サーバーには 何も送りません。
   子どもごとに「プレイヤー」を分けられます（パスワードなし）。

   プレイヤー1人ぶんの中身：
     name      なまえ
     grade     がくねん（1〜6）。この子の 学校の 学年。学期の せっていは これに かかる
     playGrade いま あそんで いる 学年（v4.5）。地図の 上で いつでも 変えられる
               （予習・復習）。grade と ちがう ときは 学期の しぼりこみを しない
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
     pals      なかま（相棒）{ id: { exp, got } }／pal  いまの 相棒の id
     bag       [ たからもの id ]   … もちもの（たたかいに もっていく アイテム・3つまで）
     itemUses / fastCount / bestCombo … しょうごう用の カウンター
     areaPlays { 'g3:kokugo': n }  … 教科ごとの たたかった 回数（フィーバー教科・v7.2）
     fever / feverPick             … きょうの フィーバー教科／おうちの人の えらび（v7.2）
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
    // 学期（v2.6）：0 = ぜんぶ／1〜3 = その学期まで。units は 単元ごとの 上書き
    if ([0, 1, 2, 3].indexOf(p.term) === -1) p.term = 0;
    if (!p.units || typeof p.units !== 'object' || Array.isArray(p.units)) p.units = {};
    if (!Array.isArray(p.gear)) p.gear = [];
    if (!Array.isArray(p.titles)) p.titles = ['t-minarai'];
    if (!p.title) p.title = 't-minarai';
    if (!p.stars) p.stars = {};
    if (!p.best) p.best = {};
    if (!p.treasure) p.treasure = {};
    if (!p.frags) p.frags = {};
    // いま あそんで いる 学年（v4.5）。はじめは 学校の 学年と 同じ
    if (typeof p.playGrade !== 'number' || p.playGrade < 1 || p.playGrade > 6) p.playGrade = p.grade;
    if (typeof p.coins !== 'number') p.coins = 0;
    // もちもの（どうぐ）：持っている たからものだけ・3つまで。あきは 自動で うめる
    if (!Array.isArray(p.bag)) p.bag = [];
    p.bag = p.bag.filter(function (id, i) { return !!p.treasure[id] && p.bag.indexOf(id) === i; }).slice(0, BAG_MAX);
    if (MQ.treasure) {
      MQ.treasure.list.forEach(function (t) {
        if (p.bag.length < BAG_MAX && p.treasure[t.id] && p.bag.indexOf(t.id) === -1) p.bag.push(t.id);
      });
    }
    // なかま（相棒・v4.3）：{ id: { exp, got } }／pal＝いま 連れて 歩いて いる 1体
    if (!p.pals || typeof p.pals !== 'object' || Array.isArray(p.pals)) p.pals = {};
    if (typeof p.pal !== 'string' || !p.pals[p.pal]) p.pal = Object.keys(p.pals)[0] || null;
    if (!p.dex) p.dex = {};
    if (!p.dexNew) p.dexNew = {};   // まだ 見ていない「NEW」の しるし
    if (!p.escaped) p.escaped = {};
    /* v4.5：学年を いつでも 変えられる ように なった ので、
       かけら と にげた敵は 学年ごとに 分ける（'g3:sansu' の ような キー）。
       古い セーブは その子の 学年の ぶん として つけかえる */
    ['frags', 'escaped'].forEach(function (f) {
      const src = p[f] || {}, out = {};
      Object.keys(src).forEach(function (k) {
        out[/^g[1-6]:/.test(k) ? k : ('g' + p.grade + ':' + k)] = src[k];
      });
      p[f] = out;
    });
    if (!Array.isArray(p.custom)) p.custom = [];
    if (!Array.isArray(p.log)) p.log = [];
    if (typeof p.battles !== 'number') p.battles = 0;
    if (typeof p.defeated !== 'number') p.defeated = 0;
    // しょうごうの ための カウンター（v2.0）
    if (typeof p.itemUses !== 'number') p.itemUses = 0;     // アイテムを 使った 回数
    if (typeof p.fastCount !== 'number') p.fastCount = 0;   // はやとき ボーナスを とった 回数
    if (typeof p.bestCombo !== 'number') p.bestCombo = 0;   // いちばん 長い コンボ
    // きょうの ミッション（v3.1）：中身は missions.js が 作る
    if (!p.missions || typeof p.missions !== 'object') p.missions = null;
    if (typeof p.missionsDone !== 'number') p.missionsDone = 0;   // クリアした ミッションの 数
    if (typeof p.missionDays !== 'number') p.missionDays = 0;     // 3つ ぜんぶ クリアした 日の 数
    // きょうの フィーバー教科（v7.2）：教科ごとの たたかった 回数／きょうの ぶん／おうちの人の えらび
    if (!p.areaPlays || typeof p.areaPlays !== 'object' || Array.isArray(p.areaPlays)) p.areaPlays = {};
    if (!p.fever || typeof p.fever !== 'object') p.fever = null;
    if (typeof p.feverPick !== 'string') p.feverPick = null;
    // v1.1 までの 装備 id は そのまま 使えないので 消す（新しい30点に 置きかわる）
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

  /* 主人公の なまえを かえる（v7.0）。前後の 空白を とって 10文字まで。
     からっぽは 変えない（false）。かわった ときは きろくにも のこす */
  const NAME_MAX = 10;
  function setName(name) {
    name = String(name || '').trim().slice(0, NAME_MAX);
    if (!name) return false;
    const p = current();
    if (!p) return false;
    if (p.name !== name) {
      addLog(p, p.name + ' は なまえを ' + name + ' に かえた');
      p.name = name;
    }
    persist();
    return true;
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
  /* いま あそんで いる 学年（v4.5）。かけらと にげた敵は 学年ごとに 分ける。
     いま 開いて いる ワールドが あれば それ、なければ プレイヤーの playGrade */
  function playGrade(player) {
    try {
      if (MQ.content && MQ.content.activeWorld) return MQ.content.activeWorld().grade;
    } catch (e) { /* まだ 読みこまれて いない */ }
    const p = player || current();
    const g = p && (p.playGrade || p.grade);
    return (typeof g === 'number' && g >= 1 && g <= 6) ? g : 3;
  }
  // 'sansu' → 'g4:sansu'
  function areaKey(areaId, player) { return 'g' + playGrade(player) + ':' + areaId; }

  // 学年を かえる（地図の 学年チップ）。あそべない 学年は 変えない
  function setPlayGrade(g) {
    const w = (MQ.content && MQ.content.worldForGrade) ? MQ.content.worldForGrade(g) : null;
    if (!w || w.locked) return false;
    update(function (p) { p.playGrade = g; });
    return true;
  }

  function escapedIn(player, areaId) {
    const key = areaKey(areaId, player);
    if (!player.escaped) player.escaped = {};
    if (!player.escaped[key]) player.escaped[key] = [];
    return player.escaped[key];
  }

  function addEscaped(player, areaId, entry) {
    const list = escapedIn(player, areaId).filter(function (e) { return e.key !== entry.key; });
    const akey = areaKey(areaId, player);
    list.unshift(entry);
    player.escaped[akey] = list.slice(0, MAX_ESCAPED);
  }

  function removeEscaped(player, areaId, key) {
    player.escaped[areaKey(areaId, player)] = escapedIn(player, areaId).filter(function (e) { return e.key !== key; });
  }

  function countEscaped(player, areaId) {
    return escapedIn(player, areaId).length;
  }

  /* リベンジ（v3.1）：にげた敵は すぐには もどらず、時間が たってから 通常バトルに 出る。
     とっくんは いつでも できる。at が ない 古い entry は「もう 時間が たった」と 見なす */
  const REVENGE_AFTER_MS = 20 * 60 * 60 * 1000;   // 約1日（20時間）
  function revengeReady(player, areaId, nowMs) {
    const t = nowMs || Date.now();
    return escapedIn(player, areaId).filter(function (e) {
      if (!e.at) return true;
      const a = Date.parse(e.at);
      return isNaN(a) || t - a >= REVENGE_AFTER_MS;
    });
  }

  // ぜんぶの エリアの にげた敵（とっくんバトル用）
  function allEscaped(player) {
    const out = [];
    const pre = 'g' + playGrade(player) + ':';
    Object.keys(player.escaped || {}).forEach(function (key) {
      if (key.indexOf(pre) !== 0) return;    // ほかの 学年の ぶんは 数えない
      (player.escaped[key] || []).forEach(function (e) {
        out.push({ areaId: key.slice(pre.length), entry: e });
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
  // テスト用
  function revengeAfterMs() { return REVENGE_AFTER_MS; }

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
    setName: setName, NAME_MAX: NAME_MAX,
    getSetting: getSetting, setSetting: setSetting,
    escapedIn: escapedIn, revengeReady: revengeReady, revengeAfterMs: revengeAfterMs, addEscaped: addEscaped, removeEscaped: removeEscaped, countEscaped: countEscaped,
    playGrade: playGrade, areaKey: areaKey, setPlayGrade: setPlayGrade,
    allEscaped: allEscaped, countAllEscaped: countAllEscaped,
    addLog: addLog, addCustom: addCustom, removeCustom: removeCustom,
    exportText: exportText, importText: importText,
    BAG_MAX: BAG_MAX
  };
})();
