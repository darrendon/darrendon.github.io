#!/usr/bin/env python3
"""Films the gameplay shots of the Un, Deux, Trois, Cat! pitch video on the playable build (play/?film), one exact
frame at a time: 1920x1080 (a 1280x720 page at 1.5x), 30 fps. The browser's clock is stepped 1/30 s per frame
(virtual time + begin-frame control in Chromium's headless shell), so every animation is smooth however slowly the
frames render. ?film stops the bots and the automatic next round; this script deals set cards and makes each grab.

  python3 film.py [take ...]     takes: main six end paws (default: all). Frames go to build/<segment>/00000.jpg
  python3 build.py               splices the segments into the published video (see build.py)

Times below are seconds on the finished video (VO = Darren's voiceover), so a shot is retimed by editing its numbers.
Site served from the repo root on :8124 (python3 -m http.server 8124)."""
import sys, os, time, json, base64, subprocess, urllib.request, shutil, glob
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); BUILD = os.path.join(HERE, "build")
URL = "http://127.0.0.1:8124/games/un-deux-trois-cat/play/?film"
FPS = 30
SHELL = (glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell") or [os.environ.get("HEADLESS_SHELL", "")])[0]
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-begin-frame-control",
        "--run-all-compositor-stages-before-draw", "--disable-threaded-animation", "--disable-threaded-scrolling", "--disable-checker-imaging",
        "--disable-new-content-rendering-timeout", "--disable-image-animation-resync", "--force-device-scale-factor=1.5", "--no-sandbox",
        "--remote-debugging-port=9334", "--window-size=1280,720", "--hide-scrollbars", "--mute-audio", "about:blank"]

# segment -> first frame of the finished video it covers (30 fps). Each runs 10 frames into the next one for the crossfade.
SEG = {"x1": 582, "s1": 719, "s2": 1073, "s3": 1191, "s4": 1353, "s5": 1574, "s6": 1710, "s7": 2126}
END = {"x1": 718, "s1": 1073 + 9, "s2": 1191 + 9, "s3": 1353 + 9, "s4": 1574 + 9, "s5": 1710 + 9, "s6": 1865, "s7": 2267}
T = lambda seg, t: round(t * FPS) - SEG[seg]          # video time (s) -> frame number inside a segment

HELPERS = r"""
(() => {
  const st = document.createElement('style');
  st.textContent = `
  .fcall{position:fixed;left:928px;top:220px;z-index:50;max-width:322px;padding:11px 22px 13px 20px;border-radius:3px 10px 10px 3px;background:#21172a;
    border-left:5px solid #ffc94a;box-shadow:0 14px 30px rgba(0,0,0,.35);font-family:Jost,Figtree,sans-serif;opacity:0;transition:opacity .3s ease}
  .fcall b{display:block;font-weight:600;font-size:24.5px;line-height:1.15;color:#f4ebd8;letter-spacing:.005em}
  .fcall span{display:block;margin-top:3px;font-size:17.5px;line-height:1.25;color:#c9badb}
  .fcur{position:fixed;left:0;top:0;z-index:60;width:17px;height:25px;pointer-events:none;opacity:0;transition:opacity .25s}
  .fring{position:fixed;z-index:59;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #ffc94a;pointer-events:none;animation:fring .45s ease-out forwards}
  @keyframes fring{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}
  .keys{visibility:hidden}`;
  document.head.appendChild(st);
  const call = document.createElement('div'); call.className = 'fcall'; document.body.appendChild(call);
  const cur = document.createElement('div'); cur.className = 'fcur';
  cur.innerHTML = '<svg viewBox="0 0 17 25" width="17" height="25"><path d="M1 1 L1 19.5 L5.6 15.4 L8.9 23.2 L11.9 21.9 L8.7 14.3 L15 14.3 Z" fill="#fff" stroke="#1a1020" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cur);
  let cx = 900, cy = 640;
  const G = window.UDTC_FILM, P = (n) => G.S.players.find((p) => p.name === n);
  const put = () => { cur.style.transform = `translate(${cx}px,${cy}px)`; };
  put();
  window.F = {
    // the callout beside the table; now = no fade (used while the camera isn't rolling)
    call(title, sub, top, now) {
      const set = () => { call.innerHTML = `<b>${title}</b><span>${sub}</span>`; call.style.top = (top || 220) + 'px'; call.style.opacity = 1; };
      if (now) { call.style.transition = 'none'; set(); void call.offsetWidth; call.style.transition = ''; return; }
      if (call.style.opacity === '1') { call.style.opacity = 0; setTimeout(set, 320); } else set();
    },
    nocall() { call.style.opacity = 0; },
    cursor(x, y, show) { cur.style.transition = 'opacity .25s'; cx = x; cy = y; put(); cur.style.opacity = show === false ? 0 : 1; },
    // glide the pointer to an element (a toy button, a page button) over ms
    to(id, ms, dx, dy) {
      const r = document.getElementById(id).getBoundingClientRect(); cx = r.left + r.width / 2 + (dx || 0); cy = r.top + r.height / 2 + (dy || 0);
      cur.style.transition = `transform ${ms}ms cubic-bezier(.3,.05,.2,1), opacity .25s`; cur.style.opacity = 1; put();
    },
    hide() { cur.style.opacity = 0; },
    ring() { const r = document.createElement('div'); r.className = 'fring'; r.style.left = cx + 'px'; r.style.top = cy + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 600); },
    grab(name, toy) { if (name === 'You') F.ring(); G.grab(P(name), toy); },
    click(id) { F.ring(); document.getElementById(id).click(); },
    // put these cards on top of the hands: rounds[r][seat] = [toy, color]
    deal(rounds) { G.S.players.forEach((p, i) => { p.deck = rounds.map((r) => ({ obj: r[i][0], color: r[i][1] })).concat(p.deck).slice(0, p.deck.length); }); },
    points(list) { const d = { obj: 'bird', color: 'pink' }; G.S.players.forEach((p, i) => { p.vp = Array.from({ length: list[i] }, () => d); }); },
    next() { G.nextRound(); },
    G
  };
})();
"""

