/* Too Many Crooks! — the lineup figures, shared by the box, sheets, sell sheet and page art. */
(function(){
const NS='http://www.w3.org/2000/svg';
let svg=null, defs=null;
const el=(n,a,parent)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);(parent||svg).appendChild(e);return e};
const INK='#0E1014', CREAM='#F2ECDA', GOLD='#C9A14F';
const mix=(hex,t,to='#000000')=>{const h=x=>parseInt(x,16);const a=[h(hex.slice(1,3)),h(hex.slice(3,5)),h(hex.slice(5,7))],b=[h(to.slice(1,3)),h(to.slice(3,5)),h(to.slice(5,7))];return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('')};
let uid=0;

const PIPS={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]};

// shade the right-hand third of whatever is drawn inside `fn`, cut-paper style
function shaded(parent,fn,x0){
  const id='c'+(uid++); const cp=el('clipPath',{id},defs); const inner=el('g',{},parent); fn(inner);
  const sh=el('g',{'clip-path':`url(#${id})`,opacity:.2},parent); const copy=inner.cloneNode(true); sh.appendChild(copy);
  copy.querySelectorAll('*').forEach(n=>{if(n.getAttribute('fill')&&n.getAttribute('fill')!=='none')n.setAttribute('fill','#000');if(n.getAttribute('stroke'))n.setAttribute('stroke','none')});
  el('rect',{x:x0,y:-900,width:600,height:1000},cp);
}

