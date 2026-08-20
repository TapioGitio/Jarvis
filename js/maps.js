// Arena definitions. Coordinates are in a normalized 1000x600 arena space,
// scaled to the canvas at runtime.
export const MAPS = [
  {
    id: 'nagrand',
    name: "Highland Proving Ground",
    thumbGradient: 'linear-gradient(160deg,#3f6b3a,#274a29 60%,#16250f)',
    floorGradient: ['#3d6b3a', '#254a26'],
    lineColor: 'rgba(180,220,160,.18)',
    desc: 'An open highland field with sweeping sightlines. Few obstacles — pure skill and positioning decide the fight.',
    features: ['Open field', 'Long sightlines', 'No hazards'],
    obstacles: []
  },
  {
    id: 'bladesedge',
    name: "Skyward Bastion",
    thumbGradient: 'linear-gradient(160deg,#5a4a6b,#2e2740 60%,#150f22)',
    floorGradient: ['#4a3f5c', '#241f30'],
    lineColor: 'rgba(200,180,230,.16)',
    desc: 'A floating stone platform ringed by shattered pillars. Break line of sight and juke ranged attacks around the debris.',
    features: ['4 pillars', 'Line of sight play', 'Edge platform'],
    obstacles: [
      { x: 260, y: 180, w: 46, h: 46, shape: 'pillar' },
      { x: 740, y: 180, w: 46, h: 46, shape: 'pillar' },
      { x: 260, y: 420, w: 46, h: 46, shape: 'pillar' },
      { x: 740, y: 420, w: 46, h: 46, shape: 'pillar' }
    ]
  },
  {
    id: 'sewers',
    name: "Undercroft Channel",
    thumbGradient: 'linear-gradient(160deg,#345766,#1c333c 60%,#0d181d)',
    floorGradient: ['#2f4b57', '#182a31'],
    lineColor: 'rgba(150,210,230,.16)',
    desc: 'A narrow flooded corridor. The central channel slows anyone who wades through it — plan your route.',
    features: ['Central water hazard', 'Narrow lanes', 'Slows movement'],
    obstacles: [
      { x: 500, y: 300, w: 620, h: 120, shape: 'water' }
    ]
  },
  {
    id: 'ringofvalor',
    name: "Ring of Valor",
    thumbGradient: 'linear-gradient(160deg,#8a5a2a,#5c3813 60%,#2a1a08)',
    floorGradient: ['#7a4f26', '#4a2f14'],
    lineColor: 'rgba(240,200,140,.2)',
    desc: 'A blazing gladiatorial colosseum. Perimeter fire hazards punish anyone who strays too close to the crowd.',
    features: ['Circular arena', 'Perimeter fire hazard', 'No cover'],
    obstacles: [
      { x: 500, y: 300, w: 900, h: 540, shape: 'ring' }
    ]
  }
];

export function getMap(id) {
  return MAPS.find(m => m.id === id);
}

// Normalized arena space size
export const ARENA_W = 1000;
export const ARENA_H = 600;