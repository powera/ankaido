
import React from 'react';
import FlashCardMode from './FlashCardMode';
import MultipleChoiceMode from './MultipleChoiceMode';
import ListeningMode from './ListeningMode';
import AudioButton from '../Components/AudioButton';
import ExposureStatsModal from '../Components/ExposureStatsModal';
import indexedDBManager from '../indexedDBManager';

// Global variable for activity selection system
// "advanced" = new system with exposure-based selection
// "legacy" = original system with fixed percentages
const ACTIVITY_SELECTION_SYSTEM = "advanced";

// Constants and helper functions
const DEFAULT_WORD_STATS = {
  exposed: false,
  multipleChoice: { correct: 0, incorrect: 0 },
  listening: { correct: 0, incorrect: 0 },
  typing: { correct: 0, incorrect: 0 },
  lastSeen: null
};

const createWordKey = (word) => `${word.lithuanian}-${word.english}`;

const updateWordListManagerStats = (wordListManager, stats) => {
  wordListManager.journeyStats = stats;
  console.log('Updated wordListManager.journeyStats:', wordListManager.journeyStats);
  wordListManager.notifyStateChange();
};

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
  // Core state - single source of truth
  const [journeyState, setJourneyState] = React.useState({
    isInitialized: false,
    currentActivity: null,
    currentWord: null,
    showNewWordIndicator: false,
    listeningMode: null
  });

  const [journeyStats, setJourneyStats] = React.useState({});

  // Initialize wordListManager journeyStats property
  React.useEffect(() => {
    if (!wordListManager.journeyStats) {
      wordListManager.journeyStats = {};
    }
  }, [wordListManager]);

  // Unified stats loading function
  const loadStatsFromStorage = React.useCallback(async () => {
    try {
      const stats = await indexedDBManager.loadJourneyStats();
      setJourneyStats(stats);
      updateWordListManagerStats(wordListManager, stats);
      setJourneyState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error loading journey stats, falling back to localStorage:', error);
      const savedStats = safeStorage?.getItem('journey-stats');
      try {
        const stats = savedStats ? JSON.parse(savedStats) : {};
        console.log('Loaded journey stats from localStorage:', stats);
        setJourneyStats(stats);
        updateWordListManagerStats(wordListManager, stats);
        setJourneyState(prev => ({ ...prev, isInitialized: true }));
      } catch (parseError) {
        console.error('Error parsing journey stats:', parseError);
        setJourneyStats({});
        setJourneyState(prev => ({ ...prev, isInitialized: true }));
      }
    }
  }, [safeStorage, wordListManager]);

  // Load stats once when initialized
  React.useEffect(() => {
    loadStatsFromStorage();
  }, [loadStatsFromStorage]);

  // Save stats function
  const saveStats = React.useCallback(async (newStats) => {
    console.log('Saving new journey stats:', newStats);
    setJourneyStats(newStats);
    updateWordListManagerStats(wordListManager, newStats);
    
    try {
      const success = await indexedDBManager.saveJourneyStats(newStats);
      if (!success) {
        safeStorage?.setItem('journey-stats', JSON.stringify(newStats));
      }
    } catch (error) {
      console.error('Error saving journey stats:', error);
      safeStorage?.setItem('journey-stats', JSON.stringify(newStats));
    }
  }, [safeStorage, wordListManager]);

  // Helper functions for word categorization
  const getWordStats = React.useCallback((word) => {
    const wordKey = createWordKey(word);
    return journeyStats[wordKey] || { ...DEFAULT_WORD_STATS };
  }, [journeyStats]);
  
  // Helper to count total correct exposures for a word
  const getTotalCorrectExposures = React.useCallback((word) => {
    const stats = getWordStats(word);
    return stats.multipleChoice.correct + stats.listening.correct + stats.typing.correct;
  }, [getWordStats]);

  const getExposedWords = React.useCallback(() => {
    return wordListState.allWords.filter(word => getWordStats(word).exposed);
  }, [wordListState.allWords, getWordStats]);

  const getNewWords = React.useCallback(() => {
    return wordListState.allWords.filter(word => !getWordStats(word).exposed);
  }, [wordListState.allWords, getWordStats]);

  // Activity selection algorithm
  const selectNextActivity = React.useCallback(() => {
    const exposedWords = getExposedWords();
    const newWords = getNewWords();
    
    if (wordListState.allWords.length === 0) {
      return { type: 'new-word', word: wordListManager.getCurrentWord() };
    }

    // If fewer than 10 known words, always show new word
    if (exposedWords.length < 10 && newWords.length > 0) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      return { type: 'new-word', word: randomNewWord };
    }

    // Legacy system with fixed percentages
    if (ACTIVITY_SELECTION_SYSTEM === "legacy") {
      const random = Math.random() * 100;
      
      if (random < 20 && newWords.length > 0) {
        const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
        return { type: 'new-word', word: randomNewWord };
      } else if (random < 50 && exposedWords.length > 0) {
        const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
        return { type: 'multiple-choice', word: randomExposedWord };
      } else if (random < 80 && exposedWords.length > 0) {
        const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
        return { type: 'listening', word: randomExposedWord };
      } else if (random < 97 && exposedWords.length > 0) {
        const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
        return { type: 'typing', word: randomExposedWord };
      } else {
        return { type: 'grammar-break', word: null };
      }
    }
    
    // Advanced system based on exposures
    // First, decide if we should introduce a new word (25% chance)
    let random = Math.random() * 100;
    if (random < 25 && newWords.length > 0) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      return { type: 'new-word', word: randomNewWord };
    }
    
    // Otherwise, choose an exposed word
    if (exposedWords.length === 0) {
      // If no exposed words, fall back to new word
      if (newWords.length > 0) {
        const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
        return { type: 'new-word', word: randomNewWord };
      }
      return { type: 'grammar-break', word: null };
    }
    
    // Filter words by exposure count
    let filteredWords = [...exposedWords];
    
    // For words with 10+ exposures, 75% chance to redraw
    if (filteredWords.some(word => getTotalCorrectExposures(word) >= 10)) {
      filteredWords = filteredWords.filter(word => {
        const exposures = getTotalCorrectExposures(word);
        if (exposures >= 10) {
          // 75% chance to exclude this word
          return Math.random() > 0.75;
        }
        return true;
      });
      
      // If we filtered out all words, use the original list
      if (filteredWords.length === 0) {
        filteredWords = [...exposedWords];
      }
    }
    
    // Choose a random word from the filtered list
    const selectedWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    const exposures = getTotalCorrectExposures(selectedWord);
    
    // Determine activity type based on exposure count
    if (exposures < 3) {
      // Fewer than 3 exposures: use multiple-choice or easy listening
      // If audio is disabled, always use multiple-choice
      if (!audioEnabled) {
        return { type: 'multiple-choice', word: selectedWord };
      }
      
      random = Math.random();
      if (random < 0.5) {
        return { type: 'multiple-choice', word: selectedWord };
      } else {
        // Easy listening: given LT audio, choose LT word
        return { 
          type: 'listening', 
          word: selectedWord,
          mode: 'easy'  // This will be used to determine the listening mode
        };
      }
    } else {
      // 3+ exposures: include typing and hard listening
      // If audio is disabled, only choose between multiple-choice and typing
      if (!audioEnabled) {
        random = Math.random();
        if (random < 0.5) {
          return { type: 'multiple-choice', word: selectedWord };
        } else {
          return { type: 'typing', word: selectedWord };
        }
      }
      
      random = Math.random() * 100;
      if (random < 33) {
        return { type: 'multiple-choice', word: selectedWord };
      } else if (random < 66) {
        // Hard listening: given LT audio, choose EN word (requires knowing meaning)
        return { 
          type: 'listening', 
          word: selectedWord,
          mode: 'hard'  // This will be used to determine the listening mode
        };
      } else {
        return { type: 'typing', word: selectedWord };
      }
    }
  }, [getExposedWords, getNewWords, wordListState.allWords, wordListManager, getTotalCorrectExposures, audioEnabled]);

  // Single function to advance to next activity - SINGLE SOURCE OF TRUTH
  const advanceToNextActivity = React.useCallback(() => {
    const nextActivity = selectNextActivity();
    
    // Reset answer state for all components
    wordListManager.selectedAnswer = null;
    wordListManager.setShowAnswer(false);
    
    // Update journey state in one place
    setJourneyState({
      isInitialized: true,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      listeningMode: nextActivity.mode // Store the listening mode (easy/hard)
    });

    // If it's a new word, mark it as exposed
    if (nextActivity.type === 'new-word' && nextActivity.word) {
      markWordAsExposed(nextActivity.word);
    }

    // Generate multiple choice options if needed
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening') && nextActivity.word) {
      // Set current word for existing components
      const wordIndex = wordListState.allWords.findIndex(w => 
        w.lithuanian === nextActivity.word.lithuanian && w.english === nextActivity.word.english
      );
      if (wordIndex >= 0) {
        wordListManager.currentCard = wordIndex;
        wordListManager.notifyStateChange();
        
        // For listening mode, determine if we're using easy or hard mode
        let effectiveStudyMode = studyMode;
        if (nextActivity.type === 'listening' && nextActivity.mode === 'easy') {
          // Easy listening: always use lithuanian-to-lithuanian regardless of global study mode
          effectiveStudyMode = 'lithuanian-to-lithuanian';
        } else if (nextActivity.type === 'listening' && nextActivity.mode === 'hard') {
          // Hard listening: always use lithuanian-to-english regardless of global study mode
          effectiveStudyMode = 'lithuanian-to-english';
        }
        
        wordListManager.generateMultipleChoiceOptions(effectiveStudyMode, nextActivity.type);
      }
    }
  }, [selectNextActivity, wordListManager, wordListState.allWords, studyMode]);

  // Initialize first activity when ready
  React.useEffect(() => {
    if (journeyState.isInitialized && wordListState.allWords.length > 0 && !journeyState.currentActivity) {
      advanceToNextActivity();
    }
  }, [journeyState.isInitialized, wordListState.allWords.length, journeyState.currentActivity, advanceToNextActivity]);

  // Word stats update functions
  const updateWordInStats = React.useCallback((word, updates) => {
    const wordKey = createWordKey(word);
    const newStats = { ...journeyStats };
    if (!newStats[wordKey]) {
      newStats[wordKey] = { ...DEFAULT_WORD_STATS };
    }
    
    // Apply updates
    Object.assign(newStats[wordKey], updates, { lastSeen: Date.now() });
    saveStats(newStats);
  }, [journeyStats, saveStats]);

  const markWordAsExposed = React.useCallback((word) => {
    updateWordInStats(word, { exposed: true });
  }, [updateWordInStats]);

  const updateWordStats = React.useCallback((word, mode, isCorrect) => {
    const currentStats = getWordStats(word);
    const updates = {
      exposed: true,
      [mode]: {
        ...currentStats[mode],
        [isCorrect ? 'correct' : 'incorrect']: currentStats[mode][isCorrect ? 'correct' : 'incorrect'] + 1
      }
    };
    updateWordInStats(word, updates);
  }, [getWordStats, updateWordInStats]);

  // Event handlers that use the single advance function
  const handleActivityComplete = React.useCallback((word, mode, isCorrect, shouldAutoAdvance = true) => {
    if (word && mode) {
      updateWordStats(word, mode, isCorrect);
    }
    
    if (shouldAutoAdvance && autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [updateWordStats, autoAdvance, defaultDelay, advanceToNextActivity]);

  const handleJourneyMultipleChoice = React.useCallback((selectedOption) => {
    if (!journeyState.currentWord) return;
    
    const currentWord = journeyState.currentWord;
    let correctAnswer;
    
    if (journeyState.currentActivity === 'listening') {
      // Determine correct answer based on listening mode
      if (journeyState.listeningMode === 'easy') {
        // Easy listening: always Lithuanian word
        correctAnswer = currentWord.lithuanian;
      } else if (journeyState.listeningMode === 'hard') {
        // Hard listening: always English word
        correctAnswer = currentWord.english;
      } else {
        // Fallback to original behavior if mode not specified
        correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
      }
    } else {
      // Multiple choice follows the global study mode
      correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    }
    
    const isCorrect = selectedOption === correctAnswer;
    const modeKey = journeyState.currentActivity === 'listening' ? 'listening' : 'multipleChoice';
    
    // Call the original handler for UI updates
    handleMultipleChoiceAnswer(selectedOption);
    
    // Handle completion through single function
    handleActivityComplete(currentWord, modeKey, isCorrect);
  }, [journeyState.currentWord, journeyState.currentActivity, journeyState.listeningMode, studyMode, handleMultipleChoiceAnswer, handleActivityComplete]);

  const handleTypingComplete = React.useCallback((isCorrect) => {
    handleActivityComplete(journeyState.currentWord, 'typing', isCorrect);
  }, [journeyState.currentWord, handleActivityComplete]);
  
  // Loading states
  if (!journeyState.isInitialized) {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">🚀 Journey Mode</div>
          <div>Initializing your learning journey...</div>
        </div>
      </div>
    );
  }

  if (!journeyState.currentActivity) {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">🚀 Journey Mode</div>
          <div>Loading your learning journey...</div>
        </div>
      </div>
    );
  }

  // Activity renderers
  if (journeyState.currentActivity === 'grammar-break') {
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
          <button className="w-button" onClick={advanceToNextActivity}>
            Continue Journey
          </button>
        </div>
      </div>
    );
  }

  // Reusable activity header component
  const ActivityHeader = ({ title, subtitle, background }) => (
    <div className="w-card" style={{ background, color: 'white', marginBottom: 'var(--spacing-base)' }}>
      <div className="w-text-center">
        <div style={{ fontSize: subtitle ? '1.5rem' : '1.2rem', fontWeight: 'bold' }}>{title}</div>
        {subtitle && <div>{subtitle}</div>}
      </div>
    </div>
  );

  // Reusable navigation controls
  const NavigationControls = () => (
    !autoAdvance && (
      <div className="w-nav-controls">
        <button className="w-button" onClick={advanceToNextActivity}>Next Activity →</button>
      </div>
    )
  );

  if (journeyState.currentActivity === 'new-word') {
    return (
      <div>
        {journeyState.showNewWordIndicator && (
          <ActivityHeader 
            title="✨ New Word!" 
            subtitle="Learning something new on your journey"
            background="linear-gradient(135deg, #4CAF50, #45a049)"
          />
        )}
        <FlashCardMode 
          currentWord={journeyState.currentWord}
          showAnswer={wordListState.showAnswer}
          setShowAnswer={(value) => wordListManager.setShowAnswer(value)}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          isNewWord={true}
        />
        <div className="w-nav-controls">
          <button className="w-button" onClick={advanceToNextActivity}>Next Activity →</button>
        </div>
      </div>
    );
  }

  if (journeyState.currentActivity === 'multiple-choice') {
    return (
      <div>
        <ActivityHeader 
          title="🎯 Multiple Choice Challenge"
          background="linear-gradient(135deg, #2196F3, #1976D2)"
        />
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
        <NavigationControls />
      </div>
    );
  }

  if (journeyState.currentActivity === 'listening') {
    // Determine the effective study mode based on listening mode
    let effectiveStudyMode = studyMode;
    let challengeTitle = '🎧 Listening Challenge';
    
    if (journeyState.listeningMode === 'easy') {
      effectiveStudyMode = 'lithuanian-to-lithuanian';
      challengeTitle = '🎧 Listening Challenge (Easy)';
    } else if (journeyState.listeningMode === 'hard') {
      effectiveStudyMode = 'lithuanian-to-english';
      challengeTitle = '🎧 Listening Challenge (Hard)';
    }
    
    return (
      <div>
        <ActivityHeader 
          title={challengeTitle}
          background="linear-gradient(135deg, #9C27B0, #7B1FA2)"
        />
        <ListeningMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={effectiveStudyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleMultipleChoiceAnswer={handleJourneyMultipleChoice}
        />
        <NavigationControls />
      </div>
    );
  }

  if (journeyState.currentActivity === 'typing') {
    return (
      <div>
        <ActivityHeader 
          title="⌨️ Typing Challenge"
          background="linear-gradient(135deg, #FF9800, #F57C00)"
        />
        <JourneyTypingMode 
          journeyWord={journeyState.currentWord}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          onComplete={handleTypingComplete}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
          onNext={advanceToNextActivity}
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

  // Reset state when journeyWord changes
  React.useEffect(() => {
    setTypedAnswer('');
    setShowAnswer(false);
    setFeedback('');
  }, [journeyWord]);

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
