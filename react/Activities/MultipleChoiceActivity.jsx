
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import AudioButton from '../Components/AudioButton';

const MultipleChoiceActivity = ({
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  onAnswer,
  quizMode = "multiple-choice"
}) => {
  const currentWord = wordListState.currentWord;
  
  if (!currentWord) return null;

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;

  return (
    <div className="w-card">
      <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>
      
      <div className="w-question w-mb-large">
        <div>{question}</div>
        {audioEnabled && studyMode === 'lithuanian-to-english' && (
          <div style={{ marginTop: 'var(--spacing-base)' }}>
            <AudioButton 
              word={question}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          </div>
        )}
      </div>

      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        quizMode={quizMode}
        handleMultipleChoiceAnswer={onAnswer}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        preventAutoPlay={false}
      />
    </div>
  );
};

export default MultipleChoiceActivity;
