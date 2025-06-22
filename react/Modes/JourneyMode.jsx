import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import ListeningActivity from '../Activities/ListeningActivity';
import TypingActivity from '../Activities/TypingActivity';

import { 
  journeyStatsManager, 
  updateWordListManagerStats, 
  getExposedWords, 
  getNewWords, 
  getTotalCorrectExposures 
} from '../Managers/journeyStatsManager';

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
  const [journeyState, setJourneyState] = React.useState({
    isInitialized: false,
    currentActivity: null,
    currentWord: null,
    showNewWordIndicator: false,
    listeningMode: null,
    multipleChoiceMode: null,
    typingMode: null
  });

  const [journeyStats, setJourneyStats] = React.useState({});

  // Initialize wordListManager journeyStats property
  React.useEffect(() => {
    if (!wordListManager.journeyStats) {
      wordListManager.journeyStats = {};
    }
  }, [wordListManager]);

  // Unified stats loading function using shared manager
  const loadStatsFromStorage = React.useCallback(async () => {
    try {
      const stats = await journeyStatsManager.initialize();
      console.log('Loaded journey stats:', stats);
      setJourneyStats(stats);
      updateWordListManagerStats(wordListManager, stats);
      setJourneyState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error loading journey stats:', error);
      setJourneyStats({});
      setJourneyState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [wordListManager]);

  // Load stats once when initialized and set up listener for external stats updates
  React.useEffect(() => {
    loadStatsFromStorage();

    // Listen for stats updates from other modes
    const handleStatsUpdate = (updatedStats) => {
      setJourneyStats(updatedStats);
      updateWordListManagerStats(wordListManager, updatedStats);
    };

    journeyStatsManager.addListener(handleStatsUpdate);

    // Cleanup listener on unmount
    return () => {
      journeyStatsManager.removeListener(handleStatsUpdate);
    };
  }, [loadStatsFromStorage, wordListManager]);

  // Helper functions for word categorization (using journeyStatsManager)
  const getExposedWordsList = React.useCallback(() => {
    return getExposedWords(wordListState.allWords, journeyStatsManager);
  }, [wordListState.allWords]);

  const getNewWordsList = React.useCallback(() => {
    return getNewWords(wordListState.allWords, journeyStatsManager);
  }, [wordListState.allWords]);

  const getTotalCorrectForWord = React.useCallback((word) => {
    const stats = journeyStatsManager.getWordStats(word);
    return getTotalCorrectExposures(stats);
  }, []);

  // Helper function to attempt activity selection for a specific word
  const attemptActivitySelection = (selectedWord, exposures, audioEnabled) => {
    const random = Math.random() * 100;

    // Tier 1: exposures < 4
    if (exposures < 4) {
      // 50% multiple-choice, 50% easy listening
      if (random < 50) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
      } else {
        // Easy listening requires audio
        if (!audioEnabled) return null; // Will trigger retry
        return { 
          type: 'listening', 
          word: selectedWord,
          mode: 'easy'
        };
      }
    }
    // Tier 2: exposures < 9
    else if (exposures < 9) {
      // 40% multiple-choice, 40% listening, 20% typing
      if (random < 40) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
      } else if (random < 80) {
        // Listening requires audio
        if (!audioEnabled) return null; // Will trigger retry
        // Mix of easy and hard listening
        const listeningMode = Math.random() < 0.5 ? 'easy' : 'hard';
        return { 
          type: 'listening', 
          word: selectedWord,
          mode: listeningMode
        };
      } else {
        const typingMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'typing', word: selectedWord, mode: typingMode };
      }
    }
    // Tier 3: exposures >= 9
    else {
      // 20% multiple-choice, 20% hard listening, 60% typing
      if (random < 20) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
      } else if (random < 40) {
        // Listening requires audio
        if (!audioEnabled) return null; // Will trigger retry
        return { 
          type: 'listening', 
          word: selectedWord,
          mode: 'hard'
        };
      } else {
        const typingMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'typing', word: selectedWord, mode: typingMode };
      }
    }
  };

  // Activity selection algorithm
  const selectNextActivity = React.useCallback(() => {
    const exposedWords = getExposedWordsList();
    const newWords = getNewWordsList();

    if (wordListState.allWords.length === 0) {
      return { type: 'new-word', word: wordListManager.getCurrentWord() };
    }

    // If fewer than 10 known words, always show new word
    if (exposedWords.length < 10 && newWords.length > 0) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      return { type: 'new-word', word: randomNewWord };
    }

    // First, decide if we should show a motivational interstitial (3% chance)
    let random = Math.random() * 100;
    if (random < 3) {
      return { type: 'motivational-break', word: null };
    }

    // Then, decide if we should introduce a new word
    random = Math.random() * 100;
    if (random < 20 && newWords.length > 0) {
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
    if (filteredWords.some(word => getTotalCorrectForWord(word) >= 10)) {
      filteredWords = filteredWords.filter(word => {
        const exposures = getTotalCorrectForWord(word);
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
    const exposures = getTotalCorrectForWord(selectedWord);

    // Keep trying until we get a valid activity (handles audio disabled scenarios)
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const activityResult = attemptActivitySelection(selectedWord, exposures, audioEnabled);
      
      if (activityResult !== null) {
        return activityResult;
      }
      
      attempts++;
    }

    // Fallback: always return multiple-choice if we can't find a valid activity
    const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
    return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
  }, [getExposedWordsList, getNewWordsList, wordListState.allWords, wordListManager, getTotalCorrectForWord, attemptActivitySelection]);

  // Single function to advance to next activity - SINGLE SOURCE OF TRUTH
  const advanceToNextActivity = React.useCallback(() => {
    const nextActivity = selectNextActivity();

    // Reset answer state for all components
    wordListManager.selectedAnswer = null;
    wordListManager.setShowAnswer(false);
    wordListManager.setTypedAnswer('');
    wordListManager.setTypingFeedback('');

    // Update journey state in one place
    setJourneyState({
      isInitialized: true,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      listeningMode: nextActivity.type === 'listening' ? nextActivity.mode : null, // Store the listening mode (easy/hard)
      multipleChoiceMode: nextActivity.type === 'multiple-choice' ? nextActivity.mode : null, // Store the multiple-choice mode (en-to-lt/lt-to-en)
      typingMode: nextActivity.type === 'typing' ? nextActivity.mode : null // Store the typing mode (en-to-lt/lt-to-en)
    });

    // Note: New words will be marked as exposed by the FlashCardActivity when first shown

    // Generate multiple choice options if needed, or set up typing activities
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening' || nextActivity.type === 'typing') && nextActivity.word) {
      // Set current word for existing components
      const wordIndex = wordListState.allWords.findIndex(w => 
        w.lithuanian === nextActivity.word.lithuanian && w.english === nextActivity.word.english
      );
      if (wordIndex >= 0) {
        wordListManager.currentCard = wordIndex;

        // Determine effective study mode based on activity type and mode
        let effectiveStudyMode = studyMode;
        if (nextActivity.type === 'listening' && nextActivity.mode === 'easy') {
          // Easy listening: always use lithuanian-to-lithuanian regardless of global study mode
          effectiveStudyMode = 'lithuanian-to-lithuanian';
        } else if (nextActivity.type === 'listening' && nextActivity.mode === 'hard') {
          // Hard listening: always use lithuanian-to-english regardless of global study mode
          effectiveStudyMode = 'lithuanian-to-english';
        } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'en-to-lt') {
          // English-to-Lithuanian multiple choice: English prompt, Lithuanian answers
          effectiveStudyMode = 'english-to-lithuanian';
        } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'lt-to-en') {
          // Lithuanian-to-English multiple choice: Lithuanian prompt, English answers
          effectiveStudyMode = 'lithuanian-to-english';
        } else if (nextActivity.type === 'typing' && nextActivity.mode === 'en-to-lt') {
          // English-to-Lithuanian typing: English prompt, type Lithuanian answer
          effectiveStudyMode = 'english-to-lithuanian';
        } else if (nextActivity.type === 'typing' && nextActivity.mode === 'lt-to-en') {
          // Lithuanian-to-English typing: Lithuanian prompt, type English answer
          effectiveStudyMode = 'lithuanian-to-english';
        }

        // Force regeneration of multiple choice options by clearing them first
        wordListManager.multipleChoiceOptions = [];
        wordListManager.generateMultipleChoiceOptions(effectiveStudyMode, nextActivity.type);

        // Notify state change after everything is updated
        wordListManager.notifyStateChange();
      }
    }
  }, [selectNextActivity, wordListManager, wordListState.allWords, studyMode]);

  // Initialize first activity when ready
  React.useEffect(() => {
    if (journeyState.isInitialized && wordListState.allWords.length > 0 && !journeyState.currentActivity) {
      advanceToNextActivity();
    }
  }, [journeyState.isInitialized, wordListState.allWords.length, journeyState.currentActivity, advanceToNextActivity]);

  // Auto-play audio for listening activities, LT->EN multiple choice, and LT->EN typing in Journey Mode
  React.useEffect(() => {
    if (audioEnabled && journeyState.currentWord) {
      let shouldPlayAudio = false;

      // Play audio for listening activities
      if (journeyState.currentActivity === 'listening') {
        shouldPlayAudio = true;
      }

      // Play audio for LT->EN multiple choice (Lithuanian prompt, player chooses English answer)
      if (journeyState.currentActivity === 'multiple-choice' && journeyState.multipleChoiceMode === 'lt-to-en') {
        shouldPlayAudio = true;
      }

      // Play audio for LT->EN typing (Lithuanian prompt, player types English answer)
      if (journeyState.currentActivity === 'typing' && journeyState.typingMode === 'lt-to-en') {
        shouldPlayAudio = true;
      }

      if (shouldPlayAudio) {
        // Small delay to ensure the UI has updated
        const timer = setTimeout(() => {
          playAudio(journeyState.currentWord.lithuanian);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [journeyState.currentActivity, journeyState.multipleChoiceMode, journeyState.typingMode, journeyState.currentWord, audioEnabled, playAudio]);



  // Simplified handlers that just manage UI flow - stats are handled by Activity components
  const handleJourneyMultipleChoice = React.useCallback(async (selectedOption) => {
    // Just delegate to the original handler - the Activity components handle stats updates
    handleMultipleChoiceAnswer(selectedOption);
    
    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [handleMultipleChoiceAnswer, autoAdvance, defaultDelay, advanceToNextActivity]);



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

  if (journeyState.currentActivity === 'motivational-break') {
    const motivationalMessages = [
      "Keep going, you're doing great! 🌟",
      "Your progress is impressive! 💪",
      "You're building amazing language skills! 🚀",
      "Every word you learn is a step forward! ✨",
      "Your dedication is paying off! 🎯",
      "You're becoming more fluent every day! 🌱",
      "Great job staying consistent! 👏",
      "Your Lithuanian journey is inspiring! 🏆",
      "Keep up the excellent work! 💫",
      "You're mastering this language! 🎉"
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large" style={{ fontSize: '2rem', margin: 'var(--spacing-large) 0' }}>
            {randomMessage}
          </div>
          <div style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-base) 0' }}>
            Take a moment to appreciate your progress!
          </div>
          <button className="w-button" onClick={advanceToNextActivity} style={{ marginTop: 'var(--spacing-large)' }}>
            Continue Journey →
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
        <FlashCardActivity 
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
    // Calculate effective study mode for multiple choice
    let effectiveStudyMode = studyMode;
    if (journeyState.multipleChoiceMode === 'en-to-lt') {
      // English-to-Lithuanian multiple choice: English prompt, Lithuanian answers
      effectiveStudyMode = 'english-to-lithuanian';
    } else if (journeyState.multipleChoiceMode === 'lt-to-en') {
      // Lithuanian-to-English multiple choice: Lithuanian prompt, English answers
      effectiveStudyMode = 'lithuanian-to-english';
    }

    return (
      <div>
        <ActivityHeader 
          title="🎯 Multiple Choice Challenge"
          background="linear-gradient(135deg, #2196F3, #1976D2)"
        />
        <MultipleChoiceActivity 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={effectiveStudyMode}
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
        <ListeningActivity 
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
    // Determine the effective study mode based on typing mode
    let effectiveStudyMode = studyMode;
    let challengeTitle = '⌨️ Typing Challenge';

    if (journeyState.typingMode === 'en-to-lt') {
      effectiveStudyMode = 'english-to-lithuanian';
      challengeTitle = '⌨️ Typing Challenge (EN → LT)';
    } else if (journeyState.typingMode === 'lt-to-en') {
      effectiveStudyMode = 'lithuanian-to-english';
      challengeTitle = '⌨️ Typing Challenge (LT → EN)';
    }

    return (
      <div>
        <ActivityHeader 
          title={challengeTitle}
          background="linear-gradient(135deg, #FF9800, #F57C00)"
        />
        <TypingActivity 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={effectiveStudyMode}
          nextCard={advanceToNextActivity}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
        />
      </div>
    );
  }

  return null;
};



export default JourneyMode;