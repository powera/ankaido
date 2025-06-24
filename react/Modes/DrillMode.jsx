import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import ListeningActivity from '../Activities/ListeningActivity';
import TypingActivity from '../Activities/TypingActivity';
import StatsDisplay from '../Components/StatsDisplay';

import { 
  journeyStatsManager, 
  getExposedWords, 
  getNewWords, 
  getTotalCorrectExposures 
} from '../Managers/journeyStatsManager';

import { selectDrillActivity } from '../Utilities/activitySelection';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';

const DrillMode = ({
  audioEnabled,
  autoAdvance,
  defaultDelay,
  drillConfig, // { corpus, group, difficulty }
  corporaData,
  onExitDrill
}) => {
  const [drillState, setDrillState] = React.useState({
    isInitialized: false,
    currentActivity: null,
    currentWord: null,
    currentMultipleChoiceOptions: [],
    showNewWordIndicator: false,
    listeningMode: null,
    multipleChoiceMode: null,
    typingMode: null,
    drillWords: [],
    currentDrillIndex: 0,
    drillStats: {
      attempted: 0,
      correct: 0,
      incorrect: 0
    }
  });

  const [journeyStats, setJourneyStats] = React.useState({});

  // State for user interactions with the current question
  const [questionInteractionState, setQuestionInteractionState] = React.useState({
    showAnswer: false,
    selectedAnswer: null
  });

  // Load stats from storage
  const loadStatsFromStorage = React.useCallback(async () => {
    try {
      const stats = await journeyStatsManager.initialize();
      console.log('Loaded journey stats for drill mode:', stats);
      setJourneyStats(stats);
      setDrillState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error loading journey stats for drill mode:', error);
      setJourneyStats({});
      setDrillState(prev => ({ ...prev, isInitialized: true }));
    }
  }, []);

  // Load stats once when initialized
  React.useEffect(() => {
    loadStatsFromStorage();

    // Listen for stats updates
    const handleStatsUpdate = (updatedStats) => {
      setJourneyStats(updatedStats);
    };

    journeyStatsManager.addListener(handleStatsUpdate);

    return () => {
      journeyStatsManager.removeListener(handleStatsUpdate);
    };
  }, [loadStatsFromStorage]);

  // Helper function to generate multiple choice options
  const generateMultipleChoiceOptionsForDrill = React.useCallback((currentWord, mode) => {
    if (!currentWord || !drillState.drillWords.length) return [];

    const options = [];
    const isEnToLt = mode === 'en-to-lt';
    const correctAnswer = isEnToLt ? currentWord.lithuanian : currentWord.english;

    // Add the correct answer
    options.push(correctAnswer);

    // Add 5 random incorrect options from other drill words
    const otherWords = drillState.drillWords.filter(w => 
      w.lithuanian !== currentWord.lithuanian || w.english !== currentWord.english
    );

    const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(5, shuffledOthers.length); i++) {
      const incorrectAnswer = isEnToLt ? shuffledOthers[i].lithuanian : shuffledOthers[i].english;
      if (!options.includes(incorrectAnswer)) {
        options.push(incorrectAnswer);
      }
    }

    // If we don't have enough options, pad with some defaults
    while (options.length < 4) {
      const placeholder = isEnToLt ? `Option ${options.length}` : `Option ${options.length}`;
      if (!options.includes(placeholder)) {
        options.push(placeholder);
      }
    }

    // Shuffle the options
    return options.sort(() => Math.random() - 0.5);
  }, [drillState.drillWords]);

  // Generate drill word list from selected group
  React.useEffect(() => {
    if (drillState.isInitialized && drillConfig && corporaData) {
      console.log(`Drill mode: Initializing drill for ${drillConfig.corpus}/${drillConfig.group} (${drillConfig.difficulty})`);

      // Generate words directly from corporaData for the selected group
      let drillWords = [];

      if (corporaData[drillConfig.corpus] && corporaData[drillConfig.corpus].groups[drillConfig.group]) {
        const groupWords = corporaData[drillConfig.corpus].groups[drillConfig.group];
        drillWords = groupWords.map(word => ({
          ...word,
          corpus: drillConfig.corpus,
          group: drillConfig.group
        }));
      }

      console.log(`Drill mode: Found ${drillWords.length} words for ${drillConfig.corpus}/${drillConfig.group}`);

      if (drillWords.length === 0) {
        console.warn('No words found for selected drill configuration');
        setDrillState(prev => ({
          ...prev,
          drillWords: [],
          currentDrillIndex: 0
        }));
        return;
      }

      // Shuffle the words for random order
      const shuffledWords = [...drillWords].sort(() => Math.random() - 0.5);

      setDrillState(prev => ({
        ...prev,
        drillWords: shuffledWords,
        currentDrillIndex: 0
      }));
    }
  }, [drillState.isInitialized, drillConfig, corporaData]);

  // Helper function to get total correct exposures for a word
  const getTotalCorrectForWord = React.useCallback((word) => {
    const stats = journeyStatsManager.getWordStats(word);
    return getTotalCorrectExposures(stats);
  }, []);

  // Advance to next activity in drill
  const advanceToNextDrillActivity = React.useCallback((shouldAdvanceIndex = false) => {
    // If we need to advance the index, we'll calculate the next activity with the incremented index
    let effectiveIndex = drillState.currentDrillIndex;
    if (shouldAdvanceIndex) {
      effectiveIndex = drillState.currentDrillIndex + 1;
    }

    // Get the word at the effective index
    if (drillState.drillWords.length === 0) {
      return;
    }

    const currentWord = drillState.drillWords[effectiveIndex];

    let nextActivity;
    if (!currentWord) {
      // We've reached the end of the drill
      nextActivity = { type: 'drill-complete', word: null };
    } else {
      try {
        nextActivity = selectDrillActivity(
          currentWord, 
          drillConfig.difficulty, 
          audioEnabled, 
          getTotalCorrectForWord
        );
      } catch (error) {
        console.error('Error selecting drill activity:', error);
        // Fallback to multiple choice
        const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
        nextActivity = { type: 'multiple-choice', word: currentWord, mode: mcMode };
      }
    }

    if (!nextActivity) {
      return;
    }

    if (nextActivity.type === 'drill-complete') {
      // Show completion screen
      setDrillState(prev => ({
        ...prev,
        currentActivity: 'drill-complete',
        currentWord: null,
        showNewWordIndicator: false,
        listeningMode: null,
        multipleChoiceMode: null,
        typingMode: null,
        currentMultipleChoiceOptions: [],
        // Update index and stats if we advanced
        ...(shouldAdvanceIndex ? {
          currentDrillIndex: effectiveIndex,
          drillStats: {
            ...prev.drillStats,
            attempted: prev.drillStats.attempted + 1
          }
        } : {})
      }));

      // Reset local drill activity state
      setQuestionInteractionState({
        showAnswer: false,
        selectedAnswer: null
      });
      return;
    }

    // Generate multiple choice options if needed
    let multipleChoiceOptions = [];
    if (nextActivity.type === 'multiple-choice') {
      multipleChoiceOptions = generateMultipleChoiceOptionsForDrill(nextActivity.word, nextActivity.mode);
    } else if (nextActivity.type === 'listening') {
      // For listening activities, generate options based on the mode
      // Easy mode: Lithuanian audio -> Lithuanian options (lt-to-lt)
      // Hard mode: Lithuanian audio -> English options (lt-to-en)
      const mode = nextActivity.mode === 'easy' ? 'en-to-lt' : 'lt-to-en';
      multipleChoiceOptions = generateMultipleChoiceOptionsForDrill(nextActivity.word, mode);
    }

    // Update drill state with new activity
    setDrillState(prev => ({
      ...prev,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      listeningMode: nextActivity.type === 'listening' ? nextActivity.mode : null,
      multipleChoiceMode: nextActivity.type === 'multiple-choice' ? nextActivity.mode : null,
      typingMode: nextActivity.type === 'typing' ? nextActivity.mode : null,
      currentMultipleChoiceOptions: multipleChoiceOptions,
      // Update index and stats if we advanced
      ...(shouldAdvanceIndex ? {
        currentDrillIndex: effectiveIndex,
        drillStats: {
          ...prev.drillStats,
          attempted: prev.drillStats.attempted + 1
        }
      } : {})
    }));

    // Reset local drill activity state for new activity
    setQuestionInteractionState({
      showAnswer: false,
      selectedAnswer: null
    });
  }, [drillState.drillWords, drillState.currentDrillIndex, drillConfig?.difficulty, audioEnabled, getTotalCorrectForWord, generateMultipleChoiceOptionsForDrill]);

  // Initialize first activity when ready
  React.useEffect(() => {
    if (drillState.isInitialized && drillState.drillWords.length > 0 && !drillState.currentActivity) {
      advanceToNextDrillActivity();
    }
  }, [drillState.isInitialized, drillState.drillWords.length, drillState.currentActivity, advanceToNextDrillActivity]);



  // Enhanced handlers that update drill stats
  const handleDrillMultipleChoice = React.useCallback(async (selectedOption, isCorrect) => {

    // Update local drill activity state
    setQuestionInteractionState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Update journey stats using correct API
    try {
      await journeyStatsManager.updateWordStats(drillState.currentWord, 'multipleChoice', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Move to next word after a delay (ensure minimum 2 seconds to show feedback)
    const delay = autoAdvance ? Math.max(defaultDelay, 2) : 2;
    setTimeout(() => {
      advanceToNextDrillActivity(true);
    }, delay * 1000);
  }, [drillState.multipleChoiceMode, drillState.currentWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

  // Handler for typing submissions with stats and auto-advance
  const handleDrillTyping = React.useCallback(async (typedAnswer, isCorrect) => {
    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Update journey stats for typing activity
    try {
      await journeyStatsManager.updateWordStats(drillState.currentWord, 'typing', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Auto-advance if enabled, otherwise wait for manual advance
    if (autoAdvance) {
      setTimeout(() => {
        advanceToNextDrillActivity(true);
      }, defaultDelay * 1000);
    }
  }, [drillState.currentWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

  const handleDrillListening = React.useCallback(async (selectedOption, isCorrect) => {

    // Update local drill activity state
    setQuestionInteractionState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Update journey stats using correct API and mode mapping
    try {
      const listeningMode = drillState.listeningMode === 'easy' ? 'listeningEasy' : 'listeningHard';
      await journeyStatsManager.updateWordStats(drillState.currentWord, listeningMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }

    // Move to next word after a delay (ensure minimum 2 seconds to show feedback)
    const delay = autoAdvance ? Math.max(defaultDelay, 2) : 2;
    setTimeout(() => {
      advanceToNextDrillActivity(true);
    }, delay * 1000);
  }, [drillState.listeningMode, drillState.currentWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

  if (!drillState.isInitialized) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Initializing drill mode...</div>
        </div>
      </div>
    );
  }

  if (drillState.drillWords.length === 0) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <h2>No words found</h2>
          <p>No vocabulary words were found for the selected group.</p>
          <button 
            className="w-button"
            onClick={onExitDrill}
            style={{ marginTop: '1rem' }}
          >
            Back to Mode Selection
          </button>
        </div>
      </div>
    );
  }

  if (drillState.currentActivity === 'drill-complete') {
    const totalAttempted = drillState.drillStats.correct + drillState.drillStats.incorrect;
    const accuracy = totalAttempted > 0 ? Math.round((drillState.drillStats.correct / totalAttempted) * 100) : 0;

    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <h2 style={{ color: 'var(--color-primary)', margin: '0 0 1rem 0' }}>
            🎉 Drill Complete!
          </h2>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              <strong>{drillConfig.corpus}/{drillConfig.group}</strong> - {drillConfig.difficulty} difficulty
            </div>
            <StatsDisplay 
              stats={{
                correct: drillState.drillStats.correct,
                incorrect: drillState.drillStats.incorrect,
                total: drillState.drillStats.correct + drillState.drillStats.incorrect
              }}
              onReset={() => {
                // Reset drill state for another round
                setDrillState(prev => ({
                  ...prev,
                  currentDrillIndex: 0,
                  currentActivity: null,
                  drillStats: { attempted: 0, correct: 0, incorrect: 0 }
                }));
                // Reset local activity state
                setQuestionInteractionState({
                  showAnswer: false,
                  selectedAnswer: null
                });
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              className="w-button"
              onClick={() => {
                // The reset functionality is now handled by StatsDisplay's onReset
                // This button just triggers the same reset logic
                setDrillState(prev => ({
                  ...prev,
                  currentDrillIndex: 0,
                  currentActivity: null,
                  drillStats: { attempted: 0, correct: 0, incorrect: 0 }
                }));
                setQuestionInteractionState({
                  showAnswer: false,
                  selectedAnswer: null
                });
              }}
            >
              🔄 Drill Again
            </button>
            <button 
              className="w-button"
              onClick={onExitDrill}
            >
              📚 Back to Modes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Progress information
  const progressInfo = (
    <div style={{ 
      textAlign: 'center', 
      marginBottom: '1rem',
      padding: '0.5rem',
      background: 'var(--color-background)',
      borderRadius: 'var(--border-radius)',
      fontSize: '0.9rem',
      color: 'var(--color-text-secondary)'
    }}>
      <div style={{ marginBottom: '0.25rem' }}>
        <strong>{drillConfig.corpus}/{drillConfig.group}</strong> - {drillConfig.difficulty} difficulty
      </div>
      <div>
        Word {drillState.currentDrillIndex + 1} of {drillState.drillWords.length} | 
        Correct: {drillState.drillStats.correct} | 
        Incorrect: {drillState.drillStats.incorrect}
      </div>
    </div>
  );

  // Render current activity
  return (
    <div>
      {progressInfo}

      {drillState.currentActivity === 'multiple-choice' ? (
        <MultipleChoiceActivity
          currentWord={drillState.currentWord}
          showAnswer={questionInteractionState.showAnswer}
          selectedAnswer={questionInteractionState.selectedAnswer}
          multipleChoiceOptions={drillState.currentMultipleChoiceOptions}
          studyMode={drillState.multipleChoiceMode === 'en-to-lt' ? 'english-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          onAnswerClick={handleDrillMultipleChoice}
          autoAdvance={autoAdvance}
          defaultDelay={Math.max(defaultDelay, 2)}
          allWords={drillState.drillWords}
        />
      ) : drillState.currentActivity === 'listening' ? (
        <ListeningActivity
          currentWord={drillState.currentWord}
          showAnswer={questionInteractionState.showAnswer}
          selectedAnswer={questionInteractionState.selectedAnswer}
          multipleChoiceOptions={drillState.currentMultipleChoiceOptions}
          studyMode={drillState.listeningMode === 'easy' ? 'lithuanian-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          onAnswerClick={handleDrillListening}
          autoAdvance={autoAdvance}
          defaultDelay={Math.max(defaultDelay, 2)}
          allWords={drillState.drillWords}
        />
      ) : drillState.currentActivity === 'typing' ? (
        <div>
          <TypingActivity
            currentWord={drillState.currentWord}
            studyMode={drillState.typingMode === 'en-to-lt' ? 'english-to-lithuanian' : 'lithuanian-to-english'}
            onSubmit={handleDrillTyping}
            audioEnabled={audioEnabled}
          />
          {!autoAdvance && (
            <div className="w-nav-controls">
              <button className="w-button" onClick={() => advanceToNextDrillActivity(true)}>
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div>Loading activity...</div>
          </div>
        </div>
      )}

      {/* Exit button */}
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button 
          className="w-button"
          onClick={onExitDrill}
          style={{ 
            background: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            padding: '0.5rem 1rem'
          }}
        >
          Exit Drill Mode
        </button>
      </div>
    </div>
  );
};

export default DrillMode;