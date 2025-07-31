import {
  SessionStats,
  Word
} from '../Utilities/types';

// Types specific to word list management
type CorporaData = {
  [corpus: string]: {
    groups: {
      [group: string]: Word[];
    };
  };
};

type SelectedGroups = {
  [corpus: string]: string[];
};

// Word list state change callback - specific to this manager
type StateChangeCallback = (state: {
  allWords: Word[];
  currentCard: number;
  stats: SessionStats;
}) => void;

class WordListManager {
  private safeStorage: any;
  private settings: any;
  private allWords: Word[];
  private currentCard: number;
  private onStateChange: StateChangeCallback | null;
  private sessionStats: SessionStats;

  constructor(safeStorage: any, settings: any) {
    this.safeStorage = safeStorage;
    this.settings = settings;
    this.allWords = [];
    this.currentCard = 0;
    this.onStateChange = null;
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
  }

  setStateChangeCallback(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        allWords: this.allWords,
        currentCard: this.currentCard,
        stats: this.sessionStats
      });
    }
  }

  generateWordsList(selectedGroups: SelectedGroups, corporaData: CorporaData) {
    if (Object.keys(corporaData).length === 0) {
      this.allWords = [];
      this.currentCard = 0;
      this.notifyStateChange();
      return;
    }

    let words: Word[] = [];
    Object.entries(selectedGroups).forEach(([corpus, groups]) => {
      if (corporaData[corpus] && groups.length > 0) {
        groups.forEach(group => {
          if (corporaData[corpus].groups[group]) {
            // Words already have corpus and group fields from the API
            const groupWords = corporaData[corpus].groups[group];
            words.push(...groupWords);
          }
        });
      }
    });

    // Shuffle the cards using Fisher-Yates algorithm
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    this.allWords = words;
    this.currentCard = 0;
    this.notifyStateChange();
  }

  resetCards() {
    this.currentCard = 0;
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
    this.notifyStateChange();
  }

  nextCard() {
    if (this.allWords.length === 0) return;
    this.currentCard = (this.currentCard + 1) % this.allWords.length;
    this.notifyStateChange();
  }

  prevCard() {
    if (this.allWords.length === 0) return;
    this.currentCard = (this.currentCard - 1 + this.allWords.length) % this.allWords.length;
    this.notifyStateChange();
  }

  getCurrentWord(): Word | undefined {
    return this.allWords[this.currentCard];
  }

  getCurrentWordRequired(): Word {
    const word = this.allWords[this.currentCard];
    if (!word) {
      throw new Error('No current word available');
    }
    return word;
  }

  getTotalWords(): number {
    return this.allWords.length;
  }

  updateSessionStatsCorrect() {
    this.sessionStats.correct++;
    this.sessionStats.total++;
    this.notifyStateChange();
  }

  updateSessionStatsIncorrect() {
    this.sessionStats.incorrect++;
    this.sessionStats.total++;
    this.notifyStateChange();
  }

  updateSessionStats(isCorrect: boolean) {
    if (isCorrect) {
      this.updateSessionStatsCorrect();
    } else {
      this.updateSessionStatsIncorrect();
    }
  }

  getSessionStats(): SessionStats {
    return { ...this.sessionStats };
  }

  resetSessionStats() {
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
    this.notifyStateChange();
  }
}

export default WordListManager;