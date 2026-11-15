// Keyboard and mouse state, in arena coordinates. The canvas scales the fixed
// 1280x720 field to the window, so mouse positions are mapped back through it.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 360;
    this.mouseDown = false;
    this.pressed = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (event) => this.updateMouse(event));
    canvas.addEventListener('mousedown', (event) => {
      this.updateMouse(event);
      this.mouseDown = true;
      if (!event.repeat) this.pressed.add('Mouse');
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  updateMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    this.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  }

  /** True only on the frame the key or click went down; consumed by endFrame. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  down(code) {
    return this.keys.has(code);
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
  }
}
