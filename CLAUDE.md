# Working on darrendon.com

- In a fresh clone, run `git config core.hooksPath .githooks` once so the layout check runs on every commit that touches a page or stylesheet.
- Before pushing any change to a page or a stylesheet, run `node tools/check-layout.js` and fix everything it reports. Darren's friends view the site in Safari, and overlapping text on the home page game cards has shipped more than once.
- Don't use CSS `subgrid` anywhere on the site's pages, and keep game card text in normal flow (no absolute positioning, negative margins or fixed heights). See "Layout check" in README.md.
- Commit with the attribution lines the session gives you; fetch and rebase before pushing, since other sessions push to this repo too.
