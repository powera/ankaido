
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

const DrillMode = ({
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
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
  
  // Local state for drill activities - simplified to only what's needed
  const [drillActivityState, setDrillActivityState] = React.useState({
    showAnswer: false,
    selectedAnswer: null,
    typedAnswer: '',
    typingFeedback: ''
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
  const generateMultipleChoiceOptions = React.useCallback((currentWord, mode) => {
    if (!currentWord || !drillState.drillWords.length) return [];

    const options = [];
    const isEnToLt = mode === 'en-to-lt';
    const correctAnswer = isEnToLt ? currentWord.lithuanian : currentWord.english;
    
    // Add the correct answer
    options.push(correctAnswer);
    
    // Add 3 random incorrect options from other drill words
    const otherWords = drillState.drillWords.filter(w => 
      w.lithuanian !== currentWord.lithuanian || w.english !== currentWord.english
    );
    
    const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
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
      setDrillActivityState({
        showAnswer: false,
        selectedAnswer: null,
        typedAnswer: '',
        typingFeedback: ''
      });
      return;
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
    setDrillActivityState({
      showAnswer: false,
      selectedAnswer: null,
      typedAnswer: '',
      typingFeedback: ''
    });
  }, [drillState.drillWords, drillState.currentDrillIndex, drillConfig?.difficulty, audioEnabled, getTotalCorrectForWord]);

  // Initialize first activity when ready
  React.useEffect(() => {
    if (drillState.isInitialized && drillState.drillWords.length > 0 && !drillState.currentActivity) {
      advanceToNextDrillActivity();
    }
  }, [drillState.isInitialized, drillState.drillWords.length, drillState.currentActivity, advanceToNextDrillActivity]);

  // Auto-play audio for listening activities and LT->EN activities
  React.useEffect(() => {
    if (audioEnabled && drillState.currentWord) {
      let shouldPlayAudio = false;

      if (drillState.currentActivity === 'listening') {
        shouldPlayAudio = true;
      }

      if (drillState.currentActivity === 'multiple-choice' && drillState.multipleChoiceMode === 'lt-to-en') {
        shouldPlayAudio = true;
      }

      if (drillState.currentActivity === 'typing' && drillState.typingMode === 'lt-to-en') {
        shouldPlayAudio = true;
      }

      if (shouldPlayAudio) {
        const timer = setTimeout(async () => {
          try {
            await playAudio(drillState.currentWord.lithuanian);
          } catch (error) {
            console.warn('Auto-play audio failed:', error);
            // Continue with the activity even if audio fails
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [drillState.currentActivity, drillState.multipleChoiceMode, drillState.typingMode, drillState.currentWord, audioEnabled, playAudio]);

  // Generate multiple choice options when needed
  const currentMultipleChoiceOptions = React.useMemo(() => {
    if (!drillState.currentWord) return [];
    
    if (drillState.currentActivity === 'multiple-choice') {
      return generateMultipleChoiceOptions(drillState.currentWord, drillState.multipleChoiceMode);
    } else if (drillState.currentActivity === 'listening') {
      // For listening activities, generate options based on the mode
      // Easy mode: Lithuanian audio -> Lithuanian options (lt-to-lt)
      // Hard mode: Lithuanian audio -> English options (lt-to-en)
      const mode = drillState.listeningMode === 'easy' ? 'en-to-lt' : 'lt-to-en';
      return generateMultipleChoiceOptions(drillState.currentWord, mode);
    }
    
    return [];
  }, [drillState.currentWord, generateMultipleChoiceOptions]);

  // Enhanced handlers that update drill stats
  const handleDrillMultipleChoice = React.useCallback(async (selectedOption) => {
    // Determine correct answer based on current activity mode
    let correctAnswer;
    if (drillState.multipleChoiceMode === 'en-to-lt') {
      correctAnswer = drillState.currentWord.lithuanian;
    } else {
      correctAnswer = drillState.currentWord.english;
    }
    
    const isCorrect = selectedOption === correctAnswer;
    
    // Update local drill activity state
    setDrillActivityState(prev => ({
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

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(drillState.currentWord, {
        exposures: 1,
        correct: isCorrect ? 1 : 0,
        incorrect: isCorrect ? 0 : 1
      });
    } catch (error) {
      console.error('Error updating journey stats:', error);
    }
    
    // Move to next word after a delay (ensure minimum 2 seconds to show feedback)
    const delay = autoAdvance ? Math.max(defaultDelay, 2) : 2;
    setTimeout(() => {
      advanceToNextDrillActivity(true);
    }, delay * 1000);
  }, [drillState.multipleChoiceMode, drillState.currentWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

  // Custom nextCard handler for drill mode that tracks stats
  const handleDrillNextCard = React.useCallback(() => {
    // For typing activities, we need to track the result based on the feedback
    const feedback = drillActivityState.typingFeedback;
    const isCorrect = feedback && feedback.includes('✅');
    
    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Move to next word
    advanceToNextDrillActivity(true);
  }, [drillActivityState.typingFeedback, advanceToNextDrillActivity]);

  const handleDrillListening = React.useCallback(async (selectedOption) => {
    // Determine correct answer based on listening mode
    let correctAnswer;
    if (drillState.listeningMode === 'easy') {
      // Lithuanian audio -> Lithuanian options
      correctAnswer = drillState.currentWord.lithuanian;
    } else {
      // Lithuanian audio -> English options
      correctAnswer = drillState.currentWord.english;
    }
    
    const isCorrect = selectedOption === correctAnswer;
    
    // Update local drill activity state
    setDrillActivityState(prev => ({
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

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(drillState.currentWord, {
        exposures: 1,
        correct: isCorrect ? 1 : 0,
        incorrect: isCorrect ? 0 : 1
      });
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
                setDrillActivityState({
                  showAnswer: false,
                  selectedAnswer: null,
                  typedAnswer: '',
                  typingFeedback: ''
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
                setDrillActivityState({
                  showAnswer: false,
                  selectedAnswer: null,
                  typedAnswer: '',
                  typingFeedback: ''
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
          showAnswer={drillActivityState.showAnswer}
          selectedAnswer={drillActivityState.selectedAnswer}
          multipleChoiceOptions={currentMultipleChoiceOptions}
          studyMode={drillState.multipleChoiceMode === 'en-to-lt' ? 'english-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          handleMultipleChoiceAnswer={handleDrillMultipleChoice}
        />
      ) : drillState.currentActivity === 'listening' ? (
        <ListeningActivity
          currentWord={drillState.currentWord}
          showAnswer={drillActivityState.showAnswer}
          selectedAnswer={drillActivityState.selectedAnswer}
          multipleChoiceOptions={currentMultipleChoiceOptions}
          studyMode={drillState.listeningMode === 'easy' ? 'lithuanian-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleMultipleChoiceAnswer={handleDrillListening}
        />
      ) : drillState.currentActivity === 'typing' ? (
        <TypingActivity
          currentWord={drillState.currentWord}
          typedAnswer={drillActivityState.typedAnswer}
          typingFeedback={drillActivityState.typingFeedback}
          setTypedAnswer={(value) => setDrillActivityState(prev => ({ ...prev, typedAnswer: value }))}
          setTypingFeedback={(value) => setDrillActivityState(prev => ({ ...prev, typingFeedback: value }))}
          studyMode={drillState.typingMode === 'en-to-lt' ? 'english-to-lithuanian' : 'lithuanian-to-english'}
          nextCard={handleDrillNextCard}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
        />
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
