import React from 'react';
import TypingActivity from '../Activities/TypingActivity';

const TypingMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  nextCard,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const currentWord = wordListState.currentWord;

  const handleComplete = (isCorrect) => {
    // Handle completion logic here if needed
    if (autoAdvance) {
      setTimeout(() => {
        nextCard();
      }, defaultDelay * 1000);
    }
  };

  return (
    <TypingActivity
      currentWord={currentWord}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      onComplete={handleComplete}
      autoAdvance={autoAdvance}
      defaultDelay={defaultDelay}
      onNext={nextCard}
    />
  );
};

export default TypingMode;