
import React from 'react';
import AudioButton from './AudioButton';

const MultipleChoiceOptions = ({ 
  wordListManager,
  wordListState,
  studyMode,
  quizMode,
  handleMultipleChoiceAnswer,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd
}) => {
  return (
    <div className="w-multiple-choice">
      {wordListState.multipleChoiceOptions.map((option, index) => {
        const currentWord = wordListManager.getCurrentWord();
        if (!currentWord) return null;
        
        // Determine correct answer based on mode
        let correctAnswer;
        if (quizMode === 'listening') {
          correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
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

        // Find the translation for any answer when showAnswer is true
        let translation = null;
        if (wordListState.showAnswer) {
          if (isCorrect) {
            // For correct answer, show the opposite translation
            translation = studyMode === 'lithuanian-to-english' ? currentWord.lithuanian : currentWord.english;
          } else {
            // For incorrect answers, find the word that matches this option
            const wrongWord = wordListState.allWords.find(w => 
              (studyMode === 'lithuanian-to-english' ? w.english : w.lithuanian) === option
            );
            if (wrongWord) {
              translation = studyMode === 'lithuanian-to-english' ? wrongWord.lithuanian : wrongWord.english;
            }
          }
        }

        // Find the translation for incorrect selected answer (non-listening mode)
        let incorrectTranslation = null;
        if (wordListState.showAnswer && isSelected && !isCorrect && quizMode !== 'listening') {
          const wrongWord = wordListState.allWords.find(w => 
            (studyMode === 'english-to-lithuanian' ? w.lithuanian : w.english) === option
          );
          if (wrongWord) {
            incorrectTranslation = studyMode === 'english-to-lithuanian' ? wrongWord.english : wrongWord.lithuanian;
          }
        }

        const shouldShowAudioOnHover = audioEnabled && studyMode === 'english-to-lithuanian' && quizMode !== 'listening';
        const audioWord = option; // In EN->LT mode, options are Lithuanian words

        return (
          <button
            key={index}
            className={className}
            onClick={() => !wordListState.showAnswer && handleMultipleChoiceAnswer(option)}
            onMouseEnter={() => shouldShowAudioOnHover && handleHoverStart && handleHoverStart(audioWord)}
            onMouseLeave={() => shouldShowAudioOnHover && handleHoverEnd && handleHoverEnd()}
            disabled={wordListState.showAnswer}
          >
            <div className="trakaido-choice-content">
              <div style={{ textAlign: 'center' }}>
                <span>{option}</span>
                {translation && wordListState.showAnswer && quizMode === 'listening' && (
                  <div style={{ fontSize: '0.8rem', color: (isCorrect || isSelected) ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)', marginTop: '4px' }}>
                    ({translation})
                  </div>
                )}
                {incorrectTranslation && quizMode !== 'listening' && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                    ({incorrectTranslation})
                  </div>
                )}
              </div>
              {wordListState.showAnswer && isCorrect && (
                <div style={{ display: 'inline-block', marginLeft: '8px' }}>
                  <AudioButton 
                    word={studyMode === 'english-to-lithuanian' ? option : currentWord.lithuanian}
                    audioEnabled={audioEnabled}
                    playAudio={playAudio}
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
