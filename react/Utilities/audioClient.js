
// audioClient.js - Audio client for Lithuanian audio features
const API_BASE = '/api/lithuanian';

export const getAudioUrl = (word, voice) => {
  return `${API_BASE}/audio/${encodeURIComponent(word)}${voice ? `?voice=${encodeURIComponent(voice)}` : ''}`;
};

export class AudioManager {
  constructor() {
    this.audioCache = {};
    this.audioContext = null;
    this.isAudioEnabled = true;
    this.currentlyPlaying = null;
  }

  async initializeAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
        return false;
      }
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
        return false;
      }
    }

    return this.audioContext.state === 'running';
  }

  async playAudio(word, voice, audioEnabled = true, onlyCached = false) {
    if (!audioEnabled) return;

    // If audio is currently playing, ignore this request
    if (this.currentlyPlaying && !this.currentlyPlaying.ended) {
      return;
    }

    try {
      // Initialize audio context if needed
      await this.initializeAudioContext();

      const cacheKey = `${word}-${voice}`;

      if (this.audioCache[cacheKey]) {
        const audio = this.audioCache[cacheKey];
        // Reset audio to beginning in case it was played before
        audio.currentTime = 0;
        this.currentlyPlaying = audio;
        await audio.play();
        return;
      }

      // If onlyCached is true, don't fetch new audio
      if (onlyCached) {
        return;
      }

      const audioUrl = getAudioUrl(word, voice);
      const audio = new Audio(audioUrl);

      // Wait for audio to be ready before caching and playing
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });

      this.audioCache[cacheKey] = audio;
      this.currentlyPlaying = audio;
      await audio.play();
    } catch (error) {
      console.warn(`Failed to play audio for: ${word}`, error);

      // Handle specific error types
      if (error.name === 'NotAllowedError') {
        console.warn('Audio playback blocked by browser policy. User interaction may be required.');
        this.isAudioEnabled = false;
        // Temporarily disable audio to prevent repeated errors
        setTimeout(() => {
          this.isAudioEnabled = true;
        }, 5000);
      }
    }
  }

  async preloadAudio(word, voice) {
    try {
      const cacheKey = `${word}-${voice}`;
      if (!this.audioCache[cacheKey]) {
        const audioUrl = getAudioUrl(word, voice);
        const audio = new Audio(audioUrl);
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });
        this.audioCache[cacheKey] = audio;
      }
      return true;
    } catch (error) {
      console.warn(`Failed to preload audio for: ${word}`, error);
      return false;
    }
  }

  async preloadMultipleAudio(options, voice) {
    const promises = options.map(option => this.preloadAudio(option, voice));
    return Promise.allSettled(promises);
  }

  getCache() {
    return this.audioCache;
  }

  hasInCache(word, voice) {
    const cacheKey = `${word}-${voice}`;
    return !!this.audioCache[cacheKey];
  }
}
