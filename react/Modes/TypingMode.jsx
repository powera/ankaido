
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
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [typedAnswer, setTypedAnswer] = React.useState('');
  const [typingFeedback, setTypingFeedback] = React.useState('');
  const [autoAdvanceTimer, setAutoAdvanceTimer] = React.useState(null);
  
  const currentWord = wordListManager?.getCurrentWord();

  // Reset state when word changes
  React.useEffect(() => {
    setShowAnswer(false);
    setTypedAnswer('');
    setTypingFeedback('');
    // Clear any existing timer when word changes
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [currentWord, autoAdvanceTimer]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  const nextCard = () => {
    // Clear any auto-advance timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    wordListManager.nextCard();
  };
  
  const prevCard = () => wordListManager.prevCard();
  
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  // Stats update function - using session stats for TypingMode
  const doUpdateStats = React.useCallback((currentWord, activityType, isCorrect) => {
    if (isCorrect) {
      wordListManager.updateSessionStatsCorrect();
    } else {
      wordListManager.updateSessionStatsIncorrect();
    }
  }, [wordListManager]);

  // Handle typing submission
  const handleSubmit = React.useCallback((typedAnswerValue) => {
    // Prevent double submission
    if (showAnswer) return;

    // Determine correct answer
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      currentWord.lithuanian : currentWord.english;

    const isCorrect = typedAnswerValue.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const feedback = isCorrect ? 
      '✅ Correct!' : 
      `❌ Incorrect. The correct answer is: ${correctAnswer}`;

    // Update state
    setShowAnswer(true);
    setTypingFeedback(feedback);

    // Update stats
    doUpdateStats(currentWord, 'typing', isCorrect);

    // Set up auto-advance if enabled
    if (autoAdvance && defaultDelay > 0) {
      const timer = setTimeout(() => {
        nextCard();
      }, defaultDelay * 1000);
      setAutoAdvanceTimer(timer);
    }
  }, [showAnswer, studyMode, currentWord, doUpdateStats, autoAdvance, defaultDelay]);

  // Handle next question (manual advance)
  const handleNextQuestion = () => {
    nextCard();
  };

  return (
    <>
      <TypingActivity
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        showAnswer={showAnswer}
        typedAnswer={typedAnswer}
        typingFeedback={typingFeedback}
        onTypedAnswerChange={setTypedAnswer}
        onSubmit={handleSubmit}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={handleNextQuestion}
        autoAdvanceTimer={autoAdvanceTimer}
      />

      {/* Show Next Question button when auto-advance is disabled and answer is shown */}
      {!autoAdvance && showAnswer && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <button 
            className="w-button w-button-primary" 
            onClick={handleNextQuestion}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
          >
            Next Question →
          </button>
        </div>
      )}

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
