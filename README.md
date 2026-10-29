# darrendon.github.io

Portfolio site for Darren Don, a board game designer in Kansas City. Published with GitHub Pages.

## Pages
- `/` — home: games, how I work with publishers, about
- `/contact/` — contact details and quick-request email links
- `/games/dim-sum-rush/` — sell sheet, 3D component mockups, the playable build (embedded from the `dim-sum-rush` repo's Pages site at `/dim-sum-rush/`) and rules in brief
- `/games/boo-who/` — rendered mockups, the playable build with a tutorial (hosted in this repo at `/games/boo-who/play/`), sell sheet, print-and-play PDF and rules in brief
- `/games/too-many-crooks/` — rendered mockups, the playable build with online tables (hosted in this repo at `/games/too-many-crooks/play/`), sell sheet, print-and-play PDF and rules in brief
- `/games/diggers/` — rendered mockups, the playable build against bots (hosted in this repo at `/games/diggers/play/`), the five species, sell sheet, print-and-play PDF and rules in brief
- `/games/down-for-the-count/` — rendered mockups, the playable build against bots (hosted in this repo at `/games/down-for-the-count/play/`), the ten cards and box art, sell sheet, print-and-play PDF and rules in brief
- `/games/un-deux-trois-cat/` — rendered mockups with felt toys, the playable build with a tutorial and easy or hard bots (hosted in this repo at `/games/un-deux-trois-cat/play/`), the five toys and box art, sell sheet, print-and-play PDF and rules in brief

## Assets
- `assets/css/boo-who.css` — Boo Who? skin on top of the shared game-page layout in `dim-sum-rush.css`
- `assets/js/dsr-scene.js` — interactive 3D mockup (three.js r128, vendored in `assets/vendor/`); tiles are domino-thin (bone face on a coloured back). `games/dim-sum-rush/img/src/shoot3d.py check all:800:500 box:600:400 tiles:600:400 bag:600:400` renders each object's silhouette on its own and reports any two that overlap on screen, sit closer than 3 px, or are cut by the frame (every preset passes with zero); `shoot3d.py shoot all:1600:1000:2:hero.png` saves a 2× still
- `assets/img/tex/` — tile, tile-back and box textures drawn from the game's own art (the "by Darren Don" line on `box-top.webp` was added on top of the original texture; the stills in `games/dim-sum-rush/img/` are `DSRScene.mount(el, {view, still: true, pixelRatio: 2})` captures)
- `games/dim-sum-rush/sell-sheet.html` — source for `dim-sum-rush-sell-sheet.pdf` (print to PDF at US Letter landscape, backgrounds on)
- `games/dim-sum-rush/print-and-play.html` — source for `dim-sum-rush-print-and-play.pdf` (US Letter portrait, no margins, backgrounds on): three rules pages, then ten sheets of nine cards, each followed by its backs mirrored for a long-edge duplex flip. Pages 1–3 are `dim-sum-rush-rules.pdf`. Card art is the tile textures in `assets/img/tex/`
- `games/boo-who/sell-sheet.html` — source for `boo-who-sell-sheet.pdf` (US Letter landscape, no margins, backgrounds on)
- `games/boo-who/img/src/` — the Boo Who? deck box art: `box-top.html`, `box-side.html`, `box-end.html` (rendered to `tex/`)
- `games/boo-who/img/src/render/` — the Boo Who? mockups: `render.html` is a small WebGL renderer (no libraries) with every scene in it; `python3 shoot3d.py c_box c_kit c_table c_deluxe` renders `render-box`, `render-kit`, `render-table` and `render-deluxe` into `out/` (convert to webp for `img/`). `python3 check3d.py <scenes>` draws each object's silhouette on its own and reports any two that overlap on screen, sit closer than 3 px, or touch the frame edge: every published render passes with zero. `card-faces.html` and `card-back.html` are the SVG card art; the Poppins and Lora fonts in `fonts/` are SIL Open Font License
- `games/boo-who/play/index.html` — built from a single-file source with the card art inlined; it includes a scripted tutorial round (`TUT` in the script) and the three-round night
- `games/too-many-crooks/sell-sheet.html` — source for `too-many-crooks-sell-sheet.pdf` (same print settings)
- `games/too-many-crooks/img/src/` — sources for the Too Many Crooks! mockups: `scene.html` (three.js stills, `?scene=hero|table|kit`), the box and crew-sheet art it textures from, and the rendered textures in `tex/`
- `games/too-many-crooks/play/engine.js` — the rules engine and bots; it also runs in node, so bot-only games can be checked headless
- `assets/css/diggers.css` — Diggers skin on top of the shared game-page layout
- `games/diggers/sell-sheet.html` and `games/diggers/print-and-play.html` — sources for the two Diggers PDFs (sell sheet: US Letter landscape; print-and-play: US Letter portrait; no margins, backgrounds on)
- `games/diggers/img/src/` — sources for the Diggers mockups: `scene.html` (three.js stills, `?scene=hero|table|kit`), the box, field-guide and marker art, `fossil-art.js` (draws the six skeleton slabs every card face is cut from) and `card-print.js` (composes print-ready faces with bleed); rendered textures in `tex/`
- Diggers production spec the art is drawn to: dig-site boards are 63 × 22 mm punchboard strips (four make one card-sized layer) and the box is a 66 × 92 × 32 mm poker-card tuck box. `img/og.jpg` is `render-hero` scaled to 1200 wide and cropped to rows 60–690
- `games/diggers/play/index.html` — the playable build; its script also runs in node (`module.exports`), so bot-only games can be checked headless
- `assets/css/down-for-the-count.css` — Down for the Count skin on top of the shared game-page layout
- `games/down-for-the-count/sell-sheet.html` and `games/down-for-the-count/print-and-play.html` — sources for the two Down for the Count PDFs (sell sheet: US Letter landscape; print-and-play: US Letter portrait; no margins, backgrounds on)
- `games/down-for-the-count/img/src/` — sources for the Down for the Count art: `toon.py` (the cartoon cast: bean-bodied wrestlers with rubber-hose limbs, drawn as SVG), `moves.py` (the ten move illustrations), `cards.py` (card faces, card back, box, box sides and sell-sheet art; `python3 cards.py faces`, `back`, `box`, then `site` and `sheetart`) with helpers in `art_helpers.py`; `scene.html` (three.js stills, `?scene=hero|table|kit|home`); rendered textures in `tex/`
- `games/down-for-the-count/play/engine.js` — the rules engine and two bots: `botAction` (quick heuristic, the "Casual" setting) and `smartAction` (the "Tough" setting: samples the hidden cards consistent with public information, plays each candidate out with the heuristic bots and picks the best average finish). It also runs in node, so bot-only matches can be checked headless
- Fonts are self-hosted Latin subsets (SIL Open Font License): Archivo, Instrument Sans, IBM Plex Mono, Fraunces (Dim Sum Rush titles, 900 soft instance), Bagel Fat One (Dim Sum Rush tile numerals), Figtree, Oswald, Courier Prime, Rye, IM Fell English, Spectral

- `assets/css/un-deux-trois-cat.css` — Un, Deux, Trois, Cat! skin on top of the shared game-page layout
- `games/un-deux-trois-cat/sell-sheet.html` and `games/un-deux-trois-cat/print-and-play.html` — sources for the two Un, Deux, Trois, Cat! PDFs (sell sheet: US Letter landscape; print-and-play: US Letter portrait; no margins, backgrounds on). `img/src/pdfs.py` prints both, splits pages 1–2 into the rules PDF and saves the previews
- `games/un-deux-trois-cat/img/src/` — sources for the Un, Deux, Trois, Cat! art: `toy-art.js` (the painted toys and the 60-card deck: per toy, 3 in its own color, 3 in one other color, 2 in each of the rest; shared by the cards, box, kit and the playable build), `art.html` (card faces, card back, box lid, side and end), `scene.html` (three.js stills with the felt toys, `?scene=hero|table|kit|home|og`). `python3 shoot.py art` renders the flat art, `python3 shoot.py scene hero table kit home og` the stills, and `python3 shoot.py check hero table kit home og` draws each object's silhouette alone and reports overlaps, near misses (< 3 px) and frame cuts: every published render passes with zero. `img/qr.svg` was generated with LaTeX's qrcode package
- `games/un-deux-trois-cat/play/index.html` — the playable build: one file, toy art inlined. Players sit around the table with their pile and flipped card in front of them and the toys in the middle; `place()` lays it out (an oval on wide screens, a long table on narrow ones) and shrinks cards and toys until nothing overlaps or leaves the board; it includes a coached tutorial (`TUT` in the script: an intro to the toys, four rounds the bots wait out, then one at full speed), opened by `?tutorial`
- `assets/css/home-games.css` — the per-game rules the homepage cards use, pulled out of the six game stylesheets so the homepage doesn't load all of them. Regenerate it after changing a game skin (it is an exact extract: the homepage renders pixel-identical with the full stylesheets)
- `games/<game>/<game>-rules.pdf` — the rules pages of each print-and-play kit as their own PDF (Boo Who? pages 1–3, Diggers 1–2, Dim Sum Rush 1–3, Down for the Count 1–2, Too Many Crooks! 1–3, Un, Deux, Trois, Cat! 1–2). Rebuild after changing a kit
- `games/*/img/qr*.svg` — sell-sheet QR codes; each points at `https://darrendon.com/games/<game>/`
- Homepage card images have `-640` and `-1200` versions served through `srcset`; regenerate them when a card image changes
- `robots.txt`, `sitemap.xml` (update `lastmod` and add new game pages), canonical and Open Graph tags on every page use `https://darrendon.com`
- Analytics: GoatCounter, off until `<meta name="goatcounter" content="">` on each page holds the account code. `assets/js/site.js` then loads the counter and records PDF downloads, email clicks and the first click into a playable build. Add `?ref=<publisher>` to links in pitch emails to see who opened them

## Adding a game
Copy `games/dim-sum-rush/` to `games/<new-game>/`, update the copy and images, add a card to the Games section of `index.html`, add the page to `sitemap.xml`, add it to every game page's "More games" row, give its build a `?tutorial` deep link, and regenerate `assets/css/home-games.css`.

Game-page images over ~2x their display size have `-240/-480/-800/-1200` copies served through `srcset`; regenerate those copies whenever the full-size image changes.
