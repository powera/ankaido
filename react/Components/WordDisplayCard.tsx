
import React from 'react';
import audioManager from '../Managers/audioManager';
import { StudyMode, Word } from '../Utilities/types';
import AudioButton from './AudioButton';

// Props interface for WordDisplayCard component
export interface WordDisplayCardProps {
  currentWord: Word | null;
  studyMode: StudyMode;
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
  onClick,
  showHints = false,
  hintText = null
}) => {
  if (!currentWord) return null;

  // Determine question and answer based on study mode if not provided
  const question = questionText || (studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian);
  const answer = answerText || (studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english);

  // Determine which word to use for audio
  const audioWord = currentWord.lithuanian;

  // Create a wrapper function to match AudioButton's expected signature
  const playAudioWrapper = async (word: string): Promise<boolean> => {
    try {
      await audioManager.playAudio(word);
      return true;
    } catch (error) {
      console.warn('Audio playback failed:', error);
      return false;
    }
  };

  // Determine if we should show the audio button based on study mode and showAudioButton prop
  const shouldShowAudioButton = showAudioButton && audioEnabled && (
    (studyMode === 'lithuanian-to-english') ||
    (studyMode === 'english-to-lithuanian' && showAnswer) ||
    (questionText?.includes('🎧')) // For listening activities
  );

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
          {shouldShowAudioButton && (studyMode === 'lithuanian-to-english' || questionText?.includes('🎧')) && (
            <AudioButton 
              word={audioWord}
              audioEnabled={audioEnabled}
              playAudio={playAudioWrapper}
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
                playAudio={playAudioWrapper}
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
