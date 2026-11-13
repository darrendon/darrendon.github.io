#!/usr/bin/env python3
"""Mr. Magpie — print rulebook.html to mr-magpie-rules.pdf (US Letter portrait, two pages).
Run from anywhere: python3 in-development/mr-magpie/pdf.py   Rerun after any rules change in play/engine.js."""
import os, threading, http.server, functools
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..', '..'))


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8774), functools.partial(Q, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = os.path.join(HERE, 'mr-magpie-rules.pdf')
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1000, 'height': 1200})
    pg.goto('http://127.0.0.1:8774/in-development/mr-magpie/rulebook.html')
    pg.wait_for_function('window.__done', timeout=60000); pg.wait_for_timeout(300)
    # nothing may run off a page
    over = pg.evaluate("[...document.querySelectorAll('.page')].map(s => { const f = s.querySelector('.foot').getBoundingClientRect().top; return Math.max(...[...s.querySelectorAll('.cols,.qrow,.baubles,.comp,.goal')].map(n => n.getBoundingClientRect().bottom)) - f; })")
    pg.emulate_media(media='print')
    pg.pdf(path=out, width='8.5in', height='11in', print_background=True, prefer_css_page_size=True)
    b.close()
n = len(PdfReader(out).pages)
print('pages', n, '· content past the footer (px, should be negative):', [round(x) for x in over])
assert n == 2 and all(x < 0 for x in over), 'rulebook does not fit two pages'
