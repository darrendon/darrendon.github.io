/* Abducted — every piece of flat art, drawn as SVG strings so the card faces, box, kit, sell sheet and
   the playable all share one source. Flat shapes, thick ink outlines and a small night palette, in the
   spirit of Sai Beppu and 342. Load in a browser (window.AbArt) or node (module.exports). */
(function (root) {
  'use strict';
  const P = {
    night: '#1E2447', deep: '#141833', ink: '#1B1E33', cream: '#F6EEDC', paper: '#FBF6EA',
    hum: '#EE8A2B', humDeep: '#B85F14', humSoft: '#FBD9A8',
    ali: '#8FCB3F', aliDeep: '#4F8A1C', aliSoft: '#DDF2B8',
    pink: '#EE9AA8', sky: '#7C93DC', lilac: '#B7BCD6', beam: '#E8F7A0', skin1: '#F4C9A0', skin2: '#C98B5E', skin3: '#8D5A3B',
  };
  const S = 'stroke="' + P.ink + '" stroke-linejoin="round" stroke-linecap="round"';

  /* ---------------- characters, each in a 200 x 200 box, feet at y≈196 */
  const humans = [
    // farmer in a straw hat and overalls
    () => `<g ${S} stroke-width="6">
      <path d="M58 196 V150 Q58 120 100 120 Q142 120 142 150 V196Z" fill="#4A6FB8"/>
      <path d="M78 122 V150 H122 V122" fill="none"/><rect x="84" y="150" width="32" height="26" rx="4" fill="#4A6FB8"/>
      <circle cx="100" cy="84" r="34" fill="${P.skin1}"/>
      <path d="M44 66 Q100 50 156 66 Q100 76 44 66Z" fill="#F2CE5C"/><path d="M70 64 Q72 30 100 30 Q128 30 130 64Z" fill="#F2CE5C"/>
      <path d="M72 58 H128" stroke="${P.hum}" stroke-width="7"/>
      <circle cx="88" cy="88" r="4.5" fill="${P.ink}" stroke="none"/><circle cx="112" cy="88" r="4.5" fill="${P.ink}" stroke="none"/>
      <path d="M90 102 Q100 109 110 102" fill="none"/><circle cx="78" cy="99" r="5" fill="${P.pink}" stroke="none"/><circle cx="122" cy="99" r="5" fill="${P.pink}" stroke="none"/></g>`,
    // kid in a backwards cap and striped shirt
    () => `<g ${S} stroke-width="6">
      <path d="M62 196 V152 Q62 124 100 124 Q138 124 138 152 V196Z" fill="${P.cream}"/>
      <path d="M64 150 H136 M63 170 H137" stroke="#E25F4C" stroke-width="8"/>
      <circle cx="100" cy="86" r="33" fill="${P.skin2}"/>
      <path d="M67 80 Q68 46 100 46 Q132 46 133 80Z" fill="#E25F4C"/><path d="M66 80 Q50 82 46 74" fill="none" stroke-width="8"/>
      <circle cx="88" cy="92" r="4.5" fill="${P.ink}" stroke="none"/><circle cx="112" cy="92" r="4.5" fill="${P.ink}" stroke="none"/>
      <path d="M92 106 Q100 112 108 106" fill="none"/></g>`,
    // grandma with a bun and round glasses
    () => `<g ${S} stroke-width="6">
      <path d="M56 196 Q56 128 100 126 Q144 128 144 196Z" fill="#9C7CC9"/>
      <circle cx="100" cy="40" r="15" fill="#E9E4EE"/>
      <circle cx="100" cy="88" r="34" fill="${P.skin1}"/>
      <path d="M66 82 Q68 52 100 52 Q132 52 134 82 Q118 66 100 66 Q82 66 66 82Z" fill="#E9E4EE"/>
      <circle cx="87" cy="92" r="9" fill="none" stroke-width="4.5"/><circle cx="113" cy="92" r="9" fill="none" stroke-width="4.5"/><path d="M96 92 H104" stroke-width="4.5"/>
      <circle cx="87" cy="92" r="3" fill="${P.ink}" stroke="none"/><circle cx="113" cy="92" r="3" fill="${P.ink}" stroke="none"/>
      <path d="M92 108 Q100 113 108 108" fill="none"/></g>`,
    // trucker with a big moustache and a cap
    () => `<g ${S} stroke-width="6">
      <path d="M54 196 V150 Q54 122 100 122 Q146 122 146 150 V196Z" fill="#3E8E7A"/>
      <path d="M100 124 V196" stroke-width="5"/>
      <circle cx="100" cy="86" r="34" fill="${P.skin3}"/>
      <path d="M66 74 Q66 44 100 44 Q134 44 134 74Z" fill="${P.cream}"/><path d="M60 74 H150 Q146 82 132 82 H66Z" fill="${P.hum}"/>
      <circle cx="88" cy="90" r="4.5" fill="${P.ink}" stroke="none"/><circle cx="112" cy="90" r="4.5" fill="${P.ink}" stroke="none"/>
      <path d="M80 104 Q90 98 100 104 Q110 98 120 104 Q110 112 100 107 Q90 112 80 104Z" fill="#5A3A22"/></g>`,
  ];
  const aliens = [
    // classic: big almond eyes, round head
    () => `<g ${S} stroke-width="6">
      <path d="M66 196 V158 Q66 132 100 132 Q134 132 134 158 V196Z" fill="${P.lilac}"/>
      <path d="M100 26 C56 26 52 62 54 82 C58 116 82 132 100 132 C118 132 142 116 146 82 C148 62 144 26 100 26Z" fill="${P.ali}"/>
      <ellipse cx="80" cy="84" rx="15" ry="9" transform="rotate(28 80 84)" fill="${P.ink}" stroke="none"/><ellipse cx="120" cy="84" rx="15" ry="9" transform="rotate(-28 120 84)" fill="${P.ink}" stroke="none"/>
      <circle cx="76" cy="80" r="3" fill="#fff" stroke="none"/><circle cx="116" cy="80" r="3" fill="#fff" stroke="none"/>
      <path d="M93 112 Q100 116 107 112" fill="none"/></g>`,
    // one big eye and wobbly antennae
    () => `<g ${S} stroke-width="6">
      <path d="M58 196 Q58 138 100 136 Q142 138 142 196Z" fill="${P.sky}"/>
      <path d="M80 50 Q70 26 58 24 M120 50 Q130 26 142 24" fill="none"/><circle cx="58" cy="22" r="8" fill="${P.pink}"/><circle cx="142" cy="22" r="8" fill="${P.pink}"/>
      <ellipse cx="100" cy="92" rx="46" ry="46" fill="${P.ali}"/>
      <circle cx="100" cy="86" r="22" fill="#fff"/><circle cx="104" cy="88" r="10" fill="${P.ink}" stroke="none"/><circle cx="100" cy="84" r="3" fill="#fff" stroke="none"/>
      <path d="M86 120 Q100 128 114 120" fill="none"/></g>`,
    // three eyes, tall head
    () => `<g ${S} stroke-width="6">
      <path d="M62 196 V156 Q62 132 100 132 Q138 132 138 156 V196Z" fill="#E7C24F"/>
      <rect x="62" y="30" width="76" height="104" rx="38" fill="${P.ali}"/>
      <circle cx="82" cy="78" r="9" fill="#fff"/><circle cx="118" cy="78" r="9" fill="#fff"/><circle cx="100" cy="58" r="9" fill="#fff"/>
      <circle cx="83" cy="80" r="4" fill="${P.ink}" stroke="none"/><circle cx="119" cy="80" r="4" fill="${P.ink}" stroke="none"/><circle cx="101" cy="60" r="4" fill="${P.ink}" stroke="none"/>
      <path d="M86 106 Q100 116 114 106" fill="none"/></g>`,
    // tiny alien in a bubble helmet
    () => `<g ${S} stroke-width="6">
      <path d="M60 196 V160 Q60 134 100 134 Q140 134 140 160 V196Z" fill="${P.pink}"/>
      <circle cx="100" cy="88" r="52" fill="#DDEBFA" opacity=".9"/>
      <path d="M100 52 V40" /><circle cx="100" cy="36" r="6" fill="${P.hum}"/>
      <ellipse cx="100" cy="98" rx="30" ry="28" fill="${P.ali}"/>
      <circle cx="90" cy="94" r="5" fill="${P.ink}" stroke="none"/><circle cx="110" cy="94" r="5" fill="${P.ink}" stroke="none"/>
      <path d="M93 110 Q100 114 107 110" fill="none"/>
      <path d="M66 70 Q72 54 86 48" fill="none" stroke="#fff" stroke-width="5"/></g>`,
  ];

  const saucer = (x, y, s, beam) => `<g transform="translate(${x} ${y}) scale(${s})" ${S} stroke-width="5">
      ${beam ? `<path d="M-34 10 L-70 120 H70 L34 10Z" fill="${P.beam}" stroke="none" opacity=".55"/>` : ''}
      <path d="M-30 -2 Q-28 -34 0 -34 Q28 -34 30 -2Z" fill="#A9E6DA"/>
      <ellipse cx="0" cy="2" rx="62" ry="16" fill="${P.lilac}"/>
      <ellipse cx="0" cy="8" rx="40" ry="6" fill="#8E95BA" stroke="none"/>
      <circle cx="-38" cy="2" r="4.5" fill="#F7E36B" stroke-width="3"/><circle cx="-13" cy="5" r="4.5" fill="#F7E36B" stroke-width="3"/><circle cx="13" cy="5" r="4.5" fill="#F7E36B" stroke-width="3"/><circle cx="38" cy="2" r="4.5" fill="#F7E36B" stroke-width="3"/>
    </g>`;
  const cow = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" ${S} stroke-width="5">
      <rect x="-46" y="-22" width="92" height="44" rx="20" fill="#fff"/>
      <path d="M-20 -22 Q-8 -6 -24 6 Q-36 0 -38 -16Z M12 -10 Q24 -18 30 -4 Q22 10 10 4Z" fill="${P.ink}" stroke="none"/>
      <path d="M-34 20 V42 M-16 22 V42 M16 22 V42 M34 20 V42"/>
      <rect x="38" y="-38" width="34" height="30" rx="12" fill="#fff"/><rect x="44" y="-20" width="26" height="14" rx="7" fill="${P.pink}"/>
      <circle cx="50" cy="-28" r="3" fill="${P.ink}" stroke="none"/><circle cx="62" cy="-28" r="3" fill="${P.ink}" stroke="none"/>
      <path d="M40 -38 L34 -48 M70 -38 L76 -48"/><path d="M-46 -10 Q-58 0 -52 14" fill="none"/>
    </g>`;
  const stars = (w, h, n, seed) => { let s = seed || 7, o = ''; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, k = 1.5 + r() * 3.5; o += `<path d="M${x} ${y - k * 2} L${x + k * 0.6} ${y - k * 0.6} L${x + k * 2} ${y} L${x + k * 0.6} ${y + k * 0.6} L${x} ${y + k * 2} L${x - k * 0.6} ${y + k * 0.6} L${x - k * 2} ${y} L${x - k * 0.6} ${y - k * 0.6}Z" fill="${P.cream}" opacity="${0.45 + r() * 0.5}"/>`; } return o; };
  const font = 'font-family="Righteous, Jost, sans-serif"';
  const jost = 'font-family="Jost, sans-serif"';
  // text over a starfield gets a halo in the sky colour, so no star ever touches a letter
  const halo = (c) => `paint-order="stroke" stroke="${c || '#1E2447'}" stroke-width="14" stroke-linejoin="round"`;

  /* ---------------- cards: 750 x 1050 (poker, 300 dpi), safe area inset 54 */
  const W = 750, H = 1050;
  function rrect(x, y, w, h, r, attrs) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}/>`; }
  function team(t, v) {
    // the face sits in a stand facing the table, so it has to read from across the room: one colour, one word, one character
    const H_ = t === 'H', bg = H_ ? P.hum : P.ali, deep = H_ ? P.humDeep : P.aliDeep, soft = H_ ? P.humSoft : P.aliSoft;
    const ch = (H_ ? humans : aliens)[v % 4]();
    const word = H_ ? 'HUMAN' : 'ALIEN';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${bg}"/>
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.ink}" stroke-width="8"`)}
      <circle cx="375" cy="470" r="250" fill="${soft}" stroke="${P.ink}" stroke-width="8"/>
      ${H_ ? `<g opacity=".55">${[[110, 150], [640, 210], [96, 760], [652, 700]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${P.paper}"/>`).join('')}</g>`
           : `<g opacity=".6">${stars(W, 760, 22, 11)}</g>`}
      <g transform="translate(155 250) scale(2.2)">${ch}</g>
      <rect x="40" y="790" width="670" height="220" fill="${P.ink}" rx="0"/>
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.ink}" stroke-width="8"`)}
      <text x="375" y="935" text-anchor="middle" ${font} font-size="150" fill="${bg}" letter-spacing="6">${word}</text>
      <g transform="translate(92 92)"><circle r="34" fill="${P.paper}" stroke="${P.ink}" stroke-width="6"/><text y="13" text-anchor="middle" ${font} font-size="38" fill="${deep}">${H_ ? 'H' : 'A'}</text></g>
      <g transform="translate(658 92)"><circle r="34" fill="${P.paper}" stroke="${P.ink}" stroke-width="6"/><text y="13" text-anchor="middle" ${font} font-size="38" fill="${deep}">${H_ ? 'H' : 'A'}</text></g>
    </svg>`;
  }
  function logo(x, y, size, fill) {
    return `<text x="${x}" y="${y}" text-anchor="middle" ${font} font-size="${size}" fill="${fill || P.beam}" letter-spacing="${size * 0.05}" ${halo()}>ABDUCTED</text>`;
  }
  function back() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${P.night}"/>${stars(W, H, 60, 3)}
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.lilac}" stroke-width="6" stroke-dasharray="2 18"`)}
      ${saucer(375, 470, 3.2, true)}
      ${logo(375, 330, 98)}
      <text x="375" y="860" text-anchor="middle" ${jost} font-weight="600" font-size="30" letter-spacing="9" ${halo()} fill="${P.lilac}">WHICH SIDE ARE YOU ON?</text>
    </svg>`;
  }
  // double-sided split cards: the leader hands everyone one, saucer side or cow side up, to split the table
  function split(side) {
    const sky = side === 'saucer';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${sky ? P.sky : '#B9D98A'}"/>
      ${sky ? stars(W, 700, 26, 5) : `<path d="M0 640 Q375 560 750 640 V1050 H0Z" fill="#8CBF5C"/>`}
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.ink}" stroke-width="8"`)}
      ${sky ? saucer(375, 420, 3.6, false) : cow(355, 470, 3.6)}
      <rect x="40" y="790" width="670" height="220" fill="${P.ink}"/>
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.ink}" stroke-width="8"`)}
      <text x="375" y="915" text-anchor="middle" ${font} font-size="120" fill="${sky ? '#C7D1F5' : '#D8EDB8'}" letter-spacing="5">${sky ? 'SAUCER' : 'COW'}</text>
      <text x="375" y="972" text-anchor="middle" ${jost} font-weight="600" font-size="28" letter-spacing="6" fill="${P.lilac}">${sky ? 'THE SAUCER HALF' : 'THE COW HALF'}</text>
    </svg>`;
  }
  function leader() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${P.paper}"/>
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.ink}" stroke-width="8"`)}
      <rect x="40" y="40" width="670" height="420" rx="38" fill="${P.night}"/><rect x="40" y="300" width="670" height="160" fill="${P.night}"/>
      ${stars(W, 440, 18, 9)}${saucer(375, 250, 2.4, false)}
      <text x="375" y="560" text-anchor="middle" ${font} font-size="86" fill="${P.ink}">MOTHERSHIP</text>
      <text x="375" y="610" text-anchor="middle" ${jost} font-weight="600" font-size="28" letter-spacing="6" fill="${P.humDeep}">THE LEADER THIS TURN</text>
      ${[['1', 'Possess another player.'], ['2', 'Split the table in half.'], ['3', 'Pass this card on.']].map(([n, t], i) => `
        <g transform="translate(110 ${690 + i * 96})"><circle r="30" fill="${P.hum}" stroke="${P.ink}" stroke-width="5"/><text y="12" text-anchor="middle" ${font} font-size="34" fill="${P.ink}">${n}</text>
        <text x="58" y="12" ${jost} font-weight="600" font-size="38" fill="${P.ink}">${t}</text></g>`).join('')}
    </svg>`;
  }
  function scorecard() {
    const row = (y, t) => [0, 1, 2, 3, 4, 5].map((n) => `<g transform="translate(${130 + n * 98} ${y})"><circle r="38" fill="${n === 5 ? (t === 'H' ? P.hum : P.ali) : P.paper}" stroke="${P.ink}" stroke-width="6"/><text y="14" text-anchor="middle" ${font} font-size="40" fill="${P.ink}">${n}</text></g>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${P.night}"/>${stars(W, H, 30, 13)}
      ${rrect(40, 40, 670, 970, 38, `fill="none" stroke="${P.lilac}" stroke-width="6"`)}
      ${logo(375, 170, 76)}
      <text x="375" y="225" text-anchor="middle" ${jost} font-weight="600" font-size="28" letter-spacing="7" ${halo()} fill="${P.lilac}">FIRST SIDE TO 5 WINS</text>
      <g transform="translate(375 330) scale(.8)" >${humans[0]().replace('<g ', '<g transform="translate(-100 -110)" ')}</g>
      <text x="375" y="440" text-anchor="middle" ${font} font-size="54" fill="${P.hum}" ${halo()}>HUMANS</text>${row(520, 'H')}
      <g transform="translate(375 660) scale(.8)">${aliens[0]().replace('<g ', '<g transform="translate(-100 -110)" ')}</g>
      <text x="375" y="770" text-anchor="middle" ${font} font-size="54" fill="${P.ali}" ${halo()}>ALIENS</text>${row(850, 'A')}
    </svg>`;
  }

  /* ---------------- tuck box: 2.6 x 4.3 x 1 in at 300 dpi */
  const BW = 780, BH = 1290, BD = 300;
  function boxFront() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}">
      <rect width="${BW}" height="${BH}" fill="${P.night}"/>${stars(BW, 900, 46, 21)}
      ${logo(390, 210, 132)}
      <text x="390" y="282" text-anchor="middle" ${jost} font-weight="600" font-size="34" letter-spacing="9" ${halo()} fill="${P.lilac}">WHICH SIDE ARE YOU ON?</text>
      ${saucer(390, 470, 3.0, true)}
      <rect x="0" y="1010" width="${BW}" height="280" fill="${P.deep}"/>
      ${[[150, 'H', 0], [300, 'A', 0], [450, 'H', 2], [600, 'A', 1]].map(([x, t, v], i) => {
        const bg = t === 'H' ? P.hum : P.ali;
        const ch = (t === 'H' ? humans : aliens)[v]();
        return `<g transform="translate(${x - 58} ${822 - (i % 2) * 14})"><rect width="116" height="162" rx="10" fill="${bg}" stroke="${P.ink}" stroke-width="5"/><g transform="translate(8 14) scale(.5)">${ch}</g><rect x="0" y="126" width="116" height="36" rx="0" fill="${P.ink}"/><text x="58" y="152" text-anchor="middle" ${font} font-size="24" fill="${bg}">${t === 'H' ? 'HUMAN' : 'ALIEN'}</text></g>
          <path d="M${x - 40} ${984 + (i % 2) * 0} H${x + 40} L${x + 30} ${1010} H${x - 30}Z" fill="#0E1124"/>`;
      }).join('')}
      <text x="390" y="1110" text-anchor="middle" ${jost} font-weight="600" font-size="34" letter-spacing="5" fill="${P.cream}">A SOCIAL DEDUCTION GAME</text>
      <text x="390" y="1162" text-anchor="middle" ${jost} font-weight="500" font-size="30" letter-spacing="4" fill="${P.lilac}">5–12 PLAYERS · 15 MINUTES</text>
      <text x="390" y="1236" text-anchor="middle" ${jost} font-weight="600" font-size="28" letter-spacing="10" fill="${P.beam}">BY DARREN DON</text>
    </svg>`;
  }
  function boxSide() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BD} ${BH}" width="${BD}" height="${BH}">
      <rect width="${BD}" height="${BH}" fill="${P.night}"/>${stars(BD, BH, 20, 31)}
      <g transform="translate(150 645) rotate(-90)">${logo(0, 30, 108)}</g>
      <g transform="translate(150 1150) scale(.9)">${saucer(0, 0, 1, false)}</g>
      <text x="150" y="150" text-anchor="middle" ${jost} font-weight="600" font-size="22" letter-spacing="5" ${halo()} fill="${P.lilac}">BY DARREN DON</text>
    </svg>`;
  }
  function boxEnd() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BD}" width="${BW}" height="${BD}">
      <rect width="${BW}" height="${BD}" fill="${P.night}"/>${stars(BW, BD, 14, 41)}
      ${logo(390, 170, 96)}<text x="390" y="230" text-anchor="middle" ${jost} font-weight="600" font-size="24" letter-spacing="6" ${halo()} fill="${P.lilac}">5–12 PLAYERS · 15 MIN</text>
    </svg>`;
  }

  // the deck: 12 Human and 12 Alien cards, four characters per side, three of each
  const DECK = [];
  for (let i = 0; i < 12; i++) DECK.push({ t: 'H', v: i % 4 }, { t: 'A', v: i % 4 });

  const api = { P, team, back, split, leader, scorecard, boxFront, boxSide, boxEnd, saucer, cow, humans, aliens, DECK, W, H, BW, BH, BD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AbArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
