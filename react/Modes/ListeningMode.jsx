
import React from 'react';
import ListeningActivity from '../Activities/ListeningActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import { getCorrectAnswer } from '../Utilities/activityHelpers';
import StatsDisplay from '../Components/StatsDisplay';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  onAdvanceToNext,
  settings,
  autoAdvance,
  defaultDelay
}) => {
  const [multipleChoiceOptions, setMultipleChoiceOptions] = React.useState([]);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState(null);
  
  const currentWord = wordListManager?.getCurrentWord();

  // Generate options when word changes
  React.useEffect(() => {
    if (currentWord) {
      const options = generateMultipleChoiceOptions(
        currentWord,
        studyMode,
        'listening',
        wordListState,
        settings
      );
      setMultipleChoiceOptions(options);
    }
  }, [currentWord?.lithuanian, currentWord?.english, studyMode, wordListState?.allWords, settings?.difficulty]);

  // Reset state when word changes
  React.useEffect(() => {
    setShowAnswer(false);
    setSelectedAnswer(null);
    // Clear any existing timer when word changes
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [currentWord, autoAdvanceTimer]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  // Stats update function - using session stats for ListeningMode
  const doUpdateStats = React.useCallback((currentWord, activityType, isCorrect) => {
    if (isCorrect) {
      wordListManager.updateSessionStatsCorrect();
    } else {
      wordListManager.updateSessionStatsIncorrect();
    }
  }, [wordListManager]);

  // Handle answer selection
  const handleAnswerClick = React.useCallback((selectedOption) => {
    // Update state
    setSelectedAnswer(selectedOption);
    setShowAnswer(true);

    // Determine correct answer based on listening mode
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else {
      correctAnswer = getCorrectAnswer(currentWord, studyMode);
    }

    const isCorrect = selectedOption === correctAnswer;

    // Update stats
    doUpdateStats(currentWord, 'listening', isCorrect);

    // Handle auto-advance timing
    if (autoAdvance) {
      if (defaultDelay > 0) {
        // Advance after delay
        const timer = setTimeout(() => {
          nextCard();
        }, defaultDelay * 1000);
        setAutoAdvanceTimer(timer);
      } else {
        // Advance immediately if delay is 0 or less
        nextCard();
      }
    }
    // If auto-advance is disabled, user must click "Next Question" button
  }, [currentWord, studyMode, doUpdateStats, autoAdvance, defaultDelay, nextCard]);

  // Handle manual advance (Next Question button)
  const handleManualAdvance = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    nextCard();
  };

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <>
      <ListeningActivity
        currentWord={currentWord}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        showAnswer={showAnswer}
        selectedAnswer={selectedAnswer}
        onAnswerClick={handleAnswerClick}
        settings={settings}
        wordListState={wordListState}
      />
      
      {/* Show Next Question button when auto-advance is disabled and answer is shown */}
      {!autoAdvance && showAnswer && (
        <div className="w-text-center w-mt-large">
          <button className="w-button w-button-primary" onClick={handleManualAdvance}>
            Next Question →
          </button>
        </div>
      )}
      
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
      
      {/* Navigation controls */}
      <div className="w-nav-controls">
        <button className="w-button" onClick={prevCard}>← Previous</button>
        <div className="w-nav-center"></div>
        <button className="w-button" onClick={nextCard}>Next →</button>
      </div>
    </>
  );
};

export default ListeningMode;
