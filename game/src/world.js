import { ENEMIES, HEIGHT, TAU, UPGRADES, WIDTH } from './config.js';
import { createRandom } from './random.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createWorld(seed, sound = () => {}) {
  let state;
  let random;
  let effects;
  let nextSpawn;

  function reset() {
    random = createRandom(seed);
    effects = createRandom(seed ^ 0x859d6f8b);
    nextSpawn = 0.35;
    state = {
      player: {
        x: WIDTH / 2, y: HEIGHT / 2, angle: 0, radius: 12, hp: 100, maxHp: 100,
        speed: 245, interval: 0.19, damage: 2, shots: 1, magnet: 64, cooldown: 0, invincible: 0,
      },
      enemies: [], bullets: [], gems: [], particles: [], labels: [],
      time: 0, score: 0, kills: 0, level: 1, xp: 0, goal: 12, shake: 0, choices: [],
    };
  }

  function addEnemy(kind, x, y) {
    const spec = ENEMIES[kind];
    state.enemies.push({
      kind, spec, x, y, hp: spec.hp, angle: 0, flash: 0,
      phase: 'approach', timer: 0.75 + random() * 0.6,
    });
  }

  function spawn() {
    const roll = random();
    let kind = 'chaser';
    if (state.time > 14 && roll < 0.24) kind = 'splitter';
    else if (state.time > 5 && roll < 0.54) kind = 'dasher';
    const vertical = random() < 0.5;
    const far = random() < 0.5;
    const along = random();
    addEnemy(kind, vertical ? (far ? WIDTH + 22 : -22) : along * WIDTH,
      vertical ? along * HEIGHT : (far ? HEIGHT + 22 : -22));
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = effects() * TAU;
      const force = speed * (0.2 + effects() * 0.8);
      const life = 0.13 + effects() * 0.42;
      state.particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, color, life, max: life });
    }
  }

  function destroy(enemy) {
    const { x, y, spec, kind } = enemy;
    state.score += spec.score;
    state.kills++;
    state.gems.push({ x: clamp(x, 12, WIDTH - 12), y: clamp(y, 12, HEIGHT - 12), xp: spec.xp, phase: effects() * TAU });
    state.labels.push({ x: clamp(x, 24, WIDTH - 24), y: Math.max(23, y), life: 0.75, value: '+' + spec.score });
    state.shake = Math.max(state.shake, kind === 'splitter' ? 5 : 2.4);
    burst(x, y, spec.color, kind === 'splitter' ? 24 : 13, 170);
    sound('explosion');
    if (kind === 'splitter') {
      addEnemy('fragment', x - 14, y + 7);
      addEnemy('fragment', x + 14, y - 7);
    }
  }

  function movePlayer(dt, input) {
    const p = state.player;
    const magnitude = Math.max(1, Math.hypot(input.x, input.y));
    p.x = clamp(p.x + input.x / magnitude * p.speed * dt, p.radius, WIDTH - p.radius);
    p.y = clamp(p.y + input.y / magnitude * p.speed * dt, p.radius, HEIGHT - p.radius);
    p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    p.invincible = Math.max(0, p.invincible - dt);
    p.cooldown -= dt;
    if (!input.fire) {
      p.cooldown = Math.max(0, p.cooldown);
      return;
    }
    if (p.cooldown > 0) return;
    p.cooldown += Math.max(0.045, p.interval);
    const spacing = Math.min(0.14, 1.1 / p.shots);
    for (let i = 0; i < p.shots; i++) {
      const angle = p.angle + (i - (p.shots - 1) / 2) * spacing;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      state.bullets.push({ x: p.x + dx * 19, y: p.y + dy * 19, vx: dx * 680, vy: dy * 680, damage: p.damage });
    }
    burst(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, '#65ffed', 3, 50);
    sound('shoot');
  }

  function moveEnemies(dt) {
    const p = state.player;
    const difficulty = 1 + Math.min(2.5, state.time * 0.011);
    for (const enemy of state.enemies) {
      const desired = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      let speed = enemy.spec.speed;
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.phase !== 'lunge') enemy.angle = desired;
      if (enemy.kind === 'dasher') {
        enemy.timer -= dt;
        if (enemy.phase === 'approach' && enemy.timer <= 0 && distance(enemy, p) < 275) {
          enemy.phase = 'windup';
          enemy.timer = 0.53;
        } else if (enemy.phase === 'windup' && enemy.timer <= 0) {
          enemy.phase = 'lunge';
          enemy.timer = 0.36;
        } else if (enemy.phase === 'lunge' && enemy.timer <= 0) {
          enemy.phase = 'approach';
          enemy.timer = 0.95;
        }
        if (enemy.phase === 'windup') speed = 0;
        if (enemy.phase === 'lunge') {
          speed = 340;
          if (effects() < 0.52) burst(enemy.x, enemy.y, enemy.spec.color, 1, 55);
        }
      }
      enemy.x += Math.cos(enemy.angle) * speed * difficulty * dt;
      enemy.y += Math.sin(enemy.angle) * speed * difficulty * dt;
      if (p.invincible > 0 || distance(enemy, p) >= enemy.spec.radius + p.radius - 3) continue;
      p.hp = Math.max(0, p.hp - (enemy.kind === 'fragment' ? 11 : 20));
      p.invincible = 0.8;
      state.shake = 10;
      enemy.x -= Math.cos(desired) * 30;
      enemy.y -= Math.sin(desired) * 30;
      burst(p.x, p.y, '#ff5c97', 20, 215);
      sound('hurt');
    }
  }

  function moveBullets(dt) {
    state.bullets = state.bullets.filter(bullet => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const index = state.enemies.findIndex(enemy => distance(enemy, bullet) < enemy.spec.radius + 4);
      if (index !== -1) {
        const enemy = state.enemies[index];
        enemy.hp -= bullet.damage;
        if (enemy.hp <= 0) {
          state.enemies.splice(index, 1);
          destroy(enemy);
        } else {
          enemy.flash = 0.08;
          burst(bullet.x, bullet.y, enemy.spec.color, 5, 100);
          sound('hit');
        }
        return false;
      }
      return bullet.x >= -32 && bullet.y >= -32 && bullet.x <= WIDTH + 32 && bullet.y <= HEIGHT + 32;
    });
  }

  function offerUpgrades() {
    const pool = UPGRADES.slice();
    state.choices = Array.from({ length: 3 }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]);
    sound('level');
  }

  function collectGems(dt) {
    const p = state.player;
    state.gems = state.gems.filter(gem => {
      const gap = distance(gem, p);
      if (gap < 17) {
        state.xp += gem.xp;
        burst(gem.x, gem.y, '#77ffc0', 5, 85);
        sound('pickup');
        return false;
      }
      if (gap < p.magnet) {
        const travel = Math.min(gap, dt * (310 + p.speed));
        gem.x += (p.x - gem.x) / gap * travel;
        gem.y += (p.y - gem.y) / gap * travel;
      }
      return true;
    });
    if (state.xp >= state.goal) {
      state.xp -= state.goal;
      state.level++;
      state.goal = 12 + (state.level - 1) * 6;
      offerUpgrades();
    }
  }

  function choose(index) {
    const upgrade = state.choices[index];
    if (!upgrade) return;
    upgrade.apply(state.player);
    state.choices = [];
  }

  function step(dt, input) {
    if (state.player.hp <= 0 || state.choices.length) return;
    state.time += dt;
    state.score += Math.floor(state.time + 1e-8) - Math.floor(state.time - dt + 1e-8);
    state.shake = Math.max(0, state.shake - 27 * dt);
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter(particle => particle.life > 0);
    for (const label of state.labels) {
      label.y -= 34 * dt;
      label.life -= dt;
    }
    state.labels = state.labels.filter(label => label.life > 0);

    if (state.time >= nextSpawn) {
      spawn();
      if (state.time > 20) spawn();
      if (state.time > 55) spawn();
      nextSpawn += Math.max(0.30, 1.1 - state.time * 0.013);
    }
    movePlayer(dt, input);
    moveEnemies(dt);
    if (state.player.hp <= 0) return;
    moveBullets(dt);
    collectGems(dt);
  }

  reset();
  return { get state() { return state; }, step, reset, choose };
}
