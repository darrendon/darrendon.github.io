// Captures the playable at 1920x1080 (a 1280x720 layout at 1.5x) in each state the pitch video shows.
// Plays bot games at a 7-player table until it has every shot: split (you're the Town Leader, a split picked),
// vote, signal (you're searching), abduct (you're the Lookout, a searcher picked), note (you were abducted) and over.
// usage: node capture.js   (site served on :8124)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/captures/';
fs.mkdirSync(OUT, { recursive: true });
const want = new Set(['split', 'vote', 'signal', 'abduct', 'note', 'over']);
(async () => {
  const b = await chromium.launch();
  for (let game = 0; game < 30 && want.size; game++) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
    await p.goto('http://localhost:8124/games/abducted/play/');
    await p.fill('#dt-name', 'Darren'); await p.selectOption('#dt-l-n', '7'); await p.click('#dt-l-start');
    await p.waitForTimeout(900);
    const shot = async (n) => { if (!want.has(n)) return; await p.waitForTimeout(700); await p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 92 }); want.delete(n); console.log('shot', n, 'game', game); };
    for (let i = 0; i < 600; i++) {
      const st = await p.textContent('#dt-status');
      if (/win$/.test(st)) { await shot('over'); break; }
      if (await p.$('.panel.note')) await shot('note');
      if (await p.$('[data-do="split"]')) {
        const seats = p.locator('button.seat'); await seats.nth(Math.min(2, (await seats.count()) - 1)).click();
        await shot('split'); await p.click('[data-do="split"]');
      } else if (await p.$('[data-do="vote"]')) {
        await shot('vote'); await p.click('[data-do="vote"][data-v="' + (1 + (i % 2)) + '"]');
      } else if (await p.$('[data-do="sig"]')) {
        await shot('signal'); await p.click('[data-do="sig"][data-v="' + (i % 3 ? 'J' : 'T') + '"]');
      } else if (await p.$('[data-do="abduct"]')) {
        await p.locator('button.seat').first().click(); await shot('abduct'); await p.click('[data-do="abduct"]');
      }
      await p.waitForTimeout(300);
    }
    await p.close();
  }
  console.log('missing:', [...want].join(', ') || 'none');
  await b.close();
})();
