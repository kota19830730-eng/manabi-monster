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

  // 画面の部品を 作る： h('button', { class: 'btn', onclick: fn, text: 'OK' }, [子ども...])
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
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
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  return { randInt: randInt, pick: pick, shuffle: shuffle, sample: sample, esc: esc, stripTags: stripTags, uid: uid, h: h };
})();
