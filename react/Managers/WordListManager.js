class WordListManager {
  constructor(safeStorage, settings) {
    this.safeStorage = safeStorage;
    this.settings = settings;
    this.allWords = [];
    this.currentCard = 0;
    this.onStateChange = null; // Callback for state updates
    // Per-session stats (separate from persistent journey stats)
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
  }

  setStateChangeCallback(callback) {
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

  generateWordsList(selectedGroups, corporaData) {
    if (Object.keys(corporaData).length === 0) {
      this.allWords = [];
      this.currentCard = 0;
      this.notifyStateChange();
      return;
    }

    let words = [];
    Object.entries(selectedGroups).forEach(([corpus, groups]) => {
      if (corporaData[corpus] && groups.length > 0) {
        groups.forEach(group => {
          if (corporaData[corpus].groups[group]) {
            const groupWords = corporaData[corpus].groups[group].map(word => ({
              ...word,
              corpus,
              group
            }));
            words.push(...groupWords);
          }
        });
      }
    });

    // Always shuffle the cards using Fisher-Yates algorithm for better randomness
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
    // Reset session stats when resetting cards
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
    this.notifyStateChange();
  }

  nextCard() {
    this.currentCard = (this.currentCard + 1) % this.allWords.length;
    this.notifyStateChange();
  }

  prevCard() {
    this.currentCard = (this.currentCard - 1 + this.allWords.length) % this.allWords.length;
    this.notifyStateChange();
  }

  getCurrentWord() {
    return this.allWords[this.currentCard];
  }

  getTotalWords() {
    return this.allWords.length;
  }

  // Session stats methods (separate from persistent journey stats)
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

  getSessionStats() {
    return { ...this.sessionStats };
  }

  resetSessionStats() {
    this.sessionStats = { correct: 0, incorrect: 0, total: 0 };
    this.notifyStateChange();
  }
}

export default WordListManager;