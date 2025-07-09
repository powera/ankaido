
import React from 'react';
import AudioButton from './AudioButton';
import audioManager from '../Managers/audioManager';

const WordDisplayCard = ({
  currentWord,
  studyMode,
  audioEnabled,
  showAnswer = false,
  questionText = null,
  answerText = null,
  children,
  className = '',
  style = {},
  showBadge = true,
  showAudioButton = true,
  isClickable = false,
  onClick = null,
  showHints = false,
  hintText = null
}) => {
  if (!currentWord) return null;

  // Determine question and answer based on study mode if not provided
  const question = questionText || (studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian);
  const answer = answerText || (studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english);

  // Determine which word to use for audio
  const audioWord = currentWord.lithuanian;

  // Determine if we should show the audio button based on study mode and showAudioButton prop
  const shouldShowAudioButton = showAudioButton && audioEnabled && (
    (studyMode === 'lithuanian-to-english') ||
    (studyMode === 'english-to-lithuanian' && showAnswer) ||
    (studyMode === 'listening')
  );

  const cardClasses = `w-card ${isClickable ? 'w-card-interactive' : ''} ${className}`;

  return (
    <div 
      className={cardClasses} 
      style={style}
      onClick={isClickable ? onClick : undefined}
    >
      {showBadge && (
        <div className="w-badge w-hide-mobile">
          {currentWord.corpus} → {currentWord.group}
        </div>
      )}
      
      <div 
        className="w-question"
        style={{ 
          fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
          marginBottom: 'clamp(1rem, 3vw, var(--spacing-large))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <span>{question}</span>
          {shouldShowAudioButton && (studyMode === 'lithuanian-to-english' || studyMode === 'listening') && (
            <AudioButton 
              word={audioWord}
              audioEnabled={audioEnabled}
              playAudio={audioManager.playAudio.bind(audioManager)}
            />
          )}
        </div>
      </div>

      {showAnswer && (
        <div className="trakaido-answer-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span>{answer}</span>
            {shouldShowAudioButton && studyMode === 'english-to-lithuanian' && (
              <AudioButton 
                word={audioWord}
                audioEnabled={audioEnabled}
                playAudio={audioManager.playAudio.bind(audioManager)}
              />
            )}
          </div>
        </div>
      )}

      {showHints && hintText && (
        <div style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: '0.9rem', 
          marginTop: 'var(--spacing-base)',
          textAlign: 'center'
        }}>
          {hintText}
        </div>
      )}

      {!showAnswer && !showHints && isClickable && (
        <div style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: '0.9rem', 
          marginTop: 'var(--spacing-base)',
          textAlign: 'center'
        }}>
          Click to reveal answer
        </div>
      )}

      {children}
    </div>
  );
};

export default WordDisplayCard;
