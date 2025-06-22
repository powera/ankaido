import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import ListeningActivity from '../Activities/ListeningActivity';
import AudioButton from '../Components/AudioButton';
import ExposureStatsModal from '../Components/ExposureStatsModal';
import TypingResponse from '../Components/TypingResponse';

import { 
  journeyStatsManager, 
  updateWordListManagerStats, 
  getExposedWords, 
  getNewWords, 
  getTotalCorrectExposures 
} from '../Managers/journeyStatsManager';

// Global variable for activity selection system
// "advanced" = new system with exposure-based selection
// "legacy" = original system with fixed percentages
const ACTIVITY_SELECTION_SYSTEM = "advanced";

// Constants and helper functions moved to journeyStatsManager

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
    listeningMode: null,
    multipleChoiceMode: null
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

    // Legacy system with fixed percentages
    if (ACTIVITY_SELECTION_SYSTEM === "legacy") {
      const random = Math.random() * 100;

      if (random < 20 && newWords.length > 0) {
        const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
        return { type: 'new-word', word: randomNewWord };
      } else if (random < 50 && exposedWords.length > 0) {
        const randomExposedWord = exposedWords[Math.floor(Math.random() * exposedWords.length)];
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: randomExposedWord, mode: mcMode };
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
    // First, decide if we should show a motivational interstitial (3% chance)
    let random = Math.random() * 100;
    if (random < 3) {
      return { type: 'motivational-break', word: null };
    }

    // Then, decide if we should introduce a new word (25% chance of remaining 97%)
    random = Math.random() * 100;
    if (random < 25.77 && newWords.length > 0) { // 25/97 ≈ 25.77% to maintain original 25% overall
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

    // Determine activity type based on exposure count
    if (exposures < 3) {
      // Fewer than 3 exposures: use multiple-choice or easy listening
      // If audio is disabled, always use multiple-choice
      if (!audioEnabled) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
      }

      random = Math.random();
      if (random < 0.5) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
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
          const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
          return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
        } else {
          return { type: 'typing', word: selectedWord };
        }
      }

      random = Math.random() * 100;
      if (random < 33) {
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
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
  }, [getExposedWordsList, getNewWordsList, wordListState.allWords, wordListManager, getTotalCorrectForWord, audioEnabled]);

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
      listeningMode: nextActivity.type === 'listening' ? nextActivity.mode : null, // Store the listening mode (easy/hard)
      multipleChoiceMode: nextActivity.type === 'multiple-choice' ? nextActivity.mode : null // Store the multiple-choice mode (en-to-lt/lt-to-en)
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

  // Auto-play audio for listening activities and LT->EN multiple choice in Journey Mode
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

      if (shouldPlayAudio) {
        // Small delay to ensure the UI has updated
        const timer = setTimeout(() => {
          playAudio(journeyState.currentWord.lithuanian);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [journeyState.currentActivity, journeyState.multipleChoiceMode, journeyState.currentWord, audioEnabled, playAudio]);

  // Word stats update functions
  const updateWordInStats = React.useCallback(async (word, updates) => {
    await journeyStatsManager.updateWordStatsDirectly(word, updates);
  }, []);

  const markWordAsExposed = React.useCallback(async (word) => {
    await updateWordInStats(word, { exposed: true });
  }, [updateWordInStats]);

  const updateWordStats = React.useCallback(async (word, mode, isCorrect) => {
    // Use the shared stats manager for consistency
    // The listener system will handle updating local state and wordListManager
    await journeyStatsManager.updateWordStats(word, mode, isCorrect);
  }, []);

  // Event handlers that use the single advance function
  const handleActivityComplete = React.useCallback(async (word, mode, isCorrect, shouldAutoAdvance = true) => {
    if (word && mode) {
      await updateWordStats(word, mode, isCorrect);
    }

    if (shouldAutoAdvance && autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [updateWordStats, autoAdvance, defaultDelay, advanceToNextActivity]);

  const handleJourneyMultipleChoice = React.useCallback(async (selectedOption) => {
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
      // Multiple choice uses its specific mode
      if (journeyState.multipleChoiceMode === 'en-to-lt') {
        correctAnswer = currentWord.lithuanian;
      } else if (journeyState.multipleChoiceMode === 'lt-to-en') {
        correctAnswer = currentWord.english;
      } else {
        // Fallback to global study mode if no specific mode is set
        correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
      }
    }

    const isCorrect = selectedOption === correctAnswer;
    const modeKey = journeyState.currentActivity === 'listening' ? 'listening' : 'multipleChoice';

    // Call the original handler for UI updates
    handleMultipleChoiceAnswer(selectedOption);

    // Handle completion through single function
    await handleActivityComplete(currentWord, modeKey, isCorrect);
  }, [journeyState.currentWord, journeyState.currentActivity, journeyState.listeningMode, journeyState.multipleChoiceMode, studyMode, handleMultipleChoiceAnswer, handleActivityComplete]);

  const handleTypingComplete = React.useCallback(async (isCorrect) => {
    await handleActivityComplete(journeyState.currentWord, 'typing', isCorrect);
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

  const handleSubmit = (answer) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      journeyWord.lithuanian : journeyWord.english;

    const isCorrect = answer.trim().toLowerCase() === correctAnswer.toLowerCase();

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

      <TypingResponse
        currentWord={journeyWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={handleSubmit}
        showAnswer={showAnswer}
        feedback={feedback}
        typedAnswer={typedAnswer}
        onTypedAnswerChange={setTypedAnswer}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={onNext}
        autoAdvanceTimer={false}
      />
    </div>
  );
};

export default JourneyMode;