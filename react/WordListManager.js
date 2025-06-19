
class WordListManager {
  constructor(safeStorage, settings) {
    this.safeStorage = safeStorage;
    this.settings = settings;
    this.allWords = [];
    this.currentCard = 0;
    this.showAnswer = false;
    this.selectedAnswer = null;
    this.typedAnswer = '';
    this.typingFeedback = '';
    this.multipleChoiceOptions = [];
    this.stats = { correct: 0, incorrect: 0, total: 0 };
    this.journeyStats = {}; // Add journeyStats property
    this.autoAdvanceTimer = null;
    this.onStateChange = null; // Callback for state updates
  }

  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        allWords: this.allWords,
        currentCard: this.currentCard,
        showAnswer: this.showAnswer,
        selectedAnswer: this.selectedAnswer,
        typedAnswer: this.typedAnswer,
        typingFeedback: this.typingFeedback,
        multipleChoiceOptions: this.multipleChoiceOptions,
        stats: this.stats,
        journeyStats: this.journeyStats, // Include journeyStats in the state update
        autoAdvanceTimer: this.autoAdvanceTimer
      });
    }
  }

  generateWordsList(selectedGroups, corporaData) {
    if (Object.keys(corporaData).length === 0) {
      this.allWords = [];
      this.currentCard = 0;
      this.showAnswer = false;
      this.selectedAnswer = null;
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
    this.showAnswer = false;
    this.selectedAnswer = null;
    this.notifyStateChange();
  }

  generateMultipleChoiceOptions(studyMode, quizMode) {
    const currentWord = this.allWords[this.currentCard];
    if (!currentWord) return;

    // For listening mode, determine correct answer based on listening mode type
    let correctAnswer;
    if (quizMode === 'listening') {
      // In listening mode: LT->LT shows Lithuanian options, LT->EN shows English options
      if (studyMode === 'lithuanian-to-lithuanian') {
        correctAnswer = currentWord.lithuanian;
      } else {
        correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
      }
    } else {
      // Regular multiple choice mode
      correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    }

    // Determine number of options based on difficulty
    const numOptions = this.settings.difficulty === 'easy' ? 4 : this.settings.difficulty === 'medium' ? 6 : 8;
    const numWrongAnswers = numOptions - 1;

    // Determine which field to use for filtering and generating wrong answers
    let answerField;
    if (quizMode === 'listening') {
      if (studyMode === 'lithuanian-to-lithuanian') {
        answerField = 'lithuanian';
      } else {
        answerField = studyMode === 'lithuanian-to-english' ? 'english' : 'lithuanian';
      }
    } else {
      answerField = studyMode === 'english-to-lithuanian' ? 'lithuanian' : 'english';
    }

    const sameCorpusWords = this.allWords.filter(word => 
      word.corpus === currentWord.corpus && 
      word[answerField] !== correctAnswer
    );
    const wrongAnswersSet = new Set();
    const wrongAnswers = [];
    
    // Gather wrong answers from same corpus - shuffle first to get random decoys
    const shuffledSameCorpusWords = [...sameCorpusWords].sort(() => Math.random() - 0.5);
    for (const word of shuffledSameCorpusWords) {
      const answer = word[answerField];
      if (answer !== correctAnswer && !wrongAnswersSet.has(answer)) {
        wrongAnswersSet.add(answer);
        wrongAnswers.push(answer);
        if (wrongAnswers.length >= numWrongAnswers) break;
      }
    }
    
    // Pad with any other words if needed
    if (wrongAnswers.length < numWrongAnswers) {
      const fallbackWords = this.allWords
        .map(w => w[answerField])
        .filter(ans => ans !== correctAnswer && !wrongAnswersSet.has(ans))
        .sort(() => Math.random() - 0.5); // Shuffle fallback words too
      while (wrongAnswers.length < numWrongAnswers && fallbackWords.length > 0) {
        const randIdx = Math.floor(Math.random() * fallbackWords.length);
        const fallback = fallbackWords.splice(randIdx, 1)[0];
        wrongAnswers.push(fallback);
      }
    }

    let options = [correctAnswer, ...wrongAnswers];

    // Sort alphabetically for medium and hard difficulty, otherwise shuffle
    if (this.settings.difficulty === 'medium' || this.settings.difficulty === 'hard') {
      options = options.sort();
      // Rearrange to fill columns first (left column, then right column)
      const rearranged = [];
      const half = Math.ceil(options.length / 2);
      for (let i = 0; i < half; i++) {
        rearranged.push(options[i]);
        if (i + half < options.length) {
          rearranged.push(options[i + half]);
        }
      }
      options = rearranged;
    } else {
      options = options.sort(() => Math.random() - 0.5);
    }

    this.multipleChoiceOptions = options;
    this.notifyStateChange();
  }

  resetCards() {
    this.currentCard = 0;
    this.showAnswer = false;
    this.stats = { correct: 0, incorrect: 0, total: 0 };
    this.selectedAnswer = null;
    this.typedAnswer = '';
    this.typingFeedback = '';
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.notifyStateChange();
  }

  nextCard() {
    // Cancel any existing auto-advance timer
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.currentCard = (this.currentCard + 1) % this.allWords.length;
    this.showAnswer = false;
    this.selectedAnswer = null;
    this.typedAnswer = '';
    this.typingFeedback = '';
    this.notifyStateChange();
  }

  prevCard() {
    // Cancel any existing auto-advance timer
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.currentCard = (this.currentCard - 1 + this.allWords.length) % this.allWords.length;
    this.showAnswer = false;
    this.selectedAnswer = null;
    this.typedAnswer = '';
    this.typingFeedback = '';
    this.notifyStateChange();
  }

  // Methods to update stats only (for typing mode)
  updateStatsCorrect() {
    this.stats = { ...this.stats, correct: this.stats.correct + 1, total: this.stats.total + 1 };
    this.notifyStateChange();
  }

  updateStatsIncorrect() {
    this.stats = { ...this.stats, incorrect: this.stats.incorrect + 1, total: this.stats.total + 1 };
    this.notifyStateChange();
  }

  markCorrect(autoAdvance, defaultDelay) {
    this.stats = { ...this.stats, correct: this.stats.correct + 1, total: this.stats.total + 1 };
    if (autoAdvance) {
      const timerId = setTimeout(() => {
        this.currentCard = (this.currentCard + 1) % this.allWords.length;
        this.showAnswer = false;
        this.selectedAnswer = null;
        this.autoAdvanceTimer = null;
        this.notifyStateChange();
      }, defaultDelay * 1000);
      this.autoAdvanceTimer = timerId;
    } else {
      this.currentCard = (this.currentCard + 1) % this.allWords.length;
      this.showAnswer = false;
      this.selectedAnswer = null;
    }
    this.notifyStateChange();
  }

  markIncorrect(autoAdvance, defaultDelay) {
    this.stats = { ...this.stats, incorrect: this.stats.incorrect + 1, total: this.stats.total + 1 };
    if (autoAdvance) {
      const timerId = setTimeout(() => {
        this.currentCard = (this.currentCard + 1) % this.allWords.length;
        this.showAnswer = false;
        this.selectedAnswer = null;
        this.autoAdvanceTimer = null;
        this.notifyStateChange();
      }, defaultDelay * 1000);
      this.autoAdvanceTimer = timerId;
    } else {
      this.currentCard = (this.currentCard + 1) % this.allWords.length;
      this.showAnswer = false;
      this.selectedAnswer = null;
    }
    this.notifyStateChange();
  }

  handleMultipleChoiceAnswer(selectedOption, studyMode, quizMode, autoAdvance, defaultDelay) {
    const currentWord = this.allWords[this.currentCard];
    let correctAnswer;
    if (quizMode === 'listening') {
      // In listening mode: LT->EN shows English options, LT->LT shows Lithuanian options
      if (studyMode === 'lithuanian-to-lithuanian') {
        correctAnswer = currentWord.lithuanian;
      } else {
        correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
      }
    } else {
      // Regular multiple choice mode
      correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    }
    
    this.selectedAnswer = selectedOption;
    this.showAnswer = true;
    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
      this.stats = { ...this.stats, correct: this.stats.correct + 1, total: this.stats.total + 1 };
    } else {
      this.stats = { ...this.stats, incorrect: this.stats.incorrect + 1, total: this.stats.total + 1 };
    }

    if (autoAdvance) {
      const timerId = setTimeout(() => {
        this.currentCard = (this.currentCard + 1) % this.allWords.length;
        this.showAnswer = false;
        this.selectedAnswer = null;
        this.autoAdvanceTimer = null;
        this.notifyStateChange();
      }, defaultDelay * 1000);
      this.autoAdvanceTimer = timerId;
    }
    this.notifyStateChange();
  }

  setShowAnswer(value) {
    this.showAnswer = value;
    this.notifyStateChange();
  }

  setTypedAnswer(value) {
    this.typedAnswer = value;
    this.notifyStateChange();
  }

  setTypingFeedback(value) {
    this.typingFeedback = value;
    this.notifyStateChange();
  }

  setAutoAdvanceTimer(timer) {
    this.autoAdvanceTimer = timer;
    this.notifyStateChange();
  }

  getCurrentWord() {
    return this.allWords[this.currentCard];
  }

  getTotalWords() {
    return this.allWords.length;
  }
}

export default WordListManager;
