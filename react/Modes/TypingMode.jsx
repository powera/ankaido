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
  return (
    <TypingActivity
      wordListManager={wordListManager}
      wordListState={wordListState}
      studyMode={studyMode}
      nextCard={nextCard}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      autoAdvance={autoAdvance}
      defaultDelay={defaultDelay}
    />
  );
};

export default TypingMode;