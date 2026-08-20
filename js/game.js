import { ARENA_W, ARENA_H } from './maps.js';
import { getChampion } from './characters.js';

const RING_RADIUS = 260;
const RING_CENTER = { x: 500, y: 300 };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function randRange([lo, hi]) { return lo + Math.random() * (hi - lo); }

// ---------------------------------------------------------------
// Entity: shared logic for both the player and the AI opponent
// ---------------------------------------------------------------
class Entity {
  constructor(champion, x, y, isPlayer) {
    this.champion = champion;
    this.isPlayer = isPlayer;
    this.name = champion.name;
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.maxHealth = champion.health;
    this.health = champion.health;
    this.maxResource = champion.resourceMax;
    this.resource = champion.resourceStart;
    this.speedBase = champion.speed;
    this.alive = true;

    this.cooldowns = {}; // abilityId -> seconds remaining
    champion.abilities.forEach(a => this.cooldowns[a.id] = 0);
    this.autoCooldown = 0;
    this.autoInterval = 1.1;

    // status effects
    this.stunTimer = 0;
    this.fearTimer = 0;
    this.slowTimer = 0;
    this.slowMult = 1;
    this.dmgReductionTimer = 0;
    this.dmgReductionMult = 1;
    this.speedBuffTimer = 0;
    this.speedBuffMult = 1;
    this.shield = 0;
    this.healReductionTimer = 0;
    this.healReductionMult = 1;

    this.vx = 0; this.vy = 0;
    this.flashTimer = 0; // white hit flash
  }

  get resourceType() { return this.champion.resource; }

  isDisabled() { return this.stunTimer > 0 || this.fearTimer > 0; }

  currentSpeed() {
    let s = this.speedBase;
    if (this.slowTimer > 0) s *= this.slowMult;
    if (this.speedBuffTimer > 0) s *= this.speedBuffMult;
    return s;
  }

  applyStun(duration) { this.stunTimer = Math.max(this.stunTimer, duration); }
  applyFear(duration) { this.fearTimer = Math.max(this.fearTimer, duration); }
  applySlow(mult, duration) { this.slowTimer = Math.max(this.slowTimer, duration); this.slowMult = mult; }
  applySpeedBuff(mult, duration) { this.speedBuffTimer = duration; this.speedBuffMult = mult; }
  applyDamageReduction(mult, duration) { this.dmgReductionTimer = duration; this.dmgReductionMult = mult; }
  applyShield(amount) { this.shield += amount; }
  applyHealReduction(mult, duration) { this.healReductionTimer = duration; this.healReductionMult = mult; }

  takeDamage(amount, game, opts = {}) {
    if (!this.alive) return 0;
    let dmg = amount;
    if (this.dmgReductionTimer > 0) dmg *= this.dmgReductionMult;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0) game.spawnFCT(this.x, this.y - 30, `${Math.round(absorbed)} absorbed`, '#7cc4e8');
    }
    dmg = Math.max(0, Math.round(dmg));
    this.health = clamp(this.health - dmg, 0, this.maxHealth);
    this.flashTimer = 0.12;
    if (dmg > 0) game.spawnFCT(this.x, this.y - 24, `-${dmg}`, opts.crit ? '#ffe9ab' : '#ff6b5e', opts.crit);
    if (this.health <= 0) this.alive = false;
    return dmg;
  }

  heal(amount, game) {
    if (!this.alive) return 0;
    let h = amount;
    if (this.healReductionTimer > 0) h *= this.healReductionMult;
    h = Math.round(h);
    const before = this.health;
    this.health = clamp(this.health + h, 0, this.maxHealth);
    const actual = this.health - before;
    if (actual > 0) game.spawnFCT(this.x, this.y - 24, `+${actual}`, '#7be08a');
    return actual;
  }

  gainResource(amount) {
    this.resource = clamp(this.resource + amount, 0, this.maxResource);
  }
  spendResource(amount) {
    this.resource = clamp(this.resource - amount, 0, this.maxResource);
  }

  abilityReady(ability) {
    return this.cooldowns[ability.id] <= 0 && this.resource >= ability.cost && !this.isDisabled();
  }

  updateTimers(dt) {
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.fearTimer = Math.max(0, this.fearTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.dmgReductionTimer = Math.max(0, this.dmgReductionTimer - dt);
    this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);
    this.healReductionTimer = Math.max(0, this.healReductionTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.autoCooldown = Math.max(0, this.autoCooldown - dt);
    for (const id in this.cooldowns) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);

    // resource regen
    if (this.resourceType === 'mana') this.gainResource(this.champion.manaRegen * dt);
    if (this.resourceType === 'energy') this.gainResource(this.champion.energyRegen * dt);
    if (this.resourceType === 'rage') this.resource = clamp(this.resource - 3 * dt, 0, this.maxResource); // rage decays slowly
  }
}

