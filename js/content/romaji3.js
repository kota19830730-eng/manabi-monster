/* ---------------------------------------------------------
   ローマ字（国語の森 ステージ5）

   小3の 国語で 習う 単元です（東京書籍）。
   息子さんの リクエスト：「タイピングの りかいが しやすいように」。

   ■ 書き方の 方針
     訓令式（si・ti・tu・hu・zi）を メインに、
     ヘボン式（shi・chi・tsu・fu・ji）も 正解に します。
       ・パソコンでは どちらでも 「し」に 変かんされる
       ・訓令式のほうが 打つ 回数が 少ない（si=2回／shi=3回）
       ・学校の テストも 訓令式が 基本

   ■ 気をつけること（ぜったいに 守る）
     1. のばす音は 教科書と キーボードで ちがう。
        教科書 … おとうさん = otôsan（屋根記号）
        パソコン … otousan（かな どおりに 打つ）
        → 「うつ」問題には のばす音を 出さない。
          「よむ・えらぶ」問題では 教科書どおりに あつかう。
     2. 「ん」は かならず n（または nn）。
        ヘボン式の shimbun のような m は IMEで 変かんできないので 使わない。
     3. 「ん」の あとに あ行・や行・な行が つづく ことば（きんようび など）は
        「うつ」問題に 出さない（n の 区切りが むずかしい）。

   ■ むずかしさ（lv）
     1 … 2文字の かんたんな ことば（やま・いぬ）／かんたんな 読み
     2 … 3〜4文字、し・ち・つ・ふ・じ を ふくむ ことば
     3 … 小さい「っ」「ゃゅょ」「ん」を ふくむ ことば／のばす音の 読み
     たたかいでは 1 → 2 → 3 の じゅんに 出て、ボスは lv2〜3 の「うつ」問題。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.romaji3 = (function () {
  const STAGE = 5;

  /* ---- かな → ローマ字（最初が 訓令式＝学校で 習う 書き方） ---- */
  const MONO = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo', 'o'], 'ん': ['n', 'nn'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di', 'ji'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po']
  };
  const DIGRAPH = {
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
    'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo']
  };

  /* かな1語 → 正解と みとめる 打ち方を ぜんぶ 作る。
     「っ」は つぎの 音の さいしょの 字を かさねる（きって → kitte）。 */
  function spellings(kana) {
    let outs = [''];
    let i = 0;
    while (i < kana.length) {
      let sokuon = false;
      if (kana[i] === 'っ') { sokuon = true; i++; }
      let key = kana.substr(i, 2);
      let variants = DIGRAPH[key];
      if (variants) { i += 2; }
      else { key = kana[i]; variants = MONO[key]; i += 1; }
      if (!variants) variants = [key];
      const next = [];
      outs.forEach(function (pre) {
        variants.forEach(function (v) {
          next.push(pre + (sokuon ? v[0] : '') + v);
        });
      });
      outs = next.length > 400 ? next.slice(0, 400) : next;
    }
    const seen = {};
    return outs.filter(function (s) { if (seen[s]) return false; seen[s] = 1; return s.length > 0; });
  }

  // 学校で 習う 書き方（訓令式）だけ
  function kunrei(kana) {
    let out = '';
    let i = 0;
    while (i < kana.length) {
      let sokuon = false;
      if (kana[i] === 'っ') { sokuon = true; i++; }
      let key = kana.substr(i, 2);
      let variants = DIGRAPH[key];
      if (variants) { i += 2; } else { key = kana[i]; variants = MONO[key]; i += 1; }
      if (!variants) variants = [key];
      out += (sokuon ? variants[0][0] : '') + variants[0];
    }
    return out;
  }

  const HINT_SOKUON = '小さい「っ」は、つぎの 字を 2つ ならべるよ。';

  /* =======================================================
     ① うつ（QWERTYの キーボードで 入力）
     ※ のばす音の ある ことばは 出さない（otôsan が 打てないため）
     ======================================================= */
  const typeWords = [
    /* -- lv1：2文字 -- */
    { lv: 1, kana: 'やま', mean: '山' },
    { lv: 1, kana: 'かわ', mean: '川' },
    { lv: 1, kana: 'いぬ', mean: '犬' },
    { lv: 1, kana: 'ねこ', mean: 'ねこ' },
    { lv: 1, kana: 'とり', mean: '鳥' },
    { lv: 1, kana: 'はな', mean: '花' },
    { lv: 1, kana: 'そら', mean: '空' },
    { lv: 1, kana: 'うみ', mean: '海' },
    { lv: 1, kana: 'ゆき', mean: '雪' },
    { lv: 1, kana: 'つき', mean: '月' },
    { lv: 1, kana: 'ほし', mean: '星' },
    { lv: 1, kana: 'あめ', mean: '雨' },
    { lv: 1, kana: 'かぜ', mean: '風' },
    { lv: 1, kana: 'もり', mean: '森' },
    { lv: 1, kana: 'くも', mean: '雲' },
    { lv: 1, kana: 'いし', mean: '石' },
    { lv: 1, kana: 'ひと', mean: '人' },
    { lv: 1, kana: 'いけ', mean: '池' },
    { lv: 1, kana: 'くさ', mean: '草' },
    { lv: 1, kana: 'たけ', mean: '竹' },
    { lv: 1, kana: 'うま', mean: '馬' },
    { lv: 1, kana: 'さる', mean: 'さる' },
    /* -- lv2：3〜4文字／し・ち・つ・ふ・じ -- */
    { lv: 2, kana: 'さくら', mean: 'さくら' },
    { lv: 2, kana: 'たまご', mean: 'たまご' },
    { lv: 2, kana: 'みかん', mean: 'みかん' },
    { lv: 2, kana: 'りんご', mean: 'りんご' },
    { lv: 2, kana: 'さかな', mean: '魚' },
    { lv: 2, kana: 'にほん', mean: '日本' },
    { lv: 2, kana: 'ともだち', mean: '友だち' },
    { lv: 2, kana: 'えんぴつ', mean: 'えんぴつ' },
    { lv: 2, kana: 'つくえ', mean: 'つくえ', hint: 'つ は tu（tsu でも いいよ）。' },
    { lv: 2, kana: 'ふね', mean: '船', hint: 'ふ は hu（fu でも いいよ）。' },
    { lv: 2, kana: 'ちず', mean: '地図', hint: 'ち は ti（chi でも いいよ）。' },
    { lv: 2, kana: 'しま', mean: '島', hint: 'し は si（shi でも いいよ）。' },
    { lv: 2, kana: 'あさがお', mean: 'あさがお' },
    { lv: 2, kana: 'ひまわり', mean: 'ひまわり' },
    { lv: 2, kana: 'かぶとむし', mean: 'カブトムシ' },
    { lv: 2, kana: 'とけい', mean: '時計' },
    { lv: 2, kana: 'くつした', mean: 'くつ下' },
    { lv: 2, kana: 'てがみ', mean: '手紙' },
    /* -- lv3：小さい っ・ゃゅょ・ん -- */
    { lv: 3, kana: 'きって', mean: 'きって', hint: HINT_SOKUON + 'き＝ki、て＝te だから…' },
    { lv: 3, kana: 'きっぷ', mean: 'きっぷ', hint: HINT_SOKUON },
    { lv: 3, kana: 'まっちゃ', mean: 'まっ茶', hint: 'ちゃ は tya（cha でも いいよ）。小さい「っ」も わすれずに。' },
    { lv: 3, kana: 'きんぎょ', mean: '金ぎょ', hint: 'ぎょ は gyo。「ん」は n だよ。' },
    { lv: 3, kana: 'でんしゃ', mean: '電車', hint: 'しゃ は sya（sha でも いいよ）。' },
    { lv: 3, kana: 'しんぶん', mean: '新聞', hint: '「ん」は n。しんぶん は sinbun。' },
    { lv: 3, kana: 'にんじゃ', mean: 'にんじゃ', hint: 'じゃ は zya（ja でも いいよ）。' },
    { lv: 3, kana: 'しゃしん', mean: '写真', hint: 'しゃ は sya。さいごの「ん」は n。' },
    { lv: 3, kana: 'ちゃわん', mean: 'ちゃわん', hint: 'ちゃ は tya（cha でも いいよ）。' },
    { lv: 3, kana: 'じてんしゃ', mean: '自転車', hint: 'じ は zi、しゃ は sya。「ん」は n。' },
    { lv: 3, kana: 'らっぱ', mean: 'らっぱ', hint: HINT_SOKUON },
    { lv: 3, kana: 'せっけん', mean: 'せっけん', hint: HINT_SOKUON + 'さいごの「ん」は n。' },
    { lv: 3, kana: 'にっき', mean: '日記', hint: HINT_SOKUON },
    { lv: 3, kana: 'ざっし', mean: 'ざっし', hint: HINT_SOKUON + 'し は si。' },
    { lv: 3, kana: 'しっぽ', mean: 'しっぽ', hint: HINT_SOKUON },
    { lv: 3, kana: 'はっぱ', mean: 'はっぱ', hint: HINT_SOKUON },
    { lv: 3, kana: 'おもちゃ', mean: 'おもちゃ', hint: 'ちゃ は tya（cha でも いいよ）。' },
    { lv: 3, kana: 'ひゃく', mean: '百', hint: 'ひゃ は hya。' },
    { lv: 3, kana: 'かっぱ', mean: 'かっぱ', hint: HINT_SOKUON },
    { lv: 3, kana: 'みっつ', mean: '三つ', hint: HINT_SOKUON + 'つ は tu。' },
    { lv: 3, kana: 'しんかんせん', mean: '新かん線', hint: '「ん」は n。長いけど 1字ずつ ゆっくり。' },
    /* -- 出さない（のばす音） -- */
    { kana: 'がっこう', mean: '学校', skip: true },
    { kana: 'やきゅう', mean: '野球', skip: true }
  ];

  /* =======================================================
     ② えらぶ（ローマ字で 書くと？）
     ※ wrong には 正解に なる 書き方（ヘボン式・nn など）を 入れない
     ======================================================= */
  const chooseItems = [
    /* -- lv1 -- */
    { lv: 1, kana: 'ねこ', wrong: ['neco', 'nekko', 'nako'] },
    { lv: 1, kana: 'うみ', wrong: ['ume', 'omi', 'umii'] },
    { lv: 1, kana: 'いぬ', wrong: ['imu', 'iunu', 'inue'] },
    { lv: 1, kana: 'はな', wrong: ['hama', 'hanna', 'hane'] },
    { lv: 1, kana: 'そら', wrong: ['sola', 'sorra', 'sara'] },
    /* -- lv2 -- */
    { lv: 2, kana: 'さくら', wrong: ['sakula', 'sakra', 'sacura'] },
    { lv: 2, kana: 'しま',   wrong: ['syima', 'sima h', 'thima'], note: 'し は si。ヘボン式の shi でも 正解だよ。' },
    { lv: 2, kana: 'つくえ', wrong: ['tukue h', 'tsukué', 'thukue'], note: 'つ は tu。ヘボン式の tsu でも 正解。' },
    { lv: 2, kana: 'ふね',   wrong: ['hune-', 'foone', 'phune'], note: 'ふ は hu。ヘボン式の fu でも 正解。' },
    { lv: 2, kana: 'ちず',   wrong: ['tizu-', 'chizzu', 'tsizu'], note: 'ち は ti。ヘボン式の chi でも 正解。' },
    { lv: 2, kana: 'たまご', wrong: ['tamaga', 'tamego', 'tamagoo'] },
    { lv: 2, kana: 'さかな', wrong: ['sagana', 'sakane', 'sakanna'] },
    { lv: 2, kana: 'みかん', wrong: ['mikam', 'mican', 'mikaan'], note: '「ん」は n。m には しないよ。' },
    { lv: 2, kana: 'りんご', wrong: ['rimgo', 'rigo', 'ringoo'], note: '「ん」は n。' },
    /* -- lv3 -- */
    { lv: 3, kana: 'じかん', wrong: ['zikam', 'jikam', 'zikaan'], note: '「ん」は かならず n。m には しないよ（パソコンで 変かんできないから）。' },
    { lv: 3, kana: 'きって', wrong: ['kite', 'kixtute', 'kitue'], note: '小さい「っ」は、つぎの 字を かさねる。' },
    { lv: 3, kana: 'でんわ', wrong: ['demwa', 'denuwa', 'dennwa-'], note: '「ん」は n。nn と 打っても 変かんできるよ。' },
    { lv: 3, kana: 'ひこうき', wrong: ['hikoki', 'hikohki', 'hikouki-'], note: 'のばす音「こう」は、パソコンでは kou と 打つよ。' },
    { lv: 3, kana: 'おかあさん', wrong: ['okasan', 'okahsan', 'okaasann-'], note: '教科書では okâsan。パソコンでは okaasan と 打つよ。' },
    { lv: 3, kana: 'とけい', wrong: ['toke', 'tokehi', 'tokeii'], note: 'のばす音「けい」は、パソコンでは kei と 打つよ。' },
    { lv: 3, kana: 'がっこう', wrong: ['gakou', 'gakkô-', 'gaxtukou'], note: '小さい「っ」＋のばす音。パソコンでは gakkou。' },
    { lv: 3, kana: 'ちゃわん', wrong: ['tiyawan', 'tyawam', 'tyawa'], note: 'ちゃ は tya（cha でも 正解）。「ん」は n。' },
    { lv: 3, kana: 'しゃしん', wrong: ['siyasin', 'syasim', 'shasi'], note: 'しゃ は sya（sha でも 正解）。' },
    { lv: 3, kana: 'にんじゃ', wrong: ['ninzia', 'nimzya', 'ninziya'], note: 'じゃ は zya（ja でも 正解）。' },
    { lv: 3, kana: 'じてんしゃ', wrong: ['zitensiya', 'jitemsya', 'zitesya'], note: 'じ は zi、しゃ は sya。「ん」は n。' },
    { lv: 3, kana: 'はっぱ', wrong: ['hapa', 'haxtupa', 'happpa'], note: '小さい「っ」は p を 2つ。' },
    { lv: 3, kana: 'きんぎょ', wrong: ['kingyou', 'kimgyo', 'kingiyo'], note: 'ぎょ は gyo。「ん」は n。' }
  ];

  /* =======================================================
     ③ よむ（ローマ字を 読む）
     ======================================================= */
  const readItems = [
    /* -- lv1 -- */
    { lv: 1, roma: 'yama',    kana: 'やま',   wrong: ['やば', 'たま', 'やまあ'] },
    { lv: 1, roma: 'sakana',  kana: 'さかな', wrong: ['しゃかな', 'さがな', 'さかだ'] },
    { lv: 1, roma: 'inu',     kana: 'いぬ',   wrong: ['いね', 'うに', 'いぬう'] },
    { lv: 1, roma: 'hana',    kana: 'はな',   wrong: ['はま', 'ほな', 'はなあ'] },
    { lv: 1, roma: 'sora',    kana: 'そら',   wrong: ['さら', 'そろ', 'そらあ'] },
    { lv: 1, roma: 'kaeru',   kana: 'かえる', wrong: ['かける', 'かえら', 'きえる'] },
    { lv: 1, roma: 'tamago',  kana: 'たまご', wrong: ['たまこ', 'たまが', 'たむご'] },
    { lv: 1, roma: 'neko',    kana: 'ねこ',   wrong: ['ねご', 'なこ', 'にこ'] },
    /* -- lv2 -- */
    { lv: 2, roma: 'siro',    kana: 'しろ',   wrong: ['さいろ', 'すいろ', 'しよ'], note: 'si は「し」。shiro と 書くことも あるよ。' },
    { lv: 2, roma: 'tikara',  kana: 'ちから', wrong: ['てぃから', 'しから', 'ちがら'], note: 'ti は「ち」。chikara と 書くことも あるよ。' },
    { lv: 2, roma: 'tuki',    kana: 'つき',   wrong: ['とぅき', 'つぎ', 'ときい'], note: 'tu は「つ」。tsuki と 書くことも あるよ。' },
    { lv: 2, roma: 'huyu',    kana: 'ふゆ',   wrong: ['ほゆ', 'ふゅ', 'はゆ'], note: 'hu は「ふ」。fuyu と 書くことも あるよ。' },
    { lv: 2, roma: 'zikan',   kana: 'じかん', wrong: ['ちかん', 'しかん', 'ざかん'], note: 'zi は「じ」。jikan と 書くことも あるよ。' },
    { lv: 2, roma: 'sinbun',  kana: 'しんぶん', wrong: ['しぶん', 'しんふん', 'しんぶ'], note: '「ん」は n。' },
    { lv: 2, roma: 'tomodati', kana: 'ともだち', wrong: ['ともたち', 'とまだち', 'ともだし'], note: 'ti は「ち」。tomodachi でも いいよ。' },
    { lv: 2, roma: 'hune',    kana: 'ふね',   wrong: ['ほね', 'ふな', 'はね'], note: 'hu は「ふ」。fune と 書くことも あるよ。' },
    { lv: 2, roma: 'tukue',   kana: 'つくえ', wrong: ['とくえ', 'つくね', 'つけえ'], note: 'tu は「つ」。' },
    { lv: 2, roma: 'kitte',   kana: 'きって', wrong: ['きて', 'きつて', 'きっと'], note: 't が 2つ ならぶと 小さい「っ」。' },
    { lv: 2, roma: 'ringo',   kana: 'りんご', wrong: ['りご', 'りんが', 'れんご'], note: 'n は「ん」。' },
    { lv: 2, roma: 'mikan',   kana: 'みかん', wrong: ['みかに', 'みけん', 'みか'], note: 'さいごの n は「ん」。' },
    { lv: 2, roma: 'tenki',   kana: 'てんき', wrong: ['てき', 'でんき', 'てんぎ'], note: 'n は「ん」。' },
    /* -- lv3 -- */
    { lv: 3, roma: 'gakkô',   kana: 'がっこう', wrong: ['がこう', 'がっこ', 'がくこう'], note: '小さい「っ」は k が 2つ。^ は のばす音の しるし。' },
    { lv: 3, roma: 'kin-yôbi', kana: 'きんようび', wrong: ['きにょうび', 'きんよび', 'きようび'], note: '「ん」の あとに や・ゆ・よ が つづくときは - を 入れて 分けるよ。' },
    { lv: 3, roma: 'ryokô',   kana: 'りょこう', wrong: ['りよこう', 'りょこ', 'りゃこう'], note: 'ryo は「りょ」。' },
    { lv: 3, roma: 'densya',  kana: 'でんしゃ', wrong: ['でんさ', 'でんしや', 'でしゃ'], note: 'sya は「しゃ」。densha と 書くことも あるよ。' },
    { lv: 3, roma: 'otôsan',  kana: 'おとうさん', wrong: ['おとさん', 'おとおさん', 'おとうさ'], note: '^ は のばす音。パソコンでは otousan と 打つよ。' },
    { lv: 3, roma: 'zyugyô',  kana: 'じゅぎょう', wrong: ['じゅぎよ', 'じゆぎょう', 'じゅぎょ'], note: 'zyu は「じゅ」。^ は のばす音。' },
    { lv: 3, roma: 'kyôsitu', kana: 'きょうしつ', wrong: ['きょしつ', 'きようしつ', 'きょうしち'], note: 'kyô は「きょう」。situ は「しつ」。' },
    { lv: 3, roma: 'hon-ya',  kana: 'ほんや', wrong: ['ほにゃ', 'ほなや', 'ほんよ'], note: '「ん」の あとの や は - で 分ける。- が ないと「ほにゃ」と 読めてしまうよ。' },
    { lv: 3, roma: 'happa',   kana: 'はっぱ', wrong: ['はぱ', 'はっは', 'はつぱ'], note: 'p が 2つ ならぶと 小さい「っ」。' },
    { lv: 3, roma: 'tyawan',  kana: 'ちゃわん', wrong: ['ちやわん', 'たわん', 'ちゃわ'], note: 'tya は「ちゃ」。chawan と 書くことも あるよ。' },
    { lv: 3, roma: 'byôin',   kana: 'びょういん', wrong: ['びよういん', 'びょいん', 'びょういい'], note: 'byô は「びょう」。^ は のばす音。' }
  ];

  /* =======================================================
     問題を 作る
     ======================================================= */
  function typeQ(w) {
    const answer = kunrei(w.kana);
    return {
      id: 'kokugo3-5:type:' + w.kana,
      stage: STAGE,
      type: 'roma',
      unit: 'ローマ字（うつ）',
      prompt: '「<b>' + w.kana + '</b>」' + (w.mean && w.mean !== w.kana ? '（' + w.mean + '）' : '') + 'を ローマ字で うってみよう',
      answer: answer,
      accept: spellings(w.kana),
      keys: 26,
      scratch: false,
      lv: w.lv || 2,
      hint: w.hint || ('さいしょの 字は「' + answer[0] + '」だよ。'),
      note: 'パソコンでは ' + answer + ' と うつと「' + w.kana + '」に なるよ。'
    };
  }

  function chooseQ(it) {
    const answer = kunrei(it.kana);
    return {
      id: 'kokugo3-5:choose:' + it.kana,
      stage: STAGE,
      type: 'choice',
      unit: 'ローマ字（書く）',
      prompt: '「<b>' + it.kana + '</b>」を ローマ字で 書くと？',
      choices: [answer].concat(it.wrong),
      answer: 0,
      lv: it.lv || 2,
      hint: 'さいしょの 字は「' + answer[0] + '」。1つずつ 見くらべてみよう。',
      note: it.note || (it.kana + ' → ' + answer)
    };
  }

  function readQ(it) {
    return {
      id: 'kokugo3-5:read:' + it.roma,
      stage: STAGE,
      type: 'choice',
      unit: 'ローマ字（よむ）',
      prompt: '<span class="roma">' + it.roma + '</span> は なんと 読む？',
      choices: [it.kana].concat(it.wrong),
      answer: 0,
      lv: it.lv || 2,
      hint: '1字ずつ 区切って 読んでみよう。',
      note: it.note || (it.roma + ' = ' + it.kana)
    };
  }

  function usableTypeWords() { return typeWords.filter(function (w) { return !w.skip; }); }

  function pool() {
    return []
      .concat(readItems.map(readQ))
      .concat(chooseItems.map(chooseQ))
      .concat(usableTypeWords().map(typeQ));
  }

  /* むずかしさ lv の 問題を m 問。たりなければ となりの むずかしさから */
  function draw(by, all, level, m) {
    const out = [];
    const order = level === 1 ? [1, 2, 3] : level === 3 ? [3, 2, 1] : [2, 1, 3];
    for (let k = 0; k < order.length && out.length < m; k++) {
      const src = by[order[k]];
      while (src.length && out.length < m) out.push(src.shift());
    }
    let rest = MQ.util.shuffle(all);
    while (out.length < m && rest.length) {
      out.push(rest.shift());
      if (!rest.length) rest = MQ.util.shuffle(all);
    }
    return out;
  }

  /* ステージ用。n問 かえす。
     よむ・えらぶ・うつ が まざり、やさしい → むずかしい の じゅんに ならぶ。
     opts.boss … 「うつ」問題（lv3 → lv2 の じゅん）。いちばん 手ごたえが ある
     opts.lv   … その むずかしさ だけ */
  function make(n, opts) {
    if (opts && opts.boss) {
      const typed = usableTypeWords().filter(function (w) { return (w.lv || 2) >= 2; }).map(typeQ);
      const hard = MQ.util.shuffle(typed.filter(function (q) { return q.lv === 3; }));
      const mid = MQ.util.shuffle(typed.filter(function (q) { return q.lv !== 3; }));
      let picked = hard.concat(mid);
      while (picked.length < n && typed.length) picked = picked.concat(MQ.util.shuffle(typed));
      return picked.slice(0, n).map(function (q) { q.lv = 3; return q; });
    }
    const all = pool();
    const by = { 1: [], 2: [], 3: [] };
    all.forEach(function (q) { by[q.lv === 1 || q.lv === 3 ? q.lv : 2].push(q); });
    [1, 2, 3].forEach(function (l) { by[l] = MQ.util.shuffle(by[l]); });
    if (opts && opts.lv) return draw(by, all, opts.lv, n);
    const easy = Math.ceil(n / 3), hard = Math.floor(n / 3), normal = n - easy - hard;
    return draw(by, all, 1, easy).concat(draw(by, all, 2, normal), draw(by, all, 3, hard));
  }

  function count() {
    return readItems.length + chooseItems.length + usableTypeWords().length;
  }

  return {
    make: make, count: count,
    spellings: spellings, kunrei: kunrei,
    typeWords: typeWords, chooseItems: chooseItems, readItems: readItems
  };
})();
