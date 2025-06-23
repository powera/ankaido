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
  const nextCard = () => {
    // Get the current word before advancing
    const currentWord = wordListManager.getCurrentWord();
    
    // Check if there was a typing response and update stats accordingly
    // This is a simplified approach - in a real implementation you'd want to track the actual answer
    wordListManager.nextCard();
  };
  
  const prevCard = () => wordListManager.prevCard();
  
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  // Custom nextCard handler that updates session stats
  const handleTypingComplete = (result) => {
    if (result && typeof result === 'object' && 'isCorrect' in result) {
      if (result.isCorrect) {
        wordListManager.updateSessionStatsCorrect();
      } else {
        wordListManager.updateSessionStatsIncorrect();
      }
    }
    nextCard();
  };

  return (
    <>
      <TypingActivity
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        nextCard={handleTypingComplete}
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