/* Knead to Know — rules engine (online tables only, no bots).
   The night shift at the bakery: each decorator starts a cake from their own secret order ticket, then
   the shift changes and the next decorators keep going without ever seeing the ticket.
   Runs in the host's browser through the shared table (assets/js/dev-table.js) and in node for sim.js.

   A round (a night): one player picks an order number from 1 to 6 (a different player each round, before anyone
   sees their card), then everyone is dealt a fresh card (six words, or six categories on the other
   side) and draws that row of their own card. Each player starts a cake (a board)
   with their secret order, decorates for a few seconds, then every cake passes left at once. The next
   decorator keeps going without knowing the order, until each cake has had its decorators. Then the
   crew guesses the cakes one at a time, together; whoever took that order stays quiet. One happy
   customer (a point for the team) for every order it gets.

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
    pickMs: 20000,         // the round's picker has this long to choose a row, then one is chosen for them
    cardMs: { words: 25000, categories: 60000 },   // then anyone not ready is dealt their row automatically
    revealMinMs: 2500,     // a reveal stays up at least this long before Next board works
    rounds: 2, cardSize: 6,
    maxWord: 24, maxAnswer: 40,
    maxStrokesPerPass: 150, maxNumsPerPass: 6000,  // a stroke is a flat list x,y,x,y… on a 0–1000 board
  };

  /* Word bank: category, then the orders dealt from it. Every word is pitched at intermediate: something
     everyone knows, but that takes two or three parts to draw, so one 10-second shift can't finish it and
     the later decorators matter. No one-shape words (sun, ball, egg, heart), nothing abstract. */
  const BANK_SRC =
    'Animals:kangaroo,peacock,flamingo,porcupine,armadillo,walrus,beaver,raccoon,skunk,moose,camel,koala,sloth,chameleon,ostrich,pelican,toucan,llama,rhinoceros,hedgehog;' +
    'Sea creatures:seahorse,jellyfish,lobster,stingray,swordfish,hammerhead shark,narwhal,sea turtle,pufferfish,hermit crab,anglerfish,manta ray,octopus,starfish;' +
    'Bugs:caterpillar,dragonfly,ladybug,grasshopper,praying mantis,scorpion,firefly,beehive,spider web,snail,ant farm,butterfly net;' +
    'Bakery:cupcake,layer cake,cinnamon roll,croissant,gingerbread house,wedding cake,baguette,pretzel,rolling pin,birthday cake,muffin tin,cake stand,piping bag,chocolate chip cookie;' +
    'Food:hot dog,taco,spaghetti,sushi,burrito,french fries,popcorn,corn on the cob,pancake stack,club sandwich,kebab,cheeseburger,ice cream sundae,banana split,fried egg sandwich,pizza slice;' +
    'Fruits and vegetables:pineapple,watermelon slice,bunch of grapes,coconut,pomegranate,artichoke,corn,broccoli,eggplant,pea pod,avocado,pumpkin patch,cherry pie,banana peel;' +
    'In the kitchen:waffle iron,cheese grater,blender,toaster,teapot,ice cream scoop,corkscrew,salt shaker,egg timer,pizza cutter,measuring cup,oven mitt,kettle,dish rack;' +
    'Around the house:grandfather clock,rocking chair,chandelier,bunk bed,ceiling fan,fireplace,mailbox,washing machine,ironing board,birdcage,coat rack,aquarium,piggy bank,alarm clock,lava lamp;' +
    'Clothes:top hat,cowboy boot,bow tie,tuxedo,raincoat,sombrero,flip flops,overalls,high heels,earmuffs,tiara,roller skates,mittens,graduation cap;' +
    'Vehicles:hot air balloon,submarine,tractor,bulldozer,fire truck,ice cream truck,sailboat,helicopter,steam train,unicycle,tandem bicycle,cable car,monster truck,tow truck,canoe,school bus;' +
    'Places:lighthouse,windmill,castle,igloo,treehouse,haunted house,skyscraper,ferris wheel,roller coaster,carousel,log cabin,gas station,bus stop,drawbridge,water tower;' +
    'Nature:volcano,waterfall,tornado,cactus,palm tree,sunflower,venus flytrap,cave,island,rainstorm,geyser,mushroom ring,beaver dam,bird nest;' +
    'Winter:snowman,sled,ice skates,gingerbread man,snow globe,icicle,snowplow,hot cocoa,ski lift,penguin,snowball fight,snow angel,fireplace stocking;' +
    'In space:astronaut,rocket ship,flying saucer,satellite,telescope,comet,alien,Saturn,space station,moon landing,meteor shower,jetpack;' +
    'Music:accordion,saxophone,harp,banjo,drum kit,tambourine,xylophone,bagpipes,trumpet,violin,record player,microphone stand,grand piano,conductor;' +
    'Sports:bowling,archery,surfing,skateboard,ski jump,hockey stick,boxing glove,golf cart,tennis racket,trophy,diving board,pole vault,weightlifting,basketball hoop,soccer goal;' +
    'Tools:chainsaw,wheelbarrow,toolbox,tape measure,pliers,stepladder,paint roller,magnifying glass,hacksaw,plunger,pickaxe,watering can,sledgehammer,power drill;' +
    'School and office:calculator,stapler,globe,microscope,backpack,chalkboard,pencil sharpener,paper clip,crayon box,typewriter,swivel chair,filing cabinet,lunchbox,report card;' +
    'Body:skeleton,brain,mustache,fingerprint,footprint,braces,ponytail,belly button,goosebumps,lungs,eyebrows,beard;' +
    'Jobs:firefighter,chef,pilot,magician,pirate,lifeguard,detective,mail carrier,scuba diver,cowboy,ballerina,knight,mime,lumberjack,beekeeper,astronaut;' +
    'Fairy tales:dragon,unicorn,mermaid,wizard,genie,troll,fairy,vampire,mummy,centaur,cyclops,werewolf,treasure chest,magic carpet,crystal ball,glass slipper,beanstalk;' +
    'Toys and games:jack-in-the-box,yo-yo,kite,teddy bear,rubber duck,rocking horse,pinwheel,jump rope,building blocks,dollhouse,hula hoop,seesaw,pogo stick,spinning top,water gun,board game;' +
    'Party:birthday cake,piñata,party hat,disco ball,fireworks,balloon animal,confetti,karaoke,photo booth,party popper,gift bag,limbo;' +
    'At the beach:sandcastle,beach umbrella,surfboard,sunglasses,seashell,lifeguard tower,snorkel,flippers,pier,beach towel,sunscreen,bucket and spade,message in a bottle;' +
    'Camping:campfire,tent,sleeping bag,lantern,fishing rod,s’mores,binoculars,compass,hammock,canoe paddle,trail map,bug spray,camper van;' +
    'Halloween:jack-o’-lantern,broomstick,cauldron,tombstone,black cat,witch hat,candy corn,scarecrow,bat cave,trick-or-treat bag,coffin,full moon;' +
    'Farm:scarecrow,haystack,rooster,pitchfork,chicken coop,silo,horseshoe,cornfield,milking stool,barn owl,tractor tire,egg basket;' +
    'Tech:robot,laptop,video game controller,headphones,satellite dish,remote control,lightbulb,battery,smartwatch,drone,vending machine,cash register,security camera,selfie stick;' +
    'Circus:tightrope walker,unicycle,circus tent,lion tamer,trapeze,ringmaster,human cannonball,juggler,stilts,strongman,clown car,popcorn stand;' +
    'Pirates:pirate ship,treasure map,parrot,anchor,cannon,eye patch,hook hand,walking the plank,ship’s wheel,skull and crossbones,spyglass,treasure island;' +
    'Things that fly:hot air balloon,paper airplane,parachute,blimp,hang glider,jetpack,flying carpet,seaplane,biplane,glider,paper lantern,dragonfly;' +
    'In the garden:garden gnome,birdhouse,greenhouse,flower pot,bird bath,lawn mower,picket fence,hose,sprinkler,compost bin,vegetable patch,trellis;' +
    'In the bathroom:toothbrush,bathtub,shower,toilet,hair dryer,bubble bath,toilet paper,shower cap,bath mat,razor,bathroom scale,soap dispenser;' +
    'Actions:juggling,skydiving,sneezing,yawning,fishing,sunbathing,sleepwalking,ice skating,rock climbing,bungee jumping,snoring,tightrope walking,hula hooping,blowing bubbles;' +
    'Famous places:Eiffel Tower,Statue of Liberty,pyramids,Leaning Tower of Pisa,Big Ben,Mount Rushmore,Stonehenge,Golden Gate Bridge,Great Wall,Sydney Opera House,Hollywood sign,Niagara Falls';
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
      this.phase = 'pick';
      this.chooser = (this.round - 1) % this.N;
      this.roll = null;
      this.pickEnds = this.now() + RULES.pickMs;
      this.cards = this.players.map(() => {
        const c = dealCard(this.mode, this.used, this.rng);
        if (this.mode === 'words') c.forEach((it) => this.used.add(norm(it.word)));
        return c;
      });
      this.boards = null;
    }
    pickRow(n, auto) {
      this.roll = n;
      this.phase = 'card';
      this.secret = this.players.map((_, s) => (this.mode === 'words' ? this.cards[s][this.roll - 1].word : null));
      this.ready = this.players.map(() => false);
      this.cardEnds = this.now() + RULES.cardMs[this.mode];
      this.log('Night ' + this.round + ': ' + (auto ? 'order ' + n + ' was picked for ' + this.players[this.chooser].name : this.players[this.chooser].name + ' picked order ' + n) + '.');
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
      if (this.phase === 'pick' && t >= this.pickEnds) { this.pickRow(1 + rand(RULES.cardSize, this.rng), true); return true; }
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
      if (auto) this.log(this.players[s].name + ' was given an order automatically.');
    }

    /* ------------------------------------------------------------ actions */
    act(seat, a) {
      a = a || {};
      if (!(seat >= 0 && seat < this.N)) return { ok: false, error: 'You’re not at this table.' };
      const t = this.now();
      switch (a.t) {
        case 'pick': {
          if (this.phase !== 'pick') return { ok: false, error: 'The order number has already been picked.' };
          if (seat !== this.chooser) return { ok: false, error: this.players[this.chooser].name + ' picks the order number tonight.' };
          const n = a.n | 0;
          if (n < 1 || n > RULES.cardSize) return { ok: false, error: 'Pick a number from 1 to ' + RULES.cardSize + '.' };
          this.pickRow(n);
          return { ok: true };
        }
        case 'ready': {
          if (this.phase !== 'card') return { ok: false, error: 'The shift has already started.' };
          if (this.mode === 'categories') {
            const w = clean(a.word, RULES.maxWord);
            if (!w) return { ok: false, error: 'Write what the customer gets first.' };
            if (!/[a-z0-9]/i.test(w)) return { ok: false, error: 'Use letters for the order.' };
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
          if (this.phase !== 'draw' || (a.leg | 0) !== this.leg) return { ok: false, error: 'That shift is over.', quiet: true };
          if (t < this.drawStart - 400 || t > this.drawEnd + RULES.graceMs) return { ok: false, error: 'That shift is over.', quiet: true };
          const p = validStroke(a.p);
          if (!p) return { ok: false, error: 'That stroke didn’t come through.', quiet: true };
          const leg = this.boardHeldBy(seat, this.leg).legs[this.leg];
          if (leg.seat !== seat) return { ok: false, error: 'That’s not your cake.', quiet: true };
          if (leg.strokes.length >= RULES.maxStrokesPerPass || leg.nums + p.length > RULES.maxNumsPerPass) return { ok: false, error: 'That cake is full for this shift.', quiet: true };
          leg.strokes.push(p); leg.nums += p.length;
          return { ok: true, quiet: true };
        }
        case 'answer': {
          if (this.phase !== 'guess') return { ok: false, error: 'There’s nothing to guess right now.' };
          if (seat === this.curBoard().starter) return { ok: false, error: 'It’s your order, so you stay quiet on this one.' };
          const text = clean(a.text, RULES.maxAnswer);
          if (!text) return { ok: false, error: 'Type the counter’s guess first.' };
          this.answer = { text, by: seat };
          this.agrees = [seat];
          if (this.agrees.length >= this.need()) this.lockIn();
          return { ok: true };
        }
        case 'agree': {
          if (this.phase !== 'guess' || !this.answer) return { ok: false, error: 'There’s no guess on the table yet.' };
          if (seat === this.curBoard().starter) return { ok: false, error: 'It’s your order, so you stay quiet on this one.' };
          if (a.text != null && clean(a.text, RULES.maxAnswer) !== this.answer.text) return { ok: false, error: 'Someone just changed the answer. Have a look at the new one.' };
          const i = this.agrees.indexOf(seat);
          if (i >= 0) this.agrees.splice(i, 1); else this.agrees.push(seat);
          if (this.agrees.length >= this.need()) this.lockIn();
          return { ok: true };
        }
        case 'judge': {
          if (this.phase !== 'reveal') return { ok: false, error: 'Nothing to judge right now.' };
          if (seat !== this.curBoard().starter) return { ok: false, error: 'Only the player who took this order can overrule.' };
          this.verdict = !!a.ok; this.judged = true;
          return { ok: true };
        }
        case 'next': {
          if (this.phase !== 'reveal') return { ok: false, error: 'Not yet.' };
          if (t - this.revealAt < RULES.revealMinMs) return { ok: false, error: 'Give everyone a second to see the cake.' };
          this.advance();
          return { ok: true };
        }
        case 'again': {
          if (this.phase !== 'end') return { ok: false, error: 'The bakery isn’t closed yet.' };
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
      if (this.phase === 'pick') {
        v.chooser = this.chooser;
        v.msLeft = Math.max(0, this.pickEnds - t);
      } else if (this.phase === 'card') {
        v.chooser = this.chooser;
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
  else root.KneadToKnow = api;
})(typeof window !== 'undefined' ? window : globalThis);
