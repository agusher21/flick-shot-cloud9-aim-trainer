/* ============================================================
   Flick Shot — Cloud9 Aim Trainer
   Plain vanilla JS. No dependencies, no network calls.
   All state lives here; the game fully resets between players.
   ============================================================ */
'use strict';

/* ---------------- Config ---------------- */
var GAME_DURATION_MS = 60 * 1000;      // 60-second session
var STORAGE_KEY = 'c9-flickshot-leaderboard-v1';
var MAX_BOARD = 10;

/* Rank ladder (original titles, thresholds by score) */
var RANKS = [
  { min: 8000, title: 'Cloud9 Legend' },
  { min: 5000, title: 'Flick Master' },
  { min: 3000, title: 'Deadeye' },
  { min: 1500, title: 'Sharp' },
  { min: 0,    title: 'Rookie' }
];

/* Target tuning */
var SPAWN_INTERVAL_START = 520;   // ms between spawns at t=0
var SPAWN_INTERVAL_END   = 340;   // ms between spawns near the end
var TARGET_LIFE_MS       = 1250;  // how long a target stays before vanishing
var GOLDEN_CHANCE        = 0.08;  // 8% of spawns are golden (3x points)
var MOVE_CHANCE          = 0.22;  // 22% drift across the field
var SHRINK_CHANCE        = 0.22;  // 22% shrink over their lifetime

/* ---------------- DOM refs ---------------- */
var $ = function (id) { return document.getElementById(id); };
var app          = $('app');
var field        = $('field');
var screenStart  = $('screen-start');
var screenGame   = $('screen-game');
var screenEnd    = $('screen-end');
var nameInput    = $('player-name');
var btnPlay      = $('btn-play');
var btnAgain     = $('btn-again');
var btnSound     = $('btn-sound');
var hudTime      = $('hud-time');
var hudScore     = $('hud-score');
var hudCombo     = $('hud-combo');
var hudHits      = $('hud-hits');
var hudMisses    = $('hud-misses');
var hudTimeBox   = document.querySelector('.hud-time');
var countdownEl  = $('countdown');
var boardStart   = $('board-start');
var boardEnd     = $('board-end');
var boardStartEmpty = $('board-start-empty');
var boardEndEmpty   = $('board-end-empty');

/* ---------------- State ---------------- */
var state = {
  session: 0,          // incremented every game; stale timers check it
  running: false,      // true from PLAY until the round ends (covers countdown)
  roundActive: false,  // true only while the 60s clock is actually running
  playerName: 'Player',
  score: 0,
  hits: 0,
  misses: 0,
  combo: 0,            // current consecutive-hit streak
  bestCombo: 0,
  reactionTimes: [],   // ms per hit
  endTime: 0,
  rafId: 0,
  spawnTimerId: 0,
  soundOn: true
};

/* In-memory fallback if localStorage is unavailable (private mode etc.) */
var memoryBoard = [];

/* ---------------- Audio (WebAudio synth, no files) ---------------- */
var audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

/* Short oscillator blip. `when` is a delay in seconds from now. */
function beep(freq, dur, type, vol, when) {
  if (!state.soundOn || !audioCtx) return;
  try {
    var t = audioCtx.currentTime + (when || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (e) { /* audio is cosmetic; never break the game */ }
}

function sfxHit(combo) {
  /* Pitch climbs with the combo — satisfying streak feedback */
  var base = 520 + Math.min(combo, 20) * 22;
  beep(base, 0.09, 'square', 0.08);
  beep(base * 1.5, 0.07, 'sine', 0.06, 0.03);
}
function sfxGolden() {
  beep(660, 0.1, 'triangle', 0.14);
  beep(880, 0.1, 'triangle', 0.14, 0.07);
  beep(1320, 0.16, 'triangle', 0.14, 0.14);
}
function sfxMiss() { beep(160, 0.14, 'sawtooth', 0.07); }
function sfxCount(final) {
  beep(final ? 880 : 440, final ? 0.22 : 0.12, 'sine', 0.12);
}
function sfxEnd() {
  beep(523, 0.14, 'triangle', 0.13);
  beep(659, 0.14, 'triangle', 0.13, 0.12);
  beep(784, 0.24, 'triangle', 0.13, 0.24);
}

/* ---------------- Screens ---------------- */
function showScreen(which) {
  screenStart.classList.toggle('active', which === 'start');
  screenGame.classList.toggle('active', which === 'game');
  screenEnd.classList.toggle('active', which === 'end');
}

/* ---------------- Leaderboard (localStorage, top 10) ---------------- */
function loadBoard() {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryBoard.slice();
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return memoryBoard.slice();
  }
}

function saveBoard(board) {
  memoryBoard = board.slice();
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board)); } catch (e) { /* offline-safe */ }
}

