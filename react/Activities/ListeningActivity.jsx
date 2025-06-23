
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';
import { createInitialActivityState, getCorrectAnswer } from '../Utilities/activityHelpers';

/**
 * Listening Activity Component
 * Plays audio of a word and asks user to select the correct translation or matching word
 */
const ListeningActivity = ({ 
  currentWord,
  showAnswer,
  selectedAnswer,
  multipleChoiceOptions,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer,
  settings
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);
  const [activityState, setActivityState] = React.useState(() =>
    createInitialActivityState(showAnswer || false, selectedAnswer || null)
  );

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [currentWord]);

  // Reset activity state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      selectedAnswer: null
    }));
  }, [currentWord]);

  // Early return after all hooks
  if (!currentWord || !multipleChoiceOptions?.length) return null;

  // Handle listening activity with stats tracking
  const handleListeningWithStats = React.useCallback(async (selectedOption) => {
    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);
    
    // Determine correct answer based on listening mode
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else {
      correctAnswer = getCorrectAnswer(currentWord, studyMode);
    }

    const isCorrect = selectedOption === correctAnswer;

    // Update local state
    setActivityState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Determine stats mode based on difficulty
    const statsMode = studyMode === 'lithuanian-to-lithuanian' ? 'listeningEasy' : 'listeningHard';

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(currentWord, statsMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in ListeningActivity:', error);
    }

    // Call the original handler for UI updates and flow control
    if (handleMultipleChoiceAnswer) {
      handleMultipleChoiceAnswer(selectedOption);
    }
  }, [currentWord, studyMode, handleMultipleChoiceAnswer]);

  // Generate instruction text based on study mode
  const getInstructionText = () => {
    switch (studyMode) {
      case 'lithuanian-to-english':
        return 'Choose the English translation:';
      case 'lithuanian-to-lithuanian':
        return 'Choose the matching Lithuanian word:';
      default:
        return 'Choose the matching Lithuanian word:';
    }
  };

  // Use external state if provided, otherwise use internal state
  const showAnswerToUse = showAnswer !== undefined ? showAnswer : activityState.showAnswer;
  const selectedAnswerToUse = selectedAnswer !== undefined ? selectedAnswer : activityState.selectedAnswer;

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode="listening"
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText="🎧 Listen and choose the correct answer:"
        showAudioButton={true}
        promptText={getInstructionText()}
        isClickable={false}
      />
      <MultipleChoiceOptions
        currentWord={currentWord}
        studyMode={studyMode}
        quizMode="listening"
        handleMultipleChoiceAnswer={handleListeningWithStats}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswerToUse}
        showAnswer={showAnswerToUse}
      />
    </div>
  );
};

export default ListeningActivity;
