import React from 'react';
import TypingActivity from '../Activities/TypingActivity';
import StatsDisplay from '../Components/StatsDisplay';

const TypingMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  
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
      
      {/* Navigation controls */}
      <div className="w-nav-controls">
        <button className="w-button" onClick={prevCard}>← Previous</button>
        <div className="w-nav-center"></div>
        <button className="w-button" onClick={nextCard}>Next →</button>
      </div>
    </>
  );
};

export default TypingMode;