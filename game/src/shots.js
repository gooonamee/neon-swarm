// Stage actual fixed-step gameplay with a seeded world and repeatable pilot input.
import { HEIGHT, STEP, WIDTH } from './config.js';

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') return 'title';

  const isEnd = name === 'end';
  const limit = isEnd ? 180 : 34;
  for (let tick = 0; tick < limit / STEP; tick++) {
    const { player, enemies, gems, time, choices } = world.state;
    if (player.hp <= 0) return 'over';
    if (!isEnd && player.hp <= 20) break;
    if (choices.length) world.choose(0);

    // Orbit the centre, picking up nearby shards and leading shots into the swarm.
    const angle = time * 0.56;
    const destination = { x: WIDTH / 2 + Math.cos(angle) * 225, y: HEIGHT / 2 + Math.sin(angle) * 132 };
    let target;
    let closest = Infinity;
    for (const enemy of enemies) {
      const gap = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (gap < closest) {
        closest = gap;
        target = enemy;
      }
    }
    if (closest > 108) {
      for (const gem of gems) {
        if (Math.hypot(gem.x - player.x, gem.y - player.y) < 110) {
          Object.assign(destination, gem);
          break;
        }
      }
    }
    const moving = !isEnd || time < 26;
    const lead = target && closest / 680 * target.spec.speed;
    world.step(STEP, {
      x: moving ? (destination.x - player.x) / 30 : 0,
      y: moving ? (destination.y - player.y) / 30 : 0,
      aimX: target ? target.x + Math.cos(target.angle) * lead : player.x + 1,
      aimY: target ? target.y + Math.sin(target.angle) * lead : player.y,
      fire: moving && Boolean(target),
    });
  }
  return world.state.player.hp <= 0 ? 'over' : 'play';
}
