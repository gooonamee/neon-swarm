import { STEP } from './config.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { createSound } from './sound.js';
import { createWorld } from './world.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const configuredSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(configuredSeed) ? configuredSeed : shot ? 1 : Math.floor(Math.random() * 2 ** 32);
const element = id => document.getElementById(id);
const canvas = element('arena');
const renderer = createRenderer(canvas);
const audio = createSound();
const world = createWorld(seed, audio.play);
const overlays = ['title', 'paused', 'upgrade', 'over'].map(element);
const hud = element('hud');
const pause = element('pause');
const sound = element('sound');

const readout = Object.fromEntries([
  'score', 'time', 'kills', 'health', 'hp', 'level', 'experience', 'xp',
  'final-score', 'final-time', 'final-kills',
].map(id => [id, element(id)]));

let screen = 'title';
let accumulator = 0;
let lastHud = '';

function formatTime(seconds) {
  const whole = Math.floor(seconds + 1e-8);
  return [Math.floor(whole / 60), whole % 60].map(value => String(value).padStart(2, '0')).join(':');
}

function updateHud() {
  const { score, time, kills, level, xp, goal, player } = world.state;
  const clock = formatTime(time);
  const key = [score, clock, kills, level, xp, goal, player.hp, player.maxHp].join('|');
  if (key === lastHud) return;
  lastHud = key;
  readout.score.textContent = String(score).padStart(6, '0');
  readout.time.textContent = clock;
  readout.kills.textContent = String(kills).padStart(2, '0');
  readout.health.textContent = player.hp + ' / ' + player.maxHp;
  readout.hp.style.width = player.hp / player.maxHp * 100 + '%';
  readout.level.textContent = 'LEVEL ' + level;
  readout.experience.textContent = xp + ' / ' + goal + ' XP';
  readout.xp.style.width = Math.min(100, xp / goal * 100) + '%';
}

function show(next) {
  screen = next;
  accumulator = 0;
  document.body.dataset.screen = screen;
  hud.hidden = screen === 'title';
  pause.disabled = screen !== 'play' && screen !== 'paused';
  for (const overlay of overlays) overlay.hidden = overlay.id !== screen;
  if (screen === 'over') {
    const { score, time, kills } = world.state;
    readout['final-score'].textContent = String(score).padStart(6, '0');
    readout['final-time'].textContent = formatTime(time);
    readout['final-kills'].textContent = String(kills).padStart(2, '0');
  }
  updateHud();
}

function paint() {
  renderer.draw(world.state, screen);
}

function runShot() {
  show(stageShot(shot, world));
  requestAnimationFrame(() => {
    paint();
    requestAnimationFrame(() => {
      paint();
      window.__shotReady = true;
    });
  });
}

function runGame() {
  const input = createInput(canvas);
  let last = performance.now();

  function start() {
    audio.unlock();
    world.reset();
    show('play');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  function togglePause() {
    if (screen === 'play') {
      input.clear();
      show('paused');
    } else if (screen === 'paused') {
      audio.unlock();
      show('play');
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  }

  function toggleSound() {
    audio.unlock();
    const muted = audio.toggle();
    sound.firstChild.textContent = muted ? 'SOUND OFF ' : 'SOUND ON ';
    sound.setAttribute('aria-pressed', String(muted));
  }

  function choose(index) {
    if (!world.state.choices[index]) return;
    world.choose(index);
    show('play');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  function offerUpgrades() {
    element('upgrade-level').textContent = 'LEVEL ' + world.state.level + ' REACHED';
    const buttons = world.state.choices.map((upgrade, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      const key = document.createElement('kbd');
      key.textContent = index + 1;
      const name = document.createElement('b');
      name.textContent = upgrade.name;
      const detail = document.createElement('span');
      detail.textContent = upgrade.detail;
      button.append(key, name, detail);
      button.addEventListener('click', () => choose(index));
      return button;
    });
    element('choices').replaceChildren(...buttons);
    input.clear();
    show('upgrade');
    buttons[0].focus({ preventScroll: true });
  }

  element('title').addEventListener('click', start);
  element('over').addEventListener('click', start);
  element('resume').addEventListener('click', togglePause);
  pause.addEventListener('click', togglePause);
  sound.addEventListener('click', toggleSound);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') togglePause();
  });
  window.addEventListener('keydown', event => {
    if (event.code.startsWith('Arrow') || (screen === 'play' && event.code === 'Space')) event.preventDefault();
    if (event.repeat) return;
    if (screen === 'title' && event.code === 'Enter') {
      event.preventDefault();
      start();
    } else if (screen === 'over' && event.code === 'KeyR') start();
    else if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
    else if (event.code === 'KeyM') toggleSound();
    else if (screen === 'upgrade' && /^(Digit|Numpad)[123]$/.test(event.code)) choose(Number(event.code.at(-1)) - 1);
  });

  function frame(now) {
    if (screen === 'play') {
      accumulator += Math.min(0.1, (now - last) / 1000);
      while (accumulator >= STEP && screen === 'play') {
        accumulator -= STEP;
        world.step(STEP, input.read());
        if (world.state.player.hp <= 0) show('over');
        else if (world.state.choices.length) offerUpgrades();
      }
      updateHud();
      paint();
    }
    last = now;
    requestAnimationFrame(frame);
  }

  show('title');
  paint();
  requestAnimationFrame(frame);
}

if (shot) runShot();
else runGame();
