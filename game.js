// ============================================================================
// FISTS OF DOOM: TORONTO — DEFENDER OF THE 6IX
// ============================================================================

// --- HUD ANNOUNCEMENT SYSTEM (Available immediately across all modules) ---
var announcementTimer = null;
function showAnnouncement(text, duration = 2400) {
  const ann = document.getElementById('announcement');
  if (!ann) return;
  ann.innerText = text;
  ann.classList.add('show');
  if (announcementTimer) clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => {
    const el = document.getElementById('announcement');
    if (el) el.classList.remove('show');
  }, duration);
}
if (typeof window !== 'undefined') window.showAnnouncement = showAnnouncement;

// --- ENHANCED AUDIO SYNTHESIZER (Industrial Metal Riffs & Visceral FX) ---
class EnhancedRetroAudio {
  constructor() {
    this.ctx = null;
    const params = (typeof window !== 'undefined' && window.location) ? new URLSearchParams(window.location.search) : null;
    this.isMuted = params ? (params.get('muted') === '1' || params.get('mute') === '1') : false;
    this.musicTimer = null;
    this.isOCanada = false;
    this.oCanadaTimer = null;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
      this.stopOCanada();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.startMusic();
    }
    const muteBtn = document.getElementById('audio-mute-btn');
    if (muteBtn) {
      muteBtn.innerHTML = this.isMuted ? '🔇 MUTED <span class="ai-key-hint">[M]</span>' : '🔊 SOUND <span class="ai-key-hint">[M]</span>';
      muteBtn.classList.toggle('active', this.isMuted);
    }
    return this.isMuted;
  }

  init() {
    if (this.isMuted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.startMusic();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPunch(power = 1, isBerserk = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Punch whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isBerserk ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(320 * power, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.14);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playImpact(type = 'punch') {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Meaty sub-bass boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';

    // Crunchy bone noise
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();

    if (type === 'kick') {
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
      oscGain.gain.setValueAtTime(0.9, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      noiseGain.gain.setValueAtTime(0.7, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    } else if (type === 'heavy') {
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
      oscGain.gain.setValueAtTime(1.0, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    } else if (type === 'slam') {
      // Massive earthquake ground boom
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(18, t + 0.7);
      oscGain.gain.setValueAtTime(1.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
      noiseGain.gain.setValueAtTime(1.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    } else if (type === 'glory') {
      // Brutal squelch / execution snap
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      oscGain.gain.setValueAtTime(1.1, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      noiseGain.gain.setValueAtTime(1.0, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    } else {
      // Standard punch
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
      oscGain.gain.setValueAtTime(0.65, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    }

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.75);
    noise.start(t);
  }

  playHockeySlapshot() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Sharp composite wood crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);

    // 2. High-impact noise slap (puck / slapshot impact)
    const bufSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.55, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    noise.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t);

    // 3. Deep bass reverberation
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.28);
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.3);
  }

  playCrateSmash() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.28);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.8);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  playPenaltySound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.setValueAtTime(105, t + 0.12);
    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playCivilianGasp() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.24);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playRobotClank() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1250, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.18);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playAlienScreech() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const outGain = this.ctx.createGain();

    carrier.type = 'sawtooth';
    modulator.type = 'sine';
    carrier.frequency.setValueAtTime(680, t);
    carrier.frequency.exponentialRampToValueAtTime(240, t + 0.45);

    modulator.frequency.setValueAtTime(45, t);
    modGain.gain.setValueAtTime(340, t);
    modGain.gain.exponentialRampToValueAtTime(20, t + 0.45);

    outGain.gain.setValueAtTime(0.75, t);
    outGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(outGain);
    outGain.connect(this.ctx.destination);

    modulator.start(t);
    carrier.start(t);
    modulator.stop(t + 0.48);
    carrier.stop(t + 0.48);
  }

  playPickup() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const chords = [330, 440, 554.37, 659.25, 880];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.19);
    });
  }

  playMissionFanfare() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.35, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.38);
    });
  }

  playBerserkRage() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.4);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  startMusic() {
    if (this.musicTimer || !this.ctx || this.isOCanada) return;
    // Heavy Industrial Bass & Kick/Snare pattern (DOOM style)
    const tempo = 132;
    const beat = 60 / tempo;
    const bassline = [36, 36, 39, 36, 42, 36, 39, 38];
    let step = 0;

    const tick = () => {
      if (!this.ctx || this.ctx.state !== 'running' || this.isOCanada || this.isMuted) return;
      const t = this.ctx.currentTime;

      // Heavy Kick on beat 0, 2
      if (step % 4 === 0) {
        const kOsc = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kOsc.frequency.setValueAtTime(130, t);
        kOsc.frequency.exponentialRampToValueAtTime(35, t + 0.09);
        kGain.gain.setValueAtTime(0.25, t);
        kGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
        kOsc.connect(kGain);
        kGain.connect(this.ctx.destination);
        kOsc.start(t);
        kOsc.stop(t + 0.1);
      }

      // Snare on beat 2, 6
      if (step % 8 === 4) {
        const sBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
        const sData = sBuf.getChannelData(0);
        for (let i = 0; i < sData.length; i++) sData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
        const sNoise = this.ctx.createBufferSource();
        sNoise.buffer = sBuf;
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.18, t);
        sGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        sNoise.connect(sGain);
        sGain.connect(this.ctx.destination);
        sNoise.start(t);
      }

      // Distorted Guitar Bass
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      const note = bassline[step % bassline.length];
      const freq = 440 * Math.pow(2, (note - 69) / 12);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + beat * 0.45);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + beat * 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + beat * 0.48);

      step++;
    };

    this.musicTimer = setInterval(tick, (beat / 2) * 1000);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  startOCanada() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();
    this.stopOCanada();
    this.isOCanada = true;

    // "O Canada" National Anthem in E♭ Major (+3 semitones from C Major)
    // 4/4 Time, 88 BPM Marching Cadence
    // Measure-by-Measure Timing Grid matching official vocal/band score:
    const O_CANADA_MELODY = [
      // Bar 1: "O Canada! Our home and native land!"
      { note: 67, len: 2, bass: 39, chord: 51 },  // G4
      { note: 70, len: 1.5, bass: 39, chord: 51 },  // Bb4
      { note: 70, len: 0.5, bass: 39, chord: 51 },  // Bb4
      { note: 63, len: 3, bass: 39, chord: 51 },  // Eb4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 68, len: 1, bass: 41, chord: 53 },  // Ab4
      { note: 70, len: 1, bass: 39, chord: 51 },  // Bb4
      { note: 72, len: 1, bass: 44, chord: 56 },  // C5
      { note: 65, len: 4, bass: 46, chord: 58 },  // F4
      // Bar 5: "True patriot love in all of us command."
      { note: 67, len: 2, bass: 39, chord: 51 },  // G4
      { note: 69, len: 1.5, bass: 41, chord: 53 },  // A4
      { note: 69, len: 0.5, bass: 41, chord: 53 },  // A4
      { note: 70, len: 3, bass: 46, chord: 58 },  // Bb4
      { note: 72, len: 1, bass: 41, chord: 53 },  // C5
      { note: 74, len: 1, bass: 46, chord: 58 },  // D5
      { note: 74, len: 1, bass: 46, chord: 58 },  // D5
      { note: 72, len: 1, bass: 41, chord: 53 },  // C5
      { note: 72, len: 1, bass: 41, chord: 53 },  // C5
      // Bar 8: last 2 notes = pickup into "With glowing hearts ... The True North strong and free!"
      { note: 70, len: 3, bass: 46, chord: 58 },  // Bb4
      { note: 65, len: 0.75, bass: 46, chord: 58 }, // F4
      { note: 67, len: 0.25, bass: 46, chord: 58 }, // G4
      { note: 68, len: 1.5, bass: 46, chord: 58 },  // Ab4
      { note: 67, len: 0.5, bass: 46, chord: 58 },  // G4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 67, len: 0.75, bass: 46, chord: 58 }, // G4
      { note: 68, len: 0.25, bass: 46, chord: 58 }, // Ab4
      { note: 70, len: 1.5, bass: 39, chord: 51 },  // Bb4
      { note: 68, len: 0.5, bass: 39, chord: 51 },  // Ab4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 68, len: 0.75, bass: 39, chord: 51 }, // Ab4
      { note: 70, len: 0.25, bass: 39, chord: 51 }, // Bb4
      { note: 72, len: 1, bass: 44, chord: 56 },  // C5
      { note: 70, len: 1, bass: 39, chord: 51 },  // Bb4
      { note: 68, len: 1, bass: 46, chord: 58 },  // Ab4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      // Bar 12: last 2 notes = pickup into "From far and wide ... We stand on guard for thee."
      { note: 65, len: 3, bass: 46, chord: 58 },  // F4
      { note: 65, len: 0.75, bass: 46, chord: 58 }, // F4
      { note: 67, len: 0.25, bass: 46, chord: 58 }, // G4
      { note: 68, len: 1.5, bass: 46, chord: 58 },  // Ab4
      { note: 67, len: 0.5, bass: 46, chord: 58 },  // G4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 67, len: 0.75, bass: 46, chord: 58 }, // G4
      { note: 68, len: 0.25, bass: 46, chord: 58 }, // Ab4
      { note: 70, len: 1.5, bass: 39, chord: 51 },  // Bb4
      { note: 68, len: 0.5, bass: 39, chord: 51 },  // Ab4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 70, len: 1, bass: 46, chord: 58 },  // Bb4
      { note: 70, len: 0.5, bass: 41, chord: 53 },  // Bb4
      { note: 69, len: 0.5, bass: 41, chord: 53 },  // A4
      { note: 67, len: 0.5, bass: 41, chord: 53 },  // G4
      { note: 69, len: 0.5, bass: 41, chord: 53 },  // A4
      { note: 70, len: 4, bass: 46, chord: 58 },  // Bb4
      // Bar 17: "God keep our land glorious and free!"
      { note: 67, len: 2, bass: 39, chord: 51 },  // G4
      { note: 70, len: 1.5, bass: 39, chord: 51 },  // Bb4
      { note: 70, len: 0.5, bass: 39, chord: 51 },  // Bb4
      { note: 63, len: 4, bass: 48, chord: 60 },  // Eb4
      { note: 68, len: 2, bass: 44, chord: 56 },  // Ab4
      { note: 72, len: 1.5, bass: 44, chord: 56 },  // C5
      { note: 72, len: 0.5, bass: 44, chord: 56 },  // C5
      { note: 65, len: 4, bass: 46, chord: 58 },  // F4
      // Bar 21: "O Canada, we stand on guard for thee."
      { note: 70, len: 2, bass: 39, chord: 51 },  // Bb4
      { note: 71, len: 1.5, bass: 43, chord: 55 },  // B4
      { note: 71, len: 0.5, bass: 43, chord: 55 },  // B4
      { note: 72, len: 1, bass: 48, chord: 60 },  // C5
      { note: 68, len: 1, bass: 41, chord: 53 },  // Ab4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 63, len: 2, bass: 39, chord: 51 },  // Eb4
      { note: 65, len: 2, bass: 46, chord: 58 },  // F4
      { note: 67, len: 4, bass: 39, chord: 51 },  // G4
      // Bar 25: "O Canada, we stand on guard for thee." (final)
      { note: 70, len: 2, bass: 39, chord: 51 },  // Bb4
      { note: 75, len: 1.5, bass: 43, chord: 55 },  // Eb5
      { note: 75, len: 0.5, bass: 43, chord: 55 },  // Eb5
      { note: 72, len: 1, bass: 44, chord: 56 },  // C5
      { note: 68, len: 1, bass: 41, chord: 53 },  // Ab4
      { note: 67, len: 1, bass: 39, chord: 51 },  // G4
      { note: 65, len: 1, bass: 46, chord: 58 },  // F4
      { note: 70, len: 2, bass: 39, chord: 51 },  // Bb4
      { note: 62, len: 2, bass: 46, chord: 58 },  // D4
      { note: 63, len: 4, bass: 39, chord: 51 }   // Eb4
    ];

    const beatDur = 60 / 88;
    let idx = 0;

    const playStep = () => {
      if (!this.isOCanada || !this.ctx || this.ctx.state !== 'running') return;
      const cur = O_CANADA_MELODY[idx % O_CANADA_MELODY.length];
      const dur = cur.len * beatDur;
      const t = this.ctx.currentTime;

      // Heroic dual-oscillator lead with fat chorus
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      const f = 440 * Math.pow(2, (cur.note - 69) / 12);
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(f, t);

      o2.type = 'square';
      o2.frequency.setValueAtTime(f * 1.004, t);

      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1800, t);
      filt.frequency.exponentialRampToValueAtTime(800, t + dur * 0.9);

      g.gain.setValueAtTime(0.22, t);
      g.gain.setValueAtTime(0.20, t + dur * 0.85);
      g.gain.exponentialRampToValueAtTime(0.005, t + dur * 0.98);

      o1.connect(filt);
      o2.connect(filt);
      filt.connect(g);
      g.connect(this.ctx.destination);

      o1.start(t);
      o2.start(t);
      o1.stop(t + dur);
      o2.stop(t + dur);

      // Harmony chord
      if (cur.chord) {
        const co = this.ctx.createOscillator();
        const cg = this.ctx.createGain();
        co.type = 'sawtooth';
        co.frequency.setValueAtTime(440 * Math.pow(2, (cur.chord - 69) / 12), t);
        cg.gain.setValueAtTime(0.08, t);
        cg.gain.exponentialRampToValueAtTime(0.005, t + dur * 0.9);
        co.connect(cg);
        cg.connect(this.ctx.destination);
        co.start(t);
        co.stop(t + dur);
      }

      // Heavy bass note
      if (cur.bass) {
        const bo = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        bo.type = 'triangle';
        bo.frequency.setValueAtTime(440 * Math.pow(2, (cur.bass - 69) / 12), t);
        bg.gain.setValueAtTime(0.22, t);
        bg.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.85);
        bo.connect(bg);
        bg.connect(this.ctx.destination);
        bo.start(t);
        bo.stop(t + dur);
      }

      // Stadium rock kick drum
      const ko = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      ko.frequency.setValueAtTime(140, t);
      ko.frequency.exponentialRampToValueAtTime(36, t + 0.12);
      kg.gain.setValueAtTime(0.28, t);
      kg.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      ko.connect(kg);
      kg.connect(this.ctx.destination);
      ko.start(t);
      ko.stop(t + 0.13);

      idx++;
      this.oCanadaTimer = setTimeout(playStep, dur * 1000);
    };

    playStep();
  }

  stopOCanada() {
    this.isOCanada = false;
    if (this.oCanadaTimer) {
      clearTimeout(this.oCanadaTimer);
      this.oCanadaTimer = null;
    }
  }

  playPeaceChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.2, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.48);
      });
    } catch (err) { }
  }

  playWalkSignal(dist = 0, isEastWest = true) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const vol = Math.min(0.22, 0.45 / (1 + dist * 0.12));
      if (vol < 0.01) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      if (isEastWest) {
        // High rapid chirp
        osc.frequency.setValueAtTime(1150, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.08);
        osc.frequency.setValueAtTime(1150, t + 0.13);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.21);
      } else {
        // Cuckoo tone (two-tone)
        osc.frequency.setValueAtTime(950, t);
        osc.frequency.setValueAtTime(720, t + 0.11);
      }
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (err) { }
  }

  playElevatorDing() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [659.25, 880.00].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.12);
        gain.gain.setValueAtTime(0.25, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.7);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.75);
      });
    } catch (err) { }
  }

  playElevatorArrival() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.14);
        gain.gain.setValueAtTime(0.28, t + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.85);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.14);
        osc.stop(t + i * 0.14 + 0.9);
      });
    } catch (err) { }
  }

  playElevatorHum(pitch = 1.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.6);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch (err) { }
  }

  playFerryHorn() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Resonant deep brassy marine twin-tone horn (146.8 Hz and 220.0 Hz)
      [146.83, 220.00].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 1.8);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.12);
        gain.gain.setValueAtTime(0.32, t + 1.4);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 2.1);
      });
    } catch (err) { }
  }

  playFerryArrival() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Classic ship's brass bell double strike
      [0, 0.22].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, t + offset);
        gain.gain.setValueAtTime(0.3, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.7);
      });
    } catch (err) { }
  }

  playShowdownAlert() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.1);
        gain.gain.setValueAtTime(0.22, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.28);
      });
    } catch (err) { }
  }

  playShowdownVictory() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.13);
        gain.gain.setValueAtTime(0.3, t + i * 0.13);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.13);
        osc.stop(t + i * 0.13 + 0.85);
      });
    } catch (err) { }
  }

  playFireworks() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // Boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);

      // Crackle sizzle
      const node = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < buf.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      node.buffer = buf;
      const cGain = this.ctx.createGain();
      cGain.gain.setValueAtTime(0.2, t + 0.15);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      node.connect(cGain);
      cGain.connect(this.ctx.destination);
      node.start(t + 0.15);
    } catch (err) { }
  }

  playTelescopeClick() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (err) { }
  }
}

const audio = new EnhancedRetroAudio();

// ============================================================================
// ATTACK CONFIGURATION & GAME STATE
// ============================================================================
const ATTACKS = {
  JAB: {
    id: 1,
    name: 'BARE KNUCKLES',
    sub: 'RAPID JABS [L-CLICK / F]',
    damage: 30,
    range: 3.5,
    cooldown: 0.22,
    knockback: 6,
    type: 'punch',
    color: '#ffcc00'
  },
  HOOK: {
    id: 2,
    name: 'BRASS KNUCKLES',
    sub: 'THUNDER HOOK [L-CLICK / F]',
    damage: 75,
    range: 3.8,
    cooldown: 0.42,
    knockback: 16,
    type: 'heavy',
    color: '#ff5500'
  },
  KICK: {
    id: 3,
    name: 'MIGHTY BOOT',
    sub: 'FRONT KICK [L-CLICK / E]',
    damage: 100,
    range: 4.2,
    cooldown: 0.55,
    knockback: 32,
    type: 'kick',
    color: '#00f0ff'
  },
  SLAM: {
    id: 4,
    name: 'METEOR SLAM GAUNTLET',
    sub: 'JUMP + PUNCH [L-CLICK IN AIR]',
    damage: 260,
    range: 8.5, // Large AoE
    cooldown: 0.95,
    knockback: 45,
    type: 'slam',
    color: '#ea80fc'
  }
};

// ============================================================================
// DIFFICULTY CONFIGURATIONS
// ============================================================================
const DIFFICULTY_CONFIGS = {
  easy: {
    key: 'easy',
    name: 'EASY',
    sub: 'TOURIST (75% CITIZENS)',
    tagClass: 'tag-green',
    targetEnemies: 50,
    civilianRatio: 0.75,
    robotRatio: 0.18,
    snatcherRatio: 0.07,
    hpMult: 0.85,
    speedMult: 0.9,
    damageMult: 0.7,
    attackCooldownMult: 1.3,
    aggroDist: 28,
    spawnInterval: 4.5,
    maxAlive: 50
  },
  medium: {
    key: 'medium',
    name: 'MEDIUM',
    sub: 'DEFENDER (50% CITIZENS)',
    tagClass: 'tag-cyan',
    targetEnemies: 55,
    civilianRatio: 0.50,
    robotRatio: 0.35,
    snatcherRatio: 0.15,
    hpMult: 1.0,
    speedMult: 1.0,
    damageMult: 1.0,
    attackCooldownMult: 1.0,
    aggroDist: 35,
    spawnInterval: 3.5,
    maxAlive: 55
  },
  hard: {
    key: 'hard',
    name: 'HARD',
    sub: 'INVASION (25% CITIZENS)',
    tagClass: 'tag-yellow',
    targetEnemies: 65,
    civilianRatio: 0.25,
    robotRatio: 0.50,
    snatcherRatio: 0.25,
    hpMult: 1.35,
    speedMult: 1.15,
    damageMult: 1.4,
    attackCooldownMult: 0.8,
    aggroDist: 48,
    spawnInterval: 2.2,
    maxAlive: 65
  },
  impossible: {
    key: 'impossible',
    name: 'IMPOSSIBLE',
    sub: 'OVERRUN (10% CITIZENS)',
    tagClass: 'tag-red',
    targetEnemies: 88,
    civilianRatio: 0.10,
    robotRatio: 0.55,
    snatcherRatio: 0.35,
    hpMult: 1.75,
    speedMult: 1.35,
    damageMult: 1.9,
    attackCooldownMult: 0.6,
    aggroDist: 65,
    spawnInterval: 1.2,
    maxAlive: 88
  }
};
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'impossible'];

const state = {
  health: 100,
  maxHealth: 100,
  armor: 50,
  maxArmor: 100,
  score: 0,
  kills: 0,
  boxesSmashed: 0,
  totalBoxes: 8,
  difficulty: 'medium',
  spawnTimer: 0,
  activeAttack: ATTACKS.JAB,
  unlocked: {
    [ATTACKS.JAB.id]: true,
    [ATTACKS.HOOK.id]: false,
    [ATTACKS.KICK.id]: false,
    [ATTACKS.SLAM.id]: false
  },
  rage: 0,
  isBerserk: false,
  berserkTimer: 0,
  comboCount: 0,
  comboTimer: 0,
  isAttacking: false,
  attackProgress: 0,
  attackTimer: 0,
  currentAnimType: 'jab',
  attackDuration: 0.22, // length of the CURRENT animation (was wrongly read from activeAttack)
  hitStop: 0,           // brief freeze-frame on impact
  camPunch: 0,          // camera recoil on impact
  screenShake: 0,
  faceExpression: 'neutral',
  faceTimer: 0,
  inGame: false,
  isPaused: false,
  freeMouseMode: false,
  isPointerLocked: false,
  isDead: false,
  gloryTarget: null,
  // CN Tower Elevator & Observation Deck State
  inElevator: false,
  onObservationDeck: false,
  deckFloor: 1, // 1 (342m), 2 (348m), or 3 (354m)
  telescopeActive: false,
  telescopeTarget: null,
  telescopeZoomIndex: 0,
  telescopeZooms: [
    { fov: 16, label: '5X WIDE' },
    { fov: 8, label: '10X MEDIUM' },
    { fov: 4, label: '20X EXTREME' }
  ],
  telescopeBaseYaw: 0,
  telescopeBasePitch: 0,
  telescopeOffsetYaw: 0,
  telescopeOffsetPitch: 0,
  // Toronto Island Ferry & Centre Island State
  onFerry: false,
  onIsland: false,
  skyShowdownActive: false,
  skyShowdownWave: 0,
  skyShowdownTotalWaves: 3,
  skyShowdownBoss: null,
  skyShowdownCleared: false
};

// ============================================================================
// THREE.JS SETUP & 3D TORONTO OPEN-WORLD ARENA
// ============================================================================
const container = document.getElementById('game-container');
const scene = new THREE.Scene();

// Far clip increased to 4500m to render full Toronto Islands archipelago and downtown skyline across the harbour
const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.08, 4500);
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.insertBefore(renderer.domElement, container.firstChild);

// --- Filmic tone mapping: rolls off highlights instead of clipping them ---
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Image-based lighting for MeshStandardMaterial (hands, boots, fighters, crates).
// Without an environment map, metal (brass, steel) renders as flat black/grey.
function buildNightCityEnvMap(renderer) {
  const envScene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#05070f');
  grad.addColorStop(0.42, '#151f33');
  grad.addColorStop(0.5, '#1e2d42');   // crisp urban night glow on the horizon
  grad.addColorStop(0.56, '#181e28');
  grad.addColorStop(1.0, '#0a0d14');  // wet asphalt below
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 256);
  const skyTex = new THREE.CanvasTexture(c);
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })));
  // Ring of bright "windows / signs" so glossy surfaces pick up specular glints
  const panelGeo = new THREE.PlaneGeometry(5, 9);
  const cols = [0xffd59a, 0xffb36b, 0x9fd2ff, 0xffffff, 0x70a0d0, 0x63f0ff];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const m = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
    m.position.set(Math.cos(a) * 30, 2 + (i % 3) * 5, Math.sin(a) * 30);
    m.lookAt(0, 4, 0);
    envScene.add(m);
  }
  const top = new THREE.Mesh(new THREE.CircleGeometry(10, 24), new THREE.MeshBasicMaterial({ color: 0x8090c0 }));
  top.position.y = 45; top.rotation.x = Math.PI / 2;
  envScene.add(top);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  return rt.texture;
}

// --- Bloom post-processing (lit windows, neon, lamps, CN Tower LEDs glow) ---
let composer = null, bloomPass = null;
function setupPostFX() {
  if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass) return; // scripts not loaded: plain render
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  let rt;
  if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
    // keep MSAA when rendering through the composer (otherwise edges go jaggy)
    rt = new THREE.WebGLMultisampleRenderTarget(size.x, size.y, { format: THREE.RGBAFormat });
    rt.samples = 4;
  }
  composer = new THREE.EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.5, 0.8);
  composer.addPass(bloomPass);
}

// Build Toronto City from real OpenStreetMap data with CN Tower Peace Sanctuary
const city = (typeof window.buildTorontoCity === 'function') ? window.buildTorontoCity(scene) : null;
// Build Dedicated Toronto Islands Archipelago (Hanlan's, Airport, Centre, Olympic, Algonquin, Ward's)
const islands = (typeof window.buildTorontoIslands === 'function') ? window.buildTorontoIslands(scene) : null;
if (typeof window !== 'undefined') window.islands = islands;
let traffic = null;

const player = {
  pos: camera.position,
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  isGrounded: true,
  bobTimer: 0,
  speed: 7.0,
  sprintSpeed: 11.5,
  jumpStrength: 9.0
};

// Curated Toronto landmark tour index & initial player spawn
let currentTourIndex = 0;
if (city && city.start) {
  player.pos.set(city.start.x, 1.7, city.start.z);
  player.yaw = city.startYaw;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = city.startYaw;
  if (city.spawnLocations && city.start.index !== undefined) {
    currentTourIndex = city.start.index;
  }
}

// Colliders array (for fallback or supplemental obstacles)
const colliders = [];

// Texture Generators
function createProceduralTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (type === 'wall') {
    ctx.fillStyle = '#1c202a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#2d3345';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 248);
  } else if (type === 'floor') {
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, 256, 256);
  } else if (type === 'crate') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#5c3818';
    ctx.fillRect(12, 12, 232, 232);
    ctx.strokeStyle = '#3d2510';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.beginPath();
    ctx.moveTo(8, 8); ctx.lineTo(248, 248);
    ctx.moveTo(248, 8); ctx.lineTo(8, 248);
    ctx.stroke();
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUPPLY', 128, 140);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

const crateTex = createProceduralTexture('crate');

if (city) {
  // Lighting, fog and sky are owned by city.js (buildTorontoCity). Stacking a
  // 1.8-intensity ambient on top flattened every surface, so it's removed here.
  scene.environment = buildNightCityEnvMap(renderer);
  // Live traffic on the real street network (traffic.js)
  if (typeof window.createTraffic === 'function') traffic = window.createTraffic(scene, city, audio, { count: 30 });
} else {
  // Fallback Indoor Enclosed Arena if map data failed to load
  scene.fog = new THREE.FogExp2(0x0a0c12, 0.038);
  const ambLight = new THREE.AmbientLight(0x2a2f3d, 1.4);
  scene.add(ambLight);

  const mainLight = new THREE.PointLight(0xff4422, 2.8, 45);
  mainLight.position.set(0, 6, 0);
  scene.add(mainLight);

  const floorTex = createProceduralTexture('floor');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallTex = createProceduralTexture('wall');
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.65 });
  function addWall(x, z, width, depth, height = 6.2) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    wall.position.set(x, height / 2, z);
    scene.add(wall);
    colliders.push({ box: new THREE.Box3().setFromObject(wall), mesh: wall });
  }
  addWall(0, -40, 80, 2.5); addWall(0, 40, 80, 2.5);
  addWall(-40, 0, 2.5, 80); addWall(40, 0, 2.5, 80);
}

// ============================================================================
// 3D FIRST-PERSON VIEWMODEL — stylised armoured gauntlets + kicking leg
// ============================================================================
const armsRig = new THREE.Group();
camera.add(armsRig);
scene.add(camera);

// A small key light that rides with the camera so the hands always read,
// even in dark alleys between street lamps (standard FPS viewmodel trick).
const viewmodelLight = new THREE.PointLight(0xffe2c4, 0.3, 1.6, 2);
viewmodelLight.position.set(0.45, 0.5, 0.2);
camera.add(viewmodelLight);

// Rounded box: a box whose vertices are pushed onto a rounded shell, with
// smooth analytic normals. Gives soft, organic shapes without extra libraries.
function roundedBoxGeo(w, h, d, r, seg = 3) {
  r = Math.min(r, w / 2, h / 2, d / 2);
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position, n = g.attributes.normal;
  const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), off = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -ix, ix), THREE.MathUtils.clamp(v.y, -iy, iy), THREE.MathUtils.clamp(v.z, -iz, iz));
    off.subVectors(v, c);
    if (off.lengthSq() < 1e-12) off.fromBufferAttribute(n, i);
    off.normalize();
    p.setXYZ(i, c.x + off.x * r, c.y + off.y * r, c.z + off.z * r);
    n.setXYZ(i, off.x, off.y, off.z);
  }
  return g;
}

const VM_MATS = {
  brass: new THREE.MeshStandardMaterial({ color: 0xd9a845, roughness: 0.22, metalness: 1.0 }),
  denim: new THREE.MeshStandardMaterial({ color: 0x232c3d, roughness: 0.9, metalness: 0.0 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.38, metalness: 0.05 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 1.0 }),
  lace: new THREE.MeshStandardMaterial({ color: 0x6b5232, roughness: 0.9, metalness: 0.0 })
};

function buildArmMesh(isLeft = false) {
  // Stylised armoured gauntlet: the original chunky block look, but beveled,
  // layered and properly lit instead of raw boxes.
  const arm = new THREE.Group();
  arm.rotation.order = 'YXZ';
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x2a303b, roughness: 0.35, metalness: 0.8 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7, metalness: 0.1 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xb8432c, roughness: 0.4, metalness: 0.6 });

  const bracer = new THREE.Mesh(roundedBoxGeo(0.12, 0.11, 0.36, 0.035), padMat);
  bracer.position.z = -0.12; arm.add(bracer);
  const plate = new THREE.Mesh(roundedBoxGeo(0.13, 0.05, 0.3, 0.02), plateMat);
  plate.position.set(0, 0.045, -0.13); arm.add(plate);
  const stripe = new THREE.Mesh(roundedBoxGeo(0.022, 0.052, 0.28, 0.008), trimMat);
  stripe.position.set(0, 0.05, -0.13); arm.add(stripe);
  const cuff = new THREE.Mesh(roundedBoxGeo(0.14, 0.13, 0.05, 0.02), plateMat);
  cuff.position.z = -0.3; arm.add(cuff);

  const fist = new THREE.Group(); fist.position.z = -0.41; arm.add(fist);
  fist.add(new THREE.Mesh(roundedBoxGeo(0.15, 0.13, 0.15, 0.04), padMat));
  const knuckles = new THREE.Mesh(roundedBoxGeo(0.155, 0.075, 0.05, 0.02), plateMat);
  knuckles.position.set(0, 0.025, -0.065); fist.add(knuckles);
  const fingerSeam = new THREE.Mesh(roundedBoxGeo(0.15, 0.006, 0.02, 0.003), padMat);
  [-0.035, 0, 0.035].forEach(x => { const m = fingerSeam.clone(); m.scale.set(0.04, 8, 1); m.position.set(x, -0.025, -0.075); fist.add(m); });
  const thumb = new THREE.Mesh(roundedBoxGeo(0.04, 0.045, 0.09, 0.016), padMat);
  thumb.position.set((isLeft ? 1 : -1) * 0.07, -0.025, -0.03); fist.add(thumb);

  const brass = new THREE.Group();
  const spikeGeo = new THREE.ConeGeometry(0.014, 0.04, 8);
  [-0.054, -0.018, 0.018, 0.054].forEach(x => {
    const sp = new THREE.Mesh(spikeGeo, VM_MATS.brass);
    sp.rotation.x = -Math.PI / 2; sp.position.set(x, 0.03, -0.105); brass.add(sp);
  });
  brass.visible = false; fist.add(brass);
  arm.userData.brass = brass;
  return arm;
}

const rightArm = buildArmMesh(false);
armsRig.add(rightArm);
const leftArm = buildArmMesh(true);
armsRig.add(leftArm);

// ---------------------------------------------------------------------------
// Kicking leg: hip pivot -> thigh -> knee pivot -> shin -> boot (sole faces
// the target at full extension, like a real push kick seen from first person)
// ---------------------------------------------------------------------------
function buildKickLeg() {
  const hip = new THREE.Group();
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.44, 16), VM_MATS.denim);
  thigh.position.y = -0.22;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -0.44;
  hip.add(knee);
  const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10), VM_MATS.denim);
  knee.add(kneeCap);
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.064, 0.42, 16), VM_MATS.denim);
  shin.position.y = -0.21;
  knee.add(shin);
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.082, 0.05, 16), VM_MATS.denim);
  hem.position.y = -0.36;
  knee.add(hem);

  // Combat boot (toe toward -Z when the leg hangs straight down)
  const boot = new THREE.Group();
  boot.position.y = -0.44;
  knee.add(boot);
  const shaft = new THREE.Mesh(roundedBoxGeo(0.118, 0.17, 0.13, 0.04), VM_MATS.leather);
  shaft.position.set(0, 0.02, 0.01);
  boot.add(shaft);
  const vamp = new THREE.Mesh(roundedBoxGeo(0.112, 0.085, 0.25, 0.038), VM_MATS.leather);
  vamp.position.set(0, -0.06, -0.07);
  boot.add(vamp);
  const toeCap = new THREE.Mesh(roundedBoxGeo(0.114, 0.072, 0.075, 0.034), VM_MATS.leather);
  toeCap.position.set(0, -0.068, -0.172);
  boot.add(toeCap);
  // Midsole + lugged outsole
  const sole = new THREE.Mesh(roundedBoxGeo(0.128, 0.03, 0.32, 0.012), VM_MATS.rubber);
  sole.position.set(0, -0.112, -0.062);
  boot.add(sole);
  const heel = new THREE.Mesh(roundedBoxGeo(0.124, 0.032, 0.085, 0.01), VM_MATS.rubber);
  heel.position.set(0, -0.14, 0.05);
  boot.add(heel);
  const lugGeo = roundedBoxGeo(0.11, 0.014, 0.022, 0.005);
  for (let i = 0; i < 6; i++) {
    const lug = new THREE.Mesh(lugGeo, VM_MATS.rubber);
    lug.position.set(0, -0.131, -0.2 + i * 0.03);
    boot.add(lug);
  }
  // Laces + steel eyelets
  const laceGeo = roundedBoxGeo(0.07, 0.008, 0.01, 0.003);
  const eyeletGeo = new THREE.SphereGeometry(0.006, 6, 4);
  for (let i = 0; i < 6; i++) {
    const y = -0.01 + i * 0.022, z = -0.11 + i * 0.022;
    const lace = new THREE.Mesh(laceGeo, VM_MATS.lace);
    lace.position.set(0, y, z - 0.02);
    lace.rotation.x = -0.9;
    boot.add(lace);
    [-1, 1].forEach(sx => {
      const e = new THREE.Mesh(eyeletGeo, VM_MATS.steel);
      e.position.set(sx * 0.04, y, z - 0.02);
      boot.add(e);
    });
  }

  boot.scale.setScalar(1.5);
  hip.userData = { knee, boot };
  return hip;
}

const kickLeg = buildKickLeg();
kickLeg.position.set(0.17, -0.3, 0.1);
kickLeg.scale.setScalar(1.3);
kickLeg.rotation.order = 'YXZ';
kickLeg.visible = false;
armsRig.add(kickLeg);

// Kept for backward compatibility with any code that toggles bootGroup
const bootGroup = kickLeg;

