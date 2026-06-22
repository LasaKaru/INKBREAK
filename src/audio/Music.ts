/**
 * Procedural music engine. A tiny self-scheduling step sequencer over the same
 * AudioContext as the SFX, in a dark minimal palette. A single `intensity`
 * (0..1) drives tempo, layering and volume so the score swells with combat and
 * peaks during the boss — all synthesized, no audio files.
 */
export class Music {
  private step = 0;
  private playing = false;
  private intensity = 0.2;
  private target = 0.2;

  // A2-rooted natural-minor scale (semitone offsets), dark and monochrome.
  private root = 55; // A1 in Hz-ish base; we compute freq from semitone below
  private scale = [0, 2, 3, 5, 7, 8, 10, 12];

  constructor(private ctx: AudioContext, private out: GainNode) {}

  start() {
    if (this.playing) return;
    this.playing = true;
    this.schedule();
  }

  stop() {
    this.playing = false;
  }

  setIntensity(x: number) {
    this.target = Math.max(0, Math.min(1, x));
  }

  private freq(semi: number) {
    return this.root * Math.pow(2, semi / 12);
  }

  private bpm() {
    return 72 + this.intensity * 64; // 72 → 136
  }

  private voice(freq: number, dur: number, type: OscillatorType, gain: number) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, cutoff: number) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.out);
    src.start();
  }

  private schedule = () => {
    if (!this.playing) return;
    // ease intensity toward target
    this.intensity += (this.target - this.intensity) * 0.08;

    const i = this.intensity;
    const vol = 0.04 + i * 0.18;
    const s = this.step;

    // --- bass: root / fifth on the beat ---
    if (s % 2 === 0) {
      const deg = s % 8 === 0 ? 0 : s % 8 === 4 ? 7 : 0;
      this.voice(this.freq(deg) / 2, 0.42, "triangle", vol * 1.1);
    }

    // --- arpeggio (intensity > 0.28) ---
    if (i > 0.28 && s % 1 === 0) {
      const note = this.scale[(s * 3) % this.scale.length];
      this.voice(this.freq(note + 12), 0.16, "sawtooth", vol * 0.5);
    }

    // --- percussion drive (intensity > 0.5) ---
    if (i > 0.5 && s % 2 === 1) this.noise(0.06, vol * 0.6, 3000);

    // --- tension pad / high harmony (boss-tier, intensity > 0.8) ---
    if (i > 0.8 && s % 8 === 2) {
      const note = this.scale[(s * 5) % this.scale.length];
      this.voice(this.freq(note + 24), 0.5, "sine", vol * 0.4);
    }

    this.step = (s + 1) % 64;
    const stepDur = 60 / this.bpm() / 2; // eighth notes
    setTimeout(this.schedule, stepDur * 1000);
  };
}
