// Champion roster. Each champion has a resource type, base stats,
// an auto-attack, and four keyed abilities (1-4).
// Ability "kind": melee | ranged | heal | buff | cc | dot
export const CHAMPIONS = [
  {
    id: 'warrior',
    name: 'Bronwyn Ironhide',
    className: 'Warrior',
    icon: '⚔️',
    color: '#c0392b',
    desc: 'A frontline berserker who closes distance fast and punishes with brutal melee strikes.',
    resource: 'rage',
    resourceColor: 'var(--c-rage)',
    resourceMax: 100,
    resourceStart: 0,
    health: 340,
    speed: 210,
    autoRange: 62,
    autoDamage: [10, 15],
    autoRage: 8,
    abilities: [
      {
        id: 'charge', key: '1', name: 'Charge', icon: '🐎', kind: 'gapcloser',
        cost: 0, cooldown: 8, range: 320,
        dmg: [14, 20], rageGen: 20,
        desc: 'Dash to the enemy, dealing damage and generating rage.'
      },
      {
        id: 'mortalstrike', key: '2', name: 'Mortal Strike', icon: '🗡️', kind: 'melee',
        cost: 30, cooldown: 4, range: 70,
        dmg: [28, 38], healReduction: 0.5, healReductionDuration: 5,
        desc: 'A vicious strike that reduces the target\'s healing received by 50% for 5s.'
      },
      {
        id: 'shieldwall', key: '3', name: 'Shield Wall', icon: '🛡️', kind: 'buff',
        cost: 20, cooldown: 16, duration: 3,
        damageReduction: 0.5,
        desc: 'Reduce all damage taken by 50% for 3 seconds.'
      },
      {
        id: 'execute', key: '4', name: 'Execute', icon: '💀', kind: 'melee',
        cost: 30, cooldown: 6, range: 70,
        dmg: [24, 32], executeBonus: 2.2, executeThreshold: 0.2,
        desc: 'Deals massive bonus damage if the enemy is below 20% health.'
      }
    ]
  },
  {
    id: 'mage',
    name: 'Lyandra Frostweave',
    className: 'Mage',
    icon: '🔥',
    color: '#3d85c6',
    desc: 'A ranged spellcaster who kites foes with fire and frost, saving a devastating burst for the kill.',
    resource: 'mana',
    resourceColor: 'var(--c-mana)',
    resourceMax: 100,
    resourceStart: 100,
    manaRegen: 6,
    health: 240,
    speed: 220,
    autoRange: 320,
    autoDamage: [7, 11],
    autoRage: 0,
    autoManaCost: 4,
    abilities: [
      {
        id: 'fireball', key: '1', name: 'Fireball', icon: '☄️', kind: 'ranged',
        cost: 20, cooldown: 1.6, range: 340, projectileSpeed: 620,
        dmg: [20, 28],
        desc: 'Launch a fireball that scorches the target on impact.'
      },
      {
        id: 'frostbolt', key: '2', name: 'Frostbolt', icon: '❄️', kind: 'ranged',
        cost: 25, cooldown: 6, range: 340, projectileSpeed: 560,
        dmg: [16, 22], slow: 0.5, slowDuration: 3,
        desc: 'A bolt of frost that damages and slows the target\'s movement by 50%.'
      },
      {
        id: 'blink', key: '3', name: 'Blink', icon: '✨', kind: 'mobility',
        cost: 15, cooldown: 12, blinkDistance: 220,
        desc: 'Teleport a short distance away from danger.'
      },
      {
        id: 'pyroblast', key: '4', name: 'Pyroblast', icon: '🌋', kind: 'ranged',
        cost: 45, cooldown: 9, range: 340, projectileSpeed: 480,
        dmg: [42, 56],
        desc: 'A slow-moving but devastating gout of flame.'
      }
    ]
  },
  {
    id: 'rogue',
    name: 'Kessia Nightshade',
    className: 'Rogue',
    icon: '🗡️',
    color: '#6c5ce7',
    desc: 'A melee striker with explosive burst damage, mobility, and a crippling stun.',
    resource: 'energy',
    resourceColor: 'var(--c-energy)',
    resourceMax: 100,
    resourceStart: 100,
    energyRegen: 18,
    health: 260,
    speed: 250,
    autoRange: 58,
    autoDamage: [8, 13],
    autoRage: 0,
    autoManaCost: 0,
    abilities: [
      {
        id: 'sinisterstrike', key: '1', name: 'Sinister Strike', icon: '🔪', kind: 'melee',
        cost: 30, cooldown: 1, range: 65,
        dmg: [16, 22],
        desc: 'A quick, precise strike.'
      },
      {
        id: 'kidneyshot', key: '2', name: 'Kidney Shot', icon: '💫', kind: 'cc',
        cost: 35, cooldown: 16, range: 65,
        dmg: [8, 12], stunDuration: 1.8,
        desc: 'Stuns the target, preventing all action.'
      },
      {
        id: 'sprint', key: '3', name: 'Sprint', icon: '💨', kind: 'buff',
        cost: 20, cooldown: 18, duration: 3,
        speedBonus: 1.6,
        desc: 'Increase movement speed by 60% for 3 seconds.'
      },
      {
        id: 'eviscerate', key: '4', name: 'Eviscerate', icon: '⚔️', kind: 'melee',
        cost: 35, cooldown: 3, range: 65,
        dmg: [26, 36],
        desc: 'A finishing blow that deals heavy damage.'
      }
    ]
  },
  {
    id: 'priest',
    name: 'Aldric Dawnhollow',
    className: 'Priest',
    icon: '✝️',
    color: '#e8c477',
    desc: 'A holy caster who balances offense with healing and disabling fear magic.',
    resource: 'mana',
    resourceColor: 'var(--c-mana)',
    resourceMax: 100,
    resourceStart: 100,
    manaRegen: 7,
    health: 260,
    speed: 210,
    autoRange: 300,
    autoDamage: [6, 9],
    autoRage: 0,
    autoManaCost: 3,
    abilities: [
      {
        id: 'smite', key: '1', name: 'Smite', icon: '⭐', kind: 'ranged',
        cost: 18, cooldown: 1.4, range: 320, projectileSpeed: 640,
        dmg: [16, 22],
        desc: 'A bolt of holy energy.'
      },
      {
        id: 'heal', key: '2', name: 'Heal', icon: '💚', kind: 'heal',
        cost: 35, cooldown: 7,
        heal: [38, 50],
        desc: 'Restore a large portion of your own health.'
      },
      {
        id: 'shield', key: '3', name: 'Power Word: Shield', icon: '🔰', kind: 'buff',
        cost: 25, cooldown: 12,
        shieldAmount: 60,
        desc: 'Absorb the next 60 damage taken.'
      },
      {
        id: 'psychicscream', key: '4', name: 'Psychic Scream', icon: '😱', kind: 'cc',
        cost: 30, cooldown: 16, range: 150,
        fearDuration: 1.8,
        desc: 'Fear the enemy in melee range, disabling their actions and pushing them back.'
      }
    ]
  }
];

export function getChampion(id) {
  return CHAMPIONS.find(c => c.id === id);
}