function recordScore(entry) {
  var board = loadBoard();
  board.push(entry);
  board.sort(function (a, b) { return b.score - a.score; });
  board = board.slice(0, MAX_BOARD);
  saveBoard(board);
  return board;
}

function renderBoard(listEl, emptyEl, highlightEntry) {
  var board = loadBoard();
  listEl.innerHTML = '';
  emptyEl.style.display = board.length ? 'none' : 'block';
  board.forEach(function (entry, i) {
    var li = document.createElement('li');
    if (highlightEntry && entry.name === highlightEntry.name &&
        entry.score === highlightEntry.score && entry.date === highlightEntry.date) {
      li.className = 'me';
    }
    var rank = document.createElement('span');
    rank.className = 'b-rank';
    rank.textContent = (i + 1) + '.';
    var name = document.createElement('span');
    name.className = 'b-name';
    name.textContent = entry.name;   /* textContent: names can never inject HTML */
    var score = document.createElement('span');
    score.className = 'b-score';
    score.textContent = entry.score.toLocaleString('en-US');
    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(score);
    listEl.appendChild(li);
  });
}

/* ---------------- Helpers ---------------- */
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pickRank(score) {
  for (var i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].min) return RANKS[i].title;
  }
  return 'Rookie';
}
function comboMultiplier() {
  /* +10% per consecutive hit, capped at x3.0 */
  return 1 + Math.min(state.combo, 20) * 0.1;
}

function updateHUD() {
  hudScore.textContent = state.score.toLocaleString('en-US');
  hudCombo.textContent = 'x' + comboMultiplier().toFixed(1);
  hudHits.textContent = state.hits;
  hudMisses.textContent = state.misses;
}

function clearField() {
  /* Remove every target, particle and popup — the clean booth reset */
  var nodes = field.querySelectorAll('.target, .particle, .score-pop, .miss-pop');
  for (var i = 0; i < nodes.length; i++) nodes[i].remove();
}

function stopTimers() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  if (state.spawnTimerId) clearTimeout(state.spawnTimerId);
  state.rafId = 0;
  state.spawnTimerId = 0;
}

function resetState() {
  stopTimers();
  clearField();
  state.running = false;
  state.roundActive = false;
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.reactionTimes = [];
  state.endTime = 0;
  hudTimeBox.classList.remove('low');
  hudTime.textContent = (GAME_DURATION_MS / 1000).toFixed(1);
  updateHUD();
}

/* ---------------- Juice: particles, popups, shake ---------------- */
function spawnBurst(x, y, golden) {
  var colors = golden
    ? ['#ffc93c', '#fff3b0', '#ffdf6b', '#ffffff']
    : ['#7db4ff', '#0b5cff', '#ffffff', '#aee3ff'];
  for (var i = 0; i < 10; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var angle = rand(0, Math.PI * 2);
    var dist = rand(24, 64);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--px', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--py', Math.sin(angle) * dist + 'px');
    field.appendChild(p);
    /* Self-cleaning so sustained booth play never leaks nodes */
    setTimeout(function (el) { return function () { el.remove(); }; }(p), 600);
  }
}

function spawnPopup(x, y, text, golden) {
  var pop = document.createElement('div');
  pop.className = 'score-pop' + (golden ? ' gold' : '');
  pop.style.left = x + 'px';
  pop.style.top = y + 'px';
  pop.textContent = text;
  field.appendChild(pop);
  setTimeout(function () { pop.remove(); }, 850);
}

function spawnMissPopup(x, y) {
  var pop = document.createElement('div');
  pop.className = 'miss-pop';
  pop.style.left = x + 'px';
  pop.style.top = y + 'px';
  pop.textContent = 'MISS';
  field.appendChild(pop);
  setTimeout(function () { pop.remove(); }, 650);
}

function shakeScreen() {
  app.classList.remove('shake');
  /* Force reflow so the animation restarts on rapid golden hits */
  void app.offsetWidth;
  app.classList.add('shake');
}