function crook(x,o,parent,floorY=905){
  const {c,v,h,w,hat,coat,arms,tilt,tie,light}=o;
  const g=el('g',{transform:`translate(${x},${floorY})`},parent);
  const dark=mix(c,.35), lite=mix(c,.18,'#ffffff');
  const pip=light?INK:'#fff';
  const sh=w*0.56, hem=w*0.47, top=-h+100;
  const shortCoat=(coat==='suit'||coat==='turtleneck'||coat==='bomber');
  const bodyTop= shortCoat ? -68 : -10;
  if(!o.noShadow) el('ellipse',{cx:26,cy:-h*0.5,rx:w*0.66,ry:h*0.53,fill:'#000',opacity:.28},g);
  // shoes + trousers
  el('rect',{x:-w*0.34,y:-14,width:w*0.28,height:16,rx:7,fill:INK},g);
  el('rect',{x:w*0.06,y:-14,width:w*0.28,height:16,rx:7,fill:INK},g);
  if(shortCoat){ el('rect',{x:-hem*0.84,y:-70,width:hem*0.78,height:60,fill:light?'#2B2B2B':dark},g); el('rect',{x:hem*0.06,y:-70,width:hem*0.78,height:60,fill:light?'#2B2B2B':dark},g); }
  const coatPath=`M${-hem} ${bodyTop} L${hem} ${bodyTop} L${hem} ${top+60} L${sh} ${top+16} Q${sh*0.72} ${top-18} ${sh*0.34} ${top-28} L${-sh*0.34} ${top-28} Q${-sh*0.72} ${top-18} ${-sh} ${top+16} L${-hem} ${top+60} Z`;
  const ny=top-28, vdeep=top+90;
  const L={stroke:INK,'stroke-width':4,'stroke-linejoin':'round'};
  shaded(g,(p)=>{
    el('path',{d:coatPath,fill:c,...L},p);
    if(coat==='trench'){
      el('path',{d:`M${-sh*0.34} ${ny} L${-w*0.05} ${vdeep} L${-sh*0.62} ${top+30} Z`,fill:dark,...L},p);
      el('path',{d:`M${sh*0.34} ${ny} L${w*0.05} ${vdeep} L${sh*0.62} ${top+30} Z`,fill:dark,...L},p);
      el('path',{d:`M${-w*0.16} ${ny+4} L0 ${top+54} L${w*0.16} ${ny+4} Z`,fill:CREAM},p);
      for(const sx of [-1,1]) for(let i=0;i<3;i++) el('circle',{cx:sx*w*0.14,cy:vdeep+26+i*46,r:6,fill:INK},p);
      el('rect',{x:-hem,y:top+236,width:hem*2,height:22,fill:dark,stroke:INK,'stroke-width':3},p);
      el('rect',{x:-16,y:top+232,width:32,height:30,rx:4,fill:GOLD,stroke:INK,'stroke-width':3},p);
      for(const sx of [-1,1]) el('rect',{x:sx>0?hem*0.3:-hem*0.78,y:top+290,width:hem*0.48,height:14,rx:3,fill:dark,stroke:INK,'stroke-width':3},p);
    }
    if(coat==='suit'){
      { const cid='pc'+(uid++); el('path',{d:coatPath},el('clipPath',{id:cid},defs)); const ps=el('g',{'clip-path':`url(#${cid})`},p);
        for(let i=-6;i<=6;i++) el('line',{x1:i*w*0.075,y1:top-40,x2:i*w*0.075,y2:bodyTop,stroke:lite,opacity:.45,'stroke-width':2},ps); }
      el('path',{d:`M${-sh*0.3} ${ny} L${-w*0.03} ${vdeep+30} L${-sh*0.58} ${top+40} L${-sh*0.46} ${top+2} Z`,fill:dark,...L},p);
      el('path',{d:`M${sh*0.3} ${ny} L${w*0.03} ${vdeep+30} L${sh*0.58} ${top+40} L${sh*0.46} ${top+2} Z`,fill:dark,...L},p);
      el('path',{d:`M${-w*0.17} ${ny+2} L0 ${top+72} L${w*0.17} ${ny+2} Z`,fill:CREAM},p);
      el('path',{d:`M-9 ${ny+4} L9 ${ny+4} L6 ${top+120} L0 ${top+134} L-6 ${top+120} Z`,fill:tie||INK,stroke:INK,'stroke-width':2},p);
      el('circle',{cx:0,cy:vdeep+40,r:6,fill:INK},p); el('circle',{cx:0,cy:vdeep+84,r:6,fill:INK},p);
      el('rect',{x:sh*0.5,y:top+96,width:w*0.16,height:6,fill:INK,opacity:.5},p); el('rect',{x:sh*0.52,y:top+102,width:w*0.1,height:22,fill:CREAM},p);
    }
    if(coat==='bomber'){
      el('rect',{x:-w*0.2,y:ny-6,width:w*0.4,height:34,rx:6,fill:dark,...L},p);
      for(let i=-3;i<=3;i++) el('line',{x1:i*w*0.05,y1:ny-2,x2:i*w*0.05,y2:ny+24,stroke:INK,opacity:.3,'stroke-width':2},p);
      el('line',{x1:0,y1:ny+28,x2:0,y2:bodyTop-14,stroke:INK,'stroke-width':4,'stroke-dasharray':'8 6'},p);
      el('rect',{x:-9,y:ny+26,width:18,height:12,fill:INK},p);
      el('rect',{x:-hem,y:bodyTop-22,width:hem*2,height:22,fill:dark,...L},p);
      for(let i=-5;i<=5;i++) el('line',{x1:i*hem*0.18,y1:bodyTop-20,x2:i*hem*0.18,y2:bodyTop-2,stroke:INK,opacity:.3,'stroke-width':2},p);
      el('line',{x1:-sh*0.55,y1:top+10,x2:-sh*0.3,y2:Math.min(top+200,bodyTop-34),stroke:lite,opacity:.5,'stroke-width':10,'stroke-linecap':'round'},p);
    }
    if(coat==='overcoat'){
      // big shawl collar, double breasted
      el('path',{d:`M${-sh*0.34} ${ny} Q${-sh*0.3} ${top+120} ${-w*0.06} ${vdeep+40} L${-sh*0.72} ${top+34} Q${-sh*0.6} ${ny+10} ${-sh*0.34} ${ny} Z`,fill:dark,...L},p);
      el('path',{d:`M${sh*0.34} ${ny} Q${sh*0.3} ${top+120} ${w*0.06} ${vdeep+40} L${sh*0.72} ${top+34} Q${sh*0.6} ${ny+10} ${sh*0.34} ${ny} Z`,fill:dark,...L},p);
      el('path',{d:`M${-w*0.13} ${ny+8} L0 ${top+62} L${w*0.13} ${ny+8} Z`,fill:CREAM},p);
      el('path',{d:`M-8 ${ny+8} L8 ${ny+8} L5 ${top+100} L0 ${top+112} L-5 ${top+100} Z`,fill:tie||GOLD,stroke:INK,'stroke-width':2},p);
      for(const sx of [-1,1]) for(let i=0;i<3;i++) if(top+150+i*54<bodyTop-24) el('circle',{cx:sx*w*0.13,cy:top+150+i*54,r:7,fill:GOLD,stroke:INK,'stroke-width':2.5},p);
    }
    if(coat==='scarfcoat'){
      el('path',{d:`M${-sh*0.34} ${ny} L${-w*0.06} ${vdeep+20} L${-sh*0.62} ${top+34} Z`,fill:dark,...L},p);
      el('path',{d:`M${sh*0.34} ${ny} L${w*0.06} ${vdeep+20} L${sh*0.62} ${top+34} Z`,fill:dark,...L},p);
      el('path',{d:`M${-w*0.22} ${ny-4} Q0 ${ny+30} ${w*0.22} ${ny-4} L${w*0.14} ${ny+16} Q0 ${ny+48} ${-w*0.14} ${ny+16} Z`,fill:GOLD,...L},p);
      el('path',{d:`M${-w*0.17} ${ny+8} L${-w*0.2} ${top+250} L${-w*0.02} ${top+262} L${w*0.02} ${ny+22} Z`,fill:GOLD,...L},p);
      for(let i=0;i<5;i++) el('line',{x1:-w*0.19,y1:top+136+i*22,x2:-w*0.02,y2:top+142+i*22,stroke:INK,opacity:.35,'stroke-width':2},p);
      for(let i=0;i<3;i++) if(top+170+i*52<bodyTop-24) el('circle',{cx:w*0.1,cy:top+170+i*52,r:6,fill:INK},p);
    }
    if(coat==='turtleneck'){
      el('path',{d:`M${-sh*0.36} ${ny} L${-w*0.06} ${vdeep+50} L${-sh*0.64} ${top+36} Z`,fill:'#2B2B2B',...L},p);
      el('path',{d:`M${sh*0.36} ${ny} L${w*0.06} ${vdeep+50} L${sh*0.64} ${top+36} Z`,fill:'#2B2B2B',...L},p);
      el('path',{d:`M${-w*0.2} ${ny+2} L0 ${vdeep+36} L${w*0.2} ${ny+2} Z`,fill:'#2B2B2B'},p);
      el('rect',{x:-w*0.2,y:ny-16,width:w*0.4,height:34,rx:8,fill:'#2B2B2B',...L},p);
      el('circle',{cx:w*0.04,cy:vdeep+80,r:6,fill:INK},p); 
      el('rect',{x:sh*0.5,y:top+100,width:w*0.1,height:22,fill:tie||'#C8372D',stroke:INK,'stroke-width':2},p);
    }
  },0);
  // arms
  const tube=(x1,y1,x2,y2,col,wd)=>{el('line',{x1,y1,x2,y2,stroke:INK,'stroke-width':wd+8,'stroke-linecap':'round'},g);el('line',{x1,y1,x2,y2,stroke:col,'stroke-width':wd,'stroke-linecap':'round'},g);};
  const skin = light?'#2B2B2B':mix(c,.3,'#ffffff');
  const cuff = (coat==='suit'||coat==='overcoat'||coat==='scarfcoat') ? CREAM : dark;
  if(arms==='folded'){
    const ay=top+Math.min(150,(h-100)*0.5), wd=46;
    tube(-sh*0.92,ay,sh*0.58,ay+24,c,wd);
    el('circle',{cx:sh*0.58,cy:ay+24,r:21,fill:skin,stroke:INK,'stroke-width':4},g);
    tube(sh*0.92,ay,-sh*0.5,ay+30,c,wd);
    el('rect',{x:-sh*0.5-6,y:ay+30-30,width:16,height:60,fill:cuff,stroke:INK,'stroke-width':3,transform:`rotate(${-Math.atan2(30,sh*1.42)*180/Math.PI} ${-sh*0.5} ${ay+30})`},g);
    el('circle',{cx:-sh*0.5-20,cy:ay+34,r:22,fill:skin,stroke:INK,'stroke-width':4},g);
    el('path',{d:`M${-sh*0.5-38} ${ay+24} q6 -14 18 -6`,fill:'none',stroke:INK,'stroke-width':3},g);
  } else {
    // hands in pockets: upper arm angles out, forearm comes back into a pocket
    for(const sx of [-1,1]){
      const py=Math.min(top+h*0.62, bodyTop-44);
      const ex=sx*hem*1.0, ey=top+22+(py-top-22)*0.55;
      tube(sx*sh*0.9,top+22,ex,ey,c,44);
      tube(ex,ey,sx*hem*0.5,py,c,44);
      el('rect',{x:sx>0?hem*0.2:-hem*0.8,y:py-6,width:hem*0.6,height:18,rx:3,fill:dark,stroke:INK,'stroke-width':3},g);
    }
  }
  // head: a die with a tilt, a neck, and a hat
  const s=88, hy=top-54-s;
  const hg=el('g',{transform:`rotate(${tilt||0} 0 ${hy+s/2})`},g);
  el('rect',{x:-15,y:hy+s-6,width:30,height:16,fill:light?'#2B2B2B':c,...L},hg);
  shaded(hg,(p)=>{
    el('rect',{x:-s/2,y:hy,width:s,height:s,rx:17,fill:c,...L},p);
    for(const [px,py] of PIPS[v]) el('circle',{cx:-s/2+17+px*27,cy:hy+17+py*27,r:7.5,fill:pip},p);
    const by=hy+4, HAT=o.hatColor||CREAM, BAND=o.band||INK;
    const H={fill:HAT,...L};
    if(hat==='fedora'){el('path',{d:`M-78 ${by+4} Q-80 ${by-6} -66 ${by-10} L66 ${by-10} Q82 ${by-4} 76 ${by+6} Q40 ${by+14} 0 ${by+12} Q-40 ${by+14} -78 ${by+4} Z`,...H},p);
      el('path',{d:`M-48 ${by-10} L48 ${by-10} L44 ${by-50} Q30 ${by-72} 8 ${by-62} Q-6 ${by-74} -16 ${by-60} Q-40 ${by-70} -44 ${by-50} Z`,...H},p);
      el('path',{d:`M-47 ${by-24} L47 ${by-24} L45 ${by-10} L-45 ${by-10} Z`,fill:BAND},p);}
    if(hat==='bowler'){el('path',{d:`M-74 ${by+4} Q-78 ${by-8} -62 ${by-10} L62 ${by-10} Q78 ${by-8} 74 ${by+4} Q0 ${by+16} -74 ${by+4} Z`,...H},p);
      el('path',{d:`M-44 ${by-10} Q-44 ${by-74} 0 ${by-76} Q44 ${by-74} 44 ${by-10} Z`,...H},p);el('rect',{x:-44,y:by-26,width:88,height:12,fill:BAND},p);}
    if(hat==='flatcap'){el('path',{d:`M-58 ${by-4} Q-62 ${by-50} 0 ${by-54} Q62 ${by-50} 58 ${by-4} Z`,...H},p);
      el('path',{d:`M-8 ${by-4} L76 ${by-6} Q84 ${by+4} 72 ${by+8} L-8 ${by+6} Z`,...H},p);
      el('path',{d:`M-40 ${by-30} Q0 ${by-44} 40 ${by-30}`,fill:'none',stroke:INK,opacity:.35,'stroke-width':3},p);}
    if(hat==='beanie'){el('path',{d:`M-50 ${by+8} Q-48 ${by-64} 0 ${by-66} Q48 ${by-64} 50 ${by+8} Z`,...H},p);
      for(let i=-3;i<=3;i++) el('line',{x1:i*12,y1:by-60+Math.abs(i)*2,x2:i*12,y2:by-14,stroke:INK,opacity:.35,'stroke-width':3},p);
      el('rect',{x:-54,y:by-14,width:108,height:24,rx:6,...H},p);el('circle',{cx:0,cy:by-70,r:11,...H},p);}
    if(hat==='tophat'){el('path',{d:`M-70 ${by+4} Q-74 ${by-8} -58 ${by-10} L58 ${by-10} Q74 ${by-8} 70 ${by+4} Q0 ${by+16} -70 ${by+4} Z`,...H},p);
      el('path',{d:`M-42 ${by-10} L-44 ${by-80} Q0 ${by-88} 44 ${by-80} L42 ${by-10} Z`,...H},p);el('rect',{x:-43,y:by-30,width:86,height:14,fill:BAND},p);}
    if(hat==='homburg'){el('path',{d:`M-72 ${by+2} Q-76 ${by-10} -60 ${by-12} L60 ${by-12} Q76 ${by-10} 72 ${by+2} Q0 ${by+14} -72 ${by+2} Z`,...H},p);
      el('path',{d:`M-44 ${by-12} L44 ${by-12} L40 ${by-56} Q0 ${by-74} -40 ${by-56} Z`,...H},p);el('path',{d:`M-30 ${by-58} Q0 ${by-50} 30 ${by-58}`,fill:'none',stroke:INK,opacity:.4,'stroke-width':3},p);el('rect',{x:-43,y:by-28,width:86,height:12,fill:BAND},p);}
  },0);
  return g;
}


