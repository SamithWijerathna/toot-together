/**
 * Procedural Web Audio Sound Synthesizer for Toot Together
 * Zero external audio dependencies - 100% generated in real-time.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  public masterVolume: number = 0.8;
  public sfxVolume: number = 0.9;
  public musicVolume: number = 0.4;
  public isMuted: boolean = false;

  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;
  private musicStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master?: number, sfx?: number, music?: number, muted?: boolean) {
    if (master !== undefined) this.masterVolume = master;
    if (sfx !== undefined) this.sfxVolume = sfx;
    if (music !== undefined) this.musicVolume = music;
    if (muted !== undefined) this.isMuted = muted;

    if (this.masterGain && this.sfxGain && this.musicGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  /**
   * Procedural Comic Fart Sound Generator
   * Uses FM modulated low frequency sawtooth/square waves + bandpass filtered noise
   */
  public playFart(pitchMod: number = 1.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const duration = 0.35 + Math.random() * 0.35; // 0.35 - 0.7s
    const baseFreq = (75 + Math.random() * 45) * pitchMod; // ~75-120Hz

    // 1. Primary Low-Frequency Flap Oscillator (Sawtooth)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, t);
    // Comic pitch slide down
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + duration);

    // 2. Modulator oscillator for intestinal rumble (FM vibrato)
    const modOsc = this.ctx.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(25 + Math.random() * 20, t);
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(baseFreq * 0.8, t);
    modGain.gain.linearRampToValueAtTime(0, t + duration);
    modOsc.connect(osc.frequency);

    // 3. Noise generator for the airy "poof/gas" texture
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320, t);
    noiseFilter.Q.setValueAtTime(3.0, t);
    noiseFilter.frequency.linearRampToValueAtTime(140, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // 4. Low-pass filter for the osc
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(450, t);
    lowpass.frequency.linearRampToValueAtTime(180, t + duration);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(lowpass);
    lowpass.connect(oscGain);

    // Connect both to sfx output
    oscGain.connect(this.sfxGain);
    noiseGain.connect(this.sfxGain);

    // Start & Stop
    osc.start(t);
    modOsc.start(t);
    noise.start(t);

    osc.stop(t + duration);
    modOsc.stop(t + duration);
    noise.stop(t + duration);
  }

  /**
   * Jump whoosh sound
   */
  public playJump() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Land thud sound
   */
  public playLand(intensity: number = 1.0) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(Math.min(0.4 * intensity, 0.6), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Trampoline / Bounce Pad boing sound
   */
  public playBounce() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.28);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.38);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Ragdoll stumble / slip sound
   */
  public playSlip() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  /**
   * Checkpoint ding sound
   */
  public playCheckpoint() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  /**
   * Button click / switch activation
   */
  public playClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Footstep sound
   */
  public playFootstep() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 90 + Math.random() * 30;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Cheerful, Funky Background Arcade BGM Synthesizer
   */
  public startMusic() {
    if (this.isMusicPlaying) return;
    this.initContext();
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // Upbeat C pentatonic / funky chord progression
    const bassNotes = [130.81, 130.81, 164.81, 196.00, 146.83, 146.83, 174.61, 220.00]; // C3, E3, G3, D3, F3, A3
    const leadNotes = [523.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 523.25, 587.33, 0, 659.25, 523.25, 440.00, 0, 523.25, 392.00];

    const stepIntervalMs = 150; // ~100 BPM 16th notes

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted || !this.isMusicPlaying) return;

      const t = this.ctx.currentTime;
      const step = this.musicStep;

      // Bass on 8th notes
      if (step % 2 === 0) {
        const bassIdx = Math.floor(step / 4) % bassNotes.length;
        const bFreq = bassNotes[bassIdx];
        if (bFreq > 0) {
          const bOsc = this.ctx.createOscillator();
          const bGain = this.ctx.createGain();
          bOsc.type = 'triangle';
          bOsc.frequency.setValueAtTime(bFreq * 0.5, t);
          bGain.gain.setValueAtTime(0.18, t);
          bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          bOsc.connect(bGain);
          bGain.connect(this.musicGain);
          bOsc.start(t);
          bOsc.stop(t + 0.24);
        }
      }

      // Funky Lead arpeggio
      const lFreq = leadNotes[step % leadNotes.length];
      if (lFreq > 0) {
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'sine';
        lOsc.frequency.setValueAtTime(lFreq, t);
        lGain.gain.setValueAtTime(0.08, t);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        lOsc.connect(lGain);
        lGain.connect(this.musicGain);
        lOsc.start(t);
        lOsc.stop(t + 0.14);
      }

      // Hi-hat noise tap on 8ths
      if (step % 2 === 1) {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
        const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) out[i] = (Math.random() * 2 - 1) * 0.04;
        const hat = this.ctx.createBufferSource();
        hat.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        hat.connect(filter);
        filter.connect(this.musicGain);
        hat.start(t);
        hat.stop(t + 0.04);
      }

      this.musicStep++;
    }, stepIntervalMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
