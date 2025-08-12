import safeStorage from '../DataStorage/safeStorage';
import { AudioManager as IAudioManager } from '../Utilities/types';

type PlaybackRequest = {
  text: string;
  voice: SpeechSynthesisVoice | null;
  resolve: () => void;
  reject: (error: any) => void;
  timestamp: number;
};

class TTSAudioManager implements IAudioManager {
  private static instance: TTSAudioManager;
  private isAudioEnabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private playbackQueue: PlaybackRequest[] = [];
  private isProcessingQueue: boolean = false;
  private lastAudioActivity: number = Date.now();
  private availableVoices: SpeechSynthesisVoice[] = [];
  private isInitialized: boolean = false;
  private voicesLoaded: boolean = false;

  private constructor() {
    this.setupSpeechSynthesis();
  }

  public static getInstance(): TTSAudioManager {
    if (!TTSAudioManager.instance) {
      TTSAudioManager.instance = new TTSAudioManager();
    }
    return TTSAudioManager.instance;
  }

  private setupSpeechSynthesis() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Load voices when they become available
      const loadVoices = () => {
        this.availableVoices = speechSynthesis.getVoices();
        this.voicesLoaded = true;
      };

      // Some browsers load voices asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Try to load voices immediately (works in some browsers)
      loadVoices();
      
