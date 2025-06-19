import React from 'react';
import AudioButton from './AudioButton';

const MultipleChoiceOptions = ({ 
  wordListManager,
  wordListState,
  studyMode,
  quizMode,
  handleMultipleChoiceAnswer,
  audioEnabled,
  playAudio
}) => {
  return (
    <div className="w-multiple-choice">
      {wordListState.multipleChoiceOptions.map((option, index) => {
        const currentWord = wordListManager.getCurrentWord();
        if (!currentWord) return null;
        
        // Determine correct answer based on mode
        let correctAnswer;
        if (quizMode === 'listening') {
          if (studyMode === 'lithuanian-to-lithuanian') {
            correctAnswer = currentWord.lithuanian;
          } else {
            correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
          }
        } else {
          correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
        }
        
        const isCorrect = option === correctAnswer;
        const isSelected = option === wordListState.selectedAnswer;
        let className = 'w-choice-option';
        
        if (wordListState.showAnswer) {
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
        if (wordListState.showAnswer) {
          if (studyMode === 'lithuanian-to-lithuanian') {
            // For LT-to-LT mode, show English translation
            if (isCorrect) {
              translation = currentWord.english;
            } else {
              // Find the word that matches this Lithuanian option
              const matchingWord = wordListState.allWords.find(w => w.lithuanian === option);
              if (matchingWord) {
                translation = matchingWord.english;
              }
            }
          } else if (isCorrect) {
            // For correct answer, show the opposite translation
            translation = studyMode === 'lithuanian-to-english' ? currentWord.lithuanian : currentWord.english;
          } else {
            // For all other options, find the word that matches this option
            const matchingWord = wordListState.allWords.find(w => 
              (studyMode === 'lithuanian-to-english' ? w.english : w.lithuanian) === option ||
              (studyMode === 'english-to-lithuanian' ? w.lithuanian : w.english) === option
            );
            if (matchingWord) {
              translation = studyMode === 'lithuanian-to-english' ? matchingWord.lithuanian : matchingWord.english;
            }
          }
        }

        const handleOptionClick = () => {
          if (wordListState.showAnswer) return;
          
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
            disabled={wordListState.showAnswer}
          >
            <div className="trakaido-choice-content">
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontWeight: '500' }}>{option}</div>
                {wordListState.showAnswer && translation && (
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
              {wordListState.showAnswer && isCorrect && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center'
                }}>
                  <AudioButton 
                    word={studyMode === 'english-to-lithuanian' ? option : currentWord.lithuanian}
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