/* ---------------- Background birds (random fly-bys) ---------------- */
var birdsLayer = $('birds');
function spawnBird() {
  if (!birdsLayer) return;
  var b = document.createElement('div');
  /* 35% fly right-to-left, the rest left-to-right — random every time */
  b.className = 'bird' + (Math.random() < 0.35 ? ' rtl' : '');
  b.style.setProperty('--top', randInt(4, 55) + '%');      // random height
  b.style.setProperty('--dur', rand(9, 18).toFixed(1) + 's'); // random speed
  b.style.setProperty('--scale', rand(0.7, 1.4).toFixed(2));  // random size
  b.innerHTML = '<svg viewBox="0 0 40 20" aria-hidden="true">' +
    '<path class="wing left" d="M20 11 Q12 2 3 9" fill="none" stroke="#0a2540" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path class="wing right" d="M20 11 Q28 2 37 9" fill="none" stroke="#0a2540" stroke-width="2.6" stroke-linecap="round"/>' +
    '</svg>';
  birdsLayer.appendChild(b);
  /* Self-cleaning: longest flight is 18s, 20s is safely past the edge */
  setTimeout(function () { b.remove(); }, 20000);
}
function scheduleBird() {
  spawnBird();
  /* Next bird after a random 2.5–9s gap, forever — all screens */
  setTimeout(scheduleBird, randInt(2500, 9000));
}

/* ---------------- Targets ---------------- */
function spawnTarget(session) {
  if (!state.running || session !== state.session) return;

  var rect = field.getBoundingClientRect();
  var roll = Math.random();
  var golden = roll < GOLDEN_CHANCE;

  /* Size: small targets are worth more (risk/reward) */
  var size;
  var kind;
  if (golden) { size = randInt(52, 66); kind = 'golden'; }
  else if (Math.random() < 0.3) { size = randInt(34, 46); kind = 'small'; }
  else { size = randInt(58, 88); kind = 'normal'; }

  var x = rand(6, Math.max(7, rect.width - size - 6));
  var y = rand(6, Math.max(7, rect.height - size - 6));

  var el = document.createElement('div');
  el.className = 'target' + (kind === 'small' ? ' small' : '') + (golden ? ' golden' : '');
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';

  var bornAt = performance.now();
  var life = TARGET_LIFE_MS * (golden ? 0.85 : 1);

  if (Math.random() < MOVE_CHANCE) {
    el.classList.add('moving');
    el.style.setProperty('--dx', randInt(14, 42) * (Math.random() < 0.5 ? -1 : 1) + 'px');
    el.style.setProperty('--dy', randInt(10, 30) * (Math.random() < 0.5 ? -1 : 1) + 'px');
  }
  if (Math.random() < SHRINK_CHANCE) {
    el.classList.add('shrinking');
    el.style.setProperty('--life', (life / 1000).toFixed(2) + 's');
  }

  el.addEventListener('pointerdown', function (ev) {
    ev.stopPropagation();   /* a target click must not count as a field miss */
    if (!state.running || session !== state.session) return;
    hitTarget(el, ev, bornAt, golden, size);
  });

  field.appendChild(el);

  /* Expire quietly — an expired target is not a miss, it just vanishes */
  setTimeout(function () {
    if (el.parentNode) el.remove();
  }, life);

  scheduleNextSpawn(session);
}

function scheduleNextSpawn(session) {
  if (!state.running || session !== state.session) return;
  var elapsed = performance.now() - (state.endTime - GAME_DURATION_MS);
  var progress = Math.min(1, Math.max(0, elapsed / GAME_DURATION_MS));
  var interval = SPAWN_INTERVAL_START + (SPAWN_INTERVAL_END - SPAWN_INTERVAL_START) * progress;
  state.spawnTimerId = setTimeout(function () { spawnTarget(session); }, interval * rand(0.8, 1.2));
}

/* ---------------- Hit / miss ---------------- */
function hitTarget(el, ev, bornAt, golden, size) {
  el.remove();

  var reaction = Math.round(performance.now() - bornAt);
  state.reactionTimes.push(reaction);
  state.hits++;
  state.combo++;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;

  /* Base points: small targets pay more; golden pays 3x; combo multiplies */
  var base = golden ? 300 : (size <= 46 ? 150 : (size <= 66 ? 100 : 60));
  var points = Math.round(base * comboMultiplier());
  state.score += points;

  var rect = field.getBoundingClientRect();
  var cx = ev.clientX - rect.left;
  var cy = ev.clientY - rect.top;
  spawnBurst(cx, cy, golden);
  spawnPopup(cx, cy, '+' + points, golden);
  if (golden) { sfxGolden(); shakeScreen(); }
  else { sfxHit(state.combo); }

  updateHUD();
}

function onFieldMiss(ev) {
  if (!state.roundActive) return;
  if (ev.button !== undefined && ev.button !== 0) return; /* left click only */
  /* Only clicks that land on the field background itself count as a miss */
  if (ev.target !== field) return;
  state.misses++;
  state.combo = 0;   /* a miss resets the combo — the core risk mechanic */
  sfxMiss();
  var rect = field.getBoundingClientRect();
  spawnMissPopup(ev.clientX - rect.left, ev.clientY - rect.top);
  updateHUD();
}

