/** Keyboard + mouse input with pointer-lock-style mouse aiming. */
export class Input {
  keys: Record<string, boolean> = {};
  mouseDown = false;
  rightDown = false;
  // accumulated mouse movement (used for camera yaw)
  mouseDX = 0;
  mouseDY = 0;
  pointerLocked = false;

  // edge-triggered presses, consumed once
  private pressed: Record<string, boolean> = {};
  clickedThisFrame = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      if (k === " ") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.clickedThisFrame = true;
      }
      if (e.button === 2) this.rightDown = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    document.addEventListener("mousemove", (e) => {
      if (this.pointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
  }

  requestLock() {
    this.canvas.requestPointerLock?.();
  }

  /** True once per physical key press. */
  consumePress(k: string): boolean {
    if (this.pressed[k]) {
      this.pressed[k] = false;
      return true;
    }
    return false;
  }

  /** Read & reset accumulated mouse delta. */
  takeMouseDelta(): [number, number] {
    const d: [number, number] = [this.mouseDX, this.mouseDY];
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  endFrame() {
    this.clickedThisFrame = false;
    this.pressed = {};
  }
}
