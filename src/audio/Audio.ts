/**
 * Tiny procedural sound engine (WebAudio). Synthesizes all SFX so the game
 * needs no audio files. Dark, percussive, lo-fi tones that suit the ink mood.
 */
import { Music } from "./Music";

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  enabled = true;
  music: Music | null = null;

  private volume = 0.6;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    // dedicated, slightly quieter bus for the score
    const musicBus = this.ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(this.master);
    this.music = new Music(this.ctx, musicBus);
  }

  startMusic() {
    this.music?.start();
  }
  setMusicIntensity(x: number) {
    this.music?.setIntensity(x);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private now() {
    return this.ctx!.currentTime;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number
  ) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.now() + dur);
    g.gain.setValueAtTime(gain, this.now());
    g.gain.exponentialRampToValueAtTime(0.001, this.now() + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.now() + dur + 0.02);
  }

  private noise(dur: number, gain: number, filterFreq = 1200) {
    if (!this.ctx || !this.enabled) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  shoot() {
    this.tone(420, 0.12, "square", 0.18, 90);
    this.noise(0.12, 0.2, 2400);
  }
  slash() {
    this.tone(900, 0.18, "sawtooth", 0.12, 220);
    this.noise(0.16, 0.15, 4000);
  }
  block() {
    this.tone(300, 0.18, "triangle", 0.2, 180);
  }
  counter() {
    this.tone(180, 0.3, "sawtooth", 0.22, 600);
    this.noise(0.2, 0.18, 800);
  }
  hit() {
    this.tone(120, 0.22, "sine", 0.25, 50);
    this.noise(0.18, 0.22, 600);
  }
  death() {
    this.tone(90, 0.5, "sawtooth", 0.25, 30);
    this.noise(0.5, 0.25, 400);
  }
  hurt() {
    this.tone(160, 0.3, "square", 0.2, 60);
  }
  dash() {
    this.tone(600, 0.2, "sine", 0.15, 1400);
    this.noise(0.2, 0.1, 3000);
  }
  wave() {
    this.tone(220, 0.6, "triangle", 0.2, 440);
  }
}
