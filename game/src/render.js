import { HEIGHT, TAU, WIDTH } from './config.js';
import { createRandom } from './random.js';

function polygon(ctx, sides, radius, angle = 0, x = 0, y = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + TAU * i / sides;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function line(ctx, x, y, endX, endY) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawShip(ctx, x, y, angle, scale = 1, hurt = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const exhaust = ctx.createLinearGradient(-55, 0, -8, 0);
  exhaust.addColorStop(0, '#427bff00');
  exhaust.addColorStop(1, '#62f7e7');
  ctx.fillStyle = exhaust;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-54, 0);
  ctx.lineTo(-12, 6);
  ctx.fill();

  ctx.shadowBlur = 19;
  ctx.shadowColor = hurt ? '#ff5c97' : '#62f7e7';
  ctx.strokeStyle = hurt ? '#ff76a8' : '#8dfff1';
  ctx.fillStyle = hurt ? '#8b2551' : '#173f53';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-13, -13);
  ctx.lineTo(-8, -4);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-8, 4);
  ctx.lineTo(-13, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e9ffff';
  polygon(ctx, 4, 4, 0, -1, 0);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, enemy) {
  const { spec, phase, x, y, angle, flash } = enemy;
  ctx.save();
  ctx.translate(x, y);
  if (phase === 'windup') {
    ctx.strokeStyle = '#ffc46e66';
    ctx.setLineDash([5, 6]);
    line(ctx, 0, 0, Math.cos(angle) * 155, Math.sin(angle) * 155);
    ctx.setLineDash([]);
  }
  const rotation = spec.sides === 4 ? angle + Math.PI / 4 : angle;
  ctx.strokeStyle = flash > 0 ? '#ffffff' : spec.color;
  ctx.fillStyle = spec.color + (phase === 'windup' ? '65' : '30');
  ctx.lineWidth = 1.8;
  ctx.shadowColor = spec.color;
  ctx.shadowBlur = 12;
  polygon(ctx, spec.sides, spec.radius, rotation);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  polygon(ctx, spec.sides, spec.radius * 0.55, rotation);
  ctx.stroke();
  ctx.restore();
}

function paintField(ctx) {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH * 0.65, HEIGHT / 2, 15, WIDTH * 0.65, HEIGHT / 2, 680);
  glow.addColorStop(0, '#211d3c');
  glow.addColorStop(1, '#0a0e19');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#242841';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0.5; x < WIDTH; x += 28) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = 0.5; y < HEIGHT; y += 28) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#42415f';
  ctx.strokeRect(14.5, 14.5, WIDTH - 29, HEIGHT - 29);
  ctx.strokeStyle = '#528488';
  for (const x of [15, WIDTH - 15]) {
    for (const y of [15, HEIGHT - 15]) {
      line(ctx, x, y, x + Math.sign(WIDTH / 2 - x) * 23, y);
      line(ctx, x, y, x, y + Math.sign(HEIGHT / 2 - y) * 23);
    }
  }
}

function paintTitle(ctx) {
  const x = 815, y = 280;
  const fade = ctx.createLinearGradient(0, 0, 620, 0);
  fade.addColorStop(0, '#0c1122');
  fade.addColorStop(0.67, '#0c1122ed');
  fade.addColorStop(1, '#0c112200');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 620, HEIGHT);

  const glow = ctx.createRadialGradient(x, y, 0, x, y, 252);
  glow.addColorStop(0, '#2cf7dd38');
  glow.addColorStop(0.55, '#5369fe1c');
  glow.addColorStop(1, '#5369fe00');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 252, y - 252, 504, 504);

  ctx.strokeStyle = '#5c7598';
  ctx.setLineDash([2, 8]);
  for (const radius of [104, 151, 208]) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#59dfd778';
  ctx.lineWidth = 2;
  for (const start of [0.22, 1.9, 3.56, 5.01]) {
    ctx.beginPath();
    ctx.arc(x, y, 177, start, start + 0.45);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#366374';
  line(ctx, x - 225, y, x + 225, y);
  line(ctx, x, y - 225, x, y + 225);
  ctx.strokeStyle = '#7df4e5a0';
  polygon(ctx, 6, 88, Math.PI / 6, x, y);
  ctx.stroke();
  drawShip(ctx, x, y, -0.68, 3.45);

  const random = createRandom(71);
  const hues = ['#ff5c97', '#ffc46e', '#bd8fff'];
  for (let i = 0; i < 46; i++) {
    const angle = random() * TAU, radius = 99 + random() * 180;
    const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
    ctx.fillStyle = i % 4 === 0 ? hues[i % 3] : '#588399';
    ctx.fillRect(px, py, i % 4 === 0 ? 3 : 1.5, i % 4 === 0 ? 3 : 1.5);
  }
  const silhouettes = [
    [654, 113, 3, 22, '#ff5c97'],
    [958, 112, 5, 27, '#bd8fff'],
    [1000, 384, 4, 24, '#ffc46e'],
    [687, 442, 3, 18, '#ff5c97'],
    [943, 462, 3, 9, '#ff86b2'],
  ];
  for (const [px, py, sides, radius, color] of silhouettes) {
    drawEnemy(ctx, { x: px, y: py, angle: Math.atan2(y - py, x - px), spec: { sides, radius, color } });
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const field = document.createElement('canvas');
  field.width = WIDTH;
  field.height = HEIGHT;
  paintField(field.getContext('2d'));

  function draw(state, screen) {
    ctx.drawImage(field, 0, 0);
    if (screen === 'title') {
      paintTitle(ctx);
      return;
    }
    const { time, player, shake } = state;
    ctx.save();
    ctx.translate(Math.sin(time * 87) * shake, Math.cos(time * 102) * shake);
    for (const gem of state.gems) {
      const size = 6 + Math.sin(time * 6 + gem.phase);
      ctx.fillStyle = '#77ffc0';
      ctx.shadowColor = '#77ffc0';
      ctx.shadowBlur = 12;
      polygon(ctx, 4, size, 0, gem.x, gem.y);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const enemy of state.enemies) drawEnemy(ctx, enemy);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#65ffee';
    ctx.shadowColor = '#65ffee';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    for (const bullet of state.bullets) line(ctx, bullet.x, bullet.y, bullet.x - bullet.vx * 0.025, bullet.y - bullet.vy * 0.025);
    ctx.shadowBlur = 0;

    for (const particle of state.particles) {
      ctx.globalAlpha = particle.life / particle.max;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 3, 3);
    }
    ctx.globalAlpha = 1;
    if (player.hp > 0) drawShip(ctx, player.x, player.y, player.angle, 1, player.invincible > 0 && Math.floor(time * 18) % 2 === 0);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c2fff5';
    for (const label of state.labels) {
      ctx.globalAlpha = Math.min(1, label.life * 3);
      ctx.fillText(label.value, label.x, label.y);
    }
    ctx.restore();
    if (player.invincible > 0.65 && player.hp > 0) {
      ctx.strokeStyle = '#ff5c9777';
      ctx.lineWidth = 7;
      ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);
    }
  }

  return { draw };
}
