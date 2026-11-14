#!/usr/bin/env python3
"""Mr. Magpie — print rulebook.html to mr-magpie-rules.pdf (US Letter portrait, eight pages) and render
reference-card.html (poker size, front and back) to reference-card.png.
Run from anywhere: python3 in-development/mr-magpie/pdf.py   Rerun after any rules change in play/engine.js.
It fails if a page overflows, or if any two blocks of text or cards touch."""
import os, threading, http.server, functools
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
PAGES = 8


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


# every block that carries words or a card; no two may overlap unless one contains the other
OVERLAP = """() => {
  const els = [...document.querySelectorAll('.page:not(.cover) :is(h2,h3,p,li,.acard,.tcard,.bauble,.back,.mb,.larder,img,svg.crit,.lbl,.arrow,.bar,.tip svg,.obj svg,.ti,.vs)')];
  const R = els.map(e => e.getBoundingClientRect()), hits = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const a = R[i], b = R[j], w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) hits.push((els[i].textContent || els[i].className.baseVal || els[i].className).trim().slice(0, 40) + '  ×  ' + (els[j].textContent || els[j].className.baseVal || els[j].className).trim().slice(0, 40));
  }
  return hits;
}"""

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8774), functools.partial(Q, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = os.path.join(HERE, 'mr-magpie-rules.pdf')
with sync_playwright() as p:
    b = p.chromium.launch()
    # the reference card first: the rulebook shows it
    rc = b.new_page(viewport={'width': 700, 'height': 420}, device_scale_factor=3)
    rc.goto('http://127.0.0.1:8774/in-development/mr-magpie/reference-card.html')
    rc.wait_for_function('window.__done', timeout=60000); rc.wait_for_timeout(300)
    clip = rc.evaluate("[...document.querySelectorAll('.card')].map(c => [c.scrollHeight - c.clientHeight, c.scrollWidth - c.clientWidth])")
    rc.locator('body').screenshot(path=os.path.join(HERE, 'reference-card.png'))

    pg = b.new_page(viewport={'width': 1000, 'height': 1200})
    pg.goto('http://127.0.0.1:8774/in-development/mr-magpie/rulebook.html')
    pg.wait_for_function('window.__done', timeout=60000); pg.wait_for_timeout(300)
    # each panel: how much room is left (a negative number means the page overflows)
    spare = pg.evaluate("[...document.querySelectorAll('.panel')].map(n => { const over = n.scrollHeight - n.clientHeight; if (over > 0) return -over; const f = n.querySelector(':scope > .fill'); const cs = getComputedStyle(n); const last = [...n.children].filter(c => !c.classList.contains('fill')).pop(); return Math.round(f ? f.getBoundingClientRect().height : n.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - last.getBoundingClientRect().bottom); })")
    hits = pg.evaluate(OVERLAP)
    pg.emulate_media(media='print')
    pg.pdf(path=out, width='8.5in', height='11in', print_background=True, prefer_css_page_size=True)
    b.close()
n = len(PdfReader(out).pages)
print('pages', n, '· spare room at the bottom of each page (px, must not be negative):', spare)
print('overlapping blocks:', hits or 'none')
print('reference card overflow (px, should be 0):', clip)
assert n == PAGES and all(x >= 0 for x in spare), 'rulebook does not fit its pages'
assert not hits, 'blocks overlap in the rulebook'
assert all(v <= 0 for c in clip for v in c), 'reference card text does not fit'
