import React from 'react';
import ConjugationTable from '../Activities/ConjugationTable';
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

import safeStorage from '../DataStorage/safeStorage';
import journeyModeManager from '../Managers/journeyModeManager';
import WordListManager from '../Managers/wordListManager';
import { invalidateWordWeightCache, selectJourneyActivity } from '../Utilities/activitySelection';
import { fetchConjugations } from '../Utilities/apiClient';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import {
  ExtendedActivityType,
  JourneyFocusMode,
  Stats,
  StudyMode,
  Word,
  WordListState
} from '../Utilities/types';

// --- Type Definitions ---

interface JourneyModeProps {
  wordListManager: WordListManager;
  wordListState: WordListState;
  studyMode: StudyMode;
  audioEnabled: boolean;
  autoAdvance: boolean;
  defaultDelay: number;
  safeStorage: typeof safeStorage;
  journeyFocusMode?: JourneyFocusMode;
  setJourneyFocusMode?: (mode: JourneyFocusMode) => void;
}

interface JourneyState {
  isInitialized: boolean;
  currentActivity: ExtendedActivityType | null;
  currentWord: Word | null;
  showNewWordIndicator: boolean;
  multipleChoiceOptions: any[]; // TODO: Type this properly when multipleChoiceGenerator is migrated
  conjugationData: Record<string, any> | null;
  selectedVerb: string | null;
  verbCorpus: string | null;
}

interface ActivityAnswerState {
  showAnswer: boolean;
  selectedAnswer: string | null;
}

interface ActivityHeaderProps {
  title: string;
  subtitle?: string;
  background: string;
}

