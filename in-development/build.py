#!/usr/bin/env python3
"""Builds the In Development pages from the data below: python3 in-development/build.py
Writes in-development/index.html and in-development/<slug>/index.html. Edit the copy, specs and
feedback questions here, not in the generated HTML."""
import json, os, html
ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://darrendon.com'
V = lambda f: __import__('hashlib').md5(open(os.path.join(ROOT, '..', 'assets', 'css', f), 'rb').read()).hexdigest()[:8]
e = html.escape
ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

GAMES = [
  dict(slug='slipstream', title='Slipstream', cls='d-slip',
       hook='A game of chicken. Race to the cliff edge, and the rider who stops closest without going over wins.',
       card='Everyone picks the same few speed cards in secret. Play one fast and hope nobody else did, or play it safe. Slipstreams can carry you right off the edge.',
       specs=[('Players', '3–6'), ('Time', '15–20 min'), ('Genre', 'Racing · Simultaneous Selection')],
       now='Whether reading what your rivals picked is the fun part, and whether slipstreams make races swing enough without feeling random.',
       steps=[('Pick in secret', 'Everyone has the same six speed cards. Before each race, pick three of them in secret. Each seat starts a different distance from the edge, so everyone can see roughly how far each rider wants to go.'),
              ('Lead a card', 'In turn, lead one of your picked cards and say whether you play it <b>risky</b> or <b>safe</b>. Everyone else who picked the same card must play it too, risky or safe.'),
              ('Caught', 'Safe moves the small number. Risky moves the big number, but only for the last rider to play that card risky. Anyone who went risky before them is caught and moves just 1.'),
              ('The road', 'Land exactly on a boost and move 1 more. Land on a pothole and drop back 2.'),
              ('Slipstream', 'Finish right behind another rider and you slipstream past them to the next open space. Every move can trigger it, and it can carry you over the edge.'),
              ('Closest wins', 'When every card is played, the rider closest to the edge without going over wins the race. First to two race wins takes the game.')],
       play=dict(modes=[('Play against bots', 'Two to five bots, each reading the road its own way.'), ('Host an online table', 'Up to six people, with a five-letter code. Bots fill empty seats.')]),
       fb=[dict(q='How much fun was it?', type='scale', lo='Not for me', hi='Loved it'),
           dict(q='How often could you guess which cards other riders had picked?', type='scale', lo='Never', hi='Almost always'),
           dict(q='Playing a card risky felt…', type='choice', options=['Never worth it', 'About right', 'Always worth it']),
           dict(q='Did slipstreams make races more exciting, or just more random?', type='scale', lo='Just random', hi='More exciting'),
           dict(q='First to two race wins was…', type='choice', options=['Too short', 'About right', 'Too long']),
           dict(q='What moment from the game stuck with you?', type='text'),
           dict(q='What would you change?', type='text'),
           dict(q='Would you play it again?', type='choice', options=['Yes', 'Maybe', 'No'])]),
  dict(slug='abducted', title='Abducted', cls='d-abd',
       hook='A social deduction game where everyone knows your team except you.',
       card='Your team card faces out in a stand, so everyone else can read it. Vote with your team when half the table is beamed up, and be careful who you believe.',
       specs=[('Players', '5–12'), ('Time', '15–20 min'), ('Genre', 'Social Deduction'), ('Box', 'Tuck box: cards and stands')],
       now='Whether convincing people which side they are on is the fun, and how the game feels at different player counts.',
       steps=[('Face out', 'Everyone’s team card sits in a stand facing away from them: <b>Human</b> or <b>Alien</b>. You can read everyone’s card except your own. A few cards stay face down in the middle, so you can never be completely sure of the count.'),
              ('Possess', 'The leader must possess another player: swap their card for one from the middle without letting them see it. They might have just changed sides.'),
              ('Split', 'The leader splits the whole table, themselves included, into two halves as evenly as possible.'),
              ('Beam up', 'The next player picks which half gets beamed up, then flips one card from the middle for everyone to see.'),
              ('Thumbs', 'Everyone in that half votes at once: thumbs up for Human, thumbs down for Alien. The majority scores a point for that side. A tie scores nothing.'),
              ('Win', 'The first side to 5 points wins, and you win if your card is that side at the end. Talk freely, but never show anyone their own card.')],
       play=dict(modes=[('Play against bots', 'Bots can’t talk you into anything, but they will tell you what they think you are in the chat.'), ('Host an online table', 'Five to twelve people, with a five-letter code. Use the chat or a call for the talking.')]),
       fb=[dict(q='How much fun was it?', type='scale', lo='Not for me', hi='Loved it'),
           dict(q='How sure were you of your own side by the end?', type='scale', lo='No idea', hi='Certain'),
           dict(q='How did the talking feel?', type='choice', options=['Too little to go on', 'About right', 'Too chaotic']),
           dict(q='Was possessing someone every turn fun or a chore?', type='scale', lo='A chore', hi='Fun'),
           dict(q='Did the flipped card from the middle help you work things out?', type='choice', options=['A lot', 'A little', 'Not at all']),
           dict(q='How many players, and how did that count feel?', type='text', rows=2),
           dict(q='Was there a moment you realized you were on the other side?', type='text'),
           dict(q='What would you change?', type='text')]),
  dict(slug='day-one', title='Day One', cls='d-day',
       hook='On the world’s first day, young gods carry earth across an empty sea, raising islands and giving gifts to win the sky’s favour before nightfall.',
       card='Gather earth, then carry the stack across the sea, dropping one disc on every space you enter. Drop earth on a rival’s shrine and the sky rewards your generosity.',
       specs=[('Players', '2–5'), ('Time', '30–45 min'), ('Genre', 'Mancala · Area Majority')],
       now='Whether giving offerings to rivals feels like a real choice, and how planning a walk feels before you commit.',
       steps=[('Gather earth', 'Top up the stack under your god to two discs of one land from the shared supply.'),
              ('Walk the sea', 'Carry the whole stack one space at a time, dropping the bottom disc on each space you enter, and never cross your own path.'),
              ('Give offerings', 'A disc that lands on a rival’s shrine grows their island and their mastery, and earns you a point of favour, so give them what they don’t need.'),
              ('Surge', 'Finish on an unclaimed stack that holds the land you gathered and it surges: take its top disc, add one of yours and walk again, once per turn.'),
              ('Raise a shrine', 'Collect the top disc where you stop and claim the space. When all three spaces around a peak hold shrines, whoever has the most there names it for 3 points.'),
              ('Nightfall', 'When a god can’t gather earth, the game ends. Each land pays 10 to its master and 5 to a clear second, plus stars, favour and peaks.')],
       play=dict(modes=[('Play against bots', 'One to four bots.'), ('Host an online table', 'Two to five gods, with a five-letter code. Bots fill empty seats.')]),
       fb=[dict(q='How much fun was it?', type='scale', lo='Not for me', hi='Loved it'),
           dict(q='How easy was it to plan a walk before committing?', type='scale', lo='Guesswork', hi='I could see exactly what would happen'),
           dict(q='How often did giving an offering feel like a real choice rather than something forced?', type='scale', lo='Never', hi='Almost every turn'),
           dict(q='Which scoring felt most important to chase?', type='choice', options=['Mastery', 'Fallen stars', 'Favour', 'Peaks', 'Couldn’t tell']),
           dict(q='How satisfying were surges when they happened?', type='scale', lo='Barely noticed them', hi='Highlight of my turn'),
           dict(q='Did nightfall arrive when you expected it?', type='choice', options=['Saw it coming', 'Somewhat', 'It surprised me']),
           dict(q='How did the game’s length feel?', type='choice', options=['Too short', 'About right', 'A bit long', 'Dragged']),
           dict(q='What was the most confusing moment, and what one change would you make?', type='text')]),
  dict(slug='polar-bear-market', title='Polar Bear Market', cls='d-pbm',
       hook='Every agent you hire is your money, your muscle on the map and your one-shot trick, and each one only gets used one way.',
       card='Pitch for turn order, then place agents on the floes, spend them to hire stronger ones, or use a specialist’s one-shot trick. Three seasons of area majority.',
       specs=[('Players', '2–5'), ('Time', '45–75 min'), ('Genre', 'Bag Building · Area Majority'), ('Board', 'Seven regions around the Midfloe')],
       now='Whether choosing between placing, spending and activating a tile stays a hard choice, and how crowded the board gets at 4–5 players.',
       steps=[('Pitch', 'Everyone plays a card from 1–5 at once. High cards act first, low cards draw bonus tiles, and in the closing round of each season the order flips.'),
              ('Two different actions', 'Place, Hire or Activate, each once a turn, then draw back up to 5.'),
              ('Place or outbid', 'Open offices in regions within reach, or beat a weaker tile anywhere by paying the difference. The covered tile goes back to its owner.'),
              ('Build your bag', 'Spend tiles as money to hire stronger agents and one-shot specialists. The market grows every season.'),
              ('Score each season', 'Spring pays 1st place in each region, Summer the top two, Autumn the top three. Most VP after Autumn wins.')],
       play=dict(modes=[('Play against bots', 'One to four bots, each weighing every option it has.'), ('Host an online table', 'Two to five players, with a five-letter code. Bots fill empty seats.')]),
       fb=[dict(q='How much fun was it?', type='scale', lo='Not for me', hi='Loved it'),
           dict(q='How often was choosing between placing, spending and activating a tile a hard choice?', type='scale', lo='Never', hi='Every turn'),
           dict(q='How did the pitch cards feel?', type='choice', options=['A real puzzle every round', 'Sometimes interesting', 'Mostly obvious']),
           dict(q='Outbidding gives your rival their tile back. Did attacking feel worth it?', type='choice', options=['Usually', 'Sometimes', 'Rarely']),
           dict(q='How easy was it to tell who was winning each region?', type='scale', lo='Very hard', hi='Very easy'),
           dict(q='The game length was…', type='choice', options=['Too short', 'About right', 'Too long']),
           dict(q='Which specialist did you most want to draw, and why?', type='text', rows=2),
           dict(q='What would you change?', type='text')]),
  dict(slug='2-jibber-2-jabble', title='2 Jibber 2 Jabble', cls='d-jib',
       hook='The sequel to Jibber Jabble. Instead of spelling a clue one letter at a time, your team builds a question one word at a time.',
       card='One player guesses while everyone else builds a question one word at a time. Every question starts with Who, What, When, Where or Why and ends with “hmm?”',
       specs=[('Genre', 'Party · Word'), ('For fans of', 'Jibber Jabble')],
       now='How hard each kind of word feels, so the five words on a card land at the right difficulty.',
       steps=[('Draw a card', 'One player is the guesser. Everyone else sees the card: five words, one each for Who?, What?, When?, Where? and Why?'),
              ('One word each', 'Going around the table, each player adds one word to the question. A Who question starts with “Who”, a Where question with “Where”, and so on.'),
              ('Hmm?', 'Every question ends with “hmm?” Once someone says it, the guesser answers.'),
              ('Next word', 'Get it right and move on to the next word on the card.')],
       example=('Who: Abraham Lincoln', 'Who is on the penny, hmm?'),
       cards=[[('Who?', 'Robin Hood'), ('What?', 'Hourglass'), ('When?', 'Rush Hour'), ('Where?', 'Laundromat'), ('Why?', 'Bad Luck')],
              [('Who?', 'Sherlock Holmes'), ('What?', 'Boomerang'), ('When?', 'Graduation'), ('Where?', 'Submarine'), ('Why?', 'Boredom')],
              [('Who?', 'Amelia Earhart'), ('What?', 'Toaster'), ('When?', 'Thanksgiving'), ('Where?', 'Bowling Alley'), ('Why?', 'Jealousy')]],
       play=None,
       fb=[dict(q='How much fun was it?', type='scale', lo='Not for me', hi='Loved it'),
           dict(q='Which kind of word was hardest to get your guesser to?', type='choice', options=['Who', 'What', 'When', 'Where', 'Why']),
           dict(q='Which kind of word was easiest?', type='choice', options=['Who', 'What', 'When', 'Where', 'Why']),
           dict(q='Did ending every question with “hmm?” add to the fun?', type='scale', lo='Not really', hi='Loved it'),
           dict(q='Did everyone get a fair share of words in?', type='choice', options=['Yes', 'Mostly', 'No']),
           dict(q='How many players, and how did that count feel?', type='text', rows=2),
           dict(q='Any words that were too hard, too easy, or just great?', type='text'),
           dict(q='What would you change?', type='text')]),
]

