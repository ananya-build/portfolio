/* ══════════════════════════════════════════════════════════════════
   water.js — the caustic light on the background.

   Three overlapping sine fields are summed at a deliberately low
   resolution (the field is ~200px wide no matter the viewport), the
   crests are sharpened into thin filaments, and the result is drawn
   up to full size through a blur. That's what gives the soft,
   drifting look you get under a few metres of water — and it costs
   about 20k pixel writes a frame instead of two million.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var canvas = document.getElementById('water');
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // low-resolution field we actually compute
  var FW = 300, FH = 0;
  var field = document.createElement('canvas');
  var fctx = field.getContext('2d');
  var image = null;

  var vw = 0, vh = 0;
  var running = true;
  var last = 0;
  var FRAME = 1000 / 30;   // 30fps is plenty for something this slow

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = vw;
    canvas.height = vh;

    FH = Math.max(1, Math.round(FW * (vh / vw)));
    field.width = FW;
    field.height = FH;
    image = fctx.createImageData(FW, FH);
  }

  var warpX = null;   // per-column warp, recomputed once a frame

  function draw(t) {
    var data = image.data;
    var i = 0;

    // slow, incommensurate periods so the pattern never visibly repeats
    var t1 = t * 0.00021;
    var t2 = t * 0.00014;
    var t3 = t * 0.00009;

    // Straight sines give a regular mesh, which doesn't look like water at
    // all. Warping the sample point by a second, much slower field first is
    // what breaks the cells into irregular sizes.
    if (!warpX || warpX.length !== FW) warpX = new Float32Array(FW);
    for (var x0 = 0; x0 < FW; x0++) {
      var cx = x0 * 0.20;
      warpX[x0] = Math.cos(cx * 0.27 - t2 * 1.9) * 2.7 +
                  Math.cos(cx * 0.11 + t1 * 1.3) * 1.9;
    }

    for (var y = 0; y < FH; y++) {
      var fy = y * 0.20;
      var wy = Math.sin(fy * 0.31 + t1 * 2.1) * 2.7 +
               Math.sin(fy * 0.13 - t3 * 1.7) * 1.9;

      for (var x = 0; x < FW; x++) {
        var fx = x * 0.20;
        var px = fx + wy;          // warp x by the row's offset…
        var py = fy + warpX[x];    // …and y by the column's

        var v =
          Math.sin(px * 1.00 + py * 0.62 + t1 * 5.1) * 1.00 +
          Math.sin(px * 0.67 - py * 1.19 + t2 * 6.7) * 0.85 +
          Math.sin((px + py) * 0.91 + t3 * 4.3)      * 1.15;

        v = v * 0.334;                // -> roughly -1..1
        v = 1 - (v < 0 ? -v : v);     // crests where the waves cancel
        v = v * v; v = v * v; v = v * v;   // sharpen into thin filaments

        // a slow, very large-scale mask so some stretches of the surface sit
        // in shadow — an evenly-lit field reads as wallpaper
        var mask = 0.30 + 0.70 * (0.5 + 0.5 * Math.sin(fx * 0.075 + fy * 0.05 + t3 * 2.3));
        v *= mask;

        var a = v * 255;
        // bioluminescent cyan, leaning blue in the dimmer parts
        data[i]     = 120 + v * 110;
        data[i + 1] = 205 + v * 45;
        data[i + 2] = 240;
        data[i + 3] = a > 255 ? 255 : a;
        i += 4;
      }
    }

    fctx.putImageData(image, 0, 0);

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(4px)';
    ctx.drawImage(field, 0, 0, FW, FH, 0, 0, vw, vh);
    // a second, larger, fainter pass — reads as light from further up
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(22px)';
    ctx.drawImage(field, 0, 0, FW, FH, -vw * 0.12, -vh * 0.12, vw * 1.24, vh * 1.24);
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    if (now - last >= FRAME) {
      last = now;
      draw(now);
    }
    requestAnimationFrame(loop);
  }

  // stop burning cycles when the tab is hidden
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 180);
  });

  resize();
  requestAnimationFrame(loop);
})();
