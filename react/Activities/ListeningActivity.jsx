
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import audioManager from '../Managers/audioManager';

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
  onAnswerClick,
  settings,
  allWords,
  autoAdvance,
  defaultDelay
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [currentWord]);

  // Auto-play audio for listening activities
  React.useEffect(() => {
    if (audioEnabled && currentWord && !preventAutoPlay) {
      // Small delay to ensure the UI has updated and audio context is ready
      const timer = setTimeout(async () => {
        try {
          await audioManager.playAudio(currentWord.lithuanian);
        } catch (error) {
          console.warn('Auto-play failed, user interaction may be required:', error);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentWord, audioEnabled, preventAutoPlay]);

  // Handle answer click
  const handleAnswerClick = React.useCallback((selectedOption) => {
    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);
    
    // Determine correct answer based on study mode
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else if (studyMode === 'lithuanian-to-english') {
      correctAnswer = currentWord.english;
    } else {
      correctAnswer = currentWord.lithuanian; // Default fallback
    }

    const isCorrect = selectedOption === correctAnswer;
    
    // Call the onAnswerClick callback with correctness information
    if (onAnswerClick) {
      onAnswerClick(selectedOption, isCorrect);
    }
  }, [onAnswerClick, studyMode, currentWord]);

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

  // Generate hint text based on answer state
  const getHintText = () => {
    if (!showAnswer) {
      return getInstructionText();
    }
    
    // Determine if the selected answer was correct
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else if (studyMode === 'lithuanian-to-english') {
      correctAnswer = currentWord.english;
    } else {
      correctAnswer = currentWord.lithuanian; // Default fallback
    }
    
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
        questionText="🎧 Listen and choose the correct answer:"
        showAudioButton={true}
        showHints={true}
        hintText={getHintText()}
        isClickable={false}
      />
      <MultipleChoiceOptions
        currentWord={currentWord}
        studyMode={studyMode}
        quizMode="listening"
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

export default ListeningActivity;
