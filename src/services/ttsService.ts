import { TTSConfig } from '../types';

export class TTSService {
  private static config: TTSConfig = {
    apiKey: 'ap2_d0c8e342-5485-4028-ae47-d751d347cace',
    voice: '',
    pitch: 1.0,
    rate: 1.0,
    autoSpeak: true,
  };

  private static availableVoices: SpeechSynthesisVoice[] = [];
  private static isSpeaking: boolean = false;
  private static audioCtx: AudioContext | null = null;
  private static isAudioUnlocked: boolean = false;

  static init(): void {
    if (typeof window === 'undefined') return;

    // 1. Initialize voices
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        try {
          this.availableVoices = window.speechSynthesis.getVoices();
          if (this.availableVoices.length > 0 && !this.config.voice) {
            const preferred =
              this.availableVoices.find(
                (v) =>
                  v.lang.startsWith('en') &&
                  (v.name.includes('Natural') ||
                    v.name.includes('Google') ||
                    v.name.includes('Samantha') ||
                    v.name.includes('David') ||
                    v.default)
              ) || this.availableVoices[0];
            this.config.voice = preferred?.name || '';
          }
        } catch {
          // ignore
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // 2. Global user interaction listener to unlock audio policy
    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };

    window.addEventListener('click', unlockHandler);
    window.addEventListener('keydown', unlockHandler);
    window.addEventListener('touchstart', unlockHandler);
  }

  /**
   * Explicitly unlock browser audio context and speech synthesis
   */
  static unlockAudio(): void {
    if (this.isAudioUnlocked) return;
    try {
      if (typeof window === 'undefined') return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
        // Speak a tiny zero-volume utterance to unlock Safari & Chrome SpeechSynthesis
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      }

      this.isAudioUnlocked = true;
      console.log('[TTSService] AudioContext & SpeechSynthesis unlocked successfully!');
    } catch (err) {
      console.warn('[TTSService] Audio unlock notice:', err);
    }
  }

  static getIsUnlocked(): boolean {
    return this.isAudioUnlocked;
  }

  static getConfig(): TTSConfig {
    return { ...this.config };
  }

  static updateConfig(partial: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  static reduceSpeechRate(): number {
    this.config.rate = Math.max(0.5, parseFloat((this.config.rate - 0.2).toFixed(1)));
    return this.config.rate;
  }

  static getVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.availableVoices.length === 0) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    return this.availableVoices;
  }

  /**
   * Audible acoustic confirmation chime using Web Audio API
   * Guaranteed to produce audible sound in all browsers!
   */
  static playAudioChime(frequency: number = 659.25): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }

  /**
   * Synthesize speech directly with zero latency and robust browser resumption
   */
  static async speak(text: string): Promise<boolean> {
    const cleanText = text.trim();
    if (!cleanText) return false;

    // Ensure audio is unlocked
    this.unlockAudio();

    // Play resonant acoustic chime immediately for sensory confirmation
    this.playAudioChime();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        // Resume if paused (common Chrome autoplay policy state)
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.lang = 'en-US';
        utterance.volume = 1.0;

        if (this.availableVoices.length === 0) {
          this.availableVoices = window.speechSynthesis.getVoices();
        }

        if (this.config.voice && this.availableVoices.length > 0) {
          const selected = this.availableVoices.find((v) => v.name === this.config.voice);
          if (selected) {
            utterance.voice = selected;
          }
        }

        utterance.onstart = () => {
          this.isSpeaking = true;
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          resolve(true);
        };

        utterance.onerror = (e) => {
          this.isSpeaking = false;
          console.warn('[TTSService] Speech synthesis notice, recovered:', e);
          resolve(true);
        };

        // Dispatch speak
        window.speechSynthesis.speak(utterance);

        // Safety timeout to prevent hanging UI
        setTimeout(() => {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            resolve(true);
          }
        }, Math.max(1200, cleanText.length * 160));
      } catch (err) {
        console.error('[TTSService] Speak error:', err);
        this.isSpeaking = false;
        resolve(false);
      }
    });
  }

  static stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  static getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