// Canadian Hockey Stick for Berserk Rage Mode
function buildHockeyStickMesh() {
  const stickGroup = new THREE.Group();

  const mapleMat = new THREE.MeshStandardMaterial({
    color: 0xdfad7b,
    roughness: 0.4,
    metalness: 0.1
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x242426,
    roughness: 0.35,
    metalness: 0.3
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xd90429, // Team Canada Crimson Red
    roughness: 0.35,
    metalness: 0.2
  });
  const whiteTapeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5, // Hockey friction tape
    roughness: 0.85,
    metalness: 0.05
  });
  const blackBladeMat = new THREE.MeshStandardMaterial({
    color: 0x18181b, // Black cloth tape on blade
    roughness: 0.9,
    metalness: 0.05
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Red Canadian Hockey Glove
    roughness: 0.55,
    metalness: 0.2
  });
  const gloveCuffMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.1
  });

  // 1. RECTANGULAR COMPOSITE SHAFT
  // Length from y = -0.55 up to y = +0.40 (total 0.95m)
  const shaftGeo = new THREE.BoxGeometry(0.032, 0.95, 0.022);
  const shaft = new THREE.Mesh(shaftGeo, carbonMat);
  shaft.position.set(0, -0.05, 0);
  stickGroup.add(shaft);

  // Maple wood face inlay along front of shaft
  const inlayGeo = new THREE.BoxGeometry(0.028, 0.92, 0.003);
  const inlay = new THREE.Mesh(inlayGeo, mapleMat);
  inlay.position.set(0, -0.05, 0.011);
  stickGroup.add(inlay);

  // Butt-end grip tape at bottom handle
  const buttKnob = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.06, 0.028), whiteTapeMat);
  buttKnob.position.set(0, -0.52, 0);
  stickGroup.add(buttKnob);

  const buttGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.025), whiteTapeMat);
  buttGrip.position.set(0, -0.42, 0);
  stickGroup.add(buttGrip);

  // Canadian Decals & Racing Stripes on upper shaft
  const stripeGeo1 = new THREE.BoxGeometry(0.035, 0.08, 0.025);
  const stripe1 = new THREE.Mesh(stripeGeo1, redMat);
  stripe1.position.set(0, 0.10, 0);
  stickGroup.add(stripe1);

  const stripeGeo2 = new THREE.BoxGeometry(0.035, 0.03, 0.025);
  const stripe2 = new THREE.Mesh(stripeGeo2, whiteTapeMat);
  stripe2.position.set(0, 0.16, 0);
  stickGroup.add(stripe2);

  const stripeGeo3 = new THREE.BoxGeometry(0.035, 0.08, 0.025);
  const stripe3 = new THREE.Mesh(stripeGeo3, redMat);
  stripe3.position.set(0, 0.22, 0);
  stickGroup.add(stripe3);

  // 2. THE TOP: HOSEL + ONE-PIECE CURVED, TAPED BLADE
  // The blade is a single extruded silhouette (heel -> rounded toe) that is then
  // bent along a curve, so it reads as one smooth hooked blade instead of boxes.
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0, 0.40, 0);

  const BLADE_LEN = 0.30;   // heel to toe (m)
  const BLADE_H = 0.074;    // blade height at the heel
  const BLADE_T = 0.012;    // blade thickness
  const PHI0 = 0.35, PHI1 = 1.5;               // blade direction at heel -> toe (the hook)
  const BEND_K = (PHI1 - PHI0) / BLADE_LEN;    // curvature (rad per metre)
  const RISE = 0.1;                            // toe sits slightly higher than the heel
  const HEEL = new THREE.Vector3(-0.03, 0.035, -0.01);

  // Map flat blade coordinates (u along length, v up the height, w through the
  // thickness) onto the curved blade. Centreline is the integral of a direction
  // vector whose angle grows linearly: d(phi) = (-cos phi, 0, -sin phi).
  function bendBladePoint(u, v, w, out) {
    const phi = PHI0 + BEND_K * u;
    const cx = -(Math.sin(phi) - Math.sin(PHI0)) / BEND_K;
    const cz = (Math.cos(phi) - Math.cos(PHI0)) / BEND_K;
    // n = horizontal normal to the blade face
    out.set(HEEL.x + cx + Math.sin(phi) * w, HEEL.y + v + RISE * u, HEEL.z + cz - Math.cos(phi) * w);
    return out;
  }
  function bendGeometry(geo) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      bendBladePoint(p.getX(i), p.getY(i), p.getZ(i), v);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Blade silhouette: straight heel, gently rising top edge, rounded toe.
  // Edges are subdivided so the bend stays smooth.
  const outline = new THREE.Shape();
  const SEG = 28, TOE_R = 0.034, toeStart = BLADE_LEN - TOE_R;
  outline.moveTo(0, 0);
  for (let i = 1; i <= SEG; i++) outline.lineTo(toeStart * i / SEG, 0.004 * Math.sin(Math.PI * i / SEG)); // slight rocker
  const topAt = u => BLADE_H + 0.006 * (u / BLADE_LEN);
  const toeCy = topAt(toeStart) / 2, toeRy = topAt(toeStart) / 2;
  for (let i = 1; i <= 12; i++) {            // elliptical toe
    const a = -Math.PI / 2 + Math.PI * i / 12;
    outline.lineTo(toeStart + Math.cos(a) * TOE_R, toeCy + Math.sin(a) * toeRy);
  }
  for (let i = SEG - 1; i >= 0; i--) outline.lineTo(toeStart * i / SEG, topAt(toeStart * i / SEG));
  outline.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(outline, {
    depth: BLADE_T, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 4
  });
  bladeGeo.translate(0, 0, -BLADE_T / 2);
  bendGeometry(bladeGeo);

  // Cloth tape texture: black wrap with overlapping diagonal passes + puck scuffs
  const tapeCanvas = document.createElement('canvas');
  tapeCanvas.width = 512; tapeCanvas.height = 128;
  const tctx = tapeCanvas.getContext('2d');
  tctx.fillStyle = '#16171a'; tctx.fillRect(0, 0, 512, 128);
  for (let x = -128; x < 640; x += 22) {          // tape overlap seams
    tctx.strokeStyle = 'rgba(255,255,255,0.09)'; tctx.lineWidth = 2;
    tctx.beginPath(); tctx.moveTo(x, 0); tctx.lineTo(x + 40, 128); tctx.stroke();
    tctx.strokeStyle = 'rgba(0,0,0,0.5)'; tctx.lineWidth = 1;
    tctx.beginPath(); tctx.moveTo(x + 2, 0); tctx.lineTo(x + 42, 128); tctx.stroke();
  }
  for (let i = 0; i < 2500; i++) {                // cloth weave
    tctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    tctx.fillRect(Math.random() * 512, Math.random() * 128, 1, 1);
  }
  for (let i = 0; i < 9; i++) {                   // grey puck marks near the middle of the blade
    tctx.fillStyle = `rgba(140,140,150,${0.15 + Math.random() * 0.2})`;
    tctx.beginPath();
    tctx.ellipse(150 + Math.random() * 220, 30 + Math.random() * 70, 6 + Math.random() * 16, 2 + Math.random() * 4, Math.random(), 0, Math.PI * 2);
    tctx.fill();
  }
  const tapeTex = new THREE.CanvasTexture(tapeCanvas);
  tapeTex.wrapS = tapeTex.wrapT = THREE.RepeatWrapping;
  tapeTex.repeat.set(1 / BLADE_LEN, 1 / 0.08);    // ExtrudeGeometry UVs are in metres
  const bladeTapeMat = new THREE.MeshStandardMaterial({ map: tapeTex, roughness: 0.92, metalness: 0.0 });

  const blade = new THREE.Mesh(bladeGeo, bladeTapeMat);
  bladeGroup.add(blade);

  // White tape band at the heel (a common way players finish the wrap)
  const heelBand = new THREE.ExtrudeGeometry((() => {
    const sh = new THREE.Shape();
    sh.moveTo(0.012, -0.002); sh.lineTo(0.034, -0.002); sh.lineTo(0.034, topAt(0.034) + 0.002); sh.lineTo(0.012, topAt(0.012) + 0.002); sh.closePath();
    return sh;
  })(), { depth: BLADE_T + 0.003, bevelEnabled: false });
  heelBand.translate(0, 0, -(BLADE_T + 0.003) / 2);
  bendGeometry(heelBand);
  bladeGroup.add(new THREE.Mesh(heelBand, whiteTapeMat));

  // Hosel: tapered neck from the top of the shaft into the heel of the blade
  const heelTop = bendBladePoint(0.004, BLADE_H * 0.55, 0, new THREE.Vector3());
  const neckLen = heelTop.length();
  const hosel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, neckLen, 10), carbonMat);
  hosel.position.copy(heelTop).multiplyScalar(0.5);
  hosel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), heelTop.clone().normalize());
  bladeGroup.add(hosel);

  // Red maple leaf decal, bent onto both faces of the blade near the heel
  const leaf = new THREE.Shape();
  const leafPts = [
    [0, 1], [0.18, 0.62], [0.42, 0.74], [0.36, 0.38], [0.72, 0.52], [0.62, 0.32], [0.92, 0.2],
    [0.5, -0.18], [0.56, -0.36], [0.06, -0.3], [0.06, -0.62], [-0.06, -0.62], [-0.06, -0.3],
    [-0.56, -0.36], [-0.5, -0.18], [-0.92, 0.2], [-0.62, 0.32], [-0.72, 0.52], [-0.36, 0.38], [-0.42, 0.74], [-0.18, 0.62]
  ];
  leafPts.forEach(([x, y], i) => (i ? leaf.lineTo(x, y) : leaf.moveTo(x, y)));
  leaf.closePath();
  const leafRed = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });
  [1, -1].forEach(side => {
    const g = new THREE.ShapeGeometry(leaf);
    g.scale(0.017, 0.017, 1);
    g.translate(0.075, BLADE_H * 0.5, side * (BLADE_T / 2 + 0.0022));
    bladeGroup.add(new THREE.Mesh(bendGeometry(g), leafRed));
  });

  stickGroup.add(bladeGroup);

  // 3. TWO CANADIAN HOCKEY GLOVES AT HANDLE (BOTTOM)
  // Lower hand (near butt end, y = -0.36)
  const buttGlove = new THREE.Group();
  const bgFist = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.15), gloveMat);
  const bgCuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.13), gloveCuffMat);
  bgCuff.position.set(0.02, -0.08, 0);
  buttGlove.add(bgFist);
  buttGlove.add(bgCuff);
  buttGlove.position.set(0, -0.36, 0);
  stickGroup.add(buttGlove);

  // Upper hand (guide/power hand, y = -0.12)
  const powerGlove = new THREE.Group();
  const pgFist = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.15), gloveMat);
  const pgCuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.13), gloveCuffMat);
  pgCuff.position.set(0.02, -0.08, 0);
  powerGlove.add(pgFist);
  powerGlove.add(pgCuff);
  powerGlove.position.set(0, -0.12, 0);
  stickGroup.add(powerGlove);

  // First-person idle stance
  stickGroup.position.set(0.22, -0.26, -0.44);
  stickGroup.rotation.set(-0.22, -0.42, 0.38);
  stickGroup.visible = false;

  return stickGroup;
}

const hockeyStick = buildHockeyStickMesh();
armsRig.add(hockeyStick);

// ============================================================================
// SUPPLY CRATES & EXPLOSIVE BARRELS
// ============================================================================
const crates = [];
const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6 });

const crateLocations = [
  { x: -6, z: -10, loot: 'HOOK', desc: 'BRASS KNUCKLES! UNLOCKED THUNDER HOOK [2]' },
  { x: 8, z: -10, loot: 'KICK', desc: 'COMBAT BOOTS! UNLOCKED MIGHTY KICK [3 / E]' },
  { x: 0, z: -30, loot: 'SLAM', desc: 'METEOR GAUNTLET! UNLOCKED JUMP SLAM [4 / JUMP+ATTACK]' },
  { x: -28, z: -26, loot: 'HEALTH', desc: 'DOUBLE-DOUBLE & HONEY CRULLER! (+50 HP)' },
  { x: 28, z: -26, loot: 'ARMOR', desc: 'LEAFS VINTAGE GOALIE PADS! (+50 SHIELD)' },
  { x: -28, z: 26, loot: 'SLAM', desc: 'METEOR ENERGY RECHARGED! (+150 SCORE)' },
  { x: 28, z: 26, loot: 'HEALTH', desc: 'STREET MEAT HOT DOG & POUTINE! (+50 HP)' },
  { x: 0, z: 20, loot: 'KICK', desc: 'REINFORCED STEEL BOOTS!' }
];

state.totalBoxes = crateLocations.length;

function spawnCrates() {
  crates.forEach(c => {
    if (c.mesh) scene.remove(c.mesh);
  });
  crates.length = 0;

  let spots = [];
  if (city) {
    const pzX = (city.peaceZone ? city.peaceZone.x : city.start.x);
    const pzZ = (city.peaceZone ? city.peaceZone.z : city.start.z);
    const pzR = (city.peaceZone ? city.peaceZone.radius : 55);

    const torontoCrateTargets = [
      { x: pzX + (pzR + 15), z: pzZ + 5, loot: 'HOOK', desc: 'BRASS KNUCKLES! UNLOCKED THUNDER HOOK [2]' },
      { x: pzX - (pzR + 15), z: pzZ - 5, loot: 'KICK', desc: 'COMBAT BOOTS! UNLOCKED MIGHTY KICK [3 / E]' },
      { x: pzX + 10, z: pzZ + (pzR + 18), loot: 'SLAM', desc: 'METEOR GAUNTLET! UNLOCKED JUMP SLAM [4 / JUMP+ATTACK]' },
      { x: pzX - 10, z: pzZ - (pzR + 18), loot: 'HEALTH', desc: 'DOUBLE-DOUBLE & HONEY CRULLER! (+50 HP)' },
      { x: -160, z: -55, loot: 'ARMOR', desc: 'LEAFS VINTAGE GOALIE PADS! (+50 SHIELD)' },
      { x: -220, z: -70, loot: 'SLAM', desc: 'METEOR ENERGY RECHARGED! (+150 SCORE)' },
      { x: -140, z: 120, loot: 'HEALTH', desc: 'STREET MEAT HOT DOG & POUTINE! (+50 HP)' },
      { x: 40, z: 130, loot: 'KICK', desc: 'REINFORCED STEEL BOOTS!' }
    ];

    torontoCrateTargets.forEach(target => {
      let spot = city.findOpenSpot(target.x, target.z, 0, 20, 1.6);
      if (city.isInsidePeaceZone(spot.x, spot.z)) {
        spot = city.findOpenSpot(target.x, target.z, 25, 45, 1.6);
      }
      spots.push({ x: spot.x, z: spot.z, loot: target.loot, desc: target.desc });
    });
  } else {
    spots = crateLocations;
  }

  state.totalBoxes = spots.length;
  const hudBoxesEl = document.getElementById('hud-boxes');
  if (hudBoxesEl) hudBoxesEl.innerText = `${state.boxesSmashed}/${state.totalBoxes}`;
  spots.forEach((loc) => {
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(loc.x, 0.9, loc.z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);

    crates.push({
      mesh: crate,
      loot: loc.loot,
      desc: loc.desc,
      hp: 40,
      destroyed: false
    });
  });
}
spawnCrates();

// Loot Pickups
const pickups = [];

function spawnPickup(x, y, z, loot, desc) {
  const group = new THREE.Group();
  group.position.set(x, y + 0.6, z);

  let color = 0xffcc00;
  if (loot === 'KICK') color = 0x00f0ff;
  if (loot === 'SLAM') color = 0xea80fc;
  if (loot === 'HEALTH') color = 0x22c55e;
  if (loot === 'ARMOR') color = 0x38bdf8;

  const itemMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.6 })
  );
  group.add(itemMesh);

  const pLight = new THREE.PointLight(color, 2.5, 6);
  group.add(pLight);
  scene.add(group);

  pickups.push({
    group: group,
    loot: loot,
    desc: desc,
    initialY: y + 0.6,
    collected: false
  });
}

// 3D Particles (Blood, Splinters, Debris)
const particles = [];

function spawnDebris(x, y, z, colorHex, count = 20, speed = 7) {
  for (let i = 0; i < count; i++) {
    const pMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    pMesh.position.set(x, y, z);
    scene.add(pMesh);

    const angle = Math.random() * Math.PI * 2;
    const upward = Math.random() * speed + 1.5;
    const spread = Math.random() * speed;

    particles.push({
      mesh: pMesh,
      vx: Math.cos(angle) * spread,
      vy: upward,
      vz: Math.sin(angle) * spread,
      life: 0.6 + Math.random() * 0.4
    });
  }
}

// Radial Shockwave Effect for Meteor Slam
function createMeteorShockwave(x, z) {
  const geo = new THREE.RingGeometry(0.3, 1.0, 36);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.08, z);
  scene.add(ring);

  let radius = 1.0;
  let opacity = 0.95;

  const interval = setInterval(() => {
    radius += 0.55;
    opacity -= 0.06;
    ring.scale.set(radius, radius, 1);
    ring.material.opacity = Math.max(0, opacity);
    if (opacity <= 0) {
      clearInterval(interval);
      scene.remove(ring);
    }
  }, 16);
}

// ============================================================================
// 3D HUMANOID RIVAL FIGHTERS, CIVILIANS & BODY SNATCHERS
// ============================================================================
const enemies = [];

// ---------------------------------------------------------------------------
// MULTIPLAYER ROLE HELPERS
// One browser per room (the host) owns the ambient robots/snatchers/civilians.
// Guests render "mirrors" of them and forward their hits to the host.
// ---------------------------------------------------------------------------
const NET_PREFIX = Math.random().toString(36).slice(2, 6);
let netEnemySeq = 0;
function isNetGuest() {
  return !!(window.multiplayer && window.multiplayer.isGuest && window.multiplayer.isGuest());
}
function isNetHostWithPeers() {
  return !!(window.multiplayer && window.multiplayer.isHostWithPeers && window.multiplayer.isHostWithPeers());
}
// Positions (x,z) of every player whose game we're simulating enemies for
function allPlayerPositions() {
  const out = [{ x: player.pos.x, z: player.pos.z }];
  if (isNetHostWithPeers()) {
    window.multiplayer.remotePlayers.forEach(rp => { out.push({ x: rp.currentPos.x, z: rp.currentPos.z }); });
  }
  return out;
}
function nearestPlayerDist(x, z) {
  let best = Infinity;
  allPlayerPositions().forEach(p => { best = Math.min(best, Math.hypot(p.x - x, p.z - z)); });
  return best;
}

// 1. INNOCENT TORONTONIAN CIVILIANS (Friendly - Do NOT hit!)
const CIVILIAN_ARCHETYPES = [
  {
    name: 'MARK (BAY ST TRADER)',
    kind: 'civilian',
    title: 'INNOCENT CITIZEN',
    hp: 60,
    speed: 2.6,
    damage: 0,
    scale: 0.98,
    skinColor: 0xe5ad82,
    hairColor: 0x27272a,
    vestColor: 0x3b82f6, // blue collared shirt
    pantsColor: 0x1e293b, // slacks
    wrapColor: 0xe5ad82,  // bare hands
    bootColor: 0x0f172a,
    hairStyle: 'shaved',
    tagClass: 'civ'
  },
  {
    name: 'SARAH (QUEEN WEST ARTIST)',
    kind: 'civilian',
    title: 'INNOCENT CITIZEN',
    hp: 55,
    speed: 2.8,
    damage: 0,
    scale: 0.95,
    skinColor: 0xd4976a,
    hairColor: 0x78350f,
    vestColor: 0x10b981, // emerald cardigan
    pantsColor: 0x374151,
    wrapColor: 0xd4976a,  // bare hands
    bootColor: 0x1f2937,
    hairStyle: 'topknot',
    bandanaColor: 0x059669,
    tagClass: 'civ'
  },
  {
    name: 'DEVON (CITYPLACE JOGGER)',
    kind: 'civilian',
    title: 'INNOCENT CITIZEN',
    hp: 70,
    speed: 3.2,
    damage: 0,
    scale: 1.0,
    skinColor: 0xba7a48,
    hairColor: 0x18181b,
    vestColor: 0xf59e0b, // bright amber runner hoodie
    pantsColor: 0x18181b,
    wrapColor: 0xba7a48,  // bare hands
    bootColor: 0xf8fafc, // white runners
    hairStyle: 'bandana',
    bandanaColor: 0x38bdf8,
    tagClass: 'civ'
  },
  {
    name: 'CHLOE (KENSINGTON LOCAL)',
    kind: 'civilian',
    title: 'INNOCENT CITIZEN',
    hp: 55,
    speed: 2.7,
    damage: 0,
    scale: 0.96,
    skinColor: 0xf6d8ae,
    hairColor: 0xb45309,
    vestColor: 0xec4899, // pink vintage jacket
    pantsColor: 0x2563eb, // blue jeans
    wrapColor: 0xf6d8ae,  // bare hands
    bootColor: 0x312e81,
    hairStyle: 'shaved',
    tagClass: 'civ'
  }
];

// 2. ROGUE HUMANOID COMBAT ROBOTS (Hostile - Horizontal single-eye visor)
const ROBOT_ARCHETYPES = [
  {
    name: 'UNIT-01 (CYBER REX)',
    kind: 'robot',
    title: 'ROGUE COMBAT ANDROID',
    hp: 145,
    speed: 3.6,
    damage: 18,
    scale: 1.04,
    skinColor: 0x64748b, // metallic chassis skin
    hairColor: 0x0f172a,
    vestColor: 0x09090b, // carbon armor
    pantsColor: 0x1e293b,
    wrapColor: 0x00f0ff,  // electric blue power fists
    bootColor: 0x0f172a,
    hairStyle: 'visor',
    visorColor: 0x00f0ff, // horizontal rectangular optic visor
    antenna: true,
    tagClass: 'bot'
  },
  {
    name: 'TITAN-V8 (ENFORCER)',
    kind: 'robot',
    title: 'HEAVY ASSAULT UNIT',
    hp: 180,
    speed: 3.1,
    damage: 24,
    scale: 1.10,
    skinColor: 0x475569, // dark gunmetal
    hairColor: 0x18181b,
    vestColor: 0xd97706, // hazard heavy plate
    pantsColor: 0x111827,
    wrapColor: 0xf59e0b,  // heavy industrial clamps
    bootColor: 0x030712,
    hairStyle: 'visor',
    visorColor: 0xff3b30, // crimson optic visor
    antenna: true,
    tagClass: 'bot'
  },
  {
    name: 'NEXUS-9 (INFILTRATOR)',
    kind: 'robot',
    title: 'SPEED COMBAT ANDROID',
    hp: 115,
    speed: 4.4,
    damage: 15,
    scale: 0.98,
    skinColor: 0x94a3b8, // silver alloy
    hairColor: 0x020617,
    vestColor: 0x0284c7, // electric blue frame
    pantsColor: 0x0f172a,
    wrapColor: 0x38bdf8,
    bootColor: 0x020617,
    hairStyle: 'visor',
    visorColor: 0x22c55e, // green scanner optic visor
    antenna: true,
    tagClass: 'bot'
  },
  {
    name: 'VIPER-X (STRIKE ANDROID)',
    kind: 'robot',
    title: 'HIGH-VOLTAGE CYBORG',
    hp: 135,
    speed: 3.9,
    damage: 20,
    scale: 1.02,
    skinColor: 0x334155, // slate cybernetic
    hairColor: 0x09090b,
    vestColor: 0x7c3aed, // purple cyberplating
    pantsColor: 0x18181b,
    wrapColor: 0xa855f7,
    bootColor: 0x0f172a,
    hairStyle: 'visor',
    visorColor: 0xfacc15, // amber scanning visor
    antenna: true,
    tagClass: 'bot'
  }
];

// 3. BODY SNATCHERS (Disguised Alien Parasites - Glowing violet/magenta eyes & neck tendril)
const SNATCHER_ARCHETYPES = [
  {
    name: 'SNATCHER VICTOR',
    kind: 'snatcher',
    title: 'DISGUISED ALIEN PARASITE',
    hp: 160,
    speed: 4.0,
    damage: 22,
    scale: 1.03,
    skinColor: 0xd4a373, // looks human initially
    hairColor: 0x1c1917,
    vestColor: 0x1e293b, // urban jacket
    pantsColor: 0x334155,
    wrapColor: 0xa855f7, // purple alien claws
    bootColor: 0x0f172a,
    hairStyle: 'shaved',
    snatcherGlow: 0xd946ef, // bioluminescent violet/magenta eyes!
    tagClass: 'snatcher'
  },
  {
    name: 'SNATCHER MORGAN',
    kind: 'snatcher',
    title: 'DISGUISED ALIEN PARASITE',
    hp: 140,
    speed: 4.3,
    damage: 19,
    scale: 0.99,
    skinColor: 0xe0a96d,
    hairColor: 0x451a03,
    vestColor: 0x475569,
    pantsColor: 0x1f2937,
    wrapColor: 0xc026d3,
    bootColor: 0x111827,
    hairStyle: 'bandana',
    bandanaColor: 0x701a75,
    snatcherGlow: 0xf43f5e, // pulsing magenta/rose eyes
    tagClass: 'snatcher'
  },
  {
    name: 'SNATCHER VANCE',
    kind: 'snatcher',
    title: 'DISGUISED ALIEN PARASITE',
    hp: 175,
    speed: 3.8,
    damage: 25,
    scale: 1.06,
    skinColor: 0x8a5a36,
    hairColor: 0x09090b,
    vestColor: 0x0f172a,
    pantsColor: 0x3b0764,
    wrapColor: 0xec4899,
    bootColor: 0x020617,
    hairStyle: 'topknot',
    bandanaColor: 0xa855f7,
    snatcherGlow: 0xa855f7, // glowing alien violet eyes
    tagClass: 'snatcher'
  },
  {
    name: 'SNATCHER NYX',
    kind: 'snatcher',
    title: 'DISGUISED ALIEN PARASITE',
    hp: 130,
    speed: 4.5,
    damage: 18,
    scale: 0.97,
    skinColor: 0xf5cac3,
    hairColor: 0x172554,
    vestColor: 0x581c87,
    pantsColor: 0x1e1b4b,
    wrapColor: 0xe879f9,
    bootColor: 0x030712,
    hairStyle: 'shaved',
    snatcherGlow: 0xd946ef,
    tagClass: 'snatcher'
  }
];

// Alias for legacy references
const FIGHTER_ARCHETYPES = ROBOT_ARCHETYPES;

function create3DHumanFighter(x, z, kind = 'robot', archetypeIndex = 0) {
  // Support legacy signature create3DHumanFighter(x, z, archetypeIndex)
  if (typeof kind === 'number') {
    archetypeIndex = kind;
    kind = 'robot';
  }

  let archList = ROBOT_ARCHETYPES;
  if (kind === 'civilian') archList = CIVILIAN_ARCHETYPES;
  else if (kind === 'snatcher') archList = SNATCHER_ARCHETYPES;

  const arch = archList[archetypeIndex % archList.length];
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.scale.set(arch.scale, arch.scale, arch.scale);

  // Materials
  const isCiv = (kind === 'civilian');
  const isBot = (kind === 'robot');
  const isSnatcher = (kind === 'snatcher');

  const skinMat = new THREE.MeshStandardMaterial({
    color: arch.skinColor,
    roughness: isBot ? 0.4 : 0.7,
    metalness: isBot ? 0.5 : 0.05
  });
  const vestMat = new THREE.MeshStandardMaterial({ color: arch.vestColor, roughness: 0.6, metalness: isBot ? 0.3 : 0.1 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: arch.pantsColor, roughness: 0.6, metalness: 0.1 });
  // Civilians have bare natural hands matching their skin tone!
  const wrapMat = isCiv ? skinMat : new THREE.MeshStandardMaterial({
    color: arch.wrapColor,
    roughness: 0.5,
    metalness: isBot ? 0.4 : 0.2
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: arch.bootColor, roughness: 0.7, metalness: 0.2 });
  const hairMat = new THREE.MeshStandardMaterial({ color: arch.hairColor, roughness: 0.9, metalness: 0.0 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.5 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });

  // Eyes:
  // - Civilians: Natural white sclera + dark brown/black pupils (completely non-glowing)
  // - Robots: Rectangular visor covers the eyes entirely
  // - Snatchers: Natural white sclera BUT bioluminescent glowing violet/magenta slit pupils!
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyePupilMat = isSnatcher
    ? new THREE.MeshBasicMaterial({ color: arch.snatcherGlow || 0xd946ef })
    : new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // Store all mesh materials for hit flash & stagger tinting
  const flashableMaterials = [skinMat, vestMat, pantsMat, bootMat];
  if (!isCiv) flashableMaterials.push(wrapMat);

  // --- Pelvis & Hips ---
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.9, 0);
  root.add(pelvisGroup);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.3), pantsMat);
  hips.castShadow = true;
  pelvisGroup.add(hips);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.32), beltMat);
  belt.position.set(0, 0.08, 0);
  pelvisGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.34), buckleMat);
  buckle.position.set(0, 0.08, 0);
  pelvisGroup.add(buckle);

  // --- Legs ---
  // Left Leg
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.82, 0);
  root.add(leftLegPivot);

  const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.2), pantsMat);
  leftThigh.position.set(0, -0.2, 0);
  leftThigh.castShadow = true;
  leftLegPivot.add(leftThigh);

  const leftCalfPivot = new THREE.Group();
  leftCalfPivot.position.set(0, -0.4, 0);
  leftLegPivot.add(leftCalfPivot);

  const leftCalf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.18), pantsMat);
  leftCalf.position.set(0, -0.2, 0);
  leftCalf.castShadow = true;
  leftCalfPivot.add(leftCalf);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.26), bootMat);
  leftBoot.position.set(0, -0.38, 0.04);
  leftBoot.castShadow = true;
  leftCalfPivot.add(leftBoot);

  // Right Leg
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.82, 0);
  root.add(rightLegPivot);

  const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.2), pantsMat);
  rightThigh.position.set(0, -0.2, 0);
  rightThigh.castShadow = true;
  rightLegPivot.add(rightThigh);

  const rightCalfPivot = new THREE.Group();
  rightCalfPivot.position.set(0, -0.4, 0);
  rightLegPivot.add(rightCalfPivot);

  const rightCalf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.18), pantsMat);
  rightCalf.position.set(0, -0.2, 0);
  rightCalf.castShadow = true;
  rightCalfPivot.add(rightCalf);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.26), bootMat);
  rightBoot.position.set(0, -0.38, 0.04);
  rightBoot.castShadow = true;
  rightCalfPivot.add(rightBoot);

  // --- Upper Body / Torso ---
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.98, 0);
  root.add(torsoPivot);

  // Muscular abdomen & chest vest
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.26), vestMat);
  abdomen.position.set(0, 0.1, 0);
  abdomen.castShadow = true;
  torsoPivot.add(abdomen);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.32), vestMat);
  chest.position.set(0, 0.36, 0);
  chest.castShadow = true;
  torsoPivot.add(chest);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 8), skinMat);
  neck.position.set(0, 0.58, 0);
  torsoPivot.add(neck);

  // Head
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.68, 0);
  torsoPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), skinMat);
  head.position.set(0, 0.16, 0);
  head.castShadow = true;
  headPivot.add(head);

  // Eyes
  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eyeWhiteMat);
  eyeLeft.position.set(-0.07, 0.18, 0.142);
  headPivot.add(eyeLeft);
  const pupilLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.022), eyePupilMat);
  pupilLeft.position.set(-0.07, 0.18, 0.144);
  headPivot.add(pupilLeft);

  const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eyeWhiteMat);
  eyeRight.position.set(0.07, 0.18, 0.142);
  headPivot.add(eyeRight);
  const pupilRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.022), eyePupilMat);
  pupilRight.position.set(0.07, 0.18, 0.144);
  headPivot.add(pupilRight);

  // Eyebrows / Expression
  const brow = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.03, 0.03),
    new THREE.MeshBasicMaterial({ color: isCiv ? 0x27272a : 0x111111 })
  );
  brow.position.set(0, 0.21, 0.144);
  headPivot.add(brow);

  // --- SPECIAL CHARACTER CLASS MESHES & TELLTALES ---
  let snatcherParasiteGroup = null;

  if (isBot) {
    // 🔴 ROBOTS: Glowing single-eye horizontal rectangular visor (user requested)
    const visorMat = new THREE.MeshBasicMaterial({ color: arch.visorColor || 0x00f0ff });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.065, 0.05), visorMat);
    visor.position.set(0, 0.18, 0.146);
    headPivot.add(visor);

    // Antenna & sensor transceiver node on ear
    const earNode = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8, roughness: 0.2 })
    );
    earNode.position.set(-0.16, 0.22, 0);
    earNode.rotation.z = Math.PI / 4;
    headPivot.add(earNode);

    const earLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshBasicMaterial({ color: arch.visorColor || 0x00f0ff })
    );
    earLight.position.set(-0.19, 0.25, 0);
    headPivot.add(earLight);
  } else if (isSnatcher) {
    // 🟣 BODY SNATCHERS: Glowing bioluminescent slit pupils + twin alien bio-tendrils curving over shoulders + bio-wrist bands!
    snatcherParasiteGroup = new THREE.Group();
    snatcherParasiteGroup.position.set(0, 0.45, 0);

    const tendrilMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      roughness: 0.25,
      metalness: 0.3,
      emissive: 0x9333ea,
      emissiveIntensity: 0.8
    });
    flashableMaterials.push(tendrilMat);

    // Left and right curving alien spore tendrils emerging from upper back/shoulders
    [-1, 1].forEach(side => {
      const sporeSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.28, 6), tendrilMat);
      sporeSpine.position.set(side * 0.16, 0.18, -0.08);
      sporeSpine.rotation.set(0.3, 0, side * 0.35);
      snatcherParasiteGroup.add(sporeSpine);

      const sporeTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), tendrilMat);
      sporeTip.position.set(side * 0.22, 0.32, -0.04);
      snatcherParasiteGroup.add(sporeTip);
    });

    torsoPivot.add(snatcherParasiteGroup);
  }

  // Hair / Bandana Styles
  if (arch.hairStyle === 'bandana' && arch.bandanaColor) {
    const bandanaMat = new THREE.MeshStandardMaterial({ color: arch.bandanaColor });
    flashableMaterials.push(bandanaMat);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), bandanaMat);
    band.position.set(0, 0.24, 0);
    headPivot.add(band);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.06), bandanaMat);
    tail.position.set(0, 0.18, -0.16);
    tail.rotation.x = 0.2;
    headPivot.add(tail);
  } else if (arch.hairStyle === 'topknot') {
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.1, 0.29), hairMat);
    hairTop.position.set(0, 0.33, 0);
    headPivot.add(hairTop);
    const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), hairMat);
    knot.position.set(0, 0.42, -0.05);
    headPivot.add(knot);
  } else {
    // Shaved / buzz cut hair cap
    const buzz = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.08, 0.29), hairMat);
    buzz.position.set(0, 0.32, 0);
    headPivot.add(buzz);
  }

  // --- Arms (Left & Right) ---
  // Left Arm
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.35, 0.48, 0);
  torsoPivot.add(leftArmPivot);

  const leftBicep = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.16), skinMat);
  leftBicep.position.set(0, -0.15, 0);
  leftBicep.castShadow = true;
  leftArmPivot.add(leftBicep);

  const leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.set(0, -0.3, 0);
  leftArmPivot.add(leftForearmPivot);

  const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.15), skinMat);
  leftForearm.position.set(0, -0.14, 0);
  leftForearm.castShadow = true;
  leftForearmPivot.add(leftForearm);

  const leftFist = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), wrapMat);
  leftFist.position.set(0, -0.3, 0.02);
  leftFist.castShadow = true;
  leftForearmPivot.add(leftFist);

  // Right Arm
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.35, 0.48, 0);
  torsoPivot.add(rightArmPivot);

  const rightBicep = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.16), skinMat);
  rightBicep.position.set(0, -0.15, 0);
  rightBicep.castShadow = true;
  rightArmPivot.add(rightBicep);

  const rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.set(0, -0.3, 0);
  rightArmPivot.add(rightForearmPivot);

  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.15), skinMat);
  rightForearm.position.set(0, -0.14, 0);
  rightForearm.castShadow = true;
  rightForearmPivot.add(rightForearm);

  const rightFist = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), wrapMat);
  rightFist.position.set(0, -0.3, 0.02);
  rightFist.castShadow = true;
  rightForearmPivot.add(rightFist);

  // If Body Snatcher, attach glowing purple alien wrist bio-bands so hands have a clear alien tell
  if (isSnatcher) {
    const wristAlienMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
    [-1, 1].forEach((side) => {
      const wb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), wristAlienMat);
      wb.position.set(0, -0.22, 0);
      if (side === -1) leftForearmPivot.add(wb);
      else rightForearmPivot.add(wb);
    });
  }

  // Ground Contact Shadow Disc
  const shadowGeo = new THREE.CircleGeometry(0.48, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.02, 0);
  root.add(shadowMesh);

  // --- Dynamic Overhead 3D Health Bar & Nameplate Sprite ---
  const nameplateCanvas = document.createElement('canvas');
  nameplateCanvas.width = 256;
  nameplateCanvas.height = 72;
  const npCtx = nameplateCanvas.getContext('2d');
  const nameplateTexture = new THREE.CanvasTexture(nameplateCanvas);
  nameplateTexture.minFilter = THREE.LinearFilter;
  const nameplateMaterial = new THREE.SpriteMaterial({ map: nameplateTexture, depthTest: false, transparent: true });
  const nameplateSprite = new THREE.Sprite(nameplateMaterial);
  nameplateSprite.scale.set(1.9, 0.54, 1);
  nameplateSprite.position.set(0, 2.2, 0);
  root.add(nameplateSprite);

  let fighterEnemyObj = null;

  function updateNameplate(hp, maxHp, isStaggered) {
    npCtx.clearRect(0, 0, 256, 72);

    // Background square/pill container
    npCtx.fillStyle = 'rgba(8, 12, 18, 0.92)';
    if (npCtx.roundRect) {
      npCtx.beginPath();
      npCtx.roundRect(6, 6, 244, 60, 10);
      npCtx.fill();
    } else {
      npCtx.fillRect(6, 6, 244, 60);
    }

    let borderCol = '#ef4444';
    let titleText = '🔴 ROBOT';
    let barColor = '#ef4444';

    if (isStaggered) {
      borderCol = '#ffea00';
      titleText = '⚡ DIZZY!';
      barColor = '#ffea00';
    } else if (isCiv) {
      borderCol = '#22c55e';
      titleText = '🟢 CITIZEN';
      barColor = '#22c55e';
    } else if (isSnatcher) {
      const isUnmasked = fighterEnemyObj && fighterEnemyObj.unmasked;
      borderCol = isUnmasked ? '#f43f5e' : '#c026d3';
      titleText = isUnmasked ? '🟣 SNATCHER (UNMASKED)' : '🟣 ALIEN SNATCHER';
      barColor = '#c026d3';
    } else {
      borderCol = '#ef4444';
      titleText = '🔴 ROBOT';
      barColor = '#ef4444';
    }

    npCtx.lineWidth = 4;
    npCtx.strokeStyle = borderCol;
    npCtx.stroke();

    // Large, bold badge title (clear and uncluttered for kids)
    npCtx.font = 'bold 22px "Chakra Petch", "Rajdhani", sans-serif';
    npCtx.fillStyle = borderCol;
    npCtx.textAlign = 'center';
    npCtx.fillText(titleText, 128, 32);
    npCtx.textAlign = 'left';

    // Health bar container
    const barX = 20;
    const barY = 40;
    const barW = 216;
    const barH = 16;
    npCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    if (npCtx.roundRect) {
      npCtx.beginPath();
      npCtx.roundRect(barX, barY, barW, barH, 4);
      npCtx.fill();
    } else {
      npCtx.fillRect(barX, barY, barW, barH);
    }

    // Health bar fill
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    if (pct > 0) {
      npCtx.fillStyle = barColor;
      if (npCtx.roundRect) {
        npCtx.beginPath();
        npCtx.roundRect(barX, barY, barW * pct, barH, 4);
        npCtx.fill();
      } else {
        npCtx.fillRect(barX, barY, barW * pct, barH);
      }
    }

    nameplateTexture.needsUpdate = true;
  }
  updateNameplate(arch.hp, arch.hp, false);

  function unmaskSnatcher() {
    if (snatcherParasiteGroup) {
      snatcherParasiteGroup.scale.set(1.6, 1.6, 1.6);
    }
    eyePupilMat.color.setHex(0xff00ea);
  }

  scene.add(root);

  const rig = {
    root,
    pelvisGroup,
    leftLegPivot,
    leftCalfPivot,
    rightLegPivot,
    rightCalfPivot,
    torsoPivot,
    headPivot,
    leftArmPivot,
    leftForearmPivot,
    rightArmPivot,
    rightForearmPivot,
    nameplateSprite,
    updateNameplate,
    unmaskSnatcher,
    materials: flashableMaterials,
    originalColors: flashableMaterials.map(m => m.color.getHex()),
    arch,
    kind
  };

  return rig;
}

