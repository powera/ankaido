import React from 'react';
import TypingActivity from '../Activities/TypingActivity';
import StatsDisplay from '../Components/StatsDisplay';

const TypingMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  autoAdvance,
  defaultDelay
}) => {
  const currentWord = wordListManager?.getCurrentWord();

  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  return (
    <>
      <TypingActivity
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
      />
      {currentWord && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={() => wordListManager.prevCard()}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={() => wordListManager.nextCard()}>Next →</button>
        </div>
      )}
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default TypingMode;