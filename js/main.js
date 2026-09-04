/* ══════════════════════════════════════════════════════════════════
   main.js — reveal on scroll, the horizontal timeline, and the glow
   that follows whichever project is in focus.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── reveal on entry ────────────────────────────────────────── */

  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── topbar ─────────────────────────────────────────────────── */

  var topbar = $('.topbar');
  var onScroll = function () {
    topbar.classList.toggle('stuck', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── the SVG edges need their real path lengths to draw ─────── */

  $$('.ms-edges path, .oct-signal path, .h4-links path').forEach(function (p) {
    try {
      var len = Math.ceil(p.getTotalLength());
      p.style.setProperty('--len', len);
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = reduce ? 0 : len;
    } catch (err) { /* getTotalLength unsupported — the CSS fallback covers it */ }
  });

  /* ── timeline ───────────────────────────────────────────────── */

  var stage    = $('#stage');
  var panes    = $$('.pane', stage);
  var nodes    = $$('#railNodes button');
  var railFill = $('#railFill');
  var progress = $('#stageProgress');
  var glow     = $('#glow');
  var prevBtn  = $('#prevBtn');
  var nextBtn  = $('#nextBtn');

  if (!stage || !panes.length) return;

  var current = -1;

  function paneOffset(i) {
    // scroll position that puts pane i flush against the stage's left padding
    return panes[i].offsetLeft - panes[0].offsetLeft;
  }

  function nearestIndex() {
    var x = stage.scrollLeft;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < panes.length; i++) {
      var d = Math.abs(paneOffset(i) - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function setActive(i) {
    if (i === current) return;
    current = i;

    panes.forEach(function (p, n) { p.classList.toggle('active', n === i); });
    nodes.forEach(function (b, n) {
      if (n === i) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });

    sizeRailFill();

    var hue = panes[i].getAttribute('data-hue') || '200';
    glow.style.setProperty('--gh', hue);
    glow.classList.add('on');

    prevBtn.disabled = (i === 0);
    nextBtn.disabled = (i === panes.length - 1);
  }

  var railLine = $('.rail-line');
  // The last node is right-aligned in its grid column, so the dots are not
  // evenly spaced — measure the real position rather than assuming.
  function sizeRailFill() {
    if (current < 0) return;
    var dot = nodes[current].querySelector('.dot');
    if (!dot || !railLine) return;
    var lr = railLine.getBoundingClientRect();
    var dr = dot.getBoundingClientRect();
    railFill.style.width = Math.max(0, (dr.left + dr.width / 2) - lr.left) + 'px';
  }

  /* set while we're driving the scroll ourselves, so the settle below
     doesn't interrupt an animation in progress */
  var programmatic = false;
  var progTimer = null;

  function goTo(i, smooth) {
    i = Math.max(0, Math.min(panes.length - 1, i));
    var animated = !(smooth === false || reduce);
    programmatic = true;
    clearTimeout(progTimer);
    progTimer = setTimeout(function () { programmatic = false; }, animated ? 700 : 60);
    stage.scrollTo({ left: paneOffset(i), behavior: animated ? 'smooth' : 'auto' });
    setActive(i);
  }

  /* Where CSS snapping is off (mouse and trackpad), align to the nearest
     pane once scrolling has actually stopped. */
  var settleTimer = null;
  var cssSnaps = window.matchMedia('(hover:hover) and (pointer:fine)');

  function scheduleSettle() {
    if (reduce || cssSnaps.matches === false) return;   // touch: CSS handles it
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () {
      if (down || programmatic) return;
      var i = nearestIndex();
      if (Math.abs(paneOffset(i) - stage.scrollLeft) > 2) goTo(i);
    }, 180);
  }

  // keep active + progress bar in sync with wherever the scroll ends up
  var raf = null;
  stage.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      setActive(nearestIndex());
      var max = stage.scrollWidth - stage.clientWidth;
      progress.style.width = (max > 0 ? (stage.scrollLeft / max) * 100 : 100) + '%';
      scheduleSettle();
    });
  }, { passive: true });

  nodes.forEach(function (b) {
    b.addEventListener('click', function () { goTo(parseInt(b.dataset.go, 10)); });
  });
  prevBtn.addEventListener('click', function () { goTo(current - 1); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); });

  // arrow keys once the stage has focus
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(panes.length - 1); }
  });

  /* No wheel handling on purpose.

     This used to map deltaY onto the rail so a mouse wheel could move the
     timeline. It made the page feel broken: we open on the newest project,
     which is the far right of the rail, so scrolling *up* spent the whole
     timeline rewinding before the page would move at all. Vertical wheel
     now always belongs to the page.

     Horizontal movement still has: trackpad sideways pan and touch swipe
     (both native), drag, the arrows, the rail years, and the arrow keys. */

  /* drag to pan */
  var down = false, startX = 0, startScroll = 0, moved = 0;

  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;          // native touch scroll is better
    if (e.target.closest('a, button')) return;
    down = true; moved = 0;
    startX = e.clientX;
    startScroll = stage.scrollLeft;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    stage.scrollLeft = startScroll - dx;
  });

  function endDrag() {
    if (!down) return;
    down = false;
    stage.classList.remove('dragging');
    if (moved > 4) goTo(nearestIndex());            // settle onto a pane
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('click', function (e) {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ── tabs (the OCT results) ─────────────────────────────────── */

  $$('[data-tabs]').forEach(function (group) {
    var tabs  = $$('[role="tab"]', group);
    var pans  = $$('.tabpane', group);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
        pans.forEach(function (p) { p.classList.toggle('is-on', p.dataset.tab === tab.dataset.tab); });
      });
    });
  });

  /* ── copy the address ───────────────────────────────────────────
     mailto: does nothing at all for anyone on webmail with no desktop
     mail client, so give them something that always works. */

  $$('.copy-mail').forEach(function (btn) {
    var addr = btn.dataset.copy;

    function flash(word) {
      var was = btn.dataset.label || btn.textContent;
      btn.dataset.label = was;
      btn.textContent = word;
      btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = btn.dataset.label;
        btn.classList.remove('done');
      }, 1800);
    }

    // works without the async Clipboard API, and without a secure context
    function legacyCopy() {
      var t = document.createElement('textarea');
      t.value = addr;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.top = '-1000px';
      document.body.appendChild(t);
      t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t);
      flash(ok ? 'copied' : addr);
    }

    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(
          function () { flash('copied'); },
          legacyCopy                       // permission denied, or not secure
        );
      } else {
        legacyCopy();
      }
    });
  });

  /* ── land on the most recent project ────────────────────────── */

  function init() {
    goTo(panes.length - 1, false);
    // the glow should only appear once the timeline is actually on screen
    if ('IntersectionObserver' in window) {
      var go = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { glow.classList.toggle('on', e.isIntersecting); });
      }, { threshold: 0.08 });
      go.observe($('.work'));
    }
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  window.addEventListener('resize', function () {
    stage.scrollTo({ left: paneOffset(current), behavior: 'auto' });
    sizeRailFill();
  });
})();
