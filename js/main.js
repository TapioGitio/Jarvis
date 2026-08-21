import { CHAMPIONS, getChampion } from './characters.js';
import { MAPS, getMap } from './maps.js';
import { Game } from './game.js';

// ---------------- Screen management ----------------
const screens = {
  menu: document.getElementById('main-menu'),
  char: document.getElementById('char-select'),
  map: document.getElementById('map-select'),
  howto: document.getElementById('howto'),
  game: document.getElementById('game-screen'),
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ---------------- State ----------------
let selectedChampion = null;
let selectedMap = null;
let game = null;

// ---------------- Character select ----------------
const charGrid = document.getElementById('char-grid');
const btnToMaps = document.getElementById('btn-to-maps');

function resourceLabel(champ) {
  return champ.resource.charAt(0).toUpperCase() + champ.resource.slice(1);
}

function renderCharGrid() {
  while (charGrid.firstChild) {
    charGrid.removeChild(charGrid.firstChild);
  }

  CHAMPIONS.forEach(champ => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.dataset.id = champ.id;

    // Portrait
    const portrait = document.createElement('div');
    portrait.className = 'char-portrait';
    portrait.style.background = `radial-gradient(circle at 35% 30%, ${champ.color}cc, #14100c)`;
    portrait.style.color = '#fff';
    portrait.textContent = champ.icon;

    // Name
    const name = document.createElement('div');
    name.className = 'char-card-name';
    name.textContent = champ.name.split(' ')[0];

    // Class
    const classEl = document.createElement('div');
    classEl.className = 'char-card-class';
    classEl.textContent = champ.className;

    card.append(portrait, name, classEl);
    card.addEventListener('click', () => selectChampion(champ));
    charGrid.appendChild(card);
  });
}

function selectChampion(champ) {
  selectedChampion = champ;

  // Highlight selected card
  [...charGrid.children].forEach(c => {
    c.classList.toggle('selected', c.dataset.id === champ.id);
  });

  // Simple text fields (already safe, but kept for completeness)
  document.getElementById('preview-name').textContent = champ.name;
  document.getElementById('preview-class').textContent = champ.className;
  document.getElementById('preview-desc').textContent = champ.desc;

  // Portrait background via CSSOM
  document.getElementById('preview-portrait').style.background =
    `radial-gradient(circle at 35% 30%, ${champ.color}cc, #14100c)`;

  // Stats – build with DOM instead of innerHTML
  const statsEl = document.getElementById('preview-stats');
  while (statsEl.firstChild) statsEl.removeChild(statsEl.firstChild);

  const makeStat = (label, value) => {
    const span = document.createElement('span');
    span.append(label + ' ');
    const b = document.createElement('b');
    b.textContent = value;
    span.append(b);
    return span;
  };

  statsEl.append(
    makeStat('Health', champ.health),
    makeStat('Speed', champ.speed),
    makeStat('Resource', resourceLabel(champ))
  );

  // Abilities – build with DOM
  const abilitiesEl = document.getElementById('preview-abilities');
  while (abilitiesEl.firstChild) abilitiesEl.removeChild(abilitiesEl.firstChild);

  champ.abilities.forEach(a => {
    const detail = document.createElement('div');
    detail.className = 'ability-detail';

    const head = document.createElement('div');
    head.className = 'ability-detail-head';

    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = a.key;

    const icon = document.createElement('span');
    icon.className = 'ad-icon';
    icon.textContent = a.icon;

    const name = document.createElement('span');
    name.className = 'ad-name';
    name.textContent = a.name;

    const meta = document.createElement('span');
    meta.className = 'ad-meta';
    meta.textContent = a.cost
      ? `${a.cost} ${resourceLabel(champ)} · ${a.cooldown}s CD`
      : `No cost · ${a.cooldown}s CD`;

    head.append(key, icon, name, meta);

    const desc = document.createElement('p');
    desc.className = 'ad-desc';
    desc.textContent = a.desc;

    detail.append(head, desc);
    abilitiesEl.appendChild(detail);
  });

  btnToMaps.disabled = false;
}

// ---------------- Map select ----------------
const mapGrid = document.getElementById('map-grid');
const btnStartFight = document.getElementById('btn-start-fight');

function renderMapGrid() {
  while (mapGrid.firstChild) {
    mapGrid.removeChild(mapGrid.firstChild);
  }

  MAPS.forEach(map => {
    const card = document.createElement('div');
    card.className = 'map-card';
    card.dataset.id = map.id;

    const thumb = document.createElement('div');
    thumb.className = 'map-thumb';
    thumb.style.background = map.thumbGradient;

    const name = document.createElement('div');
    name.className = 'map-card-name';
    name.textContent = map.name;

    card.append(thumb, name);
    card.addEventListener('click', () => selectMap(map));
    mapGrid.appendChild(card);
  });
}

