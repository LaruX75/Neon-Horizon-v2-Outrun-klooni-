
import { RADIO_CHANNELS, MAX_SPEED, TRAFFIC_ANNOUNCEMENTS, WEATHER_FORECASTS, NEWS_HEADLINES } from '../constants';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  // Multi-oscillator setup for sporty sound
  private oscMain: OscillatorNode | null = null;
  private oscDetune: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null; // Lowpass to remove "buzz"
  private engineDistortion: WaveShaperNode | null = null; // Add grit at high RPM
  private rumbleLFO: OscillatorNode | null = null; // Modulate amplitude for V8 throb
  
  private musicAudio: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private musicVolume: number = 0.6;
  
  private currentChannelIndex: number = 0;
  private currentStage: number = 1;
  private newsQueue: string[] = [];
  private isSpeaking: boolean = false;

  constructor() {
    // Context created on gesture
  }

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.startEngineSound();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
    }
  }

  public setStage(stage: number) {
      this.currentStage = stage;
  }

  public setMusicVolume(volume: number) {
      this.musicVolume = Math.max(0, Math.min(1, volume));
      if (this.musicAudio) {
          this.musicAudio.volume = this.musicVolume;
      }
  }

  // Create a sigmoid distortion curve
  private makeDistortionCurve(amount: number): Float32Array {
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
      }
      return curve;
  }

  private startEngineSound() {
    if (!this.ctx) return;
    
    // Master Gain for Engine
    this.engineGain = this.ctx.createGain();
    this.engineGain.connect(this.ctx.destination);
    this.engineGain.gain.value = 0.1;

    // Distortion (Drive) - Comes after Osc, before Filter or after Filter? 
    // Osc -> Filter -> Distortion -> Gain usually sounds like a screaming exhaust.
    this.engineDistortion = this.ctx.createWaveShaper();
    this.engineDistortion.curve = this.makeDistortionCurve(0); // Start clean
    this.engineDistortion.oversample = '4x';
    this.engineDistortion.connect(this.engineGain);

    // Filter to cut high frequencies (makes it sound like an engine, not a laser)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 200; // Start low (idle)
    this.engineFilter.Q.value = 2; // Resonance for the "whine"
    this.engineFilter.connect(this.engineDistortion);

    // 1. Main Tone (Sawtooth for richness)
    this.oscMain = this.ctx.createOscillator();
    this.oscMain.type = 'sawtooth';
    this.oscMain.frequency.value = 60; // Lower pitch
    this.oscMain.connect(this.engineFilter);

    // 2. Detuned Tone (Thickens sound, Chorus effect)
    this.oscDetune = this.ctx.createOscillator();
    this.oscDetune.type = 'sawtooth';
    this.oscDetune.frequency.value = 60; 
    this.oscDetune.detune.value = 15; 
    this.oscDetune.connect(this.engineFilter);

    // 3. Sub Rumble (Square for aggressive low end)
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'square';
    this.oscSub.frequency.value = 30; // Sub-bass
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.5; 
    this.oscSub.connect(subGain);
    subGain.connect(this.engineFilter);

    // 4. Rumble LFO (Amplitude Modulation to simulate cylinder firing)
    this.rumbleLFO = this.ctx.createOscillator();
    this.rumbleLFO.type = 'sine';
    this.rumbleLFO.frequency.value = 15; // Idle rumble speed
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.05; // Modulation depth
    
    this.rumbleLFO.connect(lfoGain);
    lfoGain.connect(this.engineGain.gain); // Modulate volume

    this.oscMain.start();
    this.oscDetune.start();
    this.oscSub.start();
    this.rumbleLFO.start();
  }

  public setEnginePitch(speed: number) {
    if (this.ctx && this.engineGain && this.oscMain && this.oscDetune && this.oscSub && this.engineFilter && this.rumbleLFO && this.engineDistortion) {
      const ratio = speed / MAX_SPEED;
      
      // Pitch scaling: 60Hz (Idle) -> 550Hz (Redline Scream)
      const baseFreq = 60 + (ratio * 500); 
      
      // Filter opens up aggressively as you speed up. 
      // At max speed, it lets almost everything through for that "raw" sound.
      const filterFreq = 200 + (ratio * 5000); 

      // Distortion amount increases with RPM to simulate engine roar
      // Create new curve on fly might be expensive, so we just switch curves or pre-calc?
      // Actually, simple gain into waveshaper controls distortion amount, but here we update curve or input gain.
      // Let's just update the curve occasionally or assume a fixed curve.
      // Better: Use the ratio to control Q factor and Detune.
      
      // Rumble speed increases with RPM
      const rumbleSpeed = 15 + (ratio * 50);

      this.oscMain.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
      this.oscDetune.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
      this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.1);
      
      this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
      // Resonance increases slightly at mid range then drops
      this.engineFilter.Q.setTargetAtTime(1 + (Math.sin(ratio * Math.PI) * 3), this.ctx.currentTime, 0.1);

      this.rumbleLFO.frequency.setTargetAtTime(rumbleSpeed, this.ctx.currentTime, 0.1);

      // Base volume increases with load/speed
      this.engineGain.gain.setTargetAtTime(0.1 + (ratio * 0.1), this.ctx.currentTime, 0.1);
      
      // Apply distortion curve based on speed (simulated drive)
      // Only update occasionally to save CPU, or just set a static gritty curve.
      // Let's stick to a static curve initiated in startEngineSound, but maybe we can tweak detune
      this.oscDetune.detune.setTargetAtTime(15 + (ratio * 20), this.ctx.currentTime, 0.1);
    }
  }

  public playMusic() {
    this.playChannel(0);
  }

  public nextChannel() {
    this.setChannel((this.currentChannelIndex + 1) % RADIO_CHANNELS.length);
  }

  public setChannel(index: number) {
      if (index < 0 || index >= RADIO_CHANNELS.length) return;
      this.currentChannelIndex = index;
      this.playChannel(this.currentChannelIndex);
  }

  public getCurrentChannelName(): string {
    return RADIO_CHANNELS[this.currentChannelIndex].name;
  }
  
  public getCurrentChannelIndex(): number {
      return this.currentChannelIndex;
  }

  private playChannel(index: number) {
    const channel = RADIO_CHANNELS[index];
    
    // Reset state
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio = null;
    }
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.newsQueue = [];

    // Handle Radio OFF
    if (channel.name === 'RADIO OFF') {
        return; 
    }

    if (channel.url === 'TTS') {
        this.startNewsCycle();
    } else if (channel.url) {
        this.musicAudio = new Audio(channel.url);
        this.musicAudio.loop = true;
        this.musicAudio.volume = this.musicVolume;
        this.musicAudio.crossOrigin = "anonymous";
        this.musicAudio.play().catch(e => console.log("Autoplay blocked", e));
    }
  }

  private duckMusic(duck: boolean) {
      if (this.musicAudio) {
          const target = duck ? 0.2 : 0.6;
          this.musicAudio.volume = target;
          this.musicVolume = target; // Update master volume to restore later? No, that would lose user setting.
          // FIX: Don't overwrite master setting, just temp duck
      }
  }

  // --- WHITE NOISE GENERATOR ---
  private createNoiseBuffer(): AudioBuffer | null {
      if (!this.ctx) return null;
      const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 sec buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      return buffer;
  }

  private playJingle(type: 'NEWS' | 'TRAFFIC', callback: () => void) {
      if (!this.ctx) {
          callback();
          return;
      }

      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);

      if (type === 'NEWS') {
          // COMPLEX NEWS JINGLE: ~4 seconds
          // 1. Teletype Beeps (Square)
          const oscBeep = this.ctx.createOscillator();
          oscBeep.type = 'square';
          oscBeep.connect(gain);
          
          // Rapid pulses
          const beepRate = 0.1;
          const beepDur = 0.05;
          for(let i=0; i<8; i++) {
              oscBeep.frequency.setValueAtTime(880, now + i*beepRate); // A5
              gain.gain.setValueAtTime(0.1, now + i*beepRate);
              gain.gain.setValueAtTime(0, now + i*beepRate + beepDur);
          }
          oscBeep.start(now);
          oscBeep.stop(now + 1.0);

          // 2. Synth Lead (Sawtooth)
          const oscLead = this.ctx.createOscillator();
          oscLead.type = 'sawtooth';
          oscLead.connect(gain);
          
          // Melody: C4 - E4 - G4 - C5 - G4 (Arpeggio style fanfare)
          const startLead = now + 1.0;
          oscLead.frequency.setValueAtTime(261.63, startLead); // C4
          gain.gain.setValueAtTime(0.2, startLead);
          
          oscLead.frequency.setValueAtTime(329.63, startLead + 0.2); // E4
          oscLead.frequency.setValueAtTime(392.00, startLead + 0.4); // G4
          oscLead.frequency.setValueAtTime(523.25, startLead + 0.6); // C5
          
          // Hold last note
          gain.gain.linearRampToValueAtTime(0, startLead + 2.0);
          
          oscLead.start(startLead);
          oscLead.stop(startLead + 2.0);

          // 3. Static Burst (Transition)
          const noise = this.createNoiseBuffer();
          if (noise) {
              const noiseSrc = this.ctx.createBufferSource();
              noiseSrc.buffer = noise;
              const noiseGain = this.ctx.createGain();
              noiseSrc.connect(noiseGain);
              noiseGain.connect(this.ctx.destination);
              
              const startNoise = startLead + 1.8;
              noiseGain.gain.setValueAtTime(0, startNoise);
              noiseGain.gain.linearRampToValueAtTime(0.15, startNoise + 0.1);
              noiseGain.gain.exponentialRampToValueAtTime(0.01, startNoise + 0.5);
              
              noiseSrc.start(startNoise);
          }

          setTimeout(callback, 3500);

      } else {
          // TRAFFIC: Attention grabbing low-high-low "Pa-Pa-Pam"
          const osc = this.ctx.createOscillator();
          osc.type = 'square';
          osc.connect(gain);

          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.3, now);
          
          osc.frequency.setValueAtTime(440, now + 0.15); // A4
          gain.gain.setValueAtTime(0, now + 0.14); // Silence gap
          gain.gain.setValueAtTime(0.3, now + 0.15); 
          
          osc.frequency.setValueAtTime(660, now + 0.30); // E5
          gain.gain.setValueAtTime(0, now + 0.29);
          gain.gain.setValueAtTime(0.3, now + 0.30);
          
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          osc.start(now);
          osc.stop(now + 0.8);
          setTimeout(callback, 1000);
      }
  }

  // --- TRAFFIC ANNOUNCEMENT SYSTEM ---
  public playTrafficAnnouncement(stage: number, onStart?: () => void, onEnd?: () => void) {
      if (this.getCurrentChannelName() === 'RADIO OFF') return;

      const text = TRAFFIC_ANNOUNCEMENTS[stage];
      if (!text) return;

      // Interrupt everything
      window.speechSynthesis.cancel();
      this.newsQueue = []; // Clear pending news
      this.duckMusic(true);
      
      this.playJingle('TRAFFIC', () => {
          if (onStart) onStart();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'fi-FI';
          utterance.pitch = 0.9;
          utterance.rate = 1.0;
          this.activeUtterance = utterance;
          
          utterance.onend = () => {
              this.activeUtterance = null;
              this.duckMusic(false);
              if (onEnd) onEnd();
              // Check if we were on News Channel, if so restart cycle after pause
              if (this.getCurrentChannelName() === 'AI NEWS') {
                   setTimeout(() => this.startNewsCycle(), 2000);
              }
          };
          window.speechSynthesis.speak(utterance);
      });
  }

  // --- NEWS CHANNEL SYSTEM ---
  private startNewsCycle() {
      if (this.getCurrentChannelName() !== 'AI NEWS') return;
      
      // Build Queue: 3 Headlines -> Weather
      this.newsQueue = [];
      
      // Pick 3 random headlines (no duplicates if possible)
      const indices = new Set<number>();
      while(indices.size < 3) {
          indices.add(Math.floor(Math.random() * NEWS_HEADLINES.length));
      }
      indices.forEach(i => this.newsQueue.push(NEWS_HEADLINES[i]));
      
      // Add Weather for current stage
      const weather = WEATHER_FORECASTS[this.currentStage] || WEATHER_FORECASTS[1];
      this.newsQueue.push(`Sääennuste alueelle ${this.currentStage}: ${weather}`);

      this.playNewsJingleAndRead();
  }

  private playNewsJingleAndRead() {
      if (this.getCurrentChannelName() !== 'AI NEWS') return;
      this.playJingle('NEWS', () => {
          this.processNewsQueue();
      });
  }

  private processNewsQueue() {
      if (this.getCurrentChannelName() !== 'AI NEWS') return;

      if (this.newsQueue.length === 0) {
          // Cycle done, wait then restart
          setTimeout(() => this.startNewsCycle(), 5000);
          return;
      }

      const text = this.newsQueue.shift()!;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fi-FI';
      utterance.pitch = 1.0; // Neutral news voice
      utterance.rate = 1.0;
      this.activeUtterance = utterance;

      utterance.onend = () => {
          this.activeUtterance = null;
          // Small pause between items
          setTimeout(() => this.processNewsQueue(), 1000);
      };

      window.speechSynthesis.speak(utterance);
  }

  public playCheckpointSound() {
      if (this.getCurrentChannelName() === 'RADIO OFF') return;

      // Prioritize this over news, but not over traffic ideally, but simple overwrite is fine
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Check Point!");
      utterance.lang = 'en-US';
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      this.activeUtterance = utterance;
      utterance.onend = () => { 
          this.activeUtterance = null; 
          // If we were on news, restart
          if (this.getCurrentChannelName() === 'AI NEWS') this.startNewsCycle();
      };
      window.speechSynthesis.speak(utterance);
  }

  // 3-2-1-GO Sound
  public playCountdownTone(stage: number) {
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      const isGo = stage === 3;
      const freq = isGo ? 880 : 440; 
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Fallback animation if no audio playing or TTS
    const isPlaying = this.musicAudio && !this.musicAudio.paused;
    const isTalking = window.speechSynthesis.speaking;

    if (!isPlaying && !isTalking) {
         return new Uint8Array(0);
    } else if (isTalking) {
         // Fake visualizer for speech
         for(let i=0; i<dataArray.length; i++) dataArray[i] = Math.random() * 150;
    } else {
         // Random visuals for music if analyser isn't hooked to element (CORS)
         for(let i=0; i<dataArray.length; i++) dataArray[i] = Math.random() * 200;
    }
    
    return dataArray;
  }
}
