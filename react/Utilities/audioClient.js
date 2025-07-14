
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
    this.isInitialized = false;
    this.pendingAudioRequests = new Set();
    this.playbackQueue = [];
    this.isProcessingQueue = false;
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

    this.isInitialized = this.audioContext.state === 'running';
    return this.isInitialized;
  }

  async playAudio(word, voice, audioEnabled = true, onlyCached = false, sequential = false) {
    if (!audioEnabled || !this.isAudioEnabled) return;

    const cacheKey = `${word}-${voice}`;
    
    // Add to queue instead of playing immediately to prevent race conditions
    return new Promise((resolve, reject) => {
      this.playbackQueue.push({
        word,
        voice,
        cacheKey,
        onlyCached,
        sequential,
        resolve,
        reject
      });
      
      this.processPlaybackQueue();
    });
  }

  async processPlaybackQueue() {
    if (this.isProcessingQueue || this.playbackQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process all requests in order for sequential playback
      while (this.playbackQueue.length > 0) {
        const request = this.playbackQueue.shift(); // Take first request (FIFO)
        await this.playAudioInternal(request);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async playAudioInternal({ word, voice, cacheKey, onlyCached, sequential, resolve, reject }) {
    try {
      // Prevent duplicate simultaneous requests
      if (this.pendingAudioRequests.has(cacheKey)) {
        resolve();
        return;
      }

      // Gracefully stop any currently playing audio (unless this is sequential playback)
      if (!sequential) {
        await this.stopCurrentAudio();
      }

      this.pendingAudioRequests.add(cacheKey);

      // Initialize audio context if needed
      if (!this.isInitialized) {
        await this.initializeAudioContext();
      }

      let audio;
      
      if (this.audioCache[cacheKey]) {
        audio = this.audioCache[cacheKey];
        // Ensure audio is ready to play from the beginning
        if (audio.currentTime > 0) {
          audio.currentTime = 0;
        }
        // Wait a bit to ensure the audio is properly reset
        await new Promise(resolve => setTimeout(resolve, 10));
      } else {
        // If onlyCached is true, don't fetch new audio
        if (onlyCached) {
          resolve();
          return;
        }

        audio = await this.createAndSetupAudio(word, voice, cacheKey);
      }

      this.currentlyPlaying = audio;
      
      // Wait for audio to complete playing
      await new Promise((playResolve, playReject) => {
        const onEnded = () => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          playResolve();
        };
        
        const onError = (error) => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          playReject(error);
        };
        
        audio.addEventListener('ended', onEnded, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        audio.play().catch(playReject);
      });
      
      resolve();
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
      reject(error);
    } finally {
      this.pendingAudioRequests.delete(cacheKey);
    }
  }

  async stopCurrentAudio() {
    if (this.currentlyPlaying && !this.currentlyPlaying.ended && !this.currentlyPlaying.paused) {
      return new Promise((resolve) => {
        const audio = this.currentlyPlaying;
        
        // Set up event listener for when audio actually stops
        const onPause = () => {
          audio.removeEventListener('pause', onPause);
          resolve();
        };
        
        audio.addEventListener('pause', onPause, { once: true });
        
        // Fade out audio to prevent abrupt cutoff
        if (audio.volume > 0) {
          const fadeOut = setInterval(() => {
            if (audio.volume > 0.1) {
              audio.volume = Math.max(0, audio.volume - 0.1);
            } else {
              clearInterval(fadeOut);
              audio.volume = 1; // Reset volume for next play
              audio.pause();
              audio.currentTime = 0;
            }
          }, 20);
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
        
        // Fallback timeout in case pause event doesn't fire
        setTimeout(resolve, 200);
      });
    }
  }

  async createAndSetupAudio(word, voice, cacheKey) {
    const audioUrl = getAudioUrl(word, voice);
    
    // Use fetch to load audio data in a single request, then create blob URL
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(blobUrl);
      
      // Set up event listeners
      await new Promise((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (error) => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          // Clean up blob URL on error
          URL.revokeObjectURL(blobUrl);
          reject(error);
        };

        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        // Add ended event listener to clear currentlyPlaying and clean up blob URL
        audio.addEventListener('ended', () => {
          if (this.currentlyPlaying === audio) {
            this.currentlyPlaying = null;
          }
        });

        // Add pause event listener to clear currentlyPlaying
        audio.addEventListener('pause', () => {
          if (this.currentlyPlaying === audio && audio.ended) {
            this.currentlyPlaying = null;
          }
        });
      });
      
      // Store blob URL for cleanup later
      audio._blobUrl = blobUrl;
      
      this.audioCache[cacheKey] = audio;
      return audio;
    } catch (error) {
      console.warn(`Failed to fetch audio for: ${word}`, error);
      throw error;
    }
  }

  async preloadAudio(word, voice) {
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

  // Clean up blob URLs to prevent memory leaks
  clearCache() {
    Object.values(this.audioCache).forEach(audio => {
      if (audio._blobUrl) {
        URL.revokeObjectURL(audio._blobUrl);
      }
    });
    this.audioCache = {};
  }

  // Clean up a specific cached audio
  removeCachedAudio(word, voice) {
    const cacheKey = `${word}-${voice}`;
    const audio = this.audioCache[cacheKey];
    if (audio && audio._blobUrl) {
      URL.revokeObjectURL(audio._blobUrl);
    }
    delete this.audioCache[cacheKey];
  }
}
