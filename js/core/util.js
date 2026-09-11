/* ---------------------------------------------------------
   どこでも使う 小さな道具
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.util = (function () {
  // min 以上 max 以下の 整数
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(list, n) {
    return shuffle(list).slice(0, n);
  }

  // HTML に そのまま出しても 安全な文字に する
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stripTags(html) {
    return String(html).replace(/<[^>]+>/g, '');
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* 文字を その子の 学年に 合わせる（v13.1・js/core/text.js）。raw ＝ 問題の 中身（辞書を 当てない） */
  function fitText(v, raw) {
    const T = window.MQ && MQ.text;
    return T ? T.fit(v, { raw: raw }) : v;
  }
  function fitHtml(v, raw) {
    const T = window.MQ && MQ.text;
    return T ? T.fitHtml(v, { raw: raw }) : v;
  }
  // 文字の ノードに「もう 合わせた」しるしを つける（あとから 見はりが 同じ 文字を 2回 直さない）
  function markFitted(node) {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) c.__mqfit = c.data;
      else if (c.nodeType === 1) markFitted(c);
    }
  }

  // 画面の部品を 作る： h('button', { class: 'btn', onclick: fn, text: 'OK' }, [子ども...])
  //   raw: true ＝ 問題の 中身（問題文・えらぶ こたえ・ヒント）。学年に 合わせる 辞書を 当てない
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    const raw = !!(attrs && attrs.raw);
    if (raw) node.setAttribute('data-raw', '');
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'raw') return;
        if (k === 'class') node.className = v;
        else if (k === 'html') { node.innerHTML = fitHtml(v, raw); markFitted(node); }
        else if (k === 'text') { node.textContent = fitText(v, raw); markFitted(node); }
        else if (k === 'placeholder' || k === 'title' || k === 'aria-label') node.setAttribute(k, fitText(v, raw));
        else if (k === 'style' && typeof v === 'object') {
          Object.keys(v).forEach(function (prop) {
            if (prop.indexOf('--') === 0) node.style.setProperty(prop, v[prop]);
            else node.style[prop] = v[prop];
          });
        }
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      if (typeof c === 'string') {
        const t = document.createTextNode(fitText(c, raw));
        t.__mqfit = t.data;
        node.appendChild(t);
      } else node.appendChild(c);
    });
    return node;
  }

  return { randInt: randInt, pick: pick, shuffle: shuffle, sample: sample, esc: esc, stripTags: stripTags, uid: uid, h: h };
})();
