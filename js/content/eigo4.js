/* ---------------------------------------------------------
   小4 英語（外国語活動・Let's Try! 2 の 単元に合わせた）v4.7

   ステージ
     1 世界の あいさつと 天気（Hello, world! / Let's play cards.）   … 1学期
     2 曜日と 時こく（I like Mondays. / What time is it?）            … 1学期
     3 文ぼう具と アルファベット（Do you have a pen? / Alphabet）     … 2学期
     4 ほしい もの・学校・1日（What do you want? / my favorite place）… 3学期

   書き方は eigo3.js と 同じ（正解を choices の さきに 書く）。
   日本語の かん字は 小1〜小4 の 字だけ（smoke.js が 検査）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.eigo4 = {
  questions: [
    /* ===== 1 世界の あいさつと 天気 ===== */
    /* -- やさしい -- */
    { stage: 1, lv: 1, unit: 'あいさつ', text: '"Nice to meet you." の いみは？', choices: ['はじめまして', 'さようなら', 'ありがとう', 'おやすみ'], note: 'はじめて 会った 人に 言う あいさつです。' },
    { stage: 1, lv: 1, unit: '世界のあいさつ', text: '"Nǐ hǎo（ニーハオ）" は どの 国の あいさつ？', choices: ['中国', 'フランス', 'ドイツ', 'インド'], note: '中国語の「こんにちは」です。' },
    { stage: 1, lv: 1, unit: '世界のあいさつ', text: '"Bonjour（ボンジュール）" は どの 国の あいさつ？', choices: ['フランス', '中国', 'かんこく', 'アメリカ'], note: 'フランス語の「こんにちは」です。' },
    { stage: 1, lv: 1, unit: '世界のあいさつ', text: '"Hola（オラ）" は どの 国の あいさつ？', choices: ['スペイン', 'ドイツ', '中国', 'エジプト'], note: 'スペイン語の「やあ・こんにちは」です。' },
    { stage: 1, lv: 1, unit: '世界のあいさつ', text: '"Guten Tag（グーテン ターク）" は どの 国の あいさつ？', choices: ['ドイツ', 'イタリア', 'ブラジル', 'ロシア'], note: 'ドイツ語の「こんにちは」です。' },
    { stage: 1, lv: 1, unit: '天気', text: '"How\'s the weather?" の いみは？', choices: ['天気は どうですか', '何時ですか', '元気ですか', 'どこですか'], note: 'weather ＝ 天気。' },
    { stage: 1, lv: 1, unit: '天気', text: '"It\'s sunny." の いみは？', choices: ['晴れです', '雨です', '雪です', 'くもりです'], note: 'sunny ＝ 晴れ。sun（太陽）から できた ことばです。' },
    { stage: 1, lv: 1, unit: '天気', text: '"It\'s rainy." の いみは？', choices: ['雨です', '晴れです', '風が 強いです', 'あついです'], note: 'rain ＝ 雨。' },
    { stage: 1, lv: 1, unit: '天気', text: '"It\'s cloudy." の いみは？', choices: ['くもりです', '晴れです', '雪です', 'さむいです'], note: 'cloud ＝ 雲。' },
    { stage: 1, lv: 1, unit: '天気', text: '"It\'s snowy." の いみは？', choices: ['雪です', '雨です', 'くもりです', 'あついです'], note: 'snow ＝ 雪。' },
    { stage: 1, lv: 1, unit: 'あそび', text: '"Let\'s play cards." の いみは？', choices: ['トランプを しよう', 'ボールを なげよう', '歌を 歌おう', '本を 読もう'], note: 'Let\'s 〜. ＝ 〜しよう と さそう 言い方です。' },
    { stage: 1, lv: 1, unit: 'あいさつ', text: '"How are you?" の 答えで よいのは？', choices: ['I\'m fine, thank you.', 'It\'s Monday.', 'I\'m from Japan.', 'Good night.'], note: '「元気ですか」→「元気です、ありがとう」。' },

    /* -- ふつう -- */
    { stage: 1, lv: 2, unit: 'あいさつ', text: '"Nice to meet you." と 言われたら 何と 返す？', choices: ['Nice to meet you, too.', 'You\'re welcome.', 'See you.', 'I\'m sorry.'], note: 'too ＝ 〜も。「こちらこそ はじめまして」の いみに なります。' },
    { stage: 1, lv: 2, unit: '天気', text: '"It\'s hot." の いみは？', choices: ['あついです', 'さむいです', 'すずしいです', 'あたたかいです'], note: 'hot ＝ あつい。反対は cold（さむい）。' },
    { stage: 1, lv: 2, unit: '天気', text: '"It\'s cold." の いみは？', choices: ['さむいです', 'あついです', '晴れです', '雨です'], note: 'cold ＝ さむい・つめたい。' },
    { stage: 1, lv: 2, unit: '天気', text: '"It\'s windy." の いみは？', choices: ['風が 強いです', '雨です', 'くもりです', '雪です'], note: 'wind ＝ 風。' },
    { stage: 1, lv: 2, unit: 'あそび', text: '"Let\'s play soccer." の いみは？', choices: ['サッカーを しよう', '野球を しよう', 'およごう', '走ろう'], note: 'play の あとに スポーツの 名前を つけます。' },
    { stage: 1, lv: 2, unit: 'あそび', text: '"Let\'s play tag." の いみは？', choices: ['おにごっこを しよう', 'トランプを しよう', 'なわとびを しよう', 'かくれんぼを しよう'], note: 'tag ＝ おにごっこ。' },
    { stage: 1, lv: 2, unit: 'あそび', text: '"Yes, let\'s." の いみは？', choices: ['うん、しよう', 'いいえ、しません', 'ありがとう', 'ごめんなさい'], note: 'さそいに「さんせい」と 答える 言い方です。' },
    { stage: 1, lv: 2, unit: 'あそび', text: 'さそいを ことわる ときの 言い方は？', choices: ['Sorry.', 'Yes, let\'s.', 'Thank you.', 'Here you are.'], note: '"Sorry. I\'m busy."（ごめん、いそがしい）のように 言います。' },
    { stage: 1, lv: 2, unit: '天気', text: '"How\'s the weather in Tokyo?" の いみは？', choices: ['東京の 天気は どうですか', '東京は どこですか', '東京へ 行きますか', '東京は 何時ですか'], note: 'in 〜 ＝ 〜では。' },
    { stage: 1, lv: 2, unit: '天気', text: '天気を 聞かれて 晴れの ときの 答えは？', choices: ['It\'s sunny.', 'It\'s rainy.', 'It\'s snowy.', 'It\'s cloudy.'], note: '天気は "It\'s 〜." で 答えます。' },
    { stage: 1, lv: 2, unit: 'あそび', text: '"Let\'s play the recorder." の いみは？', choices: ['リコーダーを ふこう', 'ピアノを ひこう', '歌を 歌おう', 'たいこを たたこう'], note: '楽きは play the 〜 と 言います。' },
    { stage: 1, lv: 2, unit: '世界のあいさつ', text: '国に よって あいさつの しかたが ちがう。手を ふる ほかに あるのは？', choices: ['おじぎ・あくしゅ・ほおを 合わせる', 'すわる こと', '走る こと', '目を つぶる こと'], note: '国や 地いきに よって、あいさつの しかたは いろいろです。' },
    { stage: 1, lv: 2, unit: 'あいさつ', text: '"I\'m from Japan." の いみは？', choices: ['わたしは 日本から 来ました', 'わたしは 日本へ 行きます', '日本は 遠いです', '日本が 好きです'], note: 'from 〜 ＝ 〜から。じこしょうかいで つかいます。' },
    { stage: 1, lv: 2, unit: 'あいさつ', text: '"Good morning." と 言う 時間は？', choices: ['朝', '昼すぎ', '夕方', '夜'], note: '昼は Good afternoon.、夕方からは Good evening. です。' },

    /* -- むずかしい（ボスにも 出る） -- */
    { stage: 1, lv: 3, unit: 'あいさつ', text: '「わたしは こうたです。はじめまして。」を 英語で 言うと？', choices: ['I\'m Kota. Nice to meet you.', 'I like Kota. See you.', 'This is Kota. Thank you.', 'Kota is fine. Good night.'], note: '名前を 言ってから あいさつを つけます。', boss: true },
    { stage: 1, lv: 3, unit: '天気', text: '"How\'s the weather?" と 聞かれて 雪の 日の 答えは？', choices: ['It\'s snowy.', 'It\'s sunny.', 'It\'s windy.', 'It\'s hot.'], note: 'snow に y を つけて snowy（雪の）に なります。', boss: true },
    { stage: 1, lv: 3, unit: 'あそび', text: '「バスケットボールを しよう」を 英語で 言うと？', choices: ['Let\'s play basketball.', 'I like basketball.', 'Do you have basketball?', 'Basketball is fun.'], note: 'さそう ときは Let\'s play 〜. です。' },
    { stage: 1, lv: 3, unit: '天気', text: '"It\'s rainy." の 日の あそびで よいのは？', choices: ['家の 中で できる あそび', 'サッカー', 'なわとび', 'プールあそび'], note: '天気に 合わせて あそびを えらびます。' },
    { stage: 1, lv: 3, unit: '世界のあいさつ', text: '世界の あいさつを しらべて 分かる ことは？', choices: ['国に よって ことばも しかたも ちがう', 'どの 国も 同じ ことばを つかう', 'あいさつは 日本だけの もの', 'あいさつは 手を ふるだけ'], note: 'ちがいを 知る ことが、なかよく なる 第一歩です。' },
    { stage: 1, lv: 3, unit: 'あそび', text: '"Let\'s play cards." に「うん、しよう」と 答えるのは？', choices: ['Yes, let\'s.', 'No, thank you.', 'You\'re welcome.', 'See you later.'], note: 'ことわる ときは "Sorry." と 言います。' },
    { stage: 1, lv: 3, unit: '天気', text: '天気の ことばで 正しい 組み合わせは？', choices: ['sunny＝晴れ／rainy＝雨', 'sunny＝雨／rainy＝晴れ', 'cloudy＝雪／snowy＝くもり', 'hot＝さむい／cold＝あつい'], note: 'sun→sunny、rain→rainy、cloud→cloudy、snow→snowy。' },
    { stage: 1, lv: 3, unit: 'あいさつ', text: 'あいさつを する ときに 大切な ことは？', choices: ['相手の 目を 見て 笑顔で 言う', '小さな 声で 言う', '下を 向いて 言う', '早口で 言う'], note: 'つたえる 気持ちが いちばん 大切です。' },
    { stage: 1, lv: 3, unit: '天気', text: '"It\'s cloudy and cold." の いみは？', choices: ['くもりで さむいです', '晴れて あついです', '雨で あたたかいです', '雪で 風が 強いです'], note: 'and ＝ そして。2つの ことを つなげて 言えます。' },

    /* ===== 2 曜日と 時こく ===== */
    /* -- やさしい -- */
    { stage: 2, lv: 1, unit: '曜日', text: '"Monday" は 何曜日？', choices: ['月曜日', '火曜日', '水曜日', '日曜日'], note: 'Monday の Mon は「月」に あたります。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Tuesday" は 何曜日？', choices: ['火曜日', '木曜日', '土曜日', '月曜日'], note: '曜日は かならず 大文字で 書きはじめます。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Wednesday" は 何曜日？', choices: ['水曜日', '金曜日', '日曜日', '火曜日'], note: '読み方は「ウェンズデイ」。d を 読まないので 気を つけます。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Thursday" は 何曜日？', choices: ['木曜日', '火曜日', '土曜日', '水曜日'], note: 'Tuesday と まちがえやすいので 気を つけます。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Friday" は 何曜日？', choices: ['金曜日', '木曜日', '水曜日', '土曜日'], note: '一週間の 学校の さいごの 日です。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Saturday" は 何曜日？', choices: ['土曜日', '日曜日', '金曜日', '月曜日'], note: 'Sat で はじまります。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"Sunday" は 何曜日？', choices: ['日曜日', '土曜日', '月曜日', '木曜日'], note: 'sun（太陽）が 入って います。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"What day is it?" の いみは？', choices: ['何曜日ですか', '何時ですか', '何が ほしいですか', 'どこですか'], note: '答えは "It\'s Monday." のように 言います。' },
    { stage: 2, lv: 1, unit: '時こく', text: '"What time is it?" の いみは？', choices: ['何時ですか', '何曜日ですか', 'いくつですか', 'だれですか'], note: 'time ＝ 時こく・時間。' },
    { stage: 2, lv: 1, unit: '時こく', text: '"It\'s 7 a.m." は 何時？', choices: ['午前7時', '午後7時', '午前11時', '午後11時'], note: 'a.m. ＝ 午前。' },
    { stage: 2, lv: 1, unit: '時こく', text: '"It\'s 3 p.m." は 何時？', choices: ['午後3時', '午前3時', '午後8時', '午前8時'], note: 'p.m. ＝ 午後。' },
    { stage: 2, lv: 1, unit: '曜日', text: '"I like Mondays." の いみは？', choices: ['月曜日が 好きです', '月曜日は いそがしいです', '月曜日は 休みです', '月曜日に 会いましょう'], note: '曜日に s を つけると「毎週の その 曜日」の いみに なります。' },

    /* -- ふつう -- */
    { stage: 2, lv: 2, unit: '曜日', text: '英語の カレンダーで 一週間の さいしょの 曜日は？', choices: ['Sunday', 'Monday', 'Saturday', 'Friday'], note: '英語の カレンダーは 日曜日から はじまる ものが 多いです。' },
    { stage: 2, lv: 2, unit: '時こく', text: '"It\'s eight thirty." は 何時何分？', choices: ['8時30分', '8時13分', '3時8分', '30時8分'], note: '時→分の じゅんに 読みます。' },
    { stage: 2, lv: 2, unit: '1日の生活', text: '"Bedtime." の いみは？', choices: ['ねる 時間', '起きる 時間', 'おやつの 時間', 'あそぶ 時間'], note: 'bed（ベッド）＋ time（時間）。' },
    { stage: 2, lv: 2, unit: '1日の生活', text: '"Snack time." の いみは？', choices: ['おやつの 時間', '朝ごはんの 時間', 'そうじの 時間', 'べんきょうの 時間'], note: 'snack ＝ かるい 食べ物・おやつ。' },
    { stage: 2, lv: 2, unit: '1日の生活', text: '"Homework time." の いみは？', choices: ['しゅくだいの 時間', 'あそびの 時間', 'ねる 時間', '食べる 時間'], note: 'homework ＝ しゅくだい。' },
    { stage: 2, lv: 2, unit: '1日の生活', text: '"It\'s time for lunch." の いみは？', choices: ['昼ごはんの 時間です', '朝ごはんの 時間です', 'ねる 時間です', '帰る 時間です'], note: 'time for 〜 ＝ 〜の 時間。' },
    { stage: 2, lv: 2, unit: '曜日', text: '"Wednesday" の つぎの 日は？', choices: ['Thursday', 'Tuesday', 'Friday', 'Monday'], note: '水曜日の つぎは 木曜日です。' },
    { stage: 2, lv: 2, unit: '曜日', text: '"Friday" の 前の 日は？', choices: ['Thursday', 'Saturday', 'Wednesday', 'Sunday'], note: '金曜日の 前は 木曜日です。' },
    { stage: 2, lv: 2, unit: '時こく', text: '"a.m." の いみは？', choices: ['午前', '午後', '夜中', '正午'], note: '朝や 昼前は a.m. を つかいます。' },
    { stage: 2, lv: 2, unit: '時こく', text: '"p.m." の いみは？', choices: ['午後', '午前', '朝', '毎日'], note: '昼すぎから 夜までは p.m. です。' },
    { stage: 2, lv: 2, unit: '曜日', text: '"I don\'t like Mondays." の いみは？', choices: ['月曜日は 好きでは ありません', '月曜日が 大好きです', '月曜日は 休みです', '月曜日を 知りません'], note: 'don\'t ＝ 〜しない。' },
    { stage: 2, lv: 2, unit: '時こく', text: '"It\'s 12 p.m." は いつ？', choices: ['昼の 12時', '夜中の 12時', '朝の 6時', '夕方の 5時'], note: '夜中の 12時は 12 a.m. です。' },
    { stage: 2, lv: 2, unit: '1日の生活', text: '"What time do you get up?" の いみは？', choices: ['何時に 起きますか', '何時に ねますか', '何時に 帰りますか', '何時に ごはんを 食べますか'], note: 'get up ＝ 起きる。' },

    /* -- むずかしい（ボスにも 出る） -- */
    { stage: 2, lv: 3, unit: '曜日', text: '今日が 木曜日の とき、"What day is it today?" の 答えは？', choices: ['It\'s Thursday.', 'It\'s Tuesday.', 'It\'s Sunday.', 'It\'s Friday.'], note: '木曜日は Thursday です。', boss: true },
    { stage: 2, lv: 3, unit: '時こく', text: '"It\'s 6 p.m." は どんな 時こく？', choices: ['夕方の 6時', '朝の 6時', '昼の 6時', '夜中の 6時'], note: 'p.m. なので 午後6時＝夕方です。', boss: true },
    { stage: 2, lv: 3, unit: '曜日', text: '曜日を 英語で 書く ときの きまりは？', choices: ['はじめの 文字を 大文字に する', 'ぜんぶ 小文字で 書く', 'ぜんぶ 大文字で 書く', 'さいごを 大文字に する'], note: '曜日・月・国・人の 名前は 大文字で 書きはじめます。' },
    { stage: 2, lv: 3, unit: '曜日', text: '「土曜日と 日曜日が 好きです」を 英語で 言うと？', choices: ['I like Saturdays and Sundays.', 'I like Monday and Friday.', 'I don\'t like Saturdays.', 'It\'s Saturday and Sunday.'], note: 'and で 2つを つなぎます。' },
    { stage: 2, lv: 3, unit: '時こく', text: '時こくを たずねる 言い方は？', choices: ['What time is it?', 'What day is it?', 'How are you?', 'What do you want?'], note: 'day を つかうと 曜日を 聞く 言い方に なります。' },
    { stage: 2, lv: 3, unit: '1日の生活', text: '「7時に 起きます」を 英語で 言うと？', choices: ['I get up at seven.', 'I go to bed at seven.', 'It\'s seven.', 'I like seven.'], note: 'at 〜 ＝ 〜時に。' },
    { stage: 2, lv: 3, unit: '1日の生活', text: '"Wake-up time." の いみは？', choices: ['起きる 時間', 'ねる 時間', '食べる 時間', '帰る 時間'], note: 'wake up ＝ 目を さます。' },
    { stage: 2, lv: 3, unit: '曜日', text: '英語の 曜日の ことばに 共通するのは？', choices: ['さいごが day で おわる', 'さいごが y で はじまる', 'ぜんぶ 3文字', 'ぜんぶ s で はじまる'], note: 'Monday・Tuesday …と、どれも day が つきます。' },
    { stage: 2, lv: 3, unit: '時こく', text: '"It\'s nine o\'clock." の いみは？', choices: ['9時ちょうどです', '9時30分です', '9分です', '9日です'], note: 'o\'clock ＝ 〜時ちょうど。' },

    /* ===== 3 文ぼう具と アルファベット ===== */
    /* -- やさしい -- */
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"pencil" の いみは？', choices: ['えんぴつ', 'ペン', '消しゴム', 'ノート'], note: 'えんぴつは pencil、ペンは pen です。' },
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"eraser" の いみは？', choices: ['消しゴム', 'じょうぎ', 'はさみ', 'のり'], note: 'erase ＝ 消す。' },
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"ruler" の いみは？', choices: ['じょうぎ', '消しゴム', 'ノート', 'クレヨン'], note: '長さを はかる 道具です。' },
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"notebook" の いみは？', choices: ['ノート', '本', 'ふでばこ', 'かばん'], note: 'note（書きとめる）＋ book（本）。' },
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"scissors" の いみは？', choices: ['はさみ', 'のり', 'えんぴつ', 'じょうぎ'], note: '2つの ぶぶんが 組に なって いるので、いつも s が つきます。' },
    { stage: 3, lv: 1, unit: '文ぼう具', text: '"glue stick" の いみは？', choices: ['スティックのり', 'はさみ', 'クレヨン', 'マーカー'], note: 'glue ＝ のり。' },
    { stage: 3, lv: 1, unit: 'たずねる', text: '"Do you have a pen?" の いみは？', choices: ['ペンを もって いますか', 'ペンが 好きですか', 'ペンは どこですか', 'ペンを ください'], note: 'have ＝ もって いる。' },
    { stage: 3, lv: 1, unit: 'たずねる', text: '"Yes, I do." の いみは？', choices: ['はい、もって います', 'いいえ、もって いません', 'ありがとう', 'どうぞ'], note: '"Do you 〜?" には Yes, I do. / No, I don\'t. で 答えます。' },
    { stage: 3, lv: 1, unit: 'たずねる', text: '"No, I don\'t." の いみは？', choices: ['いいえ、もって いません', 'はい、もって います', 'わかりません', 'また あとで'], note: 'don\'t ＝ do not（〜しない）。' },
    { stage: 3, lv: 1, unit: 'アルファベット', text: 'アルファベットは ぜんぶで 何文字？', choices: ['26文字', '24文字', '30文字', '20文字'], note: 'A から Z まで 26文字です。' },
    { stage: 3, lv: 1, unit: 'アルファベット', text: '大文字 "A" の 小文字は？', choices: ['a', 'e', 'o', 'u'], note: '大文字と 小文字で 形が ちがう 文字も あります。' },
    { stage: 3, lv: 1, unit: 'アルファベット', text: 'アルファベットの さいごの 文字は？', choices: ['Z', 'Y', 'X', 'W'], note: 'A で はじまり Z で おわります。' },

    /* -- ふつう -- */
    { stage: 3, lv: 2, unit: '文ぼう具', text: '"crayon" の いみは？', choices: ['クレヨン', 'えんぴつ', 'マーカー', '絵の具'], note: '色を ぬる 道具です。' },
    { stage: 3, lv: 2, unit: '文ぼう具', text: '"stapler" の いみは？', choices: ['ホッチキス', 'はさみ', 'のり', 'じょうぎ'], note: '紙を とじる 道具です。' },
    { stage: 3, lv: 2, unit: '文ぼう具', text: '"magnet" の いみは？', choices: ['じしゃく', '虫めがね', 'えんぴつけずり', 'ふでばこ'], note: '理科でも つかう ことばです。' },
    { stage: 3, lv: 2, unit: '文ぼう具', text: '"marker" の いみは？', choices: ['太い ペン（マーカー）', '消しゴム', 'ノート', 'はさみ'], note: 'しるしを つける ための ペンです。' },
    { stage: 3, lv: 2, unit: 'たずねる', text: '"How many pencils?" の いみは？', choices: ['えんぴつは 何本ですか', 'えんぴつは どこですか', 'えんぴつが 好きですか', 'えんぴつを ください'], note: 'How many 〜? ＝ いくつの 〜。' },
    { stage: 3, lv: 2, unit: 'アルファベット', text: '大文字 "B" の 小文字は？', choices: ['b', 'd', 'p', 'q'], note: 'b・d・p・q は 形が にて いるので 気を つけます。' },
    { stage: 3, lv: 2, unit: 'アルファベット', text: '小文字 "d" の 大文字は？', choices: ['D', 'B', 'P', 'Q'], note: '小文字の d は、まるが 左・ぼうが 右です。' },
    { stage: 3, lv: 2, unit: 'アルファベット', text: '小文字 "q" の 大文字は？', choices: ['Q', 'P', 'G', 'O'], note: 'q は 下に しっぽが のびます。' },
    { stage: 3, lv: 2, unit: '文ぼう具', text: '"This is my pencil case." の いみは？', choices: ['これは わたしの ふでばこです', 'これは わたしの ノートです', 'ふでばこは どこですか', 'ふでばこが ほしいです'], note: 'pencil case ＝ ふでばこ。' },
    { stage: 3, lv: 2, unit: 'アルファベット', text: 'アルファベットの 5ばんめの 文字は？', choices: ['E', 'D', 'F', 'C'], note: 'A B C D E の じゅんです。' },
    { stage: 3, lv: 2, unit: 'アルファベット', text: 'まちの 中で 見つかる アルファベットの れいは？', choices: ['ちゅう車場の「P」', '道の 白い 線', '車の 色', '木の 形'], note: 'P は parking（ちゅう車場）の あたまの 文字です。' },
    { stage: 3, lv: 2, unit: 'やりとり', text: '"Here you are." の いみは？', choices: ['はい、どうぞ', 'ありがとう', 'すみません', 'また あとで'], note: '物を わたす ときの 言い方です。' },
    { stage: 3, lv: 2, unit: 'やりとり', text: '"Thank you." に 返す ことばは？', choices: ['You\'re welcome.', 'Nice to meet you.', 'Here you are.', 'See you.'], note: '「どういたしまして」の いみです。' },

    /* -- むずかしい（ボスにも 出る） -- */
    { stage: 3, lv: 3, unit: 'たずねる', text: '"Do you have a ruler?" に「はい」で 答えるのは？', choices: ['Yes, I do.', 'Yes, I am.', 'Yes, it is.', 'Yes, please.'], note: 'Do you 〜? には do を つかって 答えます。', boss: true },
    { stage: 3, lv: 3, unit: 'アルファベット', text: '大文字と 小文字で 形が 大きく ちがう 組み合わせは？', choices: ['A と a', 'C と c', 'O と o', 'S と s'], note: 'C・O・S などは 大きさが ちがうだけで 形は 同じです。', boss: true },
    { stage: 3, lv: 3, unit: 'たずねる', text: '「はさみを もって いますか」を 英語で 言うと？', choices: ['Do you have scissors?', 'I have scissors.', 'Where are scissors?', 'This is scissors.'], note: 'たずねる ときは Do you 〜? で はじめます。' },
    { stage: 3, lv: 3, unit: 'アルファベット', text: '名前を 英語で 書く ときの きまりは？', choices: ['はじめの 文字を 大文字に する', 'ぜんぶ 小文字で 書く', 'さいごを 大文字に する', 'ぜんぶ 大文字で 書く'], note: '人の 名前・国の 名前は 大文字で 書きはじめます。' },
    { stage: 3, lv: 3, unit: 'アルファベット', text: 'アルファベットの じゅんで "M" の つぎは？', choices: ['N', 'L', 'O', 'K'], note: 'K L M N O の じゅんです。' },
    { stage: 3, lv: 3, unit: 'アルファベット', text: 'アルファベットの じゅんで "T" の 前は？', choices: ['S', 'U', 'R', 'V'], note: 'R S T U V の じゅんです。' },
    { stage: 3, lv: 3, unit: '文ぼう具', text: '"I have two erasers." の いみは？', choices: ['消しゴムを 2つ もって います', '消しゴムが 2つ ほしいです', '消しゴムを 2つ ください', '消しゴムは 2つ ありません'], note: '2つ いじょうの ときは 名前の さいごに s を つけます。' },
    { stage: 3, lv: 3, unit: 'アルファベット', text: '小文字の "l"（エル）と まちがえやすい 大文字は？', choices: ['I（アイ）', 'T（ティー）', 'J（ジェイ）', 'F（エフ）'], note: 'まっすぐな ぼうの 形が よく にて います。' },
    { stage: 3, lv: 3, unit: 'やりとり', text: 'ものを かりる ときの 言い方で よいのは？', choices: ['Do you have a pencil?', 'I like a pencil.', 'This is a pencil.', 'It\'s a pencil.'], note: 'まず もって いるか たずねてから おねがいします。' },

    /* ===== 4 ほしい もの・学校・1日 ===== */
    /* -- やさしい -- */
    { stage: 4, lv: 1, unit: 'ほしいもの', text: '"What do you want?" の いみは？', choices: ['何が ほしいですか', '何が 好きですか', '何を 食べますか', 'どこへ 行きますか'], note: 'want ＝ ほしい。' },
    { stage: 4, lv: 1, unit: 'ほしいもの', text: '"I want a carrot." の いみは？', choices: ['にんじんが ほしいです', 'にんじんが 好きです', 'にんじんが あります', 'にんじんを 食べました'], note: 'carrot ＝ にんじん。' },
    { stage: 4, lv: 1, unit: '野さいとくだもの', text: '"tomato" の いみは？', choices: ['トマト', 'じゃがいも', 'たまねぎ', 'きゅうり'], note: '野さいの 名前です。' },
    { stage: 4, lv: 1, unit: '野さいとくだもの', text: '"potato" の いみは？', choices: ['じゃがいも', 'トマト', 'とうもろこし', 'りんご'], note: 'potato ＝ じゃがいも。tomato と にて います。' },
    { stage: 4, lv: 1, unit: '野さいとくだもの', text: '"onion" の いみは？', choices: ['たまねぎ', 'にんじん', 'ピーマン', 'さくらんぼ'], note: 'onion ＝ たまねぎ。' },
    { stage: 4, lv: 1, unit: '野さいとくだもの', text: '"apple" の いみは？', choices: ['りんご', 'みかん', 'ぶどう', 'いちご'], note: 'くだものの 名前です。' },
    { stage: 4, lv: 1, unit: '学校の中', text: '"music room" の いみは？', choices: ['音楽室', '理科室', '図書室', '教室'], note: 'music ＝ 音楽、room ＝ へや。' },
    { stage: 4, lv: 1, unit: '学校の中', text: '"library" の いみは？', choices: ['図書室', '体育館', '校庭', '音楽室'], note: '本を 読む ところです。' },
    { stage: 4, lv: 1, unit: '学校の中', text: '"science room" の いみは？', choices: ['理科室', '図書室', '音楽室', '教室'], note: 'science ＝ 理科・科学。' },
    { stage: 4, lv: 1, unit: '学校の中', text: '"This is my favorite place." の いみは？', choices: ['ここが わたしの お気に入りの 場所です', 'ここは 学校です', 'ここへ 行きましょう', 'ここは 遠いです'], note: 'favorite ＝ お気に入りの。' },
    { stage: 4, lv: 1, unit: '1日の生活', text: '"I get up at six." の いみは？', choices: ['6時に 起きます', '6時に ねます', '6時に 帰ります', '6時に 食べます'], note: 'get up ＝ 起きる。' },
    { stage: 4, lv: 1, unit: '1日の生活', text: '"I go to school." の いみは？', choices: ['学校へ 行きます', '学校から 帰ります', '学校が 好きです', '学校に います'], note: 'go to 〜 ＝ 〜へ 行く。' },

    /* -- ふつう -- */
    { stage: 4, lv: 2, unit: '野さいとくだもの', text: '"green pepper" の いみは？', choices: ['ピーマン', 'きゅうり', 'ほうれんそう', 'えだ豆'], note: 'green（緑の）＋ pepper。' },
    { stage: 4, lv: 2, unit: '野さいとくだもの', text: '"cucumber" の いみは？', choices: ['きゅうり', 'なす', 'かぼちゃ', 'だいこん'], note: '細長い 緑の 野さいです。' },
    { stage: 4, lv: 2, unit: '野さいとくだもの', text: '"corn" の いみは？', choices: ['とうもろこし', 'たまねぎ', 'にんじん', 'いちご'], note: '黄色い つぶが ならんだ 野さいです。' },
    { stage: 4, lv: 2, unit: '野さいとくだもの', text: '"cherry" の いみは？', choices: ['さくらんぼ', 'ぶどう', 'もも', 'なし'], note: '小さくて 赤い くだものです。' },
    { stage: 4, lv: 2, unit: '学校の中', text: '"computer room" の いみは？', choices: ['コンピューター室', 'しょくいん室', '教室', '体育館'], note: 'room が つく ことばを おぼえましょう。' },
    { stage: 4, lv: 2, unit: '学校の中', text: '"playground" の いみは？', choices: ['校庭', '教室', '図書室', 'ろうか'], note: 'play（あそぶ）＋ ground（地面）。' },
    { stage: 4, lv: 2, unit: '道あんない', text: '"Go straight." の いみは？', choices: ['まっすぐ 行って', '右に まがって', '左に まがって', '止まって'], note: 'straight ＝ まっすぐ。' },
    { stage: 4, lv: 2, unit: '道あんない', text: '"Turn right." の いみは？', choices: ['右に まがって', '左に まがって', 'まっすぐ 行って', 'もどって'], note: 'turn ＝ まがる。' },
    { stage: 4, lv: 2, unit: '道あんない', text: '"Turn left." の いみは？', choices: ['左に まがって', '右に まがって', 'まっすぐ 行って', '走って'], note: 'left ＝ 左、right ＝ 右。' },
    { stage: 4, lv: 2, unit: '1日の生活', text: '"I wash my face." の いみは？', choices: ['顔を あらいます', '手を あらいます', '歯を みがきます', 'かみを とかします'], note: 'wash ＝ あらう、face ＝ 顔。' },
    { stage: 4, lv: 2, unit: '1日の生活', text: '"I eat breakfast." の いみは？', choices: ['朝ごはんを 食べます', '昼ごはんを 食べます', '夕ごはんを 食べます', 'おやつを 食べます'], note: 'breakfast ＝ 朝ごはん。' },
    { stage: 4, lv: 2, unit: '1日の生活', text: '"I do my homework." の いみは？', choices: ['しゅくだいを します', 'そうじを します', '本を 読みます', 'ねます'], note: 'homework ＝ しゅくだい。' },
    { stage: 4, lv: 2, unit: '1日の生活', text: '"I go to bed." の いみは？', choices: ['ねます', '起きます', '出かけます', '帰ります'], note: 'go to bed ＝ ねる。' },

    /* -- むずかしい（ボスにも 出る） -- */
    { stage: 4, lv: 3, unit: 'ほしいもの', text: '"What do you want?" に「トマトが ほしい」と 答えるのは？', choices: ['I want a tomato.', 'I like a tomato.', 'This is a tomato.', 'Do you have a tomato?'], note: 'want を つかって 答えます。', boss: true },
    { stage: 4, lv: 3, unit: '学校の中', text: '「わたしの お気に入りの 場所は 図書室です」を 英語で 言うと？', choices: ['My favorite place is the library.', 'I like the library, too.', 'This is a library.', 'Where is the library?'], note: 'favorite place ＝ お気に入りの 場所。', boss: true },
    { stage: 4, lv: 3, unit: '道あんない', text: '「まっすぐ 行って 右に まがって」を 英語で 言うと？', choices: ['Go straight. Turn right.', 'Turn left. Go straight.', 'Stop here. Turn left.', 'Go straight. Turn left.'], note: '道あんないは みじかい 文を つなげて 言います。' },
    { stage: 4, lv: 3, unit: '1日の生活', text: '1日の じゅんばんで 正しいのは？', choices: ['get up → eat breakfast → go to school → go to bed', 'go to bed → get up → go to school → eat breakfast', 'eat breakfast → get up → go to bed → go to school', 'go to school → get up → go to bed → eat breakfast'], note: '起きる → 朝ごはん → 学校 → ねる の じゅんです。' },
    { stage: 4, lv: 3, unit: '1日の生活', text: '"I brush my teeth." の いみは？', choices: ['歯を みがきます', '顔を あらいます', 'かみを あらいます', '手を ふきます'], note: 'brush ＝ みがく、teeth ＝ 歯。' },
    { stage: 4, lv: 3, unit: 'ほしいもの', text: '"How many apples do you want?" の いみは？', choices: ['りんごは いくつ ほしいですか', 'りんごは 好きですか', 'りんごは どこですか', 'りんごを ください'], note: 'How many 〜 ＝ いくつの 〜。' },
    { stage: 4, lv: 3, unit: '学校の中', text: '"I like the music room. I can sing songs." — 音楽室が 好きな わけは？', choices: ['歌が 歌えるから', '本が 読めるから', '走れるから', '絵が かけるから'], note: 'sing songs ＝ 歌を 歌う。' },
    { stage: 4, lv: 3, unit: 'やりとり', text: 'ほしい ものを もらって "Here you are." と 言われたら？', choices: ['Thank you.', 'You\'re welcome.', 'Nice to meet you.', 'Good night.'], note: 'もらったら お礼を 言い、相手は "You\'re welcome." と 返します。' },
    { stage: 4, lv: 3, unit: '1日の生活', text: '「6時に 起きて 7時に 朝ごはんを 食べます」で 先に するのは？', choices: ['起きる こと', '朝ごはんを 食べる こと', 'どちらも 同じ', '学校へ 行く こと'], note: '時こくを くらべると じゅんばんが 分かります。' }
  ]
};
