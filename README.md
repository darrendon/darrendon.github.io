# darrendon.github.io

Portfolio site for Darren Don, board game designer at What's Good Board Games. Published with GitHub Pages.

## Pages
- `/` — home: games, how I work with publishers, about
- `/contact/` — contact details and quick-request email links
- `/games/dim-sum-rush/` — sell sheet, 3D component mockups, the playable build (embedded from the `dim-sum-rush` repo's Pages site at `/dim-sum-rush/`) and rules in brief

## Assets
- `assets/js/dsr-scene.js` — interactive 3D mockup (three.js r128, vendored in `assets/vendor/`)
- `assets/img/tex/` — tile, tile-back and box textures drawn from the game's own art
- `games/dim-sum-rush/sell-sheet.html` — source for `dim-sum-rush-sell-sheet.pdf` (print to PDF at US Letter landscape, backgrounds on)
- Fonts are self-hosted Latin subsets (SIL Open Font License): Archivo, Instrument Sans, IBM Plex Mono, Bagel Fat One, Figtree

## Adding a game
Copy `games/dim-sum-rush/` to `games/<new-game>/`, update the copy and images, and add a card to the Games section of `index.html`.
