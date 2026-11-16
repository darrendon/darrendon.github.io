/* Doodle Relay — rules engine (online tables only, no bots).
   Runs in the host's browser through the shared table (assets/js/dev-table.js) and in node for sim.js.

   A round: everyone is dealt a fresh card (six words, or six categories on the other side) and the
   table rolls one die, so everyone draws the same row of their own card. Each player starts a board
   with their secret word, draws for a few seconds, then every board passes left at once. The next
   player keeps drawing without knowing the word, until each board has had its drawers. Then the
   table guesses the boards one at a time, together; the board's starter stays quiet. One point to
   the team for every board it gets.

   Cards aren't a fixed deck: each one is dealt on the spot from the word bank below, so no two
   cards repeat and no word comes up twice in a game. Every tunable number is in RULES. */
(function (root) {
  'use strict';
  const RULES = {
    minPlayers: 3, maxPlayers: 8,
    drawers: 3,            // players who draw on each board ('all' = the board goes all the way round)
    drawMs: 10000,         // drawing time per pass (table option: 5, 10 or 15 s)
    firstLookMs: 3500,     // before the first pass: read your word
    lookMs: 2500,          // before every later pass: look at the board you were handed
    graceMs: 1500,         // strokes still accepted after time runs out (network lag)
    cardMs: { words: 25000, categories: 60000 },   // then anyone not ready is dealt their row automatically
    revealMinMs: 2500,     // a reveal stays up at least this long before Next board works
    rounds: 2, cardSize: 6,
    maxWord: 24, maxAnswer: 40,
    maxStrokesPerPass: 150, maxNumsPerPass: 6000,  // a stroke is a flat list x,y,x,y… on a 0–1000 board
  };

  /* Word bank: category, then the words dealt from it. Every word should be drawable in a few seconds. */
  const BANK_SRC =
    'Animals:cat,dog,horse,pig,cow,sheep,rabbit,mouse,elephant,giraffe,lion,monkey,bear,kangaroo,zebra,camel,snake,turtle,frog,owl,penguin,duck,chicken,squirrel,hedgehog,bat,fox,deer,skunk,koala;' +
    'Sea creatures:fish,shark,whale,octopus,crab,jellyfish,starfish,seahorse,lobster,dolphin,squid,clam,eel,stingray,walrus,seal;' +
    'Bugs:spider,ant,bee,butterfly,ladybug,snail,worm,caterpillar,dragonfly,mosquito,grasshopper,beetle,firefly,scorpion;' +
    'Food:pizza,hamburger,hot dog,taco,sandwich,spaghetti,pancakes,egg,bacon,popcorn,pretzel,sushi,french fries,cheese,bread,soup,burrito,cereal,peanut,cookie;' +
    'Fruits and vegetables:apple,banana,pineapple,watermelon,strawberry,cherry,grapes,lemon,pear,carrot,corn,broccoli,mushroom,onion,pumpkin,potato,pepper,peas,avocado,coconut;' +
    'Desserts:cake,ice cream,donut,cupcake,lollipop,pie,candy cane,cotton candy,popsicle,brownie,pudding,waffle;' +
    'In the kitchen:fork,spoon,knife,frying pan,teapot,mug,toaster,blender,oven,fridge,whisk,rolling pin,kettle,bowl,cheese grater;' +
    'Around the house:chair,bed,lamp,door,window,stairs,couch,clock,mirror,bathtub,toilet,candle,key,ladder,fireplace,broom,vacuum,umbrella,doorbell,fan;' +
    'Clothes:hat,shoe,sock,glove,scarf,shirt,pants,dress,crown,glasses,boot,tie,belt,backpack,mitten,sweater,flip flops,bow tie;' +
    'Vehicles:car,bus,train,airplane,helicopter,bicycle,motorcycle,boat,rocket,tractor,truck,submarine,skateboard,sailboat,hot air balloon,scooter,ambulance,fire truck;' +
    'Places:house,castle,igloo,lighthouse,barn,tent,bridge,tower,pyramid,school,church,windmill,treehouse,skyscraper,tepee,volcano,island,cave;' +
    'Nature:tree,flower,cactus,mountain,river,sun,moon,star,cloud,rainbow,leaf,palm tree,waterfall,rock,mushroom,lightning,snowflake,tornado,wave,desert;' +
    'Weather:rain,snow,thunderstorm,wind,fog,hail,sunshine,snowman,puddle,icicle;' +
    'In space:planet,astronaut,alien,flying saucer,comet,telescope,satellite,black hole,moon landing,shooting star;' +
    'Music:guitar,drum,piano,trumpet,violin,microphone,headphones,harp,saxophone,accordion,tambourine,music note,banjo,flute;' +
    'Sports:soccer,basketball,baseball,football,tennis,golf,bowling,hockey,skiing,surfing,boxing,swimming,archery,karate,volleyball,trophy,whistle,medal;' +
    'Tools:hammer,saw,screwdriver,wrench,shovel,rake,axe,drill,nail,paintbrush,tape measure,magnet,flashlight,scissors,ruler,bucket;' +
    'School:pencil,book,eraser,backpack,globe,crayon,calculator,chalkboard,school bus,notebook,glue,paper clip,microscope,lunchbox;' +
    'Body:eye,ear,nose,mouth,hand,foot,tooth,brain,heart,skeleton,bone,mustache,beard,muscle,tongue,fingerprint;' +
    'Jobs:doctor,firefighter,chef,pilot,farmer,police officer,teacher,artist,astronaut,pirate,clown,magician,king,queen,mail carrier,dentist,lifeguard,detective;' +
    'Fairy tales:dragon,unicorn,mermaid,wizard,witch,giant,fairy,knight,ghost,vampire,mummy,zombie,troll,genie,magic wand,treasure chest,beanstalk,glass slipper;' +
    'Toys and games:kite,yo-yo,teddy bear,balloon,puzzle,dice,doll,robot,jump rope,top,marbles,building blocks,slide,swing,seesaw,frisbee,rubber duck,jack in the box;' +
    'Party:birthday cake,present,party hat,confetti,pinata,fireworks,disco ball,balloon,streamers,candle;' +
    'At the beach:sandcastle,beach ball,sunglasses,seashell,surfboard,beach umbrella,bucket and spade,swimsuit,lifeguard tower,sunscreen;' +
    'Camping:campfire,tent,marshmallow,sleeping bag,lantern,compass,canoe,fishing rod,map,binoculars,log cabin;' +
    'Halloween:jack-o-lantern,bat,spider web,haunted house,black cat,broomstick,cauldron,skull,tombstone,candy corn;' +
    'Winter holidays:snowman,sled,ice skates,gingerbread man,stocking,reindeer,wreath,mittens,hot chocolate,chimney;' +
    'Farm:barn,tractor,scarecrow,haystack,rooster,goat,windmill,fence,horseshoe,pitchfork,egg basket,beehive;' +
    'Tech:computer,phone,television,camera,robot,lightbulb,battery,remote control,video game,keyboard,mouse trap,printer;' +
    'Dinosaurs and fossils:dinosaur,egg,footprint,bone,volcano,meteor,caveman,fossil,mammoth,pterodactyl;' +
    'Pirates:pirate ship,treasure map,parrot,anchor,cannon,eye patch,hook,plank,telescope,skull and crossbones;' +
    'Circus:clown,tightrope,juggler,circus tent,lion tamer,unicycle,trapeze,ringmaster,cannonball,popcorn;' +
    'Things that fly:bird,kite,airplane,helicopter,butterfly,balloon,paper airplane,dragon,bee,parachute;' +
    'Things that are round:ball,clock,coin,pizza,wheel,donut,cookie,button,globe,bubble,plate,orange;' +
    'In the bathroom:toothbrush,shower,soap,towel,toilet paper,comb,sink,rubber duck,bubble bath,plunger;' +
    'In the garden:watering can,flower pot,gnome,birdhouse,hose,wheelbarrow,sunflower,snail,fence,vegetable patch;' +
    'Actions:sleeping,running,jumping,dancing,swimming,crying,laughing,sneezing,reading,cooking,fishing,juggling;' +
    'Famous places:Eiffel Tower,Statue of Liberty,pyramids,Great Wall,Big Ben,Leaning Tower,Mount Rushmore,Stonehenge,Golden Gate Bridge,Taj Mahal';
  const BANK = BANK_SRC.split(';').map((block) => { const i = block.indexOf(':'); return { cat: block.slice(0, i), words: block.slice(i + 1).split(',') }; });

  const rand = (n, rng) => Math.floor((rng || Math.random)() * n);
  const shuffle = (a, rng) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1, rng); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

  /* Is the team's answer the same word? Ignores case, punctuation, spaces, a/an/the, plurals and a slip of the keyboard. */
  function norm(s) {
    let t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^(a|an|the|some) /, '');
    t = t.replace(/ /g, '');
    if (t.length > 4 && /ies$/.test(t)) t = t.slice(0, -3) + 'y';
    else if (t.length > 4 && /(ches|shes|sses|xes)$/.test(t)) t = t.slice(0, -2);
    else if (t.length > 3 && /s$/.test(t) && !/ss$/.test(t)) t = t.slice(0, -1);
    return t;
  }
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function sameWord(a, b) {
    const x = norm(a), y = norm(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const n = Math.min(x.length, y.length);
    const slack = n >= 9 ? 2 : n >= 5 ? 1 : 0;
    return slack > 0 && editDistance(x, y) <= slack;
  }

  /* Deals a fresh card. Words side: six words from six different categories, none used yet this game. */
  function dealCard(mode, used, rng) {
    const cats = shuffle(BANK, rng);
    if (mode === 'categories') return cats.slice(0, RULES.cardSize).map((c) => c.cat);
    const items = [];
    for (const c of cats) {
      if (items.length >= RULES.cardSize) break;
      const fresh = c.words.filter((w) => !used.has(norm(w)) && !items.some((it) => norm(it.word) === norm(w)));
      if (!fresh.length) continue;
      items.push({ word: fresh[rand(fresh.length, rng)], cat: c.cat });
    }
    return items;
  }
  /* A word for a player who never wrote one for their category: from the bank if the category is there. */
  function wordFor(cat, used, rng) {
    const c = BANK.find((b) => b.cat === cat) || BANK[rand(BANK.length, rng)];
    const fresh = c.words.filter((w) => !used.has(norm(w)));
    const pool = fresh.length ? fresh : c.words;
    return pool[rand(pool.length, rng)];
  }

  function validStroke(p) {
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 || p.length > 2000) return null;
    const out = new Array(p.length);
    for (let i = 0; i < p.length; i++) { const v = Math.round(+p[i]); if (!isFinite(v)) return null; out[i] = Math.max(0, Math.min(1000, v)); }
    return out;
  }

  class Game {
    /* players: [{name}]; opts: {mode: 'words'|'categories', drawSecs, rounds, drawers}; env: {now, rng} for tests */
    constructor(players, opts, env) {
      opts = opts || {}; env = env || {};
      this.now = env.now || (() => Date.now());
      this.rng = env.rng || Math.random;
      this.players = players.map((p) => ({ name: clean(p.name, 20) || 'Player' }));
      this.N = this.players.length;
      this.mode = opts.mode === 'categories' ? 'categories' : 'words';
      this.drawMs = [5, 10, 15, 20].includes(+opts.drawSecs) ? +opts.drawSecs * 1000 : RULES.drawMs;
      this.rounds = Math.max(1, Math.min(5, +opts.rounds || RULES.rounds));
      const d = opts.drawers === 'all' || RULES.drawers === 'all' ? this.N : Math.min(this.N, +opts.drawers || RULES.drawers);
      this.L = Math.max(2, d);
      this.used = new Set();
      this.history = [];   // one entry per board guessed: {round, starter, word, answer, ok}
      this.score = 0;
      this.round = 0;
      this.startRound();
    }

    /* ------------------------------------------------------------ round flow */
    startRound() {
      this.round++;
      this.phase = 'card';
      this.roll = 1 + rand(RULES.cardSize, this.rng);
      this.cards = this.players.map(() => {
        const c = dealCard(this.mode, this.used, this.rng);
        if (this.mode === 'words') c.forEach((it) => this.used.add(norm(it.word)));
        return c;
      });
      this.secret = this.players.map((_, s) => (this.mode === 'words' ? this.cards[s][this.roll - 1].word : null));
      this.ready = this.players.map(() => false);
      this.cardEnds = this.now() + RULES.cardMs[this.mode];
      this.boards = null;
      this.log(this.mode === 'words' ? 'Round ' + this.round + ': everyone draws word ' + this.roll + ' on their card.' : 'Round ' + this.round + ': everyone draws category ' + this.roll + ' on their card.');
    }
    startDrawing() {
      this.phase = 'draw';
      this.boards = this.players.map((_, s) => ({ starter: s, word: this.secret[s], cat: this.mode === 'words' ? this.cards[s][this.roll - 1].cat : this.cards[s][this.roll - 1], legs: [] }));
      this.leg = -1;
      this.nextLeg();
    }
    nextLeg() {
      this.leg++;
      const t = this.now(), look = this.leg === 0 ? RULES.firstLookMs : RULES.lookMs;
      this.drawStart = t + look;
      this.drawEnd = this.drawStart + this.drawMs;
      this.stage = 'look';
      this.boards.forEach((b) => b.legs.push({ seat: this.holder(b.starter, this.leg), strokes: [], nums: 0 }));
    }
    holder(starter, leg) { return (starter + leg) % this.N; }
    boardHeldBy(seat, leg) { return this.boards[(seat - leg + this.N * 8) % this.N]; }
    startGuessing() {
      this.phase = 'guess';
      this.gi = 0;
      this.answer = null; this.agrees = [];
      this.order = this.players.map((_, s) => s);
    }
    guessers() { return this.N - 1; }
    need() { return Math.floor(this.guessers() / 2) + 1; }
    curBoard() { return this.boards[this.order[this.gi]]; }
    lockIn() {
      const b = this.curBoard();
      this.phase = 'reveal';
      this.verdict = sameWord(this.answer.text, b.word);
      this.judged = false;
      this.revealAt = this.now();
    }
    advance() {
      const b = this.curBoard();
      if (this.verdict) this.score++;
      this.history.push({ round: this.round, starter: b.starter, word: b.word, cat: b.cat, answer: this.answer.text, ok: this.verdict });
      this.gi++;
      this.answer = null; this.agrees = [];
      if (this.gi < this.order.length) { this.phase = 'guess'; return; }
      if (this.round < this.rounds) this.startRound();
      else this.phase = 'end';
    }

    /* ------------------------------------------------------------ the clock (the shared table calls botStep on a timer) */
    botStep() {
      const t = this.now();
      if (this.phase === 'card' && t >= this.cardEnds) {
        this.players.forEach((_, s) => { if (!this.ready[s]) this.setReady(s, null, true); });
        this.startDrawing();
        return true;
      }
      if (this.phase !== 'draw') return false;
      if (this.stage === 'look' && t >= this.drawStart) { this.stage = 'draw'; return true; }
      if (this.stage === 'draw' && t >= this.drawEnd) { this.stage = 'grace'; return false; }   // clients already stopped on their own clocks
      if (this.stage === 'grace' && t >= this.drawEnd + RULES.graceMs) {
        if (this.leg + 1 < this.L) this.nextLeg(); else this.startGuessing();
        return true;
      }
      return false;
    }
    botDelay() { return 120; }
    idleDelay() { return 120; }
    over() { return false; }   // the clock keeps running at the end so Play again works

    setReady(s, text, auto) {
      if (this.mode === 'categories') {
        const cat = this.cards[s][this.roll - 1];
        let w = clean(text, RULES.maxWord);
        if (!w) w = wordFor(cat, this.used, this.rng);
        this.secret[s] = w;
        this.used.add(norm(w));
      }
      this.ready[s] = true;
      if (auto) this.log(this.players[s].name + ' was dealt their word automatically.');
    }

    /* ------------------------------------------------------------ actions */
    act(seat, a) {
      a = a || {};
      if (!(seat >= 0 && seat < this.N)) return { ok: false, error: 'You’re not at this table.' };
      const t = this.now();
      switch (a.t) {
        case 'ready': {
          if (this.phase !== 'card') return { ok: false, error: 'The round has already started.' };
          if (this.mode === 'categories') {
            const w = clean(a.word, RULES.maxWord);
            if (!w) return { ok: false, error: 'Write a word for your category first.' };
            if (!/[a-z0-9]/i.test(w)) return { ok: false, error: 'Use letters for your word.' };
            this.setReady(seat, w);
          } else this.ready[seat] = true;
          if (this.ready.every(Boolean)) this.startDrawing();
          return { ok: true };
        }
        case 'unready': {
          if (this.phase !== 'card' || !this.ready[seat]) return { ok: false, error: 'Nothing to change.' };
          if (this.mode === 'categories') this.used.delete(norm(this.secret[seat]));
          this.ready[seat] = false;
          return { ok: true };
        }
        case 'stroke': {
          // quiet: strokes are stored without sending everyone a new view (nobody else is looking at this board yet)
          if (this.phase !== 'draw' || (a.leg | 0) !== this.leg) return { ok: false, error: 'Time’s up for that board.', quiet: true };
          if (t < this.drawStart - 400 || t > this.drawEnd + RULES.graceMs) return { ok: false, error: 'Time’s up for that board.', quiet: true };
          const p = validStroke(a.p);
          if (!p) return { ok: false, error: 'That stroke didn’t come through.', quiet: true };
          const leg = this.boardHeldBy(seat, this.leg).legs[this.leg];
          if (leg.seat !== seat) return { ok: false, error: 'That’s not your board.', quiet: true };
          if (leg.strokes.length >= RULES.maxStrokesPerPass || leg.nums + p.length > RULES.maxNumsPerPass) return { ok: false, error: 'That board is full for this pass.', quiet: true };
          leg.strokes.push(p); leg.nums += p.length;
          return { ok: true, quiet: true };
        }
        case 'answer': {
          if (this.phase !== 'guess') return { ok: false, error: 'There’s nothing to guess right now.' };
          if (seat === this.curBoard().starter) return { ok: false, error: 'It’s your board, so you stay quiet on this one.' };
          const text = clean(a.text, RULES.maxAnswer);
          if (!text) return { ok: false, error: 'Type the team’s guess first.' };
          this.answer = { text, by: seat };
          this.agrees = [seat];
          if (this.agrees.length >= this.need()) this.lockIn();
          return { ok: true };
        }
        case 'agree': {
          if (this.phase !== 'guess' || !this.answer) return { ok: false, error: 'There’s no guess on the table yet.' };
          if (seat === this.curBoard().starter) return { ok: false, error: 'It’s your board, so you stay quiet on this one.' };
          if (a.text != null && clean(a.text, RULES.maxAnswer) !== this.answer.text) return { ok: false, error: 'Someone just changed the answer. Have a look at the new one.' };
          const i = this.agrees.indexOf(seat);
          if (i >= 0) this.agrees.splice(i, 1); else this.agrees.push(seat);
          if (this.agrees.length >= this.need()) this.lockIn();
          return { ok: true };
        }
        case 'judge': {
          if (this.phase !== 'reveal') return { ok: false, error: 'Nothing to judge right now.' };
          if (seat !== this.curBoard().starter) return { ok: false, error: 'Only the player who started this board can overrule.' };
          this.verdict = !!a.ok; this.judged = true;
          return { ok: true };
        }
        case 'next': {
          if (this.phase !== 'reveal') return { ok: false, error: 'Not yet.' };
          if (t - this.revealAt < RULES.revealMinMs) return { ok: false, error: 'Give everyone a second to see it.' };
          this.advance();
          return { ok: true };
        }
        case 'again': {
          if (this.phase !== 'end') return { ok: false, error: 'The game isn’t over.' };
          this.used = new Set(); this.history = []; this.score = 0; this.round = 0; this.logLines = [];
          this.startRound();
          return { ok: true };
        }
      }
      return { ok: false, error: 'Not allowed.' };
    }

    log(line) { (this.logLines = this.logLines || []).push(line); if (this.logLines.length > 30) this.logLines.shift(); }

    /* ------------------------------------------------------------ what each seat may see */
    view(seat) {
      const t = this.now();
      const v = {
        seat, N: this.N, players: this.players.map((p) => ({ name: p.name })), phase: this.phase,
        round: this.round, rounds: this.rounds, mode: this.mode, roll: this.roll, L: this.L, drawMs: this.drawMs,
        score: this.score, played: this.history.length, maxScore: this.N * this.rounds,
        history: this.history.slice(), log: (this.logLines || []).slice(-6),
      };
      if (this.phase === 'card') {
        v.card = this.cards[seat];
        v.secret = this.mode === 'words' ? this.secret[seat] : (this.ready[seat] ? this.secret[seat] : null);
        v.ready = this.ready.slice();
        v.msLeft = Math.max(0, this.cardEnds - t);
      } else if (this.phase === 'draw') {
        const b = this.boardHeldBy(seat, this.leg);
        v.draw = {
          leg: this.leg, stage: this.stage === 'grace' ? 'draw' : this.stage,
          msToDraw: Math.max(0, this.drawStart - t), msLeft: Math.max(0, this.drawEnd - t),
          starter: b.starter, mine: b.starter === seat,
          word: b.starter === seat ? b.word : null,
          strokes: b.legs.slice(0, this.leg + 1).reduce((all, l) => all.concat(l.strokes), []),
          next: (seat + 1) % this.N,
        };
      } else if (this.phase === 'guess' || this.phase === 'reveal') {
        const b = this.curBoard();
        v.board = {
          idx: this.gi, of: this.order.length, starter: b.starter, mine: b.starter === seat,
          word: b.starter === seat || this.phase === 'reveal' ? b.word : null,
          cat: this.phase === 'reveal' ? b.cat : null,
          answer: this.answer, agrees: this.agrees.slice(), need: this.need(), guessers: this.guessers(),
        };
        if (this.phase === 'guess') v.board.strokes = b.legs.reduce((all, l) => all.concat(l.strokes), []);
        else {
          v.board.legs = b.legs.map((l) => ({ seat: l.seat, strokes: l.strokes }));
          v.board.verdict = this.verdict; v.board.judged = this.judged;
          v.board.msToNext = Math.max(0, RULES.revealMinMs - (t - this.revealAt));
        }
      }
      return v;
    }
  }

  const api = { Game, RULES, BANK, sameWord, norm, dealCard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DoodleRelay = api;
})(typeof window !== 'undefined' ? window : globalThis);
