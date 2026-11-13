/* Mr. Magpie — the woodland critters, Mr. Magpie himself, his treasures and the baubles, as SVG.
   One source for the playable (play/index.html) and the box art (in-development/img/src/art.html).
   Soft, rounded, painted-looking shapes: gentle gradients, blush cheeks, no hard outlines.
   Every function returns SVG markup; MagpieArt.defs() must be on the page once (inside any <svg>). */
(function (root) {
  'use strict';
  const C = {
    mouse:    { fur: '#B9A08A', dark: '#8F7565', belly: '#F2E5D3', ear: '#EBA9A0', nose: '#D47F76', name: 'Mouse' },
    chipmunk: { fur: '#CB8A4D', dark: '#8A5631', belly: '#F5E3C6', ear: '#E9B38F', nose: '#6B4128', name: 'Chipmunk' },
    hedgehog: { fur: '#EBCFA6', dark: '#7E5B40', belly: '#F4E3C8', ear: '#D9A88A', nose: '#3B2A21', name: 'Hedgehog' },
    rabbit:   { fur: '#D9BD98', dark: '#B39470', belly: '#F7ECDC', ear: '#EEB3A8', nose: '#D98A82', name: 'Rabbit' },
    mole:     { fur: '#6F6461', dark: '#4F4644', belly: '#8B7F7B', ear: '#6F6461', nose: '#E79AA2', name: 'Mole' },
  };
  const SEAT = { mouse: '#8F7565', chipmunk: '#C0763A', hedgehog: '#7E5B40', rabbit: '#B9906A', mole: '#5B5250' };

  function defs() {
    let d = '<defs>';
    for (const [k, c] of Object.entries(C)) {
      d += `<radialGradient id="ne-f-${k}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="${mix(c.fur, '#ffffff', 0.22)}"/><stop offset=".65" stop-color="${c.fur}"/><stop offset="1" stop-color="${mix(c.fur, c.dark, 0.55)}"/></radialGradient>`;
    }
    d += '<radialGradient id="ne-acorn" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#E6B074"/><stop offset=".7" stop-color="#C07F43"/><stop offset="1" stop-color="#93592C"/></radialGradient>' +
      '<linearGradient id="ne-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C6A47"/><stop offset="1" stop-color="#5E4530"/></linearGradient>' +
      '<radialGradient id="ne-gold" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFF0B8"/><stop offset=".55" stop-color="#E2B54E"/><stop offset="1" stop-color="#A97A22"/></radialGradient>' +
      '<radialGradient id="ne-silver" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#C9CDD6"/><stop offset="1" stop-color="#8A90A0"/></radialGradient>' +
      '<radialGradient id="ne-ice" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#BFE3F2"/><stop offset="1" stop-color="#7FB6CE"/></radialGradient>' +
      '<linearGradient id="ne-irid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E4A75"/><stop offset=".5" stop-color="#3F7C86"/><stop offset="1" stop-color="#4F6F3E"/></linearGradient>' +
      '<radialGradient id="ne-berry" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#F08A7A"/><stop offset=".6" stop-color="#C2463B"/><stop offset="1" stop-color="#8E2C26"/></radialGradient>' +
      '<radialGradient id="ne-crow" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#4A4B55"/><stop offset="1" stop-color="#1D1E24"/></radialGradient>' +
      '<filter id="ne-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<filter id="ne-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".35"/></filter>' +
      '</defs>';
    return d;
  }
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* an acorn, centred on 0,0, about 2r tall */
  function acorn(r) {
    r = r || 3;
    return `<g><ellipse cx="0" cy="${r * .25}" rx="${r * .78}" ry="${r * .92}" fill="url(#ne-acorn)"/>` +
      `<path d="M${-r * .95} ${-r * .15} Q0 ${-r * 1.15} ${r * .95} ${-r * .15} Q0 ${r * .12} ${-r * .95} ${-r * .15}Z" fill="url(#ne-cap)"/>` +
      `<path d="M0 ${-r * .7} q${r * .12} ${-r * .45} ${r * .45} ${-r * .55}" stroke="#5E4530" stroke-width="${r * .16}" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="${-r * .28}" cy="${r * .2}" rx="${r * .16}" ry="${r * .32}" fill="#fff" opacity=".35"/></g>`;
  }

  /* the face, centred on 0,0 (head radius 10) */
  function face(k) {
    const c = C[k];
    const eyeY = k === 'mole' ? -0.5 : -1;
    let s = '';
    s += `<ellipse cx="-5.4" cy="2.6" rx="2.3" ry="1.4" fill="#E8907F" opacity=".5"/><ellipse cx="5.4" cy="2.6" rx="2.3" ry="1.4" fill="#E8907F" opacity=".5"/>`;
    if (k === 'mole') s += `<path d="M-4.4 ${eyeY} q1 .8 2 0 M2.4 ${eyeY} q1 .8 2 0" stroke="#2A1E1A" stroke-width=".7" fill="none" stroke-linecap="round"/>`;
    else s += `<circle cx="-3.6" cy="${eyeY}" r="1.3" fill="#2A1C15"/><circle cx="3.6" cy="${eyeY}" r="1.3" fill="#2A1C15"/><circle cx="-3.2" cy="${eyeY - .45}" r=".42" fill="#fff"/><circle cx="4" cy="${eyeY - .45}" r=".42" fill="#fff"/>`;
    if (k === 'mole') s += `<ellipse cx="0" cy="2.6" rx="2.6" ry="1.9" fill="${c.nose}"/><ellipse cx="-.7" cy="2" rx=".7" ry=".45" fill="#fff" opacity=".5"/>`;
    else if (k === 'hedgehog') s += `<ellipse cx="0" cy="2.4" rx="1.5" ry="1.15" fill="${c.nose}"/>`;
    else s += `<ellipse cx="0" cy="1.8" rx="1.15" ry=".85" fill="${c.nose}"/>`;
    s += `<path d="M-1.3 3.6 q1.3 1 1.3 0 q0 1 1.3 0" stroke="${mix(c.dark, '#000000', .2)}" stroke-width=".45" fill="none" stroke-linecap="round"/>`;
    if (k === 'mouse' || k === 'rabbit') s += `<g stroke="${mix(c.dark, '#ffffff', .2)}" stroke-width=".3" stroke-linecap="round" opacity=".8"><path d="M-2.5 2.2 L-8.5 1.2 M-2.5 2.9 L-8.2 3.6 M2.5 2.2 L8.5 1.2 M2.5 2.9 L8.2 3.6"/></g>`;
    return s;
  }

  /* the head with its ears, centred on 0,0 */
  function head(k) {
    const c = C[k], f = `url(#ne-f-${k})`;
    let back = '', front = '';
    if (k === 'mouse') back = `<circle cx="-8" cy="-7.6" r="5.6" fill="${f}"/><circle cx="8" cy="-7.6" r="5.6" fill="${f}"/><circle cx="-8" cy="-7.4" r="3.6" fill="${c.ear}"/><circle cx="8" cy="-7.4" r="3.6" fill="${c.ear}"/>`;
    if (k === 'rabbit') back = `<ellipse cx="-4.2" cy="-15" rx="3" ry="9.5" fill="${f}" transform="rotate(-9 -4.2 -15)"/><ellipse cx="4.6" cy="-15" rx="3" ry="9.5" fill="${f}" transform="rotate(11 4.6 -15)"/><ellipse cx="-4.2" cy="-14.5" rx="1.6" ry="7.2" fill="${c.ear}" transform="rotate(-9 -4.2 -14.5)"/><ellipse cx="4.6" cy="-14.5" rx="1.6" ry="7.2" fill="${c.ear}" transform="rotate(11 4.6 -14.5)"/>`;
    if (k === 'chipmunk') back = `<circle cx="-6.6" cy="-8" r="3.1" fill="${f}"/><circle cx="6.6" cy="-8" r="3.1" fill="${f}"/><circle cx="-6.6" cy="-7.8" r="1.8" fill="${c.ear}"/><circle cx="6.6" cy="-7.8" r="1.8" fill="${c.ear}"/>`;
    if (k === 'hedgehog') {
      let p = '';
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI * (1.02 + i * 0.98 / 16), r = i % 2 ? 11.2 : 14.6;
        p += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r * 0.95 - 1).toFixed(2);
      }
      back = `<path d="${p}Z" fill="${c.dark}"/><path d="${p}Z" fill="#000" opacity=".12" transform="translate(.6 .8)"/><circle cx="-6.5" cy="-7" r="2.2" fill="${c.ear}"/><circle cx="6.5" cy="-7" r="2.2" fill="${c.ear}"/>`;
    }
    let hd = `<circle r="10" fill="${f}"/>`;
    if (k === 'hedgehog') hd = `<ellipse cx="0" cy="1" rx="9.4" ry="8.8" fill="${f}"/>`;
    if (k === 'mole') hd = `<ellipse cx="0" cy="0" rx="10" ry="9.4" fill="${f}"/>`;
    if (k === 'chipmunk') front = `<path d="M0 -10 L0 -4" stroke="${c.dark}" stroke-width="2" stroke-linecap="round"/><path d="M-7.5 -2.5 q3.5 -2 7 0 M.5 -2.5 q3.5 -2 7 0" stroke="#FFF3DE" stroke-width="1" fill="none" opacity=".85" stroke-linecap="round"/><ellipse cx="-5.6" cy="3.4" rx="3.6" ry="2.8" fill="${c.belly}"/><ellipse cx="5.6" cy="3.4" rx="3.6" ry="2.8" fill="${c.belly}"/>`;
    if (k === 'rabbit' || k === 'mouse') front = `<ellipse cx="0" cy="3.2" rx="4.6" ry="3.4" fill="${c.belly}" opacity=".85"/>`;
    if (k === 'hedgehog') front = `<ellipse cx="0" cy="3.2" rx="5.2" ry="3.8" fill="${c.belly}"/>`;
    if (k === 'mole') front = `<ellipse cx="0" cy="3.6" rx="5" ry="3.6" fill="${c.belly}" opacity=".7"/>`;
    return back + hd + front + face(k);
  }

  /* a round seat token: the head on a soft disc */
  function token(k) {
    return `<svg viewBox="-16 -18 32 32" aria-hidden="true">${defs()}<circle cx="0" cy="-2" r="15.5" fill="${mix(SEAT[k], '#ffffff', .72)}"/><g transform="translate(0 ${k === 'rabbit' ? 2.5 : 0}) scale(${k === 'rabbit' ? .78 : .95})">${head(k)}</g></svg>`;
  }

  /* a whole critter standing on 0,0 hugging an acorn; about 46 tall */
  function body(k) {
    const c = C[k], f = `url(#ne-f-${k})`;
    let s = `<ellipse cx="0" cy="0" rx="13" ry="2.6" fill="#4A3020" opacity=".18"/>`;
    if (k === 'mouse') s += `<path d="M8 -5 C18 -4 20 -14 15 -20 C12 -24 16 -28 19 -27" stroke="${c.ear}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    if (k === 'chipmunk') s += `<path d="M7 -4 C20 -6 22 -22 15 -31 C12 -35 8 -33 9 -29 C14 -22 12 -12 6 -10Z" fill="${c.dark}"/><path d="M9 -8 C17 -10 18 -21 14 -28" stroke="${mix(c.dark, '#ffffff', .3)}" stroke-width="1" fill="none"/>`;
    if (k === 'rabbit') s += `<circle cx="10.5" cy="-6" r="3.6" fill="#FBF6EE"/>`;
    if (k === 'hedgehog') {
      let p = '';
      for (let i = 0; i <= 22; i++) {
        const a = -Math.PI * 0.5 + Math.PI * 1.2 * (i / 22) - Math.PI * 0.1, r = i % 2 ? 12.6 : 15.8;
        p += (i ? 'L' : 'M') + (Math.cos(a) * r * 0.95).toFixed(2) + ' ' + (-14 + Math.sin(a) * r).toFixed(2);
      }
      s += `<g transform="scale(-1 1)"><path d="${p}Z" fill="${c.dark}"/></g><path d="${p}Z" fill="${c.dark}"/>`;
    }
    s += `<ellipse cx="-5" cy="-1.8" rx="4.4" ry="2.3" fill="${c.dark}"/><ellipse cx="5" cy="-1.8" rx="4.4" ry="2.3" fill="${c.dark}"/>`;
    s += `<ellipse cx="0" cy="-13.5" rx="11" ry="12.6" fill="${k === 'hedgehog' ? `url(#ne-f-hedgehog)` : f}"/>`;
    s += `<ellipse cx="0" cy="-11.5" rx="7" ry="8.8" fill="${c.belly}" opacity="${k === 'mole' ? .55 : .95}"/>`;
    s += `<g transform="translate(0 -14.5)">${acorn(4.2)}</g>`;
    const paw = k === 'mole' ? c.nose : mix(c.fur, c.dark, .25), pr = k === 'mole' ? 2.9 : 2.3;
    s += `<ellipse cx="-4.4" cy="-15.6" rx="${pr}" ry="${pr * .85}" fill="${paw}"/><ellipse cx="4.4" cy="-15.6" rx="${pr}" ry="${pr * .85}" fill="${paw}"/>`;
    s += `<g transform="translate(0 -32.5)">${head(k)}</g>`;
    return `<g class="ne-critter">${s}</g>`;
  }

  /* Mr. Magpie, standing on 0,0 and facing left, in his top hat, monocle and bow tie */
  function magpie() {
    return `<g class="ne-magpie">
      <path d="M6 -7 L27 3 L25.5 5.5 L4 -3Z" fill="url(#ne-irid)"/>
      <path d="M6 -6.2 L26 3.4" stroke="#1D1E24" stroke-width=".5" opacity=".5"/>
      <ellipse cx="0" cy="-8.5" rx="9.6" ry="6.6" fill="url(#ne-crow)" transform="rotate(-18 0 -8.5)"/>
      <ellipse cx="-2" cy="-6.6" rx="5.6" ry="4" fill="#F4F1EA" transform="rotate(-18 -2 -6.6)"/>
      <path d="M-1 -13 C5 -15 10 -11 10 -6 C6 -6 1 -8 -1 -13Z" fill="url(#ne-irid)"/>
      <path d="M1 -12.4 C5 -13.4 8 -11 9 -8" stroke="#F4F1EA" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="-7.6" cy="-15.4" r="4.7" fill="url(#ne-crow)"/>
      <path d="M-11.8 -16.4 L-17.2 -14.8 L-11.8 -13.6Z" fill="#3A3B42"/>
      <circle cx="-8.8" cy="-16.4" r="1.05" fill="#fff"/><circle cx="-9.05" cy="-16.5" r=".62" fill="#1D1E24"/>
      <path d="M-1.5 -2.6 L-2.6 1.4 M1.6 -2.2 L1.2 1.6" stroke="#2A2B31" stroke-width=".8" stroke-linecap="round"/>
      <path d="M-7.2 -11.2 L-10.4 -12.9 L-10.4 -9.5Z M-7.2 -11.2 L-4 -12.9 L-4 -9.5Z" fill="#B5463A"/><circle cx="-7.2" cy="-11.2" r=".9" fill="#8E2C26"/>
      <circle cx="-8.95" cy="-16.45" r="1.85" fill="none" stroke="url(#ne-gold)" stroke-width=".55"/><path d="M-7.3 -15.6 C-6.4 -13.6 -5.4 -12.6 -4.6 -12.3" stroke="#C9A24A" stroke-width=".3" fill="none"/>
      <ellipse cx="-7.2" cy="-19.4" rx="4.3" ry=".95" fill="#2A2420"/>
      <path d="M-9.8 -19.6 L-9.4 -25.6 C-9.4 -26.2 -5 -26.2 -5 -25.6 L-4.6 -19.6Z" fill="#2E2722"/>
      <path d="M-9.65 -21.2 L-4.75 -21.2 L-4.7 -20.1 L-9.7 -20.1Z" fill="#B5612C"/>
      <path d="M-8.6 -25.2 L-8.4 -21.6" stroke="#fff" stroke-width=".35" opacity=".25" stroke-linecap="round"/>
    </g>`;
  }

  /* baubles, centred on 0,0 in a 20-unit box */
  function bauble(b) {
    if (b === 'earring') return `<g><circle cx="0" cy="-4" r="4" fill="none" stroke="url(#ne-gold)" stroke-width="1.5"/><path d="M0 0 C-3.2 3.6 -3.2 7 0 7.6 C3.2 7 3.2 3.6 0 0Z" fill="#E9E2F2"/><ellipse cx="-1" cy="4.6" rx=".7" ry="1.3" fill="#fff" opacity=".8"/></g>`;
    if (b === 'berry') return `<g><path d="M0 -7 C2 -9 5 -8 6 -6 C3 -5.6 1.4 -6 0 -7Z" fill="#7C9A4C"/><path d="M0 -7 L-2.6 -2 M0 -7 L2.8 -1.6 M0 -7 L0 -1" stroke="#6B5A3A" stroke-width=".6" fill="none"/><circle cx="-3.2" cy="1" r="3.2" fill="url(#ne-berry)"/><circle cx="3.2" cy="1.4" r="3.2" fill="url(#ne-berry)"/><circle cx="0" cy="4.6" r="3.2" fill="url(#ne-berry)"/><circle cx="-4" cy="0" r=".7" fill="#fff" opacity=".7"/><circle cx="2.4" cy=".4" r=".7" fill="#fff" opacity=".7"/></g>`;
    if (b === 'button') return `<g><circle r="7.2" fill="#5E9C93"/><circle r="5.6" fill="#78B3A9"/><g fill="#3E6D66"><circle cx="-1.6" cy="-1.6" r=".95"/><circle cx="1.6" cy="-1.6" r=".95"/><circle cx="-1.6" cy="1.6" r=".95"/><circle cx="1.6" cy="1.6" r=".95"/></g><path d="M-4.6 -2.6 A5.4 5.4 0 0 1 -1 -5.2" stroke="#fff" stroke-width=".8" fill="none" opacity=".55" stroke-linecap="round"/></g>`;
    if (b === 'feather') return `<g transform="rotate(28)"><path d="M0 -9 C4.6 -5 4.6 4 0 8 C-4.6 4 -4.6 -5 0 -9Z" fill="url(#ne-irid)"/><path d="M0 -6 C2.2 -3 2.2 2 0 5" fill="none" stroke="#F4F1EA" stroke-width="1.6" opacity=".9"/><path d="M0 -9 L0 10" stroke="#E9E2D0" stroke-width=".55"/></g>`;
    if (b === 'bead') return `<g><path d="M-8 -3C-4 4 4 4 8 -3" fill="none" stroke="#8A6A4A" stroke-width=".9"/><circle cx="-6.6" cy="-1" r="3.1" fill="#4FA7C9"/><circle cx="0" cy="2.6" r="3.6" fill="#E0685A"/><circle cx="6.6" cy="-1" r="3.1" fill="#6BB36B"/><circle cx="-7.6" cy="-2" r=".9" fill="#fff" opacity=".8"/><circle cx="-1.1" cy="1.4" r="1" fill="#fff" opacity=".8"/><circle cx="5.6" cy="-2" r=".9" fill="#fff" opacity=".8"/></g>`;
    if (b === 'cap') { const pts = []; for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, r = i % 2 ? 8.2 : 7.1; pts.push((Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r).toFixed(2)); } return `<g><path d="M${pts.join('L')}Z" fill="#B98A1E"/><circle r="6.3" fill="url(#ne-gold)"/><circle r="4.4" fill="none" stroke="#fff" stroke-width=".7" opacity=".6"/><path d="M0 -2.6 L.8 -.8 L2.7 -.6 L1.3 .7 L1.7 2.6 L0 1.6 L-1.7 2.6 L-1.3 .7 L-2.7 -.6 L-.8 -.8Z" fill="#A9741A"/></g>`; }
    if (b && b.startsWith('acorn')) return `<g transform="translate(0 .5)">${acorn(6.2)}</g>`;
    return '';
  }

  /* the magpie's treasures, centred on 0,0 in a 30-unit box */
  const T = {
    'Silver Thimble': `<path d="M-6 8 L-5 -4 C-5 -9 5 -9 5 -4 L6 8Z" fill="url(#ne-silver)"/><ellipse cx="0" cy="8" rx="6.4" ry="1.8" fill="#9BA1B0"/><g fill="#8A90A0" opacity=".6">${[-3, 0, 3].map((x) => [-2, 1, 4].map((y) => `<circle cx="${x}" cy="${y}" r=".55"/>`).join('')).join('')}</g>`,
    'Glass Marble': `<g><circle r="8.6" fill="#7FC4D9"/><path d="M-6 -2C-2 -7 4 -5 5 0C6 5 0 7 -3 4C-5 2 -2 -1 1 0" fill="none" stroke="#2F7FA0" stroke-width="1.8" stroke-linecap="round"/><path d="M-5 3C-2 7 4 6 6 2" fill="none" stroke="#E9F7FB" stroke-width="1.2" stroke-linecap="round" opacity=".8"/><ellipse cx="-3.4" cy="-4.6" rx="2.2" ry="1.3" fill="#fff" opacity=".8" transform="rotate(-30 -3.4 -4.6)"/></g>`,
    'Opera Glasses': `<g><rect x="-10.5" y="-5" width="8.6" height="11" rx="3" fill="url(#ne-gold)"/><rect x="1.9" y="-5" width="8.6" height="11" rx="3" fill="url(#ne-gold)"/><rect x="-2.4" y="-2.4" width="4.8" height="3" fill="#A9741A"/><ellipse cx="-6.2" cy="-5" rx="4.3" ry="1.7" fill="#3E2A1E"/><ellipse cx="6.2" cy="-5" rx="4.3" ry="1.7" fill="#3E2A1E"/><ellipse cx="-6.2" cy="6" rx="4.3" ry="1.5" fill="#A9741A"/><ellipse cx="6.2" cy="6" rx="4.3" ry="1.5" fill="#A9741A"/><path d="M10.5 2L12.8 9.5" stroke="#A9741A" stroke-width="1.6" stroke-linecap="round"/></g>`,
    'Music Box': `<g><rect x="-9.5" y="-1.5" width="19" height="10" rx="1.6" fill="#9A5B34"/><rect x="-9.5" y="-1.5" width="19" height="2.6" fill="#7A4424"/><path d="M-9.5 -1.5L-7 -8.5H9.5L9.5 -1.5Z" fill="#B87445"/><rect x="-6" y="2.6" width="12" height="4.2" rx="1" fill="url(#ne-gold)"/><circle cx="0" cy="4.7" r="1.1" fill="#7A4424"/><path d="M9.5 3.5H12.6V1" fill="none" stroke="url(#ne-gold)" stroke-width="1.5" stroke-linecap="round"/><circle cx="12.6" cy="0" r="1.3" fill="url(#ne-gold)"/><path d="M-1.5 -4.4V-10.2L2.6 -11.2V-6" fill="none" stroke="#3E2A1E" stroke-width="1.1"/><ellipse cx="-2.6" cy="-4.4" rx="1.5" ry="1.1" fill="#3E2A1E"/><ellipse cx="1.5" cy="-6" rx="1.5" ry="1.1" fill="#3E2A1E"/></g>`,
    'Goblet': `<g><path d="M-7.5 -10H7.5C7.5 -3 4.6 0.5 0 1C-4.6 0.5 -7.5 -3 -7.5 -10Z" fill="url(#ne-gold)"/><ellipse cx="0" cy="-10" rx="7.5" ry="1.9" fill="#A9741A"/><rect x="-1.2" y="1" width="2.4" height="6" fill="url(#ne-gold)"/><ellipse cx="0" cy="4" rx="2.2" ry="1.1" fill="#A9741A"/><path d="M-6 9.5C-6 7.4 -2.6 6.6 0 6.6C2.6 6.6 6 7.4 6 9.5Z" fill="url(#ne-gold)"/><circle cx="0" cy="-5" r="1.9" fill="#C23B3B"/><circle cx="-0.6" cy="-5.6" r=".6" fill="#fff" opacity=".8"/></g>`,
    'Old Key': `<g transform="rotate(-30)"><circle cx="-6" cy="0" r="4.4" fill="none" stroke="url(#ne-gold)" stroke-width="2.4"/><rect x="-2" y="-1.1" width="13" height="2.2" rx="1" fill="url(#ne-gold)"/><rect x="7" y="0" width="2" height="4" fill="url(#ne-gold)"/><rect x="9.6" y="0" width="1.6" height="3" fill="url(#ne-gold)"/></g>`,
    'Jingle Bell': `<path d="M0 -10 L0 -7" stroke="#B1452F" stroke-width="1.6"/><circle cx="0" cy="0" r="7.4" fill="url(#ne-gold)"/><path d="M-7 0 H7" stroke="#A97A22" stroke-width=".9"/><path d="M0 2.4 V7" stroke="#6E4E12" stroke-width="1.2"/><circle cx="0" cy="2.4" r="1.3" fill="#6E4E12"/><circle cx="-2.6" cy="-3" r="1.2" fill="#fff" opacity=".6"/>`,
    'Teaspoon': `<g transform="rotate(-35)"><ellipse cx="-6" cy="0" rx="4.6" ry="3.4" fill="url(#ne-silver)"/><rect x="-2" y="-.9" width="14" height="1.8" rx=".9" fill="url(#ne-silver)"/><ellipse cx="-7" cy="-.8" rx="1.6" ry=".9" fill="#fff" opacity=".7"/></g>`,
    'Pocket Mirror': `<circle r="8" fill="url(#ne-gold)"/><circle r="6.2" fill="#CFE6EE"/><path d="M-3.6 -2.6 L-1 -5 M-3 1 L2.6 -4.4" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".85"/>`,
    'Locket': `<path d="M-7 -10 Q0 -4 7 -10" stroke="#C9A24A" stroke-width=".7" fill="none"/><path d="M0 -4 C-8 -11 -11 0 0 7 C11 0 8 -11 0 -4Z" fill="url(#ne-gold)"/><path d="M0 -1 C-3.4 -5 -5 .5 0 3.6 C5 .5 3.4 -5 0 -1Z" fill="#D8A0A0" opacity=".7"/>`,
    'Brass Compass': `<circle r="8.4" fill="url(#ne-gold)"/><circle r="6.6" fill="#F6EED9"/><path d="M0 -5.4 L1.5 0 L0 5.4 L-1.5 0Z" fill="#B1452F"/><path d="M0 0 L1.5 0 L0 5.4 L-1.5 0Z" fill="#4A4B55"/><circle r="1" fill="#A97A22"/><rect x="-1.4" y="-10.6" width="2.8" height="2.4" rx=".8" fill="url(#ne-gold)"/>`,
    'Pocket Watch': `<path d="M0 -12 L0 -9.5" stroke="#C9A24A" stroke-width="1.2"/><circle cx="0" cy="-12.6" r="1.4" fill="none" stroke="#C9A24A" stroke-width=".8"/><circle r="8.6" fill="url(#ne-gold)"/><circle r="6.8" fill="#FBF6E9"/><g stroke="#4A3426" stroke-width=".55">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = i * Math.PI / 6; return `<path d="M${(Math.sin(a) * 5.4).toFixed(2)} ${(-Math.cos(a) * 5.4).toFixed(2)} L${(Math.sin(a) * 6.2).toFixed(2)} ${(-Math.cos(a) * 6.2).toFixed(2)}"/>`; }).join('')}</g><path d="M0 0 L0 -4.4 M0 0 L3 1.6" stroke="#4A3426" stroke-width=".8" stroke-linecap="round"/>`,
    'Tiara': `<path d="M-10 5 C-6 2 6 2 10 5 L8.6 -2 L5 2 L3 -6 L0 0 L-3 -6 L-5 2 L-8.6 -2Z" fill="url(#ne-silver)"/><circle cx="0" cy="-1.2" r="1.7" fill="#7FB6CE"/><circle cx="-3" cy="-6" r="1.2" fill="#E79AA2"/><circle cx="3" cy="-6" r="1.2" fill="#E79AA2"/><circle cx="-8.6" cy="-2" r=".9" fill="#7FB6CE"/><circle cx="8.6" cy="-2" r=".9" fill="#7FB6CE"/>`,
    'Disco Ball': `<path d="M0 -12 V-9" stroke="#8A90A0" stroke-width=".8"/><circle r="9" fill="url(#ne-silver)"/><g stroke="#8A90A0" stroke-width=".4" fill="none" opacity=".8"><ellipse rx="9" ry="3"/><ellipse rx="9" ry="6.4"/><ellipse rx="3" ry="9"/><ellipse rx="6.4" ry="9"/></g><g fill="#fff"><path d="M-4 -5 l1 -2 l1 2 l-1 2z"/><path d="M4 2 l.8 -1.6 l.8 1.6 l-.8 1.6z"/></g><g fill="#F2C94C" opacity=".8"><rect x="-6" y="1" width="2" height="2"/><rect x="2" y="-6" width="2" height="2" fill="#E79AA2"/></g>`,
    'Icicle Pendant': `<path d="M-6 -8 Q0 -4 6 -8" stroke="#9BA1B0" stroke-width=".7" fill="none"/><path d="M-3 -5 L3 -5 L0 10Z" fill="url(#ne-ice)"/><path d="M-1 -4 L0 4" stroke="#fff" stroke-width=".9" opacity=".8"/>`,
    'Crystal Brooch': `<path d="M0 -9 L7 -2 L4 8 L-4 8 L-7 -2Z" fill="url(#ne-ice)"/><path d="M0 -9 L0 8 M-7 -2 L7 -2 M-4 8 L0 -2 L4 8" stroke="#fff" stroke-width=".55" opacity=".7" fill="none"/><path d="M-9.4 3 L9.4 3" stroke="#9BA1B0" stroke-width=".9" opacity=".6"/>`,
    'Silver Ring': `<circle cx="0" cy="2" r="6.4" fill="none" stroke="url(#ne-silver)" stroke-width="2.4"/><path d="M-2.6 -5 L2.6 -5 L4 -7.6 L0 -10.6 L-4 -7.6Z" fill="url(#ne-ice)"/>`,
    'Frosted Lantern': `<path d="M-1.6 -11 h3.2 v2 h-3.2z" fill="#8A90A0"/><path d="M-5 -9 h10 l-1 2 h-8z" fill="#7A8090"/><rect x="-4.6" y="-7" width="9.2" height="13" rx="1.4" fill="#FFE5A6" opacity=".9"/><path d="M-4.6 -7 h9.2 v13 h-9.2z M0 -7 v13" fill="none" stroke="#7A8090" stroke-width=".9"/><ellipse cx="0" cy="0" rx="2" ry="3.2" fill="#FFB347" opacity=".85"/><path d="M-5 6 h10 l1 2 h-12z" fill="#7A8090"/><g fill="#fff" opacity=".9"><circle cx="-3" cy="-4" r=".5"/><circle cx="2.6" cy="3" r=".45"/></g>`,
  };
  function treasure(name) { return `<g>${T[name] || T['Locket']}</g>`; }

  root.MagpieArt = { C, SEAT, defs, acorn, head, body, token, magpie, bauble, treasure, mix };
})(typeof window !== 'undefined' ? window : globalThis);