function selectMap(map) {
  selectedMap = map;

  [...mapGrid.children].forEach(c => {
    c.classList.toggle('selected', c.dataset.id === map.id);
  });

  document.getElementById('map-name').textContent = map.name;
  document.getElementById('map-desc').textContent = map.desc;

  // Features
  const featuresEl = document.getElementById('map-features');
  while (featuresEl.firstChild) featuresEl.removeChild(featuresEl.firstChild);

  map.features.forEach(f => {
    const span = document.createElement('span');
    span.textContent = f;
    featuresEl.appendChild(span);
  });

  btnStartFight.disabled = false;
}

// ---------------- Navigation wiring ----------------
document.getElementById('btn-play').addEventListener('click', () => showScreen('char'));
document.getElementById('btn-howto').addEventListener('click', () => showScreen('howto'));
document.getElementById('btn-howto-back').addEventListener('click', () => showScreen('menu'));
document.getElementById('btn-back-menu').addEventListener('click', () => showScreen('menu'));
document.getElementById('btn-to-maps').addEventListener('click', () => showScreen('map'));
document.getElementById('btn-back-char').addEventListener('click', () => showScreen('char'));
document.getElementById('btn-start-fight').addEventListener('click', () => startMatch());
document.getElementById('btn-exit-arena').addEventListener('click', () => {
  if (game) game.stop();
  document.getElementById('result-overlay').classList.add('hidden');
  showScreen('menu');
});

// ---------------- HUD elements ----------------
const allyHealth = document.getElementById('ally-health');
const allyResource = document.getElementById('ally-resource');
const enemyHealth = document.getElementById('enemy-health');
const enemyResource = document.getElementById('enemy-resource');
const allyName = document.getElementById('ally-name');
const enemyName = document.getElementById('enemy-name');
const allyPortrait = document.getElementById('ally-portrait');
const enemyPortrait = document.getElementById('enemy-portrait');
const roundText = document.getElementById('round-text');
const scoreText = document.getElementById('score-text');
const abilityBar = document.getElementById('ability-bar');
const combatLog = document.getElementById('combat-log');
const countdownEl = document.getElementById('countdown');
const resultOverlay = document.getElementById('result-overlay');
const resultTitle = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const btnNextRound = document.getElementById('btn-next-round');

let fctLayer = document.querySelector('.fct-layer');
if (!fctLayer) {
  fctLayer = document.createElement('div');
  fctLayer.className = 'fct-layer';
  screens.game.appendChild(fctLayer);
}

let abilityTooltip = document.querySelector('.ability-tooltip');
if (!abilityTooltip) {
  abilityTooltip = document.createElement('div');
  abilityTooltip.className = 'ability-tooltip hidden';
  screens.game.appendChild(abilityTooltip);
}

function showAbilityTooltip(slotEl, a, champ) {
  // Clear previous content
  while (abilityTooltip.firstChild) {
    abilityTooltip.removeChild(abilityTooltip.firstChild);
  }

  const head = document.createElement('div');
  head.className = 'at-head';

  const name = document.createElement('span');
  name.className = 'at-name';
  name.textContent = a.name;

  const meta = document.createElement('span');
  meta.className = 'at-meta';
  meta.textContent = a.cost
    ? `${a.cost} ${resourceLabel(champ)} · ${a.cooldown}s CD`
    : `No cost · ${a.cooldown}s CD`;

  head.append(name, meta);

  const desc = document.createElement('p');
  desc.className = 'at-desc';
  desc.textContent = a.desc;

  abilityTooltip.append(head, desc);
  abilityTooltip.classList.remove('hidden');

  // Positioning (unchanged)
  const rect = slotEl.getBoundingClientRect();
  const gameRect = screens.game.getBoundingClientRect();
  abilityTooltip.style.left = `${rect.left - gameRect.left + rect.width / 2}px`;
  abilityTooltip.style.top = `${rect.top - gameRect.top}px`;
}
function hideAbilityTooltip() { abilityTooltip.classList.add('hidden'); }

function buildAbilityBar(champ) {
  while (abilityBar.firstChild) {
    abilityBar.removeChild(abilityBar.firstChild);
  }

  champ.abilities.forEach((a, i) => {
    const slot = document.createElement('div');
    slot.className = 'ability-slot';
    slot.dataset.index = i;

    const key = document.createElement('span');
    key.className = 'slot-key';
    key.textContent = a.key;

    const icon = document.createElement('span');
    icon.textContent = a.icon;

    const cost = document.createElement('span');
    cost.className = 'slot-cost';
    cost.textContent = a.cost || '';

    const veil = document.createElement('div');
    veil.className = 'cooldown-veil hidden';

    slot.append(key, icon, cost, veil);

    slot.addEventListener('click', () => {
      if (game) game.tryPlayerAbility(i);
    });
    slot.addEventListener('mouseenter', () => showAbilityTooltip(slot, a, champ));
    slot.addEventListener('mouseleave', hideAbilityTooltip);

    abilityBar.appendChild(slot);
  });
}

