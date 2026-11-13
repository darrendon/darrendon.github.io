#!/usr/bin/env node
/*
  Layout check: no text on top of other text, no text cut off, no sideways scroll.

    node tools/check-layout.js            every page (not the playables), every width
    node tools/check-layout.js / /games/  just those pages
    node tools/check-layout.js --fix-versions   also rewrite out-of-date ?v= hashes on every page

  For each page and each screen width it finds every line of text as the browser laid it out and fails
  if two lines from different pieces of text overlap, if a line is cut off by the box it sits in, or if
  the page scrolls sideways. Each page is checked twice: while the web fonts are still loading (the
  fallback font is wider or narrower, which is when cards used to break) and after they have loaded.

  It also fails if a page links a stylesheet or script with an out-of-date ?v= hash (a visitor would get
  the old cached CSS with the new page), and it refuses CSS that Safari has laid out wrong on this site before (see BANNED below): this
  check runs in Chromium, so for Safari-only bugs the defense is not using the features that cause them.

  The pre-commit hook in .githooks/ runs this whenever a page or a stylesheet changes
  (one-time setup in a fresh clone: git config core.hooksPath .githooks).
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const WIDTHS = [320, 360, 375, 390, 414, 480, 600, 601, 700, 768, 820, 860, 960, 961, 1024, 1180, 1280, 1440, 1920];

// CSS the site's pages must not use. Each one has broken this site in Safari.
const BANNED = [
  { re: /grid-template-rows\s*:\s*subgrid|grid-template-columns\s*:\s*subgrid/i,
    why: 'subgrid: Safari put the home page card text on top of itself (and did not always fix it once the fonts loaded). Use a plain flex column.' },
];
const SITE_CSS = ['assets/css/site.css', 'assets/css/home-games.css', 'assets/css/fonts.css', 'assets/css/type.css'];

function pages() {
  const out = ['/', '/games/', '/contact/', '/in-development/'];
  for (const dir of ['games', 'in-development']) {
    for (const d of fs.readdirSync(path.join(ROOT, dir))) {
      const f = path.join(ROOT, dir, d, 'index.html');
      if (!fs.existsSync(f)) continue;
      if (/http-equiv="refresh"/i.test(fs.readFileSync(f, 'utf8'))) continue; // redirect stubs
      out.push('/' + dir + '/' + d + '/');
    }
  }
  return out;
}

// Pages link shared files as /assets/css/site.css?v=<first 8 of the file's MD5>. Lists (or, with fix, rewrites) any that are stale.
function versions(fix) {
  const crypto = require('crypto');
  const out = [];
  const hash = {};
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.name.startsWith('.') || d.name === 'node_modules' || d.isSymbolicLink()) continue;
      const f = path.join(dir, d.name);
      if (d.isDirectory()) walk(f);
      else if (d.name.endsWith('.html')) {
        const src = fs.readFileSync(f, 'utf8');
        const next = src.replace(/(["'])(\/assets\/[^"'?#]+)\?v=([0-9a-f]+)/g, (m, q, asset, v) => {
          const file = path.join(ROOT, asset);
          if (!fs.existsSync(file)) return m;
          const h = hash[asset] || (hash[asset] = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8));
          if (h === v) return m;
          out.push(path.relative(ROOT, f) + ': ' + asset + '?v=' + v + ' should be ?v=' + h);
          return q + asset + '?v=' + h;
        });
        if (fix && next !== src) fs.writeFileSync(f, next);
      }
    }
  };
  walk(ROOT);
  return out;
}

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.pdf': 'application/pdf' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch (e) {}
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

// Runs in the page: every rendered line of text, then the problems between them.
function inspect() {
  const problems = [];
  const shown = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      if (e.classList.contains('sr-only') || e.classList.contains('skip')) return false;
    }
    return true;
  };
  const clipper = (el) => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/hidden|clip/.test(cs.overflowX + cs.overflowY)) return e; // a scrolling box is fine: the text is a swipe away
    }
    return null;
  };
  const label = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      parts.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
    }
    return parts.join(' > ');
  };
  const lines = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let id = 0;
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,svg,template,video,canvas,iframe,select,option,textarea')) continue;
    if (!shown(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const myId = id++;
    // A text box runs from the font's ascent to its descent, a good way above capitals and below the baseline,
    // so tight display titles (line-height under 1) touch without any letters touching. Trim it to the letters.
    const trim = 0.18 * parseFloat(getComputedStyle(el).fontSize);
    for (const b of r.getClientRects()) {
      if (b.width < 1 || b.height < 1) continue;
      lines.push({ id: myId, el, text: n.textContent.trim().slice(0, 40), l: b.left + scrollX, t: b.top + scrollY + trim, r: b.right + scrollX, b: b.bottom + scrollY - trim });
    }
  }
  // 1. text on text
  lines.sort((a, b) => a.t - b.t);
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    for (let j = i + 1; j < lines.length && lines[j].t < a.b; j++) {
      const c = lines[j];
      if (c.id === a.id) continue;
      const w = Math.min(a.r, c.r) - Math.max(a.l, c.l);
      const h = Math.min(a.b, c.b) - Math.max(a.t, c.t);
      // allow a hairline; text drawn on top of text is far past this
      const minH = Math.min(a.b - a.t, c.b - c.t);
      if (w > 3 && h > Math.max(3, minH * 0.25)) {
        const key = a.id + ':' + c.id;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push('text on text: "' + a.text + '" (' + label(a.el) + ') and "' + c.text + '" (' + label(c.el) + ')');
      }
    }
  }
  // 2. text cut off by the box that holds it
  const cut = new Set();
  for (const a of lines) {
    const box = clipper(a.el);
    if (!box || cut.has(a.id)) continue;
    const cs = getComputedStyle(a.el);
    if (cs.textOverflow === 'ellipsis') continue;
    const k = box.getBoundingClientRect();
    const L = k.left + scrollX, T = k.top + scrollY, R = k.right + scrollX, B = k.bottom + scrollY;
    if (a.l < L - 1 || a.r > R + 1 || a.t < T - 2 || a.b > B + 2) {
      cut.add(a.id);
      problems.push('cut off: "' + a.text + '" (' + label(a.el) + ') sticks out of ' + label(box));
    }
  }
  // 3. sideways scroll
  const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (over > 1) problems.push('page scrolls sideways by ' + over + 'px');
  return problems;
}

(async () => {
  let failed = 0;
  for (const f of SITE_CSS) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const css = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const b of BANNED) if (b.re.test(css)) { failed++; console.log('FAIL ' + f + ': ' + b.why); }
  }

  // Every /assets/...?v= link must carry the file's current hash, or browsers (Safari especially) keep
  // using the old cached stylesheet with the new page, which is another way text ends up on top of text.
  const fix = process.argv.includes('--fix-versions');
  const stale = versions(fix);
  if (stale.length && !fix) {
    failed += stale.length;
    console.log('FAIL out-of-date ?v= hashes (run: node tools/check-layout.js --fix-versions)');
    for (const s of stale) console.log('  ' + s);
  } else if (stale.length) console.log('fixed ' + stale.length + ' out-of-date ?v= hash(es)');

  const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const list = want.length ? want : pages();
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();
  for (const url of list) {
    const found = new Map();
    for (const slowFonts of [true, false]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      let release;
      const gate = new Promise((ok) => { release = ok; });
      if (slowFonts) await ctx.route(/\.(woff2?|ttf|otf)(\?|$)/, async (route) => { await gate; route.continue(); });
      const page = await ctx.newPage();
      await page.goto(base + url, { waitUntil: slowFonts ? 'domcontentloaded' : 'load' });
      if (!slowFonts) await page.evaluate(() => document.fonts.ready);
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
        for (const p of await page.evaluate(inspect)) {
          const k = p;
          if (!found.has(k)) found.set(k, []);
          found.get(k).push(w + 'px' + (slowFonts ? ' (fonts loading)' : ''));
        }
      }
      release();
      await ctx.close();
    }
    if (found.size) {
      failed += found.size;
      console.log('FAIL ' + url);
      for (const [p, ws] of found) console.log('  ' + p + '\n      at ' + ws.join(', '));
    } else console.log('ok   ' + url);
  }
  await browser.close();
  srv.close();
  if (failed) { console.log('\n' + failed + ' layout problem(s).'); process.exit(1); }
  console.log('\nNo overlapping or cut-off text.');
})().catch((e) => { console.error(e); process.exit(2); });
