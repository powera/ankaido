
import React from 'react';
import audioManager from '../Managers/audioManager';
import { Word } from '../Utilities/types';
import AudioButton from './AudioButton';

// Props interface for WordDisplayCard component
// Note: Component is hardcoded for 'source-to-english' mode (Lithuanian question, English answer)
export interface WordDisplayCardProps {
  currentWord: Word | null;
  audioEnabled: boolean;
  showAnswer?: boolean;
  questionText?: string | null;
  answerText?: string | null;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showBadge?: boolean;
  showAudioButton?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  showHints?: boolean;
  hintText?: string | null;
}

const WordDisplayCard: React.FC<WordDisplayCardProps> = ({
  currentWord,
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
  onClick,
  showHints = false,
  hintText = null
}) => {
  if (!currentWord) return null;

  // For 'source-to-english' mode: Lithuanian question, English answer
  const question = questionText || currentWord.lithuanian;
  const answer = answerText || currentWord.english;

  // Audio is always Lithuanian (source language)
  const audioWord = currentWord.lithuanian;

  // Show audio button when enabled and either:
  // 1. General audio button is requested, or
  // 2. It's a listening activity (indicated by 🎧 in question text)
  const shouldShowAudioButton = showAudioButton && audioEnabled;

  // Helper function to pretty-print level names
  const formatLevel = (level: string): string => {
    return level.replace(/level_(\d+)/i, 'Level $1').replace(/_/g, ' ');
  };

  const cardClasses = `w-card ${isClickable ? 'w-card-interactive' : ''} ${className}`;

  return (
    <div 
      className={cardClasses} 
      style={style}
      onClick={isClickable ? onClick : undefined}
    >
      {showBadge && (
        <div className="w-badge w-hide-mobile">
          {currentWord.levels && currentWord.levels.length > 0 ? (
            // Show only levels if they exist
            currentWord.levels.map(formatLevel).join(', ')
          ) : (
            // Show corpus and group if no levels
            `${currentWord.corpus} → ${currentWord.group}`
          )}
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
          {shouldShowAudioButton && (
            <AudioButton 
              word={audioWord}
              audioEnabled={audioEnabled}
              audioManager={audioManager}
            />
          )}
        </div>
      </div>

      {showAnswer && (
        <div className="trakaido-answer-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span>{answer}</span>
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
