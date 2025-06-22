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

import { selectDrillActivity } from '../Utilities/activitySelection';

const DrillMode = ({
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
  safeStorage,
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

  // Initialize wordListManager journeyStats property
  React.useEffect(() => {
    if (!wordListManager.journeyStats) {
      wordListManager.journeyStats = {};
    }
  }, [wordListManager]);

  // Load stats from storage
  const loadStatsFromStorage = React.useCallback(async () => {
    try {
      const stats = await journeyStatsManager.initialize();
      console.log('Loaded journey stats for drill mode:', stats);
      setJourneyStats(stats);
      updateWordListManagerStats(wordListManager, stats);
      setDrillState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error loading journey stats for drill mode:', error);
      setJourneyStats({});
      setDrillState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [wordListManager]);

  // Load stats once when initialized
  React.useEffect(() => {
    loadStatsFromStorage();

    // Listen for stats updates
    const handleStatsUpdate = (updatedStats) => {
      setJourneyStats(updatedStats);
      updateWordListManagerStats(wordListManager, updatedStats);
    };

    journeyStatsManager.addListener(handleStatsUpdate);

    return () => {
      journeyStatsManager.removeListener(handleStatsUpdate);
    };
  }, [loadStatsFromStorage, wordListManager]);

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

  // Select next activity for drill mode
  const selectNextDrillActivity = React.useCallback(() => {
    if (drillState.drillWords.length === 0) {
      return null;
    }

    const currentWord = drillState.drillWords[drillState.currentDrillIndex];
    
    if (!currentWord) {
      // We've reached the end of the drill
      return { type: 'drill-complete', word: null };
    }

    try {
      return selectDrillActivity(
        currentWord, 
        drillConfig.difficulty, 
        audioEnabled, 
        getTotalCorrectForWord
      );
    } catch (error) {
      console.error('Error selecting drill activity:', error);
      // Fallback to multiple choice
      const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
      return { type: 'multiple-choice', word: currentWord, mode: mcMode };
    }
  }, [drillState.drillWords, drillState.currentDrillIndex, drillConfig.difficulty, audioEnabled, getTotalCorrectForWord]);

  // Advance to next activity in drill
  const advanceToNextDrillActivity = React.useCallback(() => {
    const nextActivity = selectNextDrillActivity();

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
        typingMode: null
      }));
      return;
    }

    // Reset answer state for all components
    wordListManager.selectedAnswer = null;
    wordListManager.setShowAnswer(false);
    wordListManager.setTypedAnswer('');
    wordListManager.setTypingFeedback('');

    // Update drill state
    setDrillState(prev => ({
      ...prev,
      currentActivity: nextActivity.type,
      currentWord: nextActivity.word,
      showNewWordIndicator: nextActivity.type === 'new-word',
      listeningMode: nextActivity.type === 'listening' ? nextActivity.mode : null,
      multipleChoiceMode: nextActivity.type === 'multiple-choice' ? nextActivity.mode : null,
      typingMode: nextActivity.type === 'typing' ? nextActivity.mode : null
    }));

    // Set up the word for activities in drill mode
    if ((nextActivity.type === 'multiple-choice' || nextActivity.type === 'listening' || nextActivity.type === 'typing') && nextActivity.word) {
      // For drill mode, we need to temporarily set up the word in wordListManager
      // First, we'll add the drill words to the wordListManager for this session
      if (drillState.drillWords.length > 0) {
        // Temporarily replace the wordListManager's word list with drill words
        wordListManager.allWords = drillState.drillWords;
        
        // Find the current word in the drill list
        const wordIndex = drillState.drillWords.findIndex(w => 
          w.lithuanian === nextActivity.word.lithuanian && w.english === nextActivity.word.english
        );
        
        if (wordIndex >= 0) {
          wordListManager.currentCard = wordIndex;

          // Determine effective study mode based on activity
          let effectiveStudyMode = studyMode;
          if (nextActivity.type === 'listening' && nextActivity.mode === 'easy') {
            effectiveStudyMode = 'lithuanian-to-lithuanian';
          } else if (nextActivity.type === 'listening' && nextActivity.mode === 'hard') {
            effectiveStudyMode = 'lithuanian-to-english';
          } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'en-to-lt') {
            effectiveStudyMode = 'english-to-lithuanian';
          } else if (nextActivity.type === 'multiple-choice' && nextActivity.mode === 'lt-to-en') {
            effectiveStudyMode = 'lithuanian-to-english';
          } else if (nextActivity.type === 'typing' && nextActivity.mode === 'en-to-lt') {
            effectiveStudyMode = 'english-to-lithuanian';
          } else if (nextActivity.type === 'typing' && nextActivity.mode === 'lt-to-en') {
            effectiveStudyMode = 'lithuanian-to-english';
          }

          // Generate multiple choice options
          wordListManager.multipleChoiceOptions = [];
          wordListManager.generateMultipleChoiceOptions(effectiveStudyMode, nextActivity.type);
          wordListManager.notifyStateChange();
        }
      }
    }
  }, [selectNextDrillActivity, wordListManager, wordListState.allWords, studyMode]);

  // Move to next word in drill
  const moveToNextDrillWord = React.useCallback(() => {
    setDrillState(prev => {
      const nextIndex = prev.currentDrillIndex + 1;
      return {
        ...prev,
        currentDrillIndex: nextIndex,
        drillStats: {
          ...prev.drillStats,
          attempted: prev.drillStats.attempted + 1
        }
      };
    });
  }, []);

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
        const timer = setTimeout(() => {
          playAudio(drillState.currentWord.lithuanian);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [drillState.currentActivity, drillState.multipleChoiceMode, drillState.typingMode, drillState.currentWord, audioEnabled, playAudio]);

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
    
    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Handle the actual multiple choice logic
    await handleMultipleChoiceAnswer(selectedOption);
    
    // Move to next word after a delay (ensure minimum 2 seconds to show feedback)
    const delay = autoAdvance ? Math.max(defaultDelay, 2) : 2;
    setTimeout(() => {
      moveToNextDrillWord();
      advanceToNextDrillActivity();
    }, delay * 1000);
  }, [drillState.multipleChoiceMode, drillState.currentWord, handleMultipleChoiceAnswer, moveToNextDrillWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

  // Custom nextCard handler for drill mode that tracks stats
  const handleDrillNextCard = React.useCallback(() => {
    // For typing activities, we need to track the result based on the feedback
    const feedback = wordListState.typingFeedback;
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
    moveToNextDrillWord();
    advanceToNextDrillActivity();
  }, [wordListState.typingFeedback, moveToNextDrillWord, advanceToNextDrillActivity]);

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
    
    // Update drill stats
    setDrillState(prev => ({
      ...prev,
      drillStats: {
        ...prev.drillStats,
        correct: prev.drillStats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.drillStats.incorrect + (isCorrect ? 0 : 1)
      }
    }));

    // Handle the actual listening logic
    await handleMultipleChoiceAnswer(selectedOption);
    
    // Move to next word after a delay (ensure minimum 2 seconds to show feedback)
    const delay = autoAdvance ? Math.max(defaultDelay, 2) : 2;
    setTimeout(() => {
      moveToNextDrillWord();
      advanceToNextDrillActivity();
    }, delay * 1000);
  }, [drillState.listeningMode, drillState.currentWord, handleMultipleChoiceAnswer, moveToNextDrillWord, advanceToNextDrillActivity, autoAdvance, defaultDelay]);

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
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--color-success)' }}>
                  {drillState.drillStats.correct}
                </div>
                <div>Correct</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--color-error)' }}>
                  {drillState.drillStats.incorrect}
                </div>
                <div>Incorrect</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>
                  {accuracy}%
                </div>
                <div>Accuracy</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              className="w-button"
              onClick={() => {
                // Reset drill state for another round
                setDrillState(prev => ({
                  ...prev,
                  currentDrillIndex: 0,
                  currentActivity: null,
                  drillStats: { attempted: 0, correct: 0, incorrect: 0 }
                }));
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
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={drillState.multipleChoiceMode === 'en-to-lt' ? 'english-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          handleMultipleChoiceAnswer={handleDrillMultipleChoice}
        />
      ) : drillState.currentActivity === 'listening' ? (
        <ListeningActivity
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={drillState.listeningMode === 'easy' ? 'lithuanian-to-lithuanian' : 'lithuanian-to-english'}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleMultipleChoiceAnswer={handleDrillListening}
        />
      ) : drillState.currentActivity === 'typing' ? (
        <TypingActivity
          wordListManager={wordListManager}
          wordListState={wordListState}
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