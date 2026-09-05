/* ---------------------------------------------------------
   小5 英語（外国語・東京書籍 NEW HORIZON Elementary 5 の 単元を 目安に）v6.8

   ステージ
     1 じこしょうかい・たん生日（Hello, friends! / When is your birthday?）      … 1学期
     2 教科と 時間わり・できる こと（What do you want to study? / He can ...）   … 1〜2学期
     3 道あんない・レストラン（Where is the post office? / What would you like?） … 2学期
     4 日本の しょうかい・ヒーロー（Welcome to Japan. / Who is your hero?）      … 3学期

   書き方は eigo4.js と 同じ（正解を choices の さきに 書く）。
   問題文の 英語は "..." の 中（よみあげの「きく」ボタンが 読む）。
   日本語の かん字は 小1〜小5 の 字だけ（smoke.js が 検査）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.eigo5 = {
  questions: [
    /* ===== 1 じこしょうかい ===== */
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"My name is Ken." の いみは？', choices: ['ぼくの 名前は ケンです', 'ぼくは ケンが 好きです', 'ケンは 友だちです', 'ケンを 知って いますか'], note: 'My name is 〜. ＝ わたしの 名前は 〜です。' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"How do you spell your name?" の いみは？', choices: ['名前は どう つづりますか', '名前は 何ですか', '何さいですか', 'どこに 住んで いますか'], note: 'spell ＝ つづる。アルファベットで 名前を 言います。' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"I like soccer." の いみは？', choices: ['わたしは サッカーが 好きです', 'わたしは サッカーが できます', 'わたしは サッカー選手です', 'サッカーを しましょう'], note: 'like ＝ 好き。' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"What sport do you like?" に 答えるなら？', choices: ['I like tennis.', 'I like blue.', 'I can swim.', 'I am ten.'], note: 'sport（スポーツ）を 聞かれた ので スポーツで 答えます。' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"Nice to meet you." の いみは？', choices: ['はじめまして', 'さようなら', 'ありがとう', 'おやすみ'], note: 'はじめて 会った ときの あいさつ。返事も Nice to meet you, too.' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"I\'m from Japan." の いみは？', choices: ['わたしは 日本 出身です', 'わたしは 日本へ 行きます', '日本は 遠いです', '日本が 好きです'], note: 'from ＝ 〜出身。' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '"How are you?" に「元気です」と 答えるなら？', choices: ['I\'m fine, thank you.', 'I\'m ten years old.', 'My name is Yui.', 'It\'s sunny.'], note: 'fine ＝ 元気。' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '"What\'s your favorite color?" の いみは？', choices: ['好きな 色は 何ですか', '好きな 食べ物は 何ですか', '何色の 服ですか', '色を ぬって ください'], note: 'favorite ＝ いちばん 好きな。' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '"I can play the piano." の いみは？', choices: ['わたしは ピアノを ひけます', 'わたしは ピアノが ほしいです', 'ピアノを ひいて ください', 'ピアノは 高いです'], note: 'can ＝ 〜できる。' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '「わたしは 犬が 好きです」を 英語で 言うと？', choices: ['I like dogs.', 'I am a dog.', 'I have a cat.', 'I can dog.'], note: 'I like 〜.' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '"Do you like natto?" に「いいえ」と 答えるなら？', choices: ['No, I don\'t.', 'Yes, I do.', 'No, I can\'t.', 'Yes, it is.'], note: 'Do you 〜? には Yes, I do. / No, I don\'t. で 答えます。' },
    { stage: 1, lv: 3, unit: 'じこしょうかい', text: '"K-E-N. Ken." と 言って いる。何を して いる？', choices: ['名前の つづりを 言って いる', '数を 数えて いる', 'あいさつを して いる', '年れいを 言って いる'], note: 'How do you spell your name? への 答え方。', boss: true },
    { stage: 1, lv: 3, unit: 'じこしょうかい', text: '"What do you want to be?" の いみは？', choices: ['何に なりたいですか', '何が ほしいですか', '何を 見て いますか', 'どこに 行きたいですか'], note: 'want to be ＝ 〜に なりたい。' },
    { stage: 1, lv: 3, unit: 'じこしょうかい', text: '"I want to be a doctor." の いみは？', choices: ['わたしは 医者に なりたいです', 'わたしは 医者です', '医者に 会いたいです', '医者は いそがしいです'], note: 'want to be ＋ 職業。', boss: true },
    { stage: 1, lv: 3, unit: 'じこしょうかい', text: '"Call me Yu." の いみは？', choices: ['ユウと よんで ください', 'ユウに 電話して', 'ユウは わたしです', 'ユウを さがして'], note: 'Call me 〜. ＝ 〜と よんでね。' },
    /* ---- たん生日・月 ---- */
    { stage: 1, lv: 1, unit: 'たん生日', text: '"When is your birthday?" の いみは？', choices: ['たん生日は いつですか', 'たん生日は 楽しいですか', '何さいですか', 'たん生日 おめでとう'], note: 'When ＝ いつ。birthday ＝ たん生日。' },
    { stage: 1, lv: 1, unit: 'たん生日', text: '"January" は 何月？', choices: ['1月', '6月', '7月', '11月'], note: 'January ＝ 1月。' },
    { stage: 1, lv: 1, unit: 'たん生日', text: '"April" は 何月？', choices: ['4月', '8月', '2月', '10月'], note: 'April ＝ 4月。' },
    { stage: 1, lv: 1, unit: 'たん生日', text: '"August" は 何月？', choices: ['8月', '4月', '9月', '3月'], note: 'August ＝ 8月。' },
    { stage: 1, lv: 1, unit: 'たん生日', text: '"December" は 何月？', choices: ['12月', '10月', '9月', '2月'], note: 'December ＝ 12月。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '"My birthday is July 7th." の いみは？', choices: ['たん生日は 7月7日です', 'たん生日は 6月7日です', 'たん生日は 7月17日です', 'たん生日は 1月7日です'], note: 'July ＝ 7月。7th ＝ 7日。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '"October" は 何月？', choices: ['10月', '8月', '11月', '1月'], note: 'October ＝ 10月。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '「3月」を 英語で 言うと？', choices: ['March', 'May', 'June', 'February'], note: 'March ＝ 3月。May ＝ 5月。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '"What do you want for your birthday?" の いみは？', choices: ['たん生日に 何が ほしいですか', 'たん生日は いつですか', 'たん生日は 何を しますか', 'たん生日は だれと すごしますか'], note: 'want ＝ ほしい。for your birthday ＝ たん生日に。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '"I want a new bike." の いみは？', choices: ['新しい 自転車が ほしいです', '自転車に 乗れます', '自転車を 持って います', '自転車で 行きます'], note: 'want ＝ ほしい。bike ＝ 自転車。' },
    { stage: 1, lv: 3, unit: 'たん生日', text: '"twentieth" は 何日？', choices: ['20日', '12日', '2日', '22日'], note: '20th ＝ twentieth。' },
    { stage: 1, lv: 3, unit: 'たん生日', text: '"My birthday is November 3rd." たん生日は？', choices: ['11月3日', '9月3日', '11月30日', '10月3日'], note: 'November ＝ 11月。3rd ＝ 3日。', boss: true },
    { stage: 1, lv: 3, unit: 'たん生日', text: '「1日」を 英語で 言うと？', choices: ['first', 'one', 'oneth', 'firsth'], note: '1日 ＝ first（1st）、2日 ＝ second、3日 ＝ third。', boss: true },
    { stage: 1, lv: 3, unit: 'たん生日', text: '"September" は 何月？', choices: ['9月', '7月', '11月', '12月'], note: 'September ＝ 9月。' },
    { stage: 1, lv: 2, unit: 'たん生日', text: '"Happy birthday!" と 言われたら？', choices: ['Thank you!', 'Nice to meet you.', 'Goodbye.', 'I\'m sorry.'], note: 'お祝いには Thank you.' },
    { stage: 1, lv: 3, unit: 'たん生日', text: '"What month is it?" の いみは？', choices: ['今 何月ですか', '今 何時ですか', '今 何曜日ですか', '今日は 何日ですか'], note: 'month ＝ 月。' },
    { stage: 1, lv: 1, unit: 'じこしょうかい', text: '"See you." の いみは？', choices: ['またね', 'はじめまして', 'ありがとう', 'こんにちは'], note: 'See you. ＝ またね。' },
    { stage: 1, lv: 2, unit: 'じこしょうかい', text: '「わたしは 走るのが 得意です」に 近い 英語は？', choices: ['I can run fast.', 'I like running shoes.', 'I want to run.', 'I am a runner.'], note: 'can ＋ 動作 ＝ 〜できる。' },

    /* ===== 2 教科・時間わり・できる こと ===== */
    { stage: 2, lv: 1, unit: '教科', text: '"math" は どの 教科？', choices: ['算数', '国語', '理科', '社会'], note: 'math ＝ 算数。' },
    { stage: 2, lv: 1, unit: '教科', text: '"science" は どの 教科？', choices: ['理科', '社会', '音楽', '体育'], note: 'science ＝ 理科。' },
    { stage: 2, lv: 1, unit: '教科', text: '"P.E." は どの 教科？', choices: ['体育', '図工', '家庭科', '英語'], note: 'P.E. ＝ 体育。' },
    { stage: 2, lv: 1, unit: '教科', text: '"Japanese" は どの 教科？', choices: ['国語', '社会', '道徳', '英語'], note: 'Japanese ＝ 国語。' },
    { stage: 2, lv: 1, unit: '教科', text: '"What subject do you like?" の いみは？', choices: ['どの 教科が 好きですか', '何曜日が 好きですか', '何を 勉強しますか', '先生は だれですか'], note: 'subject ＝ 教科。' },
    { stage: 2, lv: 2, unit: '教科', text: '"social studies" は どの 教科？', choices: ['社会', '理科', '算数', '図工'], note: 'social studies ＝ 社会。' },
    { stage: 2, lv: 2, unit: '教科', text: '"arts and crafts" は どの 教科？', choices: ['図工', '音楽', '家庭科', '書写'], note: 'arts and crafts ＝ 図画工作。' },
    { stage: 2, lv: 2, unit: '教科', text: '"home economics" は どの 教科？', choices: ['家庭科', '道徳', '総合', '体育'], note: 'home economics ＝ 家庭科。' },
    { stage: 2, lv: 2, unit: '教科', text: '"I have math on Monday." の いみは？', choices: ['月曜日に 算数が あります', '月曜日は 休みです', '月曜日に 算数の テストです', '算数は 月に 1回です'], note: 'have 〜 on 曜日 ＝ 〜曜日に 〜が ある。' },
    { stage: 2, lv: 2, unit: '教科', text: '"What do you want to study?" の いみは？', choices: ['何を 勉強したいですか', '何を 食べたいですか', '何に なりたいですか', '何が ほしいですか'], note: 'want to study ＝ 勉強したい。' },
    { stage: 2, lv: 3, unit: '教科', text: '"I want to study science because I like stars." の いみは？', choices: ['星が 好きだから 理科を 勉強したい', '星を 見るのが しゅみです', '理科の 先生に なりたい', '星の 数を 数えたい'], note: 'because ＝ なぜなら。', boss: true },
    { stage: 2, lv: 3, unit: '教科', text: '"moral education" は どの 教科？', choices: ['道徳', '社会', '家庭科', '総合'], note: 'moral education ＝ 道徳。' },
    { stage: 2, lv: 3, unit: '教科', text: '"calligraphy" は？', choices: ['書写（習字）', '図工', '音楽', '体育'], note: 'calligraphy ＝ 書写。' },
    /* ---- 曜日・時間わり ---- */
    { stage: 2, lv: 1, unit: '曜日と時間わり', text: '"Tuesday" は 何曜日？', choices: ['火曜日', '木曜日', '月曜日', '土曜日'], note: 'Tuesday ＝ 火曜日。Thursday ＝ 木曜日。' },
    { stage: 2, lv: 1, unit: '曜日と時間わり', text: '"Friday" は 何曜日？', choices: ['金曜日', '水曜日', '日曜日', '火曜日'], note: 'Friday ＝ 金曜日。' },
    { stage: 2, lv: 2, unit: '曜日と時間わり', text: '"What day is it today?" の いみは？', choices: ['今日は 何曜日ですか', '今日は 何日ですか', '今 何時ですか', '今日は 晴れですか'], note: 'day ＝ 曜日。' },
    { stage: 2, lv: 2, unit: '曜日と時間わり', text: '"I have English and music on Wednesday." 水曜日に ある 教科は？', choices: ['英語と 音楽', '英語と 算数', '音楽と 体育', '英語だけ'], note: 'English ＝ 英語、music ＝ 音楽。' },
    { stage: 2, lv: 3, unit: '曜日と時間わり', text: '"What do you have on Thursday?" に 答えるなら？', choices: ['I have science and P.E.', 'I like Thursday.', 'It\'s Thursday.', 'I want a pen.'], note: 'have で 時間わりを 答えます。', boss: true },
    { stage: 2, lv: 3, unit: '曜日と時間わり', text: '"Thursday" は 何曜日？', choices: ['木曜日', '火曜日', '金曜日', '水曜日'], note: 'Thursday ＝ 木曜日。Tuesday と まちがえやすい。' },
    /* ---- できる こと ---- */
    { stage: 2, lv: 1, unit: 'できること', text: '"I can swim." の いみは？', choices: ['わたしは 泳げます', 'わたしは 泳ぎたいです', 'わたしは 泳ぎません', '泳ぎましょう'], note: 'can ＝ できる。' },
    { stage: 2, lv: 1, unit: 'できること', text: '"I can\'t ski." の いみは？', choices: ['わたしは スキーが できません', 'わたしは スキーが できます', 'スキーが ほしいです', 'スキーに 行きます'], note: 'can\'t ＝ できない。' },
    { stage: 2, lv: 2, unit: 'できること', text: '"Can you cook?" に「はい」と 答えるなら？', choices: ['Yes, I can.', 'Yes, I do.', 'Yes, it is.', 'Yes, I am.'], note: 'Can you 〜? には Yes, I can. / No, I can\'t.' },
    { stage: 2, lv: 2, unit: 'できること', text: '"He can bake bread well." の いみは？', choices: ['かれは パンを 上手に 焼けます', 'かれは パンが 好きです', 'かれは パン屋です', 'かれは パンを 買います'], note: 'bake ＝ 焼く。well ＝ 上手に。' },
    { stage: 2, lv: 2, unit: 'できること', text: '"She can play the guitar." の "She" は？', choices: ['かの女', 'かれ', 'わたし', 'あなた'], note: 'she ＝ かの女、he ＝ かれ。' },
    { stage: 2, lv: 2, unit: 'できること', text: '"Can she dance?" の いみは？', choices: ['かの女は おどれますか', 'かの女は おどりますか', 'かの女は だれですか', 'かの女は 先生ですか'], note: 'Can she 〜? ＝ かの女は 〜できますか。' },
    { stage: 2, lv: 3, unit: 'できること', text: '"This is my father. He can run fast." の いみは？', choices: ['こちらは 父です。速く 走れます', 'こちらは 父です。走るのが きらいです', 'こちらは 兄です。速く 走れます', '父は 走るのを やめました'], note: 'This is 〜. で 人を しょうかい。', boss: true },
    { stage: 2, lv: 3, unit: 'できること', text: '"He can\'t ride a unicycle, but he can ride a bike." の いみは？', choices: ['一輪車は 乗れないが 自転車は 乗れる', '一輪車も 自転車も 乗れる', '一輪車は 乗れるが 自転車は 乗れない', 'どちらも 乗れない'], note: 'but ＝ しかし。unicycle ＝ 一輪車。', boss: true },
    { stage: 2, lv: 3, unit: 'できること', text: '「かの女は 上手に 歌えます」を 英語で？', choices: ['She can sing well.', 'She is a singer.', 'She likes songs.', 'She wants to sing.'], note: 'can sing well。' },
    { stage: 2, lv: 1, unit: 'できること', text: '"jump rope" は？', choices: ['なわとび', 'ボール投げ', 'かけっこ', 'てつぼう'], note: 'jump rope ＝ なわとび。' },
    { stage: 2, lv: 2, unit: 'できること', text: '"I can\'t play the recorder well." の いみは？', choices: ['リコーダーが 上手に ふけません', 'リコーダーが 好きでは ありません', 'リコーダーを 持って いません', 'リコーダーは むずかしいです'], note: 'can\'t 〜 well ＝ 上手には できない。' },
    { stage: 2, lv: 1, unit: '教科', text: '"music" は どの 教科？', choices: ['音楽', '図工', '体育', '理科'], note: 'music ＝ 音楽。' },
    { stage: 2, lv: 3, unit: '曜日と時間わり', text: '"We have five classes on Friday." の いみは？', choices: ['金曜日は 5時間 授業です', '金曜日は 5年生の 授業です', '5つの クラスが あります', '金曜日は 5時に 終わります'], note: 'class ＝ 授業。' },

    /* ===== 3 道あんない ===== */
    { stage: 3, lv: 1, unit: '道あんない', text: '"Where is the post office?" の いみは？', choices: ['ゆうびん局は どこですか', 'ゆうびん局は 何時に 開きますか', 'ゆうびん局に 行きますか', 'ゆうびん局は 大きいですか'], note: 'Where ＝ どこ。post office ＝ ゆうびん局。' },
    { stage: 3, lv: 1, unit: '道あんない', text: '"Go straight." の いみは？', choices: ['まっすぐ 進んで', '右に 曲がって', '左に 曲がって', '止まって'], note: 'straight ＝ まっすぐ。' },
    { stage: 3, lv: 1, unit: '道あんない', text: '"Turn right." の いみは？', choices: ['右に 曲がって', '左に 曲がって', 'まっすぐ 進んで', 'もどって'], note: 'turn ＝ 曲がる。right ＝ 右。left ＝ 左。' },
    { stage: 3, lv: 1, unit: '道あんない', text: '"library" は？', choices: ['図書館', '病院', '公園', '駅'], note: 'library ＝ 図書館。' },
    { stage: 3, lv: 1, unit: '道あんない', text: '"hospital" は？', choices: ['病院', '学校', 'ゆうびん局', 'スーパー'], note: 'hospital ＝ 病院。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"Turn left at the second corner." の いみは？', choices: ['2つ目の 角を 左に 曲がって', '1つ目の 角を 左に', '2つ目の 角を 右に', '角で 止まって'], note: 'second ＝ 2番目。corner ＝ 角。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"You can see it on your right." の いみは？', choices: ['右手に 見えます', '右に 曲がって', '右の 部屋です', '右手を 上げて'], note: 'on your right ＝ あなたの 右がわに。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"It\'s next to the park." の いみは？', choices: ['公園の となりです', '公園の 中です', '公園の 向かいです', '公園の 近くでは ない'], note: 'next to ＝ 〜の となり。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"fire station" は？', choices: ['消防しょ', 'けいさつしょ', '駅', '工場'], note: 'fire station ＝ 消防しょ。police station ＝ けいさつしょ。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"Where is the station?" と 聞かれた。答えとして 合うのは？', choices: ['Go straight and turn left. It\'s on your right.', 'It\'s Monday.', 'I like the station.', 'Yes, I can.'], note: '道あんないの 答え方。' },
    { stage: 3, lv: 3, unit: '道あんない', text: '"Go straight for two blocks and turn right. It\'s in front of the bank." 目的地は どこ？', choices: ['銀行の 前', '銀行の 後ろ', '銀行の 中', '2つ目の 角'], note: 'in front of ＝ 〜の 前。block ＝ 区画。', boss: true },
    { stage: 3, lv: 3, unit: '道あんない', text: '"between the school and the park" の いみは？', choices: ['学校と 公園の 間', '学校の 後ろ', '公園の となり', '学校の 前'], note: 'between A and B ＝ A と B の 間。', boss: true },
    { stage: 3, lv: 3, unit: '道あんない', text: '"convenience store" は？', choices: ['コンビニ', 'デパート', '本屋', '花屋'], note: 'convenience store ＝ コンビニエンスストア。' },
    { stage: 3, lv: 1, unit: '道あんない', text: '"Excuse me." の いみは？', choices: ['すみません（声を かける とき）', 'ごめんなさい（あやまる とき）', 'ありがとう', 'さようなら'], note: '道を たずねる 前に Excuse me.' },
    { stage: 3, lv: 3, unit: '道あんない', text: '"Thank you for your help." の いみは？', choices: ['手伝って くれて ありがとう', '助けて ください', 'ありがとう、また 来ます', '手伝いますか'], note: 'help ＝ 助け・手伝い。' },
    /* ---- レストラン ---- */
    { stage: 3, lv: 1, unit: 'レストラン', text: '"What would you like?" の いみは？', choices: ['何に なさいますか', '何が 好きですか', '何を して いますか', 'いくらですか'], note: 'お店で 注文を 聞く ときの 言い方。' },
    { stage: 3, lv: 1, unit: 'レストラン', text: '"I\'d like pizza." の いみは？', choices: ['ピザを ください', 'ピザが 好きです', 'ピザを 作ります', 'ピザは いくらですか'], note: 'I\'d like 〜 ＝ 〜を ください（ていねい）。' },
    { stage: 3, lv: 1, unit: 'レストラン', text: '"How much is it?" の いみは？', choices: ['いくらですか', 'いくつですか', '何時ですか', 'どこですか'], note: 'How much ＝ いくら。' },
    { stage: 3, lv: 1, unit: 'レストラン', text: '"It\'s 500 yen." の いみは？', choices: ['500円です', '5000円です', '50円です', '500人です'], note: 'yen ＝ 円。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"I\'d like spaghetti and orange juice." 注文した ものは？', choices: ['スパゲッティと オレンジジュース', 'スパゲッティだけ', 'オレンジと ジュース', 'ピザと ジュース'], note: 'and で 2つ 注文。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"Anything else?" の いみは？', choices: ['ほかに 何か ありますか', 'それは 何ですか', 'いくらですか', 'おいしいですか'], note: '注文の あとに 店員が 聞く。答えは No, thank you. など。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"Here you are." の いみは？', choices: ['はい、どうぞ', 'ここは どこですか', 'あなたは ここです', 'いらっしゃいませ'], note: 'ものを わたす ときの 言葉。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"It\'s delicious." の いみは？', choices: ['おいしいです', 'まずいです', 'あついです', 'からいです'], note: 'delicious ＝ とても おいしい。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"A hamburger is 300 yen. French fries are 200 yen." 合わせて いくら？', choices: ['500円', '300円', '200円', '600円'], note: '300 + 200 = 500。french fries ＝ フライドポテト。' },
    { stage: 3, lv: 3, unit: 'レストラン', text: '"What would you like for dessert?" の いみは？', choices: ['デザートは 何に なさいますか', 'デザートは 好きですか', 'デザートは いくらですか', 'デザートは ありますか'], note: 'dessert ＝ デザート。', boss: true },
    { stage: 3, lv: 3, unit: 'レストラン', text: '"I\'d like a salad, please. — Sure." の "Sure." の いみは？', choices: ['かしこまりました', 'いいえ', 'いくらですか', 'わかりません'], note: 'Sure. ＝ はい、もちろん。', boss: true },
    { stage: 3, lv: 3, unit: 'レストラン', text: '"Would you like some tea?" に ていねいに ことわるなら？', choices: ['No, thank you.', 'No!', 'I don\'t like.', 'Yes, I can.'], note: 'No, thank you. ＝ いいえ、けっこうです。' },
    { stage: 3, lv: 1, unit: 'レストラン', text: '"menu" は？', choices: ['メニュー', 'お金', 'いす', 'テーブル'], note: 'menu ＝ メニュー。' },
    { stage: 3, lv: 2, unit: 'レストラン', text: '"steak" は？', choices: ['ステーキ', 'サラダ', 'スープ', 'パン'], note: 'steak ＝ ステーキ。' },
    { stage: 3, lv: 3, unit: 'レストラン', text: '"I\'d like a parfait. It\'s 450 yen." 1000円 出すと おつりは？', choices: ['550円', '450円', '650円', '500円'], note: '1000 − 450 = 550。' },
    { stage: 3, lv: 2, unit: '道あんない', text: '"turn" の いみは？', choices: ['曲がる', '進む', '止まる', '走る'], note: 'turn right / turn left。' },

    /* ===== 4 日本の しょうかい ===== */
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"Welcome to Japan." の いみは？', choices: ['日本へ ようこそ', '日本は 遠いです', '日本に 行きたい', '日本は 小さいです'], note: 'Welcome to 〜 ＝ 〜へ ようこそ。' },
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"spring" は どの 季節？', choices: ['春', '夏', '秋', '冬'], note: 'spring ＝ 春、summer ＝ 夏、fall/autumn ＝ 秋、winter ＝ 冬。' },
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"winter" は どの 季節？', choices: ['冬', '秋', '春', '夏'], note: 'winter ＝ 冬。' },
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"In summer, we have fireworks." の いみは？', choices: ['夏には 花火が あります', '夏は あついです', '夏に 火を 使います', '夏に 海へ 行きます'], note: 'fireworks ＝ 花火。' },
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"You can see cherry blossoms in spring." の いみは？', choices: ['春には さくらが 見られます', '春に さくらを 植えます', 'さくらは 春に 食べます', '春は さくらが 高いです'], note: 'cherry blossoms ＝ さくらの 花。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"You can enjoy skiing in Hokkaido." の いみは？', choices: ['北海道で スキーが 楽しめます', '北海道は 雪が 多いです', '北海道へ スキーを 持って 行きます', '北海道で スキーを 買えます'], note: 'enjoy ＝ 楽しむ。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"You can eat sushi." の いみは？', choices: ['すしが 食べられます', 'すしを 作れます', 'すしは 有名です', 'すしが 好きですか'], note: 'can eat ＝ 食べられる。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"fall" と 同じ 季節を 表す ことばは？', choices: ['autumn', 'winter', 'spring', 'summer'], note: 'fall ＝ autumn ＝ 秋。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"Japan has four seasons." の いみは？', choices: ['日本には 四季が あります', '日本には 4つの 島が あります', '日本は 4番目に 大きいです', '日本の 冬は 4か月です'], note: 'season ＝ 季節。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"It\'s beautiful." の いみは？', choices: ['美しいです', '大きいです', '古いです', '有名です'], note: 'beautiful ＝ 美しい。' },
    { stage: 4, lv: 3, unit: '日本のしょうかい', text: '"We have the Star Festival in July. We write wishes on paper." これは 何の 行事？', choices: ['七夕', '正月', 'ひな祭り', '節分'], note: 'Star Festival ＝ 七夕。wish ＝ ねがい。', boss: true },
    { stage: 4, lv: 3, unit: '日本のしょうかい', text: '"You can see snow monkeys in Nagano." の いみは？', choices: ['長野で 雪の 中の サルが 見られます', '長野には 雪が ありません', '長野で サルを 飼えます', '長野の サルは 雪が きらいです'], note: 'snow monkey ＝ 温せんに 入る ニホンザル。', boss: true },
    { stage: 4, lv: 3, unit: '日本のしょうかい', text: '"Why do you like winter? — Because I can ski." の やりとりの いみは？', choices: ['なぜ 冬が 好き？— スキーが できるから', '冬は 寒い？— スキーが できるから', 'いつ スキーを する？— 冬に', 'スキーは 好き？— はい'], note: 'Why ＝ なぜ。Because ＝ なぜなら。' },
    { stage: 4, lv: 1, unit: '日本のしょうかい', text: '"New Year\'s Day" は？', choices: ['元日（正月）', 'クリスマス', 'ハロウィン', '子どもの日'], note: 'New Year\'s Day ＝ 1月1日。' },
    { stage: 4, lv: 2, unit: '日本のしょうかい', text: '"Children\'s Day" は？', choices: ['子どもの日', '母の日', '文化の日', '海の日'], note: 'Children\'s Day ＝ 5月5日。' },
    /* ---- ヒーロー ---- */
    { stage: 4, lv: 1, unit: 'ヒーロー', text: '"Who is your hero?" の いみは？', choices: ['あなたの ヒーローは だれですか', 'あなたは ヒーローですか', 'ヒーローは どこですか', 'ヒーローは 何を しますか'], note: 'Who ＝ だれ。' },
    { stage: 4, lv: 1, unit: 'ヒーロー', text: '"My hero is my mother." の いみは？', choices: ['わたしの ヒーローは 母です', '母は ヒーローが 好きです', '母は ヒーローに 会いました', 'わたしは 母が 好きです'], note: 'hero ＝ あこがれの 人。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"She is good at cooking." の いみは？', choices: ['かの女は 料理が 得意です', 'かの女は 料理が 好きです', 'かの女は 料理人です', 'かの女は 料理を 習って います'], note: 'be good at 〜 ＝ 〜が 得意。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"He is kind." の いみは？', choices: ['かれは やさしいです', 'かれは 強いです', 'かれは おもしろいです', 'かれは 頭が いいです'], note: 'kind ＝ 親切な、やさしい。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"brave" の いみは？', choices: ['勇かんな', 'ていねいな', 'しずかな', 'ねむい'], note: 'brave ＝ 勇かん。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"He is a famous soccer player." の いみは？', choices: ['かれは 有名な サッカー選手です', 'かれは サッカーが 好きです', 'かれは サッカーの コーチです', 'かれは サッカーを 見て います'], note: 'famous ＝ 有名な。player ＝ 選手。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"She is funny." の いみは？', choices: ['かの女は おもしろいです', 'かの女は こわいです', 'かの女は やさしいです', 'かの女は 強いです'], note: 'funny ＝ おもしろい（わらえる）。' },
    { stage: 4, lv: 3, unit: 'ヒーロー', text: '"This is Ms. Sato. She is my teacher. She is good at singing." の いみとして 正しいのは？', choices: ['サトウ先生は 歌が 得意', 'サトウ先生は 歌が きらい', 'サトウ先生は 歌手', 'サトウ先生は 生徒'], note: 'Ms. ＝ 女性の 先生に つける。', boss: true },
    { stage: 4, lv: 3, unit: 'ヒーロー', text: '「かれは わたしの 兄で、野球が 得意です」を 英語で？', choices: ['He is my brother. He is good at baseball.', 'He is my father. He likes baseball.', 'She is my sister. She can play baseball.', 'He is a baseball player.'], note: 'brother ＝ 兄・弟。good at ＝ 得意。', boss: true },
    { stage: 4, lv: 3, unit: 'ヒーロー', text: '"Why is she your hero? — Because she always helps me." の いみは？', choices: ['いつも 助けて くれるから', 'いつも いっしょに いるから', '料理が 上手だから', 'お金持ちだから'], note: 'always ＝ いつも。help ＝ 助ける。' },
    { stage: 4, lv: 1, unit: 'ヒーロー', text: '"strong" の いみは？', choices: ['強い', '弱い', '速い', '高い'], note: 'strong ＝ 強い。' },
    { stage: 4, lv: 3, unit: 'ヒーロー', text: '"gentle" の いみは？', choices: ['おだやかな・やさしい', 'いそがしい', 'きびしい', 'つよい'], note: 'gentle ＝ おだやか。' },
    { stage: 4, lv: 2, unit: 'ヒーロー', text: '"He is active." の いみは？', choices: ['かれは 活発です', 'かれは しずかです', 'かれは 年上です', 'かれは 病気です'], note: 'active ＝ 活発な。' },
    { stage: 4, lv: 3, unit: '日本のしょうかい', text: '"We eat rice cakes on New Year\'s Day." の "rice cakes" は？', choices: ['もち', 'ケーキ', 'ごはん', 'せんべい'], note: 'rice cake ＝ もち。' },
    { stage: 4, lv: 1, unit: 'ヒーロー', text: '"cool" の いみ（人を ほめる とき）は？', choices: ['かっこいい', 'さむい', 'あつい', 'ねむい'], note: 'cool ＝ かっこいい（天気の ときは すずしい）。' }
  ]
};
