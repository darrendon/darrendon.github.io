/* Un, Deux, Trois, Cat! — the painted toy art, shared by the cards, box, mockups, print kit and the playable build.
   Each toy is one dominant colour with neutral details (cream, brown, charcoal), so a card never shows two game colours.
   ToyArt.svg(obj, color) returns an <svg>; it needs ToyArt.FILTER (the #paint gouache filter) once in the document. */
(function (root) {
"use strict";
const OBJ = ["bird","fish","ball","mouse","fly"];
/* gouache-style tones: base, dark (texture and shading), light (highlights) */
const PAL = {
  blue:  {b:"#3a72b8", d:"#22497e", l:"#86b1e0"},
  pink:  {b:"#e57fa5", d:"#b04f75", l:"#f7bfd3"},
  orange:{b:"#e9802e", d:"#a95314", l:"#f7b273"},
  yellow:{b:"#e9bb2f", d:"#a3790f", l:"#f8de82"},
  green: {b:"#4ca055", d:"#2c6a35", l:"#94d08f"}
};
const COLORS = Object.keys(PAL);
const CREAM = "#f4ebd8", INK = "#2a2421", BROWN = "#6e4a2e";
const CORRECT = {bird:"yellow",fish:"green",ball:"blue",mouse:"pink",fly:"orange"};
const EXTRA   = {ball:"pink",mouse:"orange",fly:"yellow",bird:"green",fish:"blue"};
const NAME = {bird:"Bird",fish:"Fish",ball:"Ball",mouse:"Mouse",fly:"Butterfly",cat:"Cat"};
const OWNER = Object.fromEntries(Object.entries(CORRECT).map(([o,c]) => [c,o]));

let uid = 0;
function seeded(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const f1 = n => n.toFixed(1);
function parts(obj, color){
  const id = "k" + (uid++);
  const rng = seeded(OBJ.indexOf(obj) * 97 + 13);
  const P = obj === "cat" ? {b:"#5d5652", d:"#3a3431", l:"#8a827c"} : PAL[color];
  let defs = "", g = "";
  const clip = d => { defs += `<clipPath id="${id}"><path d="${d}"/></clipPath>`; return `clip-path="url(#${id})"`; };
  const eye = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}"/><circle cx="${x+r*.25}" cy="${y}" r="${r*.5}" fill="${INK}"/><circle cx="${x+r*.05}" cy="${y-r*.3}" r="${r*.18}" fill="#fff"/>`;

  if (obj === "bird"){
    const body = "M-40 -18 C-44 10 -22 40 12 38 C34 37 50 24 48 8 C34 14 14 12 2 -2 C-2 -26 -8 -46 -24 -46 C-36 -46 -40 -32 -40 -18 Z";
    let marks = "";
    for (let i=0;i<70;i++){ const x=-44+rng()*92, y=-48+rng()*88;
      marks += `<path d="M${f1(x-3)} ${f1(y-2)} L${f1(x)} ${f1(y+1.5)} L${f1(x+3)} ${f1(y-2)}"/>`; }
    g = `<path d="M44 8 L58 -6 L62 3 L49 16 Z" fill="${CREAM}"/>
      <path d="${body}" fill="${P.b}"/>
      <g ${clip(body)} stroke="${P.d}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8">${marks}</g>
      <path d="M-8 6 C6 -2 24 4 32 15 C18 24 0 22 -8 6 Z" fill="${P.d}"/>
      <path d="M-40 -30 L-57 -24 L-40 -19 Z" fill="${BROWN}"/>
      ${eye(-24,-30,6.5)}`;
  } else if (obj === "fish"){
    const body = "M-38 0 C-26 -32 22 -40 46 -6 C50 0 50 4 46 8 C22 40 -26 32 -38 0 Z";
    let dots = "";
    for (let y=-34;y<=34;y+=7) for (let x=-40;x<=48;x+=7){
      const xo = x + ((y/7)%2 ? 3.5 : 0) + (rng()-.5)*2;
      dots += `<rect x="${f1(xo)}" y="${f1(y+(rng()-.5)*2)}" width="2.6" height="2.6" transform="rotate(${Math.round(rng()*60)} ${f1(xo)} ${y})"/>`; }
    let tuft = "";
    for (let i=0;i<9;i++){ const a = Math.PI + (i-4)*0.17, L = 18 + rng()*6;
      tuft += `<line x1="-36" y1="0" x2="${f1(-36+L*Math.cos(a))}" y2="${f1(L*Math.sin(a))}"/>`; }
    g = `<g stroke="${P.d}" stroke-width="3.4" stroke-linecap="round">${tuft}</g>
      <path d="${body}" fill="${P.b}"/>
      <g ${clip(body)} fill="${P.d}" opacity=".75">${dots}</g>
      <path d="M-2 -12 C4 -24 16 -24 18 -12 C12 -6 4 -6 -2 -12 Z" fill="${P.d}"/>
      <path d="M-4 14 C2 26 14 26 16 14 C10 9 2 9 -4 14 Z" fill="${P.d}"/>
      ${eye(30,-9,7)}`;
  } else if (obj === "ball"){
    defs += `<radialGradient id="${id}g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${P.l}"/><stop offset=".45" stop-color="${P.b}"/><stop offset="1" stop-color="${P.d}"/></radialGradient>`;
    const disc = "M-40 2 A40 40 0 1 0 40 2 A40 40 0 1 0 -40 2 Z";
    g = `<path d="${disc}" fill="url(#${id}g)"/>
      <g ${clip(disc)}><path d="M-44 -6 C-20 12 20 12 44 -6 L44 6 C20 24 -20 24 -44 6 Z" fill="${CREAM}"/>
      <path d="M-44 -6 C-20 12 20 12 44 -6" stroke="${P.d}" stroke-width="1.5" fill="none" opacity=".5"/></g>
      <ellipse cx="-15" cy="-20" rx="8" ry="5" fill="#fff" opacity=".55" transform="rotate(-30 -15 -20)"/>`;
  } else if (obj === "mouse"){
    const body = "M44 8 C34 -20 -6 -30 -32 -12 C-44 -2 -40 18 -22 24 C0 30 30 24 44 8 Z";
    let dots = "";
    for (let i=0;i<16;i++){ dots += `<circle cx="${f1(-36+rng()*76)}" cy="${f1(-24+rng()*48)}" r="${f1(2.2+rng()*1.6)}"/>`; }
    g = `<path d="M-36 8 C-50 4 -55 -14 -45 -24 C-37 -32 -41 -44 -53 -47" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="${body}" fill="${P.b}"/>
      <g ${clip(body)} fill="${P.d}" opacity=".85">${dots}</g>
      <circle cx="16" cy="-17" r="9.5" fill="${P.b}"/><circle cx="16" cy="-17" r="5.5" fill="${P.d}"/>
      <circle cx="30" cy="-2" r="3" fill="${INK}"/><circle cx="45" cy="8" r="2.6" fill="${INK}"/>`;
  } else if (obj === "fly"){
    const half = "M-3 -4 C-18 -42 -58 -48 -57 -18 C-56 0 -32 6 -3 1 Z M-3 5 C-28 8 -48 22 -40 40 C-32 55 -10 42 -3 15 Z";
    const mirror = d => d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, x, _a, y) => `${-parseFloat(x)} ${y}`);
    const wings = half + " " + mirror(half);
    let veins = "";
    for (const sx of [-1, 1]) for (let i=0;i<6;i++){
      const a = (-150 + i*28) * Math.PI/180, L = 40 + rng()*14;
      veins += `<line x1="0" y1="2" x2="${f1(sx*Math.abs(L*Math.cos(a)))}" y2="${f1(2 + L*Math.sin(a))}"/>`; }
    let spots = "";
    for (const [x,y,r] of [[-44,-24,4.5],[-34,-34,3.5],[-30,34,4],[-44,-8,3]]) {
      spots += `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${-x}" cy="${y}" r="${r}"/>`; }
    g = `<path d="${wings}" fill="${P.b}"/>
      <g ${clip(wings)}><g stroke="${P.d}" stroke-width="1.6" opacity=".75">${veins}</g>
      <path d="${wings}" fill="none" stroke="${P.d}" stroke-width="7" opacity=".9"/>
      <g fill="${CREAM}">${spots}</g></g>
      <ellipse cx="0" cy="6" rx="5" ry="30" fill="${BROWN}"/>
      <circle cx="0" cy="-26" r="6" fill="${BROWN}"/>
      <g stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round">
        <path d="M-2 -30 C-6 -42 -12 -50 -19 -54"/><path d="M2 -30 C6 -42 12 -50 19 -54"/></g>
      <circle cx="-19" cy="-54" r="2.6" fill="${INK}"/><circle cx="19" cy="-54" r="2.6" fill="${INK}"/>`;
  } else if (obj === "cat"){
    let fur = "";
    for (let i=0;i<26;i++){ const x=-26+rng()*52, y=-6+rng()*50; fur += `<path d="M${f1(x)} ${f1(y)} q2 3 0 6"/>`; }
    const body = "M-30 22 C-30 -6 -16 -10 0 -10 C16 -10 30 -6 30 22 C30 46 18 54 0 54 C-18 54 -30 46 -30 22 Z";
    g = `<path d="M26 46 C50 42 56 14 44 2" stroke="${P.b}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="${body}" fill="${P.b}"/>
      <g ${clip(body)} stroke="${P.d}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8">${fur}</g>
      <ellipse cx="0" cy="34" rx="12" ry="16" fill="${P.l}" opacity=".7"/>
      <circle cx="0" cy="-24" r="21" fill="${P.b}"/>
      <path d="M-20 -30 L-16 -56 L-3 -42 Z M20 -30 L16 -56 L3 -42 Z" fill="${P.b}"/>
      <path d="M-15 -36 L-14 -49 L-7 -41 Z M15 -36 L14 -49 L7 -41 Z" fill="${P.d}"/>
      <ellipse cx="-8" cy="-25" rx="4" ry="5" fill="${CREAM}"/><ellipse cx="8" cy="-25" rx="4" ry="5" fill="${CREAM}"/>
      <ellipse cx="-8" cy="-24.5" rx="1.6" ry="3.6" fill="${INK}"/><ellipse cx="8" cy="-24.5" rx="1.6" ry="3.6" fill="${INK}"/>
      <path d="M-3 -16 L3 -16 L0 -13 Z" fill="${P.d}"/>`;
  }
  return {defs, g};
}
function svg(obj, color, extra){
  const {defs, g} = parts(obj, color);
  return `<svg viewBox="-66 -64 132 128" ${extra || 'aria-hidden="true"'}><defs>${defs}</defs><g filter="url(#paint)">${g}</g></svg>`;
}
/* a toy placed inside a larger drawing: centre (x, y), scale s, rotation r degrees */
function place(obj, color, x, y, s, r){
  const {defs, g} = parts(obj, color);
  return `<defs>${defs}</defs><g transform="translate(${x} ${y}) rotate(${r || 0}) scale(${s})"><g filter="url(#paint)">${g}</g></g>`;
}
const FILTER = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><filter id="paint" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="9" result="blot"/>
    <feColorMatrix in="blot" type="saturate" values="0" result="gray"/>
    <feComponentTransfer in="gray" result="mottle">
      <feFuncR type="linear" slope="0.4" intercept="0.7"/><feFuncG type="linear" slope="0.4" intercept="0.7"/>
      <feFuncB type="linear" slope="0.4" intercept="0.7"/><feFuncA type="linear" slope="0" intercept="1"/>
    </feComponentTransfer>
    <feBlend in="d" in2="mottle" mode="multiply" result="m"/>
    <feComposite in="m" in2="d" operator="in"/>
  </filter></defs></svg>`;
/* the 60-card deck: per toy 3 in its own colour, 3 in one other colour, 2 in each of the other three */
function deck(){
  const d = [];
  for (const o of OBJ) for (const c of COLORS){
    const n = (c === CORRECT[o] || c === EXTRA[o]) ? 3 : 2;
    for (let i = 0; i < n; i++) d.push({obj: o, color: c});
  }
  return d;
}
const api = {OBJ, PAL, COLORS, CREAM, INK, BROWN, CORRECT, EXTRA, NAME, OWNER, parts, svg, place, FILTER, deck};
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ToyArt = api;
})(typeof window !== "undefined" ? window : globalThis);