const JourneyMode: React.FC<JourneyModeProps> = ({ 
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
  const [journeyState, setJourneyState] = React.useState<JourneyState>({
    isInitialized: false,
    currentActivity: null,
    currentWord: null,
    showNewWordIndicator: false,
    multipleChoiceOptions: [],
    conjugationData: null,
    selectedVerb: null,
    verbCorpus: null
  });

  const [activityAnswerState, setActivityAnswerState] = React.useState<ActivityAnswerState>({
    showAnswer: false,
    selectedAnswer: null
  });

  const [activityStats, setActivityStats] = React.useState<Stats>({});

  // Journey focus mode interstitial state
  const [showFocusInterstitial, setShowFocusInterstitial] = React.useState<boolean>(false);
  const [pendingFocusMode, setPendingFocusMode] = React.useState<JourneyFocusMode | null>(null);
  const [currentFocusMode, setCurrentFocusMode] = React.useState<JourneyFocusMode>('normal');
  
  // Track when it's the first activity or after a mode change
  const [isFirstActivityOrModeChange, setIsFirstActivityOrModeChange] = React.useState<boolean>(true);

  // Journey mode state is managed by the singleton journeyModeManager

  // Handle journey focus mode changes with interstitial
  React.useEffect(() => {
    if (journeyFocusMode !== currentFocusMode) {
      // Mark that the next activity should be after a mode change
      setIsFirstActivityOrModeChange(true);
      
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

  // Note: activityStats are now managed by activityStatsManager, not wordListManager

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
    const handleStatsUpdate = (updatedStats: Stats) => {
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

  const getTotalCorrectForWord = React.useCallback((word: Word) => {
    const stats = activityStatsManager.getWordStats(word);
    return getTotalCorrectExposures(stats);
  }, []);

  const getWordWeights = React.useCallback((word: Word) => {
    return activityStatsManager.getWordStats(word);
  }, []);

  // Interstitial handlers
  const handleInterstitialContinue = (): void => {
    setCurrentFocusMode(pendingFocusMode!);
    setShowFocusInterstitial(false);
    setPendingFocusMode(null);
    // Mark that the next activity should be after a mode change
    setIsFirstActivityOrModeChange(true);
  };

  const handleInterstitialReturnToNormal = (): void => {
    setCurrentFocusMode('normal');
    setShowFocusInterstitial(false);
    setPendingFocusMode(null);
    // Update the parent's state to sync with the dropdown
    if (setJourneyFocusMode) {
      setJourneyFocusMode('normal');
    }
    // Mark that the next activity should be after a mode change
    setIsFirstActivityOrModeChange(true);
  };

  // Activity selection using centralized utility
  const selectNextActivity = React.useCallback(() => {
    return selectJourneyActivity(
      getExposedWordsList,
      getNewWordsList,
      wordListState.allWords,
      { getCurrentWord: () => wordListManager.getCurrentWordRequired() },
      getTotalCorrectForWord,
      audioEnabled,
      journeyModeManager,
      getWordWeights,
      currentFocusMode,
      null, // levelsData - not used in this context
      isFirstActivityOrModeChange
    );
  }, [getExposedWordsList, getNewWordsList, wordListState.allWords, wordListManager, getTotalCorrectForWord, audioEnabled, getWordWeights, currentFocusMode, isFirstActivityOrModeChange]);

  // Single function to advance to next activity - SINGLE SOURCE OF TRUTH
  const advanceToNextActivity = React.useCallback(async () => {
    const nextActivity = selectNextActivity();
    
    // Reset the first activity or mode change flag after selecting an activity
    setIsFirstActivityOrModeChange(false);

    // Note: Answer state reset is now handled by individual activity components

    // Generate multiple choice options for activities that need them
    let multipleChoiceOptions: any[] = [];
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening') && nextActivity.word) {
      // All activities are now LT->EN: Lithuanian prompt, English answers
      const effectiveStudyMode = 'lithuanian-to-english';

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

    // Handle conjugation table activity
    let conjugationData = null;
    let selectedVerb = null;
    let verbCorpus = null;
    
    if (nextActivity.type === 'conjugation-table') {
      // Determine corpus based on available verb corpuses
      const availableCorpuses = ['verbs_present', 'verbs_past', 'verbs_future'];
      verbCorpus = availableCorpuses[Math.floor(Math.random() * availableCorpuses.length)];
      
      // Fetch conjugation data
      try {
        const conjugationResponse = await fetchConjugations(verbCorpus);
        conjugationData = conjugationResponse.conjugations;
        const availableVerbs = conjugationResponse.verbs;
        
        if (availableVerbs.length > 0) {
          selectedVerb = availableVerbs[Math.floor(Math.random() * availableVerbs.length)];
        }
      } catch (error) {
        console.error('Failed to fetch conjugation data:', error);
        // Fall back to a regular activity if conjugation data fails
        const fallbackActivity = selectNextActivity();
        setJourneyState({
          isInitialized: true,
          currentActivity: fallbackActivity.type,
          currentWord: fallbackActivity.word,
          showNewWordIndicator: fallbackActivity.type === 'new-word',
          multipleChoiceOptions: [],
          conjugationData: null,
          selectedVerb: null,
          verbCorpus: null
        });
        return;
      }
    }

    // Update journey state in one place
    setJourneyState({
      isInitialized: true,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      multipleChoiceOptions: multipleChoiceOptions,
      conjugationData: conjugationData,
      selectedVerb: selectedVerb,
      verbCorpus: verbCorpus
    });

    // Reset answer state for new activity
    setActivityAnswerState({
      showAnswer: false,
      selectedAnswer: null
    });

    // Note: New words will be marked as exposed by the FlashCardActivity when first shown

    // All activities are now standardized to LT->EN
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening' || nextActivity.type === 'typing') && nextActivity.word) {
      // Set current word for existing components
      const wordIndex = wordListState.allWords.findIndex(w => 
        nextActivity.word && w.lithuanian === nextActivity.word.lithuanian && w.english === nextActivity.word.english
      );
      if (wordIndex >= 0) {
        // Note: WordListManager doesn't expose currentCard setter, 
        // but the word selection is handled by the activity selection logic
        // Note: State change notification is handled by the activity selection logic
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
  const handleJourneyMultipleChoice = React.useCallback(async (selectedOption: string, isCorrect: boolean) => {
    // Update local answer state
    setActivityAnswerState({
      showAnswer: true,
      selectedAnswer: selectedOption
    });

    // Update journey stats (Journey Mode can expose words)
    if (journeyState.currentWord) {
      try {
        await activityStatsManager.updateWordStats(journeyState.currentWord, 'multipleChoice', isCorrect, true);
        // Invalidate weight cache for this word since stats changed
        invalidateWordWeightCache(journeyState.currentWord);
      } catch (error) {
        console.error('Error updating journey stats:', error);
      }
    }

    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyState.currentWord, autoAdvance, defaultDelay, advanceToNextActivity]);

  // Handler for listening answers with stats and auto-advance
  const handleJourneyListening = React.useCallback(async (selectedOption: string, isCorrect: boolean) => {
    // Update local answer state
    setActivityAnswerState({
      showAnswer: true,
      selectedAnswer: selectedOption
    });

    // Listening is always "hard mode" (Lithuanian audio -> English answers)
    const statsMode = 'listeningHard';

    // Update journey stats (Journey Mode can expose words)
    if (journeyState.currentWord) {
      try {
        await activityStatsManager.updateWordStats(journeyState.currentWord, statsMode, isCorrect, true);
        // Invalidate weight cache for this word since stats changed
        invalidateWordWeightCache(journeyState.currentWord);
      } catch (error) {
        console.error('Error updating journey stats:', error);
      }
    }

    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextActivity();
      }, defaultDelay * 1000);
    }
  }, [journeyState.currentWord, autoAdvance, defaultDelay, advanceToNextActivity]);

  // Handler for typing submissions with stats and auto-advance
  const handleJourneyTyping = React.useCallback(async (typedAnswer: string, isCorrect: boolean) => {
    // Update journey stats (Journey Mode can expose words)
    if (journeyState.currentWord) {
      try {
        await activityStatsManager.updateWordStats(journeyState.currentWord, 'typing', isCorrect, true);
        // Invalidate weight cache for this word since stats changed
        invalidateWordWeightCache(journeyState.currentWord);
      } catch (error) {
        console.error('Error updating journey stats:', error);
      }
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
  if (showFocusInterstitial && pendingFocusMode) {
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

  if (journeyState.currentActivity === 'welcome-interstitial') {
    return (
      <div className="w-card">
        <div className="w-text-center w-mb-large">
          <div className="w-question w-mb-large">🚀 Welcome to Journey Mode!</div>
          <div className="w-mb-base">
            Your personalized learning journey is about to begin. 
            We'll guide you through activities tailored to your progress.
          </div>
          <div className="w-mb-large">
            Let's start by introducing some new words to expand your vocabulary!
          </div>
          <button className="w-button" onClick={advanceToNextActivity}>
            Begin Journey →
          </button>
        </div>
      </div>
    );
  }

  // Reusable activity header component
  const ActivityHeader: React.FC<ActivityHeaderProps> = ({ title, subtitle, background }) => (
    <div className="w-card" style={{ background, color: 'white', marginBottom: 'var(--spacing-base)' }}>
      <div className="w-text-center">
        <div style={{ fontSize: subtitle ? '1.5rem' : '1.2rem', fontWeight: 'bold' }}>{title}</div>
        {subtitle && <div>{subtitle}</div>}
      </div>
    </div>
  );

  // Reusable navigation controls
  const NavigationControls: React.FC = () => (
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
          setShowAnswer={(value: boolean) => {
            // Note: FlashCardActivity manages its own show answer state
            // This callback is for compatibility but doesn't need to do anything
          }}
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
    // Multiple choice is always LT->EN: Lithuanian prompt, English answers
    const effectiveStudyMode = 'lithuanian-to-english';

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
          settings={{}}
        />
        <NavigationControls />
      </div>
    );
  }

  if (journeyState.currentActivity === 'listening') {
    // Listening is always "hard mode": Lithuanian audio, English answers
    const effectiveStudyMode = 'lithuanian-to-english';
    const challengeTitle = '🎧 Listening Challenge';

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
          settings={{}}
        />
        <NavigationControls />
      </div>
    );
  }

  if (journeyState.currentActivity === 'typing') {
    // Typing is always LT->EN: Lithuanian prompt, type English answer
    const effectiveStudyMode = 'lithuanian-to-english';
    const challengeTitle = '⌨️ Typing Challenge';

    return (
      <div>
        <ActivityHeader 
          title={challengeTitle}
          background="linear-gradient(135deg, #FF9800, #F57C00)"
        />
        <TypingActivity 
          wordListManager={wordListManager}
          wordListState={wordListState}
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

  if (journeyState.currentActivity === 'conjugation-table') {
    // Determine tense display name
    let tenseDisplayName = 'Present Tense';
    if (journeyState.verbCorpus === 'verbs_past') {
      tenseDisplayName = 'Past Tense';
    } else if (journeyState.verbCorpus === 'verbs_future') {
      tenseDisplayName = 'Future Tense';
    }

    return (
      <div>
        <ActivityHeader 
          title={`📚 Verb Conjugation - ${tenseDisplayName}`}
          subtitle={journeyState.selectedVerb ? `Conjugating "${journeyState.selectedVerb}"` : 'Loading...'}
          background="linear-gradient(135deg, #8BC34A, #689F38)"
        />
        {journeyState.conjugationData && journeyState.selectedVerb && (
          <ConjugationTable 
            verb={journeyState.selectedVerb}
            conjugations={journeyState.conjugationData}
            audioEnabled={audioEnabled}
            compact={true}
            hideHeader={true}
          />
        )}
        <div className="w-nav-controls">
          <button className="w-button" onClick={advanceToNextActivity}>Next Activity →</button>
        </div>
      </div>
    );
  }

  return null;
};

export default JourneyMode;