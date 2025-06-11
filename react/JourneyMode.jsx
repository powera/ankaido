
import FlashCardMode from './FlashCardMode';
import MultipleChoiceMode from './MultipleChoiceMode';
import ListeningMode from './ListeningMode';
import AudioButton from './AudioButton';

const JourneyMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer,
  nextCard,
  autoAdvance,
  defaultDelay,
  safeStorage
}) => {
  const [currentJourneyMode, setCurrentJourneyMode] = React.useState('new-word');
  const [journeyWord, setJourneyWord] = React.useState(null);
  const [showNewWordIndicator, setShowNewWordIndicator] = React.useState(false);
  const [journeyStats, setJourneyStats] = React.useState({});
  const [dbInitialized, setDbInitialized] = React.useState(false);

  // IndexedDB setup
  const initIndexedDB = React.useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to localStorage');
        resolve(null);
        return;
      }

      const request = indexedDB.open('JourneyModeDB', 1);
      
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        resolve(null);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('wordStats')) {
          db.createObjectStore('wordStats', { keyPath: 'wordKey' });
        }
      };
    });
  }, []);

  // Load journey data from IndexedDB or localStorage fallback
  const loadJourneyStats = React.useCallback(async () => {
    const db = await initIndexedDB();
    
    if (db) {
      try {
        const transaction = db.transaction(['wordStats'], 'readonly');
        const store = transaction.objectStore('wordStats');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const stats = {};
          request.result.forEach(item => {
            stats[item.wordKey] = item.stats;
          });
          setJourneyStats(stats);
          setDbInitialized(true);
        };
        
        request.onerror = () => {
          console.error('Error loading from IndexedDB, falling back to localStorage');
          loadFromLocalStorage();
        };
      } catch (error) {
        console.error('IndexedDB error:', error);
        loadFromLocalStorage();
      }
    } else {
      loadFromLocalStorage();
    }
  }, [safeStorage]);

  const loadFromLocalStorage = React.useCallback(() => {
    const savedStats = safeStorage?.getItem('journey-stats');
    try {
      setJourneyStats(savedStats ? JSON.parse(savedStats) : {});
      setDbInitialized(true);
    } catch (error) {
      console.error('Error parsing journey stats:', error);
      setJourneyStats({});
      setDbInitialized(true);
    }
  }, [safeStorage]);

  // Save journey stats to IndexedDB or localStorage fallback
  const saveJourneyStats = React.useCallback(async (stats) => {
    setJourneyStats(stats);
    
    const db = await initIndexedDB();
    
    if (db) {
      try {
        const transaction = db.transaction(['wordStats'], 'readwrite');
        const store = transaction.objectStore('wordStats');
        
        // Clear existing data and save new stats
        store.clear();
        Object.entries(stats).forEach(([wordKey, wordStats]) => {
          store.add({ wordKey, stats: wordStats });
        });
        
        transaction.oncomplete = () => {
          console.log('Journey stats saved to IndexedDB');
        };
        
        transaction.onerror = () => {
          console.error('Error saving to IndexedDB, falling back to localStorage');
          safeStorage?.setItem('journey-stats', JSON.stringify(stats));
        };
      } catch (error) {
        console.error('IndexedDB error:', error);
        safeStorage?.setItem('journey-stats', JSON.stringify(stats));
      }
    } else {
      safeStorage?.setItem('journey-stats', JSON.stringify(stats));
    }
  }, [safeStorage, initIndexedDB]);

  // Initialize data loading
  React.useEffect(() => {
    loadJourneyStats();
  }, [loadJourneyStats]);

  // Get word stats for a specific word
  const getWordStats = React.useCallback((word) => {
    const wordKey = `${word.lithuanian}-${word.english}`;
    return journeyStats[wordKey] || {
      exposed: false,
      multipleChoice: { correct: 0, incorrect: 0 },
      listening: { correct: 0, incorrect: 0 },
      typing: { correct: 0, incorrect: 0 },
      lastSeen: null
    };
  }, [journeyStats]);

  // Mark word as exposed
  const markWordExposed = React.useCallback((word) => {
    const wordKey = `${word.lithuanian}-${word.english}`;
    const newStats = { ...journeyStats };
    if (!newStats[wordKey]) {
      newStats[wordKey] = {
        exposed: false,
        multipleChoice: { correct: 0, incorrect: 0 },
        listening: { correct: 0, incorrect: 0 },
        typing: { correct: 0, incorrect: 0 },
        lastSeen: null
      };
    }
    newStats[wordKey].exposed = true;
    newStats[wordKey].lastSeen = Date.now();
    saveJourneyStats(newStats);
  }, [journeyStats, saveJourneyStats]);

  // Update stats for a specific mode and result
  const updateWordStats = React.useCallback((word, mode, isCorrect) => {
    const wordKey = `${word.lithuanian}-${word.english}`;
    const newStats = { ...journeyStats };
    if (!newStats[wordKey]) {
      newStats[wordKey] = {
        exposed: true,
        multipleChoice: { correct: 0, incorrect: 0 },
        listening: { correct: 0, incorrect: 0 },
        typing: { correct: 0, incorrect: 0 },
        lastSeen: null
      };
    }
    
    if (isCorrect) {
      newStats[wordKey][mode].correct++;
    } else {
      newStats[wordKey][mode].incorrect++;
    }
    newStats[wordKey].lastSeen = Date.now();
    saveJourneyStats(newStats);
  }, [journeyStats, saveJourneyStats]);

  // Get exposed words from all available words
  const getExposedWords = React.useCallback(() => {
    return wordListState.allWords.filter(word => {
      const stats = getWordStats(word);
      return stats.exposed;
    });
  }, [wordListState.allWords, getWordStats]);

  // Get new (unexposed) words
  const getNewWords = React.useCallback(() => {
    return wordListState.allWords.filter(word => {
      const stats = getWordStats(word);
      return !stats.exposed;
    });
  }, [wordListState.allWords, getWordStats]);

  // Algorithm to choose next journey mode and word
  const chooseNextJourneyActivity = React.useCallback(() => {
    const exposedWords = getExposedWords();
    const newWords = getNewWords();
    
    // If no words available, use current word
    if (wordListState.allWords.length === 0) {
      return { mode: 'new-word', word: wordListManager.getCurrentWord() };
    }

    // If fewer than 10 known words, always show new word
    if (exposedWords.length < 10 && newWords.length > 0) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      return { mode: 'new-word', word: randomNewWord };
    }

    const random = Math.random() * 100;
    
    if (random < 20 && newWords.length > 0) {
      // 20% chance - new word (flash card style)
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      return { mode: 'new-word', word: randomNewWord };
    } else if (random < 50 && exposedWords.length > 0) {
      // 30% chance - multiple choice for exposed word
      const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
      return { mode: 'multiple-choice', word: randomExposedWord };
    } else if (random < 80 && exposedWords.length > 0) {
      // 30% chance - listening for exposed word
      const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
      return { mode: 'listening', word: randomExposedWord };
    } else if (random < 97 && exposedWords.length > 0) {
      // 17% chance - typing for exposed word
      const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
      return { mode: 'typing', word: randomExposedWord };
    } else {
      // 3% chance - review grammar break
      return { mode: 'grammar-break', word: null };
    }
  }, [getExposedWords, getNewWords, wordListState.allWords, wordListManager]);

  // Initialize journey activity
  React.useEffect(() => {
    if (wordListState.allWords.length > 0 && dbInitialized) {
      const activity = chooseNextJourneyActivity();
      setCurrentJourneyMode(activity.mode);
      setJourneyWord(activity.word);
      setShowNewWordIndicator(activity.mode === 'new-word');
      
      // If it's a new word, mark it as exposed
      if (activity.mode === 'new-word' && activity.word) {
        markWordExposed(activity.word);
      }
    }
  }, [wordListState.allWords, dbInitialized, chooseNextJourneyActivity, markWordExposed]);

  // Handle journey-specific multiple choice answers
  const handleJourneyMultipleChoice = React.useCallback((selectedOption) => {
    if (!journeyWord) return;
    
    const currentWord = journeyWord;
    let correctAnswer;
    if (currentJourneyMode === 'listening') {
      correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
    } else {
      correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    }
    
    const isCorrect = selectedOption === correctAnswer;
    
    // Update journey stats
    const modeKey = currentJourneyMode === 'listening' ? 'listening' : 'multipleChoice';
    updateWordStats(currentWord, modeKey, isCorrect);
    
    // Call the original handler for UI updates
    handleMultipleChoiceAnswer(selectedOption);
    
    // Schedule next activity
    if (autoAdvance) {
      setTimeout(() => {
        const nextActivity = chooseNextJourneyActivity();
        setCurrentJourneyMode(nextActivity.mode);
        setJourneyWord(nextActivity.word);
        setShowNewWordIndicator(nextActivity.mode === 'new-word');
        
        if (nextActivity.mode === 'new-word' && nextActivity.word) {
          markWordExposed(nextActivity.word);
        }
      }, defaultDelay * 1000);
    }
  }, [journeyWord, currentJourneyMode, studyMode, updateWordStats, handleMultipleChoiceAnswer, autoAdvance, defaultDelay, chooseNextJourneyActivity, markWordExposed]);

  // Handle next journey activity manually
  const handleNextJourneyActivity = React.useCallback(() => {
    const nextActivity = chooseNextJourneyActivity();
    setCurrentJourneyMode(nextActivity.mode);
    setJourneyWord(nextActivity.word);
    setShowNewWordIndicator(nextActivity.mode === 'new-word');
    
    if (nextActivity.mode === 'new-word' && nextActivity.word) {
      markWordExposed(nextActivity.word);
    }
  }, [chooseNextJourneyActivity, markWordExposed]);

  // Handle typing submission for journey mode
  const handleJourneyTyping = React.useCallback((isCorrect) => {
    if (journeyWord) {
      updateWordStats(journeyWord, 'typing', isCorrect);
    }
    
    // Schedule next activity
    if (autoAdvance) {
      setTimeout(() => {
        handleNextJourneyActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyWord, updateWordStats, autoAdvance, defaultDelay, handleNextJourneyActivity]);

  if (!dbInitialized) {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">🚀 Journey Mode</div>
          <div>Initializing your learning journey...</div>
        </div>
      </div>
    );
  }

  if (!journeyWord && currentJourneyMode !== 'grammar-break') {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">🚀 Journey Mode</div>
          <div>Loading your learning journey...</div>
        </div>
      </div>
    );
  }

  if (currentJourneyMode === 'grammar-break') {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">📚 Grammar Break</div>
          <div>Take a moment to review grammar concepts!</div>
          <div style={{ margin: 'var(--spacing-large) 0' }}>
            <p>Consider reviewing:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>Verb conjugations</li>
              <li>Noun declensions</li>
              <li>Sentence structure</li>
            </ul>
          </div>
          <button className="w-button" onClick={handleNextJourneyActivity}>
            Continue Journey
          </button>
        </div>
      </div>
    );
  }

  // Temporarily set the current word for existing components
  React.useEffect(() => {
    if (journeyWord && wordListState.allWords.length > 0) {
      const wordIndex = wordListState.allWords.findIndex(w => 
        w.lithuanian === journeyWord.lithuanian && w.english === journeyWord.english
      );
      if (wordIndex >= 0) {
        wordListManager.currentCard = wordIndex;
        wordListManager.notifyStateChange();
      }
    }
  }, [journeyWord, wordListManager, wordListState.allWords]);

  // Generate multiple choice options for journey word
  React.useEffect(() => {
    if ((currentJourneyMode === 'multiple-choice' || currentJourneyMode === 'listening') && journeyWord) {
      wordListManager.generateMultipleChoiceOptions(studyMode, currentJourneyMode);
    }
  }, [journeyWord, currentJourneyMode, studyMode, wordListManager]);

  if (currentJourneyMode === 'new-word') {
    return (
      <div>
        {showNewWordIndicator && (
          <div className="w-card" style={{ background: 'linear-gradient(135deg, #4CAF50, #45a049)', color: 'white', marginBottom: 'var(--spacing-base)' }}>
            <div className="w-text-center">
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>✨ New Word!</div>
              <div>Learning something new on your journey</div>
            </div>
          </div>
        )}
        <FlashCardMode 
          currentWord={journeyWord}
          showAnswer={wordListState.showAnswer}
          setShowAnswer={(value) => wordListManager.setShowAnswer(value)}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
        <div className="w-nav-controls">
          <button className="w-button" onClick={handleNextJourneyActivity}>Next Activity →</button>
        </div>
      </div>
    );
  }

  if (currentJourneyMode === 'multiple-choice') {
    return (
      <div>
        <div className="w-card" style={{ background: 'linear-gradient(135deg, #2196F3, #1976D2)', color: 'white', marginBottom: 'var(--spacing-base)' }}>
          <div className="w-text-center">
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🎯 Multiple Choice Challenge</div>
          </div>
        </div>
        <MultipleChoiceMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          handleMultipleChoiceAnswer={handleJourneyMultipleChoice}
        />
        {!autoAdvance && (
          <div className="w-nav-controls">
            <button className="w-button" onClick={handleNextJourneyActivity}>Next Activity →</button>
          </div>
        )}
      </div>
    );
  }

  if (currentJourneyMode === 'listening') {
    return (
      <div>
        <div className="w-card" style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)', color: 'white', marginBottom: 'var(--spacing-base)' }}>
          <div className="w-text-center">
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🎧 Listening Challenge</div>
          </div>
        </div>
        <ListeningMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleMultipleChoiceAnswer={handleJourneyMultipleChoice}
        />
        {!autoAdvance && (
          <div className="w-nav-controls">
            <button className="w-button" onClick={handleNextJourneyActivity}>Next Activity →</button>
          </div>
        )}
      </div>
    );
  }

  if (currentJourneyMode === 'typing') {
    return (
      <div>
        <div className="w-card" style={{ background: 'linear-gradient(135deg, #FF9800, #F57C00)', color: 'white', marginBottom: 'var(--spacing-base)' }}>
          <div className="w-text-center">
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>⌨️ Typing Challenge</div>
          </div>
        </div>
        <JourneyTypingMode 
          journeyWord={journeyWord}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          onComplete={handleJourneyTyping}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
          onNext={handleNextJourneyActivity}
        />
      </div>
    );
  }

  return null;
};

