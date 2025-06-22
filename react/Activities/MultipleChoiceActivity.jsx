import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const MultipleChoiceActivity = ({ 
  wordListManager,
  wordListState,
  currentWord, // Accept currentWord as prop
  showAnswer, // Accept showAnswer as prop
  selectedAnswer, // Accept selectedAnswer as prop
  multipleChoiceOptions, // Accept multipleChoiceOptions as prop
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer,
  settings
}) => {
  const [activityState, setActivityState] = React.useState({
    showAnswer: showAnswer || false,
    selectedAnswer: selectedAnswer || null,
    autoAdvanceTimer: null
  });

  // Use currentWord from props, fallback to wordListManager if available
  const word = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null);

  if (!word) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Generate multiple choice options when word changes
  React.useEffect(() => {
    // No longer generating options internally
  }, [word, studyMode, settings?.difficulty, multipleChoiceOptions?.length]);

  const handleMultipleChoiceWithStats = React.useCallback(async (selectedOption) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? word.lithuanian : word.english;
    const isCorrect = selectedOption === correctAnswer;

    // Update local state
    setActivityState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Update Journey stats
    try {
      await journeyStatsManager.updateWordStats(word, 'multipleChoice', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in MultipleChoiceMode:', error);
    }

    // Call the original handler for UI updates and flow control
    if (handleMultipleChoiceAnswer) {
      handleMultipleChoiceAnswer(selectedOption);
    }
  }, [word, studyMode, handleMultipleChoiceAnswer]);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      selectedAnswer: null
    }));
  }, [word]);

  const question = studyMode === 'english-to-lithuanian' ? word.english : word.lithuanian;

  // Use props directly
  const showAnswerToUse = showAnswer !== undefined ? showAnswer : activityState.showAnswer;
  const selectedAnswerToUse = selectedAnswer !== undefined ? selectedAnswer : activityState.selectedAnswer;

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
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
        currentWord={word}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleMultipleChoiceWithStats}
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