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
})();
