import React from 'react';
import AudioButton from './AudioButton';

const MultipleChoiceOptions = ({ 
  currentWord, // Accept currentWord as prop
  studyMode,
  quizMode,
  handleMultipleChoiceAnswer,
  audioEnabled,
  playAudio,
  preventAutoPlay,
  // Direct state props
  multipleChoiceOptions,
  selectedAnswer,
  showAnswer,
  wordListState
}) => {
  // Use currentWord from props
  const word = currentWord;
  
  // Use direct props
  const options = multipleChoiceOptions || [];
  const isAnswerSelected = selectedAnswer;
  const shouldShowAnswer = showAnswer;
  const wordsForTranslation = wordListState?.allWords || [];
  
  return (
    <div className="w-multiple-choice">
      {options.map((option, index) => {
        if (!word) return null;

        // Determine correct answer based on mode
        let correctAnswer;
        if (quizMode === 'listening') {
          if (studyMode === 'lithuanian-to-lithuanian') {
            correctAnswer = word.lithuanian;
          } else {
            correctAnswer = studyMode === 'lithuanian-to-english' ? word.english : word.lithuanian;
          }
        } else {
          correctAnswer = studyMode === 'english-to-lithuanian' ? word.lithuanian : word.english;
        }

        const isCorrect = option === correctAnswer;
        const isSelected = option === isAnswerSelected;
        let className = 'w-choice-option';

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
        let translation = null;
        if (shouldShowAnswer) {
          if (studyMode === 'lithuanian-to-lithuanian') {
            // For LT-to-LT mode, show English translation
            if (isCorrect) {
              translation = word.english;
            } else {
              // Find the word that matches this Lithuanian option
              const matchingWord = wordsForTranslation?.find(w => w.lithuanian === option);
              if (matchingWord) {
                translation = matchingWord.english;
              }
            }
          } else if (isCorrect) {
            // For correct answer, show the opposite translation
            translation = studyMode === 'lithuanian-to-english' ? word.lithuanian : word.english;
          } else {
            // For all other options, find the word that matches this option
            const matchingWord = wordsForTranslation?.find(w => 
              (studyMode === 'lithuanian-to-english' ? w.english : w.lithuanian) === option ||
              (studyMode === 'english-to-lithuanian' ? w.lithuanian : w.english) === option
            );
            if (matchingWord) {
              translation = studyMode === 'lithuanian-to-english' ? matchingWord.lithuanian : matchingWord.english;
            }
          }
        }

        const handleOptionClick = () => {
          if (shouldShowAnswer) return;

          // Play audio immediately for correct answers in EN->LT mode
          if (audioEnabled && studyMode === 'english-to-lithuanian' && quizMode !== 'listening' && isCorrect) {
            playAudio(option); // option is the Lithuanian word in EN->LT mode
          }

          handleMultipleChoiceAnswer(option);
        };

        return (
          <button
            key={index}
            className={className}
            onClick={handleOptionClick}
            disabled={shouldShowAnswer}
          >
            <div className="trakaido-choice-content">
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontWeight: '500' }}>{option}</div>
                {shouldShowAnswer && translation && (
                  <div style={{ 
                    fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', 
                    marginTop: '2px', 
                    opacity: 0.8
                  }}>
                    <span style={{ color: (isCorrect || isSelected) ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)' }}>
                      ({translation})
                    </span>
                  </div>
                )}
              </div>
              {shouldShowAnswer && isCorrect && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center'
                }}>
                  <AudioButton 
                    word={studyMode === 'english-to-lithuanian' ? option : word.lithuanian}
                    audioEnabled={audioEnabled}
                    playAudio={playAudio}
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