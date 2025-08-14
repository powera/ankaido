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
            correctAnswer = word.term || word.lithuanian;
          } else {
            correctAnswer = studyMode === 'source-to-english' ? (word.definition || word.english) : (word.term || word.lithuanian);
          }
        } else {
          correctAnswer = studyMode === 'english-to-source' ? (word.term || word.lithuanian) : (word.definition || word.english);
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
            // For source-to-source mode, show definition translation
            if (isCorrect) {
              translation = word.definition || word.english;
            } else {
              // Find the word that matches this term option
              const matchingWord: Word | undefined = wordsForTranslation?.find(w => (w.term || w.lithuanian) === option);
              if (matchingWord) {
                translation = matchingWord.definition || matchingWord.english;
              }
            }
          } else if (studyMode === 'source-to-english') {
            // Term question, definition answers - show term translation for all options
            if (isCorrect) {
              translation = word.term || word.lithuanian;
            } else {
              // Find the word that matches this definition option
              const matchingWord: Word | undefined = wordsForTranslation?.find(w => (w.definition || w.english) === option);
              if (matchingWord) {
                translation = matchingWord.term || matchingWord.lithuanian;
              }
            }
          } else if (studyMode === 'english-to-source') {
            // Definition question, term answers - show definition translation for all options
            if (isCorrect) {
              translation = word.definition || word.english;
            } else {
              // Find the word that matches this term option
              const matchingWord: Word | undefined = wordsForTranslation?.find(w => (w.term || w.lithuanian) === option);
              if (matchingWord) {
                translation = matchingWord.definition || matchingWord.english;
              }
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
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MultipleChoiceOptions;