function pickEnemyTypeForCurrentDifficulty() {
  // If player is on Toronto Centre Island or on the ferry, ONLY peaceful citizens spawn!
  if (state.onFerry || state.onIsland || (player && player.pos && player.pos.z > 950) || (city && city.isInsideCentreIsland && city.isInsideCentreIsland(player.pos.x, player.pos.z))) {
    const archIdx = Math.floor(Math.random() * CIVILIAN_ARCHETYPES.length);
    return { kind: 'civilian', archIdx };
  }

  const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;
  const civRatio = (cfg.civilianRatio !== undefined) ? cfg.civilianRatio : 0.50;
  const botRatio = (cfg.robotRatio !== undefined) ? cfg.robotRatio : 0.35;
  const r = Math.random();
  if (r < civRatio) {
    const archIdx = Math.floor(Math.random() * CIVILIAN_ARCHETYPES.length);
    return { kind: 'civilian', archIdx };
  } else if (r < civRatio + botRatio) {
    const archIdx = Math.floor(Math.random() * ROBOT_ARCHETYPES.length);
    return { kind: 'robot', archIdx };
  } else {
    const archIdx = Math.floor(Math.random() * SNATCHER_ARCHETYPES.length);
    return { kind: 'snatcher', archIdx };
  }
}

function spawnEnemy(x, z, kind = 'robot', archIdx = 0, isGuard = false, guardTitle = null) {
  // Support legacy call: spawnEnemy(x, z, archIdx, isGuard, guardTitle)
  if (typeof kind === 'number') {
    guardTitle = isGuard;
    isGuard = archIdx;
    archIdx = kind;
    kind = 'robot';
  }

  // Centre Island & Toronto Islands are strictly peaceful citizen sanctuary ("with only citizens")
  if (z > 950 || (city && city.isInsideCentreIsland && city.isInsideCentreIsland(x, z))) {
    kind = 'civilian';
    archIdx = Math.floor(Math.random() * CIVILIAN_ARCHETYPES.length);
    isGuard = false;
    guardTitle = null;
  }

  const fighterRig = create3DHumanFighter(x, z, kind, archIdx);
  const groundFloorY = (city && city.floorAt) ? city.floorAt(x, z, 0) : 0;
  fighterRig.root.position.y = groundFloorY;
  const arch = fighterRig.arch;
  const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;

  const maxHp = Math.round(arch.hp * (kind === 'civilian' ? 1.0 : cfg.hpMult) * (isGuard ? 1.25 : 1.0));
  const enemyName = guardTitle || arch.name;
  if (isGuard) {
    fighterRig.arch.name = enemyName;
  }
  fighterRig.updateNameplate(maxHp, maxHp, false);

  const enemyObj = {
    rig: fighterRig,
    sprite: fighterRig.root, // alias for position compatibility
    name: enemyName,
    kind: kind, // 'civilian' | 'robot' | 'snatcher'
    hp: maxHp,
    maxHp: maxHp,
    speed: arch.speed * (kind === 'civilian' ? 1.0 : cfg.speedMult) * (isGuard ? 1.1 : 1.0),
    damage: Math.round(arch.damage * (kind === 'civilian' ? 0 : cfg.damageMult) * (isGuard ? 1.2 : 1.0)),
    attackCooldown: 1.1 / cfg.attackCooldownMult,
    attackTimer: 0.5 + Math.random() * 0.5,
    attackProg: 0,
    aggroDist: isGuard ? 42 : (kind === 'civilian' ? 0 : cfg.aggroDist),
    isPunching: false,
    punchArm: 'right',
    punchHasDealtDamage: false,
    walkPhase: Math.random() * Math.PI * 2,
    flinchTimer: 0,
    isStaggered: false,
    staggerTimer: 0,
    isDead: false,
    isKnockedOut: false,
    koProgress: 0,
    vx: 0,
    vz: 0,
    isMissionGuard: isGuard,
    guardAnchor: isGuard ? { x, z } : null,
    isIslandCitizen: (z > 950 || (city && city.isInsideCentreIsland && city.isInsideCentreIsland(x, z)) || (typeof islands !== 'undefined' && islands && islands.isInsideIslands && islands.isInsideIslands(x, z))),
    // Civilian / Snatcher specific fields
    isFleeing: false,
    fleeTimer: 0,
    unmasked: false,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: 2.0 + Math.random() * 3.0
  };

  // Network identity (host-authoritative multiplayer sync)
  enemyObj.archIdx = archIdx;
  enemyObj.netId = NET_PREFIX + '-' + (netEnemySeq++);

  // Provide enemyObj reference to rig for nameplate updates
  fighterRig.enemyObj = enemyObj;
  enemies.push(enemyObj);
  return enemyObj;
}

// Street patrol targets distributed across Downtown Toronto sectors
const ALL_TORONTO_STREET_TARGETS = [
  // Sector 1: Bremner Blvd & CN Tower Perimeter (South)
  { x: -360, z: 290, idx: 0 }, { x: -310, z: 285, idx: 1 }, { x: -410, z: 290, idx: 2 },
  { x: -260, z: 290, idx: 3 }, { x: -210, z: 285, idx: 0 }, { x: -460, z: 290, idx: 1 },
  // Sector 2: Front St Corridor (North of CN Tower)
  { x: -360, z: 120, idx: 2 }, { x: -310, z: 110, idx: 3 }, { x: -420, z: 120, idx: 0 },
  { x: -470, z: 115, idx: 1 }, { x: -260, z: 110, idx: 2 }, { x: -210, z: 115, idx: 3 },
  // Sector 3: Simcoe, Wellington & Metro Hall
  { x: -210, z: -60, idx: 0 }, { x: -160, z: -60, idx: 1 }, { x: -240, z: -100, idx: 2 },
  { x: -180, z: -120, idx: 3 }, { x: -280, z: -70, idx: 0 }, { x: -330, z: -60, idx: 1 },
  // Sector 4: Entertainment District & King St West
  { x: -140, z: -40, idx: 2 }, { x: -150, z: 120, idx: 3 }, { x: -220, z: -160, idx: 0 },
  { x: -280, z: -160, idx: 1 }, { x: -340, z: -170, idx: 2 }, { x: -400, z: -170, idx: 3 },
  { x: -450, z: -180, idx: 0 }, { x: -500, z: -180, idx: 1 },
  // Sector 5: Rogers Centre Plaza & Blue Jays Way
  { x: -440, z: 230, idx: 2 }, { x: -460, z: 180, idx: 3 }, { x: -500, z: 240, idx: 0 },
  { x: -520, z: 300, idx: 1 }, { x: -480, z: 340, idx: 2 }, { x: -540, z: 360, idx: 3 },
  // Sector 6: Roundhouse Park & Steam Whistle
  { x: -220, z: 320, idx: 0 }, { x: -260, z: 340, idx: 1 }, { x: -180, z: 330, idx: 2 },
  { x: -200, z: 360, idx: 3 }, { x: -240, z: 380, idx: 0 }, { x: -160, z: 370, idx: 1 },
  // Sector 7: Financial District (Bay & King, Wellington, TD Centre)
  { x: -80, z: 80, idx: 2 }, { x: 30, z: 140, idx: 3 }, { x: 100, z: -60, idx: 0 },
  { x: -10, z: -120, idx: 1 }, { x: 50, z: -70, idx: 2 }, { x: 120, z: -110, idx: 3 },
  { x: 180, z: -90, idx: 0 }, { x: 230, z: -130, idx: 1 }, { x: 160, z: -170, idx: 2 },
  { x: 220, z: -210, idx: 3 }, { x: 280, z: -180, idx: 0 }, { x: 320, z: -140, idx: 1 },
  // Sector 8: Union Station & Scotiabank Arena
  { x: -100, z: -20, idx: 2 }, { x: -50, z: -20, idx: 3 }, { x: 20, z: -30, idx: 0 },
  { x: 80, z: -20, idx: 1 }, { x: 140, z: -30, idx: 2 }, { x: 200, z: -40, idx: 3 },
  { x: 260, z: 40, idx: 0 }, { x: 240, z: 90, idx: 1 }, { x: 200, z: 120, idx: 2 },
  // Sector 9: Harbourfront / Queens Quay Promenade
  { x: -320, z: 420, idx: 3 }, { x: -240, z: 430, idx: 0 }, { x: -160, z: 440, idx: 1 },
  { x: -80, z: 450, idx: 2 }, { x: 0, z: 460, idx: 3 }, { x: 100, z: 460, idx: 0 },
  { x: 200, z: 450, idx: 1 }, { x: 280, z: 440, idx: 2 }, { x: 340, z: 430, idx: 3 },
  // Sector 10: University Ave & Roy Thomson Hall
  { x: -120, z: -180, idx: 0 }, { x: -70, z: -190, idx: 1 }, { x: -30, z: -220, idx: 2 },
  { x: 20, z: -240, idx: 3 }, { x: 60, z: -280, idx: 0 }, { x: -40, z: -270, idx: 1 },
  // Sector 11: Spadina & CityPlace Corridor
  { x: -580, z: 200, idx: 2 }, { x: -620, z: 260, idx: 3 }, { x: -660, z: 320, idx: 0 },
  { x: -640, z: 380, idx: 1 }, { x: -600, z: 440, idx: 2 }, { x: -680, z: 450, idx: 3 },
  // Sector 12: York St & Lakeshore Boulevard
  { x: -120, z: 220, idx: 0 }, { x: -60, z: 230, idx: 1 }, { x: 0, z: 230, idx: 2 },
  { x: 60, z: 240, idx: 3 }, { x: 120, z: 250, idx: 0 }, { x: 180, z: 260, idx: 1 }
];

function populateEnemies() {
  // Clear any existing ambient enemies (preserve alive mission guards and network mirrors)
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.isMissionGuard && !e.isRemoteMirror) {
      if (e.rig && e.rig.root) scene.remove(e.rig.root);
      enemies.splice(i, 1);
    }
  }
  if (isNetGuest()) return;   // the host populates the shared city

  const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;

  if (city) {
    const pX = player.pos.x;
    const pZ = player.pos.z;

    // Sort targets by proximity to the player's CURRENT location!
    // Exclude targets that are too close (< 25m) so they don't pop up immediately on the player
    const sortedTargets = ALL_TORONTO_STREET_TARGETS.slice().map(t => {
      return { ...t, dist: Math.hypot(t.x - pX, t.z - pZ) };
    }).filter(t => t.dist >= 25).sort((a, b) => a.dist - b.dist);

    let spawnedCount = 0;
    for (let i = 0; i < sortedTargets.length && spawnedCount < cfg.targetEnemies; i++) {
      const target = sortedTargets[i];
      let spot = city.findOpenSpot(target.x, target.z, 0, 25, 2.0);
      let fromPlayer = Math.hypot(spot.x - pX, spot.z - pZ);
      const fromPeace = Math.hypot(spot.x - city.peaceZone.x, spot.z - city.peaceZone.z);

      if (!city.isInsidePeaceZone(spot.x, spot.z) &&
        fromPeace >= city.peaceZone.radius + 15 &&
        fromPlayer >= 22) {
        const { kind, archIdx } = pickEnemyTypeForCurrentDifficulty();
        spawnEnemy(spot.x, spot.z, kind, archIdx);
        spawnedCount++;
      }
    }

    // If still need more to satisfy target count (e.g. Impossible 88)
    while (spawnedCount < cfg.targetEnemies) {
      const spawned = spawnSingleReinforcement();
      if (spawned) spawnedCount++;
      else break;
    }
    // Pre-populate peaceful citizens and tourists on Centre Island
    populateCentreIslandCitizens();
  } else {
    const spawns = [
      [-8, -18, 0], [8, -18, 1], [-20, 16, 2], [20, 16, 3],
      [-26, -10, 0], [26, -10, 1], [0, 28, 2], [-18, -28, 3]
    ];
    spawns.slice(0, cfg.targetEnemies).forEach(([x, z, idx]) => {
      const { kind, archIdx } = pickEnemyTypeForCurrentDifficulty();
      spawnEnemy(x, z, kind, archIdx);
    });
  }
}

function spawnSingleReinforcement(originX, originZ) {
  if (!city || isNetGuest()) return null;
  let pX = originX, pZ = originZ;
  if (pX === undefined) {
    // Spread reinforcements around ALL players so a guest exploring elsewhere still has foes
    const players = allPlayerPositions();
    const o = players[Math.floor(Math.random() * players.length)];
    pX = o.x; pZ = o.z;
  }

  // If spawning on dedicated Toronto Islands archipelago
  const onArchipelago = (typeof islands !== 'undefined' && islands && islands.isInsideIslands && islands.isInsideIslands(pX, pZ)) || pZ > 840;
  if (onArchipelago) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 45;
      const tx = pX + Math.cos(angle) * dist;
      const tz = pZ + Math.sin(angle) * dist;
      if (islands && islands.canMoveTo(tx, tz, 0.5, 0.55)) {
        const fromAnyPlayer = nearestPlayerDist(tx, tz);
        if (fromAnyPlayer >= 16) {
          const { kind, archIdx } = pickEnemyTypeForCurrentDifficulty();
          return spawnEnemy(tx, tz, kind, archIdx);
        }
      }
    }
    return null;
  }

  // Try several angles to ensure finding an open walkable street
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 32 + Math.random() * 45; // 32m to 77m away
    const tx = pX + Math.cos(angle) * dist;
    const tz = pZ + Math.sin(angle) * dist;

    // Check world bounds
    if (city.bounds) {
      if (tx < city.bounds.minX + 15 || tx > city.bounds.maxX - 15 ||
        tz < city.bounds.minZ + 15 || tz > city.bounds.maxZ - 15) {
        continue;
      }
    }

    const spot = city.findOpenSpot(tx, tz, 2, 18, 2.0);
    const fromPeace = Math.hypot(spot.x - city.peaceZone.x, spot.z - city.peaceZone.z);
    const fromOrigin = Math.hypot(spot.x - pX, spot.z - pZ);
    const fromAnyPlayer = nearestPlayerDist(spot.x, spot.z);

    if (!city.isInsidePeaceZone(spot.x, spot.z) &&
      fromPeace >= city.peaceZone.radius + 15 &&
      fromAnyPlayer >= 24 && fromOrigin <= 90) {
      const { kind, archIdx } = pickEnemyTypeForCurrentDifficulty();
      return spawnEnemy(spot.x, spot.z, kind, archIdx);
    }
  }
  return null;
}

function spawnAdditionalEnemies(count) {
  if (!city) return;
  for (let i = 0; i < count; i++) {
    spawnSingleReinforcement();
  }
}

function populateCentreIslandCitizens() {
  if (!city) return;
  const IZ = o => ((typeof islands !== 'undefined' && islands && islands.Z_BASE) ? islands.Z_BASE : 1200) + o;

  // Pre-populate Centre Island attractions with generous Torontonian citizens & tourists (175+ people)
  const islandSpots = [
    // North Island Ferry Terminal & Arrival Plaza
    [0, IZ(5)], [0, IZ(15)], [-6, IZ(10)], [6, IZ(10)], [12, IZ(18)], [-12, IZ(18)], [18, IZ(25)], [-8, IZ(28)],
    [5, IZ(32)], [-5, IZ(32)], [14, IZ(35)], [22, IZ(38)], [10, IZ(40)], [-10, IZ(40)], [2, IZ(22)],

    // Pizza Pizza & Subway outdoor dining patio
    [12, IZ(44)], [12, IZ(52)], [14, IZ(64)], [6, IZ(55)], [6, IZ(65)], [16, IZ(48)], [16, IZ(58)],
    [20, IZ(44)], [20, IZ(52)], [20, IZ(62)], [20, IZ(70)], [24, IZ(48)], [24, IZ(66)], [8, IZ(48)],

    // Toronto Island BBQ & Beer Co. dining deck, smoker patio & bar
    [62, IZ(60)], [68, IZ(60)], [74, IZ(62)], [60, IZ(70)], [66, IZ(70)], [72, IZ(70)], [58, IZ(80)],
    [64, IZ(80)], [70, IZ(80)], [76, IZ(75)], [56, IZ(88)], [62, IZ(88)], [68, IZ(88)], [74, IZ(85)],
    [80, IZ(70)], [80, IZ(80)],

    // Park Washroom & Public Lockers Building
    [12, IZ(82)], [14, IZ(88)], [16, IZ(92)], [18, IZ(85)], [20, IZ(85)], [10, IZ(92)], [22, IZ(90)], [14, IZ(95)],

    // First Bridge (North Arrival Bridge over North Lagoon)
    [28, IZ(122)], [28, IZ(128)], [28, IZ(135)], [28, IZ(142)], [28, IZ(150)], [26, IZ(125)], [30, IZ(132)], [26, IZ(145)], [30, IZ(152)],

    // Shaded Wooded Path to Centreville
    [40, IZ(165)], [48, IZ(170)], [55, IZ(172)], [62, IZ(176)], [70, IZ(180)], [78, IZ(184)], [85, IZ(188)], [92, IZ(190)],
    [100, IZ(192)], [108, IZ(195)], [115, IZ(196)], [122, IZ(198)], [130, IZ(200)], [138, IZ(200)],

    // Centreville Turn-of-the-Century Victorian Village Square & Town Hall
    [155, IZ(195)], [160, IZ(190)], [165, IZ(195)], [170, IZ(190)], [175, IZ(190)], [180, IZ(185)], [185, IZ(190)],
    [190, IZ(195)], [195, IZ(195)], [200, IZ(200)], [205, IZ(200)], [210, IZ(195)], [215, IZ(200)], [220, IZ(195)],
    [225, IZ(195)], [230, IZ(200)], [180, IZ(178)], [180, IZ(205)], [170, IZ(210)], [190, IZ(210)], [165, IZ(215)],
    [175, IZ(215)], [185, IZ(220)], [195, IZ(220)], [205, IZ(215)], [215, IZ(215)], [150, IZ(215)], [160, IZ(225)],

    // Centreville Railway Station Platform (Beasley Bear Express)
    [155, IZ(165)], [160, IZ(165)], [165, IZ(165)], [170, IZ(165)], [155, IZ(168)], [160, IZ(168)], [165, IZ(168)],

    // Far Enough Farm (Historic 1959 Petting Farm, Big Red Barn & Paddocks)
    [265, IZ(185)], [275, IZ(180)], [285, IZ(175)], [295, IZ(175)], [305, IZ(175)], [315, IZ(175)], [325, IZ(175)],
    [270, IZ(165)], [285, IZ(165)], [295, IZ(165)], [310, IZ(165)], [320, IZ(165)], [280, IZ(195)], [295, IZ(195)],
    [310, IZ(195)], [325, IZ(195)], [285, IZ(205)], [300, IZ(205)], [315, IZ(205)],

    // Manitou Bridge over Long Pond
    [0, IZ(235)], [0, IZ(245)], [0, IZ(255)], [0, IZ(265)], [0, IZ(275)], [-2, IZ(240)], [2, IZ(250)], [-2, IZ(260)], [2, IZ(270)],

    // Grand Fountain Plaza
    [0, IZ(292)], [-8, IZ(298)], [8, IZ(298)], [-12, IZ(310)], [12, IZ(310)], [-8, IZ(322)], [8, IZ(322)], [0, IZ(326)],
    [-6, IZ(304)], [6, IZ(304)], [-6, IZ(316)], [6, IZ(316)], [0, IZ(300)], [0, IZ(318)],

    // Grand Formal Gardens & twin sunken Reflecting Pools (East & West)
    [0, IZ(340)], [0, IZ(360)], [0, IZ(380)], [0, IZ(400)], [0, IZ(420)], [-10, IZ(350)], [10, IZ(350)],
    [-18, IZ(360)], [-18, IZ(380)], [-18, IZ(400)], [18, IZ(360)], [18, IZ(380)], [18, IZ(400)],
    [-26, IZ(350)], [-26, IZ(410)], [26, IZ(350)], [26, IZ(410)], [-34, IZ(380)], [34, IZ(380)],

    // William Meany Hedge Maze (South Centre Island, West of Avenue - at the 1888 antique school bell & paths!)
    [-35, IZ(385)], [-45, IZ(385)], [-55, IZ(385)], [-65, IZ(385)], [-75, IZ(385)], [-85, IZ(385)],
    [-55, IZ(370)], [-75, IZ(370)], [-55, IZ(400)], [-75, IZ(400)], [-65, IZ(410)], [-65, IZ(360)],
    [-45, IZ(370)], [-45, IZ(400)], [-85, IZ(370)], [-85, IZ(400)],

    // South Beach Cafe & Grill beachfront patio
    [34, IZ(455)], [28, IZ(458)], [40, IZ(458)], [34, IZ(462)], [26, IZ(452)], [42, IZ(452)], [30, IZ(465)], [38, IZ(465)],

    // Toronto Island Bicycle Rental & Surrey quadricycles
    [-34, IZ(455)], [-28, IZ(458)], [-40, IZ(458)], [-34, IZ(462)], [-26, IZ(452)], [-42, IZ(452)], [-30, IZ(465)], [-38, IZ(465)],

    // Beach Lockers & changing rooms
    [-10, IZ(452)], [-5, IZ(452)], [10, IZ(452)], [0, IZ(455)],

    // Centre Island South Beach Boardwalk & 120m Pier (Lake Ontario)
    [0, IZ(470)], [0, IZ(490)], [0, IZ(510)], [0, IZ(530)], [0, IZ(550)], [0, IZ(570)], [0, IZ(585)],
    [-3, IZ(480)], [3, IZ(500)], [-3, IZ(520)], [3, IZ(540)], [-3, IZ(560)], [3, IZ(575)],
    [-35, IZ(450)], [35, IZ(450)], [-70, IZ(450)], [70, IZ(450)],

    // Olympic Island Great Lawn (skyline panorama)
    [-160, IZ(330)], [-140, IZ(320)], [-180, IZ(340)], [-150, IZ(350)], [-170, IZ(310)],

    // Gibraltar Point 1808 Lighthouse Sanctuary
    [-480, IZ(305)], [-460, IZ(330)], [-470, IZ(290)], [-490, IZ(320)],

    // Ward's Island Summer Village & Ward's Cafe patio
    [1050, IZ(85)], [1040, IZ(70)], [1020, IZ(40)], [1140, IZ(0)], [1060, IZ(95)], [1030, IZ(60)],

    // Algonquin Island cottage lanes & footbridge
    [540, IZ(80)], [520, IZ(60)], [750, IZ(60)], [560, IZ(90)], [530, IZ(70)],

    // Hanlan's Point dock & ball diamonds
    [-720, IZ(-80)], [-780, IZ(0)], [-740, IZ(-40)], [-760, IZ(-20)]
  ];

  islandSpots.forEach(([ix, iz], idx) => {
    // Only spawn if spot is open and not crowded
    const nearby = enemies.some(e => !e.isDead && Math.hypot(e.rig.root.position.x - ix, e.rig.root.position.z - iz) < 3.2);
    if (!nearby) {
      const archIdx = idx % CIVILIAN_ARCHETYPES.length;
      const cit = spawnEnemy(ix, iz, 'civilian', archIdx);
      if (cit) cit.isIslandCitizen = true;
    }
  });
}

function setDifficulty(diffKey, announce = true) {
  if (!DIFFICULTY_CONFIGS[diffKey]) return;
  state.difficulty = diffKey;
  const cfg = DIFFICULTY_CONFIGS[diffKey];

  // Update in-game HUD badge
  const diffBadge = document.getElementById('diff-badge');
  if (diffBadge) {
    diffBadge.innerText = `DIFF: ${cfg.name}`;
    diffBadge.className = `tag ${cfg.tagClass}`;
  }

  // Update menu start modal buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    if (btn.getAttribute('data-diff') === diffKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Adjust existing live enemies to new multipliers
  enemies.forEach(enemy => {
    if (enemy.isDead || enemy.isKnockedOut) return;
    if (enemy.kind !== 'civilian') {
      enemy.speed = enemy.rig.arch.speed * cfg.speedMult;
      enemy.damage = Math.round(enemy.rig.arch.damage * cfg.damageMult);
      enemy.attackCooldown = (1.1 / cfg.attackCooldownMult);
      enemy.aggroDist = cfg.aggroDist;
    }
  });

  // Scale active enemy population (host only; guests see the host's city)
  // Island civilians and peaceful citizens are strictly preserved and never culled!
  const aliveEnemies = enemies.filter(e => !e.isDead && !e.isRemoteMirror && e.kind !== 'civilian' && !e.isIslandCitizen);
  if (isNetGuest()) {
    // nothing: difficulty of the shared city is the host's setting
  } else if (aliveEnemies.length < cfg.targetEnemies) {
    spawnAdditionalEnemies(cfg.targetEnemies - aliveEnemies.length);
  } else if (aliveEnemies.length > cfg.targetEnemies) {
    const excess = aliveEnemies.length - cfg.targetEnemies;
    const sorted = aliveEnemies.slice().sort((a, b) => {
      const da = a.rig.root.position.distanceTo(player.pos);
      const db = b.rig.root.position.distanceTo(player.pos);
      return db - da; // remove furthest first
    });
    for (let i = 0; i < excess; i++) {
      const e = sorted[i];
      if (e.rig && e.rig.root) scene.remove(e.rig.root);
      const idx = enemies.indexOf(e);
      if (idx !== -1) enemies.splice(idx, 1);
    }
  }

  if (announce) {
    showAnnouncement(`⚡ DIFFICULTY: ${cfg.name} — ${cfg.sub} ⚡`);
    audio.playImpact('heavy');
  }
}

function cycleDifficulty(dir) {
  const curIdx = DIFFICULTY_ORDER.indexOf(state.difficulty || 'medium');
  let nextIdx = curIdx + dir;
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx >= DIFFICULTY_ORDER.length) nextIdx = DIFFICULTY_ORDER.length - 1;
  if (nextIdx !== curIdx) {
    setDifficulty(DIFFICULTY_ORDER[nextIdx], true);
  }
}

populateEnemies();

// ============================================================================
// CITY EXPLORATION MISSIONS (BOXES, GUARDS & LANDMARK GOALS)
// ============================================================================
const MISSION_LANDMARKS = [
  {
    id: 'royalYork',
    name: 'Fairmont Royal York',
    sub: 'Château Front Entrance (Front St)',
    coords: [176.0, -172.0]
  },
  {
    id: 'unionStation',
    name: 'Union Station',
    sub: 'Sir John A. Macdonald Plaza',
    coords: [262.0, -158.0]
  },
  {
    id: 'royThomson',
    name: 'Roy Thomson Hall',
    sub: 'King Street West Plaza',
    coords: [-229.0, -338.0]
  },
  {
    id: 'stLawrence',
    name: 'St. Lawrence Market',
    sub: 'Front Street Clock Pavilion',
    coords: [956.0, -455.0]
  },
  {
    id: 'ripleys',
    name: "Ripley's Aquarium",
    sub: 'Bremner Marine Walkway',
    coords: [-216.0, 215.0]
  },
  {
    id: 'roundhouse',
    name: 'John St Roundhouse',
    sub: 'Railway Museum Locomotive Yard',
    coords: [-204.0, 335.0]
  },
  {
    id: 'gooderham',
    name: 'Gooderham Flatiron',
    sub: 'Wellington Apex Plaza',
    coords: [765.0, -491.0]
  },
  {
    id: 'pecautSquare',
    name: 'David Pecaut Square',
    sub: 'Metro Hall Civic Green',
    coords: [-245.0, -240.0]
  },
  {
    id: 'rogersCentre',
    name: 'Rogers Centre',
    sub: 'Bremner Boulevard Gate',
    coords: [-460.0, 390.0]
  }
];

const MISSION_COLORS = [
  { id: 'red', name: 'Red Box', title: 'RUBY CONTAINER', hex: '#ef4444', threeHex: 0xef4444, glow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'blue', name: 'Blue Box', title: 'SAPPHIRE CONTAINER', hex: '#3b82f6', threeHex: 0x3b82f6, glow: 'rgba(59, 130, 246, 0.4)' },
  { id: 'green', name: 'Green Box', title: 'EMERALD CONTAINER', hex: '#10b981', threeHex: 0x10b981, glow: 'rgba(16, 185, 129, 0.4)' },
  { id: 'yellow', name: 'Yellow Box', title: 'AMBER CONTAINER', hex: '#f59e0b', threeHex: 0xf59e0b, glow: 'rgba(245, 158, 11, 0.4)' },
  { id: 'purple', name: 'Purple Box', title: 'AMETHYST CONTAINER', hex: '#a855f7', threeHex: 0xa855f7, glow: 'rgba(168, 85, 247, 0.4)' },
  { id: 'cyan', name: 'Cyan Box', title: 'DIAMOND CONTAINER', hex: '#06b6d4', threeHex: 0x06b6d4, glow: 'rgba(6, 182, 212, 0.4)' },
  { id: 'orange', name: 'Orange Box', title: 'TOPAZ CONTAINER', hex: '#f97316', threeHex: 0xf97316, glow: 'rgba(249, 115, 22, 0.4)' }
];

const missionState = {
  active: false,
  landmark: null,
  color: null,
  boxObj: null,
  pos: { x: 0, y: 0.9, z: 0 },
  guards: [],
  completedCount: 0,
  state: 'ready' // 'ready', 'active', 'completed', 'cooldown'
};

