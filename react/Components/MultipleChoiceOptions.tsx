import React from 'react';
import { AudioManager, StudyMode, Word } from '../Utilities/types';
import AudioButton from './AudioButton';

// Props interface for MultipleChoiceOptions component
export interface MultipleChoiceOptionsProps {
  currentWord: Word | null;
  studyMode: StudyMode;
  quizMode: 'multiple-choice' | 'listening';
  handleMultipleChoiceAnswer: (answer: string) => void;
  audioEnabled: boolean;
  audioManager: AudioManager;
  preventAutoPlay?: boolean;
  selectedVoice?: string;
  multipleChoiceOptions: string[];
  selectedAnswer: string | null;
  showAnswer: boolean;
  allWords: Word[];
}

const MultipleChoiceOptions: React.FC<MultipleChoiceOptionsProps> = ({ 
  currentWord, // Accept currentWord as prop
  studyMode,
  quizMode,
  handleMultipleChoiceAnswer,
  audioEnabled,
  audioManager,
  preventAutoPlay,
  selectedVoice,
  // Direct state props
  multipleChoiceOptions,
  selectedAnswer,
  showAnswer,
  allWords
}) => {
  // Use currentWord from props
  const word = currentWord;
  
  // Use direct props
  const options = multipleChoiceOptions || [];
  const isAnswerSelected = selectedAnswer;
  const shouldShowAnswer = showAnswer;
  const wordsForTranslation = allWords || [];
  
  return (
    <div className="w-multiple-choice">
      {options.map((option, index) => {
        if (!word) return null;

        // Determine correct answer based on mode
        let correctAnswer: string;
        if (quizMode === 'listening') {
          if (studyMode === 'source-to-source') {
            correctAnswer = word.lithuanian;
          } else {
            correctAnswer = studyMode === 'source-to-english' ? word.english : word.lithuanian;
          }
        } else {
          correctAnswer = studyMode === 'english-to-source' ? word.lithuanian : word.english;
        }

        const isCorrect: boolean = option === correctAnswer;
        const isSelected: boolean = option === isAnswerSelected;
        let className: string = 'w-choice-option';

        if (shouldShowAnswer) {
          if (isCorrect) {
            className += ' w-correct';
          } else if (isSelected && !isCorrect) {
            className += ' w-incorrect';
          } else if (!isSelected) {
            className += ' w-unselected';
          }
        }

        // Find the translation for all options when showAnswer is true
        let translation: string | null = null;
        if (shouldShowAnswer) {
          if (studyMode === 'source-to-source') {
            // For source-to-source mode, show English translation
            if (isCorrect) {
              translation = word.english;
            } else {
              // Find the word that matches this Lithuanian option
              const matchingWord: Word | undefined = wordsForTranslation?.find(w => w.lithuanian === option);
              if (matchingWord) {
                translation = matchingWord.english;
              }
            }
          } else if (isCorrect) {
            // For correct answer, show the opposite translation
            translation = studyMode === 'lithuanian-to-english' ? word.lithuanian : word.english;
          } else {
            // For all other options, find the word that matches this option
            const matchingWord: Word | undefined = wordsForTranslation?.find(w => 
              (studyMode === 'lithuanian-to-english' ? w.english : w.lithuanian) === option ||
              (studyMode === 'english-to-lithuanian' ? w.lithuanian : w.english) === option
            );
            if (matchingWord) {
              translation = studyMode === 'lithuanian-to-english' ? matchingWord.lithuanian : matchingWord.english;
            }
          }
        }

        const handleOptionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
          // Check if the click came from the audio button
          if ((e.target as HTMLElement).closest('.w-audio-button') || (e.target as HTMLElement).closest('.trakaido-audio-button-container')) {
            return; // Don't handle option click if it's from the audio button
          }
          
          if (shouldShowAnswer) return;

          // Play audio immediately for correct answers in EN->LT mode
          if (audioEnabled && studyMode === 'english-to-lithuanian' && quizMode !== 'listening' && isCorrect) {
            audioManager.playAudio(option); // option is the Lithuanian word in EN->LT mode
          }

          handleMultipleChoiceAnswer(option);
        };

        return (
          <button
            key={index}
            className={className}
            onClick={handleOptionClick}
            aria-disabled={shouldShowAnswer}
            style={{ cursor: shouldShowAnswer ? 'not-allowed' : 'pointer' }}
          >
            <div className="trakaido-choice-content">
              <div className="trakaido-choice-text-container">
                <div className="trakaido-choice-answer">{option}</div>
                {shouldShowAnswer && translation && (
                  <div className={`trakaido-choice-translation ${(isCorrect || isSelected) ? 'correct-selected' : 'unselected'}`}>
                    ({translation})
                  </div>
                )}
              </div>
              {shouldShowAnswer && isCorrect && (
                <div className="trakaido-audio-button-container">
                  <AudioButton 
                    word={studyMode === 'english-to-lithuanian' ? option : word.lithuanian}
                    audioEnabled={audioEnabled}
                    audioManager={audioManager}
                    size="small"
                    asSpan={true}
                  />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MultipleChoiceOptions;