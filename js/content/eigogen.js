/* ---------------------------------------------------------
   英語の 問題を「単語の 表 × 文型」から 作る（v14.25）

   ユーザー「同じ問題が わりと 頻繫に 出てくる。問題の 種類が 少ない」→ 数えたら
   英語は 1ステージ 30〜55問（手で 書いた 一覧）。算数だけ「作る 関数」で 数百種類。
   → かん字（kanjiq.js）と 同じ 考えで、単語の 表から 自動で 作る。

   表の 1行（単語）：[英語, 日本語, { a: 'an', pl: 'mice' }]
     a  … 冠詞（ないときは a）      pl … ふくすう形（ないときは 英語＋s）
   なかま（cat）：{ unit, stage, hint, words, frames }
     frames … 文型。{en} {ja} {a} {pl} が 単語に おきかわる。
       frames[0] は 主役（ask が あれば「〜と 答えるなら？」の 問題も 作る）。
       frames[1〜] は「ちがう 文型の 見わけ」（lv3）の 問題に つかう。

   作られる 問題（手書きの eigoN.js と 同じ 形）：
     lv1 "cat" の いみは？ ／ 「ねこ」を 英語で いうと？
     lv2 "I like cats." の いみは？（同じ 文型・ちがう 単語が まちがい）
     lv3 "What animal do you like?" に「ねこ」と 答えるなら？ ／ "I have a cat." の いみは？（同じ 単語・ちがう 文型が まちがい）
   同じ 文が 手書きの 問題に あれば 作らない（id は 問題文 なので）。

   読みこみは eigo3〜6.js の あと（MQ.eigoN.questions に 足す）。かん字は その 学年まで（smoke が 見る）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.eigoGen = (function () {
  const STEPS = [7, 13, 29, 41, 53, 67, 71, 83, 97, 101];

  // ---- 文の 部品 ----
  function fill(tpl, w) {
    const en = w[0], ja = w[1], x = w[2] || {};
    const a = x.a || 'a';
    const pl = x.pl || (en + 's');
    let r = tpl.replace(/\{en\}/g, en).replace(/\{ja\}/g, ja).replace(/\{a\}/g, a).replace(/\{pl\}/g, pl);
    r = r.replace(/\.\./g, '.');                                   // 'P.E..' → 'P.E.'
    if (/^[a-z]/.test(r)) r = r.charAt(0).toUpperCase() + r.slice(1);   // 'spring is coming.' → 'Spring is coming.'
    return r;
  }
  // 文の おわりに 句点。もう 記号で おわって いれば つけない（'I'm fine.。' を 防ぐ）
  function dot(t) { return /[。？！.?!]$/.test(t) ? t : t + '。'; }
  // i 番めと ちがう 単語を n こ（毎回 同じ ならび）
  function others(words, i, n) {
    const N = words.length, out = [];
    for (let s = 0; s < STEPS.length && out.length < n; s++) {
      const j = (i + STEPS[s]) % N;
      if (j !== i && out.indexOf(j) === -1) out.push(j);
    }
    for (let d = 1; d < N && out.length < n; d++) { const j = (i + d) % N; if (j !== i && out.indexOf(j) === -1) out.push(j); }
    return out.map(function (j) { return words[j]; });
  }
  function uniq4(arr) {
    const out = [];
    arr.forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); });
    return out.length === 4 ? out : null;
  }

  /* =====================================================
     単語の 表
     ===================================================== */
  const COLORS = [['red', 'あか'], ['blue', 'あお'], ['yellow', 'きいろ'], ['green', 'みどり'], ['pink', 'ピンク'], ['orange', 'オレンジ', { a: 'an' }], ['purple', 'むらさき'], ['black', 'くろ'], ['white', 'しろ'], ['brown', 'ちゃいろ'], ['gray', 'はいいろ'], ['gold', '金いろ']];
  const ANIMALS = [['cat', 'ねこ'], ['dog', 'いぬ'], ['rabbit', 'うさぎ'], ['bird', 'とり'], ['fish', 'さかな', { pl: 'fish' }], ['monkey', 'さる'], ['elephant', 'ぞう', { a: 'an' }], ['lion', 'ライオン'], ['tiger', 'とら'], ['bear', 'くま'], ['pig', 'ぶた'], ['cow', 'うし'], ['horse', 'うま'], ['sheep', 'ひつじ', { pl: 'sheep' }], ['mouse', 'ねずみ', { pl: 'mice' }], ['frog', 'かえる'], ['snake', 'へび'], ['panda', 'パンダ'], ['koala', 'コアラ'], ['penguin', 'ペンギン']];
  const FOODS = [['apple', 'りんご', { a: 'an' }], ['banana', 'バナナ'], ['orange', 'オレンジ', { a: 'an' }], ['grapes', 'ぶどう', { pl: 'grapes' }], ['strawberry', 'いちご', { pl: 'strawberries' }], ['peach', 'もも', { pl: 'peaches' }], ['melon', 'メロン'], ['pizza', 'ピザ', { pl: 'pizza' }], ['hamburger', 'ハンバーガー'], ['ice cream', 'アイスクリーム', { a: 'an', pl: 'ice cream' }], ['cake', 'ケーキ', { pl: 'cake' }], ['milk', 'ぎゅうにゅう', { pl: 'milk' }], ['juice', 'ジュース', { pl: 'juice' }], ['rice', 'ごはん', { pl: 'rice' }], ['bread', 'パン', { pl: 'bread' }], ['egg', 'たまご', { a: 'an' }], ['tomato', 'トマト', { pl: 'tomatoes' }], ['salad', 'サラダ', { pl: 'salad' }], ['curry', 'カレー', { pl: 'curry' }], ['soup', 'スープ', { pl: 'soup' }]];
  const SPORTS = [['soccer', 'サッカー'], ['baseball', 'やきゅう'], ['tennis', 'テニス'], ['basketball', 'バスケットボール'], ['rugby', 'ラグビー'], ['dodgeball', 'ドッジボール'], ['table tennis', 'たっきゅう'], ['volleyball', 'バレーボール'], ['badminton', 'バドミントン'], ['golf', 'ゴルフ']];   // ぜんぶ play 〜 と 言える もの（swimming・skiing は 入れない）
  const WEATHER = [['sunny', 'はれ'], ['rainy', 'あめ'], ['cloudy', 'くもり'], ['snowy', 'ゆき'], ['windy', 'かぜが つよい'], ['hot', 'あつい'], ['cold', 'さむい'], ['warm', 'あたたかい'], ['cool', 'すずしい']];
  const SEASONS = [['spring', 'はる'], ['summer', 'なつ'], ['fall', 'あき'], ['winter', 'ふゆ']];
  const MONTHS = [['January', '1月'], ['February', '2月'], ['March', '3月'], ['April', '4月'], ['May', '5月'], ['June', '6月'], ['July', '7月'], ['August', '8月'], ['September', '9月'], ['October', '10月'], ['November', '11月'], ['December', '12月']];
  const DAYS = [['Sunday', '日曜日'], ['Monday', '月曜日'], ['Tuesday', '火曜日'], ['Wednesday', '水曜日'], ['Thursday', '木曜日'], ['Friday', '金曜日'], ['Saturday', '土曜日']];
  const FEELINGS = [['happy', 'うれしい'], ['sad', 'かなしい'], ['hungry', 'おなかが すいた'], ['sleepy', 'ねむい'], ['tired', 'つかれた'], ['fine', 'げんき'], ['angry', 'おこって いる'], ['thirsty', 'のどが かわいた'], ['great', 'とても いい'], ['sick', 'びょうき']];
  const SHAPES = [['circle', 'まる'], ['triangle', 'さんかく'], ['square', 'しかく'], ['heart', 'ハート'], ['star', 'ほし'], ['diamond', 'ひし形']];

  // 小4
  const STATIONERY = [['pencil', 'えんぴつ'], ['eraser', 'けしゴム', { a: 'an' }], ['ruler', 'ものさし'], ['notebook', 'ノート'], ['pen', 'ペン'], ['pencil case', 'ふでばこ'], ['textbook', 'きょうか書'], ['clock', 'とけい'], ['crayon', 'クレヨン'], ['marker', 'マーカー'], ['stapler', 'ホッチキス'], ['bag', 'かばん'], ['book', '本'], ['desk', 'つくえ'], ['chair', 'いす']];
  const ROOMS = [['classroom', '教室'], ['library', '図書室'], ['gym', '体育館'], ['music room', '音楽室'], ['art room', '図工室', { a: 'an' }], ['science room', '理科室'], ['lunch room', '食堂'], ["nurse's office", 'ほけん室'], ['playground', '運動場'], ["teachers' office", 'しょくいん室'], ['restroom', 'トイレ'], ['entrance', '入り口', { a: 'an' }], ['computer room', 'コンピュータ室'], ['pool', 'プール']];
  const VEGFRUIT = [['apple', 'りんご', { a: 'an' }], ['banana', 'バナナ'], ['cherry', 'さくらんぼ', { pl: 'cherries' }], ['pineapple', 'パイナップル'], ['watermelon', 'すいか'], ['lemon', 'レモン'], ['kiwi fruit', 'キウイ'], ['potato', 'じゃがいも', { pl: 'potatoes' }], ['onion', 'たまねぎ', { a: 'an' }], ['carrot', 'にんじん'], ['cabbage', 'キャベツ'], ['corn', 'とうもろこし', { pl: 'corn' }], ['cucumber', 'きゅうり'], ['pumpkin', 'かぼちゃ'], ['green pepper', 'ピーマン'], ['mushroom', 'きのこ']];
  const DAILY = [['wake up', 'おきる'], ['wash my face', '顔を あらう'], ['eat breakfast', '朝ごはんを 食べる'], ['brush my teeth', '歯を みがく'], ['go to school', '学校へ 行く'], ['go home', '家に 帰る'], ['do my homework', 'しゅくだいを する'], ['take a bath', 'おふろに 入る'], ['eat dinner', '夕ごはんを 食べる'], ['go to bed', 'ねる'], ['watch TV', 'テレビを 見る'], ['play games', 'ゲームを する'], ['read books', '本を 読む'], ['clean my room', 'へやを そうじする'], ['walk my dog', '犬の さんぽを する']];
  const PLAYS = [['tag', 'おにごっこ'], ['hide-and-seek', 'かくれんぼ'], ['jump rope', 'なわとび'], ['dodgeball', 'ドッジボール'], ['cards', 'カード', { pl: 'cards' }], ['soccer', 'サッカー'], ['catch', 'キャッチボール'], ['rock-paper-scissors', 'じゃんけん'], ['bingo', 'ビンゴ'], ['the piano', 'ピアノ'], ['the recorder', 'リコーダー'], ['video games', 'テレビゲーム']];
  const HELLOS = [['Hola', 'スペイン語'], ['Bonjour', 'フランス語'], ['Ni hao', '中国語'], ['Annyeonghaseyo', 'かん国語'], ['Guten Tag', 'ドイツ語'], ['Ciao', 'イタリア語'], ['Namaste', 'ヒンディー語'], ['Jambo', 'スワヒリ語']];

  // 小5
  const SUBJECTS = [['Japanese', '国語'], ['math', '算数'], ['English', '英語'], ['science', '理科'], ['social studies', '社会'], ['music', '音楽'], ['arts and crafts', '図工'], ['P.E.', '体育'], ['home economics', '家庭科'], ['calligraphy', '書写'], ['moral education', '道徳']];
  const CANS = [['swim', '泳ぐ'], ['run fast', '速く 走る'], ['play the piano', 'ピアノを ひく'], ['cook', '料理する'], ['sing well', 'うまく 歌う'], ['ride a unicycle', '一輪車に 乗る'], ['play soccer', 'サッカーを する'], ['dance', 'ダンスを する'], ['jump high', '高く とぶ'], ['ski', 'スキーを する'], ['skate', 'スケートを する'], ['draw pictures', '絵を かく'], ['speak English', '英語を 話す'], ['play the guitar', 'ギターを ひく'], ['do kendama', 'けん玉を する']];
  const PLACES5 = [['post office', 'ゆうびん局'], ['station', '駅'], ['hospital', '病院'], ['park', '公園'], ['library', '図書館'], ['school', '学校'], ['supermarket', 'スーパー'], ['bookstore', '本屋'], ['restaurant', 'レストラン'], ['convenience store', 'コンビニ'], ['bank', '銀行'], ['police station', 'けいさつしょ'], ['fire station', 'しょうぼうしょ'], ['flower shop', '花屋'], ['zoo', '動物園'], ['museum', '博物館']];
  const MENU = [['pizza', 'ピザ'], ['spaghetti', 'スパゲッティ'], ['a hamburger', 'ハンバーガー'], ['salad', 'サラダ'], ['soup', 'スープ'], ['curry and rice', 'カレーライス'], ['steak', 'ステーキ'], ['a sandwich', 'サンドイッチ'], ['ice cream', 'アイスクリーム'], ['cake', 'ケーキ'], ['orange juice', 'オレンジジュース'], ['tea', 'お茶'], ['coffee', 'コーヒー'], ['milk', 'ぎゅうにゅう'], ['fried chicken', 'フライドチキン'], ['a parfait', 'パフェ']];
  const JOBS = [['doctor', '医者'], ['teacher', '先生'], ['singer', '歌手'], ['soccer player', 'サッカー選手'], ['firefighter', '消防士'], ['police officer', 'けいさつ官'], ['nurse', 'かんごし'], ['cook', '料理人'], ['pilot', 'パイロット'], ['scientist', '科学者'], ['farmer', '農家'], ['artist', '画家', { a: 'an' }], ['vet', 'じゅう医'], ['baker', 'パン屋'], ['astronaut', 'うちゅう飛行士', { a: 'an' }], ['carpenter', '大工']];
  const JAPAN = [['sushi', 'すし', { v: 'eat' }], ['tempura', 'てんぷら', { v: 'eat' }], ['ramen', 'ラーメン', { v: 'eat' }], ['mochi', 'もち', { v: 'eat' }], ['a kimono', '着物', { v: 'see' }], ['origami', 'おりがみ', { v: 'enjoy' }], ['kendo', 'けん道', { v: 'enjoy' }], ['judo', 'じゅう道', { v: 'enjoy' }], ['sumo', 'すもう', { v: 'see' }], ['Mt. Fuji', '富士山', { v: 'see' }], ['cherry blossoms', 'さくら', { v: 'see' }], ['hot springs', 'おんせん', { v: 'enjoy' }], ['fireworks', '花火', { v: 'see' }], ['festivals', '祭り', { v: 'enjoy' }], ['temples', 'お寺', { v: 'see' }], ['castles', '城', { v: 'see' }]];

  // 小6
  const COUNTRIES = [['Italy', 'イタリア', { see: 'the Colosseum', seeJa: 'コロッセオ', eat: 'pizza', eatJa: 'ピザ' }], ['France', 'フランス', { see: 'the Eiffel Tower', seeJa: 'エッフェルとう', eat: 'cheese', eatJa: 'チーズ' }], ['Australia', 'オーストラリア', { see: 'koalas', seeJa: 'コアラ', eat: 'meat pies', eatJa: 'ミートパイ' }], ['China', '中国', { see: 'the Great Wall', seeJa: '万里の長城', eat: 'dumplings', eatJa: 'ギョーザ' }], ['Korea', 'かん国', { see: 'Gyeongbokgung Palace', seeJa: '景福宮', eat: 'kimchi', eatJa: 'キムチ' }], ['Brazil', 'ブラジル', { see: 'the carnival', seeJa: 'カーニバル', eat: 'churrasco', eatJa: 'シュラスコ' }], ['Egypt', 'エジプト', { see: 'the pyramids', seeJa: 'ピラミッド', eat: 'koshari', eatJa: 'コシャリ' }], ['India', 'インド', { see: 'the Taj Mahal', seeJa: 'タージ・マハル', eat: 'curry', eatJa: 'カレー' }], ['Kenya', 'ケニア', { see: 'lions', seeJa: 'ライオン', eat: 'ugali', eatJa: 'ウガリ' }], ['Spain', 'スペイン', { see: 'the Sagrada Familia', seeJa: 'サグラダ・ファミリア', eat: 'paella', eatJa: 'パエリア' }], ['Canada', 'カナダ', { see: 'Niagara Falls', seeJa: 'ナイアガラの たき', eat: 'maple syrup', eatJa: 'メープルシロップ' }], ['Germany', 'ドイツ', { see: 'castles', seeJa: '城', eat: 'sausages', eatJa: 'ソーセージ' }], ['the U.S.A.', 'アメリカ', { see: 'the Statue of Liberty', seeJa: '自由の女神', eat: 'hamburgers', eatJa: 'ハンバーガー' }], ['the U.K.', 'イギリス', { see: 'Big Ben', seeJa: 'ビッグ・ベン', eat: 'fish and chips', eatJa: 'フィッシュ・アンド・チップス' }], ['Thailand', 'タイ', { see: 'temples', seeJa: 'お寺', eat: 'tom yum', eatJa: 'トムヤムクン' }], ['Peru', 'ペルー', { see: 'Machu Picchu', seeJa: 'マチュピチュ', eat: 'ceviche', eatJa: 'セビーチェ' }]];
  const TOWN = [['zoo', '動物園'], ['aquarium', '水族館', { a: 'an' }], ['amusement park', '遊園地', { a: 'an' }], ['stadium', 'スタジアム'], ['museum', '博物館'], ['library', '図書館'], ['castle', '城'], ['beach', '海岸'], ['shopping mall', 'ショッピングモール'], ['hospital', '病院'], ['department store', 'デパート'], ['river', '川'], ['mountain', '山'], ['temple', '寺'], ['shrine', '神社'], ['swimming pool', 'プール']];
  const PAST = [['went to the beach', '海岸に 行った'], ['went to the mountains', '山に 行った'], ['went camping', 'キャンプに 行った'], ['went fishing', 'つりに 行った'], ['went to the festival', '祭りに 行った'], ['ate ice cream', 'アイスクリームを 食べた'], ['ate watermelon', 'すいかを 食べた'], ['ate shaved ice', 'かき氷を 食べた'], ['saw fireworks', '花火を 見た'], ['saw the stars', '星を 見た'], ['saw a beautiful sunset', '美しい 夕日を 見た'], ['enjoyed swimming', '水泳を 楽しんだ'], ['enjoyed hiking', 'ハイキングを 楽しんだ'], ['enjoyed the summer festival', '夏祭りを 楽しんだ'], ['played with my friends', '友達と 遊んだ'], ['visited my grandparents', '祖父母を 訪ねた']];
  const CREATURES = [['sea turtles', 'ウミガメ', { where: 'in the sea', whereJa: '海', eat: 'jellyfish', eatJa: 'クラゲ' }], ['lions', 'ライオン', { where: 'in the savanna', whereJa: 'サバンナ', eat: 'zebras', eatJa: 'シマウマ' }], ['pandas', 'パンダ', { where: 'in the forest', whereJa: '森', eat: 'bamboo', eatJa: '竹' }], ['penguins', 'ペンギン', { where: 'in the Antarctic', whereJa: '南極', eat: 'fish', eatJa: '魚' }], ['frogs', 'カエル', { where: 'in the pond', whereJa: '池', eat: 'insects', eatJa: '虫' }], ['owls', 'フクロウ', { where: 'in the forest', whereJa: '森', eat: 'mice', eatJa: 'ネズミ' }], ['whales', 'クジラ', { where: 'in the sea', whereJa: '海', eat: 'krill', eatJa: 'オキアミ' }], ['camels', 'ラクダ', { where: 'in the desert', whereJa: '砂ばく', eat: 'grass', eatJa: '草' }], ['polar bears', 'ホッキョクグマ', { where: 'in the Arctic', whereJa: '北極', eat: 'seals', eatJa: 'アザラシ' }], ['eagles', 'ワシ', { where: 'in the mountains', whereJa: '山', eat: 'fish', eatJa: '魚' }], ['monkeys', 'サル', { where: 'in the forest', whereJa: '森', eat: 'fruits', eatJa: '果物' }], ['dolphins', 'イルカ', { where: 'in the sea', whereJa: '海', eat: 'fish', eatJa: '魚' }]];
  const EVENTS = [['sports day', '運動会'], ['school trip', '修学旅行'], ['music festival', '音楽会'], ['swimming meet', '水泳大会'], ['entrance ceremony', '入学式'], ['graduation ceremony', '卒業式'], ['field trip', '遠足'], ['drama festival', '学芸会'], ['chorus contest', '合唱コンクール'], ['volunteer day', 'ボランティアの 日'], ['school festival', '学校祭'], ['marathon', 'マラソン大会']];
  const CLUBS = [['soccer team', 'サッカー部'], ['baseball team', '野球部'], ['brass band', 'すい奏楽部'], ['art club', '美術部'], ['science club', '科学部'], ['tennis team', 'テニス部'], ['basketball team', 'バスケットボール部'], ['volleyball team', 'バレーボール部'], ['track and field team', '陸上部'], ['English club', '英語部'], ['computer club', 'コンピュータ部'], ['drama club', '演劇部'], ['swimming team', '水泳部'], ['kendo team', 'けん道部'], ['chorus', '合唱部'], ['table tennis team', 'たっ球部']];

  /* =====================================================
     学年ごとの なかま（unit は terms.js の 表に ある 文字）
     ===================================================== */
  const BANK = {
    3: [
      { unit: '気もち', stage: 1, hint: '気もちの ことばだよ。', words: FEELINGS,
        frames: [{ en: "I'm {en}.", ja: 'わたしは {ja}', ask: 'How are you?' }, { en: 'Are you {en}?', ja: 'あなたは {ja}？' }, { en: 'He is {en}.', ja: 'かれは {ja}' }, { en: 'My mother is {en}.', ja: 'お母さんは {ja}' }] },
      { unit: '色', stage: 2, hint: '色の ことばだよ。', words: COLORS,
        frames: [{ en: 'I like {en}.', ja: '{ja}が すき', ask: 'What color do you like?' }, { en: "It's {en}.", ja: 'それは {ja}です' }, { en: 'I have {a} {en} pen.', ja: '{ja}の ペンを もって いる' }, { en: "I don't like {en}.", ja: '{ja}は すきでは ない' }] },
      { unit: '数', stage: 2, kind: 'number' },
      { unit: 'アルファベット', stage: 2, kind: 'alpha3' },
      { unit: 'すきなもの', stage: 2, hint: 'スポーツの ことばだよ。', words: SPORTS,
        frames: [{ en: 'I like {en}.', ja: '{ja}が すき', ask: 'What sport do you like?' }, { en: "Let's play {en}.", ja: '{ja}を しよう' }, { en: 'I play {en}.', ja: '{ja}を する' }, { en: "I don't like {en}.", ja: '{ja}は すきでは ない' }] },
      { unit: 'どうぶつ', stage: 3, hint: 'どうぶつの ことばだよ。', words: ANIMALS,
        frames: [{ en: "It's {a} {en}.", ja: 'それは {ja}です', ask: "What's this?" }, { en: 'I like {pl}.', ja: '{ja}が すき' }, { en: 'I have {a} {en}.', ja: '{ja}を かって いる' }, { en: 'I see {a} {en}.', ja: '{ja}が 見える' }] },
      { unit: 'たべもの', stage: 3, hint: 'たべものの ことばだよ。', words: FOODS,
        frames: [{ en: 'I like {pl}.', ja: '{ja}が すき', ask: 'What food do you like?' }, { en: 'I want {pl}.', ja: '{ja}が ほしい' }, { en: 'Do you like {pl}?', ja: '{ja}は すき？' }, { en: "I don't like {pl}.", ja: '{ja}は すきでは ない' }] },
      { unit: '天気', stage: 4, hint: '天気の ことばだよ。', words: WEATHER,
        frames: [{ en: "It's {en}.", ja: '{ja}です', ask: "How's the weather?" }, { en: "It's {en} today.", ja: '今日は {ja}です' }, { en: "It's {en} in Tokyo.", ja: '東京は {ja}です' }, { en: 'Is it {en}?', ja: '{ja}ですか？' }] },
      { unit: '季節', stage: 4, hint: '季節の ことばだよ。', words: SEASONS,
        frames: [{ en: 'I like {en}.', ja: '{ja}が すき', ask: 'What season do you like?' }, { en: "It's {en} now.", ja: '今は {ja}です' }, { en: '{en} is coming.', ja: '{ja}が 来る' }, { en: "I don't like {en}.", ja: '{ja}は すきでは ない' }] },
      { unit: '月', stage: 4, hint: '月の 名前だよ。', words: MONTHS,
        frames: [{ en: 'My birthday is in {en}.', ja: 'たんじょう日は {ja}', ask: 'When is your birthday?' }, { en: "It's {en} now.", ja: '今は {ja}です' }, { en: 'I like {en}.', ja: '{ja}が すき' }, { en: 'We have a test in {en}.', ja: '{ja}に テストが ある' }] },
      { unit: '曜日', stage: 4, hint: '曜日の ことばだよ。', words: DAYS,
        frames: [{ en: "It's {en}.", ja: '{ja}です', ask: 'What day is it today?' }, { en: 'I play soccer on {en}.', ja: '{ja}に サッカーを する' }, { en: 'I like {pl}.', ja: '{ja}が すき' }, { en: 'See you on {en}.', ja: '{ja}に また 会おう' }] }
    ],
    4: [
      { unit: '天気', stage: 1, hint: '天気の ことばだよ。', words: WEATHER,
        frames: [{ en: "It's {en}.", ja: '{ja}です', ask: "How's the weather?" }, { en: "It's {en} today.", ja: '今日は {ja}です' }, { en: "It's {en} in Osaka.", ja: '大阪は {ja}です' }, { en: 'Is it {en}?', ja: '{ja}ですか？' }] },
      { unit: 'あそび', stage: 1, hint: 'あそびの ことばだよ。', words: PLAYS,
        frames: [{ en: "Let's play {en}.", ja: '{ja}を しよう', ask: 'What do you want to play?' }, { en: 'I like {en}.', ja: '{ja}が すき' }, { en: "Do you want to play {en}?", ja: '{ja}を したい？' }, { en: "I don't play {en}.", ja: '{ja}は しない' }] },
      { unit: '世界のあいさつ', stage: 1, kind: 'hello' },
      { unit: '曜日', stage: 2, hint: '曜日の ことばだよ。', words: DAYS,
        frames: [{ en: "It's {en}.", ja: '{ja}です', ask: 'What day is it?' }, { en: 'I have music on {en}.', ja: '{ja}に 音楽が ある' }, { en: 'I play soccer on {pl}.', ja: '{ja}は いつも サッカーを する' }, { en: "Tomorrow is {en}.", ja: '明日は {ja}' }] },
      { unit: '時こく', stage: 2, kind: 'time' },
      { unit: '1日の生活', stage: 2, hint: '1日の 生活の ことばだよ。', words: DAILY,
        frames: [{ en: 'I {en} at 7:00.', ja: '7時に {ja}', ask: 'What do you do at 7:00?' }, { en: 'I {en}.', ja: 'わたしは {ja}' }, { en: 'Do you {en}?', ja: 'あなたは {ja}の？' }, { en: "It's time to {en}.", ja: '{ja} 時間だよ' }] },
      { unit: '文ぼう具', stage: 3, hint: '文ぼう具の ことばだよ。', words: STATIONERY,
        frames: [{ en: 'I have {a} {en}.', ja: '{ja}を もって いる', ask: 'What do you have?' }, { en: 'This is my {en}.', ja: 'これは わたしの {ja}' }, { en: 'Do you have {a} {en}?', ja: '{ja}を もって いる？' }, { en: 'I want {a} {en}.', ja: '{ja}が ほしい' }] },
      { unit: 'アルファベット', stage: 3, kind: 'alpha4' },
      { unit: '学校の中', stage: 4, hint: '学校の 場所の ことばだよ。', words: ROOMS,
        frames: [{ en: 'This is the {en}.', ja: 'ここは {ja}です', ask: 'What room is this?' }, { en: 'Go to the {en}.', ja: '{ja}へ 行って' }, { en: 'Where is the {en}?', ja: '{ja}は どこ？' }, { en: 'I like the {en}.', ja: '{ja}が すき' }] },
      { unit: '野さいとくだもの', stage: 4, hint: '野さい・くだものの ことばだよ。', words: VEGFRUIT,
        frames: [{ en: 'I want {pl}.', ja: '{ja}が ほしい', ask: 'What do you want?' }, { en: 'I like {pl}.', ja: '{ja}が すき' }, { en: 'Do you have {pl}?', ja: '{ja}は ある？' }, { en: "I don't like {pl}.", ja: '{ja}は すきでは ない' }] }
    ],
    5: [
      { unit: 'たん生日', stage: 1, kind: 'birthday' },
      { unit: 'じこしょうかい', stage: 1, hint: 'スポーツの ことばだよ。', words: SPORTS,
        frames: [{ en: 'I like {en}.', ja: '{ja}が 好きです', ask: 'What sport do you like?' }, { en: 'I can play {en}.', ja: '{ja}が できます' }, { en: "Do you like {en}?", ja: '{ja}は 好きですか' }, { en: 'My favorite sport is {en}.', ja: 'いちばん 好きな スポーツは {ja}です' }] },
      { unit: '教科', stage: 2, hint: '教科の ことばだよ。', words: SUBJECTS,
        frames: [{ en: 'I like {en}.', ja: '{ja}が 好きです', ask: 'What subject do you like?' }, { en: 'I have {en} on Monday.', ja: '月曜日に {ja}が あります' }, { en: 'I want to study {en}.', ja: '{ja}を 勉強したい' }, { en: "I don't like {en}.", ja: '{ja}は 好きでは ありません' }] },
      { unit: 'できること', stage: 2, hint: 'できる ことの 文だよ。', words: CANS,
        frames: [{ en: 'I can {en}.', ja: 'わたしは {ja}ことが できます', ask: 'What can you do?' }, { en: 'Can you {en}?', ja: 'あなたは {ja}ことが できますか' }, { en: "I can't {en}.", ja: 'わたしは {ja}ことが できません' }, { en: 'She can {en}.', ja: 'かのじょは {ja}ことが できます' }] },
      { unit: '道あんない', stage: 3, hint: '町の 場所の ことばだよ。', words: PLACES5,
        frames: [{ en: 'Where is the {en}?', ja: '{ja}は どこですか' }, { en: 'Go straight. You can see the {en}.', ja: 'まっすぐ 行くと {ja}が 見えます' }, { en: 'The {en} is on your left.', ja: '{ja}は 左がわに あります' }, { en: 'I want to go to the {en}.', ja: '{ja}に 行きたい' }] },
      { unit: 'レストラン', stage: 3, hint: '食べ物・飲み物の ことばだよ。', words: MENU,
        frames: [{ en: "I'd like {en}.", ja: '{ja}を ください', ask: 'What would you like?' }, { en: 'I want {en}.', ja: '{ja}が ほしいです' }, { en: 'How much is {en}?', ja: '{ja}は いくらですか' }, { en: "{en}, please.", ja: '{ja}を おねがいします' }] },
      { unit: 'ヒーロー', stage: 4, hint: '仕事の ことばだよ。', words: JOBS,
        frames: [{ en: 'My hero is {a} {en}.', ja: 'わたしの ヒーローは {ja}です', ask: 'Who is your hero?' }, { en: 'I want to be {a} {en}.', ja: 'わたしは {ja}に なりたい' }, { en: 'He is {a} {en}.', ja: 'かれは {ja}です' }, { en: 'She is a good {en}.', ja: 'かのじょは よい {ja}です' }] },
      { unit: '日本のしょうかい', stage: 4, kind: 'japan' }
    ],
    6: [
      { unit: '自分のこと', stage: 1, hint: 'スポーツの ことばだよ。', words: SPORTS,
        frames: [{ en: "I'm good at {en}.", ja: 'わたしは {ja}が 得意です', ask: 'What are you good at?' }, { en: 'I like {en}.', ja: '{ja}が 好きです' }, { en: 'I want to play {en}.', ja: '{ja}を したい' }, { en: "I'm not good at {en}.", ja: 'わたしは {ja}が 苦手です' }] },
      { unit: '日課', stage: 1, hint: '日課の ことばだよ。', words: DAILY,
        frames: [{ en: 'I usually {en} at 7:00.', ja: 'わたしは ふだん 7時に {ja}', ask: 'What do you usually do at 7:00?' }, { en: 'I always {en}.', ja: 'わたしは いつも {ja}' }, { en: 'I never {en}.', ja: 'わたしは けっして {ja}ことは ない' }, { en: 'I sometimes {en}.', ja: 'わたしは ときどき {ja}' }] },
      { unit: '行きたい国', stage: 2, kind: 'country' },
      { unit: '住んでいる町', stage: 2, hint: '町に ある ものの ことばだよ。', words: TOWN,
        frames: [{ en: 'We have {a} {en} in our town.', ja: 'わたしたちの 町には {ja}が あります', ask: 'What do you have in your town?' }, { en: "We don't have {a} {en}.", ja: 'わたしたちの 町には {ja}が ありません' }, { en: 'I want {a} {en} in our town.', ja: '町に {ja}が ほしい' }, { en: 'You can enjoy the {en}.', ja: '{ja}を 楽しめます' }] },
      { unit: '夏の思い出', stage: 3, hint: '夏休みの 思い出の 文だよ。', words: PAST,
        frames: [{ en: 'I {en}.', ja: 'わたしは {ja}', ask: 'How was your summer vacation?' }, { en: 'I {en}. It was fun.', ja: 'わたしは {ja}。楽しかった' }, { en: 'Did you {en}?', ja: 'あなたは {ja}の？' }, { en: 'My brother {en}.', ja: '兄は {ja}' }] },
      { unit: '生き物とかん境', stage: 3, kind: 'creature' },
      { unit: '小学校の思い出', stage: 4, hint: '学校の 行事の ことばだよ。', words: EVENTS,
        frames: [{ en: 'My best memory is the {en}.', ja: 'いちばんの 思い出は {ja}です', ask: "What's your best memory?" }, { en: 'I enjoyed the {en}.', ja: '{ja}を 楽しみました' }, { en: 'We have the {en} in May.', ja: '5月に {ja}が あります' }, { en: 'The {en} was great.', ja: '{ja}は すばらしかった' }] },
      { unit: '中学校でしたいこと', stage: 4, hint: '部活の ことばだよ。', words: CLUBS,
        frames: [{ en: 'I want to join the {en}.', ja: '{ja}に 入りたい', ask: 'What club do you want to join?' }, { en: "I'm in the {en}.", ja: 'わたしは {ja}に 入って います' }, { en: 'My sister is in the {en}.', ja: '姉は {ja}に 入って います' }, { en: 'The {en} is popular.', ja: '{ja}は 人気が あります' }] }
    ]
  };

  /* =====================================================
     問題を 作る
     ===================================================== */
  function q(cat, lv, text, choices, note, hint) {
    const fix = function (t) { return String(t).replace(/\.\./g, '.'); };   // 'the U.S.A..' → 'the U.S.A.'
    const c = uniq4(choices.map(fix));
    if (!c) return null;
    return { stage: cat.stage, lv: lv, unit: cat.unit, text: fix(text), choices: c, note: fix(note), hint: hint || cat.hint || '', gen: true };
  }
  function say(g) { return g <= 3 ? 'いうと' : '言うと'; }

  // ---- 単語＋文型（いちばん 多く つかう 形）----
  function wordCat(cat, g, out) {
    const W = cat.words, F = cat.frames || [];
    W.forEach(function (w, i) {
      const en = w[0], ja = w[1];
      const oth = others(W, i, 3);
      const note = en + ' ＝ ' + ja + '。';
      // lv1 英 → 日 ／ 日 → 英
      out.push(q(cat, 1, '"' + en + '" の いみは？', [ja].concat(oth.map(function (o) { return o[1]; })), note));
      out.push(q(cat, 1, '「' + ja + '」を 英語で ' + say(g) + '？', [en].concat(oth.map(function (o) { return o[0]; })), note));
      if (!F.length) return;
      // lv2 主役の 文型（同じ 文型・ちがう 単語が まちがい）
      const f0 = F[0];
      out.push(q(cat, 2, '"' + fill(f0.en, w) + '" の いみは？', [fill(f0.ja, w)].concat(oth.map(function (o) { return fill(f0.ja, o); })), dot(fill(f0.en, w) + ' ＝ ' + fill(f0.ja, w))));
      // lv3 聞かれて 答える
      if (f0.ask) out.push(q(cat, 3, '"' + f0.ask + '" に「' + ja + '」と 答えるなら？', [fill(f0.en, w)].concat(oth.map(function (o) { return fill(f0.en, o); })), f0.ask + ' と 聞かれたら ' + fill(f0.en, w) + ' と 答える。', '聞かれて いるのは ' + cat.unit + '。'));
      // lv3 ちがう 文型の 見わけ（同じ 単語・ちがう 文型が まちがい）
      if (F.length >= 4) {
        const k = 1 + (i % (F.length - 1));
        const fk = F[k];
        const wrong = F.filter(function (f, j) { return j !== k; }).map(function (f) { return fill(f.ja, w); });
        out.push(q(cat, 3, '"' + fill(fk.en, w) + '" の いみは？', [fill(fk.ja, w)].concat(wrong), dot(fill(fk.en, w) + ' ＝ ' + fill(fk.ja, w)), '単語は 同じ。文の 形を よく 見よう。'));
      }
    });
  }

  // ---- 数（0〜20・30・40…100）----
  const NUMS = [['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10], ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14], ['fifteen', 15], ['sixteen', 16], ['seventeen', 17], ['eighteen', 18], ['nineteen', 19], ['twenty', 20], ['thirty', 30], ['forty', 40], ['fifty', 50], ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90], ['one hundred', 100]];
  function numberCat(cat, g, out) {
    NUMS.forEach(function (w, i) {
      const en = w[0], n = w[1];
      const oth = others(NUMS, i, 3);
      const lv = n <= 10 ? 1 : n <= 20 ? 2 : 3;
      out.push(q(cat, lv, '"' + en + '" は いくつ？', [String(n)].concat(oth.map(function (o) { return String(o[1]); })), en + ' ＝ ' + n + '。', '数の ことばだよ。'));
      out.push(q(cat, lv, '「' + n + '」を 英語で ' + say(g) + '？', [en].concat(oth.map(function (o) { return o[0]; })), en + ' ＝ ' + n + '。', '数の ことばだよ。'));
      if (i + 1 < NUMS.length && n < 20) {
        const nx = NUMS[i + 1];
        out.push(q(cat, 2, '"' + en + '" の つぎの 数を 英語で ' + say(g) + '？', [nx[0]].concat(others(NUMS, i + 1, 3).map(function (o) { return o[0]; })), en + '（' + n + '）の つぎは ' + nx[0] + '（' + nx[1] + '）。', '1 大きい 数。'));
      }
      if (i >= 2 && n <= 20) {
        const other = NUMS[(i * 7 + 3) % 21];
        if (other[1] !== n) {
          const big = n > other[1] ? w : other, small = n > other[1] ? other : w;
          out.push(q(cat, 3, '"' + w[0] + '" と "' + other[0] + '"、大きいのは？', [big[0], small[0], NUMS[(i + 5) % 21][0] === big[0] || NUMS[(i + 5) % 21][0] === small[0] ? NUMS[(i + 6) % 21][0] : NUMS[(i + 5) % 21][0], NUMS[(i + 11) % 21][0] === big[0] || NUMS[(i + 11) % 21][0] === small[0] ? NUMS[(i + 12) % 21][0] : NUMS[(i + 11) % 21][0]], w[0] + ' ＝ ' + n + '、' + other[0] + ' ＝ ' + other[1] + '。', '2つとも 数に 直して みよう。'));
        }
      }
    });
  }

  // ---- アルファベット ----
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  function alphaCat(cat, g, out) {
    ABC.forEach(function (L, i) {
      const oth = others(ABC, i, 3);
      if (g === 3) {
        if (i < 25) out.push(q(cat, 1, L + ' の つぎの 文字は？', [ABC[i + 1]].concat(others(ABC, i + 1, 3)), 'A・B・C… の じゅん。' + L + ' の つぎは ' + ABC[i + 1] + '。', 'ABCの うたを 思い出そう。'));
        if (i > 0) out.push(q(cat, 2, L + ' の 1つ まえの 文字は？', [ABC[i - 1]].concat(others(ABC, i - 1, 3)), ABC[i - 1] + '・' + L + ' の じゅんなので、' + L + ' の まえは ' + ABC[i - 1] + '。', 'ABCの うたを 思い出そう。'));
        if (i % 3 === 0 && i < 24) out.push(q(cat, 3, L + ' から 3つ あとの 文字は？', [ABC[i + 3]].concat(others(ABC, i + 3, 3)), L + ' → ' + ABC[i + 1] + ' → ' + ABC[i + 2] + ' → ' + ABC[i + 3] + '。', '1つずつ 数えよう。'));
      } else {
        out.push(q(cat, 1, '大文字の「' + L + '」を 小文字で 書くと？', [L.toLowerCase()].concat(oth.map(function (o) { return o.toLowerCase(); })), L + ' の 小文字は ' + L.toLowerCase() + '。', '形が にて いる ものも あるよ。'));
        out.push(q(cat, 2, '小文字の「' + L.toLowerCase() + '」を 大文字で 書くと？', [L].concat(oth), L.toLowerCase() + ' の 大文字は ' + L + '。', '形が にて いる ものも あるよ。'));
        if (i < 25) out.push(q(cat, 3, '小文字の「' + L.toLowerCase() + '」の つぎの 文字（小文字）は？', [ABC[i + 1].toLowerCase()].concat(others(ABC, i + 1, 3).map(function (o) { return o.toLowerCase(); })), 'a・b・c… の じゅん。', 'ABCの うたを 思い出そう。'));
      }
    });
  }

  // ---- 時こく（小4）----
  function timeCat(cat, g, out) {
    const H = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const M = [[15, 'fifteen'], [30, 'thirty'], [45, 'forty-five'], [10, 'ten'], [20, 'twenty'], [50, 'fifty']];
    H.forEach(function (h, i) {
      const n = i + 1;
      const oh = others(H, i, 3).map(function (x) { return H.indexOf(x) + 1; });
      out.push(q(cat, 1, '"It\'s ' + h + ' o\'clock." は 何時？', [n + '時'].concat(oh.map(function (x) { return x + '時'; })), h + ' ＝ ' + n + '。o\'clock ＝ 〜時 ちょうど。', '数の ことばを 聞きとろう。'));
      const m = M[i % M.length];
      out.push(q(cat, 2, '"It\'s ' + h + ' ' + m[1] + '." は 何時何分？', [n + '時' + m[0] + '分', oh[0] + '時' + m[0] + '分', n + '時' + M[(i + 1) % M.length][0] + '分', oh[1] + '時' + M[(i + 2) % M.length][0] + '分'], h + '（' + n + '）→ ' + m[1] + '（' + m[0] + '）。時 → 分の じゅんに 言います。', '前が 時・あとが 分。'));
      const acts = [['get up', 'おきる'], ['eat breakfast', '朝ごはんを 食べる'], ['go to school', '学校へ 行く'], ['eat lunch', '昼ごはんを 食べる'], ['go home', '家に 帰る'], ['take a bath', 'おふろに 入る'], ['eat dinner', '夕ごはんを 食べる'], ['go to bed', 'ねる']];
      const a = acts[i % acts.length];
      out.push(q(cat, 3, '"I ' + a[0] + ' at ' + h + '." の いみは？', [n + '時に ' + a[1], oh[0] + '時に ' + a[1], n + '時に ' + acts[(i + 3) % acts.length][1], oh[1] + '時に ' + acts[(i + 5) % acts.length][1]], 'at ' + h + ' ＝ ' + n + '時に。' + a[0] + ' ＝ ' + a[1] + '。', 'at の あとが 時こく。'));
    });
  }

  // ---- 世界の あいさつ（小4）----
  function helloCat(cat, g, out) {
    HELLOS.forEach(function (w, i) {
      const oth = others(HELLOS, i, 3);
      out.push(q(cat, 1, '"' + w[0] + '" は 何語の「こんにちは」？', [w[1]].concat(oth.map(function (o) { return o[1]; })), w[0] + ' ＝ ' + w[1] + 'の あいさつ。', '世界の あいさつだよ。'));
      out.push(q(cat, 2, w[1] + 'で「こんにちは」は？', [w[0]].concat(oth.map(function (o) { return o[0]; })), w[1] + 'の こんにちは ＝ ' + w[0] + '。', '世界の あいさつだよ。'));
    });
  }

  // ---- たん生日（小5）----
  function birthdayCat(cat, g, out) {
    const ORD = [[1, 'first', '1st'], [2, 'second', '2nd'], [3, 'third', '3rd'], [5, 'fifth', '5th'], [10, 'tenth', '10th'], [12, 'twelfth', '12th'], [15, 'fifteenth', '15th'], [20, 'twentieth', '20th'], [21, 'twenty-first', '21st'], [22, 'twenty-second', '22nd'], [23, 'twenty-third', '23rd'], [30, 'thirtieth', '30th']];
    MONTHS.forEach(function (mo, i) {
      const oth = others(MONTHS, i, 3);
      out.push(q(cat, 1, '"' + mo[0] + '" は 何月？', [mo[1]].concat(oth.map(function (o) { return o[1]; })), mo[0] + ' ＝ ' + mo[1] + '。', '月の 名前だよ。'));
      const d = ORD[i % ORD.length];
      const od = others(ORD, i % ORD.length, 3);
      out.push(q(cat, 2, '"My birthday is ' + mo[0] + ' ' + d[2] + '." の たん生日は？', [mo[1] + d[0] + '日', oth[0][1] + d[0] + '日', mo[1] + od[0][0] + '日', oth[1][1] + od[1][0] + '日'], mo[0] + ' ＝ ' + mo[1] + '、' + d[2] + '（' + d[1] + '）＝ ' + d[0] + '日。', '月 → 日の じゅん。'));
      out.push(q(cat, 3, '"When is your birthday?" に「' + mo[1] + d[0] + '日」と 答えるなら？', ['My birthday is ' + mo[0] + ' ' + d[2] + '.', 'My birthday is ' + oth[0][0] + ' ' + d[2] + '.', 'My birthday is ' + mo[0] + ' ' + od[0][2] + '.', 'My birthday is ' + oth[1][0] + ' ' + od[1][2] + '.'], d[0] + '日は ' + d[2] + '（' + d[1] + '）。', '日づけは 〜th の 形。'));
    });
    ORD.forEach(function (d, i) {
      const od = others(ORD, i, 3);
      out.push(q(cat, 2, '"' + d[1] + '" は 何日？', [d[0] + '日'].concat(od.map(function (o) { return o[0] + '日'; })), d[1] + '（' + d[2] + '）＝ ' + d[0] + '日。', 'じゅんばんを 表す ことば。'));
    });
  }

  // ---- 日本の しょうかい（小5）----
  function japanCat(cat, g, out) {
    const V = { eat: ['You can eat {en} in Japan.', '日本では {ja}を 食べられます', '食べる'], see: ['You can see {en} in Japan.', '日本では {ja}を 見られます', '見る'], enjoy: ['You can enjoy {en} in Japan.', '日本では {ja}を 楽しめます', '楽しむ'] };
    JAPAN.forEach(function (w, i) {
      const oth = others(JAPAN, i, 3);
      const v = V[w[2].v];
      out.push(q(cat, 1, '"' + w[0] + '" の いみは？', [w[1]].concat(oth.map(function (o) { return o[1]; })), w[0] + ' ＝ ' + w[1] + '。', '日本の ものだよ。'));
      out.push(q(cat, 2, '"' + fill(v[0], w) + '" の いみは？', [fill(v[1], w)].concat(oth.map(function (o) { return fill(v[1], o); })), 'You can 〜 ＝ 〜できます。', 'can の あとの 動作に 注目。'));
      out.push(q(cat, 3, '「' + w[1] + '」を しょうかいする 文は？', [fill(v[0], w), fill(v[0], oth[0]), fill(V[w[2].v === 'eat' ? 'see' : 'eat'][0], w), fill(v[0], oth[1])], w[1] + 'は「' + v[2] + '」もの。', 'eat・see・enjoy の どれかな。'));
    });
  }

  // ---- 行きたい 国（小6）----
  function countryCat(cat, g, out) {
    COUNTRIES.forEach(function (w, i) {
      const oth = others(COUNTRIES, i, 3);
      const x = w[2];
      out.push(q(cat, 1, '"' + w[0] + '" の いみは？', [w[1]].concat(oth.map(function (o) { return o[1]; })), w[0] + ' ＝ ' + w[1] + '。', '国の 名前だよ。'));
      out.push(q(cat, 2, '"I want to go to ' + w[0] + '." の いみは？', [w[1] + 'に 行きたい'].concat(oth.map(function (o) { return o[1] + 'に 行きたい'; })), 'want to go to 〜 ＝ 〜に 行きたい。', '国の 名前を 聞きとろう。'));
      out.push(q(cat, 2, '"You can see ' + x.see + ' in ' + w[0] + '." の いみは？', [w[1] + 'では ' + x.seeJa + 'が 見られる'].concat(oth.map(function (o) { return o[1] + 'では ' + o[2].seeJa + 'が 見られる'; })), x.see + ' ＝ ' + x.seeJa + '。', 'see ＝ 見る。'));
      out.push(q(cat, 3, '"Where do you want to go?" に「' + w[1] + '」と 答えるなら？', ['I want to go to ' + w[0] + '.'].concat(oth.map(function (o) { return 'I want to go to ' + o[0] + '.'; })), 'I want to go to 〜.', 'where ＝ どこ。'));
      out.push(q(cat, 3, '"' + w[1] + '" で 食べられる ものを 言って いる 文は？', ['You can eat ' + x.eat + ' in ' + w[0] + '.', 'You can eat ' + oth[0][2].eat + ' in ' + w[0] + '.', 'You can eat ' + x.eat + ' in ' + oth[1][0] + '.', 'You can see ' + x.see + ' in ' + w[0] + '.'], w[1] + 'では ' + x.eatJa + 'が 食べられる。', 'eat と 国の 名前の 両方を 見よう。'));
    });
  }

  // ---- 生き物と かん境（小6）----
  function creatureCat(cat, g, out) {
    CREATURES.forEach(function (w, i) {
      const oth = others(CREATURES, i, 3);
      const x = w[2];
      out.push(q(cat, 1, '"' + w[0] + '" の いみは？', [w[1]].concat(oth.map(function (o) { return o[1]; })), w[0] + ' ＝ ' + w[1] + '。', '生き物の 名前だよ。'));
      out.push(q(cat, 2, '"' + cap(w[0]) + ' live ' + x.where + '." の いみは？', [w[1] + 'は ' + x.whereJa + 'に すんで いる'].concat(oth.map(function (o) { return o[1] + 'は ' + o[2].whereJa + 'に すんで いる'; })), 'live ' + x.where + ' ＝ ' + x.whereJa + 'に すむ。', 'live ＝ すむ。'));
      out.push(q(cat, 2, '"' + cap(w[0]) + ' eat ' + x.eat + '." の いみは？', [w[1] + 'は ' + x.eatJa + 'を 食べる'].concat(oth.map(function (o) { return o[1] + 'は ' + o[2].eatJa + 'を 食べる'; })), 'eat ＝ 食べる。' + x.eat + ' ＝ ' + x.eatJa + '。', 'eat ＝ 食べる。'));
      out.push(q(cat, 3, '"Where do ' + w[0] + ' live?" に 答えるなら？', ['They live ' + x.where + '.', 'They live ' + oth[0][2].where + '.', 'They eat ' + x.eat + '.', 'They live ' + oth[1][2].where + '.'], w[1] + 'は ' + x.whereJa + 'に すむ。', 'where ＝ どこ、live ＝ すむ。'));
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  const KINDS = { number: numberCat, alpha3: alphaCat, alpha4: alphaCat, time: timeCat, hello: helloCat, birthday: birthdayCat, japan: japanCat, country: countryCat, creature: creatureCat };

  /* 学年の 問題を 作る。hand（手書きの 一覧）に 同じ 文が あれば 作らない */
  function make(g, hand) {
    const cats = BANK[g] || [];
    const out = [];
    cats.forEach(function (cat) {
      if (cat.kind) KINDS[cat.kind](cat, g, out);
      else wordCat(cat, g, out);
    });
    const have = {};
    (hand || []).forEach(function (x) { have[x.stage + x.text] = true; });
    const fin = [];
    out.forEach(function (x) {
      if (!x) return;
      const k = x.stage + x.text;
      if (have[k]) return;
      have[k] = true;
      fin.push(x);
    });
    return fin;
  }

  /* eigoN.js の 一覧に 足す（読みこみ時に 1回） */
  function attach(g) {
    const mod = MQ['eigo' + g];
    if (!mod || !mod.questions) return 0;
    const add = make(g, mod.questions);
    add.forEach(function (x) { mod.questions.push(x); });
    mod.generated = add.length;
    return add.length;
  }
  [3, 4, 5, 6].forEach(attach);

  return { make: make, bank: BANK, fill: fill, others: others };
})();