function createMissionCrateMesh(color) {
  const group = new THREE.Group();

  // 1. Outer high-tech carbon crate frame
  const frameGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.35
  });
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.castShadow = true;
  group.add(frameMesh);

  // 2. Glowing inner core crystal
  const coreGeo = new THREE.BoxGeometry(1.22, 1.22, 1.22);
  const coreMat = new THREE.MeshStandardMaterial({
    color: color.threeHex,
    emissive: color.threeHex,
    emissiveIntensity: 1.8,
    metalness: 0.2,
    roughness: 0.2
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 3. Neon trim bands
  const bandMat = new THREE.MeshBasicMaterial({ color: color.threeHex });
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.22, 1.64), bandMat);
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(1.64, 1.64, 0.22), bandMat);
  group.add(band1);
  group.add(band2);

  // 4. Ground Pulse Ring
  const ringGeo = new THREE.RingGeometry(0.8, 2.4, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color.threeHex,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = -0.78;
  group.add(ringMesh);

  // 5. Sky Beacon Beam (180m high light beam visible across downtown!)
  const beamGeo = new THREE.CylinderGeometry(0.4, 3.5, 180, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: color.threeHex,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = 90;
  group.add(beamMesh);

  // 6. Point light casting dynamic colored illumination
  const light = new THREE.PointLight(color.threeHex, 2.8, 24);
  light.position.y = 1.0;
  group.add(light);

  return {
    group,
    coreMesh,
    ringMesh,
    beamMesh,
    light
  };
}

function spawnMissionGuards(targetPos, color) {
  const guards = [];
  const guardCount = 3;

  for (let i = 0; i < guardCount; i++) {
    const angle = (i / guardCount) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 5.5 + Math.random() * 3.5; // 5.5m to 9m around box
    let gx = targetPos.x + Math.cos(angle) * dist;
    let gz = targetPos.z + Math.sin(angle) * dist;

    if (city) {
      const open = city.findOpenSpot(gx, gz, 0, 8, 1.8);
      gx = open.x;
      gz = open.z;
    }

    const archIdx = 1 + (i % 3);
    const guardTitle = `[SENTRY] ${color.name.toUpperCase()} GUARD`;
    const guard = spawnEnemy(gx, gz, archIdx, true, guardTitle);
    if (guard) {
      guards.push(guard);
    }
  }

  return guards;
}

function startNextMission() {
  if (!city) return;

  // Clean up any existing mission visuals
  if (missionState.boxObj && missionState.boxObj.group) {
    scene.remove(missionState.boxObj.group);
    missionState.boxObj = null;
  }

  // Filter out the most recent landmark to avoid consecutive repeats
  const availableLandmarks = MISSION_LANDMARKS.filter(lm => !missionState.landmark || lm.id !== missionState.landmark.id);
  const nextLm = availableLandmarks[Math.floor(Math.random() * availableLandmarks.length)];

  // Pick random color
  const nextColor = MISSION_COLORS[Math.floor(Math.random() * MISSION_COLORS.length)];

  // Find walkable coordinate right at the landmark's designated outdoor entrance or plaza
  const lmCoords = nextLm.coords;
  let spot = city.findOpenSpot(lmCoords[0], lmCoords[1], 1, 6, 1.8);
  if (!spot || !city.canMoveTo(spot.x, spot.z, 0.8)) {
    spot = { x: lmCoords[0], z: lmCoords[1] };
  }
  if (city.isInsidePeaceZone(spot.x, spot.z)) {
    // If inside peace zone, search outward so mission box is outside peace sanctuary
    spot = city.findOpenSpot(lmCoords[0], lmCoords[1], 62, 85, 2.0);
  }

  const boxPos = { x: spot.x, y: 0.9, z: spot.z };
  const boxObj = createMissionCrateMesh(nextColor);
  boxObj.group.position.set(boxPos.x, boxPos.y, boxPos.z);
  scene.add(boxObj.group);

  // Spawn sentry squad guarding the box
  const guards = spawnMissionGuards(boxPos, nextColor);

  missionState.active = true;
  missionState.landmark = nextLm;
  missionState.color = nextColor;
  missionState.boxObj = boxObj;
  missionState.pos = boxPos;
  missionState.guards = guards;
  missionState.state = 'active';

  // Update HUD
  updateMissionHUD();

  // Announce mission
  showAnnouncement(`🎯 NEW MISSION: GET THE ${nextColor.name.toUpperCase()} AT ${nextLm.name.toUpperCase()}! 🎯`);
  audio.playPickup();
}

function completeMission() {
  if (!missionState.active || missionState.state !== 'active') return;

  missionState.state = 'completed';
  missionState.active = false;
  missionState.completedCount++;

  const lmName = missionState.landmark ? missionState.landmark.name : 'LANDMARK';
  const colName = missionState.color ? missionState.color.name : 'CONTAINER';
  const colHex = missionState.color ? missionState.color.threeHex : 0x00f0ff;
  const mPos = { x: missionState.pos.x, y: missionState.pos.y, z: missionState.pos.z };

  try {
    // Visual celebrations: colored fireworks & debris
    spawnDebris(mPos.x, 1.2, mPos.z, colHex, 50, 14);
    spawnDebris(mPos.x, 1.8, mPos.z, 0xffffff, 30, 9);
    triggerScreenShake(20);

    // Audio fanfare
    audio.playMissionFanfare();
    audio.playCrateSmash();

    // Rewards: +1500 score, vitality heal, shield, rage
    state.score += 1500;
    state.health = Math.min(state.maxHealth || 100, state.health + 40);
    state.armor = Math.min(state.maxArmor || 100, state.armor + 40);
    state.rage = Math.min(100, state.rage + 35);
    updateHUDHealth();
    updateRageBar();
    const hudScore = document.getElementById('hud-score');
    if (hudScore) hudScore.innerText = state.score;

    showAnnouncement(`🏆 MISSION ACCOMPLISHED! RETRIEVED THE ${colName.toUpperCase()} AT ${lmName.toUpperCase()}! (+1500 PTS) 🏆`);
  } catch (err) {
    console.error('Error during mission celebration:', err);
  }

  // Remove box mesh from scene
  if (missionState.boxObj && missionState.boxObj.group) {
    scene.remove(missionState.boxObj.group);
    missionState.boxObj = null;
  }

  // Release surviving guards so they become standard roamers
  if (missionState.guards) {
    missionState.guards.forEach(g => {
      if (g && !g.isDead) {
        g.isMissionGuard = false;
      }
    });
    missionState.guards = [];
  }

  // Update HUD to show victory and next mission timer
  const trackerEl = document.getElementById('mission-tracker');
  if (trackerEl) trackerEl.classList.add('completed');
  const titleEl = document.getElementById('mission-title');
  if (titleEl) titleEl.innerText = `✅ ${colName.toUpperCase()} SECURED!`;
  const locEl = document.getElementById('mission-location');
  if (locEl) locEl.innerText = `+1500 PTS • HEALTH & SHIELD RESTORED!`;
  const statusPill = document.getElementById('mission-status-pill');
  if (statusPill) statusPill.innerText = `NEXT MISSION IN 4s...`;

  setTimeout(() => {
    if (trackerEl) trackerEl.classList.remove('completed');
    startNextMission();
  }, 4000);
}

function updateMission(dt) {
  if (!missionState.active || !missionState.boxObj) return;

  const bGroup = missionState.boxObj.group;
  const time = Date.now() * 0.003;

  // Bob & spin box
  bGroup.rotation.y += dt * 1.6;
  bGroup.position.y = 0.9 + Math.sin(time) * 0.16;

  // Pulse ground ring
  if (missionState.boxObj.ringMesh) {
    const ringScale = 1.0 + Math.sin(time * 2.0) * 0.18;
    missionState.boxObj.ringMesh.scale.set(ringScale, ringScale, ringScale);
  }

  // Distance from player to box
  const dist = Math.hypot(player.pos.x - missionState.pos.x, player.pos.z - missionState.pos.z);

  // Proximity collection check (< 3.8 meters - walking into the glowing aura)
  if (dist < 3.8) {
    completeMission();
    return;
  }

  // Guard behavior: if player is within 42m of box, alert all guards to aggressively rush player
  if (dist < 42) {
    missionState.guards.forEach(g => {
      if (g && !g.isDead && !g.isKnockedOut) {
        g.aggroDist = 65;
      }
    });
  }

  // Update HUD distance & compass direction
  updateMissionHUD(dist);
}

function updateMissionHUD(dist) {
  const trackerEl = document.getElementById('mission-tracker');
  if (!trackerEl) return;

  if (!missionState.active || !missionState.landmark || !missionState.color) {
    if (missionState.state !== 'completed') {
      trackerEl.style.display = 'none';
    }
    return;
  }
  trackerEl.style.display = 'flex';

  const d = (dist !== undefined) ? dist : Math.hypot(player.pos.x - missionState.pos.x, player.pos.z - missionState.pos.z);
  const roundedDist = Math.round(d);

  trackerEl.style.borderLeftColor = missionState.color.hex;
  trackerEl.style.boxShadow = `0 8px 28px rgba(0, 0, 0, 0.75), 0 0 16px ${missionState.color.glow || 'rgba(0, 240, 255, 0.15)'}`;
  const pulseEl = document.getElementById('mission-pulse');
  if (pulseEl) {
    pulseEl.style.background = missionState.color.hex;
    pulseEl.style.boxShadow = `0 0 8px ${missionState.color.hex}`;
  }

  const titleEl = document.getElementById('mission-title');
  if (titleEl) {
    titleEl.innerText = `GET THE ${missionState.color.name.toUpperCase()}`;
    titleEl.style.color = '#ffffff';
  }

  const locEl = document.getElementById('mission-location');
  if (locEl) {
    locEl.innerText = `📍 ${missionState.landmark.name} (${missionState.landmark.sub})`;
  }

  const distEl = document.getElementById('mission-distance');
  if (distEl) {
    distEl.innerText = `📐 ${roundedDist}m`;
  }

  const dirEl = document.getElementById('mission-dir');
  if (dirEl) {
    const dx = missionState.pos.x - player.pos.x;
    const dz = missionState.pos.z - player.pos.z;
    const worldAngle = Math.atan2(dx, dz);
    const relAngle = worldAngle - player.yaw;

    let norm = (relAngle + Math.PI) % (Math.PI * 2) - Math.PI;
    let arrow = '↑ AHEAD';
    if (norm > Math.PI * 0.75 || norm < -Math.PI * 0.75) arrow = '↓ BEHIND';
    else if (norm > Math.PI * 0.25) arrow = '→ RIGHT';
    else if (norm < -Math.PI * 0.25) arrow = '← LEFT';
    else if (norm > 0.1) arrow = '↗ AHEAD-R';
    else if (norm < -0.1) arrow = '↖ AHEAD-L';

    dirEl.innerText = arrow;
  }

  const statusPill = document.getElementById('mission-status-pill');
  if (statusPill) {
    if (roundedDist <= 6.5) {
      statusPill.innerText = `🎯 HIT / WALK OVER CRATE!`;
      statusPill.style.color = '#facc15';
    } else {
      const aliveGuards = missionState.guards.filter(g => g && !g.isDead && !g.isKnockedOut).length;
      if (aliveGuards > 0) {
        statusPill.innerText = `⚔️ ${aliveGuards} GUARD${aliveGuards > 1 ? 'S' : ''}`;
        statusPill.style.color = '#ef4444';
      } else {
        statusPill.innerText = `🔓 UNGUARDED`;
        statusPill.style.color = '#10b981';
      }
    }
  }
}

// Start first city exploration objective
if (city) {
  startNextMission();
}

// ============================================================================
// TORONTO ISLAND FERRIES (3 ISLAND DOCKS + MAINLAND + AIRPORT FERRY) CONTROLLER
// ============================================================================

const FERRY_DOCKS = [
  {
    id: 'mainland',
    label: 'MAINLAND TORONTO',
    name: 'Jack Layton Ferry Terminal',
    sub: 'Queens Quay & Bay St · Downtown Toronto',
    boardX: 712,
    boardZ: 318,
    slipX: 726,
    slipZ: 330,
    yaw: 0,
    onIsland: false
  },
  {
    id: 'centre',
    label: 'CENTRAL ISLAND DOCK',
    name: 'Centre Island Dock',
    sub: 'Avenue of the Islands · Centreville & Maze',
    boardX: 0,
    boardZ: 1192,
    slipX: 0,
    slipZ: 1146,
    yaw: Math.PI,
    onIsland: true
  },
  {
    id: 'hanlans',
    label: 'WEST ISLAND DOCK',
    name: "Hanlan's Point Dock",
    sub: 'Billy Bishop Airport & Hanlan\'s Beach',
    boardX: -720,
    boardZ: 1090,
    slipX: -720,
    slipZ: 1036,
    yaw: Math.PI,
    onIsland: true
  },
  {
    id: 'wards',
    label: 'EAST ISLAND DOCK',
    name: "Ward's Island Dock",
    sub: 'Forest Cottages · Ward\'s Cafe & East Beach',
    boardX: 1140,
    boardZ: 1180,
    slipX: 1140,
    slipZ: 1126,
    yaw: Math.PI,
    onIsland: true
  }
];

const ferryPanel = { open: false, highlight: 1 };

function currentFerryDockIndex() {
  let best = 0, bestD = Infinity;
  FERRY_DOCKS.forEach((d, i) => {
    const dist = Math.hypot(player.pos.x - d.boardX, player.pos.z - d.boardZ);
    if (dist < bestD) { bestD = dist; best = i; }
  });
  return best;
}

function buildFerryPanel() {
  const list = document.getElementById('ferry-dock-list');
  if (!list) return;
  const here = currentFerryDockIndex();
  list.innerHTML = '';
  FERRY_DOCKS.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'elev-floor-btn' + (i === here ? ' is-here' : '') + (i === ferryPanel.highlight ? ' is-highlight' : '');
    btn.dataset.dock = d.id;
    btn.innerHTML =
      `<span class="elev-floor-key">${i + 1}</span>` +
      `<span class="elev-floor-text"><span class="elev-floor-label">${d.label}</span>` +
      `<span class="elev-floor-name">${d.name}</span>` +
      `<span class="elev-floor-sub">${i === here ? 'You are here' : d.sub}</span></span>`;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectFerryDock(i);
    });
    list.appendChild(btn);
  });
}

function openFerryPanel() {
  if (state.onFerry || state.inElevator || !city || !city.islandFerry) return;
  const here = currentFerryDockIndex();
  // Pre-highlight Centre Island when on mainland, or Mainland when on any island dock
  ferryPanel.highlight = here === 0 ? 1 : 0;
  ferryPanel.open = true;
  buildFerryPanel();
  const el = document.getElementById('ferry-panel');
  if (el) el.classList.remove('hidden');
  audio.playElevatorDing();

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function closeFerryPanel() {
  if (!ferryPanel.open) return;
  ferryPanel.open = false;
  const el = document.getElementById('ferry-panel');
  if (el) el.classList.add('hidden');

  if (state.inGame && !state.freeMouseMode && !state.isPaused && !state.isDead && !state.onFerry && !state.inElevator) {
    container.requestPointerLock();
  }
}

function moveFerryHighlight(delta) {
  const n = FERRY_DOCKS.length;
  ferryPanel.highlight = (ferryPanel.highlight + delta + n) % n;
  buildFerryPanel();
}

function selectFerryDock(idx) {
  if (idx < 0 || idx >= FERRY_DOCKS.length) return;
  const here = currentFerryDockIndex();
  closeFerryPanel();
  if (idx === here) {
    showAnnouncement(`🚢 YOU ARE ALREADY AT ${FERRY_DOCKS[idx].name.toUpperCase()}`, 1800);
    return;
  }
  const destId = FERRY_DOCKS[idx].id;
  startFerryRide('to_' + destId, FERRY_DOCKS[here].id);
}

window.openFerryPanel = openFerryPanel;
window.closeFerryPanel = closeFerryPanel;
window.selectFerryDock = selectFerryDock;

const ferryController = {
  isMoving: false,
  dir: 'to_island',
  fromDock: 'mainland',
  toDock: 'centre',
  isAirportFerry: false,
  waypoints: [],
  progress: 0,
  duration: 8.5
};

const FERRY_WATER_Y = -0.65;

// Default Mainland <-> Centre Island route
const FERRY_WAYPOINTS = [
  { x: 726, z: 330 },
  { x: 550, z: 530 },
  { x: 360, z: 740 },
  { x: 170, z: 950 },
  { x: 0, z: 1146 }
];

function getFerryRouteWaypoints(fromId, toId) {
  if (fromId === 'airport_mainland' && toId === 'airport_island') {
    return [
      { x: -1060, z: 720 },
      { x: -1060, z: 760 },
      { x: -1060, z: 802 },
      { x: -1060, z: 842 }
    ];
  }
  if (fromId === 'airport_island' && toId === 'airport_mainland') {
    return [
      { x: -1060, z: 842 },
      { x: -1060, z: 802 },
      { x: -1060, z: 760 },
      { x: -1060, z: 720 }
    ];
  }
  const routesFromMainland = {
    centre: [
      { x: 726, z: 330 },
      { x: 550, z: 530 },
      { x: 360, z: 740 },
      { x: 170, z: 950 },
      { x: 0, z: 1146 }
    ],
    hanlans: [
      { x: 726, z: 330 },
      { x: 380, z: 490 },
      { x: -40, z: 675 },
      { x: -430, z: 865 },
      { x: -720, z: 1036 }
    ],
    wards: [
      { x: 726, z: 330 },
      { x: 840, z: 520 },
      { x: 960, z: 725 },
      { x: 1065, z: 930 },
      { x: 1140, z: 1126 }
    ]
  };
  if (fromId === 'mainland' && routesFromMainland[toId]) {
    return routesFromMainland[toId];
  }
  if (toId === 'mainland' && routesFromMainland[fromId]) {
    return routesFromMainland[fromId].slice().reverse();
  }
  // Inter-island harbour ferry hop along the open Inner Harbour north of the island piers
  const fromDock = FERRY_DOCKS.find(d => d.id === fromId) || FERRY_DOCKS[0];
  const toDock = FERRY_DOCKS.find(d => d.id === toId) || FERRY_DOCKS[1];
  const midX = (fromDock.slipX + toDock.slipX) / 2;
  return [
    { x: fromDock.slipX, z: fromDock.slipZ },
    { x: fromDock.slipX * 0.72 + midX * 0.28, z: 990 },
    { x: midX, z: 955 },
    { x: toDock.slipX * 0.72 + midX * 0.28, z: 990 },
    { x: toDock.slipX, z: toDock.slipZ }
  ];
}

function evalFerrySpline(prog, dir) {
  const p = Math.max(0, Math.min(1, prog));
  let waypoints = ferryController.waypoints && ferryController.waypoints.length >= 2
    ? ferryController.waypoints
    : (dir === 'to_mainland' ? FERRY_WAYPOINTS.slice().reverse() : FERRY_WAYPOINTS);

  const first = waypoints[0];
  const second = waypoints[1];
  const last = waypoints[waypoints.length - 1];
  const prevLast = waypoints[waypoints.length - 2];
  const p_minus_1 = { x: first.x - (second.x - first.x), z: first.z - (second.z - first.z) };
  const p_plus_1 = { x: last.x + (last.x - prevLast.x), z: last.z + (last.z - prevLast.z) };
  const pts = [p_minus_1, ...waypoints, p_plus_1];

  const numSegs = waypoints.length - 1;
  const seg_t = p * numSegs;
  const seg = Math.min(numSegs - 1, Math.floor(seg_t));
  const t = seg_t - seg;

  const p0 = pts[seg];
  const p1 = pts[seg + 1];
  const p2 = pts[seg + 2];
  const p3 = pts[seg + 3];

  const t2 = t * t;
  const t3 = t2 * t;

  const x = 0.5 * ((2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const z = 0.5 * ((2 * p1.z) +
    (-p0.z + p2.z) * t +
    (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
    (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

  return { x, z };
}

function startFerryRide(dir, explicitFromId) {
  if (ferryController.isMoving || !city || !city.islandFerry) return;
  closeFerryPanel();

  let fromId = explicitFromId || FERRY_DOCKS[currentFerryDockIndex()].id;
  let toId = 'centre';
  let isAirport = false;

  if (dir === 'airport_to_island') {
    fromId = 'airport_mainland';
    toId = 'airport_island';
    isAirport = true;
  } else if (dir === 'airport_to_mainland') {
    fromId = 'airport_island';
    toId = 'airport_mainland';
    isAirport = true;
  } else if (dir === 'to_mainland') {
    if (fromId === 'mainland') fromId = 'centre';
    toId = 'mainland';
  } else if (dir === 'to_hanlans') {
    toId = 'hanlans';
  } else if (dir === 'to_wards') {
    toId = 'wards';
  } else {
    // 'to_island' or 'to_centre'
    if (!explicitFromId) fromId = 'mainland';
    toId = 'centre';
  }

  ferryController.dir = dir;
  ferryController.fromDock = fromId;
  ferryController.toDock = toId;
  ferryController.isAirportFerry = isAirport;
  ferryController.waypoints = getFerryRouteWaypoints(fromId, toId);
  ferryController.isMoving = true;
  ferryController.progress = 0;
  ferryController.duration = isAirport ? 4.5 : 8.5;
  state.onFerry = true;
  if (scene.fog) scene.fog.density = 0.00065;
  audio.playFerryHorn();

  // Face forward over the bow at initial boarding, while allowing full 360° free look during the voyage!
  const curPos = evalFerrySpline(0, dir);
  const nxtPos = evalFerrySpline(0.02, dir);
  const initialHeading = Math.atan2(nxtPos.x - curPos.x, nxtPos.z - curPos.z);
  ferryController.lastHeading = initialHeading;
  ferryController.heading = initialHeading;
  // Camera forward vector at yaw is (-sin(yaw), 0, -cos(yaw)), so yaw = heading + Math.PI faces forward along (dx, dz)!
  const forwardYaw = initialHeading + Math.PI;
  player.yaw = forwardYaw;
  player.pitch = -0.04;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = forwardYaw;
  camera.rotation.x = player.pitch;

  let msg = '🚢 TORONTO ISLAND FERRY: DEPARTING...';
  if (isAirport) {
    msg = toId === 'airport_island'
      ? '✈️ BILLY BISHOP AIRPORT FERRY: CROSSING WESTERN GAP TO ISLAND AIRPORT (CYTZ)...'
      : '🏙️ BILLY BISHOP AIRPORT FERRY: CROSSING WESTERN GAP TO MAINLAND BATHURST QUAY...';
  } else {
    const destObj = FERRY_DOCKS.find(d => d.id === toId);
    msg = `🚢 TORONTO ISLAND FERRY: DEPARTING FOR ${destObj ? destObj.name.toUpperCase() : 'CENTRE ISLAND'}...`;
  }
  showAnnouncement(msg, 3500);

  const ferry = isAirport ? city.islandFerry.airportFerryMesh : city.islandFerry.ferryMesh;
  if (ferry) {
    ferry.isPlayerFerry = true;
  }
  player.velocity.set(0, 0, 0);
}

function updateFerry(dt) {
  if (!ferryController.isMoving || !city || !city.islandFerry) return;
  const ferry = ferryController.isAirportFerry
    ? (city.islandFerry.airportFerryMesh || city.islandFerry.ferryMesh)
    : city.islandFerry.ferryMesh;
  if (!ferry) return;

  ferryController.progress += dt / ferryController.duration;
  const prog = Math.max(0, Math.min(1, ferryController.progress));
  // Smooth cubic Hermite curve easing
  const easeProg = prog * prog * (3 - 2 * prog);

  const curPos = evalFerrySpline(easeProg, ferryController.dir);
  const nextPos = evalFerrySpline(Math.min(1, easeProg + 0.015), ferryController.dir);
  const prevPos = evalFerrySpline(Math.max(0, easeProg - 0.015), ferryController.dir);
  const heading = Math.atan2(nextPos.x - prevPos.x, nextPos.z - prevPos.z);

  if (ferryController.lastHeading !== undefined) {
    let dHeading = heading - ferryController.lastHeading;
    while (dHeading > Math.PI) dHeading -= Math.PI * 2;
    while (dHeading < -Math.PI) dHeading += Math.PI * 2;
    player.yaw += dHeading;
  }
  ferryController.lastHeading = heading;
  ferryController.heading = heading;

  const fx = curPos.x;
  const fz = curPos.z;

  const waterY = (city && city.waterY !== undefined) ? city.waterY : FERRY_WATER_Y;
  const bob = Math.sin(prog * Math.PI * 6) * 0.12;
  ferry.position.set(fx, waterY + bob, fz);
  ferry.rotation.y = heading;

  // Keep player on the forward upper sun deck overlooking the bow as the vessel glides into the destination slip!
  const fwdDist = ferryController.isAirportFerry ? 4.5 : 11.0;
  const deckH = ferryController.isAirportFerry ? 2.1 : 6.75;
  const fwdX = fx + Math.sin(heading) * fwdDist;
  const fwdZ = fz + Math.cos(heading) * fwdDist;
  player.pos.set(fwdX, waterY + deckH + EYE_HEIGHT + bob, fwdZ);
  player.velocity.set(0, 0, 0);
  if (scene.fog) scene.fog.density = 0.00065;

  if (ferryController.progress >= 1.0) {
    arriveFerry(ferryController.dir);
  }
}

function arriveFerry(dir) {
  ferryController.isMoving = false;
  state.onFerry = false;
  audio.playFerryArrival();

  const waterY = (city && city.waterY !== undefined) ? city.waterY : FERRY_WATER_Y;

  if (ferryController.isAirportFerry) {
    const aFerry = city.islandFerry.airportFerryMesh;
    if (ferryController.toDock === 'airport_island') {
      state.onIsland = true;
      if (scene.fog) scene.fog.density = 0.00065;
      const islFloor = (city && city.floorAt) ? city.floorAt(-1060, 870) : 0.55;
      player.pos.set(-1060, islFloor + EYE_HEIGHT, 870);
      player.yaw = Math.PI; // facing south (+Z) toward Billy Bishop Terminal & Porter Q400s
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = Math.PI;
      if (aFerry) {
        aFerry.position.set(-1060, waterY, 842);
        aFerry.rotation.y = 0;
      }
      showAnnouncement('✈️ WELCOME TO BILLY BISHOP TORONTO CITY AIRPORT (CYTZ)!\nExplore the Passenger Terminal, Runway 08/26 & Porter Dash-8 Q400 Aircraft!', 5000);
      populateCentreIslandCitizens();
    } else {
      state.onIsland = false;
      if (scene.fog) scene.fog.density = 0.0021;
      const mainFloor = (city && city.floorAt) ? city.floorAt(-1060, 702) : 0.55;
      player.pos.set(-1060, mainFloor + EYE_HEIGHT, 702);
      player.yaw = 0; // facing north (-Z) toward Bathurst Quay & downtown
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = 0;
      if (aFerry) {
        aFerry.position.set(-1060, waterY, 720);
        aFerry.rotation.y = Math.PI;
      }
      showAnnouncement('🏙️ WELCOME BACK TO TORONTO MAINLAND • BATHURST QUAY TERMINAL', 4000);
    }
    return;
  }

  const ferry = city.islandFerry.ferryMesh;
  const destDock = FERRY_DOCKS.find(d => d.id === ferryController.toDock) || (dir === 'to_mainland' ? FERRY_DOCKS[0] : FERRY_DOCKS[1]);

  if (destDock.onIsland) {
    state.onIsland = true;
    if (scene.fog) scene.fog.density = 0.00065;
    const islandFloor = (city && city.floorAt) ? city.floorAt(destDock.boardX, destDock.boardZ) : 0.55;
    player.pos.set(destDock.boardX, islandFloor + EYE_HEIGHT, destDock.boardZ);
    player.yaw = destDock.yaw;
    player.velocity.set(0, 0, 0);
    player.isGrounded = true;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = destDock.yaw;

    if (ferry) {
      ferry.position.set(destDock.slipX, waterY, destDock.slipZ);
      ferry.rotation.y = 0;
    }

    const welcomeMap = {
      centre: '🌳 WELCOME TO CENTRE ISLAND • TORONTO ISLAND PARK 🌸\nEnjoy the beaches, Centreville rides, Pizza Pizza & Hedge Maze!',
      hanlans: '✈️ WELCOME TO HANLAN\'S POINT • WEST TORONTO ISLAND 🏖️\nWalk west to Billy Bishop Airport & Porter Q400s or south to Hanlan\'s Beach!',
      wards: '🏡 WELCOME TO WARD\'S ISLAND • EAST ISLAND VILLAGE 🌲\nExplore the unique forest cottages, woodland paths, Ward\'s Cafe & Boardwalk!'
    };
    showAnnouncement(welcomeMap[destDock.id] || welcomeMap.centre, 5000);
    populateCentreIslandCitizens();
  } else {
    state.onIsland = false;
    if (scene.fog) scene.fog.density = 0.0021;
    const mainFloor = (city && city.floorAt) ? city.floorAt(712, 318) : 0.5;
    player.pos.set(712, mainFloor + EYE_HEIGHT, 318);
    player.yaw = 0; // facing north (-Z) towards Queens Quay & downtown
    player.velocity.set(0, 0, 0);
    player.isGrounded = true;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = 0;

    if (ferry) {
      ferry.position.set(726, waterY, 330);
      ferry.rotation.y = 0.05;
    }

    showAnnouncement('🏙️ WELCOME BACK TO TORONTO MAINLAND • QUEENS QUAY WEST', 4000);
  }
}

// ============================================================================
// CN TOWER GLASS ELEVATOR, 2-FLOOR OBSERVATION DECK & SKY SHOWDOWN SYSTEMS
// ============================================================================

const EYE_HEIGHT = 1.7;

const elevatorController = {
  cabY: 0.15,
  startY: 0.15,
  targetY: 0.15,
  fromStop: 0,
  targetStop: 0,
  isMoving: false,
  direction: 0,
  progress: 0,
  duration: 5.5,
  doorProgress: 1.0, // 0 = closed, 1 = open
  state: 'ground',
  humTimer: 0
};

// Floor-select panel state
const elevatorPanel = { open: false, highlight: 0 };

function elevatorStops() {
  return (city && city.cnElevator && city.cnElevator.stops) || [];
}

// Which stop the player is standing at, by feet height
function currentStopIndex() {
  const feet = player.pos.y - EYE_HEIGHT;
  const stops = elevatorStops();
  let best = 0, bestD = Infinity;
  stops.forEach((s, i) => {
    const d = Math.abs(feet - s.feet);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

function buildElevatorPanel() {
  const list = document.getElementById('elevator-floor-list');
  if (!list) return;
  const stops = elevatorStops();
  const here = currentStopIndex();
  list.innerHTML = '';
  // Top floor first, like a real elevator panel
  for (let i = stops.length - 1; i >= 0; i--) {
    const s = stops[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'elev-floor-btn' + (i === here ? ' is-here' : '') + (i === elevatorPanel.highlight ? ' is-highlight' : '');
    btn.dataset.stop = String(i);
    btn.innerHTML =
      `<span class="elev-floor-key">${i + 1}</span>` +
      `<span class="elev-floor-text"><span class="elev-floor-label">${s.label}</span>` +
      `<span class="elev-floor-name">${s.name}</span>` +
      `<span class="elev-floor-sub">${i === here ? 'You are here' : s.sub}</span></span>`;
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectElevatorFloor(i);
    });
    list.appendChild(btn);
  }
}

function openElevatorPanel() {
  if (state.inElevator || !city || !city.cnElevator) return;
  const here = currentStopIndex();
  const n = elevatorStops().length;
  // Pre-select the most likely trip: ground -> Level 1, anywhere up top -> ground
  elevatorPanel.highlight = here === 0 ? 1 : 0;
  if (elevatorPanel.highlight >= n) elevatorPanel.highlight = 0;
  elevatorPanel.open = true;
  buildElevatorPanel();
  const el = document.getElementById('elevator-panel');
  if (el) el.classList.remove('hidden');
  audio.playElevatorDing();

  // Free mouse cursor from pointer lock so player can easily move mouse and click floor buttons!
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function closeElevatorPanel() {
  if (!elevatorPanel.open) return;
  elevatorPanel.open = false;
  const el = document.getElementById('elevator-panel');
  if (el) el.classList.add('hidden');

  // Re-acquire pointer lock if playing in mouse-look mode and not paused
  if (state.inGame && !state.freeMouseMode && !state.isPaused && !state.isDead && !state.inElevator) {
    container.requestPointerLock();
  }
}

function moveElevatorHighlight(delta) {
  const n = elevatorStops().length;
  if (!n) return;
  elevatorPanel.highlight = (elevatorPanel.highlight + delta + n) % n;
  buildElevatorPanel();
}

function selectElevatorFloor(idx) {
  const stops = elevatorStops();
  if (idx < 0 || idx >= stops.length) return;
  closeElevatorPanel();
  if (idx === currentStopIndex()) {
    showAnnouncement(`🛗 YOU'RE ALREADY ON ${stops[idx].label}`, 1800);
    return;
  }
  startElevatorRide(idx);
}

window.openElevatorPanel = openElevatorPanel;
window.closeElevatorPanel = closeElevatorPanel;
window.selectElevatorFloor = selectElevatorFloor;

function startElevatorRide(targetIdx) {
  if (elevatorController.isMoving || !city || !city.cnElevator) return;
  const stops = elevatorStops();
  const from = currentStopIndex();
  const target = stops[targetIdx];
  if (!target) return;

  // The cab comes to the player's floor first (doors are shut, so this is instant)
  elevatorController.cabY = stops[from].y;
  elevatorController.fromStop = from;
  elevatorController.targetStop = targetIdx;
  elevatorController.startY = elevatorController.cabY;
  elevatorController.targetY = target.y;
  elevatorController.direction = target.y > elevatorController.cabY ? 1 : -1;
  elevatorController.isMoving = true;
  elevatorController.progress = 0;
  elevatorController.doorProgress = 0;
  const dist = Math.abs(target.y - elevatorController.startY);
  elevatorController.duration = Math.max(2.5, Math.min(8.5, dist / 42.0));
  state.inElevator = true;
  if (state.telescopeActive) exitTelescope();

  audio.playElevatorDing();

  city.cnElevator.cab.position.y = elevatorController.cabY;
  player.pos.set(city.cnElevator.pos.x, elevatorController.cabY + EYE_HEIGHT, city.cnElevator.pos.z);
  player.velocity.set(0, 0, 0);

  const verb = elevatorController.direction > 0 ? 'ASCENDING' : 'DESCENDING';
  const elevHud = document.getElementById('elevator-hud');
  if (elevHud) {
    elevHud.classList.remove('hidden');
    const levelName = document.getElementById('elev-level-name');
    if (levelName) levelName.innerText = `${verb} TO ${target.label} • ${target.name}`;
  }
  showAnnouncement(`🚀 GLASS ELEVATOR ${verb}: ${target.label} • ${target.name}`, 3000);
}

function updateElevator(dt) {
  if (!city || !city.cnElevator) return;
  const elevCab = city.cnElevator.cab;
  const doors = city.cnElevator.doors;

  if (elevatorController.isMoving) {
    elevatorController.progress += dt / elevatorController.duration;
    const t = Math.max(0, Math.min(1, elevatorController.progress));
    const smoothT = t * t * (3 - 2 * t);
    const startY = elevatorController.startY;
    elevatorController.cabY = startY + (elevatorController.targetY - startY) * smoothT;

    elevatorController.humTimer += dt;
    if (elevatorController.humTimer > 0.45) {
      elevatorController.humTimer = 0;
      audio.playElevatorHum(0.8 + smoothT * 0.5);
    }

    elevCab.position.y = elevatorController.cabY;
    player.pos.set(city.cnElevator.pos.x, elevatorController.cabY + EYE_HEIGHT, city.cnElevator.pos.z);
    player.velocity.set(0, 0, 0);

    if (doors && doors.length === 2) {
      doors[0].position.z = -0.7;
      doors[1].position.z = 0.7;
    }

    const fogProg = Math.max(0, Math.min(1, (elevatorController.cabY - 2.0) / 340.0));
    if (scene.fog) scene.fog.density = THREE.MathUtils.lerp(0.0021, 0.00065, fogProg);

    const altVal = document.getElementById('elev-alt-val');
    if (altVal) altVal.innerText = `${Math.round(elevatorController.cabY)} m`;
    const gaugeFill = document.getElementById('elev-gauge-fill');
    if (gaugeFill) gaugeFill.style.width = `${Math.round((elevatorController.cabY / 354.0) * 100)}%`;

    if (elevatorController.progress >= 1.0) arriveElevator();
  } else if (doors && doors.length === 2) {
    doors[0].position.z = -1.5;
    doors[1].position.z = 1.5;
  }
}

function arriveElevator() {
  const elevCab = city.cnElevator.cab;
  const doors = city.cnElevator.doors;
  const idx = elevatorController.targetStop;
  const stop = elevatorStops()[idx];

  elevatorController.isMoving = false;
  elevatorController.cabY = elevatorController.targetY;
  elevCab.position.y = elevatorController.cabY;
  state.inElevator = false;
  audio.playElevatorArrival();
  if (doors && doors.length === 2) {
    doors[0].position.z = -1.5;
    doors[1].position.z = 1.5;
  }
  const elevHud = document.getElementById('elevator-hud');
  if (elevHud) elevHud.classList.add('hidden');

  // Step out through the doors onto solid floor, facing away from the cab
  const exit = city.cnElevator.exitFor(idx);
  player.pos.set(exit.x, exit.feet + EYE_HEIGHT, exit.z);
  player.velocity.set(0, 0, 0);
  player.isGrounded = true;
  player.yaw = exit.yaw;
  player.pitch = 0;

  elevatorController.state = stop.id;
  state.onObservationDeck = idx > 0;
  state.deckFloor = Math.max(1, idx);
  if (scene.fog && idx === 0) scene.fog.density = 0.0021;

  const msgs = [
    '🕊️ BACK ON THE PLAZA • CN TOWER PEACE SANCTUARY',
    '🌟 LEVEL 1 • 342m GLASS FLOOR & OUTDOOR SKYTERRACE 🌟',
    '🔭 LEVEL 2 • 348m MAIN LOOKOUT & TELESCOPES 🔭',
    '🍽️ LEVEL 3 • 354m 360 RESTAURANT 🍽️'
  ];
  showAnnouncement(msgs[idx] || stop.name, 4000);
}

// Kept for older callers: floor under (x, z) given EYE height
function getDeckFloorY(x, z, eyeY) {
  if (city && city.floorAt) return city.floorAt(x, z, eyeY - EYE_HEIGHT);
  return 342.0;
}

let activeDeckAction = null;

function setDeckPrompt(key, text) {
  const promptEl = document.getElementById('deck-action-prompt');
  const actionText = document.getElementById('deck-action-text');
  const actionKey = document.getElementById('deck-action-key');
  if (promptEl && actionText && actionKey) {
    actionKey.innerText = key;
    actionText.innerText = text;
    promptEl.classList.remove('hidden');
  }
}

function updateObservationDeck(dt) {
  if (!city) return;
  const promptEl = document.getElementById('deck-action-prompt');
  activeDeckAction = null;

  if (state.inElevator || state.onFerry) {
    if (promptEl) promptEl.classList.add('hidden');
    closeElevatorPanel();
    closeFerryPanel();
    return;
  }

  const feet = player.pos.y - EYE_HEIGHT;

  // Toronto Island Ferry Docks (Jack Layton Terminal, Centre, Hanlan's, Ward's & Billy Bishop Airport Ferry)
  if (feet < 15) {
    const dMainDock = Math.hypot(player.pos.x - 712, player.pos.z - 318);
    const inMainDock = dMainDock < 22 || (player.pos.x >= 695 && player.pos.x <= 738 && player.pos.z >= 295 && player.pos.z <= 348);
    if (inMainDock) {
      activeDeckAction = 'ferry_to_island';
      setDeckPrompt('[E]', 'TORONTO ISLAND FERRIES • CHOOSE DOCK (CENTRE / HANLAN\'S / WARD\'S)');
      return;
    }
    const dArchDock = Math.hypot(player.pos.x - 0, player.pos.z - 1200);
    const inArchDock = dArchDock < 28 || (Math.abs(player.pos.x) <= 20 && player.pos.z >= 1160 && player.pos.z <= 1230);
    const dIslandDock = Math.hypot(player.pos.x - 180, player.pos.z - 1085);
    const inIslandDock = inArchDock || dIslandDock < 22 || (player.pos.x >= 165 && player.pos.x <= 195 && player.pos.z >= 1060 && player.pos.z <= 1095);
    if (inIslandDock) {
      activeDeckAction = 'ferry_to_mainland';
      setDeckPrompt('[E]', 'CENTRE ISLAND DOCK • CHOOSE DESTINATION DOCK');
      return;
    }
    const dHanlansDock = Math.hypot(player.pos.x - (-720), player.pos.z - 1090);
    const inHanlansDock = dHanlansDock < 28 || (player.pos.x >= -745 && player.pos.x <= -695 && player.pos.z >= 1055 && player.pos.z <= 1125);
    if (inHanlansDock) {
      activeDeckAction = 'ferry_from_hanlans';
      setDeckPrompt('[E]', 'HANLAN\'S POINT DOCK • CHOOSE DESTINATION DOCK');
      return;
    }
    const dWardsDock = Math.hypot(player.pos.x - 1140, player.pos.z - 1180);
    const inWardsDock = dWardsDock < 28 || (player.pos.x >= 1115 && player.pos.x <= 1165 && player.pos.z >= 1145 && player.pos.z <= 1215);
    if (inWardsDock) {
      activeDeckAction = 'ferry_from_wards';
      setDeckPrompt('[E]', 'WARD\'S ISLAND DOCK • CHOOSE DESTINATION DOCK');
      return;
    }
    // Billy Bishop Airport Ferry (Western Gap Channel: Bathurst Quay <-> Island Airport)
    const dAirportMain = Math.hypot(player.pos.x - (-1060), player.pos.z - 702);
    const inAirportMain = dAirportMain < 24 || (player.pos.x >= -1076 && player.pos.x <= -1044 && player.pos.z >= 668 && player.pos.z <= 718);
    if (inAirportMain) {
      activeDeckAction = 'airport_ferry_to_island';
      setDeckPrompt('[E]', 'BOARD BILLY BISHOP AIRPORT FERRY (TO ISLAND AIRPORT TERMINAL)');
      return;
    }
    const dAirportIsland = Math.hypot(player.pos.x - (-1060), player.pos.z - 870);
    const inAirportIsland = dAirportIsland < 24 || (player.pos.x >= -1076 && player.pos.x <= -1044 && player.pos.z >= 848 && player.pos.z <= 900);
    if (inAirportIsland) {
      activeDeckAction = 'airport_ferry_to_mainland';
      setDeckPrompt('[E]', 'BOARD BILLY BISHOP AIRPORT FERRY (TO MAINLAND BATHURST QUAY)');
      return;
    }
    if (ferryPanel.open && dMainDock > 32 && dArchDock > 34 && dHanlansDock > 34 && dWardsDock > 34) {
      closeFerryPanel();
    }
  }

  if (!city.cnElevator) return;
  const elevPos = city.cnElevator.pos;
  const dElev = Math.hypot(player.pos.x - elevPos.x, player.pos.z - elevPos.z);
  const elevCallR = (elevPos.shaftR || 2.35) + 1.9;

  // Ground: the cab doors or the pavilion entrance
  if (feet < 20) {
    const dPav = Math.hypot(player.pos.x - city.cnElevator.entrancePavilion.doorX, player.pos.z - city.cnElevator.entrancePavilion.doorZ);
    if (dElev < elevCallR || dPav < 4.5) {
      activeDeckAction = 'elevator';
      setDeckPrompt('[E]', 'CN TOWER ELEVATOR • CHOOSE A FLOOR');
      return;
    }
    // Only auto-close if player has walked well away from the elevator entrance (> 8m)
    if (dElev > 8.0 && dPav > 8.0) {
      closeElevatorPanel();
    }
  }

  if (feet > 200) {
    state.onObservationDeck = true;
    state.deckFloor = feet > 351.0 ? 3 : (feet > 345.0 ? 2 : 1);

    const cx = city.landmarks.cnTower[0];
    const cz = city.landmarks.cnTower[1];
    const dx = player.pos.x - cx;
    const dz = player.pos.z - cz;
    const r = Math.hypot(dx, dz);

    // Glass floor mesh sits on the SOUTH side (+z) of Level 1, r 9.5 to 17.5
    const onSouthGlassFloor = (state.deckFloor === 1 && dz > 5.0 && Math.abs(dx) < 7.8 && r >= 9.5 && r <= 17.5);
    const glassFloorEl = document.getElementById('glass-floor-indicator');
    if (glassFloorEl) glassFloorEl.classList.toggle('hidden', !onSouthGlassFloor);

    if (dElev < elevCallR && [342, 348, 354].some(y => Math.abs(feet - y) < 0.6)) {
      activeDeckAction = 'elevator';
      setDeckPrompt('[E]', 'GLASS ELEVATOR • CHOOSE A FLOOR');
      return;
    }
    // Only auto-close if player has walked away (> 8m)
    if (dElev > 8.0) {
      closeElevatorPanel();
    }

    if (state.deckFloor === 2 && city.cnElevator.viewfinders && !state.telescopeActive) {
      for (let i = 0; i < city.cnElevator.viewfinders.length; i++) {
        const vf = city.cnElevator.viewfinders[i];
        const dVf = Math.hypot(player.pos.x - vf.worldX, player.pos.z - vf.worldZ);
        if (dVf < 2.5) {
          activeDeckAction = { type: 'telescope', vf };
          setDeckPrompt('[E] / [V]', `PEER THROUGH TELESCOPE: ${vf.name}`);
          return;
        }
      }
    }

    if (state.deckFloor === 2 && !state.skyShowdownActive && city.cnElevator.terminal) {
      const term = city.cnElevator.terminal;
      const dTerm = Math.hypot(player.pos.x - term.x, player.pos.z - term.z);
      if (dTerm < 2.6) {
        activeDeckAction = 'start_showdown';
        setDeckPrompt('[G]', 'START SKY SHOWDOWN MINI-GAME');
        return;
      }
    }
  } else {
    state.onObservationDeck = false;
    const glassFloorEl = document.getElementById('glass-floor-indicator');
    if (glassFloorEl) glassFloorEl.classList.add('hidden');
  }

  if (promptEl) promptEl.classList.add('hidden');
}

function handleDeckAction() {
  if (!activeDeckAction) return false;
  if (
    activeDeckAction === 'ferry_to_island' ||
    activeDeckAction === 'ferry_to_mainland' ||
    activeDeckAction === 'ferry_from_hanlans' ||
    activeDeckAction === 'ferry_from_wards'
  ) {
    if (ferryPanel.open) closeFerryPanel();
    else openFerryPanel();
    return true;
  }
  if (activeDeckAction === 'airport_ferry_to_island') {
    startFerryRide('airport_to_island');
    return true;
  }
  if (activeDeckAction === 'airport_ferry_to_mainland') {
    startFerryRide('airport_to_mainland');
    return true;
  }
  if (activeDeckAction === 'elevator') {
    if (elevatorPanel.open) closeElevatorPanel();
    else openElevatorPanel();
    return true;
  }
  if (activeDeckAction.type === 'telescope') {
    enterTelescope(activeDeckAction.vf);
    return true;
  }
  return false;
}

function handleTelescopeAction() {
  if (state.telescopeActive) {
    exitTelescope();
    return true;
  }
  if (activeDeckAction && activeDeckAction.type === 'telescope') {
    enterTelescope(activeDeckAction.vf);
    return true;
  }
  return false;
}

function enterTelescope(vf) {
  state.telescopeActive = true;
  state.telescopeTarget = vf;
  state.telescopeZoomIndex = 0;
  state.telescopeBaseYaw = vf.yaw;
  state.telescopeBasePitch = vf.pitch;
  state.telescopeOffsetYaw = 0;
  state.telescopeOffsetPitch = 0;

  player.yaw = vf.yaw;
  player.pitch = vf.pitch;

  audio.playTelescopeClick();
  document.body.classList.add('telescope-mode');

  const overlay = document.getElementById('telescope-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    const nameEl = document.getElementById('telescope-name');
    const descEl = document.getElementById('telescope-desc');
    const dirEl = document.getElementById('telescope-dir');
    if (nameEl) nameEl.innerText = vf.name;
    if (descEl) descEl.innerText = vf.desc;
    if (dirEl) dirEl.innerText = `🔭 LOOKOUT VISTA • ${vf.id.toUpperCase()}`;
  }

  updateTelescopeButtons();
  updateTelescopeTelemetry();
}

function exitTelescope() {
  if (!state.telescopeActive) return;
  state.telescopeActive = false;
  state.telescopeTarget = null;
  audio.playTelescopeClick();
  document.body.classList.remove('telescope-mode');

  const overlay = document.getElementById('telescope-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function setTelescopeZoom(index) {
  if (!state.telescopeActive) return;
  state.telescopeZoomIndex = Math.max(0, Math.min(state.telescopeZooms.length - 1, index));
  audio.playTelescopeClick();
  updateTelescopeButtons();
  updateTelescopeTelemetry();
}

function cycleTelescopeZoom(dir = 1) {
  if (!state.telescopeActive) return;
  const count = state.telescopeZooms.length;
  state.telescopeZoomIndex = (state.telescopeZoomIndex + dir + count) % count;
  audio.playTelescopeClick();
  updateTelescopeButtons();
  updateTelescopeTelemetry();
}

function updateTelescopeButtons() {
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById(`tele-zoom-btn-${i}`);
    if (btn) {
      if (i === state.telescopeZoomIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
  const zoomLabel = document.getElementById('tele-zoom-label');
  if (zoomLabel) {
    zoomLabel.innerText = `MAGNIFICATION: ${state.telescopeZooms[state.telescopeZoomIndex].label}`;
  }
}

function updateTelescopeTelemetry() {
  const compassEl = document.getElementById('tele-compass');
  if (compassEl) {
    let deg = Math.round(((-player.yaw * 180 / Math.PI) % 360 + 360) % 360);
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const dirIdx = Math.round(deg / 22.5) % 16;
    compassEl.innerText = `🧭 BEARING: ${deg}° ${dirs[dirIdx]}`;
  }
}

function updateTelescope(dt) {
  const targetFov = state.telescopeActive
    ? state.telescopeZooms[state.telescopeZoomIndex].fov
    : 78;
  if (Math.abs(camera.fov - targetFov) > 0.1) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, 14 * dt);
    camera.updateProjectionMatrix();
  }
}

function updateRotatingRestaurant(dt) {
  if (!city || !city.cnElevator || !city.cnElevator.rotatingRestaurantRing || !city.landmarks || !city.landmarks.cnTower) return;
  const rotSpeed = 0.035; // gentle, elegant restaurant rotation (~1.5 deg/sec)
  const dRot = rotSpeed * dt;
  city.cnElevator.rotatingRestaurantRing.rotation.y += dRot;

  const cx = city.landmarks.cnTower[0];
  const cz = city.landmarks.cnTower[1];
  const cosA = Math.cos(dRot);
  const sinA = Math.sin(dRot);

  // Helper to rotate a position on the revolving outer dining ring (r in [11.0, 23.2])
  function rotateOnPlatform(pos) {
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const r = Math.hypot(dx, dz);
    if (r >= 11.0 && r <= 23.2) {
      pos.x = cx + (dx * cosA + dz * sinA);
      pos.z = cz + (-dx * sinA + dz * cosA);
      return true;
    }
    return false;
  }

  // 1. If player is on Level 3 (354m) on the revolving outer dining ring, carry them along!
  if (player.pos.y > 351.0 && !state.inElevator) {
    if (rotateOnPlatform(player.pos)) {
      player.yaw += dRot;
    }
  }

  // 2. Rotate enemies and bosses standing on the revolving outer ring
  if (Array.isArray(enemies)) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.isDead || !e.rig || !e.rig.root) continue;
      const ePos = e.rig.root.position;
      if (ePos.y > 351.0) {
        if (rotateOnPlatform(ePos)) {
          if (e.rig.root.rotation) e.rig.root.rotation.y += dRot;
        }
      }
    }
  }

  // 3. Rotate loot pickups on the revolving outer ring
  if (Array.isArray(pickups)) {
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (!p || !p.mesh) continue;
      const pPos = p.mesh.position;
      if (pPos.y > 351.0) {
        if (rotateOnPlatform(pPos)) {
          p.mesh.rotation.y += dRot;
        }
      }
    }
  }
}

window.setTelescopeZoom = setTelescopeZoom;
window.exitTelescope = exitTelescope;

// ----------------------------------------------------------------------------
// CN TOWER SKY SHOWDOWN MINI-GAME
// ----------------------------------------------------------------------------
let deckEnemies = [];
let showdownBossRef = null;

function handleShowdownAction() {
  if (activeDeckAction === 'start_showdown') {
    startSkyShowdown();
    return true;
  }
  return false;
}

function startSkyShowdown() {
  state.skyShowdownActive = true;
  state.skyShowdownWave = 1;
  state.skyShowdownCleared = false;
  audio.playShowdownAlert();

  const hud = document.getElementById('sky-showdown-hud');
  if (hud) hud.classList.remove('hidden');

  showAnnouncement('🚨 SECURITY ALERT: SKY SHOWDOWN COMMENCED! DEFEND THE CN TOWER! 🚨', 4000);
  spawnShowdownWave(1);
}

function spawnShowdownWave(waveNum) {
  state.skyShowdownWave = waveNum;
  deckEnemies = [];

  const waveTag = document.getElementById('showdown-wave-tag');
  const subEl = document.getElementById('showdown-sub');
  const countEl = document.getElementById('showdown-count');
  const bossWrap = document.getElementById('sky-boss-bar-wrap');
  if (bossWrap) bossWrap.classList.add('hidden');

  if (waveTag) waveTag.innerText = `WAVE ${waveNum} / 3`;

  if (waveNum === 1) {
    if (subEl) subEl.innerText = 'LEVEL 2: LOOKOUT DECK DEFENSE';
    if (countEl) countEl.innerText = '3 INTRUDERS REMAINING';
    // Spawn 3 brawlers on Floor 2 around the lookout deck where showdown starts
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.8;
      const r = 16.5;
      spawnDeckFighter(348.0, a, r, (i % 3), 'LOOKOUT BRAWLER');
    }
  } else if (waveNum === 2) {
    if (subEl) subEl.innerText = 'LEVEL 1: GLASS FLOOR ASSAULT';
    if (countEl) countEl.innerText = '4 INTRUDERS ON GLASS FLOOR';
    // Spawn 4 brawlers on Floor 1 on the Glass Floor (player descends stairs to fight)
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI * 2) / 4 + 0.3;
      spawnDeckFighter(342.0, a, 13.5, (i % 4), 'GLASS FLOOR INFILTRATOR');
    }
  } else if (waveNum === 3) {
    if (subEl) subEl.innerText = 'APEX MINI-BOSS DUEL';
    if (countEl) countEl.innerText = 'THE SKY APEX BRUTE & 2 ENFORCERS';
    if (bossWrap) bossWrap.classList.remove('hidden');

    // Spawn 2 Elite Enforcers on Floor 2
    spawnDeckFighter(348.0, 0.8, 16.0, 1, 'ELITE SKY ENFORCER');
    spawnDeckFighter(348.0, 2.4, 16.0, 2, 'ELITE SKY ENFORCER');

    // Spawn The Sky Apex Brute (Mini-Boss)
    spawnDeckFighter(348.0, 3.8, 15.5, 3, 'THE SKY APEX BRUTE', true);
  }
}

function spawnDeckFighter(floorY, angle, radius, archIdx, name, isBoss = false) {
  if (!city || !city.landmarks || !city.landmarks.cnTower) return;
  const cx = city.landmarks.cnTower[0] + Math.cos(angle) * radius;
  const cz = city.landmarks.cnTower[1] + Math.sin(angle) * radius;

  const enemyObj = spawnEnemy(cx, cz, archIdx, isBoss, name);
  enemyObj.isDeckEnemy = true;
  enemyObj.deckFloorY = floorY;
  enemyObj.isSkyBoss = isBoss;

  if (enemyObj.rig && enemyObj.rig.root) {
    enemyObj.rig.root.position.y = floorY;
    if (isBoss) {
      enemyObj.rig.root.scale.multiplyScalar(1.25);
      enemyObj.maxHp = 420;
      enemyObj.hp = 420;
      enemyObj.damage = 25;
      enemyObj.rig.updateNameplate(420, 420, true);
      showdownBossRef = enemyObj;
      const bossBar = document.getElementById('sky-boss-bar-fill');
      if (bossBar) bossBar.style.width = '100%';
    }
  }

  deckEnemies.push(enemyObj);
}

function onDeckEnemyDefeated(enemy) {
  const idx = deckEnemies.indexOf(enemy);
  if (idx >= 0) deckEnemies.splice(idx, 1);

  const aliveDeck = deckEnemies.filter(e => !e.isDead && !e.isKnockedOut);
  const countEl = document.getElementById('showdown-count');
  if (countEl) {
    countEl.innerText = `${aliveDeck.length} INTRUDERS REMAINING`;
  }

  if (enemy.isSkyBoss) {
    const bossWrap = document.getElementById('sky-boss-bar-wrap');
    if (bossWrap) bossWrap.classList.add('hidden');
    showdownBossRef = null;
  }

  if (aliveDeck.length === 0 && state.skyShowdownActive) {
    if (state.skyShowdownWave === 1) {
      showAnnouncement('⚡ WAVE 1 CLEARED! DESCEND TO LEVEL 1 TO DEFEND THE GLASS FLOOR! ⚡', 3500);
      setTimeout(() => spawnShowdownWave(2), 2500);
    } else if (state.skyShowdownWave === 2) {
      showAnnouncement('⚠️ WAVE 2 CLEARED! ASCEND TO LEVEL 2 FOR THE APEX MINI-BOSS DUEL! ⚠️', 3500);
      setTimeout(() => spawnShowdownWave(3), 2800);
    } else if (state.skyShowdownWave === 3) {
      // VICTORY!
      state.skyShowdownActive = false;
      state.skyShowdownCleared = true;
      audio.playShowdownVictory();

      state.score += 5000;
      updateHUDScore();

      showAnnouncement('🏆 CN TOWER SKY SHOWDOWN CHAMPION! TOWER SECURED! 🏆', 6000);

      const hud = document.getElementById('sky-showdown-hud');
      if (hud) hud.classList.add('hidden');

      // Launch spectacular celebration fireworks outside CN Tower windows!
      triggerDeckFireworks();

      // Spawn Golden Victory Trophy Crate on Floor 2
      spawnGoldenSkyCrate();
    }
  }
}

function spawnGoldenSkyCrate() {
  if (!city || !city.landmarks || !city.landmarks.cnTower) return;
  const cx = city.landmarks.cnTower[0] - 8.5;
  const cz = city.landmarks.cnTower[1];
  const goldCrateMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 0.95,
      roughness: 0.15
    })
  );
  goldCrateMesh.position.set(cx, 348.0 + 0.8, cz);
  scene.add(goldCrateMesh);

  crates.push({
    mesh: goldCrateMesh,
    loot: 'SLAM',
    desc: '🏆 GOLDEN SKY APEX TROPHY • CANADIAN BERSERK!',
    hp: 50,
    destroyed: false,
    isSkyGoldenCrate: true
  });
}