// ---------------------------------------------------------------
// Projectile
// ---------------------------------------------------------------
class Projectile {
  constructor(owner, target, ability, x, y) {
    this.owner = owner;
    this.target = target;
    this.ability = ability;
    this.x = x; this.y = y;
    const ang = Math.atan2(target.y - y, target.x - x);
    this.vx = Math.cos(ang) * ability.projectileSpeed;
    this.vy = Math.sin(ang) * ability.projectileSpeed;
    this.dead = false;
    this.radius = 7;
  }
  update(dt, game) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > ARENA_W + 20 || this.y < -20 || this.y > ARENA_H + 20) {
      this.dead = true; return;
    }
    if (!this.target.alive) { this.dead = true; return; }
    if (dist(this.x, this.y, this.target.x, this.target.y) < this.radius + this.target.radius) {
      const crit = Math.random() < 0.15;
      const dmg = randRange(this.ability.dmg) * (crit ? 1.5 : 1);
      this.target.takeDamage(dmg, game, { crit });
      game.logEvent(`${this.owner.name}'s ${this.ability.name} hits ${this.target.name} for ${Math.round(dmg)}`, crit ? 'crit' : '');
      if (this.ability.slow) this.target.applySlow(1 - this.ability.slow, this.ability.slowDuration);
      this.dead = true;
    }
  }
}

// ---------------------------------------------------------------
// Obstacle collision helpers (normalized arena space)
// ---------------------------------------------------------------
function resolveObstacles(entity, obstacles, mapId) {
  for (const ob of obstacles) {
    if (ob.shape === 'pillar') {
      const halfW = ob.w / 2, halfH = ob.h / 2;
      const closestX = clamp(entity.x, ob.x - halfW, ob.x + halfW);
      const closestY = clamp(entity.y, ob.y - halfH, ob.y + halfH);
      const dx = entity.x - closestX, dy = entity.y - closestY;
      const d = Math.hypot(dx, dy);
      if (d < entity.radius) {
        const push = entity.radius - d || entity.radius;
        if (d === 0) { entity.x += entity.radius; }
        else { entity.x += (dx / d) * push; entity.y += (dy / d) * push; }
      }
    }
  }
  if (mapId === 'ringofvalor') {
    const d = dist(entity.x, entity.y, RING_CENTER.x, RING_CENTER.y);
    if (d > RING_RADIUS - entity.radius) {
      const ang = Math.atan2(entity.y - RING_CENTER.y, entity.x - RING_CENTER.x);
      entity.x = RING_CENTER.x + Math.cos(ang) * (RING_RADIUS - entity.radius);
      entity.y = RING_CENTER.y + Math.sin(ang) * (RING_RADIUS - entity.radius);
    }
  }
}

function inWater(entity, obstacles) {
  return obstacles.some(ob => ob.shape === 'water' &&
    entity.x > ob.x - ob.w / 2 && entity.x < ob.x + ob.w / 2 &&
    entity.y > ob.y - ob.h / 2 && entity.y < ob.y + ob.h / 2);
}