function updateAbilityBar(player) {
  const slots = abilityBar.children;
  player.champion.abilities.forEach((a, i) => {
    const slot = slots[i];
    if (!slot) return;
    const cd = player.cooldowns[a.id];
    const veil = slot.querySelector('.cooldown-veil');
    const affordable = player.resource >= a.cost;
    if (cd > 0) {
      veil.classList.remove('hidden');
      veil.textContent = cd.toFixed(1);
      slot.classList.add('disabled');
    } else if (!affordable) {
      veil.classList.add('hidden');
      slot.classList.add('disabled');
    } else {
      veil.classList.add('hidden');
      slot.classList.remove('disabled');
    }
  });
}

function logToCombatLog(text, cls) {
  const entry = document.createElement('div');
  entry.className = 'log-entry' + (cls ? ' ' + cls : '');
  entry.textContent = text;
  combatLog.appendChild(entry);
  while (combatLog.children.length > 5) combatLog.removeChild(combatLog.firstChild);
}

function spawnFCT(x, y, text, color, big) {
  const el = document.createElement('div');
  el.className = 'fct';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = color;
  el.style.fontSize = big ? '1.5rem' : '1.05rem';
  fctLayer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------------- Keyboard input ----------------
window.addEventListener('keydown', (e) => {
  if (!game) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    game.keys.add(k);
    e.preventDefault();
  }
  if (k === '1' || k === '2' || k === '3' || k === '4') game.tryPlayerAbility(Number(k) - 1);
  if (k === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (!game) return;
  const k = e.key.toLowerCase();
  game.keys.delete(k);
});
window.addEventListener('resize', () => { if (game) game.resize(); });

// ---------------- Match flow ----------------
function startMatch() {
  showScreen('game');
  buildAbilityBar(selectedChampion);
  allyName.textContent = selectedChampion.name.split(' ')[0];
  allyPortrait.style.background = `radial-gradient(circle at 35% 30%, ${selectedChampion.color}cc, #14100c)`;
  combatLog.innerHTML = '';
  resultOverlay.classList.add('hidden');

  const canvas = document.getElementById('game-canvas');

  game = new Game(canvas, selectedChampion, selectedMap, {
    onEntitiesReady(player, enemy, g) {
      enemyName.textContent = enemy.name.split(' ')[0];
      enemyPortrait.style.background = `radial-gradient(circle at 35% 30%, ${enemy.champion.color}cc, #14100c)`;
      allyResource.style.background = player.champion.resourceColor;
      enemyResource.style.background = enemy.champion.resourceColor;
      roundText.textContent = `Round ${g.round}`;
      scoreText.textContent = `${g.playerWins} — ${g.enemyWins}`;
      updateHUD(player, enemy);
    },
    onCountdown(val) {
      countdownEl.classList.remove('hidden');
      countdownEl.classList.remove('pulse');
      void countdownEl.offsetWidth;
      countdownEl.classList.add('pulse');
      countdownEl.textContent = val;
      countdownEl.style.color = val === 'FIGHT' ? 'var(--c-crimson-bright)' : 'var(--c-gold)';
      if (val === 'FIGHT') {
        setTimeout(() => countdownEl.classList.add('hidden'), 600);
      }
    },
    onHUD(player, enemy) { updateHUD(player, enemy); },
    onAbilityUsed() {},
    onLog(text, cls) { logToCombatLog(text, cls); },
    onFCT(x, y, text, color, big) { spawnFCT(x, y, text, color, big); },
    onRoundEnd(info) { handleRoundEnd(info); },
  });
  game.start();
}

function updateHUD(player, enemy) {
  allyHealth.style.width = `${Math.max(0, player.health / player.maxHealth * 100)}%`;
  allyResource.style.width = `${player.resource / player.maxResource * 100}%`;
  enemyHealth.style.width = `${Math.max(0, enemy.health / enemy.maxHealth * 100)}%`;
  enemyResource.style.width = `${enemy.resource / enemy.maxResource * 100}%`;
  updateAbilityBar(player);
}

function handleRoundEnd(info) {
  scoreText.textContent = `${info.playerWins} — ${info.enemyWins}`;
  const won = info.winner === 'player';
  if (info.matchOver) {
    resultTitle.textContent = won ? 'Victory!' : 'Defeat';
    resultSubtitle.textContent = won
      ? `You won the match ${info.playerWins} — ${info.enemyWins}`
      : `You lost the match ${info.playerWins} — ${info.enemyWins}`;
    btnNextRound.textContent = 'Rematch';
    btnNextRound.onclick = () => {
      resultOverlay.classList.add('hidden');
      game.playerWins = 0; game.enemyWins = 0; game.round = 1;
      game.nextRound();
      roundText.textContent = `Round ${game.round}`;
    };
  } else {
    resultTitle.textContent = won ? 'Round Won!' : 'Round Lost';
    resultSubtitle.textContent = `Score: ${info.playerWins} — ${info.enemyWins}`;
    btnNextRound.textContent = 'Next Round';
    btnNextRound.onclick = () => {
      resultOverlay.classList.add('hidden');
      game.nextRound();
      roundText.textContent = `Round ${game.round}`;
    };
  }
  resultOverlay.classList.remove('hidden');
}

// ---------------- Init ----------------
renderCharGrid();
renderMapGrid();