// ----------------------------------------------------------------------------
// CELEBRATION FIREWORKS OVER DOWNTOWN TORONTO
// ----------------------------------------------------------------------------
const deckFireworks = [];

function triggerDeckFireworks() {
  if (!city || !city.landmarks || !city.landmarks.cnTower) return;
  const cx = city.landmarks.cnTower[0];
  const cz = city.landmarks.cnTower[1];

  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const a = Math.random() * Math.PI * 2;
      const r = 35.0 + Math.random() * 25.0;
      const y = 338.0 + Math.random() * 30.0;
      const fx = cx + Math.cos(a) * r;
      const fz = cz + Math.sin(a) * r;
      createFireworkBurst(fx, y, fz);
    }, i * 350);
  }
}

function createFireworkBurst(x, y, z) {
  audio.playFireworks();
  const colors = [0x38bdf8, 0xef4444, 0xfacc15, 0x4ade80, 0xa855f7, 0xf43f5e];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const count = 45;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 6, 6),
      new THREE.MeshBasicMaterial({ color, fog: false })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const speed = 12.0 + Math.random() * 16.0;
    const vel = new THREE.Vector3(
      speed * Math.sin(phi) * Math.cos(theta),
      speed * Math.cos(phi),
      speed * Math.sin(phi) * Math.sin(theta)
    );

    particles.push({ mesh, vel, life: 1.2, maxLife: 1.2 });
  }

  deckFireworks.push(...particles);
}

function updateFireworks(dt) {
  for (let i = deckFireworks.length - 1; i >= 0; i--) {
    const p = deckFireworks[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      deckFireworks.splice(i, 1);
      continue;
    }
    p.mesh.position.addScaledVector(p.vel, dt);
    p.vel.y -= 9.8 * dt; // gravity
    p.vel.multiplyScalar(0.97); // air resistance
    const scale = p.life / p.maxLife;
    p.mesh.scale.set(scale, scale, scale);
  }
}

// ============================================================================
// CONTROLS & POINTER LOCK MANAGEMENT (NEVER TRAPS CURSOR!)
// ============================================================================
const keys = {};
let mouseSensitivity = 0.0024;

// Pointer Lock Change Listener
document.addEventListener('pointerlockchange', () => {
  state.isPointerLocked = (document.pointerLockElement === container);
  const tag = document.getElementById('mouse-status-tag');

  if (state.isPointerLocked) {
    tag.innerText = 'MOUSE: LOCKED (FPS)';
    tag.className = 'tag tag-green';
  } else {
    tag.innerText = 'MOUSE: UNLOCKED';
    tag.className = 'tag tag-dim';
  }

  // When pointer lock is lost in mouse-look mode (e.g. user pressed Esc), pause the game
  // (unless the elevator or ferry panel is intentionally open for destination selection)
  if (!state.isPointerLocked && state.inGame && !state.freeMouseMode && !state.isDead && !state.isPaused && !elevatorPanel.open && !ferryPanel.open) {
    pauseGame();
  }
});

// Canvas Click & Mousedown: Executes attacks during gameplay with zero dropped inputs
container.addEventListener('mousedown', (e) => {
  if (!state.inGame || state.isPaused || state.isDead || elevatorPanel.open || ferryPanel.open) return;
  if (e.button === 0) {
    // If near the active mission box, instantly crack it open!
    if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
      const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
      if (dBox <= 6.5) {
        completeMission();
        return;
      }
    }
    triggerAttack();
  }
});

container.addEventListener('click', (e) => {
  if (!state.inGame || state.isPaused || state.isDead || elevatorPanel.open || ferryPanel.open) return;
  if (state.telescopeActive) {
    if (!e.target.closest('.telescope-card') && !e.target.closest('.telescope-telemetry-top')) {
      cycleTelescopeZoom(1);
    }
    return;
  }
  if (e.button === 0 && state.attackTimer <= 0) {
    triggerAttack();
  }
});

// Mouse wheel zoom cycling in telescope view
window.addEventListener('wheel', (e) => {
  if (state.telescopeActive) {
    e.preventDefault();
    cycleTelescopeZoom(e.deltaY < 0 ? 1 : -1);
  }
}, { passive: false });

// Mouse Movement: Rotates camera or swivels telescope
document.addEventListener('mousemove', (e) => {
  if (state.isDead || state.isPaused || elevatorPanel.open || ferryPanel.open) return;
  if (state.telescopeActive) {
    const zoomRatio = (camera.fov / 78);
    const sens = mouseSensitivity * zoomRatio * 0.9;
    state.telescopeOffsetYaw = Math.max(-0.65, Math.min(0.65, state.telescopeOffsetYaw - e.movementX * sens));
    state.telescopeOffsetPitch = Math.max(-0.45, Math.min(0.35, state.telescopeOffsetPitch - e.movementY * sens));
    player.yaw = state.telescopeBaseYaw + state.telescopeOffsetYaw;
    player.pitch = state.telescopeBasePitch + state.telescopeOffsetPitch;
    updateTelescopeTelemetry();
    return;
  }
  if (state.isPointerLocked || (state.freeMouseMode && e.buttons === 2)) {
    player.yaw -= e.movementX * mouseSensitivity;
    player.pitch -= e.movementY * mouseSensitivity;
    player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch));
  }
});

// Click listener on observation deck prompt pill
const deckPromptEl = document.getElementById('deck-action-prompt');
if (deckPromptEl) {
  deckPromptEl.style.cursor = 'pointer';
  deckPromptEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDeckAction) {
      if (activeDeckAction.type === 'telescope') {
        enterTelescope(activeDeckAction.vf);
      } else if (activeDeckAction === 'start_showdown') {
        startSkyShowdown();
      } else {
        handleDeckAction();
        if (!state.freeMouseMode && !elevatorPanel.open && !ferryPanel.open && container && container.requestPointerLock && !state.isPointerLocked) {
          container.requestPointerLock();
        }
      }
    }
  });
}

// Keyboard - use e.code exclusively to prevent Shift/caps desync
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  // Toronto Island Ferry Dock Selector Keyboard Controls
  if (ferryPanel.open) {
    if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
      const numStr = e.code.replace(/\D/g, '') || e.key;
      const keyNum = parseInt(numStr, 10);
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= FERRY_DOCKS.length) {
        e.preventDefault();
        e.stopPropagation();
        selectFerryDock(keyNum - 1);
        return;
      }
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      e.stopPropagation();
      moveFerryHighlight(-1);
      return;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      moveFerryHighlight(1);
      return;
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      selectFerryDock(ferryPanel.highlight);
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyE') {
      e.preventDefault();
      e.stopPropagation();
      closeFerryPanel();
      return;
    }
    return;
  }

  // CN Tower Elevator Floor Selector Keyboard Controls
  if (elevatorPanel.open) {
    // Number keys 1-4 directly choose floor
    if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
      const numStr = e.code.replace(/\D/g, '') || e.key;
      const keyNum = parseInt(numStr, 10);
      const stops = elevatorStops();
      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= stops.length) {
        e.preventDefault();
        e.stopPropagation();
        selectElevatorFloor(keyNum - 1);
        return;
      }
    }
    // Arrow keys or W/S to navigate floors
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      e.stopPropagation();
      moveElevatorHighlight(-1);
      return;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      moveElevatorHighlight(1);
      return;
    }
    // Enter or Space confirms highlighted floor
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      selectElevatorFloor(elevatorPanel.highlight);
      return;
    }
    // Escape or E closes panel
    if (e.code === 'Escape' || e.code === 'KeyE') {
      e.preventDefault();
      e.stopPropagation();
      closeElevatorPanel();
      return;
    }
    return;
  }

  // Active Telescope hotkeys: Z, +, - for zoom; Esc, E, V to exit
  if (state.telescopeActive) {
    if (e.code === 'KeyZ' || e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      cycleTelescopeZoom(1);
      return;
    }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      cycleTelescopeZoom(-1);
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyV') {
      e.preventDefault();
      exitTelescope();
      return;
    }
  }

  // Cheat code: [Shift] + 1 (or '!') triggers Canadian Berserker Mode with full timeout
  if (e.key === '!' || (e.shiftKey && (e.code === 'Digit1' || e.key === '1'))) {
    e.preventDefault();
    state.rage = 100;
    updateRageBar();
    activateBerserkMode();
    showAnnouncement("🍁 CHEAT ACTIVATED: CANADIAN BERSERK MODE! 🍁");
    return;
  }

  // Secret Cheat Code: [Shift] + I teleports directly to the Mainland Ferry Dock (or toggles to Centre Island)
  if (e.shiftKey && (e.code === 'KeyI' || e.key === 'I' || e.key === 'i')) {
    e.preventDefault();
    if (state.telescopeActive) exitTelescope();
    if (elevatorPanel.open) closeElevatorPanel();
    if (state.onFerry) state.onFerry = false;

    const onIslandWorld = (islands && islands.isInsideIslands(player.pos.x, player.pos.z)) || player.pos.z > 840;
    const dMainDock = Math.hypot(player.pos.x - 712, player.pos.z - 318);

    if (onIslandWorld) {
      // Teleport back from Islands Archipelago to Mainland Jack Layton Terminal!
      const mainFloor = (city && city.floorAt) ? city.floorAt(712, 318) : 0.5;
      player.pos.set(712, mainFloor + EYE_HEIGHT, 318);
      player.yaw = -0.35; // facing the ferry slip & boarding gantry
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = -0.35;
      camera.rotation.x = 0;
      state.onIsland = false;
      if (scene.fog) scene.fog.density = 0.0021;
      audio.playFerryHorn();
      showAnnouncement("🏙️ CHEAT: TELEPORTED TO MAINLAND FERRY DOCK (JACK LAYTON TERMINAL)!", 3200);
    } else if (dMainDock < 22) {
      // Already at mainland dock: teleport across to Dedicated Toronto Islands Archipelago!
      const islFloor = islands ? islands.floorAt(0, 1200) : 0.55;
      player.pos.set(0, islFloor + EYE_HEIGHT, 1200);
      player.yaw = 0; // facing south down Avenue of the Island
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = 0;
      camera.rotation.x = 0;
      state.onIsland = true;
      if (scene.fog) scene.fog.density = 0.00065;
      audio.playFerryArrival();
      showAnnouncement("🌳 CHEAT: TELEPORTED TO DEDICATED TORONTO ISLANDS ARCHIPELAGO! 🌸\nCentre Island, Olympic, Gibraltar Lighthouse, Airport & Ward's Island!", 4500);
      populateCentreIslandCitizens();
    } else {
      // Teleport to Mainland Ferry Dock (Jack Layton Ferry Terminal)
      const mainFloor = (city && city.floorAt) ? city.floorAt(712, 318) : 0.5;
      player.pos.set(712, mainFloor + EYE_HEIGHT, 318);
      player.yaw = -0.35; // facing the ferry slip & boarding gantry
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = -0.35;
      camera.rotation.x = 0;
      state.onIsland = false;
      if (scene.fog) scene.fog.density = 0.0021;
      audio.playFerryHorn();
      showAnnouncement("🚢 CHEAT: TELEPORTED TO MAINLAND FERRY DOCK (JACK LAYTON TERMINAL)!", 3200);
    }
    return;
  }

  // Difficulty Hotkeys: [ (BracketLeft) decrease, ] (BracketRight) increase
  if (e.code === 'BracketLeft') {
    e.preventDefault();
    cycleDifficulty(-1);
    return;
  }
  if (e.code === 'BracketRight') {
    e.preventDefault();
    cycleDifficulty(1);
    return;
  }

  // Quick box smash if standing right near the mission container
  if ((e.code === 'KeyF' || e.code === 'KeyE') && missionState.active && missionState.state === 'active' && missionState.boxObj) {
    const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
    if (dBox <= 6.5) {
      completeMission();
      return;
    }
  }

  if (e.code === 'KeyF') triggerAttack();
  if (e.code === 'KeyE') {
    if (handleDeckAction()) {
      e.preventDefault();
      return;
    }
    if (state.unlocked[ATTACKS.KICK.id]) triggerQuickKick();
  }
  if (e.code === 'KeyV') {
    if (handleTelescopeAction()) {
      e.preventDefault();
      return;
    }
    if (window.aiCopilot) {
      e.preventDefault();
      window.aiCopilot.toggle();
      return;
    }
  }
  if (e.code === 'KeyN') {
    if (window.aiCopilot && window.aiCopilot.cyclePersona) {
      e.preventDefault();
      window.aiCopilot.cyclePersona();
      return;
    }
  }
  if (e.code === 'KeyB') {
    if (window.aiCopilot && window.aiCopilot.cycleMode) {
      e.preventDefault();
      window.aiCopilot.cycleMode();
      return;
    }
  }
  if (e.code === 'KeyM') {
    e.preventDefault();
    if (audio) audio.toggleMute();
    return;
  }
  if (e.code === 'KeyG') {
    if (handleShowdownAction()) {
      e.preventDefault();
      return;
    }
  }

  if (e.code.startsWith('Digit') && !e.shiftKey) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= 4) selectAttackSlot(n);
  }

  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
  }
  if (e.code === 'Space') e.preventDefault(); // stop page scroll
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (state.inGame && !state.isPaused && state.unlocked[ATTACKS.KICK.id]) {
    triggerQuickKick();
  }
});

function selectAttackSlot(num) {
  const list = [ATTACKS.JAB, ATTACKS.HOOK, ATTACKS.KICK, ATTACKS.SLAM];
  const target = list[num - 1];
  if (target && state.unlocked[target.id]) {
    state.activeAttack = target;
    updateHUDWeapon();
  }
}

// Pause Management
function pauseGame() {
  state.isPaused = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const overlay = document.getElementById('menu-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('menu-title').innerText = 'GAME PAUSED';
  document.getElementById('menu-subtitle').innerText = 'FIGHTER READY. SELECT MODE TO RESUME:';
  document.getElementById('start-mouse-btn').innerText = 'RESUME GAME (MOUSE LOOK)';
  document.getElementById('start-free-btn').innerText = 'RESUME GAME (FREE MOUSE MODE)';
}

function resumeGame(usePointerLock = true) {
  state.isPaused = false;
  state.inGame = true;
  state.freeMouseMode = !usePointerLock;
  const overlay = document.getElementById('menu-overlay');
  if (overlay) overlay.classList.add('hidden');

  try {
    if (!state.hasShownSpawnIntro && city && city.spawnLocations) {
      state.hasShownSpawnIntro = true;
      const currentLoc = city.spawnLocations[currentTourIndex] || city.start;
      if (currentLoc) {
        showAnnouncement(`📍 EXPLORING TORONTO: ${currentLoc.name.toUpperCase()}\n${currentLoc.desc || ''}`, 3600);
      }
    }
  } catch (err) {
    console.warn('Spawn announcement error:', err);
  }

  try {
    if (usePointerLock && container && container.requestPointerLock) {
      container.requestPointerLock();
    } else if (!usePointerLock && document.pointerLockElement && document.exitPointerLock) {
      document.exitPointerLock();
    }
  } catch (err) {
    console.warn('Pointer lock request error:', err);
  }
}

function togglePause() {
  if (state.isPaused) {
    resumeGame(!state.freeMouseMode);
  } else {
    pauseGame();
  }
}

document.getElementById('esc-unlock-btn').addEventListener('click', () => {
  pauseGame();
});

// ============================================================================
// ATTACK & GLORY KILL EXECUTION MECHANICS
// ============================================================================
// Fraction of each attack animation at which the blow actually connects
const IMPACT_FRACTION = { punch: 0.3, heavy: 0.42, kick: 0.4, slam: 0.5 };

function triggerAttack() {
  if (state.attackTimer > 0 || state.isDead || state.isPaused) return;

  // Immediate Mission Crate Hit Check (works anywhere, even in peace sanctuary!)
  if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
    const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
    if (dBox <= 6.5) {
      completeMission();
      state.attackTimer = 0.25;
      state.attackDuration = 0.25;
      state.isAttacking = true;
      state.currentAnimType = 'punch';
      audio.playPunch(1.2, state.isBerserk);
      return;
    }
  }

  // Peace Sanctuary: No fighting allowed against humans at ground level (allowed on observation deck!)
  if (city && city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y)) {
    audio.playPeaceChime?.();
    return;
  }

  // Check Glory Kill Execution on nearby staggered fighter
  if (state.gloryTarget) {
    executeGloryKill(state.gloryTarget);
    return;
  }

  // Airborne + Meteor Slam Unlocked -> METEOR JUMP SLAM!
  if (!player.isGrounded && state.unlocked[ATTACKS.SLAM.id]) {
    executeMeteorSlam();
    return;
  }

  const atk = state.activeAttack;
  state.attackTimer = atk.cooldown;
  state.attackDuration = atk.cooldown;
  state.isAttacking = true;
  state.attackProgress = 0;
  state.currentAnimType = atk.type;
  if (atk.type === 'punch') vm.jabHand = vm.jabHand === 'right' ? 'left' : 'right';

  audio.playPunch(atk.type === 'heavy' ? 1.6 : 1.0, state.isBerserk);
  if (window.multiplayer && window.multiplayer.broadcastAttack) {
    window.multiplayer.broadcastAttack(atk.type);
  }

  // Land the hit on the frame the fist reaches full extension
  setTimeout(() => {
    checkMeleeHits(atk);
  }, atk.cooldown * (IMPACT_FRACTION[atk.type] || 0.35) * 1000);
}

