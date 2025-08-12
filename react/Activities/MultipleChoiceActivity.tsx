import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import ttsAudioManager from '../Managers/ttsAudioManager';
import { getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';
import { MultipleChoiceSettings, StudyMode, Word } from '../Utilities/types';

// Props interface for MultipleChoiceActivity component
export interface MultipleChoiceActivityProps {
  currentWord: Word | null;
  showAnswer: boolean;
  selectedAnswer: string | null;
  multipleChoiceOptions: string[];
  studyMode: StudyMode;
  audioEnabled: boolean;
  onAnswerClick?: (selectedOption: string, isCorrect: boolean) => void;
  settings?: MultipleChoiceSettings;
  allWords: Word[];
  autoAdvance?: boolean;
  defaultDelay?: number;
}

/**
 * Multiple Choice Activity Component
 * Presents a word in one language and provides multiple choice options in another language
 */
const MultipleChoiceActivity: React.FC<MultipleChoiceActivityProps> = ({ 
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
    if (audioEnabled && currentWord && studyMode === 'source-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        ttsAudioManager.playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, studyMode, audioEnabled]);

  // Handle answer click with correctness determination
  const handleAnswerClick = React.useCallback((selectedOption: string) => {
    if (!currentWord) return;
    
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
        audioManager={ttsAudioManager}
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
        allWords={allWords}
      />
    </div>
  );
};

export default MultipleChoiceActivity;