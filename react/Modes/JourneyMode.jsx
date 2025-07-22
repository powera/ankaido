import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';
import ListeningActivity from '../Activities/ListeningActivity';
import MotivationalBreakActivity from '../Activities/MotivationalBreakActivity';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import TypingActivity from '../Activities/TypingActivity';
import JourneyFocusModeInterstitial from '../Components/JourneyFocusModeInterstitial';

import {
    activityStatsManager,
    getExposedWords,
    getNewWords,
    getTotalCorrectExposures,
    getTotalExposures
} from '../Managers/activityStatsManager';

import journeyModeManager from '../Managers/journeyModeManager';
import { invalidateWordWeightCache, selectJourneyActivity } from '../Utilities/activitySelection';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';

const JourneyMode = ({ 
  wordListManager, 
  wordListState, 
  studyMode, 
  audioEnabled, 
  autoAdvance, 
  defaultDelay, 
  safeStorage,
  journeyFocusMode = 'normal',
  setJourneyFocusMode
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

  const [activityStats, setActivityStats] = React.useState({});

  // Journey focus mode interstitial state
  const [showFocusInterstitial, setShowFocusInterstitial] = React.useState(false);
  const [pendingFocusMode, setPendingFocusMode] = React.useState(null);
  const [currentFocusMode, setCurrentFocusMode] = React.useState('normal');

  // Journey mode state is managed by the singleton journeyModeManager

  // Handle journey focus mode changes with interstitial
  React.useEffect(() => {
    if (journeyFocusMode !== currentFocusMode) {
      if (journeyFocusMode === 'new-words' || journeyFocusMode === 'review-words') {
        // Show interstitial for non-normal modes
        setPendingFocusMode(journeyFocusMode);
        setShowFocusInterstitial(true);
      } else {
        // Directly set normal mode
        setCurrentFocusMode(journeyFocusMode);
      }
    }
  }, [journeyFocusMode, currentFocusMode]);

  // Initialize wordListManager activityStats property
  React.useEffect(() => {
    if (!wordListManager.activityStats) {
      wordListManager.activityStats = {};
    }
  }, [wordListManager]);

  // Unified stats loading function using shared manager
  const loadStatsFromStorage = React.useCallback(async () => {
    try {
      const stats = await activityStatsManager.initialize();
      console.log('Loaded journey stats:', stats);
      setActivityStats(stats);
      setJourneyState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error loading journey stats:', error);
      setActivityStats({});
      setJourneyState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [wordListManager]);

  // Load stats once when initialized and set up listener for external stats updates
  React.useEffect(() => {
    loadStatsFromStorage();

    // Listen for stats updates from other modes
    const handleStatsUpdate = (updatedStats) => {
      setActivityStats(updatedStats);
    };

    activityStatsManager.addListener(handleStatsUpdate);

    // Cleanup listener on unmount
    return () => {
      activityStatsManager.removeListener(handleStatsUpdate);
    };
  }, [loadStatsFromStorage, wordListManager]);

  // Journey mode manager is always active - no need to register/unregister

  // Helper functions for word categorization (using activityStatsManager)
  const getExposedWordsList = React.useCallback(() => {
    return getExposedWords(wordListState.allWords, activityStatsManager);
  }, [wordListState.allWords]);

  const getNewWordsList = React.useCallback(() => {
    return getNewWords(wordListState.allWords, activityStatsManager);
  }, [wordListState.allWords]);

  const getTotalCorrectForWord = React.useCallback((word) => {
    const stats = activityStatsManager.getWordStats(word);
    return getTotalCorrectExposures(stats);
  }, []);

  const getWordWeights = React.useCallback((word) => {
    return activityStatsManager.getWordStats(word);
  }, []);

  // Interstitial handlers
  const handleInterstitialContinue = () => {
    setCurrentFocusMode(pendingFocusMode);
    setShowFocusInterstitial(false);
    setPendingFocusMode(null);
  };

  const handleInterstitialReturnToNormal = () => {
    setCurrentFocusMode('normal');
    setShowFocusInterstitial(false);
    setPendingFocusMode(null);
    // Update the parent's state to sync with the dropdown
    if (setJourneyFocusMode) {
      setJourneyFocusMode('normal');
    }
  };

  // Activity selection using centralized utility
  const selectNextActivity = React.useCallback(() => {
    return selectJourneyActivity(
      getExposedWordsList,
      getNewWordsList,
      wordListState.allWords,
      wordListManager,
      getTotalCorrectForWord,
      audioEnabled,
      journeyModeManager,
      getWordWeights,
      currentFocusMode
    );
  }, [getExposedWordsList, getNewWordsList, wordListState.allWords, wordListManager, getTotalCorrectForWord, audioEnabled, getWordWeights, currentFocusMode]);

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

      // Determine number of options based on word exposure count
      const wordStats = activityStatsManager.getWordStats(nextActivity.word);
      const totalExposures = getTotalExposures(wordStats);
      const numOptions = totalExposures > 8 ? 6 : 4; // Use 6 options if >8 exposures, otherwise 4

      multipleChoiceOptions = generateMultipleChoiceOptions(
        nextActivity.word,
        effectiveStudyMode,
        nextActivity.type === 'listening' ? 'listening' : 'multiple-choice',
        wordListState,
        { numOptions: numOptions }
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

    // Update journey stats (Journey Mode can expose words)
    try {
      await activityStatsManager.updateWordStats(journeyState.currentWord, 'multipleChoice', isCorrect, true);
      // Invalidate weight cache for this word since stats changed
      invalidateWordWeightCache(journeyState.currentWord);
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

    // Update journey stats (Journey Mode can expose words)
    try {
      await activityStatsManager.updateWordStats(journeyState.currentWord, statsMode, isCorrect, true);
      // Invalidate weight cache for this word since stats changed
      invalidateWordWeightCache(journeyState.currentWord);
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
    // Update journey stats (Journey Mode can expose words)
    try {
      await activityStatsManager.updateWordStats(journeyState.currentWord, 'typing', isCorrect, true);
      // Invalidate weight cache for this word since stats changed
      invalidateWordWeightCache(journeyState.currentWord);
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

  // Show focus mode interstitial if needed
  if (showFocusInterstitial) {
    return (
      <JourneyFocusModeInterstitial
        focusMode={pendingFocusMode}
        onContinue={handleInterstitialContinue}
        onReturnToNormal={handleInterstitialReturnToNormal}
      />
    );
  }

  if (journeyState.currentActivity === 'motivational-break') {
    return (
      <MotivationalBreakActivity onContinue={advanceToNextActivity} />
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
          allWords={wordListState.allWords}
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
          allWords={wordListState.allWords}
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
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
          autoAdvanceTimer={null}
          allWords={wordListState.allWords}
        />
        <NavigationControls />
      </div>
    );
  }

  return null;
};

export default JourneyMode;