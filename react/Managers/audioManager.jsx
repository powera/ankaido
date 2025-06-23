
import safeStorage from '../DataStorage/safeStorage';

// Get the AudioManager class from lithuanianApi
const { AudioManager: LithuanianAudioManager } = window.lithuanianApi;

class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    
    this.lithuanianAudioManager = new LithuanianAudioManager();
    this.availableVoices = [];
    this.isInitialized = false;
    
    AudioManager.instance = this;
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

  async playAudio(word, onlyCached = false) {
    const voice = this.getSelectedVoice();
    const audioEnabled = true; // Audio is enabled by default in activities
    
    return await this.lithuanianAudioManager.playAudio(word, voice, audioEnabled, onlyCached);
  }

  async preloadAudio(word) {
    const voice = this.getSelectedVoice();
    return await this.lithuanianAudioManager.preloadAudio(word, voice);
  }

  async preloadMultipleAudio(options) {
    const voice = this.getSelectedVoice();
    return await this.lithuanianAudioManager.preloadMultipleAudio(options, voice);
  }

  hasInCache(word) {
    const voice = this.getSelectedVoice();
    return this.lithuanianAudioManager.hasInCache(word, voice);
  }

  getCache() {
    return this.lithuanianAudioManager.getCache();
  }
}

// Create singleton instance
const audioManager = new AudioManager();

export default audioManager;