// ---------------------------------------------------------------
// AI controller
// ---------------------------------------------------------------
function updateAI(ai, target, dt, game) {
  if (!ai.alive || ai.isDisabled()) { ai.vx = 0; ai.vy = 0; return; }
  const champ = ai.champion;
  const d = dist(ai.x, ai.y, target.x, target.y);
  const isMelee = champ.autoRange < 100;
  const preferredRange = isMelee ? 55 : champ.autoRange * 0.72;

  // decide movement
  let moveX = 0, moveY = 0;
  const angToTarget = Math.atan2(target.y - ai.y, target.x - ai.x);
  if (isMelee) {
    if (d > preferredRange) { moveX = Math.cos(angToTarget); moveY = Math.sin(angToTarget); }
    else { moveX = -Math.cos(angToTarget) * 0.15; moveY = -Math.sin(angToTarget) * 0.15; }
  } else {
    if (d < preferredRange - 40) { moveX = -Math.cos(angToTarget); moveY = -Math.sin(angToTarget); }
    else if (d > preferredRange + 40) { moveX = Math.cos(angToTarget); moveY = Math.sin(angToTarget); }
    else {
      // strafe
      const strafeAng = angToTarget + Math.PI / 2 * (ai._strafeDir || 1);
      moveX = Math.cos(strafeAng) * 0.6; moveY = Math.sin(strafeAng) * 0.6;
    }
  }
  ai._strafeTimer = (ai._strafeTimer || 0) - dt;
  if (ai._strafeTimer <= 0) { ai._strafeDir = Math.random() < 0.5 ? 1 : -1; ai._strafeTimer = 1.2 + Math.random(); }

  const mag = Math.hypot(moveX, moveY) || 1;
  ai.vx = (moveX / mag);
  ai.vy = (moveY / mag);

  // decide ability usage
  ai._decisionTimer = (ai._decisionTimer || 0) - dt;
  if (ai._decisionTimer > 0) return;
  ai._decisionTimer = 0.25 + Math.random() * 0.15;

  const hpPct = ai.health / ai.maxHealth;
  const targetHpPct = target.health / target.maxHealth;
  const abilities = champ.abilities;

  const tryUse = (ability) => {
    if (!ability) return false;
    if (!ai.abilityReady(ability)) return false;
    const isRanged = ability.kind === 'ranged';
    const isGap = ability.kind === 'gapcloser';
    const needsRange = ability.range || (isGap ? ability.range : Infinity);
    if (ability.kind !== 'buff' && ability.kind !== 'heal' && ability.kind !== 'mobility') {
      if (isGap) { if (d < 260) return false; }
      else if (needsRange && d > needsRange) return false;
    }
    game.useAbility(ai, target, ability);
    return true;
  };

  if (champ.id === 'warrior') {
    const charge = abilities[0], mortal = abilities[1], wall = abilities[2], exe = abilities[3];
    if (hpPct < 0.3 && ai.abilityReady(wall)) { tryUse(wall); return; }
    if (d > 260 && ai.abilityReady(charge)) { tryUse(charge); return; }
    if (d <= 75) {
      if (targetHpPct < 0.22 && ai.abilityReady(exe)) { tryUse(exe); return; }
      if (ai.abilityReady(mortal)) { tryUse(mortal); return; }
    }
  } else if (champ.id === 'mage') {
    const fire = abilities[0], frost = abilities[1], blink = abilities[2], pyro = abilities[3];
    if (d < 90 && ai.abilityReady(blink)) { tryUse(blink); return; }
    if (targetHpPct < 0.35 && ai.abilityReady(pyro)) { tryUse(pyro); return; }
    if (ai.abilityReady(frost) && Math.random() < 0.4) { tryUse(frost); return; }
    if (ai.abilityReady(fire)) { tryUse(fire); return; }
  } else if (champ.id === 'rogue') {
    const sinister = abilities[0], kidney = abilities[1], sprint = abilities[2], evis = abilities[3];
    if (d > 200 && ai.abilityReady(sprint)) { tryUse(sprint); return; }
    if (d <= 70) {
      if (ai.abilityReady(kidney) && !target.isDisabled() && Math.random() < 0.6) { tryUse(kidney); return; }
      if (targetHpPct < 0.3 && ai.abilityReady(evis)) { tryUse(evis); return; }
      if (ai.abilityReady(sinister)) { tryUse(sinister); return; }
    }
  } else if (champ.id === 'priest') {
    const smite = abilities[0], heal = abilities[1], shield = abilities[2], scream = abilities[3];
    if (hpPct < 0.45 && ai.abilityReady(heal)) { tryUse(heal); return; }
    if (hpPct < 0.7 && ai.abilityReady(shield)) { tryUse(shield); return; }
    if (d < 150 && ai.abilityReady(scream)) { tryUse(scream); return; }
    if (ai.abilityReady(smite)) { tryUse(smite); return; }
  }
}

