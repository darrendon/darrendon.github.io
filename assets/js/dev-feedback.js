/* Feedback form for the In Development pages.
   <form class="fb" data-game="Slipstream"> holds <script type="application/json"> with the questions:
     [{ "q": "How did it feel?", "type": "scale", "lo": "Flat", "hi": "Loved it" },
      { "q": "Which player count?", "type": "choice", "options": ["2","3","4"] },
      { "q": "What would you change?", "type": "text" }]
   Sending opens an email to Darren in the tester's own mail app with the answers filled in;
   "Copy my answers" is there for anyone without a mail app set up. */
(function () {
  'use strict';
  const TO = 'darren@darrendon.com';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  document.querySelectorAll('form.fb').forEach((form, fi) => {
    const game = form.dataset.game || 'a game';
    const src = form.querySelector('script[type="application/json"]');
    let qs = []; try { qs = JSON.parse(src.textContent); } catch (e) { return; }
    const id = (i) => 'fb' + fi + '-' + i;
    let h = '<ol class="fb-qs">';
    qs.forEach((q, i) => {
      h += '<li class="fb-q"><fieldset><legend>' + esc(q.q) + '</legend>';
      if (q.type === 'scale') {
        h += '<div class="fb-scale" role="radiogroup">';
        for (let n = 1; n <= 5; n++) h += '<label><input type="radio" name="' + id(i) + '" value="' + n + '"><span>' + n + '</span></label>';
        h += '</div><div class="fb-ends"><span>' + esc(q.lo || '') + '</span><span>' + esc(q.hi || '') + '</span></div>';
      } else if (q.type === 'choice') {
        h += '<div class="fb-choices">' + q.options.map((o) => '<label><input type="' + (q.multi ? 'checkbox' : 'radio') + '" name="' + id(i) + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>').join('') + '</div>';
      } else {
        h += '<textarea name="' + id(i) + '" rows="' + (q.rows || 3) + '" placeholder="' + esc(q.ph || '') + '"></textarea>';
      }
      h += '</fieldset></li>';
    });
    h += '<li class="fb-q"><fieldset><legend>Your name and how you played <span>(optional)</span></legend><div class="fb-two"><input name="' + id('who') + '" placeholder="Name" autocomplete="name"><input name="' + id('how') + '" placeholder="e.g. 4 players online, 2 games"></div></fieldset></li></ol>';
    h += '<div class="fb-send"><button class="btn accent" type="submit">Email my answers</button><button class="btn" type="button" data-copy>Copy my answers</button><p class="fb-note" role="status">Opens an email to Darren with your answers filled in. Skip anything you like.</p></div>';
    src.insertAdjacentHTML('afterend', h);

    const collect = () => {
      const fd = new FormData(form), lines = ['Feedback on ' + game, ''];
      qs.forEach((q, i) => {
        const v = fd.getAll(id(i)).filter(Boolean);
        let a = v.join(', ');
        if (q.type === 'scale' && a) a += ' of 5' + (q.lo ? ' (1 = ' + q.lo + ', 5 = ' + q.hi + ')' : '');
        lines.push((i + 1) + '. ' + q.q, '   ' + (a || '—'), '');
      });
      const who = fd.get(id('who')), how = fd.get(id('how'));
      if (who) lines.push('From: ' + who);
      if (how) lines.push('Played: ' + how);
      return lines.join('\n').trim();
    };
    const note = form.querySelector('.fb-note');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = collect();
      location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Feedback: ' + game) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Your mail app should open with everything filled in. If it didn’t, use “Copy my answers” and email ' + TO + '.';
      if (window.goatcounter && window.goatcounter.count) try { window.goatcounter.count({ path: 'feedback-' + game.toLowerCase().replace(/\W+/g, '-'), event: true }); } catch (e2) {}
    });
    form.querySelector('[data-copy]').addEventListener('click', () => {
      const body = collect();
      const ok = () => { note.textContent = 'Copied. Paste it into an email to ' + TO + '.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(body).then(ok, () => { note.textContent = body; });
      else note.textContent = body;
    });
  });
})();
