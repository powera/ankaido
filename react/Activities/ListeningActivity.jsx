
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const ListeningActivity = ({ 
  currentWord, // Accept currentWord as prop
  showAnswer, // Accept showAnswer as prop
  selectedAnswer, // Accept selectedAnswer as prop
  multipleChoiceOptions, // Accept multipleChoiceOptions as prop (required)
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer,
  settings
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);
  const [activityState, setActivityState] = React.useState({
    showAnswer: showAnswer || false,
    selectedAnswer: selectedAnswer || null,
    autoAdvanceTimer: null
  });

  const word = currentWord;
  
  if (!word || !multipleChoiceOptions?.length) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [word]);

  

  // Enhanced listening handler that updates Journey stats
  const handleListeningWithStats = React.useCallback(async (selectedOption) => {
    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);
    
    // Determine correct answer based on study mode for listening
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = word.lithuanian;
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? word.english : word.lithuanian;
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

    // Update Journey stats with appropriate mode
    try {
      await journeyStatsManager.updateWordStats(word, statsMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in ListeningMode:', error);
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

  const instructionText = studyMode === 'lithuanian-to-english' 
    ? 'Choose the English translation:'
    : studyMode === 'lithuanian-to-lithuanian'
      ? 'Choose the matching Lithuanian word:'
      : 'Choose the matching Lithuanian word:';

  // Use props directly
  const showAnswerToUse = showAnswer !== undefined ? showAnswer : activityState.showAnswer;
  const selectedAnswerToUse = selectedAnswer !== undefined ? selectedAnswer : activityState.selectedAnswer;

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
        studyMode="listening"
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText="🎧 Listen and choose the correct answer:"
        showAudioButton={true}
        promptText={instructionText}
        isClickable={false}
      />
      <MultipleChoiceOptions
        currentWord={word}
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
