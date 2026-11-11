/* Sentai — the art, drawn as SVG strings so the box, the page and the playable build share one source.
   Flat retro poster style: warm paper, a few bold inks, chunky geometric figures, a little grain.
   SentaiArt.emblem(color), .robot(), .partSVG(color), .monster(key), .box() */
(function (root) {
  'use strict';
  const P = {
    paper: '#F3E7CF', paper2: '#E9D9B8', ink: '#1F1A2B', cream: '#FFF6E4', white: '#FFFDF7', gray: '#C9C2B4',
    hero: ['#E2482F', '#2E5FAE', '#F0B429', '#3B9562', '#EC8AA2'],          // Red, Blue, Yellow, Green, Pink
    heroDark: ['#A92E1B', '#1D3F7A', '#B9821A', '#256B43', '#B65C74'],
    act: ['#2F6B76', '#C8622F', '#2B2440'],                                  // Boss cards: Episode 1, Episode 2, the Finale
  };
  // the five emblems, each in a 24×24 box: flame, wave, bolt, leaf, star
  const EMB = [
    'M12 2.5c1.2 3.3 4.6 5.4 5.4 9.1.9 4.4-2 8.9-5.4 9.9-3.4-1-6.3-5.5-5.4-9.9.4-1.9 1.6-3.2 2.6-4.3.2 1.6.9 2.7 1.9 3.2-.6-3.1.2-5.7.9-8z',
    'M2.5 13.5c2.4-3.2 5.2-3.2 7.6 0s5.2 3.2 7.6 0c1.4-1.9 2.6-2.6 3.8-2.6v4.2c-1.2 0-2.4.7-3.8 2.6-2.4 3.2-5.2 3.2-7.6 0s-5.2-3.2-7.6 0z M2.5 7.5c2.4-3.2 5.2-3.2 7.6 0s5.2 3.2 7.6 0c1.4-1.9 2.6-2.6 3.8-2.6v3.2c-1.2 0-2.4.7-3.8 2.6-2.4 3.2-5.2 3.2-7.6 0s-5.2-3.2-7.6 0z',
    'M14.2 1.8 4.6 13.4h6.3l-2.3 8.8 10.8-12.6h-6.6z',
    'M20.8 3.2C10.6 3.4 4 8.4 4.2 15.6c0 1.5.4 2.9 1 4L3 21.8l1.2 1.2 2.2-2.2c1.1.6 2.5 1 4 1C17.6 21.9 21 13.2 20.8 3.2zM8.4 17.6l6.6-7.4-5.2 8.6z',
    'M12 1.8l2.9 6.5 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.6 1.6-6.9L2.1 9l7-.7z',
  ];
  const emblem = (c, fill, x = 0, y = 0, s = 24) => `<path transform="translate(${x} ${y}) scale(${s / 24})" d="${EMB[c]}" fill="${fill || P.hero[c]}" fill-rule="evenodd"/>`;
  const svg = (vb, body, extra) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra || ''}>${body}</svg>`;

  /* ---------- hero: chunky suit, white gloves and boots, a visor cut to their emblem's mood ---------- */
  const VISOR = [
    'M9 15 L31 15 L28 22 L22 22 L20 25 L18 22 L12 22Z',        // Red: angular brow
    'M9 16 Q20 13 31 16 L31 21 Q20 24 9 21Z',                  // Blue: smooth band
    'M9 15 L31 15 L31 18 L22 24 L18 24 L9 18Z',                // Yellow: sharp V
    'M10 15 L19 15 L19 23 L10 21Z M21 15 L30 15 L30 21 L21 23Z', // Green: split
    'M10 18 Q20 10 30 18 Q20 26 10 18Z',                       // Pink: oval
  ];
  function hero(c, pose) {
    const col = P.hero[c], dark = P.heroDark[c], w = P.white, ink = P.ink;
    const up = pose === 'up', point = pose === 'point';
    let s = '';
    // legs + boots
    s += `<rect x="12.5" y="50" width="6.5" height="17" rx="2.5" fill="${dark}"/><rect x="21" y="50" width="6.5" height="17" rx="2.5" fill="${dark}"/>`;
    s += `<rect x="11.5" y="63" width="8.5" height="6" rx="2.6" fill="${w}"/><rect x="20" y="63" width="8.5" height="6" rx="2.6" fill="${w}"/>`;
    // arms
    if (up) s += `<rect x="7" y="12" width="6" height="21" rx="3" fill="${col}" transform="rotate(-24 10 31)"/><circle cx="1.8" cy="13.4" r="3.6" fill="${w}"/>`;
    else s += `<rect x="4.5" y="31" width="6" height="18" rx="3" fill="${col}"/><circle cx="7.5" cy="49" r="3.6" fill="${w}"/>`;
    if (point) s += `<rect x="31" y="31" width="15" height="6" rx="3" fill="${col}"/><circle cx="46" cy="34" r="3.6" fill="${w}"/>`;
    else s += `<rect x="29.5" y="31" width="6" height="18" rx="3" fill="${col}"/><circle cx="32.5" cy="49" r="3.6" fill="${w}"/>`;
    // torso, belt, chest emblem
    s += `<path d="M10 30 Q10 27 13 27 L27 27 Q30 27 30 30 L29 52 L11 52Z" fill="${col}"/>`;
    s += `<rect x="10.6" y="46" width="18.8" height="4.4" fill="${w}"/><rect x="17" y="45" width="6" height="6.4" rx="1.4" fill="${ink}"/>`;
    s += `<circle cx="20" cy="36.5" r="6" fill="${w}"/>` + emblem(c, col, 15.2, 31.7, 9.6);
    // neck + helmet
    s += `<rect x="16" y="24" width="8" height="5" fill="${dark}"/>`;
    s += `<path d="M7.5 15 Q7.5 2.5 20 2.5 Q32.5 2.5 32.5 15 L32.5 22 Q32.5 27.5 27 27.5 L13 27.5 Q7.5 27.5 7.5 22Z" fill="${col}"/>`;
    s += `<path d="${VISOR[c]}" fill="${ink}"/>`;
    s += `<rect x="16.5" y="24.2" width="7" height="2.4" rx="1" fill="${P.gray}"/>`;
    s += `<path d="M12 6 Q16 4.2 20 4.2" stroke="${w}" stroke-opacity=".55" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    return s;
  }
  const heroSVG = (c, pose, attrs) => svg('-6 -2 58 74', hero(c, pose), attrs);

  /* ---------- monsters: 18 armored villains, one per Boss card ----------
     Each is a suit-style villain built from the same kit: boots, armor, shoulders, a head, something on top, and a weapon.
     [body, light, accent, size, head shape, face, top, shoulders, weapon, extras] */
  const M = [
    ['#7E8491', '#B9BDC4', '#E2482F', .8, 'gear', 'cyclops', '', 'round', 'spear', {}],                          // Cog Grunts
    ['#9C5B3C', '#D29A72', '#F0B429', .78, 'round', 'grin', 'ears', '', 'dagger', { tail: 1, snout: 1 }],           // Rust Rats
    ['#3A3150', '#6A5F90', '#EC8AA2', .8, 'round', 'grin', 'batears', '', 'claws', { wings: 'bat' }],              // Inkbats
    ['#3FA3B8', '#A6DDE6', '#F0B429', .8, 'round', 'tri', 'antenna', 'spike', '', { motif: 'bolt' }],              // Static Swarm
    ['#E77E9A', '#F7C4D0', '#2E5FAE', .82, 'dome', 'grin', 'bubble', 'round', 'fists', {}],                          // Gum Golem
    ['#74823F', '#AEBB7A', '#E2482F', .78, 'round', 'visor', 'pins', 'spike', 'dagger', {}],                        // Pin Mites
    ['#2E7F8F', '#86C8D0', '#F3E7CF', .92, 'helm', 'grin', 'fin', 'spike', 'trident', { tabard: 1 }],               // Tiderazor
    ['#C9862F', '#F2CC84', '#2B2440', .92, 'jaw', 'cyclops', 'lure', 'round', 'hammer', {}],                        // Lanternjaw
    ['#B8643A', '#E8AC84', '#2E5FAE', .92, 'squid', 'visor', '', 'round', 'staff', { tabard: 1 }],                  // Copper Kraken
    ['#57783A', '#A3C074', '#E2482F', .92, 'helm', 'beak', 'feather', 'spike', 'scythe', { cape: '#3B5226' }],      // Thornbeak
    ['#6B4FA0', '#B09AD8', '#F0B429', .92, 'round', 'bug', 'plume', '', 'staff', { wings: 'moth', motif: 'bolt' }], // Voltmoth
    ['#C2392C', '#EE8B78', '#F3E7CF', .92, 'twin', 'grin', 'horn1', 'block', 'club', { tabard: 1 }],                // Twin Oni
    ['#5A5468', '#8F899E', '#E2482F', 1, 'box', 'visor', 'rock', 'block', 'hammer', { cracks: 1 }],                 // Megalith Rex
    ['#3D4F66', '#8496AE', '#F0B429', 1, 'helm', 'visor', 'bull', 'spike', 'axe', { tabard: 1 }],                   // Ironhorn Titan
    ['#40356A', '#7A6CA6', '#EC8AA2', 1, 'round', 'tri', 'spike2', 'round', 'claws', { maw: 1, cape: '#4A2E5E' }],  // Starmaw
    ['#8C2F2A', '#D0705E', '#F0B429', 1, 'helm', 'visor', 'pagoda', 'block', 'staff', { tabard: 1 }],               // Doom Pagoda
    ['#2C5A66', '#6E9AA4', '#E2482F', 1, 'dragon', 'visor', 'swept', 'spike', 'sword', { wings: 'bat', tail: 1 }],  // Eclipse Wyrm
    ['#5A2140', '#A2557C', '#F0B429', 1, 'helm', 'visor', 'crown', 'spike', 'sword', { cape: '#2B1830', shield: 1, tabard: 1, bull: 1 }], // Emperor Gorvax
  ];
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const mir = (inner) => inner + `<g transform="matrix(-1 0 0 1 100 0)">${inner}</g>`;

  /* Vael's heads: a serpent neck rising from the bottom edge, with a hex mark on the brow.
     [scales, belly, accent, frill (0 none, 1 fins, 2 spikes, 3 crown), eyes 1–3, jaw open 0–1] */
  const H = [
    ['#4F7A4A', '#9FC08E', '#F0B429', 1, 2, 1], ['#5E6B3A', '#A9B57A', '#E2482F', 0, 2, 0], ['#7A8F3E', '#C8D48C', '#2B2440', 2, 1, 1],
    ['#2F6F6A', '#8CC9C0', '#F3E7CF', 1, 2, 0], ['#3E5F4A', '#91B89A', '#EC8AA2', 2, 3, 1], ['#55604A', '#A4AE94', '#F0B429', 0, 2, 1],
    ['#2E5E6E', '#7FB6C4', '#F0B429', 2, 2, 1], ['#3B4E7A', '#8C9CC8', '#E2482F', 1, 2, 0], ['#4A3F7A', '#9A8CC8', '#F0B429', 2, 1, 1],
    ['#2F5A78', '#86AECB', '#EC8AA2', 1, 3, 1], ['#5A4A72', '#A598C2', '#F3E7CF', 0, 2, 1], ['#38606A', '#8DB3B8', '#E2482F', 2, 2, 0],
    ['#3A2A4E', '#7E6A9E', '#F0B429', 3, 2, 1], ['#2A2E48', '#6E7498', '#E2482F', 2, 3, 1], ['#46243E', '#93608A', '#F0B429', 2, 1, 1],
    ['#2B3A3E', '#6F8A8E', '#EC8AA2', 1, 2, 1], ['#3E2A2A', '#8E6A62', '#F0B429', 2, 2, 0], ['#4A1E3A', '#9A4E78', '#F0B429', 3, 3, 1],
  ];
  const HEXMARK = {
    hunger: 'M-3.5 -1.5 Q0 3.5 3.5 -1.5', venom: 'M0 -3.6 Q3 0 0 3.4 Q-3 0 0 -3.6Z', coil: 'M-3 0 A3 3 0 1 1 0 3 A1.6 1.6 0 1 1 1.4 1.2',
    split: 'M-3.4 -3 L0 0 L3.4 -3 M0 0 V3.6', brood: 'M0 -3.4 V3.4 M-3.4 0 H3.4', spite: 'M-3.6 2.6 L-2 -2.6 L0 2.6 L2 -2.6 L3.6 2.6',
  };
  function hydraHead(i, hex) {
    const [sc, belly, acc, frill, eyes, open] = H[i];
    const ink = P.ink, w = P.white;
    let b = '';
    // neck
    b += `<path d="M30 100 Q24 74 40 60 Q50 52 46 44 L64 44 Q70 58 60 70 Q48 82 56 100Z" fill="${sc}"/>`;
    b += `<path d="M38 100 Q34 80 46 68 Q54 60 54 50" fill="none" stroke="${belly}" stroke-width="7" stroke-linecap="round"/>`;
    b += `<path d="M40 92 h8 M41 84 h8 M45 76 h7" stroke="${sc}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
    // frill behind the head
    if (frill === 1) b += `<path d="M30 30 L14 20 L22 36 L10 42 L28 44Z M76 30 L92 20 L84 36 L96 42 L78 44Z" fill="${acc}"/>`;
    if (frill === 2) b += `<path d="M34 22 L30 4 L42 18 L50 0 L58 18 L70 4 L66 22Z" fill="${acc}"/>`;
    if (frill === 3) b += `<path d="M32 22 L28 2 L38 14 L44 -2 L50 12 L56 -2 L62 14 L72 2 L68 22Z" fill="${P.hero[2]}"/><circle cx="50" cy="8" r="2.6" fill="${P.hero[0]}"/>`;
    // head: a broad wedge with a snout
    b += `<path d="M26 34 Q26 16 50 16 Q74 16 74 34 Q74 44 66 50 L60 56 Q50 60 40 56 L34 50 Q26 44 26 34Z" fill="${sc}"/>`;
    b += `<path d="M34 46 Q50 54 66 46 L62 54 Q50 60 38 54Z" fill="${belly}"/>`;
    // nostrils
    b += `<circle cx="45" cy="50" r="1.3" fill="${ink}"/><circle cx="55" cy="50" r="1.3" fill="${ink}"/>`;
    // eyes
    const xs = eyes === 1 ? [50] : eyes === 2 ? [39, 61] : [36, 50, 64], r = eyes === 1 ? 6.4 : eyes === 2 ? 5.4 : 4.4, ey = 33;
    xs.forEach((x) => { b += `<ellipse cx="${x}" cy="${ey}" rx="${r}" ry="${r * .8}" fill="${P.hero[2]}"/><rect x="${x - r * .18}" y="${ey - r * .7}" width="${r * .36}" height="${r * 1.4}" rx="${r * .18}" fill="${ink}"/>`; });
    b += `<path d="M${xs[0] - r - 3} ${ey - r - 1} L${xs[xs.length - 1] + r + 3} ${ey - r - 1} L50 ${ey - r * .3}Z" fill="${ink}" opacity=".85"/>`;
    // jaw and fangs
    if (open) {
      b += `<path d="M38 56 Q50 70 62 56 Q50 62 38 56Z" fill="${ink}"/><path d="M41 57 L43 63 L45 58Z M55 58 L57 63 L59 57Z" fill="${w}"/>`;
      b += `<path d="M48 64 Q50 70 47 72 M52 64 Q50 70 53 72" stroke="${P.hero[0]}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    } else b += `<path d="M40 57 L42 61 L44 58Z M56 58 L58 61 L60 57Z" fill="${w}"/>`;
    // hex mark on the brow
    if (hex && HEXMARK[hex]) b += `<g transform="translate(50 22)"><circle r="5.4" fill="${ink}"/><path d="${HEXMARK[hex]}" fill="${hex === 'venom' ? acc : 'none'}" stroke="${acc}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    return b;
  }
  /* one head, drawn around (50, 28) */
  function vHead(shape, face, top, body, light, acc, x) {
    const k = P.ink, w = P.white, dark = mix(body, P.ink, .35), GOLDc = '#F0B429', eye = acc === '#2B2440' || acc === '#2E5FAE' ? '#F0B429' : acc;
    let s = '';
    // what sits on top, behind the head
    if (top === 'ears') s += mir(`<circle cx="36" cy="15" r="8" fill="${body}"/><circle cx="36" cy="15" r="4.4" fill="${light}"/>`);
    if (top === 'batears') s += mir(`<path d="M35 26 L28 2 L46 16Z" fill="${body}"/><path d="M35 20 L32 9 L41 16Z" fill="${acc}"/>`);
    if (top === 'antenna') s += mir(`<path d="M44 15 Q40 4 33 3" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><circle cx="32.5" cy="3.2" r="2.8" fill="${acc}"/>`);
    if (top === 'plume') s += mir(`<path d="M45 16 Q42 2 31 1 M41 6 l-5 2 M42.6 10 l-5 3 M38 3.4 l-3.4 3.6" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"/>`);
    if (top === 'pins') s += [-60, -36, -12, 12, 36, 60].map((a) => `<g transform="rotate(${a} 50 28)"><path d="M50 16 V4" stroke="${P.gray}" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="3.4" r="2.2" fill="${acc}"/></g>`).join('');
    if (top === 'fin') s += `<path d="M44 16 Q46 -2 60 0 Q54 8 58 18Z" fill="${acc}"/><path d="M50 14 L54 4" stroke="${body}" stroke-width="1.4" stroke-linecap="round"/>`;
    if (top === 'feather') s += `<path d="M42 16 L36 2 L46 9 L50 -1 L54 9 L64 2 L58 16Z" fill="${acc}"/>`;
    if (top === 'horn1') s += `<path d="M44 16 L50 0 L56 16Z" fill="${acc}"/>`;
    if (top === 'spike2') s += mir(`<path d="M38 18 L30 2 L46 13Z" fill="${acc}"/>`);
    if (top === 'swept') s += mir(`<path d="M40 18 Q30 14 22 0 Q36 4 46 13Z" fill="${light}"/>`);
    if (top === 'bull') s += mir(`<path d="M37 22 Q19 22 15 2 Q24 13 40 13Z" fill="${P.cream}"/><path d="M15 2 Q16 8 20 12" fill="none" stroke="${acc}" stroke-width="2" stroke-linecap="round"/>`);
    if (top === 'rock') s += `<path d="M34 16 L37 5 L43 11 L48 2 L55 10 L61 4 L66 16Z" fill="${light}"/>`;
    if (top === 'lure') s += `<path d="M50 13 Q50 0 62 2 Q68 3 68 9" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><circle cx="68" cy="11" r="4.4" fill="${GOLDc}"/><circle cx="68" cy="11" r="2" fill="${w}"/>`;
    if (top === 'pagoda') s += `<path d="M30 17 L70 17 L62 12 L38 12Z M35 11 L65 11 L58 6.5 L42 6.5Z M40 5.5 L60 5.5 L50 -1Z" fill="${acc}"/><path d="M30 17 l-3 -3 M70 17 l3 -3" stroke="${acc}" stroke-width="1.6" stroke-linecap="round"/>`;
    if (top === 'crown') s += mir(`<path d="M37 22 Q19 22 15 4 Q24 14 40 13Z" fill="${P.cream}"/>`) + `<path d="M38 16 L36 3 L43 9 L46.5 0 L50 8 L53.5 0 L57 9 L64 3 L62 16Z" fill="${GOLDc}"/><circle cx="50" cy="12" r="2.2" fill="${P.hero[0]}"/>`;
    // the head itself
    if (shape === 'gear') {
      s += [0, 45, 90, 135].map((a) => `<rect x="46" y="9.5" width="8" height="37" rx="1.5" fill="${dark}" transform="rotate(${a} 50 28)"/>`).join('');
      s += `<circle cx="50" cy="28" r="14.5" fill="${body}"/>`;
    } else if (shape === 'box') s += `<path d="M34 16 L66 16 L68 40 L62 44 L38 44 L32 40Z" fill="${body}"/>`;
    else if (shape === 'dome') s += `<path d="M32 44 Q30 12 50 12 Q70 12 68 44Z" fill="${body}"/>`;
    else if (shape === 'jaw') s += `<path d="M36 30 Q36 12 50 12 Q64 12 64 30 L70 34 L68 46 L32 46 L30 34Z" fill="${body}"/>`;
    else if (shape === 'squid') s += `<path d="M35 34 Q30 4 50 3 Q70 4 65 34 L64 42 L36 42Z" fill="${body}"/><circle cx="42" cy="12" r="2" fill="${light}"/><circle cx="57" cy="9" r="1.6" fill="${light}"/><circle cx="52" cy="16" r="1.4" fill="${light}"/>`;
    else if (shape === 'dragon') s += `<path d="M36 18 Q50 10 64 18 L64 32 L58 46 L42 46 L36 32Z" fill="${body}"/><path d="M43 39 L57 39 L56 46 L44 46Z" fill="${light}"/><circle cx="47" cy="42.5" r="1.2" fill="${k}"/><circle cx="53" cy="42.5" r="1.2" fill="${k}"/>`;
    else if (shape === 'round') s += `<path d="M34 30 Q34 13 50 13 Q66 13 66 30 Q66 44 50 44 Q34 44 34 30Z" fill="${body}"/>`;
    else s += `<path d="M35 30 Q35 12 50 12 Q65 12 65 30 L65 37 Q65 43 59 43 L41 43 Q35 43 35 37Z" fill="${body}"/><path d="M50 12 V20" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (top === 'bubble') s += `<circle cx="58" cy="15" r="7" fill="${light}" opacity=".9"/><path d="M55 12 Q57 10 60 11" stroke="${w}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    // the face
    const slit = (y) => mir(`<path d="M40.5 ${y} L47.5 ${y + 2} L46.5 ${y + 5} L41 ${y + 3.4}Z" fill="${eye}"/>`);
    if (face === 'visor') s += `<path d="M37.5 23 L62.5 23 L60 33 L50 36.5 L40 33Z" fill="${k}"/>` + slit(26.5) + (shape === 'helm' ? `<rect x="44.5" y="37.6" width="11" height="3.6" rx="1" fill="${P.gray}"/><path d="M47.5 38 v3 M50 38 v3 M52.5 38 v3" stroke="${dark}" stroke-width=".9"/>` : '');
    if (face === 'cyclops') s += `<circle cx="50" cy="${shape === 'jaw' ? 24 : 28}" r="8" fill="${k}"/><circle cx="50" cy="${shape === 'jaw' ? 24 : 28}" r="4.6" fill="${eye}"/><rect x="49" y="${(shape === 'jaw' ? 24 : 28) - 3.4}" width="2" height="6.8" rx="1" fill="${k}"/>`;
    if (face === 'grin' || face === 'tri' || face === 'bug') {
      if (face === 'tri') s += `<path d="M37 20 L63 20 L61 29 L39 29Z" fill="${k}"/>` + [42, 50, 58].map((cx) => `<circle cx="${cx}" cy="24.5" r="2.6" fill="${eye}"/>`).join('');
      else if (face === 'bug') s += mir(`<ellipse cx="41.5" cy="25" rx="5.4" ry="6.6" fill="${k}"/><ellipse cx="42.2" cy="24" rx="2.6" ry="3.4" fill="${eye}"/>`);
      else s += `<path d="M37.5 20.5 L62.5 20.5 L60.5 29 L50 26.5 L39.5 29Z" fill="${k}"/>` + slit(22.6);
      s += `<path d="M40 34 Q50 43 60 34Z" fill="${k}"/><path d="M42.6 34.4 L44.6 38 L46.6 34.6Z M53.4 34.6 L55.4 38 L57.4 34.4Z" fill="${w}"/>`;
    }
    if (face === 'beak') s += `<path d="M37.5 22 L62.5 22 L60 30 L40 30Z" fill="${k}"/>` + slit(24) + `<path d="M43 30 L57 30 L50 46Z" fill="${GOLDc}"/><path d="M50 31 V41" stroke="${mix(GOLDc, P.ink, .4)}" stroke-width="1.2" stroke-linecap="round"/>`;
    if (shape === 'jaw') s += `<path d="M33 37 L67 37 L66 44 L34 44Z" fill="${k}"/><path d="M35 44 L38 37.6 L41 44Z M43 44 L46 37.6 L49 44Z M51 44 L54 37.6 L57 44Z M59 44 L62 37.6 L65 44Z" fill="${w}"/>`;
    if (shape === 'squid') s += [38, 44.5, 55.5, 62].map((cx, i) => `<path d="M${cx} 40 q${i < 2 ? -3 : 3} 8 0 ${14 + (i % 3) * 2}" fill="none" stroke="${body}" stroke-width="4" stroke-linecap="round"/>`).join('') + `<path d="M50 40 v15" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`;
    if (x.snout) s += `<path d="M44 36 L56 36 L50 44Z" fill="${light}"/><circle cx="50" cy="43.4" r="2" fill="${k}"/><path d="M44 39 l-9 -2 M44 41 l-9 2 M56 39 l9 -2 M56 41 l9 2" stroke="${k}" stroke-width=".8" stroke-linecap="round"/>`;
    return s;
  }
  function weapon(kind, acc, light) {
    const k = P.ink, st = '#8E8A9B', st2 = '#C9C6D2', wood = '#6B4A34', GOLDc = '#F0B429';
    const pole = (y0) => `<rect x="74.4" y="${y0}" width="3.2" height="${92 - y0}" rx="1.6" fill="${wood}"/>`;
    if (kind === 'sword') return `<path d="M72.6 62 L79.4 62 L78.6 24 L76 15 L73.4 24Z" fill="${st2}"/><path d="M76 20 V60" stroke="${st}" stroke-width="1.2"/><rect x="68.5" y="61" width="15" height="3.6" rx="1.4" fill="${GOLDc}"/><rect x="74.4" y="64" width="3.2" height="16" rx="1.4" fill="${k}"/>`;
    if (kind === 'dagger') return `<path d="M73.6 66 L78.4 66 L78 50 L76 44 L74 50Z" fill="${st2}"/><rect x="71" y="65.4" width="10" height="3" rx="1.2" fill="${GOLDc}"/><rect x="74.6" y="68" width="2.8" height="9" rx="1.2" fill="${k}"/>`;
    if (kind === 'spear') return pole(24) + `<path d="M76 8 L80.5 22 L76 26 L71.5 22Z" fill="${st2}"/>`;
    if (kind === 'staff') return pole(22) + `<circle cx="76" cy="15" r="7" fill="none" stroke="${GOLDc}" stroke-width="3"/><circle cx="76" cy="15" r="3" fill="${acc}"/>`;
    if (kind === 'trident') return pole(26) + `<path d="M68 12 V22 Q68 27 76 27 Q84 27 84 22 V12 M76 8 V27" fill="none" stroke="${st2}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (kind === 'axe') return pole(14) + `<path d="M77 14 Q92 12 94 26 Q92 40 77 38 Q82 26 77 14Z" fill="${st2}"/><path d="M75 16 Q66 20 66 26 Q66 32 75 36Z" fill="${st}"/>`;
    if (kind === 'scythe') return pole(16) + `<path d="M76 16 Q56 8 46 22 Q60 16 76 24Z" fill="${st2}"/>`;
    if (kind === 'hammer') return pole(30) + `<rect x="64" y="16" width="24" height="15" rx="2.5" fill="${st}"/><rect x="64" y="16" width="5" height="15" rx="2" fill="${st2}"/><rect x="83" y="16" width="5" height="15" rx="2" fill="${st2}"/>`;
    if (kind === 'club') return `<path d="M72.4 76 L79.6 76 L83 22 Q83 15 76 15 Q69 15 69 22Z" fill="${k}"/>` + [[73, 24], [79, 28], [73.5, 36], [78.5, 42], [74, 50], [78, 56]].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.7" fill="${light}"/>`).join('');
    return '';
  }
  function villain(def) {
    const [body, light, acc, , shape, face, top, sh, wp, x] = def;
    const k = P.ink, w = P.white, dark = mix(body, P.ink, .35), GOLDc = '#F0B429';
    let s = '';
    // behind: cape, wings, tail
    if (x.cape) s += `<path d="M31 42 L69 42 L84 88 L75 83 L67 90 L58.5 83 L50 90 L41.5 83 L33 90 L25 83 L16 88Z" fill="${x.cape}"/>`;
    if (x.wings === 'bat') s += mir(`<path d="M32 46 L4 20 L9 42 L0 49 L11 55 L5 66 L17 65 L22 76 L33 62Z" fill="${dark}"/><path d="M32 47 L9 42 M32 50 L11 55 M32 54 L17 65" stroke="${body}" stroke-width="1.2"/>`);
    if (x.wings === 'moth') s += mir(`<path d="M32 44 Q8 10 2 36 Q-1 56 30 60Z" fill="${light}"/><circle cx="14" cy="38" r="5.4" fill="${acc}"/><circle cx="14" cy="38" r="2.2" fill="${k}"/><path d="M30 58 Q7 60 9 77 Q22 84 34 66Z" fill="${dark}"/>`);
    if (x.tail) s += `<path d="M38 78 Q14 84 10 66 Q9 58 3 60" fill="none" stroke="${dark}" stroke-width="4.4" stroke-linecap="round"/>`;
    s += weapon(wp, acc, light);
    // legs and boots
    s += `<rect x="37" y="68" width="10.5" height="20" fill="${dark}"/><rect x="52.5" y="68" width="10.5" height="20" fill="${dark}"/>`;
    s += `<path d="M35 83 L48.5 83 L48.5 94 L32 94 Q32 87 35 83Z" fill="${k}"/><path d="M51.5 83 L65 83 Q68 87 68 94 L51.5 94Z" fill="${k}"/><rect x="35" y="82" width="13.5" height="3" rx="1.2" fill="${acc}"/><rect x="51.5" y="82" width="13.5" height="3" rx="1.2" fill="${acc}"/>`;
    // torso, chest plate, belt
    s += `<path d="M29 43 L71 43 L66 70 L34 70Z" fill="${body}"/><path d="M37 47 L63 47 L59.5 63 L40.5 63Z" fill="${light}"/>`;
    if (x.cracks) s += `<path d="M42 47 l3 6 l-3 4 l4 6 M58 49 l-3 5 l3 5" fill="none" stroke="${dark}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (x.maw) s += `<path d="M36 48 L64 48 L60 64 L40 64Z" fill="${k}"/><path d="M38 48 L41.5 55 L45 48Z M46.5 48 L50 55 L53.5 48Z M55 48 L58.5 55 L62 48Z M41 64 L44 58 L47 64Z M53 64 L56 58 L59 64Z" fill="${w}"/><path d="M47 59 L50 55.4 L53 59 L50 62.6Z" fill="${acc}"/>`;
    else if (x.motif === 'bolt') s += `<path d="M52 48.5 L45 56.5 H49.5 L48 62 L55 54 H50.5Z" fill="${acc}"/>`;
    else s += `<circle cx="50" cy="55" r="5" fill="${k}"/><circle cx="50" cy="55" r="2.6" fill="${acc}"/>`;
    if (x.tabard) s += `<path d="M43.5 71 L56.5 71 L55 85 L50 89 L45 85Z" fill="${acc}"/><path d="M50 74 V84" stroke="${dark}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`;
    s += `<rect x="33" y="66.5" width="34" height="5.5" rx="1.5" fill="${k}"/><rect x="45.5" y="65.5" width="9" height="7.5" rx="1.6" fill="${GOLDc}"/>`;
    // arms and hands
    s += mir(`<rect x="19" y="46" width="10.5" height="20" rx="4" fill="${body}"/><rect x="17.6" y="59" width="13" height="10.5" rx="3" fill="${acc}"/>`);
    if (wp === 'claws') s += mir(`<circle cx="24" cy="72.5" r="5" fill="${k}"/><path d="M20 75 L18 86 L23 78Z M23.4 76 L24 88 L27 78Z M27 75 L30 85 L29.6 75Z" fill="${P.cream}"/>`);
    else if (wp === 'fists') s += mir(`<circle cx="24" cy="74.5" r="8.5" fill="${light}"/><path d="M19.5 72 h9 M19.5 76 h9" stroke="${body}" stroke-width="1.4" stroke-linecap="round"/>`);
    else s += mir(`<circle cx="24" cy="72.5" r="5" fill="${k}"/>`);
    if (x.shield) s += `<path d="M10 54 L38 54 L37 72 Q33 84 24 88 Q15 84 11 72Z" fill="${dark}"/><path d="M13.5 57 L34.5 57 L33.6 71 Q30.6 80 24 83.6 Q17.4 80 14.4 71Z" fill="${acc}"/><path d="M24 61 L27.4 68 L24 76 L20.6 68Z" fill="${dark}"/>`;
    // shoulders
    if (sh === 'round' || sh === 'spike') s += mir(`<path d="M14.5 50 Q14.5 36.5 27 36.5 Q37.5 36.5 37.5 46 L37.5 50Z" fill="${acc}"/><path d="M18 46.5 Q19 40.5 26 40" fill="none" stroke="${w}" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>`);
    if (sh === 'spike') s += mir(`<path d="M17 41 L9 25 L27 36.5Z" fill="${acc}"/>`);
    if (sh === 'block') s += mir(`<path d="M12 37 L37 37 L37.5 50 L14 50Z" fill="${acc}"/><rect x="12" y="37" width="25" height="3.4" fill="${dark}" opacity=".45"/>`);
    // neck and head
    s += `<rect x="44" y="40" width="12" height="5" fill="${dark}"/>`;
    if (shape === 'twin') s += [-13, 13].map((dx) => `<g transform="translate(${50 + dx} 30) scale(.74) translate(-50 -28)">${vHead('round', face, top, body, light, acc, x)}</g>`).join('');
    else s += vHead(shape, face, top, body, light, acc, x);
    return s;
  }
  function monster(key, hex) {
    if (key >= 18) return hydraHead(key - 18, hex);
    const size = M[key][3];
    return `<g transform="translate(50 95) scale(${size}) translate(-50 -94)">${villain(M[key])}</g>`;
  }
  const monsterSVG = (key, attrs, hex) => svg('0 0 100 100', monster(key, hex), attrs);


  /* ---------- the combined robot: five parts, one per Hero color, in a shared 100×140 frame ----------
     Red: head and chest · Blue: the arm on the viewer's left · Yellow: the right arm · Green and Pink: the legs */
  const STEEL = '#8E8A9B', STEEL2 = '#B9B5C4', GOLD = '#F0B429';
  const flip = (inner, m) => m ? `<g transform="matrix(-1 0 0 1 100 0)">${inner}</g>` : inner;
  const PART = [
    function red() {
      const c = P.hero[0], d = P.heroDark[0], k = P.ink, w = P.white;
      let s = '';
      // neck and waist joints
      s += `<rect x="44" y="24" width="12" height="8" fill="${STEEL}"/>`;
      // torso: broad chest tapering to the waist, with a darker side plane
      s += `<path d="M27 31 L73 31 L69 58 L63 70 L37 70 L31 58Z" fill="${c}"/>`;
      s += `<path d="M50 31 L73 31 L69 58 L63 70 L50 70Z" fill="${d}" opacity=".35"/>`;
      s += `<path d="M31 36 L44 36 L44 52 L34 52Z M69 36 L56 36 L56 52 L66 52Z" fill="${d}" opacity=".55"/>`;
      // abdomen bands
      s += `<rect x="40" y="56" width="20" height="3" rx="1.2" fill="${k}" opacity=".7"/><rect x="41" y="61.5" width="18" height="3" rx="1.2" fill="${k}" opacity=".7"/>`;
      // chest core with the flame
      s += `<circle cx="50" cy="44" r="8.5" fill="${w}"/><circle cx="50" cy="44" r="8.5" fill="none" stroke="${GOLD}" stroke-width="1.8"/>` + emblem(0, c, 43.2, 37.2, 13.6);
      // belt
      s += `<rect x="35" y="69" width="30" height="6" rx="1.5" fill="${k}"/><rect x="45.5" y="68.2" width="9" height="7.6" rx="1.6" fill="${GOLD}"/>`;
      // head: helmet, crest, visor, face grille
      s += `<path d="M38 15 Q38 5 50 5 Q62 5 62 15 L62 22 Q62 27 57 27 L43 27 Q38 27 38 22Z" fill="${c}"/>`;
      s += `<path d="M50 13 L34 1.5 L39 0.5 L50 8 L61 0.5 L66 1.5Z" fill="${GOLD}"/>`;
      s += `<path d="M40 14.5 L60 14.5 L58 19.5 L42 19.5Z" fill="${k}"/><path d="M43 16 L48 16" stroke="${w}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`;
      s += `<rect x="44" y="20.5" width="12" height="5" rx="1.2" fill="${STEEL2}"/><path d="M46.5 21.5 V24.5 M50 21.5 V24.5 M53.5 21.5 V24.5" stroke="${STEEL}" stroke-width="1"/>`;
      return s;
    },
    function blue() { return arm(1, false); },
    function yellow() { return arm(2, true); },
    function green() { return leg(3, false); },
    function pink() { return leg(4, true); },
  ];
  function arm(ci, m) {
    const c = P.hero[ci], d = P.heroDark[ci], w = P.white;
    let s = '';
    s += `<rect x="15" y="44" width="10" height="16" fill="${STEEL}"/>`;                              // upper arm
    s += `<path d="M11 60 L29 60 L27.5 85 L12.5 85Z" fill="${c}"/><path d="M20 60 L29 60 L27.5 85 L20 85Z" fill="${d}" opacity=".4"/>`; // forearm
    s += `<rect x="13" y="65" width="14" height="3" rx="1.2" fill="${d}"/>`;
    s += `<path d="M13 85 L27 85 L28 95 Q28 98 25 98 L15 98 Q12 98 12 95Z" fill="${STEEL2}"/><path d="M15 89 H25 M15 93 H25" stroke="${STEEL}" stroke-width="1.2"/>`; // fist
    s += `<path d="M8 32 Q8 26 15 26 L28 26 Q32 26 32 30 L32 44 Q32 47 29 47 L11 47 Q8 47 8 44Z" fill="${c}"/>`;  // shoulder
    s += `<path d="M20 26 L28 26 Q32 26 32 30 L32 44 Q32 47 29 47 L20 47Z" fill="${d}" opacity=".35"/>`;
    s += ci === 1 ? `<path d="M9 27 Q12 18 18 22 Q22 15 28 21 L27 26 L10 26Z" fill="${d}"/>` : `<path d="M10 26 L14 15 L18 22 L23 13 L27 26Z" fill="${d}"/>`; // fin
    let out = flip(s, m);
    const ex = m ? 100 - 20 - 6.5 : 20 - 6.5;
    out += `<circle cx="${m ? 80 : 20}" cy="37" r="7.2" fill="${w}"/>` + emblem(ci, c, ex, 30.5, 13) + `<circle cx="${m ? 80 : 20}" cy="74" r="4.6" fill="${w}"/>` + emblem(ci, c, (m ? 80 : 20) - 3.6, 70.4, 7.2);
    return out;
  }
  function leg(ci, m) {
    const c = P.hero[ci], d = P.heroDark[ci], w = P.white;
    let s = '';
    s += `<rect x="38" y="74" width="10" height="7" fill="${STEEL}"/>`;                                 // hip
    s += `<path d="M34 80 L49 80 L48 100 L35 100Z" fill="${c}"/><path d="M42 80 L49 80 L48 100 L42 100Z" fill="${d}" opacity=".35"/>`; // thigh
    s += `<path d="M34.5 110 L48.5 110 L49.5 128 L33.5 128Z" fill="${c}"/><path d="M42 110 L48.5 110 L49.5 128 L42 128Z" fill="${d}" opacity=".35"/>`; // shin
    s += `<rect x="35.5" y="115" width="12" height="2.6" rx="1" fill="${d}"/><rect x="35.5" y="120" width="12" height="2.6" rx="1" fill="${d}"/>`;
    s += `<path d="M30 128 L50 128 L51 134 Q51 137 48 137 L29 137 Q26 137 26.5 134Z" fill="${STEEL2}"/><rect x="26.5" y="134" width="24.5" height="3" rx="1.2" fill="${STEEL}"/>`; // foot
    s += `<path d="M32 99 Q32 97 34 97 L49 97 Q51 97 51 99 L51 110 Q51 112 49 112 L34 112 Q32 112 32 110Z" fill="${d}"/>`; // knee guard
    let out = flip(`<g transform="translate(-4 0)">${s}</g>`, m);
    const kx = m ? 100 - 37.5 : 37.5;
    out += `<circle cx="${kx}" cy="104.5" r="5.6" fill="${w}"/>` + emblem(ci, c, kx - 4.4, 100.1, 8.8);
    return out;
  }
  // where each part sits in the 100×140 frame, padded to a card's shape (5:7)
  const PART_BOX = [[22, -1, 56, 78], [-13, 9, 66, 92], [47, 9, 66, 92], [9.5, 71.5, 50, 70], [40.5, 71.5, 50, 70]];
  const robot = () => PART.map((f) => f()).join('');
  const partSVG = (c, attrs) => svg(PART_BOX[c].join(' '), PART[c](), attrs);

  /* ---------- the machines: one beast per Hero color, each piloted (the dark canopy), each in a 100×100 box ----------
     Red: Ember Lion · Blue: Tide Shark · Yellow: Volt Falcon · Green: Grove Rhino · Pink: Star Crane.
     Together they combine into the robot above. */
  const disc = (ci, cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.white}"/>` + emblem(ci, P.hero[ci], cx - r * .78, cy - r * .78, r * 1.56);
  const canopy = (d, hl) => `<path d="${d}" fill="${P.ink}"/><path d="${hl}" fill="none" stroke="${P.white}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>`;
  const BEAST = [
    function lion() {
      const c = P.hero[0], d = P.heroDark[0], k = P.ink, w = P.white;
      let s = '';
      s += `<path d="M22 50 Q7 50 9 33" fill="none" stroke="${STEEL}" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<path d="M9 36 Q1 27 8 15 Q10 22 16 24 Q17 32 9 36Z" fill="${GOLD}"/><path d="M9.6 33 Q6 28 9 22 Q10 26 13 27 Q13 31 9.6 33Z" fill="${c}"/>`;
      s += `<rect x="31" y="58" width="9" height="19" fill="${d}"/><rect x="63" y="58" width="9" height="19" fill="${d}"/><rect x="29.5" y="75" width="12" height="5" rx="2" fill="${STEEL}"/><rect x="61.5" y="75" width="12" height="5" rx="2" fill="${STEEL}"/>`;
      s += `<path d="M19 49 Q19 40 28 40 L68 40 Q77 40 77 49 L77 58 Q77 66 68 66 L28 66 Q19 66 19 58Z" fill="${c}"/>`;
      s += `<path d="M27 60 L67 60 L64 66 L30 66Z" fill="${d}" opacity=".5"/><rect x="38" y="48" width="14" height="3" rx="1.2" fill="${d}"/><rect x="38" y="53" width="14" height="3" rx="1.2" fill="${d}"/>`;
      s += canopy('M31 40 Q34 30.5 44 30.5 Q52 30.5 54 40Z', 'M35.5 37 Q37.5 33.5 42.5 33.2');
      // near legs
      s += `<circle cx="27" cy="57" r="8.6" fill="${c}"/><path d="M21 60 L33.5 60 L32.5 78 L22.5 78Z" fill="${c}"/><rect x="22" y="68" width="11" height="2.8" rx="1" fill="${d}"/><path d="M19.5 84 Q19.5 77 25 77 L31 77 Q35.5 77 35.5 84Z" fill="${STEEL2}"/><path d="M24.5 84 v-3 M29.5 84 v-3" stroke="${STEEL}" stroke-width="1.2"/>`;
      s += `<path d="M57.5 60 L70 60 L69 78 L59 78Z" fill="${c}"/><rect x="58.5" y="68" width="11" height="2.8" rx="1" fill="${d}"/><path d="M56 84 Q56 77 61.5 77 L67.5 77 Q72 77 72 84Z" fill="${STEEL2}"/><path d="M61 84 v-3 M66 84 v-3" stroke="${STEEL}" stroke-width="1.2"/>`;
      // mane, head
      s += `<path d="M60 50 L49 44 L57 38 L48 28 L60 29 L57 14 L68 23 L74 9 L80 24 L90 20 L84 34 L66 52Z" fill="${GOLD}"/>`;
      s += `<path d="M63 31 L84 28 Q93 29 94 37 L94 43 L85 51 L66 51 Q61 41 63 31Z" fill="${c}"/>`;
      s += `<path d="M79 39 L94 37.5 L94 43 L85 51 L77 47Z" fill="${STEEL2}"/><path d="M78.5 46.4 L92 43" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/><path d="M83 45.2 l1.2 2.8 l1.4 -3.4Z M87.2 44.2 l1.2 2.6 l1.4 -3.3Z" fill="${w}"/><circle cx="92.4" cy="38.6" r="1.6" fill="${k}"/>`;
      s += `<path d="M70.5 33.4 L83 31.4 L85 36.4 L72.5 38.6Z" fill="${k}"/><path d="M76 34 L82 33.2 L82.8 35.6 L76.8 36.4Z" fill="${GOLD}"/>`;
      s += `<path d="M65 31 L62.5 21.5 L72 27.5Z" fill="${d}"/>`;
      s += disc(0, 64, 55.5, 6.6);
      return s;
    },
    function shark() {
      const c = P.hero[1], d = P.heroDark[1], k = P.ink, w = P.white;
      let s = '';
      s += `<path d="M16 50 L2 30 Q8 44 9 50 Q8 56 2 70Z" fill="${d}"/><rect x="11" y="45.5" width="8" height="9" rx="2" fill="${STEEL}"/>`;
      s += `<path d="M40 35 L50 11 Q59 22 63 35Z" fill="${d}"/>`;
      s += `<path d="M15 50 Q32 31 60 32 Q85 33 97 48 Q86 63 60 65 Q32 67 15 50Z" fill="${c}"/>`;
      s += `<path d="M21 54.5 Q40 60 60 58.5 Q80 57 96 49 Q86 63 60 65 Q34 66.5 21 54.5Z" fill="${STEEL2}"/>`;
      s += `<path d="M54 60 L44 80 L67 63Z" fill="${d}"/>`;
      s += `<path d="M78 54.4 L96 49 Q93 57 85 60Z" fill="${k}"/><path d="M80 54 l1.6 3.4 l1.8 -4.4Z M84.6 52.6 l1.6 3.4 l1.8 -4.4Z M89.2 51.2 l1.5 3.2 l1.8 -4.2Z" fill="${w}"/>`;
      s += `<path d="M67 41 l-2 9 M71 41.5 l-2 9 M75 42 l-2 9" stroke="${d}" stroke-width="1.8" stroke-linecap="round"/>`;
      s += canopy('M64 33.6 Q76 33 83 39.4 L66 40.4Z', 'M68 36.8 Q73 36 77 37.6');
      s += `<circle cx="86.5" cy="45" r="2.2" fill="${k}"/><circle cx="87.1" cy="44.4" r=".8" fill="${w}"/>`;
      s += `<path d="M24 49 H33" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/><path d="M50 11 L52.4 17" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>`;
      s += disc(1, 47, 47, 7.2);
      return s;
    },
    function falcon() {
      const c = P.hero[2], d = P.heroDark[2], k = P.ink, w = P.white;
      let s = '';
      s += `<path d="M42 76 L33 97 L44.5 90 L50 99 L55.5 90 L67 97 L58 76Z" fill="${d}"/>`;
      s += mir(`<path d="M43 40 L3 50 L9 61 L18 57 L20 67 L29 62 L32 72 L43 66Z" fill="${c}"/><path d="M43 40 L3 50 L6 55.4 L43 47Z" fill="${k}"/><path d="M18 57 L24 50.6 M29 62 L33 49" stroke="${d}" stroke-width="1.6" stroke-linecap="round"/><rect x="33.5" y="58" width="6.5" height="15" rx="2.4" fill="${STEEL}"/><rect x="34.6" y="71" width="4.3" height="4" rx="1" fill="${k}"/>`);
      s += `<path d="M50 5 Q61 20 61 44 L58.5 80 L41.5 80 L39 44 Q39 20 50 5Z" fill="${c}"/>`;
      s += `<path d="M50 5 Q61 20 61 44 L58.5 80 L50 80Z" fill="${d}" opacity=".3"/>`;
      s += `<path d="M50 1 L44.6 13 L55.4 13Z" fill="${k}"/>`;
      s += canopy('M44.6 17 Q50 12.6 55.4 17 L54.4 30 L45.6 30Z', 'M47.4 19.4 Q48.4 17.6 50.6 17.2');
      s += `<rect x="44" y="64" width="12" height="3" rx="1.2" fill="${d}"/><rect x="44" y="69.5" width="12" height="3" rx="1.2" fill="${d}"/>`;
      s += disc(2, 50, 46, 7.4);
      return s;
    },
    function rhino() {
      const c = P.hero[3], d = P.heroDark[3], k = P.ink, w = P.white;
      let s = '';
      s += `<path d="M14 46 L4 42 L7 52Z" fill="${d}"/>`;
      s += `<rect x="26" y="62" width="11" height="15" fill="${d}"/><rect x="58" y="62" width="11" height="15" fill="${d}"/><rect x="24.5" y="75" width="14" height="5" rx="2" fill="${STEEL}"/><rect x="56.5" y="75" width="14" height="5" rx="2" fill="${STEEL}"/>`;
      s += `<path d="M12 50 Q12 33 33 31 L60 31 Q78 33 80 48 L80 60 Q80 68 71 68 L22 68 Q12 68 12 59Z" fill="${c}"/>`;
      s += `<path d="M20 35 L62 32.4 L57 45 L24 45Z" fill="${d}" opacity=".55"/><path d="M34 34 V45 M48 33 V45" stroke="${c}" stroke-width="1.6"/>`;
      s += canopy('M35 31 Q38 22 48 22 Q57 22 59 31Z', 'M39.5 28 Q41.5 25 46.5 24.6');
      s += `<circle cx="24" cy="60" r="8.6" fill="${c}"/><path d="M17 62 L31.5 62 L30.5 79 L18.5 79Z" fill="${c}"/><rect x="18" y="70" width="13" height="2.8" rx="1" fill="${d}"/><path d="M15 85 Q15 78 21 78 L28.5 78 Q33.5 78 33.5 85Z" fill="${STEEL2}"/><path d="M21 85 v-3 M27 85 v-3" stroke="${STEEL}" stroke-width="1.2"/>`;
      s += `<path d="M54.5 62 L69 62 L68 79 L56 79Z" fill="${c}"/><rect x="55.5" y="70" width="13" height="2.8" rx="1" fill="${d}"/><path d="M52.5 85 Q52.5 78 58.5 78 L66 78 Q71 78 71 85Z" fill="${STEEL2}"/><path d="M58.5 85 v-3 M64.5 85 v-3" stroke="${STEEL}" stroke-width="1.2"/>`;
      // head, horns
      s += `<path d="M71 38 L88 41 Q97 45 97 55 L95 63 L79 66 Q69 55 71 38Z" fill="${c}"/>`;
      s += `<path d="M82 59.4 L96 57 L95 63 L80.6 65.6Z" fill="${STEEL2}"/>`;
      s += `<path d="M89 48 L99 22 L97.6 53Z" fill="${GOLD}"/><path d="M80.6 42.4 L84.4 28 L88.4 43.6Z" fill="${GOLD}"/>`;
      s += `<path d="M71.6 39 L69 28.4 L79 35.4Z" fill="${d}"/>`;
      s += `<path d="M77.6 47.6 L87 49 L87 54 L78.6 53.6Z" fill="${k}"/><path d="M81.4 49.6 L85.6 50.2 L85.6 52.4 L81.8 52.2Z" fill="${GOLD}"/>`;
      s += disc(3, 44, 56, 7.4);
      return s;
    },
    function crane() {
      const c = P.hero[4], d = P.heroDark[4], k = P.ink, w = P.white;
      let s = '';
      s += `<path d="M46 62 L41.5 78 L46 93 M56 62 L59 78 L54.5 93" fill="none" stroke="${STEEL}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<circle cx="41.5" cy="78" r="3" fill="${GOLD}"/><circle cx="59" cy="78" r="3" fill="${GOLD}"/>`;
      s += `<path d="M38 95 H52 M47.5 95 H61.5" stroke="${STEEL2}" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<path d="M27 48 L4 40 L13 50 L2 55 L14 58 L6 68 L29 60Z" fill="${d}"/>`;
      s += `<path d="M66 44 Q80 35 73 22 Q69 13 77 9" fill="none" stroke="${c}" stroke-width="6.4" stroke-linecap="round"/>`;
      s += `<path d="M70.4 37.6 l5 3 M71.6 26.6 l5.6 -2" stroke="${STEEL2}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += `<path d="M22 52 Q25 36 50 36 Q71 36 75 50 Q71 66 48 66 Q28 66 22 52Z" fill="${c}"/>`;
      s += canopy('M37 37.6 Q42 29.6 52 31.6 Q56 33 57 36.4Z', 'M42 35.4 Q45 33 49.4 33.6');
      s += `<path d="M33 47 Q54 40 70 50 Q56 63 37 59.4Z" fill="${d}"/><path d="M41 55.6 Q52 54 61 50 M39 51 Q50 48.4 58 46.6" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
      s += `<path d="M73.4 6.4 L67 0.6 L78 3.4Z" fill="${GOLD}"/><circle cx="78" cy="9.4" r="6.2" fill="${c}"/>`;
      s += `<path d="M83 6.6 L99 11.4 L83 13.6Z" fill="${GOLD}"/><circle cx="79.4" cy="8.6" r="1.7" fill="${k}"/>`;
      s += disc(4, 31.6, 50.4, 6.4);
      return s;
    },
  ];
  const BEAST_NAME = ['Ember Lion', 'Tide Shark', 'Volt Falcon', 'Grove Rhino', 'Star Crane'];
  const beast = (c) => BEAST[c]();
  const beastSVG = (c, attrs) => svg('0 0 100 100', BEAST[c](), attrs);

  /* ---------- grain + halftone, shared by the big pieces ---------- */
  const DEFS = `<defs>
    <filter id="sg" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .12  0 0 0 0 .1  0 0 0 0 .16  0 0 0 .55 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <pattern id="dots" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".55" fill="${P.ink}" opacity=".16"/></pattern>
  </defs>`;

  /* ---------- the box front, 100×100: title, the combined robot facing the final boss under a rising sun ---------- */
  function box() {
    let s = DEFS + `<rect width="100" height="100" fill="${P.paper}"/>`;
    let rays = '';
    const cx = 50, cy = 62;
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18, R = 100;
      rays += `<path d="M${cx} ${cy} L${(cx + R * Math.cos(a0)).toFixed(2)} ${(cy + R * Math.sin(a0)).toFixed(2)} L${(cx + R * Math.cos(a1)).toFixed(2)} ${(cy + R * Math.sin(a1)).toFixed(2)}Z"/>`;
    }
    s += `<g fill="${P.paper2}">${rays}</g>`;
    s += `<circle cx="${cx}" cy="${cy}" r="21" fill="${P.hero[0]}"/><circle cx="${cx}" cy="${cy}" r="21" fill="url(#dots)"/>`;
    // horizon
    s += `<rect x="0" y="86" width="100" height="14" fill="${P.ink}"/><rect x="0" y="86" width="100" height="1.2" fill="${P.hero[2]}"/>`;
    // the robot on the left, the boss on the right, a clear gap between them
    s += `<g transform="translate(6 30.6) scale(.4)">${robot()}</g>`;
    s += `<g transform="translate(57.5 51.2) scale(.36)">${monster(17)}</g>`;
    s += `<rect width="100" height="100" filter="url(#sg)" opacity=".5"/>`;
    return s;
  }
  /* ---------- cards as HTML, sized by one CSS variable so they print the same at any size (styles in cards.css) ---------- */
  const TYPE_NAME = { run: 'Run', set: 'Set', color: 'Flush', combine: 'Roll Call' };
  // the little picture of each combo: abstract marks in one color, so they never suggest particular ranks or colors
  function comboIcon(type) {
    const k = 'currentColor';
    const body = type === 'run' ? `<rect x="2" y="9" width="6" height="5" rx="1.2" fill="${k}"/><rect x="11" y="5.5" width="6" height="8.5" rx="1.2" fill="${k}"/><rect x="20" y="2" width="6" height="12" rx="1.2" fill="${k}"/>`
      : type === 'set' ? `<rect x="2" y="4" width="6" height="10" rx="1.2" fill="${k}"/><rect x="11" y="4" width="6" height="10" rx="1.2" fill="${k}"/><rect x="20" y="4" width="6" height="10" rx="1.2" fill="${k}"/>`
      : type === 'color' ? `<circle cx="5" cy="8" r="3.4" fill="${k}"/><circle cx="14" cy="8" r="3.4" fill="${k}"/><circle cx="23" cy="8" r="3.4" fill="${k}"/>`
      : `<circle cx="5" cy="8" r="3.4" fill="${k}"/><path d="M14 4.2 L17.6 11.4 H10.4Z" fill="${k}"/><rect x="19.8" y="4.8" width="6.4" height="6.4" rx=".8" fill="${k}"/>`;
    return svg('0 0 28 16', body, ' class="ci" aria-hidden="true"');
  }
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  /* A Boss card as printed: act, art, name, the combo, and its size for 2, 3 and 4 Heroes. `n` marks the squad size in play.
     b: { key, act, type, name, needs: [2, 3, 4 Heroes], hex?, brooded? }   opts: { cls, attrs, hexText: { name, text } } */
  function bossCardHTML(b, n, opts) {
    opts = opts || {};
    const ACTN = ['Episode 1', 'Episode 2', 'Finale'], needs = b.needs || [b.need, b.need, b.need];
    const cells = needs.map((v, i) => `<span class="nu${n === i + 2 ? ' on' : ''}"><i>${'<u></u>'.repeat(i + 2)}</i><b>${v + (b.brooded && n === i + 2 ? '' : '')}</b></span>`).join('');
    const label = `${b.name}: ${TYPE_NAME[b.type]} of ${n ? (b.need != null ? b.need : needs[n - 2]) : needs.join(' / ')}`;
    return `<div class="mcard a${b.act}${b.hex ? ' hydra' : ''}${opts.cls ? ' ' + opts.cls : ''}" role="img" aria-label="${esc(label)}"${opts.attrs || ''}><div class="mf">` +
      `<div class="mt"><span>${ACTN[b.act]}</span><span>${b.key >= 18 ? 'Vael' : 'Gorvax'}</span></div>` +
      `<div class="art">${monsterSVG(b.key, ' aria-hidden="true"', b.hex)}</div>` +
      `<div class="nm${b.name.length > 12 ? ' long' : ''}">${esc(b.name)}</div>` +
      `<div class="cb"><span>${TYPE_NAME[b.type]} of</span></div>` +
      `<div class="nums">${cells}</div>` +
      (opts.hexText ? `<div class="hx"><b>${esc(opts.hexText.name)}</b> ${esc(opts.hexText.text)}</div>` : '') +
      `</div></div>`;
  }
  // card backs: Hero cards share one; Boss cards have one per act
  const heroBackHTML = (cls) => `<span class="sc bk${cls ? ' ' + cls : ''}">${svg('0 0 50 70', `<rect width="50" height="70" fill="${P.ink}"/><g fill="none" stroke="${P.cream}" stroke-width="1" opacity=".5"><rect x="4" y="4" width="42" height="62" rx="4"/></g>` + [0, 1, 2, 3, 4].map((c, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return `<circle cx="${(25 + 13 * Math.cos(a)).toFixed(1)}" cy="${(35 + 13 * Math.sin(a)).toFixed(1)}" r="5.4" fill="${P.hero[c]}"/>` + emblem(c, P.cream, 25 + 13 * Math.cos(a) - 3.4, 35 + 13 * Math.sin(a) - 3.4, 6.8); }).join('') + `<circle cx="25" cy="35" r="3" fill="${P.cream}"/>`, ' aria-hidden="true"')}</span>`;
  const bossBackHTML = (act, label, opts) => `<div class="mcard mbk a${act}${opts && opts.cls ? ' ' + opts.cls : ''}"${opts && opts.attrs || ''}><div class="mf"><div class="ring">${svg('0 0 100 100', `<circle cx="50" cy="50" r="34" fill="none" stroke="${P.cream}" stroke-width="3" opacity=".8"/><path d="M50 22 L57 43 L79 43 L61 56 L68 78 L50 64 L32 78 L39 56 L21 43 L43 43Z" fill="${P.cream}" opacity=".9"/>`, ' aria-hidden="true"')}</div><div class="bl">${['Episode 1', 'Episode 2', 'Finale'][act]}</div>${label != null ? `<div class="bn">${label}</div>` : ''}</div></div>`;
  // a Hero power card
  const POWER_ART = [['Command', 'Always on', 'When you lead, you may add up to 3 cards.'], ['Riptide', 'Once a game', 'When the squad would discard, nobody does.'], ['Overcharge', 'Once a game', 'One card you add fits the combo, whatever its rank and color.'], ['Steady', 'Always on', 'Whenever the squad discards, you discard 1 fewer.'], ['Beacon', 'Once an episode', 'On your turn, show one card from your hand to everyone.']];
  const powerCardHTML = (c, cls) => `<div class="mcard pwc c${c}${cls ? ' ' + cls : ''}"><div class="mf"><div class="mt"><span>Hero power</span><span>${['Red', 'Blue', 'Yellow', 'Green', 'Pink'][c]}</span></div><div class="art">${beastSVG(c, ' aria-hidden="true"')}</div><div class="nm">${POWER_ART[c][0]}</div><div class="cb"><span>${POWER_ART[c][1]}</span></div><div class="hx">${POWER_ART[c][2]}</div></div></div>`;
  // card face (HTML) used by the playable build
  const cardHTML = (c, cls) => `<span class="sc c${c.c}${cls ? ' ' + cls : ''}" data-id="${c.id}"><b>${c.r}</b>${svg('0 0 24 24', emblem(c.c, 'currentColor'), ' class="se" aria-hidden="true"')}${beastSVG(c.c, ' class="pa" aria-hidden="true"')}<b class="br">${c.r}</b></span>`;

  const api = { P, EMB, emblem, hero, heroSVG, monster, monsterSVG, box, DEFS, svg, cardHTML, MONSTERS: M, HEADS: H, hydraHead, PART, PART_BOX, robot, partSVG, BEAST, BEAST_NAME, beast, beastSVG, villain, mix, comboIcon, bossCardHTML, heroBackHTML, bossBackHTML, powerCardHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SentaiArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
