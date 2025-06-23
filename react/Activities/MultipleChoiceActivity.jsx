import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';
import { createInitialActivityState, getQuestionText, createStatsHandler } from '../Utilities/activityHelpers';

/**
 * Multiple Choice Activity Component
 * Presents a word in one language and provides multiple choice options in another language
 */
const MultipleChoiceActivity = ({ 
  currentWord,
  showAnswer,
  selectedAnswer,
  multipleChoiceOptions,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer,
  settings,
  autoAdvance,
  defaultDelay
}) => {
  const [activityState, setActivityState] = React.useState(() => 
    createInitialActivityState(showAnswer || false, selectedAnswer || null)
  );
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState(null);

  // Reset activity state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      selectedAnswer: null
    }));
    // Clear any existing timer when word changes
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [currentWord, autoAdvanceTimer]);

  // Auto-play audio for LT->EN multiple choice (Lithuanian prompt, player chooses English answer)
  React.useEffect(() => {
    if (audioEnabled && currentWord && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, studyMode, audioEnabled, playAudio]);

  // Handle multiple choice selection with stats tracking
  const handleMultipleChoiceWithStats = React.useCallback(
    createStatsHandler(
      journeyStatsManager,
      currentWord,
      'multipleChoice',
      handleMultipleChoiceAnswer
    ),
    [currentWord, handleMultipleChoiceAnswer]
  );

  // Enhanced handler that also updates local state and manages auto-advance
  const handleAnswer = React.useCallback(async (selectedOption) => {
    // Prevent double-clicking by checking if answer is already shown
    if (activityState.showAnswer) return;

    const result = await handleMultipleChoiceWithStats(selectedOption);

    setActivityState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Set up auto-advance timer if enabled
    if (autoAdvance && defaultDelay > 0) {
      const timer = setTimeout(() => {
        // Call the parent handler without additional auto-advance logic
        if (handleMultipleChoiceAnswer) {
          handleMultipleChoiceAnswer(selectedOption);
        }
      }, defaultDelay * 1000);
      setAutoAdvanceTimer(timer);
    }
  }, [handleMultipleChoiceWithStats, activityState.showAnswer, autoAdvance, defaultDelay, handleMultipleChoiceAnswer]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  // Early return after all hooks
  if (!currentWord) return null;

  const question = getQuestionText(currentWord, studyMode);

  // Use external state if provided, otherwise use internal state
  const showAnswerToUse = showAnswer !== undefined ? showAnswer : activityState.showAnswer;
  const selectedAnswerToUse = selectedAnswer !== undefined ? selectedAnswer : activityState.selectedAnswer;

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        questionText={question}
        showHints={true}
        hintText="Choose the correct answer"
        style={{ padding: 'min(var(--spacing-large), 1rem)' }}
      />
      <MultipleChoiceOptions
        currentWord={currentWord}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleAnswer}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswerToUse}
        showAnswer={showAnswerToUse}
      />
    </div>
  );
};

export default MultipleChoiceActivity;