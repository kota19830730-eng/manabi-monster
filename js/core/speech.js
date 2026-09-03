/* ---------------------------------------------------------
   よみあげ（v5.3）

   タブレットに さいしょから 入って いる 声（Web Speech API）で
   英語の 文と、小1の 問題文を 読む。**音声ファイルは 使わない・
   通信も しない**（企画書の「データの 外部送信 なし」を まもる）。

   きまり：
     ・声が ない 端末では **ボタンを 出さない**（`ready(lang)` が false）
     ・おそめに 読む（子ども向け。英語 0.8・日本語 0.9）
     ・つぎを 読む ときは 前の を 止める（かさならない）
     ・おうちの人ページの せっていで まるごと 切れる

   この ファイルは DOM を 知らない（画面は js/ui/ が 作る）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.speech = (function () {

  const RATE = { en: 0.8, ja: 0.9 };     // 子ども向けに おそめ
  const PITCH = 1.05;
  let list = [];                          // 端末に 入って いる 声
  let warmed = false;

  function api() {
    return (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
  }

  /* 端末の 声を おぼえる。iPad は 少し あとから そろう ので
     voiceschanged でも もう一度 とる */
  function refresh() {
    const s = api();
    if (!s || !s.getVoices) { list = []; return list; }
    try { list = s.getVoices() || []; } catch (e) { list = []; }
    return list;
  }
  function voices() { return (list && list.length) ? list : refresh(); }

  function init() {
    const s = api();
    if (!s || warmed) return;
    warmed = true;
    refresh();
    if (typeof s.addEventListener === 'function') {
      s.addEventListener('voiceschanged', refresh);
    } else {
      s.onvoiceschanged = refresh;
    }
  }

  /* その ことばの 声が ある か（en / ja） */
  function voiceFor(lang) {
    const want = lang === 'ja' ? 'ja' : 'en';
    const all = voices();
    let best = null;
    for (let i = 0; i < all.length; i++) {
      const v = all[i];
      const code = String(v.lang || '').toLowerCase().replace('_', '-');
      if (code.indexOf(want) !== 0) continue;
      // en は アメリカの 声を えらびたい（学校で ならう 音に 近い）
      if (want === 'en' && code.indexOf('en-us') === 0) return v;
      if (want === 'ja' && code.indexOf('ja-jp') === 0) return v;
      if (!best) best = v;
    }
    return best;
  }

  /* 読める か（声が ない 端末では ボタンを 出さない） */
  function ready(lang) {
    if (!api()) return false;
    init();
    return !!voiceFor(lang || 'en');
  }

  function stop() {
    const s = api();
    if (!s) return;
    try { s.cancel(); } catch (e) {}
  }

  /* 読む。かえり値は 読みはじめた か どうか */
  function speak(text, lang, opts) {
    const s = api();
    const t = String(text == null ? '' : text).trim();
    if (!s || !t) return false;
    init();
    const want = lang === 'ja' ? 'ja' : 'en';
    const v = voiceFor(want);
    if (!v) return false;
    stop();                                  // かさねて 読まない
    let u;
    try { u = new window.SpeechSynthesisUtterance(t); } catch (e) { return false; }
    u.voice = v;
    u.lang = v.lang || (want === 'ja' ? 'ja-JP' : 'en-US');
    u.rate = (opts && opts.rate) || RATE[want];
    u.pitch = (opts && opts.pitch) || PITCH;
    u.volume = 1;
    if (opts && typeof opts.onend === 'function') u.onend = opts.onend;
    try { s.speak(u); } catch (e) { return false; }
    return true;
  }

  /* ---------------------------------------------------------
     問題から「読む ところ」を とり出す

     ・英語の ステージ … 問題文の "…" の 中の 英語（"Good morning." など）
     ・小1 … 問題文 ぜんぶ（ひらがな）を 日本語で
     ほかの 学年・教科は 読まない（読み上げても 答えが わかるだけ）
     --------------------------------------------------------- */

  // HTML の しるしを とる（問題文は HTML の ことが ある）
  function plain(html) {
    let s = String(html == null ? '' : html);
    s = s.replace(/<br\s*\/?>/gi, ' ');
    s = s.replace(/<[^>]*>/g, '');
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    return s.replace(/\s+/g, ' ').trim();
  }

  // 英語らしい か（ABC が 2文字 いじょう つづく）
  function hasLatin(s) { return /[A-Za-z]{2}/.test(String(s || '')); }

  /* かん字が 入って いる か。
     小1の 問題文は ひらがなが きまり（CLAUDE.md）。かん字が 出て くるのは
     「『山』の よみかたは？」の ような **かん字を 答える 問題**だけ。
     これを 読み上げると 声が「やま」と 言って **答えを 教えて しまう** ので 読まない。 */
  function hasKanji(s) { return /[\u4E00-\u9FFF\u3005]/.test(String(s || '')); }

  /* "…" の 中の 英語を 集めて つなげる。
     なければ 文の 中の 英語らしい ところ を さがす */
  function englishIn(text) {
    const s = plain(text);
    const out = [];
    const re = /"([^"]+)"/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      const inner = m[1].trim();
      // 「ニーハオ」の ような カタカナの ふりがなは 読まない
      if (hasLatin(inner)) out.push(inner);
    }
    if (out.length) return out.join(', ');
    // かぎかっこが ない ときは、英語の かたまりを ひろう
    const words = s.match(/[A-Za-z][A-Za-z'’.\-]*(?:\s+[A-Za-z][A-Za-z'’.\-]*)*/g);
    if (!words) return '';
    const long = words.filter(function (w) { return hasLatin(w); })
      .sort(function (a, b) { return b.length - a.length; })[0];
    return long && long.length >= 2 ? long.trim() : '';
  }

  /* この 問題で 読む もの。{ text, lang, label } か null。
     ここは 「何を 読むか」だけを 決める。**読める か どうか（声が あるか・
     せっていが 入って いるか）は 画面がわ（MQ.ui.listenButton）が はんだんする**。
     areaId … 'eigo' なら 英語、grade 1 なら 日本語 */
  function forQuestion(q, opts) {
    if (!q) return null;
    const o = opts || {};
    const area = o.areaId || q.areaId || '';
    const grade = o.grade || 0;

    // ① 英語の ステージ（小3・小4 とも エリア id は 'eigo'）
    if (area === 'eigo') {
      const en = englishIn(q.prompt || q.text || '');
      return en ? { text: en, lang: 'en', label: 'きく' } : null;
    }
    // ② 小1 は 問題文を 日本語で（まだ 字が すらすら 読めない ため）。
    //    ただし **かん字の 入った 問題は 読まない**（声が 答えを 言って しまう）
    if (grade === 1) {
      const jp = plain(q.prompt || q.text || '');
      if (!jp || hasKanji(jp)) return null;
      return { text: jp, lang: 'ja', label: 'きく' };
    }
    // ほかの 学年・教科は 読まない（読み上げると 答えが わかって しまう）
    return null;
  }

  /* 正解の あとの ふきだし（note）に 英語が あれば 読む */
  function forNote(note, opts) {
    const o = opts || {};
    if ((o.areaId || '') !== 'eigo') return null;
    const en = englishIn(note || '');
    return en ? { text: en, lang: 'en', label: 'きく' } : null;
  }

  return {
    init: init, ready: ready, speak: speak, stop: stop,
    voices: voices, refresh: refresh, voiceFor: voiceFor,
    plain: plain, englishIn: englishIn, hasLatin: hasLatin, hasKanji: hasKanji,
    forQuestion: forQuestion, forNote: forNote,
    RATE: RATE
  };
})();