class Shoot:
    def __init__(self, pw):
        prof = os.path.join(BUILD, "profile"); shutil.rmtree(prof, ignore_errors=True)
        self.proc = subprocess.Popen([SHELL, "--user-data-dir=" + prof] + ARGS, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try: urllib.request.urlopen("http://127.0.0.1:9334/json/version"); break
            except Exception: time.sleep(0.1)
        self.b = pw.chromium.connect_over_cdp("http://127.0.0.1:9334")
        self.tick = time.monotonic() * 1000
    def page(self, url=URL):
        bc = self.b.new_browser_cdp_session()
        bc.send("Target.createTarget", {"url": "about:blank", "width": 1280, "height": 720, "enableBeginFrameControl": True})
        time.sleep(0.4)
        ctx = self.b.contexts[0]; self.cdp = ctx.new_cdp_session(ctx.pages[-1])
        self.cdp.send("HeadlessExperimental.enable")
        self.cdp.send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 720, "deviceScaleFactor": 1.5, "mobile": False})
        self.cdp.send("Page.navigate", {"url": url})
        for _ in range(75): self.frame(); time.sleep(0.03)        # let the page, the fonts and the 3D table's textures arrive
        if url != URL: return
        self.js(HELPERS)
        self.js("document.body.insertAdjacentHTML('beforeend','<span style=\"font:600 10px Jost;position:fixed;left:-99px\">a</span><span style=\"font:400 10px Jost;position:fixed;left:-99px\">a</span>')")
        for _ in range(30): self.frame(); time.sleep(0.03)
        if not self.js("document.getElementById('board').classList.contains('gl')"): raise SystemExit("the 3D table did not start")
    def js(self, src):
        r = self.cdp.send("Runtime.evaluate", {"expression": src, "returnByValue": True})
        if "exceptionDetails" in r: raise SystemExit("page error: " + json.dumps(r["exceptionDetails"])[:600])
        return r["result"].get("value")
    def frame(self, save=None):
        done = []
        self.cdp.once("Emulation.virtualTimeBudgetExpired", lambda e: done.append(1))
        self.cdp.send("Emulation.setVirtualTimePolicy", {"policy": "advance", "budget": 1000 / FPS})
        t0 = time.time()
        while not done and time.time() - t0 < 20: self.cdp.send("Runtime.evaluate", {"expression": "1"})
        self.tick += 1000 / FPS
        a = {"frameTimeTicks": self.tick, "interval": 1000 / FPS, "noDisplayUpdates": False}
        if save: a["screenshot"] = {"format": "png"} if save.endswith(".png") else {"format": "jpeg", "quality": 95}
        r = self.cdp.send("HeadlessExperimental.beginFrame", a)
        if save:
            if not r.get("screenshotData"): raise SystemExit("no picture for " + save)
            open(save, "wb").write(base64.b64decode(r["screenshotData"]))
    def run(self, events, first, last, seg=None, ext="jpg"):
        """step frames first..last; events = {frame: js}; frames >= 0 are saved to build/<seg>/ when seg is given"""
        if seg: d = os.path.join(BUILD, seg); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
        for f in range(first, last + 1):
            for src in events.get(f, []): self.js(src)
            self.frame(os.path.join(BUILD, seg, ("%05d." + ext) % f) if seg and f >= 0 else None)
        if seg: print(seg, last + 1, "frames", flush=True)
    def close(self):
        try: self.b.close()
        except Exception: pass
        self.proc.kill()

