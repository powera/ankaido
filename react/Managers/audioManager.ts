import safeStorage from '../DataStorage/safeStorage';
import { AudioManager as IAudioManager } from '../Utilities/types';

const API_BASE = '/api/lithuanian';

const getAudioUrl = (word: string, voice?: string): string => {
  return `${API_BASE}/audio/${encodeURIComponent(word)}${voice ? `?voice=${encodeURIComponent(voice)}` : ''}`;
};

type AudioCache = {
  [key: string]: HTMLAudioElement & { _blobUrl?: string };
};

type PlaybackRequest = {
  word: string;
  voice: string | null;
  cacheKey: string;
  onlyCached: boolean;
  sequential: boolean;
  resolve: () => void;
  reject: (error: any) => void;
  timestamp: number;
};

class AudioManager implements IAudioManager {
  private static instance: AudioManager;
  private audioCache: AudioCache = {};
  private audioContext: AudioContext | null = null;
  private isAudioEnabled: boolean = true;
  private currentlyPlaying: (HTMLAudioElement & { _blobUrl?: string }) | null = null;
  private isAudioContextInitialized: boolean = false;
  private pendingAudioRequests: Set<string> = new Set();
  private playbackQueue: PlaybackRequest[] = [];
  private isProcessingQueue: boolean = false;
  private lastAudioActivity: number = Date.now();
  private availableVoices: string[] = [];
  private isInitialized: boolean = false;

