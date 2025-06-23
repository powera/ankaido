import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import { getQuestionText } from '../Utilities/activityHelpers';

/**
 * Multiple Choice Activity Component
 * Presents a word in one language and provides multiple choice options in another language
 */
const MultipleChoiceActivity = ({ 
  currentWord,
  showAnswer,
  selectedAnswer,
  onAnswerClick,
  multipleChoiceOptions,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  settings
}) => {
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

  // Handle answer selection
  const handleAnswer = React.useCallback((selectedOption) => {
    // Prevent double-clicking by checking if answer is already shown
    if (showAnswer) return;

    // Immediately play audio for correct answers in EN->LT mode
    if (audioEnabled && studyMode === 'english-to-lithuanian') {
      const correctAnswer = currentWord.lithuanian;
      if (selectedOption === correctAnswer) {
        playAudio(selectedOption);
      }
    }

    // Call the provided callback
    if (onAnswerClick) {
      onAnswerClick(selectedOption);
    }
  }, [showAnswer, audioEnabled, studyMode, currentWord, playAudio, onAnswerClick]);

  // Early return after all hooks
  if (!currentWord) return null;

  const question = getQuestionText(currentWord, studyMode);

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
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
      />
    </div>
  );
};

export default MultipleChoiceActivity;