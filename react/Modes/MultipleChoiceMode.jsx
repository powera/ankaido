import React from 'react';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import StatsDisplay from '../Components/StatsDisplay';
import { journeyStatsManager } from '../Managers/journeyStatsManager';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
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
      // Clear any existing auto-advance timer
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
      }

      const options = generateMultipleChoiceOptions(
        currentWord,
        studyMode,
        'multiple-choice',
        wordListState,
        { difficulty: 'easy' }
      );
      setMultipleChoiceOptions(options);
      // Reset answer state when word changes
      setShowAnswer(false);
      setSelectedAnswer(null);
    }
  }, [currentWord, studyMode, wordListState.allWords]);

  const handleAnswerClick = React.useCallback(async (selectedOption, isCorrect) => {
    // Update local state
    setSelectedAnswer(selectedOption);
    setShowAnswer(true);

    // Update session stats with correctness information
    if (wordListManager && typeof isCorrect === 'boolean') {
      wordListManager.updateSessionStats(isCorrect);
    }

    // Update journey stats
    if (currentWord && typeof isCorrect === 'boolean') {
      try {
        await journeyStatsManager.updateWordStats(currentWord, 'multipleChoice', isCorrect);
      } catch (error) {
        console.error('Error updating journey stats:', error);
      }
    }

    // Handle auto-advance
    if (autoAdvance) {
      const timer = setTimeout(() => {
        wordListManager.nextCard();
        setAutoAdvanceTimer(null);
      }, defaultDelay * 1000);
      setAutoAdvanceTimer(timer);
    }
  }, [autoAdvance, defaultDelay, wordListManager, currentWord]);

  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  const handlePrevCard = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.prevCard();
  };

  const handleNextCard = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.nextCard();
  };

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <>
      <MultipleChoiceActivity
        currentWord={currentWord}
        studyMode={studyMode}
        quizMode="multiple-choice"
        onAnswerClick={handleAnswerClick}
        audioEnabled={audioEnabled}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
        allWords={wordListState.allWords}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
      />
      {currentWord && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={handlePrevCard}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={handleNextCard}>Next →</button>
        </div>
      )}
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default MultipleChoiceMode;