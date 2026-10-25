# darrendon.github.io

Portfolio site for Darren Don, board game designer at What's Good Board Games. Published with GitHub Pages.

## Pages
- `/` — home: games, how I work with publishers, about
- `/contact/` — contact details and quick-request email links
- `/games/dim-sum-rush/` — sell sheet, 3D component mockups, the playable build (embedded from the `dim-sum-rush` repo's Pages site at `/dim-sum-rush/`) and rules in brief
- `/games/boo-who/` — rendered mockups, the playable build (hosted in this repo at `/games/boo-who/play/`), sell sheet, print-and-play PDF and rules in brief
- `/games/too-many-crooks/` — rendered mockups, the playable build with online tables (hosted in this repo at `/games/too-many-crooks/play/`), sell sheet, print-and-play PDF and rules in brief
- `/games/diggers/` — rendered mockups, the playable build against bots (hosted in this repo at `/games/diggers/play/`), the six species, sell sheet, print-and-play PDF and rules in brief
- `/games/down-for-the-count/` — rendered mockups, the playable build against bots (hosted in this repo at `/games/down-for-the-count/play/`), the ten cards and box art, sell sheet, print-and-play PDF and rules in brief

## Assets
- `assets/css/boo-who.css` — Boo Who? skin on top of the shared game-page layout in `dim-sum-rush.css`
- `assets/js/dsr-scene.js` — interactive 3D mockup (three.js r128, vendored in `assets/vendor/`)
- `assets/img/tex/` — tile, tile-back and box textures drawn from the game's own art (the "by Darren Don" line on `box-top.webp` was added on top of the original texture; the stills in `games/dim-sum-rush/img/` are `DSRScene.mount(el, {view, still: true, pixelRatio: 2})` captures)
- `games/dim-sum-rush/sell-sheet.html` — source for `dim-sum-rush-sell-sheet.pdf` (print to PDF at US Letter landscape, backgrounds on)
- `games/boo-who/sell-sheet.html` — source for `boo-who-sell-sheet.pdf` (same print settings)
- `games/boo-who/img/src/` — the Boo Who? deck box: `box-top.html`, `box-side.html`, `box-end.html` (rendered to `tex/`) and `scene.html` (three.js still for `render-box.webp`). The lid in `render-kit.webp` and `sheet-render.jpg` was painted in from `tex/box-top.jpg`, since that scene's source isn't in this repo
- `games/too-many-crooks/sell-sheet.html` — source for `too-many-crooks-sell-sheet.pdf` (same print settings)
- `games/too-many-crooks/img/src/` — sources for the Too Many Crooks! mockups: `scene.html` (three.js stills, `?scene=hero|table|kit`), the box and crew-sheet art it textures from, and the rendered textures in `tex/`
- `games/too-many-crooks/play/engine.js` — the rules engine and bots; it also runs in node, so bot-only games can be checked headless
- `assets/css/diggers.css` — Diggers skin on top of the shared game-page layout
- `games/diggers/sell-sheet.html` and `games/diggers/print-and-play.html` — sources for the two Diggers PDFs (sell sheet: US Letter landscape; print-and-play: US Letter portrait; no margins, backgrounds on)
- `games/diggers/img/src/` — sources for the Diggers mockups: `scene.html` (three.js stills, `?scene=hero|table|kit`), the box, field-guide and marker art, `fossil-art.js` (draws the six skeleton slabs every card face is cut from) and `card-print.js` (composes print-ready faces with bleed); rendered textures in `tex/`
- `games/diggers/play/index.html` — the playtest build; its script also runs in node (`module.exports`), so bot-only games can be checked headless
- `assets/css/down-for-the-count.css` — Down for the Count skin on top of the shared game-page layout
- `games/down-for-the-count/sell-sheet.html` and `games/down-for-the-count/print-and-play.html` — sources for the two Down for the Count PDFs (sell sheet: US Letter landscape; print-and-play: US Letter portrait; no margins, backgrounds on)
- `games/down-for-the-count/img/src/` — sources for the Down for the Count art: `scene.html` (three.js stills, `?scene=hero|table|kit`), `cards.py` (draws the card faces, box and box sides with PIL; `python3 cards.py`, `cards.py box`, `cards.py site`) with its helpers in `art_helpers.py`; rendered textures in `tex/`
- `games/down-for-the-count/play/engine.js` — the rules engine and two bots: `botAction` (quick heuristic, the "Casual" setting) and `smartAction` (the "Tough" setting: samples the hidden cards consistent with public information, plays each candidate out with the heuristic bots and picks the best average finish). It also runs in node, so bot-only matches can be checked headless
- Fonts are self-hosted Latin subsets (SIL Open Font License): Archivo, Instrument Sans, IBM Plex Mono, Bagel Fat One, Figtree, Oswald, Courier Prime, Rye, IM Fell English, Spectral

## Adding a game
Copy `games/dim-sum-rush/` to `games/<new-game>/`, update the copy and images, and add a card to the Games section of `index.html`.
