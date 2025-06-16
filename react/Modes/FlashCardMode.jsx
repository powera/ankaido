
import React from 'react';
import AudioButton from '../Components/AudioButton';

const FlashCardMode = ({ 
  currentWord, 
  showAnswer, 
  setShowAnswer, 
  studyMode, 
  audioEnabled, 
  playAudio, 
  handleHoverStart, 
  handleHoverEnd 
}) => {
  if (!currentWord) return null;

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;

  return (
    <div className="w-card w-card-interactive" onClick={() => setShowAnswer(!showAnswer)}>
      <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>
      <div 
        className="w-question"
        onMouseEnter={() => audioEnabled && studyMode === 'lithuanian-to-english' && handleHoverStart(question)}
        onMouseLeave={handleHoverEnd}
        style={{ cursor: audioEnabled && studyMode === 'lithuanian-to-english' ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <span>{question}</span>
          {studyMode === 'lithuanian-to-english' && (
            <AudioButton 
              word={currentWord.lithuanian}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          )}
        </div>
      </div>
      {showAnswer && (
        <div className="trakaido-answer-text">
          <span>{answer}</span>
          {studyMode === 'english-to-lithuanian' && (
            <AudioButton 
              word={currentWord.lithuanian}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          )}
        </div>
      )}
      {!showAnswer && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 'var(--spacing-base)' }}>
          Click to reveal answer
          {audioEnabled && studyMode === 'lithuanian-to-english' && (
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              (Hover over Lithuanian word to hear pronunciation)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlashCardMode;
