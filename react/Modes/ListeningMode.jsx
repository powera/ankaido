import React from 'react';
import ListeningActivity from '../Activities/ListeningActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import StatsDisplay from '../Components/StatsDisplay';
import { journeyStatsManager } from '../Managers/journeyStatsManager';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  autoAdvance,
  defaultDelay
}) => {
  const [multipleChoiceOptions, setMultipleChoiceOptions] = React.useState([]);
  const [answerState, setAnswerState] = React.useState({
    showAnswer: false,
    selectedAnswer: null
  });
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
        'listening',
        wordListState,
        { difficulty: 'easy' }
      );
      setMultipleChoiceOptions(options);
      // Reset answer state for new word
      setAnswerState({
        showAnswer: false,
        selectedAnswer: null
      });
    }
  }, [currentWord, studyMode, wordListState.allWords]);

  const handleAnswerClick = React.useCallback(async (selectedOption, isCorrect) => {
    // Update local answer state
    setAnswerState({
      showAnswer: true,
      selectedAnswer: selectedOption
    });

    // Update session stats with correctness information
    if (wordListManager && typeof isCorrect === 'boolean') {
      wordListManager.updateSessionStats(isCorrect);
    }

    // Update journey stats
    if (currentWord && typeof isCorrect === 'boolean') {
      try {
        // Determine stats mode based on study mode
        let statsMode;
        switch (studyMode) {
          case 'lithuanian-to-lithuanian':
          case 'english-to-lithuanian':
            statsMode = 'listeningEasy';
            break;
          case 'lithuanian-to-english':
            statsMode = 'listeningHard';
            break;
          default:
            statsMode = 'listeningHard';
        }
        await journeyStatsManager.updateWordStats(currentWord, statsMode, isCorrect);
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
  }, [autoAdvance, defaultDelay, wordListManager, currentWord, studyMode]);

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
      <ListeningActivity
        currentWord={currentWord}
        showAnswer={answerState.showAnswer}
        selectedAnswer={answerState.selectedAnswer}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        onAnswerClick={handleAnswerClick}
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

export default ListeningMode;