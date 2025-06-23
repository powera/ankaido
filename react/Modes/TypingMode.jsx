import React from 'react';
import TypingActivity from '../Activities/TypingActivity';
import StatsDisplay from '../Components/StatsDisplay';

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
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  return (
    <>
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
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default TypingMode;