/* ---------------------------------------------------------
   画面の 大きさを 合わせる

   モックの 数字（ボタン78px、ノード44px …）を そのまま 使えるように、
   **よこ幅は いつも 400px** の「ステージ」を 作り、
   それを transform: scale で 端末の 大きさに ひきのばします。

   たての 長さは 端末に あわせて 700〜900 の あいだで のびます。
   （400×720 に 固定すると、たてに 長い スマホで 上下に すきまが 出るため）

     s  = min(よこ / 400, たて / 700)
     dh = たて / s  を 700〜900 に おさめる

   スマホ 390×844   → 400×866 を 0.975倍（ぴったり）
   タブレット 800×1280 → 400×700 を 1.83倍（左右に 少し すきま）
   横もちの ときだけ 左右に すきまが 出ます（たてもち前提の ゲームなので）。

   上バー・下バーは 高さを 決めうちにして、まん中を flex:1 に しておけば
   たてが のびても くずれません。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.stage = (function () {
  const W = 400;        // 設計の よこ幅（ここは 動かさない）
  const H_MIN = 700;
  const H_MAX = 900;

  let el = null;
  let scale = 1;
  let height = 720;

  function fit() {
    el = el || document.getElementById('stage');
    if (!el) return;

    const vw = window.innerWidth || W;
    const vh = window.innerHeight || 720;

    scale = Math.min(vw / W, vh / H_MIN);
    height = Math.max(H_MIN, Math.min(H_MAX, Math.round(vh / scale)));

    el.style.width = W + 'px';
    el.style.height = height + 'px';
    el.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';

    document.documentElement.style.setProperty('--stage-h', height + 'px');
  }

  // 画面の 1ピクセルが 実際の 何ピクセルか（Canvas を くっきり 描くのに 使う）
  function ratio() {
    return scale * (window.devicePixelRatio || 1);
  }

  function size() {
    return { w: W, h: height, scale: scale };
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 60); });

  return { fit: fit, size: size, ratio: ratio, W: W };
})();