function triggerQuickKick() {
  if (state.attackTimer > 0 || state.isDead || state.isPaused) return;

  // Immediate Mission Crate Hit Check
  if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
    const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
    if (dBox <= 6.5) {
      completeMission();
      state.attackTimer = 0.32;
      state.attackDuration = 0.32;
      state.isAttacking = true;
      state.currentAnimType = 'kick';
      audio.playPunch(1.4, state.isBerserk);
      return;
    }
  }

  // Peace Sanctuary: No fighting allowed against humans at ground level (allowed on observation deck!)
  if (city && city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y)) {
    audio.playPeaceChime?.();
    return;
  }

  const atk = ATTACKS.KICK;
  state.attackTimer = atk.cooldown;
  state.attackDuration = atk.cooldown;
  state.isAttacking = true;
  state.attackProgress = 0;
  state.currentAnimType = 'kick';

  audio.playPunch(1.4, state.isBerserk);
  if (window.multiplayer && window.multiplayer.broadcastAttack) {
    window.multiplayer.broadcastAttack('kick');
  }

  setTimeout(() => {
    checkMeleeHits(atk);
  }, atk.cooldown * IMPACT_FRACTION.kick * 1000);
}

function executeMeteorSlam() {
  // If near mission box, allow meteor slam even in peace sanctuary to smash the crate
  let allowSlamInPeace = false;
  if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
    const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
    if (dBox <= 8.0) allowSlamInPeace = true;
  }

  if (!allowSlamInPeace && city && city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y)) {
    audio.playPeaceChime?.();
    return;
  }

  const atk = ATTACKS.SLAM;
  state.attackTimer = atk.cooldown;
  state.attackDuration = atk.cooldown;
  state.isAttacking = true;
  state.attackProgress = 0;
  state.currentAnimType = 'slam';

  // Rocket downward with immense slam velocity
  player.velocity.y = -22.0;
  audio.playPunch(2.4, true);
  if (window.multiplayer && window.multiplayer.broadcastAttack) {
    window.multiplayer.broadcastAttack('slam');
  }

  const checkImpact = setInterval(() => {
    if (player.isGrounded) {
      clearInterval(checkImpact);

      // Detonation on impact
      audio.playImpact('slam');
      triggerScreenShake(28);
      triggerSlamFlash();
      createMeteorShockwave(player.pos.x, player.pos.z);
      spawnDebris(player.pos.x, 0.5, player.pos.z, 0xffaa00, 40, 11);

      // Hit all enemies in AoE
      enemies.forEach(enemy => {
        if (enemy.isDead) return;
        const dist = enemy.sprite.position.distanceTo(player.pos);
        if (dist <= atk.range) {
          const dmg = state.isBerserk ? atk.damage * 2.5 : atk.damage;
          hitEnemy(enemy, dmg, atk.knockback * 1.6, 'slam');
        }
      });

      // Break crates
      crates.forEach(crate => {
        if (crate.destroyed) return;
        const dist = crate.mesh.position.distanceTo(player.pos);
        if (dist <= atk.range) damageCrate(crate, 300);
      });

      // Check Mission Crate Slam
      if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
        const dist = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
        if (dist <= atk.range + 3.0) completeMission();
      }
    }
  }, 25);
}

function executeGloryKill(enemy) {
  state.gloryTarget = null;
  state.attackTimer = 0.5;
  state.attackDuration = 0.5;
  state.attackProgress = 0;
  state.isAttacking = true;
  state.currentAnimType = 'heavy';

  audio.playImpact('glory');
  triggerScreenShake(20);

  const pos = enemy.rig ? enemy.rig.root.position : enemy.sprite.position;
  if (enemy.kind === 'snatcher') {
    spawnDebris(pos.x, 1.2, pos.z, 0xc026d3, 50, 11);
  } else {
    spawnDebris(pos.x, 1.2, pos.z, 0x00f0ff, 35, 10);
    spawnDebris(pos.x, 1.2, pos.z, 0xffd700, 25, 9);
  }

  // Guaranteed Health & Shield drops
  state.health = Math.min(state.maxHealth, state.health + 35);
  state.armor = Math.min(state.maxArmor, state.armor + 30);
  updateHUDHealth();

  killEnemy(enemy, true);
}

// Expose combat triggers globally for AI Copilot / Watch AI Mode
window.triggerAttack = triggerAttack;
window.triggerQuickKick = triggerQuickKick;
window.executeMeteorSlam = executeMeteorSlam;
window.executeGloryKill = executeGloryKill;

function checkMeleeHits(atk) {
  let hitSomething = false;

  // Check Active Mission Crate
  if (missionState.active && missionState.state === 'active' && missionState.boxObj) {
    const distToMission = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
    if (distToMission <= 6.5) {
      completeMission();
      hitSomething = true;
    }
  }

  // Check Crates
  crates.forEach(crate => {
    if (crate.destroyed) return;
    const dist = crate.mesh.position.distanceTo(camera.position);
    if (dist <= atk.range) {
      if (city && player.pos.y < 50 && !city.hasLineOfSight(camera.position.x, camera.position.z, crate.mesh.position.x, crate.mesh.position.z)) {
        return; // Building wall blocks melee strike
      }
      const dirToCrate = crate.mesh.position.clone().sub(camera.position).normalize();
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const dot3D = dirToCrate.dot(forward);
      // Horizontal cone check so low crates on the sidewalk are never missed by camera pitch
      const dx = crate.mesh.position.x - camera.position.x, dz = crate.mesh.position.z - camera.position.z;
      const dH = Math.hypot(dx, dz);
      const dotH = dH > 0.01 ? (dx * forward.x + dz * forward.z) / dH : 1.0;
      const isFacing = dot3D > 0.45 || (dotH > 0.58 && Math.abs(crate.mesh.position.y - camera.position.y) < 2.5);
      if (isFacing) {
        damageCrate(crate, state.isBerserk ? atk.damage * 3 : atk.damage);
        hitSomething = true;
      }
    }
  });

  // Check Enemies
  enemies.forEach(enemy => {
    if (enemy.isDead || enemy.isKnockedOut) return;
    const pos = enemy.rig ? enemy.rig.root.position : enemy.sprite.position;
    const dist = pos.distanceTo(camera.position);
    if (dist <= atk.range) {
      if (city && player.pos.y < 50 && !city.hasLineOfSight(camera.position.x, camera.position.z, pos.x, pos.z)) {
        return; // Building wall blocks melee strike
      }
      const dirToEnemy = pos.clone().sub(camera.position).normalize();
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const dot3D = dirToEnemy.dot(forward);
      // Horizontal cone check so punches connect cleanly to enemy torso/head even with pitch differences
      const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z;
      const dH = Math.hypot(dx, dz);
      const dotH = dH > 0.01 ? (dx * forward.x + dz * forward.z) / dH : 1.0;
      const isFacing = dot3D > 0.45 || (dotH > 0.55 && Math.abs(pos.y - camera.position.y) < 2.5);
      if (isFacing) {
        const dmg = state.isBerserk ? atk.damage * 3 : atk.damage;
        const kb = state.isBerserk ? atk.knockback * 2.2 : atk.knockback;
        hitEnemy(enemy, dmg, kb, atk.type);
        hitSomething = true;
      }
    }
  });

  // Check Remote Players (Multiplayer Co-op / PvP)
  if (window.multiplayer && window.multiplayer.checkMeleeHits) {
    if (window.multiplayer.checkMeleeHits(atk)) {
      hitSomething = true;
    }
  }

  if (hitSomething) {
    // Freeze-frame + camera recoil sell the weight of the blow
    state.hitStop = atk.type === 'punch' ? 0.045 : atk.type === 'heavy' ? 0.075 : 0.09;
    state.camPunch = atk.type === 'punch' ? 0.5 : 1.0;
    showHitMarker();
    triggerScreenShake(state.isBerserk ? atk.knockback * 1.5 : atk.knockback * 0.7);
    if (state.isBerserk) {
      audio.playHockeySlapshot();
    } else {
      audio.playImpact(atk.type);
    }
    registerCombo();
  }
}

function damageCrate(crate, dmg) {
  crate.hp -= dmg;
  spawnDebris(crate.mesh.position.x, 0.9, crate.mesh.position.z, 0x8b5a2b, 15, 6);

  if (crate.hp <= 0 && !crate.destroyed) {
    crate.destroyed = true;
    scene.remove(crate.mesh);
    audio.playCrateSmash();
    spawnDebris(crate.mesh.position.x, 0.9, crate.mesh.position.z, 0x5c3818, 40, 9);
    spawnPickup(crate.mesh.position.x, 0.9, crate.mesh.position.z, crate.loot, crate.desc);

    state.boxesSmashed++;
    state.score += 200;
    document.getElementById('hud-boxes').innerText = `${state.boxesSmashed}/${state.totalBoxes}`;
    document.getElementById('hud-score').innerText = state.score;
  }
}

function setEnemyTint(enemy, hex) {
  if (enemy.rig && enemy.rig.materials) {
    enemy.rig.materials.forEach(mat => mat.color.setHex(hex));
  }
}

function restoreEnemyTint(enemy) {
  if (enemy.rig && enemy.rig.materials && enemy.rig.originalColors) {
    enemy.rig.materials.forEach((mat, i) => mat.color.setHex(enemy.rig.originalColors[i]));
  }
}

function exposeBodySnatcher(enemy) {
  if (enemy.unmasked) return;
  enemy.unmasked = true;
  audio.playAlienScreech();
  triggerScreenShake(14);
  if (enemy.rig && enemy.rig.unmaskSnatcher) {
    enemy.rig.unmaskSnatcher();
  }
  if (enemy.rig && enemy.rig.updateNameplate) {
    enemy.rig.updateNameplate(enemy.hp, enemy.maxHp, enemy.isStaggered);
  }
}

// attacker: undefined for the local player, or { id, pos } when the host applies a guest's hit
function hitEnemy(enemy, dmg, knockback, type, attacker) {
  if (enemy.isDead || enemy.isKnockedOut) return;

  // 0. NETWORK MIRROR (we're a guest): show the hit now, let the host decide what it did
  if (enemy.isRemoteMirror) {
    if (type === 'car') return;   // the host's own traffic handles its NPCs
    mirrorHitCosmetics(enemy, type);
    if (window.multiplayer) window.multiplayer.sendEnemyHit(enemy.netId, dmg, knockback, type, false);
    return;
  }
  const srcPos = (attacker && attacker.pos) || player.pos;
  const remoteId = attacker ? attacker.id : null;
  enemy.lastHitType = type;

  // 1a. BERSERK NEVER HURTS CIVILIANS: the hockey-stick rampage just shoves them out of the way
  //     (no damage, no penalty). Requested by the game's #1 player.
  const attackerBerserk = attacker ? !!attacker.berserk : state.isBerserk;
  if (enemy.kind === 'civilian' && attackerBerserk && type !== 'car') {
    shoveCivilianAside(enemy, srcPos);
    return;
  }

  // 1. INNOCENT CIVILIAN HIT HANDLING
  if (enemy.kind === 'civilian') {
    enemy.hp -= dmg;
    enemy.flinchTimer = 0.25;
    enemy.isFleeing = true;
    enemy.fleeTimer = 6.0;

    // Score penalty goes to whoever threw the punch (a car isn't anybody's punch)
    if (type !== 'car') creditScore({ ev: 'civ_hit' }, remoteId);
    setEnemyTint(enemy, 0x22c55e); // gentle green warning flash
    setTimeout(() => {
      if (!enemy.isDead && !enemy.isStaggered) restoreEnemyTint(enemy);
    }, 120);

    // Update 3D overhead health bar
    if (enemy.rig && enemy.rig.updateNameplate) {
      enemy.rig.updateNameplate(enemy.hp, enemy.maxHp, false);
    }

    // Knockback physics
    const pos = enemy.rig ? enemy.rig.root.position : enemy.sprite.position;
    const dir = pos.clone().sub(srcPos); dir.y = 0; dir.normalize();
    enemy.vx = dir.x * knockback * 0.9;
    enemy.vz = dir.z * knockback * 0.9;
    spawnDebris(pos.x, 1.0, pos.z, 0x38bdf8, 12, 6);

    // CRITICAL USER CONSTRAINT: don't reset combos for attacking civilians, just lose points!

    if (enemy.hp <= 0 && !enemy.isDead) {
      killEnemy(enemy, false, attacker);
    }
    return;
  }

  // 2. BODY SNATCHER UNMASKING ON IMPACT
  if (enemy.kind === 'snatcher' && !enemy.unmasked) {
    exposeBodySnatcher(enemy);
  }

  // 3. HOSTILE ROBOT OR EXPOSED SNATCHER HIT
  enemy.hp -= dmg;
  enemy.flinchTimer = 0.22;

  if (enemy.kind === 'robot') {
    audio.playRobotClank();
  }

  // Update 3D overhead health bar
  if (enemy.rig && enemy.rig.updateNameplate) {
    enemy.rig.updateNameplate(enemy.hp, enemy.maxHp, enemy.isStaggered);
  }

  // Check for Staggered Glory Kill Threshold (low HP)
  if (enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.32) {
    enemy.isStaggered = true;
    enemy.staggerTimer = 4.5;
    setEnemyTint(enemy, 0xffea00); // Flashing gold
    if (enemy.rig && enemy.rig.updateNameplate) {
      enemy.rig.updateNameplate(enemy.hp, enemy.maxHp, true);
    }
  } else {
    // Normal flash on hit
    setEnemyTint(enemy, enemy.kind === 'snatcher' ? 0xc026d3 : 0xff2222);
    setTimeout(() => {
      if (!enemy.isDead && !enemy.isStaggered) {
        restoreEnemyTint(enemy);
      }
    }, 110);
  }

  // Update Boss Bar if Mini-Boss
  if (enemy.isSkyBoss) {
    const bossBar = document.getElementById('sky-boss-bar-fill');
    if (bossBar) {
      const pct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
      bossBar.style.width = `${pct}%`;
    }
  }

  // Knockback physics (away from whoever hit it)
  const pos = enemy.rig ? enemy.rig.root.position : enemy.sprite.position;
  const dir = pos.clone().sub(srcPos); dir.y = 0; dir.normalize();
  enemy.vx = dir.x * knockback;
  enemy.vz = dir.z * knockback;

  // Particle debris: Sparks for robot, alien purple slime for snatcher
  if (enemy.kind === 'robot') {
    spawnDebris(pos.x, 1.0, pos.z, 0x00f0ff, 22, 9);
    spawnDebris(pos.x, 1.0, pos.z, 0xf59e0b, 12, 7);
  } else if (enemy.kind === 'snatcher') {
    spawnDebris(pos.x, 1.0, pos.z, 0xc026d3, 24, 8);
  } else {
    spawnDebris(pos.x, 1.0, pos.z, 0xb91c1c, 18, 8);
  }

  if (enemy.hp <= 0 && !enemy.isDead) {
    killEnemy(enemy, false, attacker);
  }
}

function killEnemy(enemy, isGlory = false, attacker) {
  if (enemy.isDead) return;
  if (enemy.isRemoteMirror) {
    // Guest glory kill: the host performs the KO and credits us
    if (isGlory && window.multiplayer) window.multiplayer.sendEnemyHit(enemy.netId, 0, 0, 'glory', true);
    enemy.isStaggered = false;
    return;
  }
  const remoteId = attacker ? attacker.id : null;
  enemy.isDead = true;
  enemy.isKnockedOut = true;
  enemy.koProgress = 0;

  const pos = enemy.rig ? enemy.rig.root.position : enemy.sprite.position;

  // 1. CIVILIAN KO PENALTY
  if (enemy.kind === 'civilian') {
    if (enemy.lastHitType !== 'car') creditScore({ ev: 'civ_ko' }, remoteId);
    spawnDebris(pos.x, 1.0, pos.z, 0x38bdf8, 20, 7);
    // Combos are NOT reset
  } else if (enemy.kind === 'snatcher') {
    // 2. BODY SNATCHER DEFEAT (+400 PTS / +600 Glory)
    creditScore({ ev: 'ko', kind: 'snatcher', glory: !!isGlory }, remoteId);
    spawnDebris(pos.x, 1.0, pos.z, 0xc026d3, 44, 11);
  } else {
    // 3. ROBOT DEFEAT (+250 PTS / +500 Glory)
    creditScore({ ev: 'ko', kind: 'robot', glory: !!isGlory }, remoteId);
    spawnDebris(pos.x, 1.0, pos.z, 0x00f0ff, 32, 10);
    spawnDebris(pos.x, 1.0, pos.z, 0xf59e0b, 20, 8);
  }

  if (enemy.isDeckEnemy) {
    onDeckEnemyDefeated(enemy);
  }

  // Hide overhead nameplate upon KO
  if (enemy.rig && enemy.rig.nameplateSprite) {
    enemy.rig.nameplateSprite.visible = false;
  }

  // Clean up mesh after dramatic knockout fall
  setTimeout(() => {
    if (enemy.rig && enemy.rig.root) scene.remove(enemy.rig.root);

    // If an ambient enemy/civilian was defeated, schedule a reinforcement near the player
    if (!enemy.isMissionGuard && !enemy.isDeckEnemy) {
      const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;
      const aliveAmbient = enemies.filter(e => !e.isDead && !e.isMissionGuard && !e.isDeckEnemy).length;
      if (aliveAmbient < cfg.targetEnemies) {
        setTimeout(() => spawnSingleReinforcement(), 2400);
      }
    }

    // Respawn next wave of fighters when all ambient foes are KO'd
    const ambientThreats = enemies.filter(e => !e.isMissionGuard && !e.isDeckEnemy && e.kind !== 'civilian');
    if (!isNetGuest() && ambientThreats.length > 0 && ambientThreats.every(e => e.isDead)) {
      showAnnouncement("🔥 STREET SECTOR SECURED! NEXT PATROL INCOMING! 🔥");
      setTimeout(() => populateEnemies(), 2200);
    }
  }, 2400);
}

// ---------------------------------------------------------------------------
// SCORE CREDIT — points go to whoever landed the blow (local, or a guest via the host)
// ---------------------------------------------------------------------------
function creditScore(ev, remoteId) {
  if (remoteId) {
    if (window.multiplayer) window.multiplayer.sendScoreEvent(remoteId, ev);
  } else {
    applyScoreEvent(ev);
  }
}

function applyScoreEvent(ev) {
  const scoreEl = document.getElementById('hud-score');
  if (ev.ev === 'civ_hit' || ev.ev === 'civ_ko') {
    state.score = Math.max(0, state.score - (ev.ev === 'civ_hit' ? 100 : 250));
    if (scoreEl) scoreEl.innerText = state.score;
    audio.playPenaltySound();
    audio.playCivilianGasp();
  } else if (ev.ev === 'ko') {
    const snatcher = ev.kind === 'snatcher';
    state.kills++;
    state.score += snatcher ? (ev.glory ? 600 : 400) : (ev.glory ? 500 : 250);
    document.getElementById('hud-kills').innerText = state.kills;
    if (scoreEl) scoreEl.innerText = state.score;
    state.rage = Math.min(100, state.rage + (snatcher ? 30 : 25));
    updateRageBar();
    if (state.rage >= 100 && !state.isBerserk) activateBerserkMode();
    setFaceExpression('grin', snatcher ? 1.5 : 1.4);
    audio.playImpact('heavy');
  }
}

// ---------------------------------------------------------------------------
// HOST-AUTHORITATIVE NPC SYNC
// Snapshot row: [netId, kind, archIdx, x, y, z, rotY, hp, maxHp, flags, guardName]
// flags: 1 punching, 2 staggered, 4 unmasked, 8 dead, 16 fleeing, 32 guard, 64 flinch
// ---------------------------------------------------------------------------
const r2 = v => Math.round(v * 100) / 100;

function buildEnemySnapshot() {
  const rows = [];
  for (const e of enemies) {
    if (!e.rig || e.isDeckEnemy || e.isRemoteMirror) continue;
    if (e.isDead && e.koProgress >= 1) continue;   // KO animation finished on our side
    const p = e.rig.root.position;
    let f = 0;
    if (e.isPunching) f |= 1;
    if (e.isStaggered) f |= 2;
    if (e.unmasked) f |= 4;
    if (e.isDead) f |= 8;
    if (e.isFleeing) f |= 16;
    if (e.isMissionGuard) f |= 32;
    if (e.flinchTimer > 0) f |= 64;
    rows.push([e.netId, e.kind[0], e.archIdx || 0, r2(p.x), r2(p.y), r2(p.z), r2(e.rig.root.rotation.y),
      Math.round(e.hp), e.maxHp, f, e.isMissionGuard ? e.name : 0]);
  }
  return rows;
}

const mirrorsById = new Map();

function removeMirror(e, delayMs) {
  mirrorsById.delete(e.netId);
  const kill = () => {
    if (e.rig && e.rig.root) scene.remove(e.rig.root);
    const i = enemies.indexOf(e);
    if (i !== -1) enemies.splice(i, 1);
  };
  if (delayMs) setTimeout(kill, delayMs); else kill();
}

function nearLocal(e, r) {
  const p = e.rig.root.position;
  return Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < r;
}

function applyEnemySnapshot(rows) {
  const seen = new Set();
  let created = 0;
  for (const row of rows) {
    const [id, k, arch, x, y, z, ry, hp, maxHp, f, guardName] = row;
    seen.add(id);
    let e = mirrorsById.get(id);
    if (!e) {
      if (f & 8) continue;   // never create an already-dead mirror
      // Building a fighter rig is expensive; spread a big initial batch over several
      // snapshots (8 per 100 ms) instead of hitching one frame on join.
      if (created >= 8) continue;
      created++;
      const kind = k === 'c' ? 'civilian' : (k === 's' ? 'snatcher' : 'robot');
      e = spawnEnemy(x, z, kind, arch, !!(f & 32), guardName || null);
      e.isMissionGuard = false; e.guardAnchor = null;   // guarding is the host's business
      e.netId = id;
      e.isRemoteMirror = true;
      e.netTarget = new THREE.Vector3(x, y, z);
      e.netMoving = false;
      e.rig.root.position.set(x, y, z);
      e.rig.root.rotation.y = ry;
      mirrorsById.set(id, e);
    }
    if (e.isDead) continue;
    e.netMoving = Math.hypot(x - e.netTarget.x, z - e.netTarget.z) > 0.03;
    e.netTarget.set(x, y, z);
    e.netRotY = ry;
    e.netPunching = !!(f & 1);
    e.isFleeing = !!(f & 16);
    if (f & 64) e.flinchTimer = Math.max(e.flinchTimer, 0.12);
    if (e.hp !== hp || e.maxHp !== maxHp) {
      e.hp = hp; e.maxHp = maxHp;
      if (e.rig.updateNameplate) e.rig.updateNameplate(hp, maxHp, !!(f & 2));
    }
    if ((f & 2) && !e.isStaggered) { e.isStaggered = true; }
    else if (!(f & 2) && e.isStaggered) { e.isStaggered = false; restoreEnemyTint(e); }
    if ((f & 4) && !e.unmasked) {
      e.unmasked = true;
      if (e.rig.unmaskSnatcher) e.rig.unmaskSnatcher();
      if (nearLocal(e, 20)) { audio.playAlienScreech(); triggerScreenShake(10); }
    }
    if (f & 8) mirrorKO(e);
  }
  // Anything the host no longer reports was despawned (or finished its KO)
  mirrorsById.forEach((e, id) => {
    if (!seen.has(id)) removeMirror(e, e.isDead ? 2400 : 0);
  });
}

function mirrorKO(e) {
  if (e.isDead) return;
  e.isDead = true;
  e.isKnockedOut = true;
  e.koProgress = 0;
  e.isStaggered = false;
  restoreEnemyTint(e);
  if (e.rig && e.rig.nameplateSprite) e.rig.nameplateSprite.visible = false;
  const pos = e.rig.root.position;
  const col = e.kind === 'snatcher' ? 0xc026d3 : (e.kind === 'civilian' ? 0x38bdf8 : 0x00f0ff);
  spawnDebris(pos.x, 1.0, pos.z, col, 30, 10);
  if (nearLocal(e, 40)) audio.playImpact('heavy');
  removeMirror(e, 2400);
}

function shoveCivilianAside(enemy, srcPos) {
  const pos = enemy.rig.root.position;
  let ax = pos.x - srcPos.x, az = pos.z - srcPos.z;
  const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;
  // Mostly sideways, a bit away: they step out of your path rather than flying down the street
  const side = (Math.random() < 0.5 ? 1 : -1);
  const sx = -az * side, sz = ax * side;
  enemy.vx = (sx * 0.8 + ax * 0.45) * 7.5;
  enemy.vz = (sz * 0.8 + az * 0.45) * 7.5;
  enemy.isFleeing = true;
  enemy.fleeTimer = Math.max(enemy.fleeTimer || 0, 2.5);
  enemy.flinchTimer = 0.12;
  spawnDebris(pos.x, 1.1, pos.z, 0xffffff, 8, 4);   // little white "whoosh", not a hit spark
}

function mirrorHitCosmetics(e, type) {
  const pos = e.rig.root.position;
  e.flinchTimer = 0.22;
  if (e.kind === 'civilian' && state.isBerserk) {
    spawnDebris(pos.x, 1.1, pos.z, 0xffffff, 8, 4);   // host will shove them aside
    return;
  }
  if (e.kind === 'civilian') {
    setEnemyTint(e, 0x22c55e);
    audio.playCivilianGasp();
    spawnDebris(pos.x, 1.0, pos.z, 0x38bdf8, 12, 6);
  } else {
    if (e.kind === 'robot') audio.playRobotClank();
    if (!e.isStaggered) setEnemyTint(e, e.kind === 'snatcher' ? 0xc026d3 : 0xff2222);
    spawnDebris(pos.x, 1.0, pos.z, e.kind === 'snatcher' ? 0xc026d3 : 0x00f0ff, 18, 8);
  }
  setTimeout(() => { if (!e.isDead && !e.isStaggered) restoreEnemyTint(e); }, 110);
}

function updateMirrorEnemy(e, dt) {
  const rig = e.rig, p = rig.root.position;
  const gap = p.distanceTo(e.netTarget);
  if (gap > 12) p.copy(e.netTarget); else p.lerp(e.netTarget, Math.min(1, dt * 10));
  let dy = (e.netRotY || 0) - rig.root.rotation.y;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  rig.root.rotation.y += dy * Math.min(1, dt * 12);

  if (e.flinchTimer > 0) {
    e.flinchTimer -= dt;
    rig.torsoPivot.rotation.x = 0.35; rig.headPivot.rotation.x = -0.3;
  } else {
    rig.torsoPivot.rotation.x = 0; rig.headPivot.rotation.x = 0;
  }
  if (e.isStaggered) {
    setEnemyTint(e, Math.sin(Date.now() * 0.02) > 0 ? 0xffea00 : 0xef4444);
    rig.torsoPivot.rotation.x = 0.3;
    rig.headPivot.rotation.z = Math.sin(Date.now() * 0.007) * 0.25;
    rig.leftArmPivot.rotation.x = -0.3; rig.rightArmPivot.rotation.x = -0.3;
    return;
  }

  const calm = e.kind === 'civilian' || (e.kind === 'snatcher' && !e.unmasked);
  if (e.netMoving || gap > 0.08) {
    const rate = e.isFleeing ? 5.5 : (calm ? 2.8 : 3.8);
    const amp = e.isFleeing ? 0.7 : (calm ? 0.45 : 0.6);
    e.walkPhase += dt * (e.speed || 2.6) * rate;
    const s = Math.sin(e.walkPhase) * amp;
    rig.leftLegPivot.rotation.x = s; rig.leftCalfPivot.rotation.x = Math.max(0, -s * 0.6);
    rig.rightLegPivot.rotation.x = -s; rig.rightCalfPivot.rotation.x = Math.max(0, s * 0.6);
    if (calm || e.isFleeing) {
      rig.leftArmPivot.rotation.set(-s * 0.6, 0, 0.08);
      rig.rightArmPivot.rotation.set(s * 0.6, 0, -0.08);
    }
  } else {
    rig.leftLegPivot.rotation.x = 0.1; rig.leftCalfPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = -0.15; rig.rightCalfPivot.rotation.x = 0.1;
  }
  if (calm) return;

  if (e.netPunching && !e.isPunching) {
    e.isPunching = true; e.attackProg = 0;
    e.punchArm = Math.random() > 0.4 ? 'right' : 'left';
    if (nearLocal(e, 15)) audio.playPunch(0.9, false);
  }
  if (e.isPunching) {
    e.attackProg += dt * 3.2;
    const reach = Math.sin(Math.min(1, e.attackProg) * Math.PI);
    const [A, AF, B, BF, sgn] = e.punchArm === 'right'
      ? [rig.rightArmPivot, rig.rightForearmPivot, rig.leftArmPivot, rig.leftForearmPivot, -1]
      : [rig.leftArmPivot, rig.leftForearmPivot, rig.rightArmPivot, rig.rightForearmPivot, 1];
    A.rotation.x = -1.3 - reach * 0.65; AF.rotation.x = -0.2 - reach * 0.75;
    B.rotation.x = -1.2; BF.rotation.x = -0.8;
    rig.torsoPivot.rotation.y = sgn * reach * 0.35;
    if (e.attackProg >= 1) { e.isPunching = false; e.attackProg = 0; }
  } else {
    const sway = Math.sin(Date.now() * 0.004) * 0.08;
    rig.leftArmPivot.rotation.set(-1.15 + sway, 0.3, 0.15);
    rig.leftForearmPivot.rotation.set(-0.85, 0, 0);
    rig.rightArmPivot.rotation.set(-1.25 - sway, -0.3, -0.15);
    rig.rightForearmPivot.rotation.set(-0.85, 0, 0);
  }
}

// Host side: a guest landed a blow on one of our NPCs
function applyNetEnemyHit(msg) {
  const e = enemies.find(x => x.netId === msg.nid && !x.isRemoteMirror);
  if (!e || e.isDead || e.isKnockedOut) return;
  const rp = window.multiplayer && window.multiplayer.remotePlayers.get(msg.from);
  const pos = rp ? rp.eyePos.clone() : player.pos.clone();
  const attacker = { id: msg.from, pos, berserk: !!(rp && rp.isBerserk) };
  if (msg.glory) {
    if (e.isStaggered) killEnemy(e, true, attacker);
    return;
  }
  const dmg = Math.max(0, Math.min(500, Number(msg.dmg) || 0));
  const kb = Math.max(0, Math.min(40, Number(msg.kb) || 0));
  hitEnemy(e, dmg, kb, msg.atype || 'punch', attacker);
}

// Guest side: one of the host's robots punched us
function applyNetEnemyDamage(dmg) {
  if (state.isDead) return;
  if (city && player.pos.y <= 50 && city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y)) return;
  damagePlayer(Math.max(0, Math.min(200, Number(dmg) || 0)));
  audio.playImpact('punch');
}

// Role transitions
function netBecomeGuest() {
  // Drop our own ambient NPCs; the host's city replaces them. Keep our mission guards & deck fights.
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.isRemoteMirror || e.isMissionGuard || e.isDeckEnemy) continue;
    if (e.rig && e.rig.root) scene.remove(e.rig.root);
    enemies.splice(i, 1);
  }
  state.gloryTarget = null;
}

function netBecomeHost() {
  // Host left or we went offline: adopt the mirrors as our own NPCs and keep playing
  mirrorsById.forEach(e => {
    e.isRemoteMirror = false;
    e.netTarget = null;
    if (!e.isDead) {
      restoreEnemyTint(e);
      if (e.rig.updateNameplate) e.rig.updateNameplate(e.hp, e.maxHp, e.isStaggered);
    }
  });
  mirrorsById.clear();
}

window.buildEnemySnapshot = buildEnemySnapshot;
window.applyEnemySnapshot = applyEnemySnapshot;
window.applyNetEnemyHit = applyNetEnemyHit;
window.applyNetEnemyDamage = applyNetEnemyDamage;
window.applyScoreEvent = applyScoreEvent;
window.netBecomeGuest = netBecomeGuest;
window.netBecomeHost = netBecomeHost;

function activateBerserkMode() {
  state.isBerserk = true;
  state.berserkTimer = 16.0;
  showAnnouncement("🍁 CANADIAN BERSERK RAGE! HOCKEY STICK READY! 🍁");
  audio.playBerserkRage();
  audio.stopMusic();
  audio.startOCanada();
  const bOverlay = document.getElementById('berserk-overlay');
  if (bOverlay) bOverlay.style.opacity = '1';
}

function updateRageBar() {
  document.getElementById('rage-bar-fill').style.width = `${state.rage}%`;
}

// ============================================================================
// HUD FACE & 3D ARMS ANIMATIONS
// ============================================================================
const faceCanvas = document.getElementById('hud-face-canvas');
const faceCtx = faceCanvas.getContext('2d');
faceCtx.imageSmoothingEnabled = false;

function drawFace() {
  faceCtx.fillStyle = '#101217';
  faceCtx.fillRect(0, 0, 72, 72);

  // Fighter head
  faceCtx.fillStyle = '#d99e6b';
  faceCtx.fillRect(18, 18, 36, 42);

  // Hair
  faceCtx.fillStyle = '#78350f';
  faceCtx.fillRect(16, 12, 40, 12);
  faceCtx.fillRect(16, 12, 6, 26);
  faceCtx.fillRect(50, 12, 6, 26);

  // Eyes
  const lookOffset = Math.sin(Date.now() * 0.003) > 0.4 ? 2 : 0;
  faceCtx.fillStyle = '#fff';
  faceCtx.fillRect(22, 28, 9, 6);
  faceCtx.fillRect(41, 28, 9, 6);
  faceCtx.fillStyle = state.isBerserk ? '#ff0000' : '#0284c7';
  faceCtx.fillRect(24 + lookOffset, 29, 5, 5);
  faceCtx.fillRect(43 + lookOffset, 29, 5, 5);

  // Mouth
  if (state.faceExpression === 'grin' || state.isBerserk) {
    faceCtx.fillStyle = '#fff';
    faceCtx.fillRect(26, 46, 20, 6);
    faceCtx.fillStyle = '#220000';
    faceCtx.fillRect(26, 46, 20, 1);
  } else if (state.faceExpression === 'hurt') {
    faceCtx.fillStyle = '#450a0a';
    faceCtx.fillRect(28, 45, 16, 8);
  } else {
    faceCtx.fillStyle = '#92400e';
    faceCtx.fillRect(28, 47, 16, 3);
  }

  // Blood cuts on face
  if (state.health < 50) {
    faceCtx.fillStyle = '#dc2626';
    faceCtx.fillRect(20, 22, 4, 10);
    faceCtx.fillRect(44, 40, 6, 4);
  }
}

function setFaceExpression(expr, duration = 0.8) {
  state.faceExpression = expr;
  state.faceTimer = duration;
}

// 3D Arms Bobbing & Procedural Swing Animation
// ---------------------------------------------------------------------------
// Viewmodel animation: anticipation -> snap -> hold -> recover, look-sway,
// walk/sprint bob, landing dip, alternating 1-2 jabs, torso twist on hooks.
// ---------------------------------------------------------------------------
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));

