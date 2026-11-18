// The screenshot driver uses the same seeded world and simulation as normal play.
export function stageShot(name, game) {
  game.reset();
  if (name === 'start') return 'title';
  for (let i = 0; i < 60 * 32; i++) {
    const t = i / 60;
    const target = game.enemies.reduce((best, e) => !best || Math.hypot(e.x-game.player.x,e.y-game.player.y) < Math.hypot(best.x-game.player.x,best.y-game.player.y) ? e : best, null);
    game.update(1 / 60, { x: Math.cos(t * .8), y: Math.sin(t * .8), aimX: target?.x ?? 800, aimY: target?.y ?? 300, fire: true }, true);
    if (game.levelPending) game.upgrade(0);
    if (game.player.hp <= 0) game.player.hp = game.player.maxHp;
  }
  if (name === 'end') { game.player.hp = 0; return 'over'; }
  return 'play';
}
