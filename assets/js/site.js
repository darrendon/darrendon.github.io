/* Small site behaviours: header shadow on scroll, copy-to-clipboard, current-section highlight. */
(function () {
  'use strict';
  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () { head.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var out = document.getElementById(btn.getAttribute('data-toast') || '');
      var done = function (msg) { if (out) out.textContent = msg; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done('Copied ' + text); }, function () { done('Select the address above to copy it.'); });
      } else { done('Select the address above to copy it.'); }
    });
  });

  var links = document.querySelectorAll('.subnav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) map[s.id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); if (map[e.target.id]) map[e.target.id].classList.add('on'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* "Learn to play" in a game page's hero: load the embedded build straight into its tutorial. */
  document.querySelectorAll('[data-tutorial]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var frame = document.querySelector('#frame iframe, .play-frame iframe');
      if (!frame) return;
      e.preventDefault();
      var src = (frame.getAttribute('src') || '').split(/[?#]/)[0];
      frame.setAttribute('loading', 'eager');
      frame.src = src + '?tutorial';
      (frame.closest('.play-frame') || frame).scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'tutorial-button' + location.pathname, title: 'Learn to play', event: true });
    });
  });

  /* Analytics (GoatCounter). Off until the <meta name="goatcounter"> tag on a page holds an account code,
     e.g. content="darrendon" for darrendon.goatcounter.com. Pageviews are counted by GoatCounter's script;
     a ?ref=publisher on a pitch link shows up as that visit's referrer. Events counted below:
     download/<file>, email/<subject>, play/<game> (first click into a playable build) and play-tab/<game>. */
  var gcMeta = document.querySelector('meta[name="goatcounter"]');
  var gcCode = gcMeta && gcMeta.getAttribute('content');
  if (gcCode && /^[a-z0-9-]+$/.test(gcCode)) {
    var gs = document.createElement('script');
    gs.async = true; gs.src = 'https://gc.zgo.at/count.js';
    gs.setAttribute('data-goatcounter', 'https://' + gcCode + '.goatcounter.com/count');
    document.head.appendChild(gs);
    var game = (location.pathname.match(/^\/games\/([^/]+)/) || [])[1] || 'home';
    var track = function (path, title) {
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path, title: title || path, event: true });
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (/\.pdf($|\?)/i.test(href)) track('download/' + href.split('/').pop());
      else if (/^mailto:/i.test(href)) track('email/' + (decodeURIComponent((href.split('subject=')[1] || 'none').split('&')[0])) + ' (' + game + ')');
      else if (a.target === '_blank' && /\/play\/|^\/dim-sum-rush\//.test(href)) track('play-tab/' + game);
    });
    var played = false;
    window.addEventListener('blur', function () {
      var el = document.activeElement;
      if (!played && el && el.tagName === 'IFRAME') { played = true; track('play/' + game); }
    });
  }
})();
