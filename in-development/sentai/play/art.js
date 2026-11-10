/* Sentai — the art, drawn as SVG strings so the box, the page and the playable build share one source.
   Flat retro poster style: warm paper, a few bold inks, chunky geometric figures, a little grain.
   SentaiArt.emblem(color), .robot(), .partSVG(color), .monster(key), .box() */
(function (root) {
  'use strict';
  const P = {
    paper: '#F3E7CF', paper2: '#E9D9B8', ink: '#1F1A2B', cream: '#FFF6E4', white: '#FFFDF7', gray: '#C9C2B4',
    hero: ['#E2482F', '#2E5FAE', '#F0B429', '#3B9562', '#EC8AA2'],          // Red, Blue, Yellow, Green, Pink
    heroDark: ['#A92E1B', '#1D3F7A', '#B9821A', '#256B43', '#B65C74'],
    act: ['#7A5BA6', '#D76A3C', '#2B2440'],                                  // Boss card backs: Act I, II, III
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

  /* ---------- monsters: 18 of them, one per Boss card ---------- */
  // [body color, belly, accent, shape, eyes, horns, size]  shape: blob|box|tall|bat|tower|wyrm
  const M = [
    ['#8A8F99', '#B9BDC4', '#E2482F', 'box', 1, 0, .62],   // Cog Grunts
    ['#9C5B3C', '#C98A62', '#F0B429', 'blob', 2, 0, .58],  // Rust Rats
    ['#3A3150', '#5E5480', '#EC8AA2', 'bat', 2, 0, .6],    // Inkbats
    ['#5BB8C9', '#A6DDE6', '#F0B429', 'blob', 3, 0, .6],   // Static Swarm
    ['#EC8AA2', '#F7C4D0', '#2E5FAE', 'blob', 2, 1, .64],  // Gum Golem
    ['#7C8A4A', '#AEBB7A', '#E2482F', 'box', 2, 2, .58],   // Pin Mites
    ['#2E7F8F', '#7FC4CC', '#F3E7CF', 'tall', 2, 2, .78],  // Tiderazor
    ['#C9862F', '#F0C77A', '#2B2440', 'blob', 1, 1, .8],   // Lanternjaw
    ['#B8643A', '#E5A27A', '#2E5FAE', 'tall', 2, 0, .8],   // Copper Kraken
    ['#5E7F3A', '#9DBB6E', '#E2482F', 'bat', 2, 2, .78],   // Thornbeak
    ['#6B4FA0', '#A58BD0', '#F0B429', 'bat', 3, 1, .76],   // Voltmoth
    ['#C2392C', '#E8806E', '#F3E7CF', 'box', 2, 2, .8],    // Twin Oni
    ['#4A4458', '#7D7790', '#E2482F', 'tower', 2, 2, 1],   // Megalith Rex
    ['#3D4F66', '#7C8FA8', '#F0B429', 'tower', 1, 2, 1],   // Ironhorn Titan
    ['#2B2440', '#5B4E7E', '#EC8AA2', 'blob', 3, 2, 1],    // Starmaw
    ['#8C2F2A', '#C9614F', '#F0B429', 'tower', 2, 1, .98], // Doom Pagoda
    ['#22303F', '#4E6478', '#E2482F', 'wyrm', 2, 2, 1],    // Eclipse Wyrm
    ['#5A2140', '#9A4A70', '#F0B429', 'tower', 2, 3, 1],   // Emperor Gorvax
  ];

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
    split: 'M-3.4 -3 L0 0 L3.4 -3 M0 0 V3.6', thorns: 'M-3.6 2.6 L-2 -2.6 L0 2.6 L2 -2.6 L3.6 2.6', regrow: 'M-3 1.5 A3 3 0 1 1 0 3 M-3 1.5 L-3.6 -1.2 M-3 1.5 L-0.4 1',
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
  function monster(key, hex) {
    if (key >= 18) return hydraHead(key - 18, hex);
    const [body, belly, acc, shape, eyes, horns, size] = M[key];
    const ink = P.ink, w = P.white;
    let s = '';
    // the body sits in a 100×100 box, feet on y=94; size scales from the feet
    const g = (inner) => `<g transform="translate(50 94) scale(${size}) translate(-50 -94)">${inner}</g>`;
    let b = '', top = 20;
    // feet
    b += `<rect x="30" y="82" width="14" height="12" rx="5" fill="${ink}"/><rect x="56" y="82" width="14" height="12" rx="5" fill="${ink}"/>`;
    if (shape === 'box') { b += `<rect x="20" y="24" width="60" height="62" rx="12" fill="${body}"/>`; top = 24; }
    else if (shape === 'blob') { b += `<path d="M18 62 Q16 22 50 20 Q84 22 82 62 Q82 88 50 88 Q18 88 18 62Z" fill="${body}"/>`; top = 21; }
    else if (shape === 'tall') { b += `<path d="M28 88 L24 34 Q24 12 50 12 Q76 12 76 34 L72 88Z" fill="${body}"/>`; top = 13; }
    else if (shape === 'bat') {
      b += `<path d="M24 46 L2 30 L8 52 L0 58 L14 62 L24 70Z" fill="${body}"/><path d="M76 46 L98 30 L92 52 L100 58 L86 62 L76 70Z" fill="${body}"/>`;
      b += `<path d="M24 64 Q22 26 50 24 Q78 26 76 64 Q76 88 50 88 Q24 88 24 64Z" fill="${body}"/>`; top = 25;
    } else if (shape === 'tower') {
      b += `<path d="M22 88 L18 40 L30 28 L30 14 L70 14 L70 28 L82 40 L78 88Z" fill="${body}"/>`; top = 14;
    } else if (shape === 'wyrm') {
      b += `<path d="M20 88 Q8 60 26 44 Q22 18 50 14 Q80 16 76 44 Q92 62 80 88Z" fill="${body}"/>`;
      b += `<path d="M78 70 Q98 64 96 46 Q102 66 86 80Z" fill="${body}"/>`; top = 15;
    }
    // arms
    b += `<rect x="10" y="52" width="14" height="22" rx="7" fill="${body}" transform="rotate(14 17 52)"/><rect x="76" y="52" width="14" height="22" rx="7" fill="${body}" transform="rotate(-14 83 52)"/>`;
    b += `<circle cx="13" cy="74" r="5" fill="${acc}"/><circle cx="87" cy="74" r="5" fill="${acc}"/>`;
    // belly
    b += `<ellipse cx="50" cy="70" rx="19" ry="13" fill="${belly}"/>`;
    b += `<path d="M38 66 H62 M40 72 H60" stroke="${body}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    // horns
    if (horns >= 1) b += `<path d="M30 ${top + 6} L22 ${top - 14} L40 ${top + 2}Z" fill="${acc}"/><path d="M70 ${top + 6} L78 ${top - 14} L60 ${top + 2}Z" fill="${acc}"/>`;
    if (horns >= 2) b += `<path d="M44 ${top + 1} L50 ${top - 12} L56 ${top + 1}Z" fill="${acc}"/>`;
    if (horns >= 3) b += `<path d="M34 ${top - 2} L36 ${top - 18} L42 ${top - 6} L50 ${top - 22} L58 ${top - 6} L64 ${top - 18} L66 ${top - 2}Z" fill="${P.hero[2]}"/>`;
    // eyes and brow
    const ey = top + 18;
    const xs = eyes === 1 ? [50] : eyes === 2 ? [39, 61] : [34, 50, 66];
    const r = eyes === 1 ? 9 : eyes === 2 ? 7 : 5.6;
    xs.forEach((x) => { b += `<circle cx="${x}" cy="${ey}" r="${r}" fill="${w}"/><circle cx="${x + r * .25}" cy="${ey + r * .2}" r="${r * .5}" fill="${ink}"/>`; });
    b += `<path d="M${xs[0] - r - 2} ${ey - r - 4} L${xs[xs.length - 1] + r + 2} ${ey - r - 4} L${xs[xs.length - 1] + r} ${ey - r + 1} L50 ${ey - r * .4} L${xs[0] - r} ${ey - r + 1}Z" fill="${ink}" opacity=".9"/>`;
    // mouth with teeth
    const my = ey + r + 9;
    b += `<path d="M34 ${my} Q50 ${my + 12} 66 ${my}Z" fill="${ink}"/>`;
    b += `<path d="M38 ${my + .5} L41 ${my + 5} L44 ${my + 1.5}Z M56 ${my + 1.5} L59 ${my + 5} L62 ${my + .5}Z" fill="${w}"/>`;
    s += g(b);
    return s;
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
  // card face (HTML) used by the playable build
  const cardHTML = (c, cls) => `<span class="sc c${c.c}${cls ? ' ' + cls : ''}" data-id="${c.id}"><b>${c.r}</b>${svg('0 0 24 24', emblem(c.c, 'currentColor'), ' class="se" aria-hidden="true"')}${partSVG(c.c, ' class="pa" aria-hidden="true"')}<b class="br">${c.r}</b></span>`;

  const api = { P, EMB, emblem, hero, heroSVG, monster, monsterSVG, box, DEFS, svg, cardHTML, MONSTERS: M, HEADS: H, hydraHead, PART, PART_BOX, robot, partSVG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SentaiArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
