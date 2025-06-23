import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';

/**
 * Listening Activity Component
 * Plays audio of a word and asks user to select the correct translation or matching word
 */
const ListeningActivity = ({ 
  currentWord,
  multipleChoiceOptions,
  studyMode,
  audioEnabled,
  playAudio,
  // Controlled props from Mode
  showAnswer,
  selectedAnswer,
  onAnswerClick,
  // Optional props
  settings,
  wordListState
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [currentWord]);

  // Auto-play audio for listening activities
  React.useEffect(() => {
    if (audioEnabled && currentWord && !preventAutoPlay) {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, audioEnabled, playAudio, preventAutoPlay]);

  // Handle answer selection
  const handleAnswerClick = React.useCallback((selectedOption) => {
    // Prevent double-clicking by checking if answer is already shown
    if (showAnswer) return;

    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);

    // Call the callback provided by the Mode
    if (onAnswerClick) {
      onAnswerClick(selectedOption);
    }
  }, [showAnswer, onAnswerClick]);

  // Early return after all hooks
  if (!currentWord || !multipleChoiceOptions?.length) return null;

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
        handleMultipleChoiceAnswer={handleAnswerClick}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
        wordListState={wordListState}
      />
    </div>
  );
};

export default ListeningActivity;