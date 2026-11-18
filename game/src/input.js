export function createInput(canvas) {
  const pressed = new Set();
  let firing = false;
  let aimX = canvas.width * 0.75;
  let aimY = canvas.height / 2;

  function aim(event) {
    const bounds = canvas.getBoundingClientRect();
    aimX = (event.clientX - bounds.left) * canvas.width / bounds.width;
    aimY = (event.clientY - bounds.top) * canvas.height / bounds.height;
  }

  window.addEventListener('keydown', event => pressed.add(event.code));
  window.addEventListener('keyup', event => pressed.delete(event.code));
  window.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    aim(event);
    firing = true;
  });
  window.addEventListener('pointerup', event => {
    if (event.button === 0) firing = false;
  });
  window.addEventListener('pointercancel', () => { firing = false; });
  function clear() {
    pressed.clear();
    firing = false;
  }
  window.addEventListener('blur', clear);

  return {
    clear,
    read() {
      return {
        x: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
        y: Number(pressed.has('KeyS') || pressed.has('ArrowDown')) - Number(pressed.has('KeyW') || pressed.has('ArrowUp')),
        aimX, aimY, fire: firing || pressed.has('Space'),
      };
    },
  };
}