// Custom typing mode component for Journey mode
const JourneyTypingMode = ({ 
  journeyWord,
  studyMode,
  audioEnabled,
  playAudio,
  onComplete,
  autoAdvance,
  defaultDelay,
  onNext
}) => {
  const [typedAnswer, setTypedAnswer] = React.useState('');
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!journeyWord || showAnswer) return;

    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      journeyWord.lithuanian : journeyWord.english;

    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) {
      setFeedback('✅ Correct!');
    } else {
      setFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
    }

    setShowAnswer(true);
    onComplete(isCorrect);

    if (!autoAdvance) {
      // Reset for next question if not auto-advancing
      setTimeout(() => {
        setTypedAnswer('');
        setShowAnswer(false);
        setFeedback('');
      }, 2000);
    }
  };

  const question = studyMode === 'english-to-lithuanian' ? journeyWord.english : journeyWord.lithuanian;

  return (
    <div className="w-card">
      <div className="w-badge">{journeyWord.corpus} → {journeyWord.group}</div>
      
      <div className="w-question w-mb-large">
        <div>{question}</div>
        {audioEnabled && studyMode === 'lithuanian-to-english' && (
          <div style={{ marginTop: 'var(--spacing-base)' }}>
            <AudioButton 
              word={question}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
          placeholder={`Type the ${studyMode === 'english-to-lithuanian' ? 'Lithuanian' : 'English'} translation`}
          className="w-text-input"
          disabled={showAnswer}
          autoFocus
        />
        <button 
          type="submit" 
          className="w-button w-button-primary w-mt-base"
          disabled={showAnswer || !typedAnswer.trim()}
        >
          Check Answer
        </button>
      </form>

      {feedback && (
        <div className={`w-feedback ${feedback.includes('✅') ? 'w-success' : 'w-error'}`}>
          {feedback}
        </div>
      )}

      {showAnswer && (
        <div className="trakaido-answer-text">
          <span>{studyMode === 'english-to-lithuanian' ? journeyWord.lithuanian : journeyWord.english}</span>
          {audioEnabled && (
            <AudioButton 
              word={studyMode === 'english-to-lithuanian' ? journeyWord.lithuanian : journeyWord.english}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          )}
        </div>
      )}

      {showAnswer && !autoAdvance && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={onNext}>Next Activity →</button>
        </div>
      )}
    </div>
  );
};

export default JourneyMode;
