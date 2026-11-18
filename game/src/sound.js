const VOICES = {
  shoot: [[640, 245, 0.075, 0.025, 'triangle']],
  hit: [[210, 120, 0.08, 0.048, 'square']],
  explosion: [[130, 38, 0.17, 0.07, 'sawtooth']],
  pickup: [[640, 1140, 0.12, 0.035, 'sine']],
  level: [[392, 392, 0.17, 0.05, 'triangle'], [523, 523, 0.17, 0.05, 'triangle', 0.08], [784, 784, 0.23, 0.06, 'triangle', 0.16]],
  hurt: [[180, 44, 0.24, 0.10, 'sawtooth']],
};

export function createSound() {
  let context;
  let bus;
  let muted = false;
  const last = new Map();

  function unlock() {
    if (!window.AudioContext) return;
    if (!context) {
      context = new AudioContext();
      bus = context.createGain();
      bus.gain.value = muted ? 0 : 0.65;
      bus.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function toggle() {
    muted = !muted;
    if (bus) bus.gain.value = muted ? 0 : 0.65;
    return muted;
  }

  function play(name) {
    if (muted || context?.state !== 'running') return;
    const now = context.currentTime;
    if (now - (last.get(name) ?? -1) < 0.035) return;
    last.set(name, now);
    for (const [start, end, duration, volume, type, delay = 0] of VOICES[name]) {
      const when = now + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(start, when);
      oscillator.frequency.exponentialRampToValueAtTime(end, when + duration);
      gain.gain.setValueAtTime(0.001, when);
      gain.gain.exponentialRampToValueAtTime(volume, when + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
      oscillator.connect(gain).connect(bus);
      oscillator.start(when);
      oscillator.stop(when + duration);
    }
  }
  return { unlock, toggle, play };
}
