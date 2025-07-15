import React from 'react';
import TypingActivity from '../Activities/TypingActivity';
import StatsDisplay from '../Components/StatsDisplay';
import { activityStatsManager } from '../Managers/activityStatsManager';

const TypingMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  autoAdvance,
  defaultDelay
}) => {
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState(null);
  const currentWord = wordListManager?.getCurrentWord();

  // Clear auto-advance timer when word changes
  React.useEffect(() => {
    if (currentWord) {
      // Clear any existing auto-advance timer
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        setAutoAdvanceTimer(null);
      }
    }
  }, [currentWord]);

  const handleTypingSubmit = React.useCallback(async (typedAnswer, isCorrect) => {
    // Update session stats
    if (wordListManager && typeof isCorrect === 'boolean') {
      wordListManager.updateSessionStats(isCorrect);
    }

    // Update journey stats
    if (currentWord && typeof isCorrect === 'boolean') {
      try {
        await activityStatsManager.updateWordStats(currentWord, 'typing', isCorrect);
      } catch (error) {
        console.error('Error updating journey stats:', error);
      }
    }

    // Handle auto-advance
    if (autoAdvance) {
      const timer = setTimeout(() => {
        wordListManager.nextCard();
        setAutoAdvanceTimer(null);
      }, defaultDelay * 1000);
      setAutoAdvanceTimer(timer);
    }
  }, [autoAdvance, defaultDelay, wordListManager, currentWord]);

  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  const handlePrevCard = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.prevCard();
  };

  const handleNextCard = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.nextCard();
  };

  return (
    <>
      <TypingActivity
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        onSubmit={handleTypingSubmit}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        autoAdvanceTimer={autoAdvanceTimer}
      />
      {currentWord && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={handlePrevCard}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={handleNextCard}>Next →</button>
        </div>
      )}
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default TypingMode;