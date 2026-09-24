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
  /* ABC3きょうだい（v13.21）
     むかしは べつべつの 3体（abc-a エー／abc-b ビー／abc-c シー）＋ 進化形 6体だった。
     息子さんの 絵の とおり 1体（abc → abc-2 ABCナイツ → abc-3 ABCロード）に なったので、
     古い セーブの 記録を 新しい id に まとめる。
       ・図かんの たおした 数は いちばん 多い もの（3体同時で 3つとも ふえて いた ので 足さない）
       ・相棒は **消さない**：同じ すがたに なる ものは いちばん 育って いる 1体を のこし、
         つけた なまえも 引きつぐ。連れて 歩いて いたら 新しい id で 連れて 歩く
       ・にげた敵・ふくしゅうの 敵の id も おきかえる（ない id だと 絵が 出ない）
     何回 よんでも 同じ（もう 古い id が なければ 何も しない） */
  const ABC_OLD = {
    'abc-a': 'abc', 'abc-b': 'abc', 'abc-c': 'abc',
    'abc-a-2': 'abc-2', 'abc-b-2': 'abc-2', 'abc-c-2': 'abc-2',
    'abc-a-3': 'abc-3', 'abc-b-3': 'abc-3', 'abc-c-3': 'abc-3'
  };
  function mergeAbc(p) {
    if (!p) return p;
    Object.keys(ABC_OLD).forEach(function (id) {
      const to = ABC_OLD[id];
      if (p.dex && p.dex[id] != null) { p.dex[to] = Math.max(p.dex[to] || 0, p.dex[id] || 0); delete p.dex[id]; }
      if (p.dexNew && p.dexNew[id]) { p.dexNew[to] = true; delete p.dexNew[id]; }
      const rec = p.pals && p.pals[id];
      if (rec) {
        const cur = p.pals[to];
        const keep = (!cur || (rec.exp || 0) > (cur.exp || 0)) ? Object.assign({}, rec) : cur;
        if (!keep.name && ((cur && cur.name) || rec.name)) keep.name = (cur && cur.name) || rec.name;
        if (cur && cur.got && (!keep.got || cur.got < keep.got)) keep.got = cur.got;
        if (rec.got && (!keep.got || rec.got < keep.got)) keep.got = rec.got;
        if (keep.from && ABC_OLD[keep.from]) keep.from = ABC_OLD[keep.from];
        p.pals[to] = keep;
        delete p.pals[id];
      }
      if (p.pal === id) p.pal = to;
    });
    ['escaped', 'review'].forEach(function (f) {
      Object.keys(p[f] || {}).forEach(function (k) {
        (Array.isArray(p[f][k]) ? p[f][k] : []).forEach(function (e) {
          if (e && ABC_OLD[e.enemyId]) e.enemyId = ABC_OLD[e.enemyId];
          if (e && e.q && ABC_OLD[e.q.enemyId]) e.q.enemyId = ABC_OLD[e.q.enemyId];
        });
      });
    });
    return p;
  }

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
    // 教科書（出版社）（v12.4）：{ sansu: 'tokyo', ... }。ない 教科は きほん。転校しても 学年を 変えても のこる
    if (!p.books || typeof p.books !== 'object' || Array.isArray(p.books)) p.books = {};
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
    // ふくしゅう（v11.1）：1回めで まちがえた 問題を エリアごとに ためる（ルールは js/core/review.js）
    if (!p.review || typeof p.review !== 'object' || Array.isArray(p.review)) p.review = {};
    // ABC3きょうだいが 1体に なった（v13.21）。むかしの 3体と 進化形の 記録を 新しい id に まとめる
    mergeAbc(p);
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
    /* できる ことが ふえた！の カード（v11.1）は はじめての 子だけ。
       もう たたかった ことの ある 子（息子さん）には 出さない */
    if (typeof p.seenUnlock !== 'boolean') p.seenUnlock = (p.battles || 0) > 0;
    // しゅぎょうば（v13.0）：ステージごとの 合格の 回数・合格した ステージの 数・予習を ゆるすか（はじめは ON）
    if (!p.dojo || typeof p.dojo !== 'object' || Array.isArray(p.dojo)) p.dojo = {};
    if (typeof p.dojoDone !== 'number') p.dojoDone = Object.keys(p.dojo).filter(function (k) { return (p.dojo[k] && p.dojo[k].done) > 0; }).length;
    if (typeof p.previewOk !== 'boolean') p.previewOk = true;
    // ことばの 表示（v13.2）：auto ＝ 学年に 合わせる／easy ＝ やさしく（小2）／high ＝ 高学年（小6）
    if (p.textLevel !== 'easy' && p.textLevel !== 'high') p.textLevel = 'auto';
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
    // てきの ため → カウンター（v7.7）：おうちの人ページの 切りかえ（はじめは つける）と 決めた 数
    if (typeof p.attacks !== 'boolean') p.attacks = true;
    if (typeof p.counters !== 'number') p.counters = 0;
    // 敵がわの 攻防（v8.1）：たおした 中ボス・弱点を ついた 数（しょうごう用）
    if (typeof p.elites !== 'number') p.elites = 0;
    if (typeof p.weakHits !== 'number') p.weakHits = 0;
    // まじん・あんこくの そうび（v14.11）：ごちゃまぜで ボスを たおした 数・本気で ボスを たおした 数
    if (typeof p.mixWins !== 'number') p.mixWins = 0;
    if (typeof p.hardWins !== 'number') p.hardWins = 0;
    /* あたらしい こと！（v8.3）：さいごに 見た お知らせの 版。
       古い セーブは null＝まだ 見て いない → たまった ぶんを まとめて 見せる。
       あたらしく 作った 子は newPlayer で いまの 版に する（はじめてなので 何も 出さない） */
    if (typeof p.seenNews !== 'string') p.seenNews = null;
    // おうちの人からの てがみ（v8.5）：1通だけ。中身は letter.js が 作る
    if (!p.letter || typeof p.letter !== 'object' || Array.isArray(p.letter) || !p.letter.text) p.letter = null;
    // スタンプカレンダー（v8.4）：ごほうびを もらった 日 { '3': 'YYYY-MM-DD' }
    if (!p.streak || typeof p.streak !== 'object' || Array.isArray(p.streak)) p.streak = { claimed: {} };
    if (!p.streak.claimed || typeof p.streak.claimed !== 'object') p.streak.claimed = {};
    /* カプセルマシン（v9.0）
         p.capsule … { got: {id:1}, pity: {mon,gear,look}, pulls }（中身は core/capsule.js の ensure）
         p.parts   … カプセルで もらった すがたの パーツ { 'kemomimi': 1, ... }
       古い セーブは からっぽ＝まだ 1つも 引いて いない、で よい。 */
    if (!p.capsule || typeof p.capsule !== 'object' || Array.isArray(p.capsule)) p.capsule = {};
    if (MQ.capsule && MQ.capsule.ensure) MQ.capsule.ensure(p);
    if (!p.parts || typeof p.parts !== 'object' || Array.isArray(p.parts)) p.parts = {};
    /* そうびを きたえる（v13.15）：{ weapon: 0〜5, ... }。古い セーブは ぜんぶ 0 */
    if (MQ.forge && MQ.forge.ensure) MQ.forge.ensure(p);
    if (typeof p.forgeCount !== 'number') p.forgeCount = 0;
    /* レベルの ごほうび（v13.15）：はらった レベル p.lvPaid。
       もう たたかって いる 子は いまの レベルまで はらった ことに して、
       「これまでの ぶん」の むりょう券を わたす（js/core/levelup.js の init） */
    if (MQ.levelup && MQ.levelup.init) MQ.levelup.init(p);
    /* ぴかぴか あつめ（v13.16）：はらった 数 p.pikaPaid（いまの 数までは はらった ことに する）。
       しゅうまつ イベント（v13.16）：おうちの人の 切りかえ p.weekendOff・ポップを 見た 週 p.weekendSeen */
    if (MQ.pika && MQ.pika.init) MQ.pika.init(p);
    // ものがたりを 読む（v14.14）：お話の 山（トランプ方式）
    if (MQ.dokkai3 && MQ.dokkai3.ensure) MQ.dokkai3.ensure(p);
    if (MQ.dokkai1 && MQ.dokkai1.ensure) MQ.dokkai1.ensure(p);   // 読解 小1・小2（v14.27）
    if (MQ.dokkai2 && MQ.dokkai2.ensure) MQ.dokkai2.ensure(p);
    // 問題の 山札（v14.24）：ステージごとの のこり。形が おかしければ 作り直す（中身は world3.js が sig で 見る）
    if (!p.qbag || typeof p.qbag !== 'object' || Array.isArray(p.qbag)) p.qbag = {};
    if (typeof p.weekendOff !== 'boolean') p.weekendOff = false;
    if (typeof p.weekendSeen !== 'string') p.weekendSeen = null;
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
      // 保存できない環境でも ゲームは 続けられる。
      // ただし 容量が いっぱいの ときは だまって いると つぎに ひらいた とき 今日の ぶんが 消える → 1回だけ 知らせる
      const full = e && (e.code === 22 || e.code === 1014 || /quota/i.test(String(e.name) + String(e.message)));
      if (full && !quotaWarned) {
        quotaWarned = true;
        try { if (MQ.guard && MQ.guard.record) MQ.guard.record({ msg: 'セーブが いっぱいで ほぞん できない（' + e.name + '）' }); } catch (e2) { /* なにもしない */ }
        try { if (MQ.ui && MQ.ui.toast) MQ.ui.toast('ほぞんする ばしょが いっぱいだよ。おうちの人に 見せてね'); } catch (e3) { /* なにもしない */ }
      }
    }
  }
  var quotaWarned = false;   // var：読みこみ中に persist が 呼ばれても こわれない ように

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
      xp: 0,
      // はじめての 子に「あたらしい こと！」は 出さない（ぜんぶ はじめて なので）
      seenNews: MQ.news ? MQ.news.latest() : null
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

  /* 学校の 学年を かえる（おうちの人ページ・v7.3）。あそべる 学年だけ。
     あそぶ 学年も そろえ、学期の せっていは「ぜんぶ」に もどす */
  function setGrade(g) {
    const w = (MQ.content && MQ.content.worldForGrade) ? MQ.content.worldForGrade(g) : null;
    // v11.0：worldForGrade は 見つからない ときに 小3を かえす ので、学年そのものも くらべる
    if (!w || w.locked || w.grade !== g) return false;
    update(function (p) { p.grade = g; p.playGrade = g; p.term = 0; p.units = {}; });
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
    if (!w || w.locked || w.grade !== g) return false;   // v11.0：ない 学年を はじく
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
    setName: setName, NAME_MAX: NAME_MAX, setGrade: setGrade,
    getSetting: getSetting, setSetting: setSetting,
    escapedIn: escapedIn, revengeReady: revengeReady, revengeAfterMs: revengeAfterMs, addEscaped: addEscaped, removeEscaped: removeEscaped, countEscaped: countEscaped,
    playGrade: playGrade, areaKey: areaKey, setPlayGrade: setPlayGrade,
    allEscaped: allEscaped, countAllEscaped: countAllEscaped,
    addLog: addLog, addCustom: addCustom, removeCustom: removeCustom, MAX_CUSTOM: MAX_CUSTOM,
    exportText: exportText, importText: importText,
    mergeAbc: mergeAbc,
    BAG_MAX: BAG_MAX
  };
})();