// ---------------------------------------------------------------
// Game
// ---------------------------------------------------------------
export class Game {
  constructor(canvas, playerChampion, map, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.map = map;
    this.hooks = hooks; // { onHUD, onLog, onRoundEnd, onMatchEnd, onFCT }
    this.playerChampion = playerChampion;

    const enemyPool = ['warrior', 'mage', 'rogue', 'priest'].filter(id => id !== playerChampion.id);
    this.enemyChampionId = enemyPool[Math.floor(Math.random() * enemyPool.length)];

    this.playerWins = 0;
    this.enemyWins = 0;
    this.round = 1;
    this.state = 'countdown'; // countdown | fighting | roundover | matchover
    this.keys = new Set();
    this.projectiles = [];
    this.running = false;

    this.resize();
    this._resetRound(true);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    const scale = Math.min(this.canvas.width / ARENA_W, this.canvas.height / ARENA_H) * 0.94;
    this.scale = scale;
    this.offsetX = (this.canvas.width - ARENA_W * scale) / 2;
    this.offsetY = (this.canvas.height - ARENA_H * scale) / 2;
  }

  _resetRound(first = false) {
    const pChamp = this.playerChampion;
    const eChamp = getChampion(this.enemyChampionId);
    this.player = new Entity(pChamp, 260, 300, true);
    this.enemy = new Entity(eChamp, 740, 300, false);
    this.projectiles = [];
    this.state = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = 1;
    if (this.hooks.onEntitiesReady) this.hooks.onEntitiesReady(this.player, this.enemy, this);
    if (this.hooks.onCountdown) this.hooks.onCountdown(this.countdownValue);
  }

  logEvent(text, cls = '') {
    if (this.hooks.onLog) this.hooks.onLog(text, cls);
  }
  spawnFCT(x, y, text, color, big = false) {
    if (this.hooks.onFCT) {
      const sx = this.offsetX + x * this.scale;
      const sy = this.offsetY + y * this.scale;
      this.hooks.onFCT(sx / devicePixelRatio, sy / devicePixelRatio, text, color, big);
    }
  }

  useAbility(caster, target, ability) {
    if (!caster.abilityReady(ability)) return false;
    caster.spendResource(ability.cost);
    caster.cooldowns[ability.id] = ability.cooldown;

    switch (ability.kind) {
      case 'melee': {
        const d = dist(caster.x, caster.y, target.x, target.y);
        if (d > ability.range + 10) break;
        const crit = Math.random() < 0.15;
        let dmg = randRange(ability.dmg) * (crit ? 1.5 : 1);
        if (ability.executeBonus && target.health / target.maxHealth < ability.executeThreshold) dmg *= ability.executeBonus;
        target.takeDamage(dmg, this, { crit });
        this.logEvent(`${caster.name} uses ${ability.name} on ${target.name} for ${Math.round(dmg)}`, crit ? 'crit' : '');
        if (ability.healReduction) target.applyHealReduction(1 - ability.healReduction, ability.healReductionDuration);
        break;
      }
      case 'ranged': {
        this.projectiles.push(new Projectile(caster, target, ability, caster.x, caster.y));
        this.logEvent(`${caster.name} casts ${ability.name}`);
        break;
      }
      case 'gapcloser': {
        const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
        const d = dist(caster.x, caster.y, target.x, target.y);
        const travel = Math.max(0, d - 60);
        caster.x += Math.cos(ang) * travel;
        caster.y += Math.sin(ang) * travel;
        const crit = Math.random() < 0.15;
        const dmg = randRange(ability.dmg) * (crit ? 1.5 : 1);
        target.takeDamage(dmg, this, { crit });
        caster.gainResource(ability.rageGen);
        this.logEvent(`${caster.name} charges ${target.name} for ${Math.round(dmg)}`, crit ? 'crit' : '');
        break;
      }
      case 'cc': {
        const d = dist(caster.x, caster.y, target.x, target.y);
        if (ability.range && d > ability.range + 10) break;
        if (ability.dmg) target.takeDamage(randRange(ability.dmg), this);
        if (ability.stunDuration) { target.applyStun(ability.stunDuration); this.logEvent(`${target.name} is stunned!`, 'crit'); }
        if (ability.fearDuration) {
          target.applyFear(ability.fearDuration);
          const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
          target.x += Math.cos(ang) * 60; target.y += Math.sin(ang) * 60;
          this.logEvent(`${target.name} is feared!`, 'crit');
        }
        this.logEvent(`${caster.name} uses ${ability.name}`);
        break;
      }
      case 'buff': {
        if (ability.damageReduction) caster.applyDamageReduction(1 - ability.damageReduction, ability.duration);
        if (ability.speedBonus) caster.applySpeedBuff(ability.speedBonus, ability.duration);
        if (ability.shieldAmount) caster.applyShield(ability.shieldAmount);
        this.logEvent(`${caster.name} uses ${ability.name}`);
        break;
      }
      case 'heal': {
        const amt = randRange(ability.heal);
        caster.heal(amt, this);
        this.logEvent(`${caster.name} heals for ${Math.round(amt)}`, 'heal');
        break;
      }
      case 'mobility': {
        const ang = Math.atan2(caster.y - target.y, caster.x - target.x);
        caster.x = clamp(caster.x + Math.cos(ang) * ability.blinkDistance, 20, ARENA_W - 20);
        caster.y = clamp(caster.y + Math.sin(ang) * ability.blinkDistance, 20, ARENA_H - 20);
        this.logEvent(`${caster.name} uses ${ability.name}`);
        break;
      }
    }
    if (this.hooks.onAbilityUsed) this.hooks.onAbilityUsed(caster);
    return true;
  }

