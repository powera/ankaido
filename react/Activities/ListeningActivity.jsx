
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';

const ListeningActivity = ({
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  onAnswer
}) => {
  const currentWord = wordListState.currentWord;
  
  if (!currentWord) return null;

  // Auto-play audio when component mounts or word changes
  React.useEffect(() => {
    if (audioEnabled && currentWord) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, audioEnabled, playAudio]);

  const handlePlayAgain = () => {
    if (audioEnabled) {
      playAudio(currentWord.lithuanian);
    }
  };

  return (
    <div className="w-card">
      <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>
      
      <div className="w-question w-mb-large">
        <div>🎧 Listen and choose the correct answer</div>
        {audioEnabled && (
          <div style={{ marginTop: 'var(--spacing-base)' }}>
            <button 
              className="w-button" 
              onClick={handlePlayAgain}
              style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
            >
              🔊 Play Again
            </button>
          </div>
        )}
      </div>

      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        handleHoverStart={() => {}}
        handleHoverEnd={() => {}}
        onAnswer={onAnswer}
      />
    </div>
  );
};

export default ListeningActivity;