/* ---------------- Timer loop ---------------- */
function tick(now) {
  if (!state.running) return;
  var remaining = Math.max(0, state.endTime - now);
  hudTime.textContent = (remaining / 1000).toFixed(1);
  hudTimeBox.classList.toggle('low', remaining <= 10000);
  if (remaining <= 0) { endGame(); return; }
  state.rafId = requestAnimationFrame(tick);
}

/* ---------------- Game flow ---------------- */
function startGame() {
  ensureAudio();
  resetState();
  state.session++;                 /* invalidates any stale spawn timeouts */
  var session = state.session;

  var rawName = nameInput.value.trim();
  state.playerName = rawName ? rawName.slice(0, 16) : 'Player';

  showScreen('game');
  state.running = true;
  /* NOTE: endTime is set only when the GO! countdown finishes, so the
     3-second countdown does not eat into the 60-second round. */

  /* 3-2-1-GO countdown, then the clock and spawns begin */
  var steps = ['3', '2', '1', 'GO!'];
  steps.forEach(function (label, i) {
    setTimeout(function () {
      if (session !== state.session || !state.running) return;
      countdownEl.hidden = false;
      countdownEl.textContent = label;
      /* Restart the zoom animation each step */
      countdownEl.style.animation = 'none';
      void countdownEl.offsetWidth;
      countdownEl.style.animation = '';
      sfxCount(label === 'GO!');
      if (label === 'GO!') {
        /* GO! lingers a couple of seconds, then disappears for good */
        setTimeout(function () {
          if (session === state.session) countdownEl.hidden = true;
        }, 2000);
      }
    }, i * 750);
  });

  setTimeout(function () {
    if (session !== state.session || !state.running) return;
    state.endTime = performance.now() + GAME_DURATION_MS;
    state.roundActive = true;
    state.rafId = requestAnimationFrame(tick);
    scheduleNextSpawn(session);
  }, steps.length * 750);
}

function endGame() {
  if (!state.running) return;
  state.running = false;
  state.roundActive = false;
  stopTimers();
  clearField();
  sfxEnd();

  var total = state.hits + state.misses;
  var accuracy = total > 0 ? Math.round((state.hits / total) * 100) : 0;
  var avgReaction = state.reactionTimes.length
    ? Math.round(state.reactionTimes.reduce(function (a, b) { return a + b; }, 0) / state.reactionTimes.length)
    : null;

  var entry = {
    name: state.playerName,
    score: state.score,
    hits: state.hits,
    accuracy: accuracy,
    date: new Date().toISOString()
  };
  recordScore(entry);

  $('end-rank').textContent = pickRank(state.score);
  $('end-score').textContent = state.score.toLocaleString('en-US');
  $('end-hits').textContent = state.hits;
  $('end-misses').textContent = state.misses;
  $('end-accuracy').textContent = accuracy + '%';
  $('end-reaction').textContent = avgReaction === null ? '—' : avgReaction + ' ms';
  $('end-best-combo').textContent = state.bestCombo;
  var best = loadBoard()[0];
  $('end-best-score').textContent = best ? best.score.toLocaleString('en-US') : '0';

  renderBoard(boardEnd, boardEndEmpty, entry);
  renderBoard(boardStart, boardStartEmpty, null);
  showScreen('end');
}

function backToStart() {
  resetState();
  nameInput.value = '';
  renderBoard(boardStart, boardStartEmpty, null);
  showScreen('start');
  nameInput.focus();
}

/* ---------------- Wiring ---------------- */
btnPlay.addEventListener('click', startGame);
btnAgain.addEventListener('click', backToStart);
field.addEventListener('pointerdown', onFieldMiss);

nameInput.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter') startGame();
});

btnSound.addEventListener('click', function () {
  state.soundOn = !state.soundOn;
  btnSound.textContent = state.soundOn ? '🔊' : '🔇';
  if (state.soundOn) { ensureAudio(); beep(660, 0.08, 'sine', 0.1); }
});

/* Keep the field safe if the window resizes mid-game: targets that end up
   outside the field are simply left to expire on their own timer. */
window.addEventListener('resize', function () { /* no-op by design */ });

/* ---------------- Init ---------------- */
renderBoard(boardStart, boardStartEmpty, null);
updateHUD();
setTimeout(scheduleBird, 1200);  /* first bird ~1.2s after load, then random */
