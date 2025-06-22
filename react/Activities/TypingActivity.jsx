
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import journeyStatsManager from '../Managers/journeyStatsManager';

const TypingActivity = ({ 
  wordListManager,
  wordListState,
  currentWord, // Accept currentWord as prop
  typedAnswer, // Accept typedAnswer as prop
  typingFeedback, // Accept typingFeedback as prop
  setTypedAnswer, // Accept setTypedAnswer as prop
  setTypingFeedback, // Accept setTypingFeedback as prop
  studyMode,
  nextCard,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const [activityState, setActivityState] = React.useState({
    showAnswer: false,
    typedAnswer: typedAnswer || '',
    typingFeedback: typingFeedback || '',
    autoAdvanceTimer: null,
    stats: { correct: 0, incorrect: 0, total: 0 }
  });

  // Use currentWord from props, fallback to wordListManager if available
  const word = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null);

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      typedAnswer: typedAnswer || '',
      typingFeedback: typingFeedback || '',
      autoAdvanceTimer: null
    }));
  }, [word, typedAnswer, typingFeedback]);

  // Handle checking typed answer with journey stats
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    if (!word) return;
    
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      word.lithuanian : word.english;

    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    // Update Journey stats
    try {
      await journeyStatsManager.updateWordStats(word, 'typing', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in TypingActivity:', error);
    }

    // Update feedback using external setter if available, otherwise local state
    const feedback = isCorrect ? '✅ Correct!' : `❌ Incorrect. The answer is: ${correctAnswer}`;
    
    if (setTypingFeedback) {
      setTypingFeedback(feedback);
    } else {
      setActivityState(prev => ({
        ...prev,
        typingFeedback: feedback,
        showAnswer: true,
        stats: {
          ...prev.stats,
          correct: prev.stats.correct + (isCorrect ? 1 : 0),
          incorrect: prev.stats.incorrect + (isCorrect ? 0 : 1),
          total: prev.stats.total + 1
        }
      }));
    }
  }, [word, studyMode, setTypingFeedback]);

  const handleTypedAnswerChange = React.useCallback((value) => {
    if (setTypedAnswer) {
      setTypedAnswer(value);
    } else {
      setActivityState(prev => ({ ...prev, typedAnswer: value }));
    }
  }, [setTypedAnswer]);

  const handleNextCard = React.useCallback(() => {
    // Clear any auto-advance timer
    if (activityState.autoAdvanceTimer) {
      clearTimeout(activityState.autoAdvanceTimer);
      setActivityState(prev => ({ ...prev, autoAdvanceTimer: null }));
    }
    nextCard();
  }, [nextCard, activityState.autoAdvanceTimer]);

  if (!word) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  const question = studyMode === 'english-to-lithuanian' ? word.english : word.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? word.lithuanian : word.english;
  const promptText = studyMode === 'english-to-lithuanian' ? 
    'Type the Lithuanian word (with proper accents)' : 
    'Type the English word';

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
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
        currentWord={word}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={handleSubmit}
        showAnswer={activityState.showAnswer}
        feedback={typingFeedback || activityState.typingFeedback}
        typedAnswer={typedAnswer || activityState.typedAnswer}
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
