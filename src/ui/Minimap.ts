/**
 * A small top-down radar in the corner. Player-centred, north-up, clipped to a
 * circle. Pure 2D canvas in the monochrome cartoon style: white field, black
 * marks. Fed each frame from the Game.
 */
export interface Blip {
  x: number;
  z: number;
  kind: "enemy" | "flyer" | "boss" | "shrine" | "door";
}

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 170;
  private r: number;

  constructor() {
    this.canvas = document.getElementById("minimap") as HTMLCanvasElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.scale(dpr, dpr);
    this.r = this.size / 2;
  }

  /** @param range world half-extent the radar covers. */
  update(px: number, pz: number, facing: number, blips: Blip[], range: number) {
    const c = this.ctx;
    const r = this.r;
    const scale = (r - 10) / range;

    c.clearRect(0, 0, this.size, this.size);

    // field
    c.beginPath();
    c.arc(r, r, r - 2, 0, Math.PI * 2);
    c.fillStyle = "rgba(244,243,239,0.82)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "#14110f";
    c.stroke();

    // clip to the dial
    c.save();
    c.beginPath();
    c.arc(r, r, r - 3, 0, Math.PI * 2);
    c.clip();

    // faint cross-hairs
    c.strokeStyle = "rgba(20,17,15,0.18)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(r, 6); c.lineTo(r, this.size - 6);
    c.moveTo(6, r); c.lineTo(this.size - 6, r);
    c.stroke();

    for (const b of blips) {
      const dx = (b.x - px) * scale;
      const dz = (b.z - pz) * scale;
      const x = r + dx;
      const y = r + dz; // north-up: +z is down
      c.fillStyle = "#14110f";
      c.strokeStyle = "#14110f";
      c.lineWidth = 1.5;
      if (b.kind === "boss") {
        c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke();
      } else if (b.kind === "shrine") {
        c.strokeRect(x - 3.5, y - 3.5, 7, 7);
      } else if (b.kind === "door") {
        c.beginPath();
        c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y);
        c.closePath(); c.stroke();
      } else if (b.kind === "flyer") {
        c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.stroke(); // hollow = airborne
      } else {
        c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
      }
    }

    // player arrow at centre, pointing along the facing vector
    // facing = atan2(dirX, dirZ) so world dir = (sin, cos); map copies world axes
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    const px2 = -fz; // perpendicular
    const pz2 = fx;
    c.fillStyle = "#14110f";
    c.beginPath();
    c.moveTo(r + fx * 8, r + fz * 8); // tip
    c.lineTo(r + px2 * 5 - fx * 4, r + pz2 * 5 - fz * 4);
    c.lineTo(r - px2 * 5 - fx * 4, r - pz2 * 5 - fz * 4);
    c.closePath();
    c.fill();
    c.restore();
  }
}