def ev(*pairs):
    e = {}
    for f, src in pairs: e.setdefault(f, []).append(src)
    return e
def start(sh, opp, paws=False):
    sh.js("document.getElementById('opp%d').click(); document.querySelector('#edSeg [data-v=%s]').click(); document.getElementById('startBtn').click()" % (opp, "paws" if paws else "std"))

# seats: You (near), Katsu (left), Gato (far), Otag (right)
ROUNDS = [
    [["bird", "pink"], ["ball", "orange"], ["fly", "blue"], ["mouse", "yellow"]],     # nothing in its own color: the cat
    [["bird", "blue"], ["ball", "pink"], ["mouse", "yellow"], ["fish", "green"]],     # the green fish
    [["mouse", "green"], ["bird", "yellow"], ["fish", "orange"], ["ball", "blue"]],   # two: the yellow bird and the blue ball
    [["fish", "orange"], ["mouse", "green"], ["fly", "pink"], ["bird", "blue"]],      # decoys: an orange fish, a green mouse; the cat
]
CHANT = 1.29 + 0.26 + 0.05      # from nextRound() to the cards leaving the piles

def main(sh):
    """One game, four rounds (VO 24.0-52.4). Between segments the game runs on unfilmed to the next flip."""
    sh.page(); start(sh, 3); sh.run({}, 0, 12); sh.js("F.deal(%s)" % json.dumps(ROUNDS)); sh.run({}, 0, 20)
    # s1: the table, the chant, the flip; nothing is in its own color, so Gato takes the cat
    s = "s1"
    sh.run(ev((T(s, 26.2), "F.call('Everyone flips at once','“Un, deux, trois, cat!”')"),
              (T(s, 27.55), "F.next()"),
              (T(s, 32.0), "F.call('No toy in its own color','Grab the cat')"),
              (T(s, 34.05), "F.grab('Gato','cat')")), 0, END[s] - SEG[s], s)
    # s2: the green fish is in its own color; I grab it
    s = "s2"; flip = T(s, 35.75) + 2
    sh.run(ev((flip - round(CHANT * FPS), "F.next()"), (-12, "F.call('A toy in its own color','Grab that toy',0,true); F.cursor(640,600,false)"),
              (T(s, 36.9), "F.cursor(640,600)"), (T(s, 37.75), "F.to('toy-fish',520,4,6)"), (T(s, 38.35), "F.grab('You','fish')"),
              (T(s, 39.0), "F.to('toy-cat',900,150,190)")), flip - round(CHANT * FPS) - 20, END[s] - SEG[s], s)
    # s3: two right answers, and I take both
    s = "s3"
    sh.run(ev((flip - round(CHANT * FPS), "F.next()"), (-12, "F.call('Two toys in their own colors','Grab both if you’re fast enough',0,true)"),
              (T(s, 41.65), "F.to('toy-bird',520,4,6)"), (T(s, 42.25), "F.grab('You','bird')"),
              (T(s, 42.75), "F.to('toy-ball',480,4,6)"), (T(s, 43.3), "F.grab('You','ball')"),
              (T(s, 44.0), "F.to('toy-cat',900,160,200)"), (T(s, 44.9), "F.hide()")), flip - round(CHANT * FPS) - 20, END[s] - SEG[s], s)
    # s4: decoys. Gato grabs the orange fish (wrong) and loses a point; Katsu takes the cat
    s = "s4"
    sh.run(ev((flip - round(CHANT * FPS), "F.next()"), (-12, "F.call('Decoy colors','A green mouse points to the fish',0,true)"),
              (T(s, 47.45), "F.call('Wrong grab','Out for the round, and you lose a point')"), (T(s, 47.75), "F.grab('Gato','fish')"),
              (T(s, 49.75), "F.grab('Katsu','cat')")), flip - round(CHANT * FPS) - 20, END[s] - SEG[s], s)

