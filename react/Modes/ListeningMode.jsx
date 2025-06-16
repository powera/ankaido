
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import AudioButton from '../Components/AudioButton';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer
}) => {
  const currentWord = wordListManager.getCurrentWord();
  if (!currentWord) return null;

  return (
    <div>
      <div className="w-card">
        <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>
        <div className="w-question w-text-center">
          <div className="w-mb-large">
            🎧 Listen and choose the correct answer:
          </div>
          <div style={{ marginBottom: 'var(--spacing-base)' }}>
            <AudioButton 
              word={currentWord.lithuanian}
              size="large"
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
            <span style={{ marginLeft: '0.5rem', fontSize: '1.2rem' }}>Play Audio</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            {studyMode === 'lithuanian-to-english' 
              ? 'Choose the English translation:'
              : 'Choose the matching Lithuanian word:'}
          </div>
        </div>
      </div>
      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        quizMode="listening"
        handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
      />
    </div>
  );
};

export default ListeningMode;
