import { RADIO_CHANNELS, MAX_SPEED, TRAFFIC_ANNOUNCEMENTS, WEATHER_FORECASTS, NEWS_HEADLINES } from '../constants';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
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

  private startEngineSound() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    this.engineGain.gain.value = 0.1;

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  public setEnginePitch(speed: number) {
    if (this.engineOsc && this.ctx) {
      const ratio = speed / MAX_SPEED;
      this.engineOsc.frequency.setValueAtTime(50 + (ratio * 150), this.ctx.currentTime);
      if (this.engineGain) this.engineGain.gain.value = 0.05 + (ratio * 0.1);
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
          this.musicVolume = target;
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
  public playTrafficAnnouncement(stage: number) {
      const text = TRAFFIC_ANNOUNCEMENTS[stage];
      if (!text) return;

      // Interrupt everything
      window.speechSynthesis.cancel();
      this.newsQueue = []; // Clear pending news
      this.duckMusic(true);
      
      this.playJingle('TRAFFIC', () => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'fi-FI';
          utterance.pitch = 0.9;
          utterance.rate = 1.0;
          this.activeUtterance = utterance;
          
          utterance.onend = () => {
              this.activeUtterance = null;
              this.duckMusic(false);
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
    if ((!this.musicAudio || this.musicAudio.paused) && !window.speechSynthesis.speaking) {
         for(let i=0; i<dataArray.length; i++) dataArray[i] = Math.random() * 50;
    } else if (window.speechSynthesis.speaking) {
         // Fake visualizer for speech
         for(let i=0; i<dataArray.length; i++) dataArray[i] = Math.random() * 150;
    }
    
    return dataArray;
  }
}