  tryPlayerAbility(index) {
    if (this.state !== 'fighting') return;
    const ability = this.player.champion.abilities[index];
    if (!ability) return;
    if (!this.player.abilityReady(ability)) return;
    this.useAbility(this.player, this.enemy, ability);
  }

  start() { this.running = true; this._lastT = performance.now(); requestAnimationFrame(this._loop.bind(this)); }
  stop() { this.running = false; }

  _loop(t) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;
    this._update(dt);
    this._render();
    requestAnimationFrame(this._loop.bind(this));
  }

  _update(dt) {
    if (this.state === 'countdown') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownValue -= 1;
        this.countdownTimer = 1;
        if (this.countdownValue <= 0) {
          this.state = 'fighting';
          if (this.hooks.onCountdown) this.hooks.onCountdown('FIGHT');
        } else if (this.hooks.onCountdown) {
          this.hooks.onCountdown(this.countdownValue);
        }
      }
      return;
    }
    if (this.state !== 'fighting') return;

    const { player, enemy } = this;
    // input -> player movement
    let mx = 0, my = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    if (player.isDisabled()) { mx = 0; my = 0; }
    const mag = Math.hypot(mx, my) || 1;
    player.vx = mx / mag; player.vy = my / mag;

    updateAI(enemy, player, dt, this);

    for (const ent of [player, enemy]) {
      ent.updateTimers(dt);
      let speed = ent.currentSpeed();
      if (inWater(ent, this.map.obstacles)) speed *= 0.5;
      ent.x = clamp(ent.x + ent.vx * speed * dt, ent.radius, ARENA_W - ent.radius);
      ent.y = clamp(ent.y + ent.vy * speed * dt, ent.radius, ARENA_H - ent.radius);
      resolveObstacles(ent, this.map.obstacles, this.map.id);
    }

    // auto attacks
    for (const [attacker, defender] of [[player, enemy], [enemy, player]]) {
      if (!attacker.alive || !defender.alive) continue;
      attacker.autoCooldown -= dt;
      if (attacker.autoCooldown <= 0) {
        const d = dist(attacker.x, attacker.y, defender.x, defender.y);
        if (d <= attacker.champion.autoRange) {
          attacker.autoCooldown = attacker.autoInterval;
          const crit = Math.random() < 0.1;
          const dmg = randRange(attacker.champion.autoDamage) * (crit ? 1.5 : 1);
          defender.takeDamage(dmg, this, { crit });
          if (attacker.champion.autoRage) attacker.gainResource(attacker.champion.autoRage);
          this.logEvent(`${attacker.name} attacks ${defender.name} for ${Math.round(dmg)}`, crit ? 'crit' : '');
        }
      }
    }

    // projectiles
    this.projectiles.forEach(p => p.update(dt, this));
    this.projectiles = this.projectiles.filter(p => !p.dead);

    if (this.hooks.onHUD) this.hooks.onHUD(player, enemy);

    if (!player.alive || !enemy.alive) {
      this._endRound(player.alive ? 'player' : 'enemy');
    }
  }

  _endRound(winner) {
    this.state = 'roundover';
    if (winner === 'player') this.playerWins++; else this.enemyWins++;
    const matchOver = this.playerWins >= 2 || this.enemyWins >= 2;
    if (matchOver) this.state = 'matchover';
    if (this.hooks.onRoundEnd) {
      this.hooks.onRoundEnd({
        winner, matchOver,
        playerWins: this.playerWins, enemyWins: this.enemyWins,
        round: this.round
      });
    }
  }

  nextRound() {
    this.round++;
    this._resetRound();
  }

  // ---------------- Rendering ----------------
  _toScreen(x, y) {
    return [this.offsetX + x * this.scale, this.offsetY + y * this.scale];
  }

  _render() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // backdrop
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, w, h);

    // arena floor
    const [fx, fy] = this._toScreen(0, 0);
    const fw = ARENA_W * this.scale, fh = ARENA_H * this.scale;
    const grad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    grad.addColorStop(0, this.map.floorGradient[0]);
    grad.addColorStop(1, this.map.floorGradient[1]);

    ctx.save();
    if (this.map.id === 'ringofvalor') {
      const [cx, cy] = this._toScreen(RING_CENTER.x, RING_CENTER.y);
      ctx.beginPath();
      ctx.arc(cx, cy, RING_RADIUS * this.scale, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // fire ring
      ctx.lineWidth = 10 * this.scale / 20;
      ctx.strokeStyle = 'rgba(255,120,40,.55)';
      ctx.stroke();
      ctx.shadowColor = 'rgba(255,120,40,.6)';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = grad;
      ctx.fillRect(fx, fy, fw, fh);
      ctx.strokeStyle = 'rgba(201,163,90,.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, fy, fw, fh);
    }

    // grid lines
    ctx.strokeStyle = this.map.lineColor;
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= ARENA_W; gx += 50) {
      const [sx1, sy1] = this._toScreen(gx, 0);
      const [sx2, sy2] = this._toScreen(gx, ARENA_H);
      ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
    }
    for (let gy = 0; gy <= ARENA_H; gy += 50) {
      const [sx1, sy1] = this._toScreen(0, gy);
      const [sx2, sy2] = this._toScreen(ARENA_W, gy);
      ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
    }
    ctx.restore();

    // obstacles
    for (const ob of this.map.obstacles) {
      const [ox, oy] = this._toScreen(ob.x, ob.y);
      if (ob.shape === 'pillar') {
        const ow = ob.w * this.scale, oh = ob.h * this.scale;
        ctx.fillStyle = '#2a2118';
        ctx.strokeStyle = 'rgba(201,163,90,.6)';
        ctx.lineWidth = 2;
        ctx.fillRect(ox - ow / 2, oy - oh / 2, ow, oh);
        ctx.strokeRect(ox - ow / 2, oy - oh / 2, ow, oh);
      } else if (ob.shape === 'water') {
        const ow = ob.w * this.scale, oh = ob.h * this.scale;
        ctx.fillStyle = 'rgba(40,90,120,.45)';
        ctx.fillRect(ox - ow / 2, oy - oh / 2, ow, oh);
        ctx.strokeStyle = 'rgba(120,190,220,.4)';
        ctx.strokeRect(ox - ow / 2, oy - oh / 2, ow, oh);
      }
    }

    // projectiles
    for (const p of this.projectiles) {
      const [px, py] = this._toScreen(p.x, p.y);
      ctx.beginPath();
      ctx.arc(px, py, p.radius * this.scale / 20 + 4, 0, Math.PI * 2);
      ctx.fillStyle = p.ability.id.includes('frost') ? '#8fd0f0' : (p.ability.id === 'smite' ? '#f0e2a0' : '#ff8a4a');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // entities
    for (const ent of [this.enemy, this.player]) {
      this._drawEntity(ent);
    }
  }

  _drawEntity(ent) {
    const ctx = this.ctx;
    const [ex, ey] = this._toScreen(ent.x, ent.y);
    const r = ent.radius * this.scale;

    ctx.save();
    if (!ent.alive) ctx.globalAlpha = 0.25;

    // shadow
    ctx.beginPath();
    ctx.ellipse(ex, ey + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fill();

    // shield ring
    if (ent.shield > 0) {
      ctx.beginPath();
      ctx.arc(ex, ey, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(124,196,232,.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // body
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fillStyle = ent.champion.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ent.isPlayer ? '#e8c477' : '#e0473f';
    ctx.stroke();

    if (ent.flashTimer > 0) {
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${ent.flashTimer / 0.12 * 0.55})`;
      ctx.fill();
    }

    // status icon
    if (ent.stunTimer > 0 || ent.fearTimer > 0) {
      ctx.font = `${r * 0.9}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(ent.stunTimer > 0 ? '💫' : '😱', ex, ey - r - 14);
    }

    // class icon
    ctx.font = `${r * 1.15}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ent.champion.icon, ex, ey);

    ctx.restore();
  }
}