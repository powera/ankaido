import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import audioManager from '../Managers/audioManager';
import { getQuestionText, getCorrectAnswer } from '../Utilities/activityHelpers';

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
  onAnswerClick,
  settings,
  allWords,
  autoAdvance,
  defaultDelay
}) => {
  // Auto-play audio for LT->EN multiple choice (Lithuanian prompt, player chooses English answer)
  React.useEffect(() => {
    if (audioEnabled && currentWord && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        audioManager.playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, studyMode, audioEnabled, audioManager]);

  // Handle answer click with correctness determination
  const handleAnswerClick = React.useCallback((selectedOption) => {
    const correctAnswer = getCorrectAnswer(currentWord, studyMode);
    const isCorrect = selectedOption === correctAnswer;
    
    // Call the onAnswerClick callback with correctness information
    if (onAnswerClick) {
      onAnswerClick(selectedOption, isCorrect);
    }
  }, [onAnswerClick, currentWord, studyMode]);

  // Early return after all hooks
  if (!currentWord) return null;

  const question = getQuestionText(currentWord, studyMode);

  // Generate hint text based on answer state
  const getHintText = () => {
    if (!showAnswer) {
      return "Choose the correct answer";
    }
    
    // Determine if the selected answer was correct
    const correctAnswer = getCorrectAnswer(currentWord, studyMode);
    const isCorrect = selectedAnswer === correctAnswer;
    
    let hintText = isCorrect ? "Correct" : "Incorrect";
    
    // Add auto-advance information if enabled
    if (autoAdvance && defaultDelay) {
      hintText += ` - will advance after ${defaultDelay} second${defaultDelay !== 1 ? 's' : ''}`;
    }
    
    return hintText;
  };

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        questionText={question}
        showHints={true}
        hintText={getHintText()}
        style={{ padding: 'min(var(--spacing-large), 1rem)' }}
      />
      <MultipleChoiceOptions
        currentWord={currentWord}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleAnswerClick}
        audioEnabled={audioEnabled}
        playAudio={audioManager.playAudio.bind(audioManager)}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
        allWords={allWords}
      />
    </div>
  );
};

export default MultipleChoiceActivity;