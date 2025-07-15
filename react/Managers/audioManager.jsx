
import safeStorage from '../DataStorage/safeStorage';

// Audio client utility function
const API_BASE = '/api/lithuanian';

const getAudioUrl = (word, voice) => {
  return `${API_BASE}/audio/${encodeURIComponent(word)}${voice ? `?voice=${encodeURIComponent(voice)}` : ''}`;
};

class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    
    // Audio management properties (from LithuanianAudioManager)
    this.audioCache = {};
    this.audioContext = null;
    this.isAudioEnabled = true;
    this.currentlyPlaying = null;
    this.isAudioContextInitialized = false;
    this.pendingAudioRequests = new Set();
    this.playbackQueue = [];
    this.isProcessingQueue = false;
    this.lastAudioActivity = Date.now();
    
    // Voice management properties
    this.availableVoices = [];
    this.isInitialized = false;
    
    // Add page visibility handling
    this.setupPageVisibilityHandling();
    
    AudioManager.instance = this;
  }

  setupPageVisibilityHandling() {
    // Handle page visibility changes to reset audio context when coming back from background
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Page became visible - reset audio context state and clear any stuck queue
          this.handlePageBecameVisible();
        }
      });
      
      // Also handle window focus events as a backup
      window.addEventListener('focus', () => {
        this.handlePageBecameVisible();
      });
    }
  }

  async handlePageBecameVisible() {
    // Reset audio context state - it might have been suspended
    this.isAudioContextInitialized = false;
    
    // Clear any stuck processing state
    if (this.isProcessingQueue && this.playbackQueue.length === 0) {
      console.warn('Clearing stuck audio queue processing state');
      this.isProcessingQueue = false;
    }
    
    // Re-enable audio if it was disabled due to errors
    this.isAudioEnabled = true;
    
  }

  async initialize(voices) {
    this.availableVoices = voices || [];
    this.isInitialized = true;
    return this;
  }

  setAvailableVoices(voices) {
    this.availableVoices = voices;
  }

  getAvailableVoices() {
    return this.availableVoices;
  }

  getSelectedVoice() {
    const selectedVoice = safeStorage?.getItem('flashcard-selected-voice') || 'random';
    
    if (selectedVoice === 'random') {
      if (this.availableVoices.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * this.availableVoices.length);
      return this.availableVoices[randomIndex];
    }
    
    return selectedVoice;
  }

  async initializeAudioContext() {
    // Always check the current state, don't rely on cached flags
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
        this.isAudioContextInitialized = false;
        return false;
      }
    }

    // Handle suspended state with retry logic
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        
        // Wait a bit and check if it actually resumed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.audioContext.state === 'suspended') {
          console.warn('AudioContext still suspended after resume attempt');
          // Try creating a new context as a last resort
          try {
            this.audioContext.close();
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

  async playAudio(word, onlyCached = false, sequential = false) {
    const voice = this.getSelectedVoice();
    const audioEnabled = true; // Audio is enabled by default in activities
    
    if (!audioEnabled || !this.isAudioEnabled) return;

    // Check if audio system might be stuck (no activity for 30 seconds while processing)
    const now = Date.now();
    if (this.isProcessingQueue && (now - this.lastAudioActivity) > 30000) {
      console.warn('Audio system appears stuck, resetting...');
      await this.resetAudioSystem();
    }

    this.lastAudioActivity = now;
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
        reject,
        timestamp: now
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
        try {
          this.lastAudioActivity = Date.now();
          await this.playAudioInternal(request);
        } catch (error) {
          console.warn('Error processing audio request, continuing with queue:', error);
          // Reject the specific request but continue processing the queue
          if (request.reject) {
            request.reject(error);
          }
        }
      }
    } catch (error) {
      console.error('Critical error in audio queue processing:', error);
      // Clear the queue and reject all pending requests
      while (this.playbackQueue.length > 0) {
        const request = this.playbackQueue.shift();
        if (request.reject) {
          request.reject(error);
        }
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
      if (!this.isAudioContextInitialized) {
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

  // Stop all audio playback and clear the queue
  async stopAllAudio() {
    // Clear the playback queue
    this.playbackQueue = [];
    // Stop currently playing audio
    await this.stopCurrentAudio();
    // Reset processing state
    this.isProcessingQueue = false;
  }

  // Force reset the entire audio system - use when audio gets completely stuck
  async resetAudioSystem() {
    console.warn('Resetting audio system due to stuck state');
    
    // Stop all current audio
    await this.stopAllAudio();
    
    // Clear all pending requests
    this.pendingAudioRequests.clear();
    
    // Reset audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing AudioContext:', error);
      }
    }
    this.audioContext = null;
    this.isAudioContextInitialized = false;
    
    // Clear and cleanup audio cache
    this.clearCache();
    
    // Re-enable audio
    this.isAudioEnabled = true;
    
    console.log('Audio system reset complete');
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

  async preloadAudio(word) {
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

  async preloadMultipleAudio(options) {
    const voice = this.getSelectedVoice();
    const promises = options.map(option => this.preloadAudio(option, voice));
    return Promise.allSettled(promises);
  }

  hasInCache(word) {
    const voice = this.getSelectedVoice();
    const cacheKey = `${word}-${voice}`;
    return !!this.audioCache[cacheKey];
  }

  getCache() {
    return this.audioCache;
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

// Create singleton instance
const audioManager = new AudioManager();

export default audioManager;
