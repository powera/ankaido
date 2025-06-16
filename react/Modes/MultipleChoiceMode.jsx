
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer
}) => {
  const currentWord = wordListManager.getCurrentWord();
  if (!currentWord) return null;

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;

  return (
    <div>
      <div className="w-card" style={{ padding: 'min(var(--spacing-large), 1rem)' }}>
        <div className="w-badge w-hide-mobile">{currentWord.corpus} → {currentWord.group}</div>
        <div 
          className="w-question"
          onMouseEnter={() => audioEnabled && studyMode === 'lithuanian-to-english' && handleHoverStart(question)}
          onMouseLeave={handleHoverEnd}
          style={{ 
            cursor: audioEnabled && studyMode === 'lithuanian-to-english' ? 'pointer' : 'default',
            fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
            marginBottom: 'clamp(1rem, 3vw, var(--spacing-large))'
          }}
        >
          {question}
        </div>
        <div className="w-hide-mobile" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 'var(--spacing-base)' }}>
          Choose the correct answer:
          {audioEnabled && (
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {studyMode === 'lithuanian-to-english' 
                ? '(Hover over Lithuanian words for 0.9 seconds to hear pronunciation)'
                : '(Hover over answer choices for 0.9 seconds to hear pronunciation)'}
            </div>
          )}
        </div>
      </div>
      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
      />
    </div>
  );
};

export default MultipleChoiceMode;
