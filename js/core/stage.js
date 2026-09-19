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

  /* iPhone・iPad の ホームバー・ノッチ（safe area）の よけ幅（2026-09-19）。
     index.html は viewport-fit=cover なので、ホーム画面から ひらくと 画面の いちばん 下まで 使える かわりに
     ホームバー（下の 横線）が ボタンや ヒントに かぶって いた → その ぶんを のぞいた まん中に おく。
     env() が ない ブラウザ（Chrome の パソコン・Android の 多く）は ぜんぶ 0 ＝ いままでと 同じ */
  let probe = null;
  function insets() {
    const z = { t: 0, r: 0, b: 0, l: 0 };
    try {
      if (!probe) {
        probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
          'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
        (document.body || document.documentElement).appendChild(probe);
      }
      const cs = window.getComputedStyle(probe);
      z.t = parseFloat(cs.paddingTop) || 0; z.r = parseFloat(cs.paddingRight) || 0;
      z.b = parseFloat(cs.paddingBottom) || 0; z.l = parseFloat(cs.paddingLeft) || 0;
    } catch (e) { /* 0 の まま */ }
    return z;
  }

  function fit() {
    el = el || document.getElementById('stage');
    if (!el) return;

    const ins = insets();
    const vw = Math.max(200, (window.innerWidth || W) - ins.l - ins.r);
    const vh = Math.max(300, (window.innerHeight || 720) - ins.t - ins.b);

    scale = Math.min(vw / W, vh / H_MIN);
    height = Math.max(H_MIN, Math.min(H_MAX, Math.round(vh / scale)));

    el.style.width = W + 'px';
    el.style.height = height + 'px';
    // よけ幅が ある ときだけ まん中を ずらす（ない ときは CSS の 50% の まま）
    el.style.left = (ins.l || ins.r) ? (ins.l + vw / 2) + 'px' : '';
    el.style.top = (ins.t || ins.b) ? (ins.t + vh / 2) + 'px' : '';
    el.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';

    document.documentElement.style.setProperty('--stage-h', height + 'px');
    // 単位の ない 数（CSS の calc で わり算に つかう。--stage-h は px つきなので われない）
    document.documentElement.style.setProperty('--stage-hn', String(height));
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
