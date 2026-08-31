/* ---------------------------------------------------------
   AI で モンスターを かっこよく する（v2.8）

   「じぶんの モンスターを つくる」で とった 絵（切りぬいた 部分だけ）を
   Google の 画像AI（Gemini）に 送り、「子どもの 絵に 忠実な まま、
   ゲームの モンスターらしく」かき直して もらう。かえってきた 絵は
   いままでどおり photo.js の しくみで ドット絵に する（太い 線・ベタ塗り・
   白い 背景 なので、写真より ずっと きれいに ドット絵に なる）。

   きまり：
     ・AIの かぎ（API キー）は おうちの人が おうちの人ページで 入れる。
       この タブレットの localStorage だけに ほぞん。セーブ（きろくの ほぞん）には 入れない。
     ・かぎが 入っていない ときは、子どもの 画面に AIの ボタンは 出ない。
       → 何も 外に 送らない（いままでどおり）。
     ・送るのは 切りぬいた 絵の JPEG だけ。なまえ・きろくは 送らない。
     ・1日の 回数に 上限（初期 20回）。おうちの人が 変えられる。
     ・タイムアウト 90秒。まちがい は 子どもに わかる ことばで かえす（message）。

   テスト用：MQ.ai.transport に 関数を 入れると fetch の かわりに 使う
   （tools/harness.html #ai が にせの こたえを かえす）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.ai = (function () {
  const KEY = 'manabi-monster-ai-v1';
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/';
  // えらべる AI（やすい ↔ きれい）。値段は 2026-08 の Google の 表から（1まい・目安）
  const MODELS = [
    { id: 'gemini-3.1-flash-lite-image', name: 'やすい', note: '1まい 約5円' },
    { id: 'gemini-3.1-flash-image', name: 'ふつう', note: '1まい 約10円' },
    { id: 'gemini-3-pro-image', name: 'きれい', note: '1まい 約20円' }
  ];
  const DEFAULT_MODEL = 'gemini-3.1-flash-image';
  const LIMITS = [5, 10, 20, 50];
  const DEFAULT_LIMIT = 20;
  const TIMEOUT_MS = 90000;

  /* AIへの たのみ方（英語の ほうが 画像AIに よく 通じる）。
     いちばん 大事なのは「子どもの 絵に 忠実に」。目の 数・つの・手足を 変えない。 */
  const PROMPT = [
    'This is a photo of a monster that a child drew by hand on paper.',
    'Redraw it as a polished enemy monster for a retro pixel-art RPG video game, while staying faithful to the child\'s design:',
    '- Keep the same creature, silhouette, pose and body parts. Keep exactly the same number of eyes, horns, teeth, arms, legs, wings and tails as drawn. Do not add extra creatures or accessories.',
    '- Keep the colors the child used. If the drawing has no colors (pencil only), choose bold vivid colors that fit the creature.',
    '- Style: 16-bit video game sprite look. Thick dark outlines, flat solid colors with simple cel shading, clean simple shapes. No gradients, no texture, no photorealism.',
    '- Make it look cool and strong like a game boss, but it must still be recognizable as the child\'s drawing.',
    '- Composition: the whole monster, front-facing, centered, large, filling about 85% of the frame, on a pure plain white background.',
    '- No shadow on the ground, no ground, no text, no letters, no numbers, no border, no watermark, nothing else in the image.'
  ].join('\n');

  // 子どもに 見せる ことば（photo.js）。おうちの人ページ には もう少し くわしい ことば（PARENT）
  const MSG = {
    nokey: 'おうちの人ページで AIの かぎを 入れてね',
    limit: 'きょうは AIを つかえる 回数が おわったよ。また あした！',
    offline: 'インターネットに つながっていないみたい',
    key: 'AIの かぎが ちがうみたい。おうちの人ページで たしかめてね',
    billing: 'AIが つかえない せっていに なっているよ。おうちの人ページで たしかめてね',
    quota: 'AIの おかねの せっていが まだ かも。おうちの人ページで たしかめてね',
    model: 'AIの しゅるいが 見つからないよ。おうちの人ページで たしかめてね',
    busy: 'AIが いそがしいみたい。少し まって もう1回',
    safety: 'この 絵は AIが かけなかったよ。べつの 絵で ためしてね',
    noimage: 'AIが 絵を 出せなかったよ。もう1回 ためしてね',
    timeout: 'じかんが かかりすぎたよ。もう1回 ためしてね',
    unknown: 'うまく いかなかったよ。もう1回 ためしてね'
  };
  const PARENT = {
    ok: 'OK！ AIが つかえます',
    nokey: 'かぎが 入っていません',
    offline: 'インターネットに つながっていません',
    key: 'かぎが ちがいます。文字を もう一度 たしかめて ください（AIza… で はじまる 39文字）',
    billing: 'この かぎでは つかえません（かぎの せいげん か、Google 側の せってい）。Google AI Studio で 新しい かぎを 作って ためして ください',
    quota: 'かぎは 合っていますが、この AIは 無料わくが ありません。Google AI Studio の「Billing（お支払い）」を 設定して ください',
    model: 'AIの しゅるいが 見つかりません。「AIの しゅるい」を べつの ものに して ください',
    busy: 'Google 側が こんでいます。少し まって もう一度',
    safety: 'この 絵は AIが かけませんでした',
    noimage: 'AIが 絵を かえしませんでした',
    timeout: 'じかんが かかりすぎました（電波が 弱い かも）',
    unknown: 'うまく いきませんでした'
  };

  /* =======================================================
     せってい（localStorage）
     ======================================================= */
  let conf = null;
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function normalize(c) {
    c = c && typeof c === 'object' ? c : {};
    const out = {
      key: typeof c.key === 'string' ? c.key.trim() : '',
      model: MODELS.some(function (m) { return m.id === c.model; }) ? c.model : DEFAULT_MODEL,
      limit: LIMITS.indexOf(c.limit) >= 0 ? c.limit : DEFAULT_LIMIT,
      used: c.used && typeof c.used === 'object' ? { day: String(c.used.day || ''), n: Number(c.used.n) || 0 } : { day: '', n: 0 }
    };
    return out;
  }
  function load() {
    if (conf) return conf;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    conf = normalize(raw);
    return conf;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(conf)); } catch (e) {}
  }
  function config() {
    const c = load();
    return { key: c.key, model: c.model, limit: c.limit };
  }
  function setConfig(o) {
    const c = load();
    if (o && typeof o.key === 'string') c.key = o.key.trim();
    if (o && o.model) c.model = o.model;
    if (o && o.limit != null) c.limit = o.limit;
    conf = normalize(c);
    persist();
    return config();
  }
  function clearKey() {
    const c = load();
    c.key = '';
    persist();
  }
  function ready() { return !!load().key; }
  function usedToday() {
    const c = load();
    return c.used.day === today() ? c.used.n : 0;
  }
  function left() { return Math.max(0, load().limit - usedToday()); }
  function canUse() { return ready() && left() > 0; }
  function countUse() {
    const c = load();
    if (c.used.day !== today()) c.used = { day: today(), n: 0 };
    c.used.n++;
    persist();
  }
  function modelName(id) {
    const m = MODELS.filter(function (x) { return x.id === (id || load().model); })[0];
    return m ? m.name : (id || '');
  }

  /* =======================================================
     まちがいの 形： { code, detail }
     ======================================================= */
  function err(code, detail) {
    return { ai: true, code: MSG[code] ? code : 'unknown', detail: detail || '' };
  }
  function message(e, forParent) {
    const table = forParent ? PARENT : MSG;
    const code = typeof e === 'string' ? e : (e && e.code) || 'unknown';
    return table[code] || table.unknown;
  }
  // HTTP の こたえ → まちがいの 種類
  function fromStatus(status, json) {
    const e = (json && json.error) || {};
    const st = String(e.status || '');
    const msg = String(e.message || '').toLowerCase();
    const keyish = /api key|api_key|apikey/.test(msg);
    if (status === 400 && keyish) return err('key', msg);
    if (status === 400 && st === 'FAILED_PRECONDITION') return err('billing', msg);
    if (status === 401) return err('key', msg);
    if (status === 403) return err(keyish ? 'key' : 'billing', msg);
    if (status === 404) return err('model', msg);
    if (status === 429) return err(/quota|billing|free|limit: 0|plan/.test(msg) ? 'quota' : 'busy', msg);
    if (status >= 500) return err('busy', status + ' ' + msg);
    return err('unknown', status + ' ' + msg);
  }

  /* =======================================================
     通信（transport を さしかえられる）
     ======================================================= */
  let transport = null;
  function call(path, init) {
    const url = BASE + path;
    init = init || {};
    init.headers = Object.assign({ 'x-goog-api-key': load().key }, init.headers || {});
    if (MQ.ai.transport) return Promise.resolve().then(function () { return MQ.ai.transport(url, init); });
    if (typeof fetch !== 'function') return Promise.reject(err('offline', 'no fetch'));
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) init.signal = ctrl.signal;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, init).then(function (r) {
      return r.text().then(function (txt) {
        let json = null;
        try { json = JSON.parse(txt); } catch (e) { json = null; }
        return { status: r.status, json: json };
      });
    }).catch(function (e) {
      if (e && e.ai) throw e;
      throw err(e && e.name === 'AbortError' ? 'timeout' : 'offline', String(e));
    }).then(function (res) { clearTimeout(timer); return res; }, function (e) { clearTimeout(timer); throw e; });
  }

  /* こたえの JSON → 絵の dataURL。絵が ない ときは まちがい を なげる */
  function parse(json) {
    if (!json || typeof json !== 'object') throw err('noimage', 'empty');
    if (json.promptFeedback && json.promptFeedback.blockReason) throw err('safety', json.promptFeedback.blockReason);
    const cand = (json.candidates || [])[0];
    if (!cand) throw err('noimage', 'no candidates');
    const parts = (cand.content && cand.content.parts) || [];
    for (let i = 0; i < parts.length; i++) {
      const d = parts[i].inlineData || parts[i].inline_data;
      if (d && d.data) return 'data:' + (d.mimeType || d.mime_type || 'image/png') + ';base64,' + d.data;
    }
    const fr = String(cand.finishReason || '');
    if (/SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII/.test(fr)) throw err('safety', fr);
    throw err('noimage', fr || 'text only');
  }

  /* 絵（JPEG/PNG の dataURL）を 送って、かき直した 絵の dataURL を もらう */
  function generate(dataUrl, opts) {
    opts = opts || {};
    const c = load();
    if (!c.key) return Promise.reject(err('nokey'));
    if (left() <= 0) return Promise.reject(err('limit'));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(err('offline'));
    const m = String(dataUrl || '').match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!m) return Promise.reject(err('unknown', 'bad image'));
    const body = {
      contents: [{ parts: [{ text: opts.prompt || PROMPT }, { inlineData: { mimeType: m[1], data: m[2] } }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } }
    };
    const model = opts.model || c.model;
    return call('models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status !== 200) throw fromStatus(res.status, res.json);
      countUse();               // Google に とどいて 絵を 作った（おかねが かかった）ときだけ 数える
      return parse(res.json);
    });
  }

  /* かぎと AIの しゅるいを たしかめる（おうちの人ページの「しらべる」）。絵は 作らない（無料） */
  function check() {
    const c = load();
    if (!c.key) return Promise.resolve({ ok: false, code: 'nokey', text: PARENT.nokey });
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve({ ok: false, code: 'offline', text: PARENT.offline });
    return call('models/' + c.model, { method: 'GET' }).then(function (res) {
      if (res.status === 200) return { ok: true, code: 'ok', text: PARENT.ok + '（' + modelName(c.model) + '）' };
      const e = fromStatus(res.status, res.json);
      return { ok: false, code: e.code, text: message(e, true) };
    }, function (e) {
      return { ok: false, code: e.code || 'unknown', text: message(e, true) };
    });
  }

  return {
    MODELS: MODELS,
    LIMITS: LIMITS,
    PROMPT: PROMPT,
    config: config,
    setConfig: setConfig,
    clearKey: clearKey,
    ready: ready,
    usedToday: usedToday,
    left: left,
    canUse: canUse,
    modelName: modelName,
    generate: generate,
    check: check,
    message: message,
    // テスト用
    parse: parse,
    fromStatus: fromStatus,
    transport: transport,
    _reset: function () { conf = null; }
  };
})();
