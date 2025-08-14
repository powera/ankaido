// Journey Mode Manager - Global access to Journey Mode state
import { Word } from '../Utilities/types';

type JourneyStateListener = (manager: JourneyModeManager) => void;

export class JourneyModeManager {
  private consecutiveNewWordPrevention: number = 0;
  private motivationalBreakPrevention: number = 0;
  private newWordsIntroducedThisSession: Word[] = [];
  private manuallyAddedWords: Word[] = []; // Priority queue for manually added words
  private listeners: JourneyStateListener[] = [];

  constructor() {
    this.resetState();
  }

  private resetState(): void {
    this.consecutiveNewWordPrevention = 0;
    this.motivationalBreakPrevention = 0;
    this.newWordsIntroducedThisSession = [];
    this.manuallyAddedWords = [];
  }

  // New word introduction state methods
  shouldBlockNewWords(): boolean {
    return this.consecutiveNewWordPrevention > 0;
  }

  shouldBlockMotivationalBreaks(): boolean {
    return this.motivationalBreakPrevention > 0;
  }

  recordNewWordIntroduced(word: Word): void {
    this.consecutiveNewWordPrevention = 2;
    this.newWordsIntroducedThisSession.push(word);
    this.notifyListeners();
  }

  recordMotivationalBreak(): void {
    this.motivationalBreakPrevention = 5;
    this.notifyListeners();
  }

  getAndRemoveOldestNewWord(): Word | null {
    if (this.newWordsIntroducedThisSession.length === 0) {
      return null;
    }
    const word = this.newWordsIntroducedThisSession.shift() ?? null;
    if (word) {
      this.notifyListeners();
    }
    return word;
  }

  hasNewWordsFromSession(): boolean {
    return this.newWordsIntroducedThisSession.length > 0;
  }

  // Methods for manually added words priority queue
  addWordToQueue(word: Word): boolean {
    // Check if queue is at capacity
    if (this.manuallyAddedWords.length >= 10) {
      return false;
    }
    
    // Check if word is already in queue
    const isAlreadyInQueue = this.manuallyAddedWords.some(queuedWord => 
      (queuedWord.term || queuedWord.lithuanian) === (word.term || word.lithuanian) && 
      (queuedWord.definition || queuedWord.english) === (word.definition || word.english)
    );
    
    if (isAlreadyInQueue) {
      return false;
    }
    
    // Add to front of queue (highest priority)
    this.manuallyAddedWords.unshift(word);
    this.notifyListeners();
    return true;
  }

  getNextManuallyAddedWord(): Word | null {
    if (this.manuallyAddedWords.length === 0) {
      return null;
    }
    const word = this.manuallyAddedWords.shift() ?? null;
    if (word) {
      this.notifyListeners();
    }
    return word;
  }

  hasManuallyAddedWords(): boolean {
    return this.manuallyAddedWords.length > 0;
  }

  isWordInQueue(word: Word): boolean {
    return this.manuallyAddedWords.some(queuedWord => 
      (queuedWord.term || queuedWord.lithuanian) === (word.term || word.lithuanian) && 
      (queuedWord.definition || queuedWord.english) === (word.definition || word.english)
    );
  }

  getQueueSize(): number {
    return this.manuallyAddedWords.length;
  }

  isQueueFull(): boolean {
    return this.manuallyAddedWords.length >= 10;
  }

  updateAfterActivity(): void {
    if (this.consecutiveNewWordPrevention > 0) {
      this.consecutiveNewWordPrevention--;
    }
    if (this.motivationalBreakPrevention > 0) {
      this.motivationalBreakPrevention--;
    }
    this.notifyListeners();
  }

  // Check if the last activity was a new word introduction
  wasLastActivityNewWord(): boolean {
    return this.shouldBlockNewWords();
  }

  // Listener management
  addListener(callback: JourneyStateListener): void {
    this.listeners.push(callback);
  }

  removeListener(callback: JourneyStateListener): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this));
  }
}

// Export for compatibility with activitySelection.ts
export class JourneyModeState extends JourneyModeManager {}

export const createJourneyModeState = (): JourneyModeState => {
  return new JourneyModeState();
};

// Create a singleton instance
const journeyModeManager = new JourneyModeManager();

export default journeyModeManager;