const LINE=[
  {c:'#2B2B2B',v:1,h:366,w:150,hat:'bowler',hatColor:CREAM,band:'#2B2B2B',coat:'overcoat',arms:'pockets',tilt:-6},
  {c:'#2F6DB5',v:4,h:392,w:158,hat:'fedora',hatColor:CREAM,band:'#2F6DB5',coat:'suit',arms:'folded',tie:'#C8372D',tilt:5},
  {c:'#E0B21F',v:2,h:322,w:176,hat:'beanie',hatColor:'#2B2B2B',coat:'bomber',arms:'folded',tilt:-4,light:true},
  {c:'#C8372D',v:6,h:388,w:148,hat:'tophat',hatColor:'#2B2B2B',band:'#C8372D',coat:'trench',arms:'pockets',tilt:0},
  {c:'#3E8E4F',v:5,h:372,w:166,hat:'flatcap',hatColor:CREAM,coat:'scarfcoat',arms:'folded',tilt:4},
  {c:'#F2ECDA',v:3,h:350,w:142,hat:'homburg',hatColor:'#2B2B2B',band:GOLD,coat:'turtleneck',arms:'pockets',tilt:-7,light:true},
];
function use(root){ svg=root; defs=root.querySelector('defs')||el('defs',{},root); }
// height-chart wall behind a lineup: lines every `step`, labels on the left
function wall(o){ const {x0=60,x1=1340,y0=445,step=58,n=9,labels=true,font=20,op=1}=o;
  const g=el('g',{});
  for(let i=0;i<n;i++){const y=y0+i*step;el('line',{x1:x0,y1:y,x2:x1,y2:y,stroke:CREAM,opacity:(i%2?0.18:0.38)*op,'stroke-width':i%2?font/20:font/10},g);
    if(labels&&i%2===0){const lab=["6'4\"","6'0\"","5'8\"","5'4\"","5'0\"","4'8\""][i/2];el('text',{x:x0+6,y:y-font*0.4,fill:CREAM,opacity:.7*op,'font-family':'Courier Prime','font-weight':'700','font-size':font,'letter-spacing':font/10},g).textContent=lab;}}
  return g; }
// head-and-shoulders of a crook, centred at (cx,cy), `size` px tall
function bust(parent,cx,cy,size,o){
  const k=size/315, h=o.h||360;
  const g=el('g',{transform:`translate(${cx},${cy}) scale(${k}) translate(0,${h-15})`},parent);
  const id='b'+(uid++); const cp=el('clipPath',{id},defs); el('rect',{x:-200,y:-h-145,width:400,height:315},cp);
  const inner=el('g',{'clip-path':`url(#${id})`},g);
  crook(0,{...o,h,noShadow:true},inner,0);
  return g; }
window.Crooks={use,crook,bust,wall,LINE,el,mix,INK,CREAM,GOLD};
})();