// Returns -windupDepth..1: small pull-back, explosive extension, brief hold, smooth recovery
function strikeCurve(p, windup, strike, hold, depth = 0.22) {
  if (p < windup) return -depth * easeInOutSine(p / windup);
  if (p < strike) return -depth + (1 + depth) * easeOutCubic((p - windup) / (strike - windup));
  if (p < hold) return 1;
  return 1 - easeInOutSine((p - hold) / (1 - hold));
}

// Guard pose (right hand; left hand is mirrored). Values in camera space.
const GUARD = { x: 0.22, y: -0.31, z: 0.0, rx: 0.42, ry: 0.12, rz: -0.6 };

const vm = {
  lastYaw: 0, lastPitch: 0, swayX: 0, swayY: 0,
  landDip: 0, wasGrounded: true, time: 0,
  jabHand: 'right', lastAttackId: 0
};

function lerpPose(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
    rx: a.rx + (b.rx - a.rx) * t, ry: a.ry + (b.ry - a.ry) * t, rz: a.rz + (b.rz - a.rz) * t
  };
}
function mirror(p) { return { x: -p.x, y: p.y, z: p.z, rx: p.rx, ry: -p.ry, rz: -p.rz }; }
function applyPose(obj, p, ox, oy) {
  obj.position.set(p.x + ox, p.y + oy, p.z);
  obj.rotation.set(p.rx, p.ry, p.rz);
}

// ---------------------------------------------------------------------------
// KICK: a whole-body move, not just a leg. Phases (fraction of the animation):
//   0.00-0.28 chamber : hips turn, knee lifts out to the side, torso starts leaning back/away
//   0.28-0.42 snap    : leg whips around and extends, body counter-leans hardest
//   0.42-0.56 hold    : contact
//   0.56-1.00 recover : leg retracts, body rights itself
// ---------------------------------------------------------------------------
function kickEnvelope(prog) {
  // 0..1 "how committed the body is" to the kick
  if (prog < 0.42) return easeInOutSine(prog / 0.42);
  if (prog < 0.56) return 1;
  return 1 - easeInOutSine((prog - 0.56) / 0.44);
}

// Body motion, applied to the CAMERA (in first person your eyes ride the torso).
// Right-leg kick: lean back + away to the left, standing leg bends, hips rotate.
function kickBodyPose(prog) {
  const b = kickEnvelope(prog);
  const snap = prog > 0.28 && prog < 0.5 ? Math.sin(((prog - 0.28) / 0.22) * Math.PI) : 0; // extra whip at extension
  return {
    fwd: -0.16 * b,               // torso leans back
    side: -0.14 * b,              // ...and away from the kicking leg
    drop: -0.1 * b - 0.03 * snap, // standing knee bends
    pitch: 0.075 * b,             // leaning back tips the view up
    yaw: 0.06 * b + 0.03 * snap,  // hips/shoulders rotate into the kick
    roll: 0.13 * b + 0.04 * snap  // head tilts away from the leg
  };
}

function updateKickLeg(prog) {
  const knee = kickLeg.userData.knee;
  let hipA, kneeA, arc;
  if (prog < 0.28) {
    const t = easeOutCubic(prog / 0.28);
    hipA = 1.15 * t; kneeA = -1.9 * t; arc = t;          // knee comes up and OUT to the side
  } else if (prog < 0.42) {
    const t = easeOutBack((prog - 0.28) / 0.14);
    hipA = 1.15 + 0.47 * t; kneeA = -1.9 * (1 - t); arc = 1 - t; // whips around to the front
  } else if (prog < 0.56) {
    hipA = 1.62; kneeA = 0; arc = 0;
  } else {
    const t = easeInOutSine((prog - 0.56) / 0.44);
    hipA = 1.62 * (1 - t); kneeA = -1.4 * Math.sin(t * Math.PI); arc = 0.5 * Math.sin(t * Math.PI);
  }
  kickLeg.visible = true;
  // yaw: leg swings in from the outside; roll: hip turned over like a roundhouse chamber
  kickLeg.rotation.set(hipA, 0.12 + 0.6 * arc, -0.15 - 0.5 * arc);
  knee.rotation.x = kneeA;
  kickLeg.userData.boot.rotation.x = -1.1 * clamp01((hipA - 1.0) / 0.62);
  return kickEnvelope(prog);
}

function updateArmsRig(dt) {
  vm.time += dt;

  // --- Look sway: hands lag behind camera rotation ---
  let dYaw = player.yaw - vm.lastYaw;
  let dPitch = player.pitch - vm.lastPitch;
  vm.lastYaw = player.yaw; vm.lastPitch = player.pitch;
  if (Math.abs(dYaw) > 1) dYaw = 0; // ignore teleports / respawn snaps
  const k = 1 - Math.exp(-dt * 10);
  vm.swayX += (THREE.MathUtils.clamp(dYaw * 1.8, -0.06, 0.06) - vm.swayX) * k;
  vm.swayY += (THREE.MathUtils.clamp(-dPitch * 1.8, -0.05, 0.05) - vm.swayY) * k;

  // --- Landing dip ---
  if (player.isGrounded && !vm.wasGrounded) vm.landDip = 0.07;
  vm.wasGrounded = player.isGrounded;
  vm.landDip *= Math.exp(-dt * 9);

  // --- Walk / sprint bob (figure-eight) + breathing ---
  const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
  const bobAmt = Math.min(1, Math.abs(Math.sin(player.bobTimer)) + Math.abs(Math.cos(player.bobTimer))) * (player.bobTimer > 0.05 ? 1 : 0);
  const bobX = Math.sin(player.bobTimer * 0.5) * 0.012 * bobAmt;
  const bobY = -Math.abs(Math.sin(player.bobTimer * 0.5)) * 0.016 * bobAmt;
  const breathe = Math.sin(vm.time * 1.9) * 0.004;
  const ox = vm.swayX + bobX;
  const oy = vm.swayY + bobY + breathe - vm.landDip;

  armsRig.rotation.set(0, 0, 0);
  armsRig.position.set(0, 0, 0);

  // Brass knuckles visibility follows the equipped attack
  const brassOn = state.activeAttack === ATTACKS.HOOK;
  rightArm.userData.brass.visible = brassOn;
  leftArm.userData.brass.visible = brassOn;

  const prog = state.isAttacking ? clamp01(state.attackProgress) : 0;
  const anim = state.currentAnimType;

  // ---------------- Berserk: hockey stick ----------------
  if (state.isBerserk) {
    rightArm.visible = false;
    leftArm.visible = false;
    if (state.isAttacking && anim === 'kick') {
      if (typeof hockeyStick !== 'undefined') hockeyStick.visible = false;
      updateKickLeg(prog);
      return;
    }
    kickLeg.visible = false;
    if (typeof hockeyStick !== 'undefined') {
      hockeyStick.visible = true;
      if (state.isAttacking) {
        if (prog < 0.28) {
          const w = easeInOutSine(prog / 0.28);
          hockeyStick.position.set(0.22 + w * 0.16, -0.26 + w * 0.20, -0.44 + w * 0.10);
          hockeyStick.rotation.set(-0.22 - w * 0.45, -0.42 - w * 0.30, 0.38 + w * 0.55);
        } else {
          const s = (prog - 0.28) / 0.72;
          const curve = easeOutCubic(Math.min(1, s * 1.6));
          hockeyStick.position.set(0.38 - curve * 0.82, -0.06 - curve * 0.30, -0.34 - Math.sin(s * Math.PI) * 0.36);
          hockeyStick.rotation.set(-0.67 + curve * 1.25, -0.72 + curve * 1.35, 0.93 - curve * 2.0);
        }
      } else {
        hockeyStick.position.set(0.22 + ox, -0.26 + oy, -0.44);
        hockeyStick.rotation.set(-0.22 + vm.swayY, -0.42 + vm.swayX, 0.38);
      }
    }
    return;
  }
  if (typeof hockeyStick !== 'undefined') hockeyStick.visible = false;

  rightArm.visible = true;
  leftArm.visible = true;
  kickLeg.visible = false;

  // Idle guard: hands up, slight sprint pump
  let R = { ...GUARD };
  let L = mirror(GUARD);
  if (sprinting && player.bobTimer > 0.05) {
    const pump = Math.sin(player.bobTimer * 0.5) * 0.07;
    R = { ...R, y: R.y - 0.05, z: R.z + pump, rx: R.rx - 0.2 };
    L = { ...L, y: L.y - 0.05, z: L.z - pump, rx: L.rx - 0.2 };
  }

  if (state.isAttacking) {
    if (anim === 'kick') {
      const b = updateKickLeg(prog);
      // Right arm swings down and back to counterbalance the right leg;
      // left hand comes up high to cover the face (what fighters actually do)
      const swingBack = { x: 0.34, y: -0.52, z: 0.12, rx: -0.35, ry: -0.35, rz: -1.1 };
      const highGuard = { x: -0.21, y: -0.27, z: 0.04, rx: 0.68, ry: -0.08, rz: 0.75 };
      R = lerpPose(R, swingBack, b);
      L = lerpPose(L, highGuard, b);
    } else if (anim === 'slam') {
      // raise both fists overhead, then hammer down
      let up, down;
      if (prog < 0.35) { up = easeOutCubic(prog / 0.35); down = 0; }
      else if (prog < 0.55) { up = 1; down = easeOutCubic((prog - 0.35) / 0.2); }
      else { up = 1 - easeInOutSine((prog - 0.55) / 0.45); down = up; }
      const raised = { x: 0.25, y: -0.05, z: -0.05, rx: 1.0, ry: 0.1, rz: -0.6 };
      const smashed = { x: 0.15, y: -0.1, z: -0.3, rx: -0.35, ry: 0.15, rz: -0.25 };
      const pose = lerpPose(lerpPose(GUARD, raised, up), smashed, down);
      R = pose; L = mirror(pose);
    } else if (anim === 'heavy') {
      // Hook: elbow stays out right, forearm swings horizontal across the screen
      const a = strikeCurve(prog, 0.2, 0.45, 0.55, 0.3);
      const arc = Math.max(0, a);
      const wound = { x: 0.3, y: -0.3, z: 0.04, rx: 0.5, ry: -0.15, rz: -0.9 };
      const landed = { x: 0.22, y: -0.2, z: -0.42, rx: 0.12, ry: 1.2, rz: -1.55 };
      R = a < 0 ? lerpPose(GUARD, wound, -a / 0.3) : lerpPose(wound, landed, arc);
      L = { ...L, z: L.z + 0.04 * arc, x: L.x + 0.02 * arc };
      armsRig.rotation.y = 0.1 * a;     // shoulders rotate into the punch
      armsRig.rotation.z = -0.04 * arc;
    } else {
      // Jab / cross: alternate hands, corkscrew the fist palm-down at impact
      const e = strikeCurve(prog, 0.12, 0.34, 0.44, 0.18);
      const ext = Math.max(0, e);
      const extended = { x: 0.11, y: -0.19, z: -0.3, rx: 0.3, ry: 0.12, rz: -0.12 };
      const pull = lerpPose(GUARD, { ...GUARD, z: GUARD.z + 0.04 }, Math.max(0, -e) / 0.18);
      const punch = lerpPose(pull, extended, ext);
      const guardTight = { ...GUARD, x: GUARD.x - 0.015, z: GUARD.z + 0.035 * ext };
      if (vm.jabHand === 'right') { R = punch; L = mirror(guardTight); }
      else { L = mirror(punch); R = guardTight; }
      armsRig.rotation.y = (vm.jabHand === 'right' ? 0.05 : -0.05) * ext;
    }
  }

  applyPose(rightArm, R, ox, oy);
  applyPose(leftArm, L, ox, oy);
}

// ============================================================================
// HUD UPDATES & SCREEN FX
// ============================================================================
function updateHUDWeapon() {
  const atk = state.activeAttack;
  document.getElementById('hud-attack-name').innerText = atk.name;
  document.getElementById('hud-attack-name').style.color = atk.color;
  document.getElementById('hud-attack-desc').innerText = atk.sub;

  for (let i = 1; i <= 4; i++) {
    const slot = document.querySelector(`.slot[data-slot="${i}"]`);
    if (slot) {
      if (state.unlocked[i]) {
        slot.className = 'slot unlocked';
        if (state.activeAttack.id === i) slot.classList.add('active');
      } else {
        slot.className = 'slot locked';
      }
    }
  }
}

function updateHUDHealth() {
  document.getElementById('hud-health').innerText = Math.max(0, Math.round(state.health));
  document.getElementById('hud-health-bar').style.width = `${Math.max(0, state.health)}%`;
  document.getElementById('hud-armor').innerText = Math.max(0, Math.round(state.armor));
  document.getElementById('hud-armor-bar').style.width = `${Math.max(0, state.armor)}%`;
}

function showHitMarker() {
  const hm = document.getElementById('hit-marker');
  hm.classList.add('active');
  setTimeout(() => hm.classList.remove('active'), 90);
}

function triggerScreenShake(amount = 14) {
  state.screenShake = amount;
}

function triggerDamageFlash() {
  const f = document.getElementById('damage-flash');
  f.style.opacity = '1';
  setTimeout(() => f.style.opacity = '0', 140);
}

function triggerSlamFlash() {
  const f = document.getElementById('slam-flash');
  f.style.opacity = '1';
  setTimeout(() => f.style.opacity = '0', 180);
}

// Peace Sanctuary Banner Controller
var peaceBannerTimer = null;
function triggerPeaceZoneBanner(insidePeace) {
  const banner = document.getElementById('peace-zone-banner');
  if (!banner) return;

  clearTimeout(peaceBannerTimer);
  banner.classList.remove('hidden');

  const title = banner.querySelector('.peace-banner-title');
  const sub = banner.querySelector('.peace-banner-sub');
  const icon = banner.querySelector('.peace-banner-icon');

  if (insidePeace) {
    banner.classList.remove('combat-alert');
    if (title) title.innerText = 'CN TOWER PEACE SANCTUARY';
    if (sub) sub.innerText = 'NO COMBAT PERMITTED • SAFE HAVEN • VITALITY REGENERATING';
    if (icon) icon.innerText = '🕊️';
    audio.playPeaceChime?.();
  } else {
    banner.classList.add('combat-alert');
    if (title) title.innerText = 'EXITING PEACE SANCTUARY';
    if (sub) sub.innerText = 'COMBAT ZONE ACTIVE • WATCH YOUR BACK!';
    if (icon) icon.innerText = '⚠️';
  }

  peaceBannerTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 3800);
}

function registerCombo() {
  state.comboCount++;
  state.comboTimer = 2.2;
  const countEl = document.getElementById('combo-count');
  const titleEl = document.getElementById('combo-title');
  titleEl.innerText = state.comboCount > 4 ? '⚡ DEFENDER COMBO' : 'COMBO';
  countEl.innerText = `x${state.comboCount}`;
  countEl.style.transform = 'scale(1.25)';
  setTimeout(() => countEl.style.transform = 'scale(1.0)', 100);
}

// ============================================================================
// MAIN LOOP & GAME PHYSICS
// ============================================================================
let lastTime = performance.now();
const shakeOffset = new THREE.Vector3();
const bodyRot = new THREE.Vector3(); // temporary camera rotation from body motion (kick)
const BASE_FOV = 78;
setupPostFX();
let fpsCount = 0;
let fpsTimer = 0;

function updateNeighborhood() {
  if (!city || !city.landmarks) return;
  const p = player.pos;
  const lms = city.landmarks;
  let name = "DOWNTOWN TORONTO";

  if (islands && islands.isInsideIslands(p.x, p.z)) {
    name = islands.getNeighborhood(p.x, p.z);
  } else if (state.onFerry) {
    name = "TORONTO HARBOUR FERRY";
  } else if (p.y > 50) {
    name = p.y > 345.5 ? "CN TOWER • 348m 360° LOOKOUT" : "CN TOWER • 342m GLASS FLOOR";
  } else if (p.z > 950 || (city.isInsideCentreIsland && city.isInsideCentreIsland(p.x, p.z))) {
    if (p.z > 1370) name = "CENTRE ISLAND BEACH & LAKE ONTARIO";
    else if (p.x > 215 && p.z > 1130 && p.z < 1330) {
      if (Math.hypot(p.x - 240, p.z - 1220) < 22) name = "PIZZA PIZZA • CENTREVILLE";
      else name = "CENTREVILLE AMUSEMENT PARK";
    }
    else if (p.x < 135 && p.z > 1140 && p.z < 1230) name = "WILLIAM MEANY HEDGE MAZE";
    else if (p.x < 40) name = "OLYMPIC ISLAND PARK";
    else if (p.z <= 1110) name = "CENTRE ISLAND FERRY TERMINAL";
    else name = "CENTRE ISLAND PARK & GARDENS";
  } else if (city.isInsidePeaceZone(p.x, p.z)) {
    name = "CN TOWER PLAZA";
  } else if (Math.hypot(p.x - 708, p.z - 295) < 55) {
    name = "JACK LAYTON FERRY TERMINAL";
  } else if (lms.roundhouse && Math.hypot(p.x - lms.roundhouse[0], p.z - lms.roundhouse[1]) < 65) {
    name = "ROUNDHOUSE PARK";
  } else if (lms.unionStation && Math.hypot(p.x - lms.unionStation[0], p.z - lms.unionStation[1]) < 85) {
    name = "UNION STATION / CORE";
  } else if (lms.royThomson && Math.hypot(p.x - lms.royThomson[0], p.z - lms.royThomson[1]) < 70) {
    name = "ENTERTAINMENT DISTRICT";
  } else if (lms.stLawrence && Math.hypot(p.x - lms.stLawrence[0], p.z - lms.stLawrence[1]) < 80) {
    name = "ST. LAWRENCE MARKET";
  } else if (lms.gooderham && Math.hypot(p.x - lms.gooderham[0], p.z - lms.gooderham[1]) < 65) {
    name = "BERCZY PARK / FLATIRON";
  } else if (p.z > 360) {
    name = "HARBOURFRONT / QUAY";
  } else if (p.x > 50 && p.x < 420 && p.z > -350 && p.z < 50) {
    name = "FINANCIAL DISTRICT";
  } else if (p.x < -200 && p.z < -100) {
    name = "ENTERTAINMENT DISTRICT";
  }

  const locEl = document.getElementById('minimap-location');
  if (locEl && locEl.innerText !== name) {
    locEl.innerText = name;
  }
}

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // FPS Counter
  fpsCount++;
  fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    document.getElementById('fps-counter').innerText = `${fpsCount} FPS`;
    fpsCount = 0;
    fpsTimer = 0;
  }

  // Undo last frame's shake / body-motion offsets so they never leak into the real state
  camera.position.sub(shakeOffset);
  shakeOffset.set(0, 0, 0);
  camera.rotation.x -= bodyRot.x; camera.rotation.y -= bodyRot.y; camera.rotation.z -= bodyRot.z;
  bodyRot.set(0, 0, 0);

  // Hit-stop: slow the simulation to a crawl for a few frames on impact
  let simDt = dt;
  if (state.hitStop > 0) {
    state.hitStop -= dt;
    simDt = dt * 0.06;
  }

  if (state.inGame && !state.isDead && !state.isPaused) {
    updatePlayer(simDt);
    applyCarKnockback(simDt);
    updateEnemies(simDt);
    if (traffic) traffic.update(simDt, trafficHooks);
    keepPeopleOutOfRailCut();
    updatePickups(simDt);
    updateParticles(simDt);
    updateCombatTimers(simDt);
    updateMission(simDt);
    updateElevator(simDt);
    updateFerry(simDt);
    updateObservationDeck(simDt);
    updateTelescope(simDt);
    updateRotatingRestaurant(simDt);
    updateFireworks(simDt);
    if (window.multiplayer && window.multiplayer.update) {
      window.multiplayer.update(simDt);
    }
  } else if (window.multiplayer && window.multiplayer.connected && window.multiplayer.remotePlayers.size > 0) {
    // Shared room: our menu / death screen must not freeze the city for everyone else.
    // Keep NPCs (or their mirrors), effects and networking running; only local input stops.
    updateEnemies(dt);
    keepPeopleOutOfRailCut();
    updateParticles(dt);
    window.multiplayer.update(dt);
  }

  if (traffic && (!state.inGame || state.isPaused || state.isDead)) traffic.silence();

  // City animation & dynamic lighting
  if (city) {
    try { city.update(dt, player.pos); } catch (e) { console.warn('city.update error:', e); }
  }
  if (islands) {
    try { islands.update(dt, player.pos); } catch (e) { console.warn('islands.update error:', e); }
  }

  // Draw Toronto GPS Minimap & Sanctuary Radar
  const minimapCanvas = document.getElementById('minimap-canvas');
  if (city && minimapCanvas) {
    const ctx = minimapCanvas.getContext('2d');
    const dots = [];
    enemies.forEach(e => {
      if (!e.isDead && !e.isKnockedOut) {
        let dotColor = '#ef4444'; // Red for robots
        let dotRadius = 3.0;

        if (e.isStaggered) {
          dotColor = '#ffea00'; // Gold for glory kill targets
          dotRadius = 4.5;
        } else if (e.kind === 'civilian') {
          dotColor = '#22c55e'; // Green for innocent civilians
          dotRadius = 2.8;
        } else if (e.kind === 'snatcher') {
          dotColor = '#c026d3'; // Purple/magenta for body snatchers
          dotRadius = 3.5;
        }

        dots.push({
          x: e.rig.root.position.x,
          z: e.rig.root.position.z,
          c: dotColor,
          r: dotRadius
        });
      }
    });
    crates.forEach(c => {
      if (!c.destroyed) {
        dots.push({
          x: c.mesh.position.x,
          z: c.mesh.position.z,
          c: '#f59e0b',
          r: 2.5
        });
      }
    });
    // Remote Squad Players on Minimap Radar (bright light-yellow beacon dot)
    if (window.multiplayer && window.multiplayer.remotePlayers) {
      window.multiplayer.remotePlayers.forEach(rp => {
        dots.push({
          x: rp.currentPos.x,
          z: rp.currentPos.z,
          c: '#fef08a',
          r: 5.2
        });
      });
    }
    // Active exploration mission objective waypoint
    if (missionState.active && missionState.color && missionState.state === 'active') {
      dots.push({
        x: missionState.pos.x,
        z: missionState.pos.z,
        c: missionState.color.hex,
        r: 6,
        isMission: true
      });
    }
    if (traffic) traffic.cars.forEach(c => dots.push({ x: c.vx, z: c.vz, c: '#e5e7eb', r: 2 }));
    try {
      if (islands && islands.isInsideIslands(player.pos.x, player.pos.z)) {
        islands.drawMinimap(ctx, 160, player.pos, player.yaw, dots);
      } else {
        city.drawMinimap(ctx, 160, player.pos, player.yaw, dots);
      }
    } catch (e) {
      console.warn('drawMinimap error:', e);
    }
    updateNeighborhood();

    // 1. Distance & status to CN Tower (Peace Sanctuary)
    const towerDist = Math.round(Math.hypot(player.pos.x - city.landmarks.cnTower[0], player.pos.z - city.landmarks.cnTower[1]));
    const towerDistEl = document.getElementById('tower-distance');
    if (towerDistEl) {
      if (player.pos.y > 50) {
        towerDistEl.innerText = player.pos.y > 345.5 ? '348m LOOKOUT' : '342m GLASS FLR';
        towerDistEl.style.color = '#38bdf8';
      } else if (city.isInsidePeaceZone(player.pos.x, player.pos.z)) {
        towerDistEl.innerText = 'INSIDE';
        towerDistEl.style.color = '#34d399';
      } else {
        towerDistEl.innerText = `${towerDist}m`;
        towerDistEl.style.color = '#34d399';
      }
    }

    // 2. Pointer & distance to Mission Goal
    const goalLabelEl = document.getElementById('minimap-goal-label');
    const goalDistEl = document.getElementById('minimap-goal-distance');
    const goalRowEl = document.getElementById('minimap-goal-row');
    if (goalLabelEl && goalDistEl && goalRowEl) {
      if (missionState.active && missionState.landmark && missionState.color && missionState.state === 'active') {
        const mDist = Math.round(Math.hypot(player.pos.x - missionState.pos.x, player.pos.z - missionState.pos.z));
        const dx = missionState.pos.x - player.pos.x;
        const dz = missionState.pos.z - player.pos.z;
        const relAngle = Math.atan2(dx, dz) - player.yaw;
        let norm = (relAngle + Math.PI) % (Math.PI * 2) - Math.PI;
        let arrow = '↑';
        if (norm > Math.PI * 0.75 || norm < -Math.PI * 0.75) arrow = '↓';
        else if (norm > Math.PI * 0.25) arrow = '→';
        else if (norm < -Math.PI * 0.25) arrow = '←';
        else if (norm > 0.1) arrow = '↗';
        else if (norm < -0.1) arrow = '↖';

        const shortName = missionState.landmark.name.length > 10 ? missionState.landmark.name.slice(0, 9) + '.' : missionState.landmark.name;
        goalLabelEl.innerText = `${shortName.toUpperCase()}:`;
        goalDistEl.innerText = `${mDist}m ${arrow}`;
        goalDistEl.style.color = missionState.color.hex;
        goalRowEl.style.borderColor = missionState.color.hex;
        goalRowEl.style.display = 'flex';
      } else {
        goalLabelEl.innerText = 'GOAL:';
        goalDistEl.innerText = 'NEXT SOON...';
        goalDistEl.style.color = '#f59e0b';
        goalRowEl.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      }
    }
  }

  // Camera Shake (applied as a temporary offset, removed at the top of next frame)
  if (state.screenShake > 0) {
    shakeOffset.set(
      (Math.random() - 0.5) * state.screenShake * 0.012,
      (Math.random() - 0.5) * state.screenShake * 0.012,
      0
    );
    if (!canMoveTo(camera.position.x + shakeOffset.x, camera.position.z + shakeOffset.z)) {
      shakeOffset.x = 0;
      shakeOffset.z = 0;
    }
    camera.position.add(shakeOffset);
    state.screenShake *= Math.pow(0.82, dt * 60);
    if (state.screenShake < 0.05) state.screenShake = 0;
  }

  // Full-body kick motion seen through the eyes: lean back/away, dip, hip turn, head tilt
  if (state.isAttacking && state.currentAnimType === 'kick' && state.inGame && !state.isPaused) {
    const k = kickBodyPose(clamp01(state.attackProgress));
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    // forward = (-sin, 0, -cos), right = (cos, 0, -sin)
    const off = new THREE.Vector3(-sy * k.fwd + cy * k.side, k.drop, -cy * k.fwd - sy * k.side);
    if (!canMoveTo(camera.position.x + off.x, camera.position.z + off.z)) {
      off.x = 0;
      off.z = 0;
    }
    shakeOffset.add(off);
    camera.position.add(off);
    bodyRot.set(k.pitch, k.yaw, k.roll);
    camera.rotation.x += k.pitch; camera.rotation.y += k.yaw; camera.rotation.z += k.roll;
  }

  // Camera punch: quick pitch kick + FOV squeeze on impact, springs back
  if (state.camPunch > 0.001 && state.inGame && !state.isPaused) {
    camera.rotation.x += state.camPunch * 0.018;
    state.camPunch *= Math.exp(-dt * 14);
  }
  const targetFov = BASE_FOV + (keys['ShiftLeft'] || keys['ShiftRight'] ? 4 : 0) - state.camPunch * 2.5;
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 10));
    camera.updateProjectionMatrix();
  }

  updateArmsRig(simDt);
  drawFace();

  if (composer) composer.render(dt);
  else renderer.render(scene, camera);
}

function updatePlayer(dt) {
  // Turning: ArrowLeft / ArrowRight or Q (E is reserved for kick)
  if (keys['ArrowLeft'] || keys['KeyQ']) player.yaw += 2.6 * dt;
  if (keys['ArrowRight']) player.yaw -= 2.6 * dt;
  if (keys['PageUp']) player.pitch = Math.min(Math.PI / 2.3, player.pitch + 2.0 * dt);
  if (keys['PageDown']) player.pitch = Math.max(-Math.PI / 2.3, player.pitch - 2.0 * dt);

  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  // Inertial camera roll when strafing
  let rollTarget = 0;
  if (keys['KeyA']) rollTarget = 0.025;
  if (keys['KeyD']) rollTarget = -0.025;
  camera.rotation.z += (rollTarget - camera.rotation.z) * 0.1;

  // Movement input: Support W/S/A/D and Arrow keys by e.code
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  const moveDir = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
  if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
  if (keys['KeyD']) moveDir.add(right);
  if (keys['KeyA']) moveDir.sub(right);

  // Autonomous AI Copilot / Watch AI Mode integration
  if (window.aiCopilot && window.aiCopilot.isActive) {
    window.aiCopilot.update(dt, player, state, city, enemies, traffic, missionState);
    if (moveDir.lengthSq() === 0 && window.aiCopilot.moveDir.lengthSq() > 0.01) {
      moveDir.copy(window.aiCopilot.moveDir);
    }
  }

  const isMoving = moveDir.lengthSq() > 0;
  if (isMoving) {
    moveDir.normalize();
    if (state.telescopeActive) {
      exitTelescope();
    }
  }

  if (state.inElevator || state.onFerry) {
    return;
  }

  const aiActive = window.aiCopilot && window.aiCopilot.isActive;
  const isSprinting = aiActive ? window.aiCopilot.sprint : (keys['ShiftLeft'] || keys['ShiftRight'] || state.isBerserk);
  const curSpeed = isSprinting ? player.sprintSpeed : player.speed;

  // Jump
  if (keys['Space'] && player.isGrounded) {
    player.velocity.y = player.jumpStrength;
    player.isGrounded = false;
  }

  // Gravity
  player.velocity.y -= 24.0 * dt;

  player.velocity.x = moveDir.x * curSpeed;
  player.velocity.z = moveDir.z * curSpeed;

  const nextX = player.pos.x + player.velocity.x * dt;
  const nextZ = player.pos.z + player.velocity.z * dt;

  if (canMoveTo(nextX, nextZ)) {
    player.pos.x = nextX;
    player.pos.z = nextZ;
  } else {
    if (canMoveTo(nextX, player.pos.z)) player.pos.x = nextX;
    if (canMoveTo(player.pos.x, nextZ)) player.pos.z = nextZ;
  }

  // Vertical position clamping for Ground or Observation Deck (2 floors + stairs)
  let floorY = 0;
  if (islands && islands.isInsideIslands(player.pos.x, player.pos.z)) {
    floorY = islands.floorAt(player.pos.x, player.pos.z, player.pos.y);
  } else if (city && city.floorAt) {
    floorY = city.floorAt(player.pos.x, player.pos.z, player.pos.y);
  } else if (player.pos.y > 50) {
    floorY = getDeckFloorY(player.pos.x, player.pos.z, player.pos.y);
  }
  const minPlayerY = floorY + 1.7;

  player.pos.y += player.velocity.y * dt;
  if (player.pos.y <= minPlayerY) {
    player.pos.y = minPlayerY;
    player.velocity.y = 0;
    player.isGrounded = true;
  } else if (player.isGrounded && player.pos.y - minPlayerY < 0.65 && !keys['Space']) {
    player.pos.y = minPlayerY;
    player.velocity.y = 0;
  }

  if (isMoving && player.isGrounded) {
    player.bobTimer += dt * (isSprinting ? 16 : 10);
  } else {
    player.bobTimer *= 0.8;
  }

  // --- Peace Sanctuary Aura & Transition Check ---
  const insidePeace = (city && player.pos.y <= 50) ? city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y) : false;

  if (insidePeace !== state.wasInsidePeace) {
    state.wasInsidePeace = insidePeace;
    triggerPeaceZoneBanner(insidePeace);
  }

  if (insidePeace) {
    // Regenerate Vitality & Shield continuously
    if (state.health < 100) {
      state.health = Math.min(100, state.health + 8.0 * dt);
      updateHUDHealth();
    }
    if (state.armor < 50) {
      state.armor = Math.min(50, state.armor + 5.0 * dt);
      updateHUDHealth();
    }
    const statusPill = document.getElementById('peace-zone-status');
    if (statusPill) {
      statusPill.className = 'peace-status-pill safe';
      statusPill.innerText = '🕊️ PEACE SANCTUARY';
    }
  } else {
    const statusPill = document.getElementById('peace-zone-status');
    if (statusPill) {
      statusPill.className = 'peace-status-pill danger';
      statusPill.innerText = '⚔️ COMBAT ZONE';
    }
  }
}

function canMoveTo(x, z) {
  const pY = player.pos.y;
  if (pY > 50) {
    if (!city || !city.landmarks || !city.landmarks.cnTower) return true;
    const cx = city.landmarks.cnTower[0];
    const cz = city.landmarks.cnTower[1];
    const r = Math.hypot(x - cx, z - cz);
    // Real CN Tower: solid concrete core housing elevators & emergency stairs (r < 6.8m)
    // and outer glass curtain boundary (r > 23.2m)
    if (r < 6.8 || r > 23.2) return false;

    // Body blocking on deck against living deck enemies ON THE SAME FLOOR
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.isDead || e.isKnockedOut || !e.isDeckEnemy) continue;
      const ePos = e.rig ? e.rig.root.position : null;
      if (!ePos) continue;

      // Ignore enemies on a different deck floor (Floor 1 vs Floor 2 have 6m vertical separation)
      if (Math.abs(pY - ePos.y) > 2.2) continue;

      const dNew = Math.hypot(x - ePos.x, z - ePos.z);
      const minBodyDist = 0.75; // physical contact distance
      if (dNew < minBodyDist) {
        if (state.isBerserk) return true;
        const dCurr = Math.hypot(player.pos.x - ePos.x, player.pos.z - ePos.z);
        if (dNew < dCurr) return false;
      }
    }
    return true;
  }

  if (islands && islands.isInsideIslands(x, z)) {
    return islands.canMoveTo(x, z, 0.78, pY);
  }

  if (city) {
    if (!city.canMoveTo(x, z, 0.78, pY)) return false;
  } else {
    if (Math.abs(x) > 38 || Math.abs(z) > 38) return false;

    const pRadius = 0.6;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i].box;
      if (x + pRadius > box.min.x && x - pRadius < box.max.x &&
        z + pRadius > box.min.z && z - pRadius < box.max.z) {
        return false;
      }
    }
  }

  for (let i = 0; i < crates.length; i++) {
    const c = crates[i];
    if (!c.destroyed) {
      const dist = Math.hypot(x - c.mesh.position.x, z - c.mesh.position.z);
      if (dist < 1.3) return false;
    }
  }

  // --- Solid Fighter & Guard Physical Body Blocking ---
  // Player CANNOT run right through alive fighters or guards!
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.isDead || e.isKnockedOut || e.isDeckEnemy) continue;
    const ePos = e.rig ? e.rig.root.position : (e.sprite ? e.sprite.position : null);
    if (!ePos) continue;

    if (pY > 50) continue;
    if (Math.abs(pY - ePos.y) > 2.2) continue;

    const dNew = Math.hypot(x - ePos.x, z - ePos.z);
    const minFighterDist = 0.75; // contact boundary
    if (dNew < minFighterDist) {
      // In Canadian Berserker Mode: player can bulldoze and shove fighters out of the way!
      if (state.isBerserk) {
        const pushX = ePos.x - player.pos.x;
        const pushZ = ePos.z - player.pos.z;
        const pLen = Math.hypot(pushX, pushZ) || 1;
        e.vx += (pushX / pLen) * 16;
        e.vz += (pushZ / pLen) * 16;
        e.flinchTimer = 0.25;
        triggerScreenShake(4);
        return true;
      }

      // If moving closer to enemy body, physically block the player!
      const dCurr = Math.hypot(player.pos.x - ePos.x, player.pos.z - ePos.z);
      if (dNew < dCurr) {
        return false;
      }
    }
  }

  return true;
}

// Knockback, crowd separation and car hits move people without collision checks. Anyone who
// ends up standing over the open rail cut is put back on the nearest curb instead of floating.
function keepPeopleOutOfRailCut() {
  if (!city || !city.pushOutOfTrench) return;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.rig || e.isDeckEnemy) continue;
    const p = e.rig.root.position;
    if (p.y > 20) continue;
    const fix = city.pushOutOfTrench(p.x, p.z, 1.2);
    if (fix) { p.x = fix[0]; p.z = fix[1]; }
  }
  if (player.pos.y < 20 && !state.inElevator) {
    const fix = city.pushOutOfTrench(player.pos.x, player.pos.z, 1.2);
    if (fix && player.pos.y > -1) { player.pos.x = fix[0]; player.pos.z = fix[1]; }
  }
}