def six(sh):
    """Six players, one frantic round (VO 52.5-57.0): three right toys, four grabs inside a second."""
    sh.page(); start(sh, 5); sh.run({}, 0, 12); s = "s5"
    cards = [[["fly", "pink"], ["fish", "green"], ["mouse", "orange"], ["ball", "blue"], ["bird", "yellow"], ["fly", "green"]]]
    sh.js("F.deal(%s); F.points([3,2,4,1,2,3]); F.G.S.round = 6; F.G.S.players.forEach(p => p.deck.length = 5)" % json.dumps(cards))
    flip = T(s, 53.15)
    sh.run(ev((flip - round(CHANT * FPS), "F.next()"), (-10, "F.call('Every flip is a scramble','Everyone grabs at once',0,true)"),
              (T(s, 54.3), "F.grab('Oyako','bird')"), (T(s, 54.42), "F.grab('Johnson','mouse')"), (T(s, 54.62), "F.grab('Katsu','fish')"),
              (T(s, 54.9), "F.grab('Otag','ball')")), flip - round(CHANT * FPS) - 20, END[s] - SEG[s], s)

def end(sh):
    """The result, then straight into another game (VO 57.0-62.2)."""
    sh.page(); start(sh, 3); sh.run({}, 0, 12); s = "s6"
    sh.js("F.points([7,3,2,2]); F.G.S.stats = {times:[1.32,1.62,1.71,1.44,1.9,1.38,1.55], miss:0}; F.G.finish(F.G.S.players[0]); F.cursor(820,520,false)")
    sh.run(ev((-8, "F.call('Nobody stops at one game','The decoys get everyone eventually',606,true)"),
              (T(s, 58.0), "F.cursor(820,520)"), (T(s, 58.6), "F.to('againBtn',640,6,6)"), (T(s, 59.45), "F.click('againBtn')"),
              (T(s, 59.9), "F.to('toy-cat',800,330,150)"), (T(s, 60.15), "F.next()"), (T(s, 60.8), "F.hide()")), -20, END[s] - SEG[s], s)

def paws(sh):
    """The Cat Paw edition (VO 70.9-75.6): I bat the fish home, Otag bats the ball."""
    sh.page(); start(sh, 3, True); sh.run({}, 0, 12); s = "s7"
    cards = [[["mouse", "yellow"], ["fish", "green"], ["bird", "orange"], ["ball", "blue"]]]
    sh.js("F.deal(%s); F.points([2,1,2,1]); F.G.S.round = 4; F.cursor(640,600,false)" % json.dumps(cards))
    flip = 3
    sh.run(ev((flip - round(CHANT * FPS), "F.next()"),
              (-10, "F.call('Optional: the Cat Paw edition','Everyone gets a cat paw on a stick. No hands: bat the toys to yourself.',0,true)"),
              (T(s, 71.5), "F.cursor(640,600)"), (T(s, 71.75), "F.to('toy-fish',500,4,6)"), (T(s, 72.3), "F.grab('You','fish')"),
              (T(s, 72.9), "F.to('toy-cat',900,150,190)"), (T(s, 73.15), "F.grab('Otag','ball')"), (T(s, 74.0), "F.hide()")),
           flip - round(CHANT * FPS) - 20, END[s] - SEG[s], s)

def explain(sh):
    """Not gameplay: the toys that appear over the explainer board (overlay.html), as see-through frames from 19.4 s.
    VO: "when you see a toy in its own color, grab it" 19.4; "if nothing's in its own color? Grab the cat" 21.8."""
    sh.page(URL.split("/play/")[0] + "/video/src/overlay.html")
    sh.cdp.send("Emulation.setDefaultBackgroundColorOverride", {"color": {"r": 0, "g": 0, "b": 0, "a": 0}})
    s = "x1"
    sh.run(ev((T(s, 19.45), "document.getElementById('mouse').className = 'on'"), (T(s, 21.75), "document.getElementById('cat').className = 'on'")),
           0, END[s] - SEG[s], s, "png")

TAKES = {"main": main, "six": six, "end": end, "paws": paws, "explain": explain}
if __name__ == "__main__":
    os.makedirs(BUILD, exist_ok=True)
    for name in (sys.argv[1:] or list(TAKES)):
        with sync_playwright() as pw:
            sh = Shoot(pw)
            try: TAKES[name](sh)
            finally: sh.close()
