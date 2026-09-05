/* ---------------------------------------------------------
   エラーの 保険（v7.6）

   アプリの どこかで エラーが 起きた とき（読みこみ中も ふくむ）に
     ① タブレットの 中に きろくする（localStorage・8件まで・外には 送らない）
     ② 画面の 下に「こまった ことが おきたみたい」の バーを 出す
        （もういちど ひらく／とじる）
   おうちの人ページの「こまったとき・感想を送る」が この きろくを
   文字に して コピーできる（LINE などで 作った 人に 送って もらう）。

   ※ index.html の いちばん 先に 読みこむ。ほかの ファイルが 読みこみ中に
     落ちた とき（v5.0.1 の zu.js の 事故）も つかまえる ため、
     MQ.util など ほかの ものに たよらない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.guard = (function () {
  const KEY = 'manabi-monster-errors-v1';
  const MAX = 8;                 // のこす 件数
  const SESSION_MAX = 20;        // 1回の 起動で きろくする 上限（同じ エラーが 何百回も 出た とき用）
  let list = null;
  let sessionCount = 0;
  let shown = false;             // バーは 1回の 起動で 1回だけ
  let booted = false;
  const listeners = [];

  /* ---- きろく ---- */
  function load() {
    if (list) return list;
    try {
      const raw = window.localStorage.getItem(KEY);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    return list;
  }
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function screenId() {
    try {
      const el = document.querySelector && document.querySelector('.screen.is-active');
      return el && el.id ? el.id.replace('screen-', '') : '';
    } catch (e) { return ''; }
  }
  // 'https://.../js/content/world3.js' → 'world3.js'
  function shortSrc(src, line, col) {
    let s = String(src || '').split('?')[0].split('/').pop();
    if (!s) return '';
    if (line) s += ':' + line + (col ? ':' + col : '');
    return s;
  }

  /* きろくする。entry = { msg, src, line, col, phase } */
  function record(entry) {
    entry = entry || {};
    const l = load();
    const e = {
      at: new Date().toISOString(),
      v: MQ.version || '',
      msg: String(entry.msg || 'エラー').replace(/\s+/g, ' ').slice(0, 200),
      src: shortSrc(entry.src, entry.line, entry.col),
      screen: entry.screen != null ? entry.screen : screenId(),
      phase: entry.phase || (booted ? '' : 'load'),
      n: 1
    };
    // 直前と 同じ エラーなら 回数だけ ふやす（同じ ものが 8件 ならばない ように）
    const last = l[0];
    if (last && last.msg === e.msg && last.src === e.src) {
      last.n = (last.n || 1) + 1;
      last.at = e.at;
    } else {
      l.unshift(e);
      if (l.length > MAX) l.length = MAX;
    }
    persist();
    sessionCount++;
    listeners.forEach(function (fn) { try { fn(e); } catch (x) {} });
    return e;
  }

  function fromEvent(ev) {
    if (!ev) return null;
    if (sessionCount >= SESSION_MAX) return null;
    const msg = ev.error && ev.error.message ? ev.error.message : (ev.message || 'エラー');
    if (/ResizeObserver loop/.test(msg)) return null;   // 害の ない お知らせ
    const e = record({ msg: msg, src: ev.filename, line: ev.lineno, col: ev.colno });
    bar();
    return e;
  }
  function fromRejection(ev) {
    if (sessionCount >= SESSION_MAX) return null;
    const r = ev && ev.reason;
    const msg = r && r.message ? r.message : String(r || 'エラー');
    const e = record({ msg: 'Promise: ' + msg, src: '' });
    bar();
    return e;
  }

  function all() { return load().slice(); }
  function count() { return load().length; }
  function sessionErrors() { return sessionCount; }
  function clear() { list = []; persist(); }
  function onError(fn) { listeners.push(fn); }
  function markBooted() { booted = true; }

  /* おうちの人ページ用の 文（さいきんの エラー） */
  function text() {
    const l = load();
    if (!l.length) return 'さいきんの エラー: なし';
    const out = ['さいきんの エラー: ' + l.length + '件'];
    l.forEach(function (e) {
      const d = new Date(e.at);
      const when = isNaN(d.getTime()) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      out.push(' - ' + when + ' ' + (e.v || MQ.version || '?') + (e.phase ? ' [' + e.phase + ']' : '') + (e.screen ? ' 画面=' + e.screen : '') +
        ' ' + e.msg + (e.src ? ' @' + e.src : '') + ((e.n || 1) > 1 ? ' ×' + e.n : ''));
    });
    return out.join('\n');
  }

  /* 端末の 文（かんそうコピー用）。UA を 読みやすく する */
  function device() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    let os = 'ほかのOS';
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
    if (/Android/.test(ua)) { const m = ua.match(/Android ([\d.]+)/); os = 'Android' + (m ? ' ' + m[1] : ''); }
    else if (/iPad|iPhone|iPod/.test(ua)) { const m = ua.match(/OS (\d+)[_.](\d+)/); os = (/iPad/.test(ua) ? 'iPad' : 'iPhone') + (m ? ' ' + m[1] + '.' + m[2] : ''); }
    else if (/Macintosh/.test(ua) && touch) os = 'iPad';
    else if (/Macintosh/.test(ua)) os = 'Mac';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/CrOS/.test(ua)) os = 'Chromebook';
    let br = 'ほかのブラウザ';
    let m;
    if ((m = ua.match(/Edg\/(\d+)/))) br = 'Edge ' + m[1];
    else if ((m = ua.match(/SamsungBrowser\/(\d+)/))) br = 'Samsung ' + m[1];
    else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) br = 'Chrome ' + m[1];
    else if ((m = ua.match(/Firefox\/(\d+)/))) br = 'Firefox ' + m[1];
    else if (/Safari/.test(ua) && (m = ua.match(/Version\/(\d+)/))) br = 'Safari ' + m[1];
    let standalone = false;
    try { standalone = !!(navigator.standalone) || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); } catch (e) {}
    let scr = '';
    try { scr = window.innerWidth + '×' + window.innerHeight; } catch (e) {}
    let stage = '';
    try { if (MQ.stage && MQ.stage.size) { const s = MQ.stage.size(); stage = 'ステージ ' + Math.round(s.h) + '・倍率 ' + (Math.round(s.scale * 100) / 100); } } catch (e) {}
    return { os: os, browser: br, standalone: standalone, screen: scr, stage: stage,
      text: os + ' / ' + br + ' / 画面 ' + (scr || '?') + (stage ? '（' + stage + '）' : '') + ' / ホーム画面から: ' + (standalone ? 'はい' : 'いいえ') };
  }

  /* ---- 画面の 下の バー（MQ.util に たよらない）---- */
  function bar() {
    if (shown) return null;
    if (typeof document === 'undefined' || !document.createElement) return null;
    let host = null;
    try { host = document.getElementById('stage') || document.body; } catch (e) {}
    if (!host) return null;
    shown = true;
    const box = document.createElement('div');
    box.id = 'guard';
    box.className = 'guard';
    box.setAttribute('role', 'alert');
    const t = document.createElement('div');
    t.className = 'guard__t';
    const t1 = document.createElement('b');
    t1.textContent = 'こまった ことが おきたみたい';
    const t2 = document.createElement('span');
    t2.textContent = 'もういちど ひらくと なおる ことが 多いよ。なおらない ときは おうちの人に 見せてね';
    t.appendChild(t1); t.appendChild(t2);
    const row = document.createElement('div');
    row.className = 'guard__row';
    const b1 = document.createElement('button');
    b1.type = 'button'; b1.className = 'btn btn--small'; b1.textContent = 'もういちど ひらく';
    b1.addEventListener('click', function () { try { window.location.reload(); } catch (e) {} });
    const b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'btn btn--small btn--stone'; b2.textContent = 'とじる';
    b2.addEventListener('click', function () { if (box.parentNode) box.parentNode.removeChild(box); });
    row.appendChild(b1); row.appendChild(b2);
    box.appendChild(t); box.appendChild(row);
    host.appendChild(box);
    return box;
  }
  function barShown() { return shown; }
  // テスト用：つぎの バーを また 出せる ように する
  function resetBar() { shown = false; const el = document.getElementById && document.getElementById('guard'); if (el && el.parentNode) el.parentNode.removeChild(el); }

  /* ---- とりつけ ---- */
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('error', function (ev) { try { fromEvent(ev); } catch (e) {} });
    window.addEventListener('unhandledrejection', function (ev) { try { fromRejection(ev); } catch (e) {} });
  }

  return {
    record: record, fromEvent: fromEvent, fromRejection: fromRejection,
    all: all, count: count, clear: clear, text: text, device: device,
    onError: onError, sessionErrors: sessionErrors, markBooted: markBooted,
    bar: bar, barShown: barShown, resetBar: resetBar,
    KEY: KEY, MAX: MAX
  };
})();