function updateEnemies(dt) {
  let nearestStaggered = null;
  let minDist = 4.0;
  const playerInPeace = (city && player.pos.y <= 50) ? city.isInsidePeaceZone(player.pos.x, player.pos.z, player.pos.y) : false;

  // Who can NPCs go after? Just us in single-player; every living player when hosting.
  // A paused / dead / in-menu player isn't a valid target (matters once the world keeps running for others)
  const localAway = state.isDead || state.isPaused || !state.inGame;
  const netTargets = [{ pos: player.pos, remoteId: null, inPeace: playerInPeace, dead: localAway }];
  if (isNetHostWithPeers()) {
    window.multiplayer.remotePlayers.forEach((rp, id) => {
      const ep = rp.eyePos;
      const inPeace = (city && ep.y <= 50) ? city.isInsidePeaceZone(ep.x, ep.z, ep.y) : false;
      netTargets.push({ pos: ep, remoteId: id, inPeace, dead: !(rp.health > 0) });
    });
  }
  const anyAlive = netTargets.some(t => !t.dead);
  function pickTarget(epos) {
    let best = netTargets[0], bd = Infinity;
    for (const t of netTargets) {
      if (anyAlive && t.dead) continue;
      const d = Math.hypot(t.pos.x - epos.x, t.pos.z - epos.z);
      if (d < bd) { bd = d; best = t; }
    }
    // Nobody available: stand down (treated like a sanctuary — no chasing, no punching)
    return anyAlive ? best : { pos: best.pos, remoteId: best.remoteId, inPeace: true, dead: true };
  }

  // Dynamic Roaming Distance Culling & Local Neighborhood Respawn
  // If player runs away into the city (> 110m away), despawn distant ambient enemies
  // and spawn fresh enemies near the player's new position!
  state.enemyRoamingTimer = (state.enemyRoamingTimer || 0) + dt;
  if (state.enemyRoamingTimer >= 1.2 && !isNetGuest()) {
    state.enemyRoamingTimer = 0;
    const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.isDead || e.isKnockedOut || e.isMissionGuard || e.isDeckEnemy || e.isRemoteMirror || e.kind === 'civilian' || e.isIslandCitizen) continue;

      const d = nearestPlayerDist(e.rig.root.position.x, e.rig.root.position.z);
      if (d > 115) {
        if (e.rig && e.rig.root) scene.remove(e.rig.root);
        enemies.splice(i, 1);
        spawnSingleReinforcement();
      }
    }

    // Maintain ambient target count
    const aliveAmbient = enemies.filter(e => !e.isDead && !e.isMissionGuard && !e.isDeckEnemy && e.kind !== 'civilian' && !e.isIslandCitizen).length;
    if (aliveAmbient < cfg.targetEnemies) {
      spawnSingleReinforcement();
    }

    // When player is on the island, guarantee vibrant, bustling park life around the player
    if (player.pos.z > 840 || (typeof islands !== 'undefined' && islands && islands.isInsideIslands && islands.isInsideIslands(player.pos.x, player.pos.z))) {
      const nearbyCitizens = enemies.filter(e => !e.isDead && (e.kind === 'civilian' || e.isIslandCitizen) && nearestPlayerDist(e.rig.root.position.x, e.rig.root.position.z) < 65).length;
      if (nearbyCitizens < 24) {
        const toSpawn = Math.min(4, 24 - nearbyCitizens);
        for (let s = 0; s < toSpawn; s++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 14 + Math.random() * 42;
          const sx = player.pos.x + Math.cos(angle) * dist;
          const sz = player.pos.z + Math.sin(angle) * dist;
          if (city && city.canMoveTo && city.canMoveTo(sx, sz, 0.5, 0.55)) {
            const archIdx = Math.floor(Math.random() * CIVILIAN_ARCHETYPES.length);
            const cit = spawnEnemy(sx, sz, 'civilian', archIdx);
            if (cit) cit.isIslandCitizen = true;
          }
        }
      }
    }
  }

  enemies.forEach(enemy => {
    // 1. Knockout knockdown animation
    if (enemy.isKnockedOut) {
      if (enemy.koProgress < 1.0) {
        enemy.koProgress = Math.min(1.0, enemy.koProgress + dt * 3.2);
        enemy.rig.root.rotation.x = -Math.PI / 2 * enemy.koProgress;
        enemy.rig.root.position.y = (enemy.deckFloorY || 0) + 0.22 * (1 - enemy.koProgress) + 0.12 * enemy.koProgress;
        enemy.rig.leftLegPivot.rotation.x = 0.35 * enemy.koProgress;
        enemy.rig.rightLegPivot.rotation.x = 0.45 * enemy.koProgress;
        enemy.rig.leftArmPivot.rotation.x = 0.5 * enemy.koProgress;
        enemy.rig.rightArmPivot.rotation.x = 0.5 * enemy.koProgress;
      }
      return;
    }

    if (enemy.isDead) return;

    // Network mirror of a host-owned NPC: render only, no AI
    if (enemy.isRemoteMirror) {
      updateMirrorEnemy(enemy, dt);
      if (enemy.isStaggered) {
        const d = enemy.rig.root.position.distanceTo(player.pos);
        if (d < minDist) { nearestStaggered = enemy; minDist = d; }
      }
      return;
    }

    // Apply knockback velocity (with wall collision check so enemies don't get punched into buildings)
    const nextKx = enemy.rig.root.position.x + enemy.vx * dt;
    const nextKz = enemy.rig.root.position.z + enemy.vz * dt;
    if (!city || city.canMoveTo(nextKx, nextKz, 0.45, enemy.rig.root.position.y)) {
      enemy.rig.root.position.x = nextKx;
      enemy.rig.root.position.z = nextKz;
    } else {
      enemy.vx = 0;
      enemy.vz = 0;
    }
    enemy.vx *= 0.86;
    enemy.vz *= 0.86;

    // Keep within world bounds
    if (enemy.isDeckEnemy && city && city.landmarks && city.landmarks.cnTower) {
      enemy.rig.root.position.y = enemy.deckFloorY || 342.0;
      const cx = city.landmarks.cnTower[0];
      const cz = city.landmarks.cnTower[1];
      const edx = enemy.rig.root.position.x - cx;
      const edz = enemy.rig.root.position.z - cz;
      const er = Math.hypot(edx, edz);
      if (er < 5.2 && er > 0.01) {
        enemy.rig.root.position.x = cx + (edx / er) * 5.2;
        enemy.rig.root.position.z = cz + (edz / er) * 5.2;
      } else if (er > 21.2) {
        enemy.rig.root.position.x = cx + (edx / er) * 21.2;
        enemy.rig.root.position.z = cz + (edz / er) * 21.2;
      }
    } else if (enemy.isIslandCitizen || enemy.rig.root.position.z > 840 || (typeof islands !== 'undefined' && islands && islands.isInsideIslands && islands.isInsideIslands(enemy.rig.root.position.x, enemy.rig.root.position.z))) {
      // Keep within Toronto Islands archipelago boundaries: preserve full archipelago exploration!
      const izBase = (typeof islands !== 'undefined' && islands && islands.Z_BASE) ? islands.Z_BASE : 1200;
      enemy.rig.root.position.x = Math.max(-1450, Math.min(1350, enemy.rig.root.position.x));
      enemy.rig.root.position.z = Math.max(izBase - 360, Math.min(izBase + 620, enemy.rig.root.position.z));
    } else if (city && city.bounds) {
      enemy.rig.root.position.x = Math.max(city.bounds.minX + 5, Math.min(city.bounds.maxX - 5, enemy.rig.root.position.x));
      enemy.rig.root.position.z = Math.max(city.bounds.minZ + 5, Math.min(city.bounds.maxZ - 5, enemy.rig.root.position.z));
    } else {
      enemy.rig.root.position.x = Math.max(-36, Math.min(36, enemy.rig.root.position.x));
      enemy.rig.root.position.z = Math.max(-36, Math.min(36, enemy.rig.root.position.z));
    }

    // Update ground NPCs vertical elevation to match bridges, piers, and terrain
    if (!enemy.isDeckEnemy && city && city.floorAt) {
      const gFloor = city.floorAt(enemy.rig.root.position.x, enemy.rig.root.position.z, enemy.rig.root.position.y);
      enemy.rig.root.position.y = gFloor;
    }

    // Peace Sanctuary Repulsion: push street enemies away from ground sanctuary
    if (city && city.peaceZone && !enemy.isDeckEnemy) {
      const edx = enemy.rig.root.position.x - city.peaceZone.x;
      const edz = enemy.rig.root.position.z - city.peaceZone.z;
      const edist = Math.hypot(edx, edz);
      const minSafeDist = city.peaceZone.radius + 3.0;
      if (edist < minSafeDist && edist > 0.05) {
        const push = (minSafeDist - edist);
        const px = enemy.rig.root.position.x + (edx / edist) * push;
        const pz = enemy.rig.root.position.z + (edz / edist) * push;
        if (!city || city.canMoveTo(px, pz, 0.45, enemy.rig.root.position.y)) {
          enemy.rig.root.position.x = px;
          enemy.rig.root.position.z = pz;
        }
        enemy.vx += (edx / edist) * 6.0;
        enemy.vz += (edz / edist) * 6.0;
      }
    }

    // Pick the nearest living player to chase / face / punch
    const tgt = pickTarget(enemy.rig.root.position);
    const tpos = tgt.pos;
    const targetInPeace = tgt.inPeace;

    // Rotate whole body to face the target (only Y yaw, perfectly upright!)
    const targetAngle = Math.atan2(tpos.x - enemy.rig.root.position.x, tpos.z - enemy.rig.root.position.z);
    enemy.rig.root.rotation.y = targetAngle;

    // Handle Flinch on Hit
    if (enemy.flinchTimer > 0) {
      enemy.flinchTimer -= dt;
      enemy.rig.torsoPivot.rotation.x = 0.35;
      enemy.rig.headPivot.rotation.x = -0.3;
    } else {
      enemy.rig.torsoPivot.rotation.x = 0;
      enemy.rig.headPivot.rotation.x = 0;
    }

    // Check Stagger state
    if (enemy.isStaggered) {
      enemy.staggerTimer -= dt;
      if (enemy.staggerTimer <= 0) {
        enemy.isStaggered = false;
        restoreEnemyTint(enemy);
      } else {
        const flash = Math.sin(Date.now() * 0.02) > 0;
        setEnemyTint(enemy, flash ? 0xffea00 : 0xef4444);
      }
      enemy.rig.torsoPivot.rotation.x = 0.3;
      enemy.rig.headPivot.rotation.z = Math.sin(Date.now() * 0.007) * 0.25;
      enemy.rig.leftArmPivot.rotation.x = -0.3;
      enemy.rig.rightArmPivot.rotation.x = -0.3;
      enemy.rig.updateNameplate(enemy.hp, enemy.maxHp, true);
    }

    const distToPlayer = enemy.rig.root.position.distanceTo(player.pos);   // local player (glory prompt)
    const distToTarget = enemy.rig.root.position.distanceTo(tpos);

    // Track Glory Target
    if (enemy.isStaggered && distToPlayer < minDist) {
      nearestStaggered = enemy;
      minDist = distToPlayer;
    }

    const isDifferentFloor = (enemy.isDeckEnemy && Math.abs(tpos.y - enemy.rig.root.position.y) > 2.5) ||
      (!enemy.isDeckEnemy && tpos.y > 50);

    // =========================================================================
    // CIVILIAN AI BEHAVIOR (NON-VIOLENT CITIZEN)
    // =========================================================================
    if (enemy.kind === 'civilian') {
      if (enemy.isFleeing || enemy.fleeTimer > 0) {
        enemy.fleeTimer -= dt;
        if (enemy.fleeTimer <= 0) enemy.isFleeing = false;

        // Flee rapidly away from the player
        const fleeDir = enemy.rig.root.position.clone().sub(tpos);
        fleeDir.y = 0;
        if (fleeDir.length() < 0.1) fleeDir.set(1, 0, 0);
        fleeDir.normalize();

        const nextCx = enemy.rig.root.position.x + fleeDir.x * (enemy.speed * 1.5) * dt;
        const nextCz = enemy.rig.root.position.z + fleeDir.z * (enemy.speed * 1.5) * dt;
        if (!city || city.canMoveTo(nextCx, nextCz, 0.4, enemy.rig.root.position.y)) {
          enemy.rig.root.position.x = nextCx;
          enemy.rig.root.position.z = nextCz;
        }
        enemy.rig.root.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);

        // Sprinting walk animation
        enemy.walkPhase += dt * enemy.speed * 5.5;
        const legSwing = Math.sin(enemy.walkPhase) * 0.7;
        enemy.rig.leftLegPivot.rotation.x = legSwing;
        enemy.rig.leftCalfPivot.rotation.x = Math.max(0, -legSwing * 0.7);
        enemy.rig.rightLegPivot.rotation.x = -legSwing;
        enemy.rig.rightCalfPivot.rotation.x = Math.max(0, legSwing * 0.7);

        enemy.rig.leftArmPivot.rotation.x = -legSwing * 0.9;
        enemy.rig.rightArmPivot.rotation.x = legSwing * 0.9;
        enemy.rig.torsoPivot.position.y = 0.98 + Math.abs(Math.sin(enemy.walkPhase * 2)) * 0.05;
      } else {
        // Peaceful civilian stroll around Toronto streets
        enemy.wanderTimer = (enemy.wanderTimer || 3.0) - dt;
        if (enemy.wanderTimer <= 0) {
          enemy.wanderAngle = (enemy.wanderAngle || 0) + (Math.random() - 0.5) * Math.PI * 0.8;
          enemy.wanderTimer = 3.0 + Math.random() * 4.0;
        }

        const wx = Math.sin(enemy.wanderAngle);
        const wz = Math.cos(enemy.wanderAngle);
        const nextCx = enemy.rig.root.position.x + wx * (enemy.speed * 0.6) * dt;
        const nextCz = enemy.rig.root.position.z + wz * (enemy.speed * 0.6) * dt;
        if (!city || city.canMoveTo(nextCx, nextCz, 0.4, enemy.rig.root.position.y)) {
          enemy.rig.root.position.x = nextCx;
          enemy.rig.root.position.z = nextCz;
        } else {
          enemy.wanderAngle = (enemy.wanderAngle || 0) + Math.PI * 0.75;
          enemy.wanderTimer = 1.0;
        }
        enemy.rig.root.rotation.y = enemy.wanderAngle;

        // Gentle walk cycle with natural swinging arms
        enemy.walkPhase += dt * enemy.speed * 2.8;
        const legSwing = Math.sin(enemy.walkPhase) * 0.45;
        enemy.rig.leftLegPivot.rotation.x = legSwing;
        enemy.rig.leftCalfPivot.rotation.x = Math.max(0, -legSwing * 0.4);
        enemy.rig.rightLegPivot.rotation.x = -legSwing;
        enemy.rig.rightCalfPivot.rotation.x = Math.max(0, legSwing * 0.4);

        enemy.rig.leftArmPivot.rotation.set(-legSwing * 0.4, 0, 0.08);
        enemy.rig.rightArmPivot.rotation.set(legSwing * 0.4, 0, -0.08);
        enemy.rig.leftForearmPivot.rotation.set(-0.2, 0, 0);
        enemy.rig.rightForearmPivot.rotation.set(-0.2, 0, 0);
        enemy.rig.torsoPivot.position.y = 0.98 + Math.abs(Math.sin(enemy.walkPhase * 2)) * 0.02;
      }
      return; // Civilians never punch or attack!
    }

    // Body Snatcher proximity trigger: unmask if player gets within 10m!
    if (enemy.kind === 'snatcher' && !enemy.unmasked && distToTarget <= 10.0 && !targetInPeace && !isDifferentFloor) {
      exposeBodySnatcher(enemy);
    }

    // Disguised Snatchers wander peacefully until exposed, so players are never swarmed by disguised figures
    if (enemy.kind === 'snatcher' && !enemy.unmasked) {
      enemy.wanderTimer = (enemy.wanderTimer || 3.0) - dt;
      if (enemy.wanderTimer <= 0) {
        enemy.wanderAngle = (enemy.wanderAngle || 0) + (Math.random() - 0.5) * Math.PI * 0.8;
        enemy.wanderTimer = 3.0 + Math.random() * 4.0;
      }
      const wx = Math.sin(enemy.wanderAngle);
      const wz = Math.cos(enemy.wanderAngle);
      const nextEx = enemy.rig.root.position.x + wx * (enemy.speed * 0.6) * dt;
      const nextEz = enemy.rig.root.position.z + wz * (enemy.speed * 0.6) * dt;
      if (!city || city.canMoveTo(nextEx, nextEz, 0.4, 0)) {
        enemy.rig.root.position.x = nextEx;
        enemy.rig.root.position.z = nextEz;
      }
      enemy.rig.root.rotation.y = enemy.wanderAngle;

      enemy.walkPhase += dt * enemy.speed * 2.8;
      const legSwing = Math.sin(enemy.walkPhase) * 0.45;
      enemy.rig.leftLegPivot.rotation.x = legSwing;
      enemy.rig.leftCalfPivot.rotation.x = Math.max(0, -legSwing * 0.4);
      enemy.rig.rightLegPivot.rotation.x = -legSwing;
      enemy.rig.rightCalfPivot.rotation.x = Math.max(0, legSwing * 0.4);
      enemy.rig.leftArmPivot.rotation.set(-legSwing * 0.4, 0, 0.08);
      enemy.rig.rightArmPivot.rotation.set(legSwing * 0.4, 0, -0.08);
      return;
    }

    // AI Chasing, Footwork & Punch Attacks (Enemies CANNOT pursue into or attack inside Peace Sanctuary, or across different deck floors)
    if (!enemy.isStaggered) {
      const aggroLimit = enemy.aggroDist || 45;
      const isMoving = !targetInPeace && !isDifferentFloor && distToTarget > 1.35 && distToTarget < aggroLimit;

      if (isMoving) {
        const dir = tpos.clone().sub(enemy.rig.root.position).normalize();
        const nextEx = enemy.rig.root.position.x + dir.x * enemy.speed * dt;
        const nextEz = enemy.rig.root.position.z + dir.z * enemy.speed * dt;
        const nextDist = Math.hypot(nextEx - tpos.x, nextEz - tpos.z);
        if (nextDist >= 1.35) {
          if (!city || city.canMoveTo(nextEx, nextEz, 0.45, enemy.rig.root.position.y)) {
            enemy.rig.root.position.x = nextEx;
            enemy.rig.root.position.z = nextEz;
          }
        }

        // Human walk cycle animation
        enemy.walkPhase += dt * enemy.speed * 3.8;
        const legSwing = Math.sin(enemy.walkPhase) * 0.6;
        enemy.rig.leftLegPivot.rotation.x = legSwing;
        enemy.rig.leftCalfPivot.rotation.x = Math.max(0, -legSwing * 0.6);
        enemy.rig.rightLegPivot.rotation.x = -legSwing;
        enemy.rig.rightCalfPivot.rotation.x = Math.max(0, legSwing * 0.6);

        enemy.rig.torsoPivot.position.y = 0.98 + Math.abs(Math.sin(enemy.walkPhase * 2)) * 0.04;
        enemy.rig.torsoPivot.rotation.y = Math.sin(enemy.walkPhase) * 0.12;
      } else {
        // Boxer bounce / guard
        enemy.rig.leftLegPivot.rotation.x = 0.1;
        enemy.rig.leftCalfPivot.rotation.x = 0;
        enemy.rig.rightLegPivot.rotation.x = -0.15;
        enemy.rig.rightCalfPivot.rotation.x = 0.1;
        enemy.rig.torsoPivot.position.y = 0.98 + Math.sin(Date.now() * 0.005) * 0.02;

        // If this is a mission guard and player has disengaged far away, patrol back toward the mission box
        if (enemy.isMissionGuard && enemy.guardAnchor && distToTarget >= aggroLimit) {
          const dAnchor = Math.hypot(enemy.guardAnchor.x - enemy.rig.root.position.x, enemy.guardAnchor.z - enemy.rig.root.position.z);
          if (dAnchor > 6.0) {
            const gdx = (enemy.guardAnchor.x - enemy.rig.root.position.x) / dAnchor;
            const gdz = (enemy.guardAnchor.z - enemy.rig.root.position.z) / dAnchor;
            const gx = enemy.rig.root.position.x + gdx * (enemy.speed * 0.6) * dt;
            const gz = enemy.rig.root.position.z + gdz * (enemy.speed * 0.6) * dt;
            if (!city || city.canMoveTo(gx, gz, 0.45, enemy.rig.root.position.y)) {
              enemy.rig.root.position.x = gx;
              enemy.rig.root.position.z = gz;
            }
            enemy.rig.root.rotation.y = Math.atan2(gdx, gdz);
          }
        }
      }

      // Keep enemy body from clipping inside player camera/body (only when on same floor!)
      // (horizontal distance: tpos is at eye height, so the old 3D check could never fire)
      const flatToTarget = Math.hypot(enemy.rig.root.position.x - tpos.x, enemy.rig.root.position.z - tpos.z);
      if (!isDifferentFloor && flatToTarget < 1.10 && flatToTarget > 0.05) {
        const overlap = 1.10 - flatToTarget;
        const pushX = (enemy.rig.root.position.x - tpos.x) / flatToTarget;
        const pushZ = (enemy.rig.root.position.z - tpos.z) / flatToTarget;
        const sepX = enemy.rig.root.position.x + pushX * overlap;
        const sepZ = enemy.rig.root.position.z + pushZ * overlap;
        if (!city || city.canMoveTo(sepX, sepZ, 0.45, enemy.rig.root.position.y)) {
          enemy.rig.root.position.x = sepX;
          enemy.rig.root.position.z = sepZ;
        }
      }

      // Punch Attack / Boxer Guard Animation
      if (enemy.isPunching) {
        enemy.attackProg += dt * 3.2;
        const punchReach = Math.sin(enemy.attackProg * Math.PI);

        if (enemy.punchArm === 'right') {
          enemy.rig.rightArmPivot.rotation.x = -1.3 - punchReach * 0.65;
          enemy.rig.rightForearmPivot.rotation.x = -0.2 - punchReach * 0.75;
          enemy.rig.torsoPivot.rotation.y = -punchReach * 0.35;
          enemy.rig.leftArmPivot.rotation.x = -1.2;
          enemy.rig.leftForearmPivot.rotation.x = -0.8;
        } else {
          enemy.rig.leftArmPivot.rotation.x = -1.3 - punchReach * 0.65;
          enemy.rig.leftForearmPivot.rotation.x = -0.2 - punchReach * 0.75;
          enemy.rig.torsoPivot.rotation.y = punchReach * 0.35;
          enemy.rig.rightArmPivot.rotation.x = -1.2;
          enemy.rig.rightForearmPivot.rotation.x = -0.8;
        }

        // Deal damage at peak extension (strictly blocked if player is in Peace Sanctuary or different floor)
        if (enemy.attackProg >= 0.5 && !enemy.punchHasDealtDamage) {
          enemy.punchHasDealtDamage = true;
          if (distToTarget <= 2.4 && !targetInPeace && !isDifferentFloor) {
            if (tgt.remoteId) {
              if (window.multiplayer) window.multiplayer.sendEnemyDamage(tgt.remoteId, enemy.damage);
            } else {
              damagePlayer(enemy.damage);
              audio.playImpact('punch');
            }
          }
        }

        if (enemy.attackProg >= 1.0) {
          enemy.isPunching = false;
          enemy.attackProg = 0;
        }
      } else {
        // Guard stance
        const sway = Math.sin(Date.now() * 0.004) * 0.08;
        enemy.rig.leftArmPivot.rotation.set(-1.15 + sway, 0.3, 0.15);
        enemy.rig.leftForearmPivot.rotation.set(-0.85, 0, 0);
        enemy.rig.rightArmPivot.rotation.set(-1.25 - sway, -0.3, -0.15);
        enemy.rig.rightForearmPivot.rotation.set(-0.85, 0, 0);

        // Within attack range -> trigger a punch (strictly blocked if player is in Peace Sanctuary or different floor)
        if (distToTarget <= 2.2 && !targetInPeace && !isDifferentFloor) {
          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0) {
            enemy.attackTimer = enemy.attackCooldown + Math.random() * 0.4;
            enemy.isPunching = true;
            enemy.attackProg = 0;
            enemy.punchArm = Math.random() > 0.4 ? 'right' : 'left';
            enemy.punchHasDealtDamage = false;
            audio.playPunch(0.9, false);
          }
        }
      }
    }
  });

  // Mutual enemy-enemy physical body blocking (sentry guards & crowd spacing)
  for (let i = 0; i < enemies.length; i++) {
    const e1 = enemies[i];
    if (e1.isDead || e1.isKnockedOut || !e1.rig || !e1.rig.root || e1.isRemoteMirror) continue;
    const p1 = e1.rig.root.position;

    for (let j = i + 1; j < enemies.length; j++) {
      const e2 = enemies[j];
      if (e2.isDead || e2.isKnockedOut || !e2.rig || !e2.rig.root || e2.isRemoteMirror) continue;
      const p2 = e2.rig.root.position;

      const sepDx = p2.x - p1.x;
      const sepDz = p2.z - p1.z;
      const sepDist = Math.hypot(sepDx, sepDz);
      const minSep = 1.25;

      if (sepDist < minSep && sepDist > 0.01) {
        const push = (minSep - sepDist) * 0.5;
        const nx = sepDx / sepDist;
        const nz = sepDz / sepDist;
        if (!city || city.canMoveTo(p2.x + nx * push, p2.z + nz * push, 0.45, p2.y)) {
          p2.x += nx * push;
          p2.z += nz * push;
        }
        if (!city || city.canMoveTo(p1.x - nx * push, p1.z - nz * push, 0.45, p1.y)) {
          p1.x -= nx * push;
          p1.z -= nz * push;
        }
      }
    }
  }

  // Glory Kill Prompt Visibility
  state.gloryTarget = nearestStaggered;
  const gPrompt = document.getElementById('glory-kill-prompt');
  if (state.gloryTarget) {
    gPrompt.classList.add('active');
  } else {
    gPrompt.classList.remove('active');
  }
}


// ---------------------------------------------------------------------------
// TRAFFIC HOOKS: what happens when a car hits you / a fighter
// ---------------------------------------------------------------------------
const carKnock = new THREE.Vector3();
let carInvuln = 0;
const trafficHooks = {
  player,
  get enemies() { return enemies; },
  onHitPlayer(dmg, kx, kz) {
    if (carInvuln > 0 || state.isDead) return;
    carInvuln = 1.2;
    carKnock.set(kx, 0, kz);
    player.velocity.y = 6.5;          // launched off your feet
    player.isGrounded = false;
    damagePlayer(dmg);
    triggerScreenShake(26);
    state.camPunch = 1.5;
  },
  onHitEnemy(enemy, dmg, kx, kz) {
    hitEnemy(enemy, dmg, 0, 'car');
    enemy.vx = kx; enemy.vz = kz;      // thrown along the car's path, not away from you
  },
  pushOut(p, dx, dz) {
    if (p.isPlayer) {
      if (canMoveTo(player.pos.x + dx, player.pos.z)) player.pos.x += dx;
      if (canMoveTo(player.pos.x, player.pos.z + dz)) player.pos.z += dz;
    } else if (p.enemy && p.enemy.rig) {
      const ep = p.enemy.rig.root.position;
      if (!city || city.canMoveTo(ep.x + dx, ep.z + dz, 0.45, ep.y)) {
        ep.x += dx;
        ep.z += dz;
      }
    }
  }
};

function applyCarKnockback(dt) {
  carInvuln -= dt;
  if (carKnock.lengthSq() < 0.01) return;
  const nx = player.pos.x + carKnock.x * dt, nz = player.pos.z + carKnock.z * dt;
  if (canMoveTo(nx, player.pos.z)) player.pos.x = nx; else carKnock.x *= -0.3;
  if (canMoveTo(player.pos.x, nz)) player.pos.z = nz; else carKnock.z *= -0.3;
  carKnock.multiplyScalar(Math.exp(-dt * (player.isGrounded ? 6 : 1.5))); // slide less once you land
}

function damagePlayer(dmg) {
  if (state.isDead) return;

  let remaining = dmg;
  if (state.armor > 0) {
    const absorb = Math.min(state.armor, dmg * 0.65);
    state.armor -= absorb;
    remaining -= absorb;
  }
  state.health -= remaining;

  triggerDamageFlash();
  triggerScreenShake(14);
  setFaceExpression('hurt', 0.6);
  updateHUDHealth();

  if (state.health <= 0) {
    state.health = 0;
    playerDeath();
  }
}

function playerDeath() {
  state.isDead = true;
  showAnnouncement("💀 FALLEN IN DEFENSE OF TORONTO! 💀");
  if (document.pointerLockElement) document.exitPointerLock();
  const overlay = document.getElementById('menu-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('menu-title').innerText = 'YOU DIED';
  document.getElementById('menu-subtitle').innerText = 'FALLEN DEFENDER! TORONTO CITIZENS NEED YOU. RESPAWN TO PROTECT THE 6IX!';
  document.getElementById('start-mouse-btn').innerText = 'RESPAWN & DEFEND TORONTO';
}

function updatePickups(dt) {
  pickups.forEach(p => {
    if (p.collected) return;
    p.group.rotation.y += 2.5 * dt;
    p.group.position.y = p.initialY + Math.sin(Date.now() * 0.005) * 0.14;

    const dist = p.group.position.distanceTo(player.pos);
    if (dist < 1.8) {
      p.collected = true;
      scene.remove(p.group);
      audio.playPickup();
      showAnnouncement(`✨ LOOTED: ${p.desc}`);

      if (p.loot === 'HOOK') {
        state.unlocked[ATTACKS.HOOK.id] = true;
        state.activeAttack = ATTACKS.HOOK;
      } else if (p.loot === 'KICK') {
        state.unlocked[ATTACKS.KICK.id] = true;
        state.activeAttack = ATTACKS.KICK;
      } else if (p.loot === 'SLAM') {
        state.unlocked[ATTACKS.SLAM.id] = true;
        state.activeAttack = ATTACKS.SLAM;
      } else if (p.loot === 'HEALTH') {
        state.health = Math.min(state.maxHealth, state.health + 50);
      } else if (p.loot === 'ARMOR') {
        state.armor = Math.min(state.maxArmor, state.armor + 50);
      }

      updateHUDWeapon();
      updateHUDHealth();
    }
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vy -= 18 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;

    if (p.mesh.position.y < 0.1) {
      p.mesh.position.y = 0.1;
      p.vx *= 0.5;
      p.vz *= 0.5;
    }

    if (p.life <= 0) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateCombatTimers(dt) {
  if (state.attackTimer > 0) {
    state.attackTimer -= dt;
    state.attackProgress = 1 - (state.attackTimer / state.attackDuration);
    if (state.attackTimer <= 0) {
      state.isAttacking = false;
      state.attackProgress = 0;
    }
  }

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.comboCount = 0;
      document.getElementById('combo-title').innerText = 'COMBO';
      document.getElementById('combo-count').innerText = 'x0';
    }
  }

  if (state.isBerserk) {
    state.berserkTimer -= dt;
    if (state.berserkTimer <= 0) {
      state.isBerserk = false;
      state.berserkTimer = 0;
      state.rage = 0;
      updateRageBar();
      const bOverlay = document.getElementById('berserk-overlay');
      if (bOverlay) bOverlay.style.opacity = '0';
      showAnnouncement("BERSERK RAGE ENDED");
      audio.stopOCanada();
      audio.startMusic();
    }
  }

  // Dynamic reinforcement spawn rate based on difficulty
  if (state.inGame && !state.isPaused && !state.isDead && city) {
    state.spawnTimer = (state.spawnTimer || 0) + dt;
    const cfg = DIFFICULTY_CONFIGS[state.difficulty || 'medium'] || DIFFICULTY_CONFIGS.medium;
    if (state.spawnTimer >= cfg.spawnInterval) {
      state.spawnTimer = 0;
      const aliveCount = enemies.filter(e => !e.isDead && e.kind !== 'civilian' && !e.isIslandCitizen).length;
      if (aliveCount < cfg.targetEnemies) {
        spawnSingleReinforcement();
      }
    }
  }

  if (state.faceTimer > 0) {
    state.faceTimer -= dt;
    if (state.faceTimer <= 0) state.faceExpression = 'neutral';
  }
}

// ============================================================================
// START & MODE SELECTORS
// ============================================================================
const startMouseBtn = document.getElementById('start-mouse-btn');
if (startMouseBtn) {
  startMouseBtn.addEventListener('click', () => {
    try { if (audio && audio.init) audio.init(); } catch (e) { console.warn('Audio init error:', e); }
    if (state.isDead) resetGame();
    resumeGame(true);
  });
}

const startFreeBtn = document.getElementById('start-free-btn');
if (startFreeBtn) {
  startFreeBtn.addEventListener('click', () => {
    try { if (audio && audio.init) audio.init(); } catch (e) { console.warn('Audio init error:', e); }
    if (state.isDead) resetGame();
    resumeGame(false);
  });
}

function resetGame() {
  state.health = 100;
  state.armor = 50;
  state.isDead = false;
  if (state.isBerserk) {
    state.isBerserk = false;
    state.berserkTimer = 0;
    audio.stopOCanada();
    const bOverlay = document.getElementById('berserk-overlay');
    if (bOverlay) bOverlay.style.opacity = '0';
  }
  if (city && city.getRandomSpawn) {
    const nextSpawn = city.getRandomSpawn();
    player.pos.set(nextSpawn.x, 1.7, nextSpawn.z);
    player.yaw = nextSpawn.yaw;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = nextSpawn.yaw;
    currentTourIndex = nextSpawn.index !== undefined ? nextSpawn.index : currentTourIndex;
    showAnnouncement(`📍 SPAWNED: ${nextSpawn.name.toUpperCase()}\n${nextSpawn.desc}`, 3600);
  } else if (city && city.start) {
    player.pos.set(city.start.x, 1.7, city.start.z);
    player.yaw = city.startYaw;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = city.startYaw;
  } else {
    player.pos.set(0, 1.7, 0);
  }
  populateEnemies();
  spawnCrates();
  startNextMission();
  updateHUDHealth();
  document.getElementById('menu-title').innerText = 'FISTS OF DOOM: TORONTO';
  document.getElementById('menu-subtitle').innerText = 'PROTECT TORONTO CITIZENS FROM ROGUE ROBOTS & DISGUISED BODY SNATCHERS • DO NOT ATTACK INNOCENTS!';
  document.getElementById('start-mouse-btn').innerText = 'ENTER TORONTO ARENA — MOUSE LOOK MODE';
  document.getElementById('start-free-btn').innerText = 'PLAY IN FREE MOUSE MODE (NEVER LOCKS CURSOR, USE ARROWS TO AIM)';
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

// Difficulty Selection Event Listeners
const prevDiffBtn = document.getElementById('diff-prev-btn');
if (prevDiffBtn) {
  prevDiffBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleDifficulty(-1);
  });
}
const nextDiffBtn = document.getElementById('diff-next-btn');
if (nextDiffBtn) {
  nextDiffBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleDifficulty(1);
  });
}
const diffBadgeEl = document.getElementById('diff-badge');
if (diffBadgeEl) {
  diffBadgeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleDifficulty(1);
  });
}
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const diff = btn.getAttribute('data-diff');
    if (diff) setDifficulty(diff, false);
  });
});

// Global exports for multiplayer & UI
window.showAnnouncement = showAnnouncement;
window.triggerDamageFlash = triggerDamageFlash;
window.triggerScreenShake = triggerScreenShake;
window.setFaceExpression = setFaceExpression;
window.updateHUDHealth = updateHUDHealth;
window.playerDeath = playerDeath;
window.spawnDebris = spawnDebris;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.resetGame = resetGame;
window.gameState = state;
window.gamePlayer = player;
window.audio = audio;
window.completeMission = completeMission;
window.gameCity = city;                         // used by tools/export_ai_grid.js
window.MISSION_LANDMARKS_EXPORT = MISSION_LANDMARKS;

if (window.multiplayer && window.multiplayer.init) {
  window.multiplayer.init(scene, player, state);
}

// Init HUD & Start Loop
updateHUDWeapon();
updateHUDHealth();
requestAnimationFrame(animate);
