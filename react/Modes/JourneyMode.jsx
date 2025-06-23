import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import ListeningActivity from '../Activities/ListeningActivity';
import TypingActivity from '../Activities/TypingActivity';

import { 
  journeyStatsManager, 
  getExposedWords, 
  getNewWords, 
  getTotalCorrectExposures 
} from '../Managers/journeyStatsManager';

import { selectJourneyActivity } from '../Utilities/activitySelection';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';

const JourneyMode = ({ 
  wordListManager, 
  wordListState, 
  studyMode, 
  audioEnabled, 
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
    typingMode: null,
    multipleChoiceOptions: []
  });

  const [activityAnswerState, setActivityAnswerState] = React.useState({
    showAnswer: false,
    selectedAnswer: null
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

  // Activity selection using centralized utility
  const selectNextActivity = React.useCallback(() => {
    return selectJourneyActivity(
      getExposedWordsList,
      getNewWordsList,
      wordListState.allWords,
      wordListManager,
      getTotalCorrectForWord,
      audioEnabled
    );
  }, [getExposedWordsList, getNewWordsList, wordListState.allWords, wordListManager, getTotalCorrectForWord, audioEnabled]);

  // Single function to advance to next activity - SINGLE SOURCE OF TRUTH
  const advanceToNextActivity = React.useCallback(() => {
    const nextActivity = selectNextActivity();

    // Note: Answer state reset is now handled by individual activity components

    // Generate multiple choice options for activities that need them
    let multipleChoiceOptions = [];
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening') && nextActivity.word) {
      // Determine the effective study mode for option generation
      let effectiveStudyMode = studyMode;
      if (nextActivity.type === 'listening' && nextActivity.mode === 'easy') {
        effectiveStudyMode = 'lithuanian-to-lithuanian';
      } else if (nextActivity.type === 'listening' && nextActivity.mode === 'hard') {
        effectiveStudyMode = 'lithuanian-to-english';
      } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'en-to-lt') {
        effectiveStudyMode = 'english-to-lithuanian';
      } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'lt-to-en') {
        effectiveStudyMode = 'lithuanian-to-english';
      }

      multipleChoiceOptions = generateMultipleChoiceOptions(
        nextActivity.word,
        effectiveStudyMode,
        nextActivity.type === 'listening' ? 'listening' : 'multiple-choice',
        wordListState,
        { difficulty: 'easy' } // Default difficulty for Journey mode
      );
    }

    // Update journey state in one place
    setJourneyState({
      isInitialized: true,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      listeningMode: nextActivity.type === 'listening' ? nextActivity.mode : null, // Store the listening mode (easy/hard)
      multipleChoiceMode: nextActivity.type === 'multiple-choice' ? nextActivity.mode : null, // Store the multiple-choice mode (en-to-lt/lt-to-en)
      typingMode: nextActivity.type === 'typing' ? nextActivity.mode : null, // Store the typing mode (en-to-lt/lt-to-en)
      multipleChoiceOptions: multipleChoiceOptions
    });

    // Reset answer state for new activity
    setActivityAnswerState({
      showAnswer: false,
      selectedAnswer: null
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





  // Handler for multiple choice answers with stats and auto-advance
  const handleJourneyMultipleChoice = React.useCallback(async (selectedOption, isCorrect) => {
    // Update local answer state
    setActivityAnswerState({
      showAnswer: true,
      selectedAnswer: selectedOption
    });

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(journeyState.currentWord, 'multipleChoice', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyState.multipleChoiceMode, journeyState.currentWord, autoAdvance, defaultDelay, advanceToNextActivity]);

  // Handler for listening answers with stats and auto-advance
  const handleJourneyListening = React.useCallback(async (selectedOption, isCorrect) => {
    // Update local answer state
    setActivityAnswerState({
      showAnswer: true,
      selectedAnswer: selectedOption
    });

    // Determine stats mode based on difficulty
    const statsMode = journeyState.listeningMode === 'easy' ? 'listeningEasy' : 'listeningHard';

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(journeyState.currentWord, statsMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyState.listeningMode, journeyState.currentWord, autoAdvance, defaultDelay, advanceToNextActivity]);

  // Handler for typing submissions with stats and auto-advance
  const handleJourneyTyping = React.useCallback(async (typedAnswer, isCorrect) => {
    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(journeyState.currentWord, 'typing', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyState.currentWord, autoAdvance, defaultDelay, advanceToNextActivity]);



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
          currentWord={journeyState.currentWord}
          showAnswer={activityAnswerState.showAnswer}
          selectedAnswer={activityAnswerState.selectedAnswer}
          multipleChoiceOptions={journeyState.multipleChoiceOptions}
          studyMode={effectiveStudyMode}
          audioEnabled={audioEnabled}
          onAnswerClick={handleJourneyMultipleChoice}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
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
          currentWord={journeyState.currentWord}
          showAnswer={activityAnswerState.showAnswer}
          selectedAnswer={activityAnswerState.selectedAnswer}
          multipleChoiceOptions={journeyState.multipleChoiceOptions}
          studyMode={effectiveStudyMode}
          audioEnabled={audioEnabled}
          onAnswerClick={handleJourneyListening}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
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
          currentWord={journeyState.currentWord}
          studyMode={effectiveStudyMode}
          onSubmit={handleJourneyTyping}
          audioEnabled={audioEnabled}
        />
      </div>
    );
  }

  return null;
};

export default JourneyMode;