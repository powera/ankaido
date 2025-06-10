
import React from 'react';
import MultipleChoiceOptions from './MultipleChoiceOptions';
import AudioButton from './AudioButton';

const ListeningMode = ({ 
  currentCard,
  allWords,
  studyMode,
  audioEnabled,
  playAudio,
  multipleChoiceOptions,
  selectedAnswer,
  showAnswer,
  handleMultipleChoiceAnswer
}) => {
  const currentWord = allWords[currentCard];
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
        currentCard={currentCard}
        allWords={allWords}
        studyMode={studyMode}
        quizMode="listening"
        multipleChoiceOptions={multipleChoiceOptions}
        selectedAnswer={selectedAnswer}
        showAnswer={showAnswer}
        handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
      />
    </div>
  );
};

export default ListeningMode;