  private constructor() {
    this.setupPageVisibilityHandling();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private setupPageVisibilityHandling() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.handlePageBecameVisible();
        }
      });

      window.addEventListener('focus', () => {
        this.handlePageBecameVisible();
      });
    }
  }

  private async handlePageBecameVisible() {
    this.isAudioContextInitialized = false;
    if (this.isProcessingQueue && this.playbackQueue.length === 0) {
      console.warn('Clearing stuck audio queue processing state');
      this.isProcessingQueue = false;
    }
    this.isAudioEnabled = true;
  }

  public async initialize(voices?: string[]): Promise<this> {
    this.availableVoices = voices || [];
    this.isInitialized = true;
    return this;
  }

  public setAvailableVoices(voices: string[]) {
    this.availableVoices = voices;
  }

  public getAvailableVoices(): string[] {
    return this.availableVoices;
  }

  public getSelectedVoice(): string | null {
    const selectedVoice = safeStorage?.getItem('ankaido-selected-voice') || 'random';
    if (selectedVoice === 'random') {
      if (this.availableVoices.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * this.availableVoices.length);
      return this.availableVoices[randomIndex];
    }
    return selectedVoice;
  }

  private async initializeAudioContext(): Promise<boolean> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
        this.isAudioContextInitialized = false;
        return false;
      }
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.audioContext.state === 'suspended') {
          console.warn('AudioContext still suspended after resume attempt');
          try {
            await this.audioContext.close();
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            await this.audioContext.resume();
          } catch (recreateError) {
            console.warn('Failed to recreate AudioContext:', recreateError);
            this.isAudioContextInitialized = false;
            return false;
          }
        }
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
        this.isAudioContextInitialized = false;
        return false;
      }
    }

    this.isAudioContextInitialized = this.audioContext.state === 'running';
    return this.isAudioContextInitialized;
  }

  public async playAudio(word: string, onlyCached: boolean = false, sequential: boolean = false): Promise<void> {
    const voice = this.getSelectedVoice();
    const audioEnabled = true;
    if (!audioEnabled || !this.isAudioEnabled) return;

    const now = Date.now();
    if (this.isProcessingQueue && (now - this.lastAudioActivity) > 30000) {
      console.warn('Audio system appears stuck, resetting...');
      await this.resetAudioSystem();
    }

    this.lastAudioActivity = now;
    const cacheKey = `${word}-${voice}`;

    return new Promise<void>((resolve, reject) => {
      this.playbackQueue.push({
        word,
        voice,
        cacheKey,
        onlyCached,
        sequential,
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
          await this.playAudioInternal(request);
        } catch (error) {
          console.warn('Error processing audio request, continuing with queue:', error);
          if (request.reject) {
            request.reject(error);
          }
        }
      }
    } catch (error) {
      console.error('Critical error in audio queue processing:', error);
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

  private async playAudioInternal({
    word,
    voice,
    cacheKey,
    onlyCached,
    sequential,
    resolve,
    reject
  }: PlaybackRequest): Promise<void> {
    try {
      if (this.pendingAudioRequests.has(cacheKey)) {
        resolve();
        return;
      }

      if (!sequential) {
        await this.stopCurrentAudio();
      }

      this.pendingAudioRequests.add(cacheKey);

      if (!this.isAudioContextInitialized) {
        await this.initializeAudioContext();
      }

      let audio: HTMLAudioElement & { _blobUrl?: string };

      if (this.audioCache[cacheKey]) {
        audio = this.audioCache[cacheKey];
        if (audio.currentTime > 0) {
          audio.currentTime = 0;
        }
        await new Promise(res => setTimeout(res, 10));
      } else {
        if (onlyCached) {
          resolve();
          return;
        }
        audio = await this.createAndSetupAudio(word, voice, cacheKey);
      }

      this.currentlyPlaying = audio;

      await new Promise<void>((playResolve, playReject) => {
        const onEnded = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          playResolve();
        };

        const onError = (error: any) => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          playReject(error);
        };

        audio.addEventListener('ended', onEnded, { once: true });
        audio.addEventListener('error', onError, { once: true });

        audio.play().catch(playReject);
      });

      resolve();
    } catch (error: any) {
      console.warn(`Failed to play audio for: ${word}`, error);

      if (error.name === 'NotAllowedError') {
        console.warn('Audio playback blocked by browser policy. User interaction may be required.');
        this.isAudioEnabled = false;
        setTimeout(() => {
          this.isAudioEnabled = true;
        }, 5000);
      }
      reject(error);
    } finally {
      this.pendingAudioRequests.delete(cacheKey);
    }
  }

  public async stopCurrentAudio(): Promise<void> {
    if (
      this.currentlyPlaying &&
      !this.currentlyPlaying.ended &&
      !this.currentlyPlaying.paused
    ) {
      return new Promise<void>((resolve) => {
        const audio = this.currentlyPlaying!;
        const onPause = () => {
          audio.removeEventListener('pause', onPause);
          resolve();
        };

        audio.addEventListener('pause', onPause, { once: true });

        if (audio.volume > 0) {
          const fadeOut = setInterval(() => {
            if (audio.volume > 0.1) {
              audio.volume = Math.max(0, audio.volume - 0.1);
            } else {
              clearInterval(fadeOut);
              audio.volume = 1;
              audio.pause();
              audio.currentTime = 0;
            }
          }, 20);
        } else {
          audio.pause();
          audio.currentTime = 0;
        }

        setTimeout(resolve, 200);
      });
    }
  }

  public async stopAllAudio(): Promise<void> {
    this.playbackQueue = [];
    await this.stopCurrentAudio();
    this.isProcessingQueue = false;
  }

  public async resetAudioSystem(): Promise<void> {
    console.warn('Resetting audio system due to stuck state');
    await this.stopAllAudio();
    this.pendingAudioRequests.clear();

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.warn('Error closing AudioContext:', error);
      }
    }
    this.audioContext = null;
    this.isAudioContextInitialized = false;
    this.clearCache();
    this.isAudioEnabled = true;
    console.log('Audio system reset complete');
  }

  public async createAndSetupAudio(word: string, voice: string | null, cacheKey: string): Promise<HTMLAudioElement & { _blobUrl?: string }> {
    const audioUrl = getAudioUrl(word, voice || undefined);

    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(blobUrl) as HTMLAudioElement & { _blobUrl?: string };

      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error: any) => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          URL.revokeObjectURL(blobUrl);
          reject(error);
        };

        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });

        audio.addEventListener('ended', () => {
          if (this.currentlyPlaying === audio) {
            this.currentlyPlaying = null;
          }
        });

        audio.addEventListener('pause', () => {
          if (this.currentlyPlaying === audio && audio.ended) {
            this.currentlyPlaying = null;
          }
        });
      });

      audio._blobUrl = blobUrl;
      this.audioCache[cacheKey] = audio;
      return audio;
    } catch (error) {
      console.warn(`Failed to fetch audio for: ${word}`, error);
      throw error;
    }
  }

  public async preloadAudio(word: string): Promise<boolean> {
    const voice = this.getSelectedVoice();
    try {
      const cacheKey = `${word}-${voice}`;
      if (!this.audioCache[cacheKey]) {
        await this.createAndSetupAudio(word, voice, cacheKey);
      }
      return true;
    } catch (error) {
      console.warn(`Failed to preload audio for: ${word}`, error);
      return false;
    }
  }

  public async preloadMultipleAudio(options: string[]): Promise<PromiseSettledResult<boolean>[]> {
    const promises = options.map(option => this.preloadAudio(option));
    return Promise.allSettled(promises);
  }

  public hasInCache(word: string): boolean {
    const voice = this.getSelectedVoice();
    const cacheKey = `${word}-${voice}`;
    return !!this.audioCache[cacheKey];
  }

  public getCache(): AudioCache {
    return this.audioCache;
  }

  public clearCache() {
    Object.values(this.audioCache).forEach(audio => {
      if (audio._blobUrl) {
        URL.revokeObjectURL(audio._blobUrl);
      }
    });
    this.audioCache = {};
  }

  public removeCachedAudio(word: string, voice: string) {
    const cacheKey = `${word}-${voice}`;
    const audio = this.audioCache[cacheKey];
    if (audio && audio._blobUrl) {
      URL.revokeObjectURL(audio._blobUrl);
    }
    delete this.audioCache[cacheKey];
  }
}

const audioManager = AudioManager.getInstance();

export default audioManager;