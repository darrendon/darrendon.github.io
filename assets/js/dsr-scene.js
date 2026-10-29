/* Dim Sum Rush — interactive 3D component mockup (three.js r128, global THREE).
   DSRScene.mount(el, {view, interactive, onReady}) → controller with setView(name). */
(function () {
  'use strict';
  const TEX = '/assets/img/tex/';
  const BAND = ['#B07A2A', '#2F5D9E', '#A8462A', '#1F6B4F'];
  const BAND_D = ['#8A5A16', '#234A80', '#7E3220', '#154D39'];
  const bandOf = (r) => Math.floor((r - 1) / 3);
  const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // Camera presets: target, distance, yaw (theta), pitch from vertical (phi)
  const VIEWS = {
    all:   { t: [1.15, 0.6, 0.75], d: 14.2, th: 0.0,  ph: 1.02 },
    box:   { t: [-2.4, 0.6, -1.8], d: 9.8, th: -0.12, ph: 0.8 },
    tiles: { t: [-1.6, 0.3, 3.5],  d: 6.9,  th: 0.0,  ph: 0.5 },
    bag:   { t: [5.3, 0.9, 0.3],   d: 7.9,  th: -0.18, ph: 1.0 },
    // the card edition: its own little table (card box, a cart, a played combination, backs)
    cards: { t: [0.0, 0.0, 0.0], d: 12.7, th: 0.0,  ph: 0.68 },
    // the hero still: the tile edition on a dark wood teahouse table under warm lantern light
    scene: { t: [0.7, 0.2, -0.55], d: 18.6, th: 0.0,  ph: 0.8 },
  };
  const CARD_TEX = '/games/dim-sum-rush/img/src/tex/';

  // Card edition table: x right, z toward the camera; card(rank, x, z, faceUp, yaw)
  function cardLayout(card, box) {
    box.position.set(-3.0, 0, -2.5); box.rotation.y = -0.16;                // the card box
    [1, 8, 10].forEach((r, i) => card(r, -0.15 + i * 1.7, -2.6, false, [-0.03, 0.02, -0.025][i])); // face down: steamer, bowl, dessert-tray backs
    [4, 5, 6].forEach((r, i) => card(r, -1.6 + i * 1.6, -0.25, true, 0));    // a played combination: the run 4 5 6
    [2, 9, 7, 11, 3].forEach((r, i) => card(r, -3.2 + i * 1.6, 2.1, true, 0)); // a cart, in dealt order
  }

  function roundedRect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function mount(el, opts) {
    opts = opts || {};
    const interactive = opts.interactive !== false;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.still });
    } catch (e) { el.classList.add('no-webgl'); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.pixelRatio || 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Dim Sum Rush components: game box, tile bag and tiles. Drag to turn.');
    canvas.setAttribute('role', 'img');
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    // Lights
    const hemi = new THREE.HemisphereLight(0xfff8ee, 0x9c8a70, 0.72); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(5, 11, 7); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    key.shadow.radius = 4; key.shadow.bias = -0.0006;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe2b8, 0.35); rim.position.set(-8, 5, -6); scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.2 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    const stage = new THREE.Group(); scene.add(stage);

    // Textures
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    function tex(name) {
      const t = loader.load(TEX + name + '.webp');
      t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso);
      return t;
    }
    const faceMat = {}, backMat = [];
    function faceMaterial(r) {
      if (!faceMat[r]) faceMat[r] = new THREE.MeshStandardMaterial({ map: tex('face-' + r), transparent: true, alphaTest: 0.5, roughness: 0.42, metalness: 0 });
      return faceMat[r];
    }
    for (let b = 0; b < 4; b++) backMat[b] = new THREE.MeshStandardMaterial({ map: tex('back-' + b), transparent: true, alphaTest: 0.5, roughness: 0.38 });

    // Tile geometry (shared)
    // Domino-thin tiles: ~30 × 40 mm face, ~8 mm thick (bone face bonded to a coloured back)
    const TW = 0.7, TH = 1.0, TR = 0.05, BV = 0.025, BONE = 0.09, BACK = 0.05;
    const shape = roundedRect(TW, TH, TR);
    const boneGeo = new THREE.ExtrudeGeometry(shape, { depth: BONE, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 3, curveSegments: 6 });
    const backGeo = new THREE.ExtrudeGeometry(shape, { depth: BACK, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 3, curveSegments: 6 });
    backGeo.translate(0, 0, -BACK - 0.02);
    const planeGeo = new THREE.PlaneGeometry(TW + BV * 1.2, TH + BV * 1.2);
    const boneMat = new THREE.MeshStandardMaterial({ color: C('#F1E8D4'), roughness: 0.4 });
    const bandMat = BAND.map((c) => new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.38 }));
    const FACE_Z = BONE + BV + 0.002, BACK_Z = -BACK - 0.02 - BV - 0.002;

    function tile(r) {
      const g = new THREE.Group(), b = bandOf(r); g.name = 'tile ' + r;
      const bone = new THREE.Mesh(boneGeo, boneMat); bone.castShadow = bone.receiveShadow = true; g.add(bone);
      const back = new THREE.Mesh(backGeo, bandMat[b]); back.castShadow = true; g.add(back);
      const face = new THREE.Mesh(planeGeo, faceMaterial(r)); face.position.z = FACE_Z; g.add(face);
      const bk = new THREE.Mesh(planeGeo, backMat[b]); bk.position.z = BACK_Z; bk.rotation.y = Math.PI; g.add(bk);
      return g;
    }
    // poses: standing facing +z, flat face-up, flat face-down
    function standing(r, x, z, yaw, lean, p) {
      const t = tile(r); t.name += ' standing @' + x.toFixed(2) + ',' + z.toFixed(2); t.position.set(x, TH / 2 + BV, z); t.rotation.set(-(lean || 0.08), yaw || 0, 0, 'YXZ'); (p || stage).add(t); return t;
    }
    function faceUp(r, x, z, yaw, p) {
      const t = tile(r); t.name += ' up @' + x.toFixed(2) + ',' + z.toFixed(2); t.rotation.set(-Math.PI / 2, 0, yaw || 0); t.position.set(x, BACK + 0.02 + BV, z); (p || stage).add(t); return t;
    }
    function faceDown(r, x, z, yaw, p) {
      const t = tile(r); t.name += ' down @' + x.toFixed(2) + ',' + z.toFixed(2); t.rotation.set(Math.PI / 2, 0, yaw || 0); t.position.set(x, BONE + BV, z); (p || stage).add(t); return t;
    }

    // Game box
    const BW = 6, BH = 1.4, BD = 4.2;
    const side = tex('box-side'), end = tex('box-end');
    const boxMats = [
      new THREE.MeshStandardMaterial({ map: end, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: end, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: tex('box-top'), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: C('#6E120D'), roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55 }),
    ];
    const box = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), boxMats);
    box.castShadow = box.receiveShadow = true; box.name = 'box';
    box.position.set(-2.4, BH / 2, -2.4); box.rotation.y = 0.16;
    stage.add(box);

    // Tile bag (lathe + cloth folds)
    const prof = [[0, 0], [0.5, 0.02], [0.92, 0.16], [1.16, 0.5], [1.22, 0.92], [1.13, 1.32], [0.9, 1.64], [0.6, 1.88], [0.44, 2.0], [0.47, 2.06], [0.62, 2.18], [0.78, 2.32], [0.8, 2.4], [0.7, 2.44]];
    const bagGeo = new THREE.LatheGeometry(new THREE.SplineCurve(prof.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(90), 120);
    const pos = bagGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const th = Math.atan2(v.z, v.x), y = v.y;
      let k = 1;
      if (y > 0.35 && y < 2.0) k += 0.03 * Math.sin(7 * th + y * 2.4) * Math.min(1, (y - 0.35) * 1.5);
      if (y > 1.55 && y < 2.0) k += 0.07 * Math.sin(11 * th) * ((y - 1.55) / 0.45);
      if (y >= 2.0) k += 0.16 * Math.sin(12 * th) * Math.min(1, (y - 2.0) / 0.2);
      pos.setXYZ(i, v.x * k, y, v.z * k);
    }
    bagGeo.computeVertexNormals();
    const bag = new THREE.Group(); bag.name = 'bag';
    const cloth = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({ color: C('#8E2418'), roughness: 0.95, side: THREE.DoubleSide }));
    cloth.castShadow = cloth.receiveShadow = true; bag.add(cloth);
    const gold = new THREE.MeshStandardMaterial({ color: C('#E9B44F'), roughness: 0.45, metalness: 0.1 });
    const cinch = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.05, 12, 48), gold); cinch.rotation.x = Math.PI / 2; cinch.position.y = 2.0; cinch.castShadow = true; bag.add(cinch);
    [[0.15, 1], [0.42, 1.12]].forEach(([a, s]) => {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.44, 2.0, 0.12 + a * 0.2), new THREE.Vector3(0.78 * s, 1.72, 0.48 + a), new THREE.Vector3(0.98 * s, 1.28, 0.72 + a * 0.9), new THREE.Vector3(1.04 * s, 1.0, 0.84 + a * 0.8)]);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.035, 8, false), gold); cord.castShadow = true; bag.add(cord);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), gold); bead.position.copy(c.getPoint(1)); bead.castShadow = true; bag.add(bead);
    });
    bag.position.set(5.2, 0, -1.1); bag.rotation.y = -0.5; stage.add(bag);

    // Tiles: a cart (hand) of standing tiles, a Chef's Special laid flat in front of it, and a few tiles
    // spilled in front of the bag. Everything sits apart so nothing overlaps from the preset camera angles.
    [2, 3, 5, 7, 8, 11].forEach((r, i) => standing(r, -4.0 + i * 0.92, 2.5, 0, 0.1));
    [12, 12, 12, 12].forEach((r, i) => faceUp(r, -1.9 + i * 0.9, 3.8, 0));
    faceDown(1, 3.65, 1.35, 0.12); faceDown(9, 4.7, 1.4, -0.1); faceDown(5, 5.75, 1.35, 0.12);
    faceUp(6, 6.8, 1.45, -0.12);

    // Card edition (view 'cards'): built on first use in its own group, shown instead of the tile set.
    // Poker-size cards (63.5 × 88.9 mm) at the tiles' scale; faces and backs follow the print-and-play kit:
    // the dish face or the serving back inset on a band-coloured card.
    let cards = null, active = stage;
    let teahouse = null; const groundOpacity = ground.material.opacity;
    function showSet(g) {
      if (g === active) return; active.visible = false; g.visible = true; active = g;
      const th = !!teahouse && g === teahouse.set; // the teahouse scene brings its own table, lights and backdrop
      if (teahouse) teahouse.env.visible = th;
      hemi.visible = key.visible = rim.visible = !th;
      ground.material.opacity = th ? 0 : groundOpacity;
      scene.background = th ? teahouse.bg : null;
      dirty = true;
    }
    function cardSet() {
      if (cards) return cards;
      cards = new THREE.Group(); cards.visible = false; scene.add(cards);
      const CW = 1.48, CH = 2.07, CR = 0.075, CT = 0.014, LIFT = 0.003;
      const cardGeo = new THREE.ExtrudeGeometry(roundedRect(CW, CH, CR), { depth: CT, bevelEnabled: false, curveSegments: 6 });
      cardGeo.rotateX(-Math.PI / 2);
      const cardPlane = new THREE.PlaneGeometry(CW, CH);
      const stock = new THREE.MeshStandardMaterial({ color: C('#F3EEE2'), roughness: 0.6 });
      const imgLoader = new THREE.ImageLoader(manager), mats = {};
      function cardMat(kind, n) { // kind 'face' (n = rank) or 'back' (n = band)
        const key = kind + n; if (mats[key]) return mats[key];
        const W = 600, H = 840, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso);
        const b = kind === 'face' ? bandOf(n) : n, iw = kind === 'face' ? 2.28 / 2.5 : 2.3 / 2.5, ih = kind === 'face' ? 3.22 / 3.5 : 3.25 / 3.5;
        imgLoader.load(TEX + kind + '-' + n + '.webp', (img) => {
          const g = cv.getContext('2d'), r = W * CR / CW;
          g.beginPath(); g.moveTo(r, 0); g.arcTo(W, 0, W, H, r); g.arcTo(W, H, 0, H, r); g.arcTo(0, H, 0, 0, r); g.arcTo(0, 0, W, 0, r); g.closePath(); g.clip();
          g.fillStyle = BAND[b]; g.fillRect(0, 0, W, H);
          g.drawImage(img, W * (1 - iw) / 2, H * (1 - ih) / 2, W * iw, H * ih);
          t.needsUpdate = true; dirty = true;
        });
        return (mats[key] = new THREE.MeshStandardMaterial({ map: t, color: C('#D9D4CA'), alphaTest: 0.5, roughness: 0.55 }));
      }
      // a card lying flat: up = face up; yaw turns it on the table
      function card(r, x, z, up, yaw) {
        const g = new THREE.Group(); g.name = 'card ' + r + (up ? ' up' : ' down') + ' @' + x.toFixed(2) + ',' + z.toFixed(2);
        const body = new THREE.Mesh(cardGeo, stock); body.castShadow = true; g.add(body);
        const top = new THREE.Mesh(cardPlane, cardMat('face', r)); top.rotation.x = -Math.PI / 2; top.position.y = CT + 0.002; top.receiveShadow = true; g.add(top);
        const bot = new THREE.Mesh(cardPlane, cardMat('back', bandOf(r))); bot.rotation.x = Math.PI / 2; bot.position.y = -0.002; g.add(bot);
        if (!up) { g.rotation.z = Math.PI; g.position.y = CT + LIFT; } else g.position.y = LIFT;
        g.position.x = x; g.position.z = z; g.rotation.y = yaw || 0; g.rotation.order = 'YXZ';
        cards.add(g); return g;
      }
      // Tichu-size two-piece card box, 95 × 70 × 30 mm: the lid sits on the base, which shows a 2 mm lip
      const LW = 2.21, LD = 1.63, LH = 0.64, LIP = 0.06;
      const cside = new THREE.TextureLoader(manager), ctex = (n) => { const t = cside.load(CARD_TEX + n + '.webp'); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso); return t; };
      const lsd = ctex('card-box-side'), lend = ctex('card-box-end');
      const lidMats = [
        new THREE.MeshStandardMaterial({ map: lend, roughness: 0.55 }),
        new THREE.MeshStandardMaterial({ map: lend, roughness: 0.55 }),
        new THREE.MeshStandardMaterial({ map: ctex('card-box-top'), roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: C('#6E120D'), roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: lsd, roughness: 0.55 }),
        new THREE.MeshStandardMaterial({ map: lsd, roughness: 0.55 }),
      ];
      const cbox = new THREE.Group(); cbox.name = 'card box';
      const lid = new THREE.Mesh(new THREE.BoxGeometry(LW, LH, LD), lidMats); lid.position.y = LIP + LH / 2; lid.castShadow = lid.receiveShadow = true; cbox.add(lid);
      const base = new THREE.Mesh(new THREE.BoxGeometry(LW - 0.04, LIP + 0.01, LD - 0.04), new THREE.MeshStandardMaterial({ color: C('#7A1A12'), roughness: 0.7 }));
      base.position.y = (LIP + 0.01) / 2; base.castShadow = base.receiveShadow = true; cbox.add(base);
      cards.add(cbox);
      cardLayout(card, cbox);
      return cards;
    }

    // Teahouse scene (view 'scene'): the tile edition on a round dark-wood teahouse table during the Sunday
    // lunch rush — a bamboo steamer, a porcelain teapot and a cup of tea, under a warm lantern-coloured pool
    // of light. Built on first use; `set` holds the objects (box, bag, tiles, props), `env` the table,
    // lights and backdrop, so the per-object overlap check can hide the environment.
    function canvasTex(w, h, draw, repeat) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso);
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
    function teahouseSet() {
      if (teahouse) return teahouse;
      const set = new THREE.Group(), env = new THREE.Group();
      set.visible = false; env.visible = false; scene.add(set); scene.add(env);

      // --- backdrop: the dim dining room beyond the table, lantern glows soft and out of focus
      const bg = canvasTex(1600, 1000, (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d0f0a'); gr.addColorStop(1, '#2c160d');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const R = rnd(7);
        [[0.08, 0.1, 150, '255,150,70', 0.22], [0.3, 0.05, 120, '230,70,40', 0.2], [0.52, 0.13, 170, '255,170,90', 0.16],
         [0.74, 0.04, 130, '230,70,40', 0.22], [0.93, 0.14, 160, '255,150,70', 0.2], [0.42, 0.24, 90, '255,190,120', 0.1],
         [0.18, 0.26, 100, '255,190,120', 0.1], [0.84, 0.28, 110, '255,170,90', 0.1]].forEach(([x, y, r, c, a]) => {
          const rg = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
          rg.addColorStop(0, 'rgba(' + c + ',' + a + ')'); rg.addColorStop(0.55, 'rgba(' + c + ',' + a * 0.45 + ')'); rg.addColorStop(1, 'rgba(' + c + ',0)');
          g.fillStyle = rg; g.fillRect(0, 0, W, H);
        });
        for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(0,0,0,' + R() * 0.05 + ')'; g.fillRect(R() * W, R() * H, 2, 2); }
      });

      // --- the round table: dark rosewood, close straight grain under a satin lacquer
      const wood = canvasTex(2048, 2048, (g, W, H) => {
        g.fillStyle = '#3d1f14'; g.fillRect(0, 0, W, H);
        const R = rnd(11);
        for (let i = 0; i < 40; i++) { // broad colour bands
          const y0 = R() * H, hh = 30 + R() * 160; g.fillStyle = R() < 0.5 ? 'rgba(20,8,4,' + R() * 0.22 + ')' : 'rgba(110,52,28,' + R() * 0.14 + ')'; g.fillRect(0, y0, W, hh);
        }
        for (let i = 0; i < 700; i++) { // fine, nearly straight grain lines that drift together
          const y0 = R() * H, amp = 2 + R() * 7, f = 0.4 + R() * 0.9, ph = R() * 6.28;
          g.strokeStyle = R() < 0.65 ? 'rgba(18,7,4,' + (0.08 + R() * 0.2) + ')' : 'rgba(128,64,36,' + (0.05 + R() * 0.12) + ')';
          g.lineWidth = 0.6 + R() * 2.2; g.beginPath();
          for (let x = -16; x <= W + 16; x += 16) { const y = y0 + amp * Math.sin(x / W * 6.28 * f + ph); x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
          g.stroke();
        }
        for (let i = 0; i < 60000; i++) { g.fillStyle = 'rgba(15,6,3,' + R() * 0.1 + ')'; g.fillRect(R() * W, R() * H, 2 + R() * 6, 1); }
        // darker towards the rim: the light pool and years of hands
        const rg = g.createRadialGradient(W / 2, H / 2, W * 0.18, W / 2, H / 2, W * 0.5);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(10,4,2,0.45)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
      });
      const TR_ = 10.5;
      const topMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.32, metalness: 0 });
      const edgeMat = new THREE.MeshStandardMaterial({ color: C('#2a130c'), roughness: 0.4 });
      const table = new THREE.Mesh(new THREE.CylinderGeometry(TR_, TR_ - 0.15, 0.6, 160), [edgeMat, topMat, edgeMat]);
      table.position.set(0.4, -0.3, -0.6); table.receiveShadow = true; env.add(table);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(TR_ - 0.02, 0.07, 10, 200), edgeMat);
      lip.rotation.x = Math.PI / 2; lip.position.set(0.4, -0.03, -0.6); env.add(lip);

      // --- lights: a warm lantern pool from above, a soft warm fill so the box front reads, a cool-ish back rim
      env.add(new THREE.HemisphereLight(0xffe2c0, 0x3a2014, 0.34));
      const lamp = new THREE.SpotLight(0xffd9a6, 1.4, 0, 0.6, 1, 1);
      lamp.position.set(1.5, 20, 5); lamp.target.position.set(0.7, 0, -0.6);
      lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.radius = 5; lamp.shadow.bias = -0.0006;
      lamp.shadow.camera.near = 8; lamp.shadow.camera.far = 40;
      env.add(lamp); env.add(lamp.target);
      const fill = new THREE.DirectionalLight(0xffe6c8, 0.32); fill.position.set(-3, 6, 14); env.add(fill);
      const back = new THREE.DirectionalLight(0xffb070, 0.35); back.position.set(-6, 5, -10); env.add(back);

      // --- components: the tile-version box, the cloth bag, a dealt cart and a played combination
      const box2 = new THREE.Mesh(box.geometry, boxMats); box2.name = 'box'; box2.castShadow = box2.receiveShadow = true;
      box2.position.set(-3.2, BH / 2, -1.4); box2.rotation.y = 0.12; set.add(box2);
      const bag2 = bag.clone(); bag2.name = 'bag'; bag2.position.set(3.6, 0, -1.6); bag2.rotation.y = -0.5; set.add(bag2);
      [2, 3, 5, 7, 8, 11].forEach((r, i) => standing(r, -5.45 + i * 0.95, 2.6, 0, 0.1, set));
      [4, 5, 6].forEach((r, i) => faceUp(r, 1.55 + i * 0.95, 2.9, 0, set));

      // --- props
      // bamboo steamer: two tiers and a woven lid
      const bambooSide = canvasTex(1024, 128, (g, W, H) => {
        g.fillStyle = '#c99a5b'; g.fillRect(0, 0, W, H);
        const R = rnd(3);
        for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (R() < 0.5 ? '120,80,36' : '235,200,140') + ',' + R() * 0.25 + ')'; g.fillRect(0, R() * H, W, 1 + R() * 2); }
        g.fillStyle = 'rgba(90,58,24,0.55)'; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);
        for (let x = 0; x < W; x += 64) { g.fillStyle = 'rgba(95,60,25,0.6)'; g.fillRect(x + 30, 10, 4, H - 20); g.fillStyle = 'rgba(240,210,150,0.35)'; g.fillRect(x + 34, 10, 2, H - 20); }
      }, true);
      bambooSide.repeat.set(3, 1);
      const weave = canvasTex(512, 512, (g, W, H) => {
        g.fillStyle = '#b8874a'; g.fillRect(0, 0, W, H);
        const n = 22, s = W / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const hz = (i + j) % 2 === 0, x = i * s, y = j * s;
          const gr = hz ? g.createLinearGradient(x, y, x, y + s) : g.createLinearGradient(x, y, x + s, y);
          gr.addColorStop(0, '#9c6c33'); gr.addColorStop(0.5, '#ddb377'); gr.addColorStop(1, '#9c6c33');
          g.fillStyle = gr; g.fillRect(x + 1, y + 1, s - 2, s - 2);
        }
        const rg = g.createRadialGradient(W / 2, H / 2, W * 0.36, W / 2, H / 2, W * 0.5);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(80,48,18,0.55)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
      });
      const bamMat = new THREE.MeshStandardMaterial({ map: bambooSide, roughness: 0.7 });
      const bamDark = new THREE.MeshStandardMaterial({ color: C('#8a5a26'), roughness: 0.7 });
      const lidTop = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.75 });
      const steamer = new THREE.Group(); steamer.name = 'steamer';
      const SR = 1.3, TIER = 0.56;
      for (let k = 0; k < 2; k++) {
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, TIER, 72), [bamMat, bamDark, bamDark]);
        tier.position.y = TIER / 2 + k * (TIER + 0.02); tier.castShadow = tier.receiveShadow = true; steamer.add(tier);
        [0.04, TIER - 0.04].forEach((yy) => { const band = new THREE.Mesh(new THREE.TorusGeometry(SR + 0.01, 0.045, 8, 96), bamDark); band.rotation.x = Math.PI / 2; band.position.y = k * (TIER + 0.02) + yy; steamer.add(band); });
      }
      const lidY = 2 * (TIER + 0.02);
      const lidW = new THREE.Mesh(new THREE.CylinderGeometry(SR + 0.05, SR + 0.05, 0.3, 72, 1, true), bamMat); lidW.position.y = lidY + 0.15; lidW.castShadow = true; steamer.add(lidW);
      const lidG = new THREE.SphereGeometry(1, 72, 12, 0, Math.PI * 2, 0, 0.32);
      // a shallow woven dome: scale the cap so its rim meets the lid wall
      const capR = Math.sin(0.32), capH = 1 - Math.cos(0.32);
      lidG.scale((SR + 0.05) / capR, 0.18 / capH, (SR + 0.05) / capR); lidG.translate(0, -0.18 / capH * Math.cos(0.32), 0);
      const lidM = new THREE.Mesh(lidG, lidTop); lidM.position.y = lidY + 0.3; lidM.castShadow = true; steamer.add(lidM);
      // planar UVs for the woven top
      { const pa = lidG.attributes.position, uv = lidG.attributes.uv, m = SR + 0.05; for (let i = 0; i < pa.count; i++) uv.setXY(i, 0.5 + pa.getX(i) / (2 * m), 0.5 + pa.getZ(i) / (2 * m)); uv.needsUpdate = true; }
      const lidRim = new THREE.Mesh(new THREE.TorusGeometry(SR + 0.06, 0.05, 8, 96), bamDark); lidRim.rotation.x = Math.PI / 2; lidRim.position.y = lidY + 0.3; steamer.add(lidRim);
      steamer.position.set(1.25, 0, -4.7); set.add(steamer);

      // porcelain: white glaze with a cobalt band
      const glaze = canvasTex(1024, 256, (g, W, H) => {
        g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#2b4f8f'; g.fillRect(0, H * 0.42, W, H * 0.05); g.fillRect(0, H * 0.62, W, H * 0.02);
        g.fillStyle = '#2b4f8f';
        for (let x = 0; x < W; x += 48) { g.beginPath(); g.arc(x + 24, H * 0.545, 7, 0, Math.PI * 2); g.fill(); }
      });
      const porcelain = new THREE.MeshStandardMaterial({ map: glaze, roughness: 0.18, side: THREE.DoubleSide });
      const white = new THREE.MeshStandardMaterial({ color: C('#f6f1e7'), roughness: 0.18, side: THREE.DoubleSide });
      const lathe = (pts, seg) => new THREE.LatheGeometry(new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(48), seg || 72);
      // teapot
      const pot = new THREE.Group(); pot.name = 'teapot';
      const body = new THREE.Mesh(lathe([[0, 0], [0.7, 0.02], [1.15, 0.3], [1.32, 0.8], [1.22, 1.3], [0.92, 1.62], [0.78, 1.7], [0.78, 1.74]]), porcelain);
      body.castShadow = body.receiveShadow = true; pot.add(body);
      const lid = new THREE.Mesh(lathe([[0.84, 1.72], [0.82, 1.8], [0.6, 1.92], [0.2, 1.98], [0, 1.99]]), white); lid.castShadow = true; pot.add(lid);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), white); knob.position.y = 2.06; knob.scale.y = 0.8; knob.castShadow = true; pot.add(knob);
      const spC = new THREE.CatmullRomCurve3([new THREE.Vector3(1.05, 0.6, 0), new THREE.Vector3(1.55, 0.9, 0), new THREE.Vector3(1.85, 1.35, 0), new THREE.Vector3(2.15, 1.75, 0)]);
      const spG = new THREE.TubeGeometry(spC, 24, 0.2, 16, false);
      { const pa = spG.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
        for (let i = 0; i <= 24; i++) { spC.getPointAt(i / 24, c); const k = 1.35 - 0.6 * (i / 24);
          for (let j = 0; j <= 16; j++) { const n = i * 17 + j; q.fromBufferAttribute(pa, n).sub(c).multiplyScalar(k).add(c); pa.setXYZ(n, q.x, q.y, q.z); } }
        spG.computeVertexNormals(); }
      const spout = new THREE.Mesh(spG, white); spout.castShadow = true; pot.add(spout);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 12, 40, Math.PI * 1.15), white);
      handle.position.set(-1.22, 0.95, 0); handle.rotation.z = Math.PI / 2 - 0.08; handle.castShadow = true; pot.add(handle);
      pot.scale.setScalar(0.85); pot.position.set(6.8, 0, -3.0); pot.rotation.y = 2.3; set.add(pot);
      // teacup with tea
      const cup = new THREE.Group(); cup.name = 'teacup';
      const cupB = new THREE.Mesh(lathe([[0, 0], [0.32, 0], [0.36, 0.06], [0.5, 0.3], [0.62, 0.62], [0.66, 0.78]]), porcelain); cupB.castShadow = cupB.receiveShadow = true; cup.add(cupB);
      const tea = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), new THREE.MeshStandardMaterial({ color: C('#7a3d12'), roughness: 0.08 }));
      tea.rotation.x = -Math.PI / 2; tea.position.y = 0.64; cup.add(tea);
      cup.position.set(5.9, 0, 2.3); set.add(cup);

      teahouse = { set, env, bg };
      return teahouse;
    }

    // Camera rig
    const cur = { t: new THREE.Vector3(), d: 0, th: 0, ph: 0 }, goal = { t: new THREE.Vector3(), d: 0, th: 0, ph: 0 };
    function setGoal(name, instant) {
      const p = VIEWS[name] || VIEWS.all;
      showSet(name === 'cards' ? cardSet() : name === 'scene' ? teahouseSet().set : stage);
      goal.t.set(p.t[0], p.t[1], p.t[2]); goal.d = p.d; goal.th = p.th; goal.ph = p.ph;
      if (instant || reduce) { cur.t.copy(goal.t); cur.d = goal.d; cur.th = goal.th; cur.ph = goal.ph; }
      sway0 = goal.th;
      dirty = true;
    }
    let sway0 = 0, userTouched = !!opts.still || reduce, t0 = performance.now();
    function place() {
      const sp = Math.sin(cur.ph);
      camera.position.set(cur.t.x + cur.d * sp * Math.sin(cur.th), cur.t.y + cur.d * Math.cos(cur.ph), cur.t.z + cur.d * sp * Math.cos(cur.th));
      camera.lookAt(cur.t);
    }

    // Drag to orbit
    let drag = null, dirty = true;
    if (interactive) {
      canvas.style.touchAction = 'pan-y';
      canvas.style.cursor = 'grab';
      canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, th: goal.th, ph: goal.ph, id: e.pointerId }; userTouched = true; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        goal.th = drag.th - (e.clientX - drag.x) * 0.008;
        goal.ph = Math.max(0.45, Math.min(1.3, drag.ph - (e.clientY - drag.y) * 0.005));
        dirty = true;
      });
      const up = () => { drag = null; canvas.style.cursor = 'grab'; };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    }

    function resize() {
      const w = el.clientWidth || 600, h = el.clientHeight || 400;
      renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%';
      camera.aspect = w / h;
      // pull back a little on tall/narrow frames so everything stays in shot
      camera.zoom = Math.min(1, (w / h) / 1.62) * 0.98 + 0.02;
      camera.updateProjectionMatrix(); dirty = true;
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el); else window.addEventListener('resize', resize);

    let visible = true, raf = 0;
    if (window.IntersectionObserver) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(el);

    function loop() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function step(now) {
        if (!visible) return;
        if (!userTouched) { goal.th = sway0 + Math.sin((now - t0) / 4200) * 0.12; dirty = true; }
        const k = 0.085;
        const moving = Math.abs(goal.th - cur.th) + Math.abs(goal.ph - cur.ph) + Math.abs(goal.d - cur.d) + goal.t.distanceTo(cur.t) > 0.0005;
        if (moving) { cur.th += (goal.th - cur.th) * k; cur.ph += (goal.ph - cur.ph) * k; cur.d += (goal.d - cur.d) * k; cur.t.lerp(goal.t, k); dirty = true; }
        if (dirty) { place(); renderer.render(scene, camera); dirty = false; }
        raf = requestAnimationFrame(step);
      });
    }

    setGoal(opts.view || 'all', true);
    resize();
    let ready = false;
    manager.onLoad = () => {
      dirty = true; place(); renderer.render(scene, camera);
      if (ready) return; // later loads (the card set, built on first use) just redraw
      ready = true;
      el.classList.add('is-ready');
      if (opts.onReady) opts.onReady();
      if (!opts.still) loop();
    };

    return {
      setView(name) { setGoal(name); if (!opts.still) loop(); },
      renderNow() { place(); renderer.render(scene, camera); },
      canvas,
      _debug: { scene, get stage() { return active; }, get env() { return teahouse && active === teahouse.set ? teahouse.env : null; }, camera, renderer, ground },
    };
  }

  window.DSRScene = { mount, views: Object.keys(VIEWS) };
})();
