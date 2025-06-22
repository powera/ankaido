
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import journeyStatsManager from '../Managers/journeyStatsManager';

const TypingActivity = ({ 
  wordListManager,
  wordListState,
  studyMode,
  nextCard,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const [activityState, setActivityState] = React.useState({
    showAnswer: false,
    typedAnswer: '',
    typingFeedback: '',
    autoAdvanceTimer: null,
    stats: { correct: 0, incorrect: 0, total: 0 }
  });

  const currentWord = wordListManager.getCurrentWord();

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      typedAnswer: '',
      typingFeedback: '',
      autoAdvanceTimer: null
    }));
  }, [currentWord]);

  // Handle checking typed answer with journey stats
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      currentWord.lithuanian : currentWord.english;

    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    // Update Journey stats
    try {
      await journeyStatsManager.updateWordStats(currentWord, 'typing', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in TypingActivity:', error);
    }

    // Update local stats and feedback
    if (isCorrect) {
      setActivityState(prev => ({
        ...prev,
        typingFeedback: '✅ Correct!',
        showAnswer: true,
        stats: {
          ...prev.stats,
          correct: prev.stats.correct + 1,
          total: prev.stats.total + 1
        }
      }));
    } else {
      setActivityState(prev => ({
        ...prev,
        typingFeedback: `❌ Incorrect. The answer is: ${correctAnswer}`,
        showAnswer: true,
        stats: {
          ...prev.stats,
          incorrect: prev.stats.incorrect + 1,
          total: prev.stats.total + 1
        }
      }));
    }
  }, [currentWord, studyMode]);

  const handleTypedAnswerChange = React.useCallback((value) => {
    setActivityState(prev => ({ ...prev, typedAnswer: value }));
  }, []);

  const handleNextCard = React.useCallback(() => {
    // Clear any auto-advance timer
    if (activityState.autoAdvanceTimer) {
      clearTimeout(activityState.autoAdvanceTimer);
      setActivityState(prev => ({ ...prev, autoAdvanceTimer: null }));
    }
    nextCard();
  }, [nextCard, activityState.autoAdvanceTimer]);

  if (!currentWord) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
  const promptText = studyMode === 'english-to-lithuanian' ? 
    'Type the Lithuanian word (with proper accents)' : 
    'Type the English word';

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText={question}
        answerText={answer}
        showAnswer={activityState.showAnswer}
        promptText={promptText}
        isClickable={false}
      />

      <TypingResponse
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={handleSubmit}
        showAnswer={activityState.showAnswer}
        feedback={activityState.typingFeedback}
        typedAnswer={activityState.typedAnswer}
        onTypedAnswerChange={handleTypedAnswerChange}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={handleNextCard}
        autoAdvanceTimer={activityState.autoAdvanceTimer}
      />
    </div>
  );
};

export default TypingActivity;
