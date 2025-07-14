import React from 'react';
import MultiWordSequenceActivity from '../Activities/MultiWordSequenceActivity';
import { generateMultiWordSequence, canGenerateMultiWordSequence } from '../Utilities/multiWordSequenceGenerator';
import StatsDisplay from '../Components/StatsDisplay';

const MultiWordSequenceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  autoAdvance,
  defaultDelay,
  settings
}) => {
  const [sequenceData, setSequenceData] = React.useState(null);
  const [selectedAnswers, setSelectedAnswers] = React.useState([]);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState(null);

  const currentWord = wordListManager?.getCurrentWord();

  // Generate sequence data when word changes or when we need a new sequence
  React.useEffect(() => {
    if (wordListState.allWords && wordListState.allWords.length > 0) {
      // Clear any existing auto-advance timer
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
      }

      // Check if we can generate a multi-word sequence
      if (canGenerateMultiWordSequence(wordListState.allWords)) {
        const sequence = generateMultiWordSequence(wordListState.allWords, {
          sequenceLength: settings?.sequenceLength || 4
        });
        setSequenceData(sequence);
      } else {
        setSequenceData(null);
      }

      // Reset answer state for new sequence
      setSelectedAnswers([]);
      setShowAnswer(false);
    }
  }, [currentWord, wordListState.allWords, settings?.sequenceLength]);

  const handleAnswerClick = React.useCallback(async (optionIndex, isCorrect, option) => {
    if (showAnswer) return;

    // For sequence mode, we don't toggle - we add in order
    // Only add if not already selected (since options get disabled when selected)
    if (!selectedAnswers.includes(optionIndex)) {
      const newSelectedAnswers = [...selectedAnswers, optionIndex];
      setSelectedAnswers(newSelectedAnswers);

      // Check if user has selected the correct number of words
      const requiredSelections = sequenceData?.sequenceLength || 4;
      if (newSelectedAnswers.length === requiredSelections) {
        // Show answer after user has made all selections
        setShowAnswer(true);

        // Calculate correctness - check if each selection is in the correct position
        const allCorrectInOrder = newSelectedAnswers.every((answerIndex, position) => {
          const selectedOption = sequenceData.options[answerIndex];
          const expectedWord = sequenceData.sequence[position];
          return expectedWord && 
            expectedWord.lithuanian === selectedOption.lithuanian && 
            expectedWord.english === selectedOption.english;
        });

        const finalCorrect = allCorrectInOrder;

        // Update session stats
        if (wordListManager) {
          wordListManager.updateSessionStats(finalCorrect);
        }

        // Handle auto-advance
        if (autoAdvance) {
          const timer = setTimeout(() => {
            wordListManager.nextCard();
            setAutoAdvanceTimer(null);
          }, defaultDelay * 1000);
          setAutoAdvanceTimer(timer);
        }
      }
    }
  }, [selectedAnswers, showAnswer, sequenceData, autoAdvance, defaultDelay, wordListManager]);

  const handleResetAnswers = React.useCallback(() => {
    if (!showAnswer) {
      setSelectedAnswers([]);
    }
  }, [showAnswer]);

  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  const handleNextCard = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.nextCard();
  };

  // Show error message if not enough words for multi-word sequence
  if (wordListState.allWords && !canGenerateMultiWordSequence(wordListState.allWords)) {
    return (
      <div className="multi-word-sequence-error">
        <h3>Multi-Word Sequence Mode Unavailable</h3>
        <p>
          This mode requires at least 20 words from the same corpus to generate sequences with sufficient options.
          Please enable more word groups or try a different study mode.
        </p>
        <div className="w-nav-controls">
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={handleNextCard}>Next →</button>
        </div>
        <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
      </div>
    );
  }

  if (!sequenceData) return null;

  return (
    <>
      <MultiWordSequenceActivity
        currentWord={sequenceData}
        showAnswer={showAnswer}
        selectedAnswers={selectedAnswers}
        sequenceOptions={sequenceData.options}
        audioEnabled={audioEnabled}
        onAnswerClick={handleAnswerClick}
        onResetAnswers={handleResetAnswers}
        settings={settings}
        allWords={wordListState.allWords}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
      />
      {sequenceData && (
        <div className="w-nav-controls">
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={handleNextCard}>Next →</button>
        </div>
      )}
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default MultiWordSequenceMode;