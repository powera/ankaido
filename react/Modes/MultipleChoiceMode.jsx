
import React from 'react';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import StatsDisplay from '../Components/StatsDisplay';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
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
        'multiple-choice',
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

  // Stats update function - using session stats for MultipleChoiceMode
  const doUpdateStats = React.useCallback((currentWord, activityType, isCorrect) => {
    if (isCorrect) {
      wordListManager.updateSessionStatsCorrect();
    } else {
      wordListManager.updateSessionStatsIncorrect();
    }
  }, [wordListManager]);

  // Handle answer selection
  const handleAnswerClick = React.useCallback((selectedOption) => {
    // Update local state
    setSelectedAnswer(selectedOption);
    setShowAnswer(true);

    // Determine if answer is correct
    const correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    const isCorrect = selectedOption === correctAnswer;

    // Update stats
    doUpdateStats(currentWord, 'multipleChoice', isCorrect);

    // Handle auto-advance timing
    if (autoAdvance) {
      if (defaultDelay > 0) {
        // Advance after delay
        const timer = setTimeout(() => {
          handleAdvance(selectedOption);
        }, defaultDelay * 1000);
        setAutoAdvanceTimer(timer);
      } else {
        // Advance immediately if delay is 0 or less
        handleAdvance(selectedOption);
      }
    }
    // If auto-advance is disabled, user will need to click "Next Question" button
  }, [currentWord, studyMode, doUpdateStats, autoAdvance, defaultDelay]);

  // Handle advancing to next question
  const handleAdvance = React.useCallback((selectedOption) => {
    // Clear any existing timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    // Call the original handler if provided
    if (onAdvanceToNext) {
      onAdvanceToNext(selectedOption);
    }
  }, [autoAdvanceTimer, onAdvanceToNext]);

  // Handle manual next question button
  const handleNextQuestion = () => {
    handleAdvance(selectedAnswer);
  };

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <>
      <MultipleChoiceActivity
        currentWord={currentWord}
        showAnswer={showAnswer}
        selectedAnswer={selectedAnswer}
        onAnswerClick={handleAnswerClick}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        settings={settings}
      />

      {/* Show Next Question button when auto-advance is disabled and answer is shown */}
      {!autoAdvance && showAnswer && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <button 
            className="w-button w-button-primary" 
            onClick={handleNextQuestion}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
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

export default MultipleChoiceMode;
