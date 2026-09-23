/* ---------------------------------------------------------
   歴史の 写真（v14.22）

   ユーザー「社会も 偉人の 写真ぐらいなら いいんじゃないの？」「道具とか 物も」。
   **問題には つけない。答えた あとに 出す。**
   「十七条の 憲法を 定めたのは？」に 顔を 先に 出すと 答えが ばれる ため
   （v4.9 の きまり）。答えが 出た あとなら ばれず、人物や ものが 頭に のこる。

   写真は Wikimedia Commons の パブリックドメイン／CC の もの。
   **作者と ライセンスは `CREDITS` に ひかえて おうちの人ページに 出す**（CC の 条件）。
   絵は assets/rekishi/<id>.jpg（よこ 260px まで・ぜんぶで 約630KB）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.rekishi = (function () {
  const h = MQ.util.h;

  /* id: [画面の 名前, ひと／もの, ひとこと] */
  const PICS = {
    shotoku: ['聖徳太子', 'ひと', '天皇を 中心と する 国づくりを すすめた'],
    tenji: ['中大兄皇子', 'ひと', '大化の 改新を すすめた（のちの 天智天皇）'],
    shomu: ['聖武天皇', 'ひと', '奈良に 大仏を 作らせた'],
    kanmu: ['桓武天皇', 'ひと', '都を 平安京に うつした'],
    michinaga: ['藤原道長', 'ひと', '天皇の きさきに むすめを 入れて 力を にぎった'],
    murasaki: ['紫式部', 'ひと', '「源氏物語」を 書いた'],
    sei: ['清少納言', 'ひと', '「まくらのそうし」を 書いた'],
    kiyomori: ['平清盛', 'ひと', '武士で はじめて 太政大臣に なった'],
    yoritomo: ['源頼朝', 'ひと', '鎌倉に ばくふを ひらいた'],
    takauji: ['足利尊氏', 'ひと', '室町ばくふを ひらいた'],
    yoshimitsu: ['足利義満', 'ひと', '金閣を 建てた'],
    yoshimasa: ['足利義政', 'ひと', '銀閣を 建てた'],
    nobunaga: ['織田信長', 'ひと', '鉄砲を 使い 楽市楽座を おこなった'],
    hideyoshi: ['豊臣秀吉', 'ひと', '検地と 刀がりを おこなった'],
    ieyasu: ['徳川家康', 'ひと', '江戸ばくふを ひらいた'],
    genpaku: ['杉田玄白', 'ひと', '「解体新書」を ほんやくした'],
    norinaga: ['本居宣長', 'ひと', '「古事記伝」を 書いた'],
    tadataka: ['伊能忠敬', 'ひと', '歩いて 日本の 地図を 作った'],
    hiroshige: ['歌川広重', 'ひと', '「東海道五十三次」を えがいた'],
    itagaki: ['板垣退助', 'ひと', '自由民権運動を すすめた'],
    hirobumi: ['伊藤博文', 'ひと', 'はじめての 内閣総理大臣'],
    tateana: ['たて穴住居', 'もの', '縄文・弥生の ころの すまい'],
    takayuka: ['高床倉庫', 'もの', '弥生時代に 米を たくわえた'],
    jomondoki: ['縄文土器', 'もの', 'なわの 文様が ついて いる'],
    dotaku: ['銅たく', 'もの', '弥生時代の 青銅器'],
    kango: ['ほりや さく', 'もの', 'むらの 争いに そなえた（吉野ヶ里）'],
    kofun: ['古ふん', 'もの', '王や 有力者の はか'],
    horyuji: ['法隆寺', 'もの', '世界で いちばん 古い 木造建築'],
    heijo: ['平城京', 'もの', '奈良時代の 都'],
    shosoin: ['正倉院', 'もの', '聖武天皇の 宝物が おさめられて いる'],
    todaiji: ['東大寺の 大仏', 'もの', '聖武天皇が 作らせた'],
    manyoshu: ['万葉集', 'もの', '奈良時代の 歌集'],
    heian: ['平安京', 'もの', '平安時代の 都（模型）'],
    kana: ['かな文字', 'もの', 'かな文字で 物語が 書かれた'],
    shinden: ['しんでん造', 'もの', '平安時代の 貴族の やしき'],
    kinkaku: ['金閣', 'もの', '足利義満が 建てた'],
    ginkaku: ['銀閣', 'もの', '足利義政が 建てた'],
    shoin: ['たたみと しょうじ', 'もの', '書院造＝いまの 和室の もと'],
    noh: ['能', 'もの', '室町時代に さかんに なった'],
    terakoya: ['寺子屋', 'もの', '江戸時代に 町人の 子が 学んだ'],
    tokaido: ['東海道', 'もの', '江戸と 京都を むすぶ 道'],
    kaitai: ['解体新書', 'もの', 'オランダの 医学書を ほんやくした'],
    inozu: ['伊能図', 'もの', '伊能忠敬が 作った 日本地図'],
    tomioka: ['富岡製糸場', 'もの', '明治の 官営工場'],
    tetsudo: ['鉄道', 'もの', '明治に 新橋〜横浜で 開通'],
    kenpo: ['大日本帝国憲法', 'もの', '1889年に 発布された'],
    genbaku: ['原爆ドーム', 'もの', '広島に のこる 戦争の あと']
  };

  /* 出どころ（おうちの人ページに そのまま 出す） */
  const CREDITS = {
    shotoku: { lic: 'Public domain', by: 'Unknown authorUnknown author', file: 'Shōtoku_Taishi_Shōmankyō_Kōsan.jpg' },
    tenji: { lic: 'Public domain', by: 'Kanō Tanyū', file: 'Emperor_Tenji_(Kanou_Tanyuu).jpg' },
    shomu: { lic: 'Public domain', by: 'Unknown authorUnknown author', file: 'Emperor_Shomu.jpg' },
    kanmu: { lic: 'Public domain', by: '', file: 'Emperor_Kammu_large.jpg' },
    michinaga: { lic: 'Public domain', by: 'Unknown authorUnknown author', file: 'Fujiwara_no_Michinaga_2.jpg' },
    murasaki: { lic: 'Public domain', by: 'Tosa Mitsuoki (1617-1691)', file: 'Tosa_Mitsuoki_001.jpg' },
    sei: { lic: 'Public domain', by: '土佐光起 (Tosa Mitsuoki)', file: 'Sei_Shonagon2.jpg' },
    kiyomori: { lic: 'Public domain', by: '', file: 'Taira_no_Kiyomori,TenshiSekkanMiei.jpg' },
    yoritomo: { lic: 'CC0', by: '氏子', file: '山梨縣甲府市善光寺源賴朝木像.jpg' },
    takauji: { lic: 'Public domain', by: '', file: 'Ashikaga_Takauji_Jōdo-ji.jpg' },
    yoshimitsu: { lic: 'Public domain', by: '', file: 'Yoshimitsu_Ashikaga_cropped.jpg' },
    yoshimasa: { lic: 'Public domain', by: 'Attributed to Tosa Mitsunobu', file: 'Ashikaga_Yoshimasa.jpg' },
    nobunaga: { lic: 'Public domain', by: '狩野宗秀 (Kanō Sōshū, 1551 - 1601)', file: 'Odanobunaga.jpg' },
    hideyoshi: { lic: 'Public domain', by: '百楽兎', file: 'Toyotomi_Hideyoshi_Kaou.svg' },
    ieyasu: { lic: 'Public domain', by: 'Kanō Tanyū', file: 'Tokugawa Ieyasu2.JPG' },
    genpaku: { lic: 'Public domain', by: 'Ishikawa Tairō', file: 'Sugita_Genpaku.jpg' },
    norinaga: { lic: 'Public domain', by: 'Hannah', file: '本居宣長02.jpg' },
    tadataka: { lic: 'Public domain', by: 'Aoki Katsujirō', file: 'Ino_Tadataka_(cropped).jpg' },
    hiroshige: { lic: 'CC0', by: 'Utagawa Kunisada', file: 'Memorial_Portrait_of_Hiroshige,_by_Kunisada.jpg' },
    itagaki: { lic: 'Public domain', by: 'Unknown authorUnknown author', file: 'ITAGAKI_Taisuke.jpg' },
    hirobumi: { lic: 'Public domain', by: 'Unknown authorUnknown author', file: 'ITŌ_Hirobumi.jpg' },
    tateana: { lic: 'CC0', by: '', file: 'Yoshinogari-iseki_tateanashiki-juukyo.JPG' },
    takayuka: { lic: 'CC0', by: '', file: 'Yoshinogari-iseki_takayukashiki-souko.JPG' },
    jomondoki: { lic: 'Public domain', by: '', file: '笹山遺跡出土_火焔型土器_(深鉢形)_(国宝指定番号1).JPG' },
    dotaku: { lic: 'CC BY-SA 3.0', by: 'sailko', file: 'Epoca_yaoi_finale,_campana_rituale_dotaku,_da_shizuoka,_III_sec.JPG' },
    kango: { lic: 'CC BY-SA 4.0', by: 'Michael Gunther', file: 'Yoshinogari Yayoi Village a004.jpg' },
    kofun: { lic: 'Attribution', by: 'Geospatial Information Authority of Japan', file: 'NintokuTomb Aerial photograph 2007.jpg' },
    horyuji: { lic: 'CC BY 2.5', by: '663highland', file: 'Horyu-ji45s2s4500.jpg' },
    heijo: { lic: 'CC BY-SA 4.0', by: 'Tsuyoshi chiba', file: '復元された第一次大極殿.jpg' },
    shosoin: { lic: 'CC BY-SA 4.0', by: 'あずきごはん', file: 'Shosin-shouso.jpg' },
    todaiji: { lic: 'CC BY-SA 3.0', by: '百楽兎', file: 'Todaiji Daibutsu.jpg' },
    manyoshu: { lic: 'CC BY-SA 3.0', by: '', file: 'Genryaku_Manyosyu.JPG' },
    heian: { lic: 'CC BY-SA 3.0', by: 'own work', file: 'Heiankyouhukugenmokei.jpg' },
    kana: { lic: 'Public domain', by: '', file: 'Genji_emaki_azumaya.jpg' },
    shinden: { lic: 'CC BY-SA 4.0', by: 'Ktmchi', file: 'G010-HR07-06.jpg' },
    kinkaku: { lic: 'CC BY-SA 4.0', by: 'Kakidai', file: 'Kinkaku-ji_2015.JPG' },
    ginkaku: { lic: 'CC BY 2.5', by: 'Oilstreet', file: 'Ginkakuji_Kyoto03-r.jpg' },
    shoin: { lic: 'CC BY-SA 3.0', by: 'Dingy', file: 'Ginkakuji_Temple_Togudo_2009_059.jpg' },
    noh: { lic: 'Public domain', by: '', file: 'ItsukushimaNobutai7442.jpg' },
    terakoya: { lic: 'Public domain', by: '', file: 'Bungaku-Bandai_no-Takara-Terakoya-School-by-Issunshi-Hanasato.png' },
    tokaido: { lic: 'Public domain', by: '歌川広重', file: 'Tokaido05 Totsuka.jpg' },
    kaitai: { lic: 'Public domain', by: '', file: 'Kaitai_shinsyo01.jpg' },
    inozu: { lic: 'Public domain', by: '', file: '伊能図全体図.webp' },
    tomioka: { lic: 'Public domain', by: '', file: 'Tomioka_Silk_Mill_East_Cocoon_Warehouse05.jpg' },
    tetsudo: { lic: 'Public domain', by: '', file: 'First_steam_train_leaving_Yokohama.jpg' },
    kenpo: { lic: 'CC BY 4.0', by: 'Kantei', file: 'Meiji-Constitution-Empire-of-Japan.png' },
    genbaku: { lic: 'CC BY 2.5', by: 'Oilstreet', file: 'Genbaku_Dome04-r.JPG' }
  };

  /* 写真の おき場所。index.html は ルート、tools/harness.html は 1つ 下なので
     ここで 見わける（これが ないと harness で 絵が 出ない＝実測） */
  const BASE = (function () {
    try { return /\/tools\//.test(location.pathname) ? '../assets/rekishi/' : 'assets/rekishi/'; }
    catch (e) { return 'assets/rekishi/'; }
  })();

  function has(id) { return !!(id && PICS[id]); }
  function info(id) {
    const p = PICS[id];
    if (!p) return null;
    return { id: id, name: p[0], kind: p[1], note: p[2], src: BASE + id + ".jpg" };
  }
  function list() { return Object.keys(PICS).map(info); }
  function credit(id) { return CREDITS[id] || null; }

  /* 答えた あとに 出す カード（バトルの ふきだし・しゅぎょうば 共通） */
  /* 答えた あとに 出す カード。id は 1つでも 配列でも よい
     （れい 足利義満＋金閣）。ひとことは 1つの ときだけ 出す（2つだと ふきだしが 高く なる） */
  function node(id) {
    const ids = (Array.isArray(id) ? id : [id]).filter(has);
    if (!ids.length) return null;
    const one = ids.length === 1;
    return h("span", { class: "rekipics" }, ids.map(function (k) {
      const p = info(k);
      const kids = [
        h("img", { class: "rekipic__img", src: p.src, alt: p.name, loading: "lazy" }),
        h("b", { class: "rekipic__name", text: p.name, raw: true })
      ];
      if (one) kids.push(h("span", { class: "rekipic__note", text: p.note, raw: true }));
      return h("span", { class: "rekipic" }, kids);
    }));
  }

  return { PICS: PICS, CREDITS: CREDITS, has: has, info: info, list: list, credit: credit, node: node };
})();