      // Fallback: try again after a short delay
      setTimeout(loadVoices, 100);
    }
  }

  public async initialize(voices?: string[]): Promise<this> {
    // Wait for voices to load if they haven't already
    if (!this.voicesLoaded && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await new Promise<void>((resolve) => {
        const checkVoices = () => {
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            this.availableVoices = voices;
            this.voicesLoaded = true;
            resolve();
          } else {
            setTimeout(checkVoices, 50);
          }
        };
        checkVoices();
      });
    }
    
    this.isInitialized = true;
    return this;
  }

  public setAvailableVoices(voices: string[]) {
    // For TTS, we don't set voices externally - they come from the browser
    // This method is kept for interface compatibility
  }

  public getAvailableVoices(): string[] {
    // We only expose a simple choice: Default or Random
    return ['Default', 'Random'];
  }

  private getBestVoices(): SpeechSynthesisVoice[] {
    const englishVoices = this.availableVoices.filter(voice => 
      voice.lang.toLowerCase().startsWith('en')
    );
    
    if (englishVoices.length === 0) return [];
    
    // Define patterns for high-quality voices (in order of preference)
    const qualityPatterns = [
      // macOS/iOS high-quality voices
      /^(Samantha|Alex|Victoria|Daniel|Karen|Moira|Tessa|Veena|Fiona)/i,
      // Windows high-quality voices  
      /^(Microsoft\s+)?(Zira|David|Mark|Hazel)/i,
      // Google/Chrome voices
      /^Google\s+(US\s+)?English/i,
      // Any voice with "natural" or "premium" in the name
      /(natural|premium|enhanced|neural)/i,
      // Default system voices
      /default/i
    ];
    
    const goodVoices: SpeechSynthesisVoice[] = [];
    
    // Find voices matching quality patterns
    for (const pattern of qualityPatterns) {
      const matches = englishVoices.filter(voice => 
        pattern.test(voice.name) && 
        voice.localService !== false && // Prefer local voices
        !goodVoices.includes(voice)
      );
      goodVoices.push(...matches);
      
      // Stop when we have 3-4 good voices
      if (goodVoices.length >= 3) break;
    }
    
    // If we still don't have enough, add the best remaining local voices
    if (goodVoices.length < 3) {
      const remainingLocal = englishVoices.filter(voice => 
        voice.localService !== false && 
        !goodVoices.includes(voice)
      );
      goodVoices.push(...remainingLocal.slice(0, 3 - goodVoices.length));
    }
    
    // Last resort: use any English voices
    if (goodVoices.length === 0) {
      goodVoices.push(...englishVoices.slice(0, 3));
    }
    
    return goodVoices;
  }

  public getSelectedVoice(): string | null {
    const selectedVoiceName = safeStorage?.getItem('ankaido-selected-voice') || 'default';
    const bestVoices = this.getBestVoices();
    
    if (bestVoices.length === 0) return null;
    
    if (selectedVoiceName.toLowerCase() === 'random') {
      // Rotate through our curated list of good voices
      const randomIndex = Math.floor(Math.random() * bestVoices.length);
      return bestVoices[randomIndex].name;
    }
    
    // Default: always use the best voice we found
    return bestVoices[0].name;
  }

  private getVoiceByName(voiceName: string | null): SpeechSynthesisVoice | null {
    if (!voiceName) return null;
    return this.availableVoices.find(voice => voice.name === voiceName) || null;
  }

  private preprocessTextForSpeech(text: string): string {
    // Clean up text for better TTS pronunciation
    let processed = text.trim();
    
    // Remove parenthetical content that might confuse TTS
    processed = processed.replace(/\([^)]*\)/g, '');
    
    // Handle common abbreviations and make them more pronounceable
    const abbreviations: { [key: string]: string } = {
      'e.g.': 'for example',
      'i.e.': 'that is',
      'etc.': 'etcetera',
      'vs.': 'versus',
      'Mr.': 'Mister',
      'Mrs.': 'Missus',
      'Dr.': 'Doctor',
      'Prof.': 'Professor'
    };
    
    Object.entries(abbreviations).forEach(([abbrev, expansion]) => {
      const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}`, 'gi');
      processed = processed.replace(regex, expansion);
    });
    
    // Add slight pauses for better pronunciation of compound words
    processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Clean up extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  public async playAudio(text: string, onlyCached: boolean = false, sequential: boolean = false): Promise<void> {
    if (!this.isAudioEnabled || !text.trim()) return;

    // For TTS, onlyCached doesn't make sense, so we ignore it
    const now = Date.now();
    this.lastAudioActivity = now;

    const selectedVoiceName = this.getSelectedVoice();
    const voice = this.getVoiceByName(selectedVoiceName);

    return new Promise<void>((resolve, reject) => {
      this.playbackQueue.push({
        text: text.trim(),
        voice,
        resolve,
        reject,
        timestamp: now
      });
      this.processPlaybackQueue();
    });
  }

  private async processPlaybackQueue() {
    if (this.isProcessingQueue || this.playbackQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.playbackQueue.length > 0) {
        const request = this.playbackQueue.shift()!;
        try {
          this.lastAudioActivity = Date.now();
          await this.playTTSInternal(request);
        } catch (error) {
          console.warn('Error processing TTS request, continuing with queue:', error);
          if (request.reject) {
            request.reject(error);
          }
        }
      }
    } catch (error) {
      console.error('Critical error in TTS queue processing:', error);
      while (this.playbackQueue.length > 0) {
        const request = this.playbackQueue.shift()!;
        if (request.reject) {
          request.reject(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async playTTSInternal({ text, voice, resolve, reject }: PlaybackRequest): Promise<void> {
    try {
      // Stop current speech if not sequential
      await this.stopCurrentAudio();

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error('Speech synthesis not supported');
      }

      // Preprocess text for better pronunciation
      const processedText = this.preprocessTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      // Set voice if available
      if (voice) {
        utterance.voice = voice;
      }

      // Configure speech parameters for natural-sounding speech
      utterance.rate = 0.85; // Slower rate for better comprehension
      utterance.pitch = 1.0;  // Normal pitch
      utterance.volume = 0.9; // Slightly lower volume to avoid distortion

      this.currentUtterance = utterance;

      // Set up event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Start speaking
      speechSynthesis.speak(utterance);

    } catch (error: any) {
      console.warn(`Failed to speak text: ${text}`, error);
      reject(error);
    }
  }

  public async stopCurrentAudio(): Promise<void> {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      this.currentUtterance = null;
    }
  }

  public async stopAllAudio(): Promise<void> {
    this.playbackQueue = [];
    await this.stopCurrentAudio();
    this.isProcessingQueue = false;
  }

  public async resetAudioSystem(): Promise<void> {
    console.warn('Resetting TTS audio system');
    await this.stopAllAudio();
    this.isAudioEnabled = true;
    console.log('TTS audio system reset complete');
  }

  // Legacy methods for compatibility - not needed for TTS
  public async createAndSetupAudio(word: string, voice: string | null, cacheKey: string): Promise<HTMLAudioElement & { _blobUrl?: string }> {
    throw new Error('createAndSetupAudio not supported in TTS mode');
  }

  public async preloadAudio(word: string): Promise<boolean> {
    // TTS doesn't need preloading
    return true;
  }

  public async preloadMultipleAudio(options: string[]): Promise<PromiseSettledResult<boolean>[]> {
    // TTS doesn't need preloading
    return options.map(() => ({ status: 'fulfilled' as const, value: true }));
  }

  public hasInCache(word: string): boolean {
    // TTS doesn't use cache
    return true;
  }

  public getCache(): any {
    // TTS doesn't use cache
    return {};
  }

  public clearCache() {
    // TTS doesn't use cache
  }

  public removeCachedAudio(word: string, voice: string) {
    // TTS doesn't use cache
  }
}

const ttsAudioManager = TTSAudioManager.getInstance();

export default ttsAudioManager;