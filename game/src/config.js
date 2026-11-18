export const WIDTH = 1120;
export const HEIGHT = 560;
export const STEP = 1 / 60;
export const TAU = Math.PI * 2;

export const ENEMIES = {
  chaser: { radius: 13, hp: 2, speed: 80, score: 100, xp: 2, color: '#ff5c97', sides: 3 },
  dasher: { radius: 16, hp: 4, speed: 77, score: 180, xp: 3, color: '#ffc46e', sides: 4 },
  splitter: { radius: 21, hp: 7, speed: 52, score: 260, xp: 4, color: '#bd8fff', sides: 5 },
  fragment: { radius: 8, hp: 1, speed: 135, score: 40, xp: 1, color: '#ff86b2', sides: 3 },
};

export const UPGRADES = [
  { name: 'Rapid Pulse', detail: '18% shorter shot interval', apply: p => { p.interval *= 0.82; } },
  { name: 'Heavy Rounds', detail: '+1 bullet damage', apply: p => { p.damage += 1; } },
  { name: 'Vector Drive', detail: '+30 movement speed', apply: p => { p.speed += 30; } },
  { name: 'Forked Beam', detail: '+1 projectile per shot', apply: p => { p.shots += 1; } },
  { name: 'Shard Magnet', detail: '+45 pickup radius', apply: p => { p.magnet += 45; } },
  { name: 'Reinforced Hull', detail: '+25 max HP and heal 40 HP', apply: p => {
    p.maxHp += 25;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  } },
];