def head(title, desc, url, img, body_cls=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE}{img}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{SITE}{url}">
<meta property="og:url" content="{SITE}{url}">
<meta property="og:site_name" content="Darren Don, Board Game Designer">
<meta name="goatcounter" content="darrendon">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/jost.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/css/fonts.css?v={V('fonts.css')}">
<link rel="stylesheet" href="/assets/css/site.css?v={V('site.css')}">
<link rel="stylesheet" href="/assets/css/dev.css?v={V('dev.css')}">
</head>
<body{(' class="' + body_cls + '"') if body_cls else ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Darren Don, home">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#E18C0A"/><rect x="17" y="1" width="14" height="14" rx="3.5" fill="#898FA9"/><rect x="1" y="17" width="14" height="14" rx="3.5" fill="#949015"/><rect x="17" y="17" width="14" height="14" rx="3.5" fill="#CD9993"/><circle cx="8" cy="8" r="2.4" fill="#fff"/><circle cx="20.5" cy="4.5" r="2" fill="#fff"/><circle cx="27.5" cy="11.5" r="2" fill="#fff"/><circle cx="4.5" cy="20.5" r="1.8" fill="#fff"/><circle cx="8" cy="24" r="1.8" fill="#fff"/><circle cx="11.5" cy="27.5" r="1.8" fill="#fff"/><circle cx="20.5" cy="20.5" r="1.8" fill="#fff"/><circle cx="27.5" cy="20.5" r="1.8" fill="#fff"/><circle cx="20.5" cy="27.5" r="1.8" fill="#fff"/><circle cx="27.5" cy="27.5" r="1.8" fill="#fff"/></svg>
      <div><b>Darren Don</b><span>Board Game Designer</span></div>
    </a>
    <nav class="nav" aria-label="Main">
      <a href="/games/" aria-current="page">Games</a>
      <a href="/#about">About</a>
      <a href="/contact/">Contact</a>
    </nav>
  </div>
</header>
'''

FOOT = '''
<footer class="site-foot">
  <div class="wrap">
    <span>© 2026 Darren Don · Board Game Designer, Kansas City</span>
    <span><a href="mailto:darren@darrendon.com">darren@darrendon.com</a></span>
  </div>
</footer>
<script src="/assets/js/site.js"></script>
'''

def specs_meta(g): return ''.join(f'<li>{e(v)}{" Players" if k == "Players" else ""}</li>' for k, v in g['specs'] if k in ('Players', 'Time', 'Genre'))
def img(g, name, w=None): return f'/in-development/{g["slug"]}/img/{name}{("-" + str(w)) if w else ""}.webp'

def card(g):
    alt = f'{g["title"]} box front.'
    return f'''      <a class="dev-card {g["cls"]}" href="/in-development/{g["slug"]}/">
        <div class="art"><img src="{img(g, 'box-front', 480)}" srcset="{img(g, 'box-front', 480)} 480w, {img(g, 'box-front')} 900w" sizes="(max-width: 420px) calc(100vw - 40px), (max-width: 760px) 45vw, 260px" width="900" height="900" loading="lazy" alt="{e(alt)}"></div>
        <div class="in">
          <span class="tag">{"Play in your browser" if g["play"] else ("Party game" if g["slug"].startswith("2-") else "In development")}</span>
          <h3>{e(g["title"])}</h3>
          <p>{e(g["card"])}</p>
          <ul class="meta">{specs_meta(g)}</ul>
          <span class="go">{"Play and give feedback" if g["play"] else "See the game"} {ARROW}</span>
        </div>
      </a>'''

def build_index():
    out = head('In Development · Darren Don', 'Games Darren Don is still building: play them in your browser and tell him what you think.', '/in-development/', '/in-development/slipstream/img/scene.webp')
    out += f'''
<main id="main">
  <section class="page-hero wrap dev-hero" aria-labelledby="d-h">
    <p class="label"><a href="/games/" style="color:inherit">Games</a> / In Development</p>
    <h1 id="d-h">In Development<span class="dot" style="color:var(--orange)">.</span></h1>
    <p class="lede">Games I’m still building. Most of them are playable in your browser, against bots or with friends at an online table. Each page ends with a few questions, and your answers come straight to me.</p>
  </section>
  <section class="section wrap" style="padding-top:clamp(12px,2vw,24px)" aria-label="Games in development">
    <div class="dev-grid">
{chr(10).join(card(g) for g in GAMES)}
    </div>
  </section>
  <section class="wrap" aria-labelledby="cta-h">
    <div class="band">
      <div>
        <h2 id="cta-h">Want to play one at your table?</h2>
        <p>I can send a print-and-play kit for any of these.</p>
      </div>
      <div class="actions">
        <a class="btn yellow" href="mailto:darren@darrendon.com?subject=Print-and-play%20kit">Request a kit</a>
        <a class="btn" href="/games/">Finished games</a>
      </div>
    </div>
  </section>
</main>
''' + FOOT + '</body>\n</html>\n'
    open(os.path.join(ROOT, 'index.html'), 'w').write(out)

def build_game(g):
    url = f'/in-development/{g["slug"]}/'
    out = head(f'{g["title"]} · In Development · Darren Don', g['hook'], url, img(g, 'scene'), 'dev ' + g['cls'])
    specs = ''.join(f'<div class="spec"><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in g['specs'])
    acts = []
    if g['play']: acts.append('<a class="btn accent" href="#play">Play in your browser</a>')
    acts.append(f'<a class="btn{"" if g["play"] else " accent"}" href="#feedback">Give feedback</a>')
    acts.append(f'<a class="btn" href="mailto:darren@darrendon.com?subject={e(g["title"].replace(" ", "%20"))}%20print-and-play%20kit">Request a kit</a>')
    nav = ['<a href="#how">How it plays</a>']
    if g['play'] or g.get('play_soon'): nav.append('<a href="#play">Play</a>')
    nav.append('<a href="#feedback">Feedback</a>')
    out += f'''
<main id="main">
  <div class="wrap crumbs"><a href="/games/">Games</a> / <a href="/in-development/">In Development</a> / {e(g["title"])}</div>
  <section class="wrap d-hero" aria-labelledby="t">
    <div>
      <span class="tag">In development</span>
      <h1 id="t">{e(g["title"])}</h1>
      <p class="hook">{e(g["hook"])}</p>
      <dl>{specs}</dl>
      <div class="actions">{"".join(acts)}</div>
    </div>
    <figure class="boxart"><img src="{img(g, 'box-front')}" srcset="{img(g, 'box-front', 480)} 480w, {img(g, 'box-front')} 900w" sizes="(max-width: 820px) 300px, 420px" width="900" height="900" fetchpriority="high" alt="{e(g["title"])} box front, by Darren Don."></figure>
  </section>

  <section class="d-sec" id="how" aria-labelledby="how-h">
    <div class="wrap">
      <div class="head"><div><p class="label">How it plays</p><h2 id="how-h">The rules in brief</h2></div></div>
      <ol class="steps">{"".join(f"<li><span class=\"t\">{e(t)}</span>{d}</li>" for t, d in g["steps"])}</ol>'''
    if g.get('example'):
        out += f'\n      <p class="example">{e(g["example"][0])} → <q>{e(g["example"][1])}</q></p>'
    if g.get('cards'):
        out += '\n      <h3 style="margin:28px 0 12px;font-size:20px">Sample cards</h3>\n      <div class="qcards">' + ''.join('<dl class="qcard">' + ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in c) + '</dl>' for c in g['cards']) + '</div>'
    out += f'''
      <p class="d-now" style="margin-top:22px"><b>What I’m looking at right now:</b> {e(g["now"])}</p>
    </div>
  </section>
'''
    if g['play']:
        modes = ''.join(f'<li><span class="t">{e(t)}</span>{e(d)}</li>' for t, d in g['play']['modes'])
        out += f'''
  <section class="d-sec" id="play" aria-labelledby="pl-h">
    <div class="wrap">
      <div class="head"><div><p class="label">Play</p><h2 id="pl-h">Play it now</h2></div><p>Then scroll down and tell me how it went.</p></div>
      <ol class="steps" style="margin-bottom:18px">{modes}</ol>
      <div class="play-frame" id="frame"><iframe src="{url}play/" title="{e(g["title"])}, playable in your browser" loading="lazy" allow="fullscreen; clipboard-write"></iframe></div>
      <div class="play-meta">
        <div class="actions"><button class="btn" type="button" id="fs">Full screen</button><a class="btn" href="{url}play/" target="_blank" rel="noopener">Open in a new tab</a></div>
      </div>
    </div>
  </section>
'''
    elif g.get('play_soon'):
        out += f'''
  <section class="d-sec" id="play" aria-labelledby="pl-h">
    <div class="wrap">
      <div class="head"><div><p class="label">Play</p><h2 id="pl-h">Play it in your browser</h2></div><p>The browser version is on its way. Until then, I’m happy to send a print-and-play kit.</p></div>
    </div>
  </section>
'''
    fbj = json.dumps(g['fb'], ensure_ascii=False).replace('</', '<\\/')
    others = ''.join(f'<a class="dev-mini {o["cls"]}" href="/in-development/{o["slug"]}/"><img src="{img(o, "scene", 640)}" alt="" loading="lazy" width="640" height="400"><b>{e(o["title"])}</b><span>{" · ".join(v + (" Players" if k == "Players" else "") for k, v in o["specs"] if k in ("Players", "Genre"))}</span></a>' for o in GAMES if o is not g)
    out += f'''
  <section class="d-sec" id="feedback" aria-labelledby="fb-h">
    <div class="wrap">
      <div class="head"><div><p class="label">Feedback</p><h2 id="fb-h">How did it go?</h2></div><p>{"Played it? " if g["play"] else "Played it at your table? "}Answer whatever you like and send it straight to me. Honest is more useful than nice.</p></div>
      <form class="fb" data-game="{e(g["title"])}"><script type="application/json">{fbj}</script></form>
    </div>
  </section>

  <section class="d-sec" aria-labelledby="more-h">
    <div class="wrap">
      <div class="head"><div><p class="label">In Development</p><h2 id="more-h">Also on the workbench</h2></div><a class="btn" href="/in-development/">All of them</a></div>
      <div class="more-dev">{others}</div>
    </div>
  </section>
</main>
''' + FOOT + '''<script src="/assets/js/dev-feedback.js"></script>
<script>
(function(){var f=document.getElementById('frame'),b=document.getElementById('fs');if(!f||!b)return;
b.addEventListener('click',function(){var r=f.requestFullscreen||f.webkitRequestFullscreen;if(r)r.call(f);else location.href=f.querySelector('iframe').src;});})();
</script>
</body>
</html>
'''
    os.makedirs(os.path.join(ROOT, g['slug']), exist_ok=True)
    open(os.path.join(ROOT, g['slug'], 'index.html'), 'w').write(out)

if __name__ == '__main__':
    build_index()
    for g in GAMES: build_game(g)
    print('built', len(GAMES) + 1, 'pages')
