
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import journeyStatsManager from '../Managers/journeyStatsManager';
import { createInitialActivityState, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';

/**
 * Typing Activity Component
 * Presents a word and requires user to type the translation
 */
const TypingActivity = ({ 
  wordListManager,
  wordListState,
  currentWord,
  typedAnswer,
  typingFeedback,
  setTypedAnswer,
  setTypingFeedback,
  studyMode,
  nextCard,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const [activityState, setActivityState] = React.useState(() =>
    createInitialActivityState(false, null, typedAnswer || '', typingFeedback || '')
  );

  // Use currentWord from props, fallback to wordListManager if available
  const word = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null);

  // Reset state when word or external state changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      typedAnswer: typedAnswer || '',
      typingFeedback: typingFeedback || '',
      autoAdvanceTimer: null
    }));
  }, [word, typedAnswer, typingFeedback]);

  // Early return after all hooks
  if (!word) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  // Handle typed answer submission with stats tracking
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    const correctAnswer = getCorrectAnswer(word, studyMode);
    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    // Update journey stats
    try {
      await journeyStatsManager.updateWordStats(word, 'typing', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in TypingActivity:', error);
    }

    // Generate feedback message
    const feedback = isCorrect ? '✅ Correct!' : `❌ Incorrect. The answer is: ${correctAnswer}`;
    
    // Update feedback using external setter if available, otherwise local state
    if (setTypingFeedback) {
      setTypingFeedback(feedback);
    } else {
      setActivityState(prev => ({
        ...prev,
        typingFeedback: feedback,
        showAnswer: true
      }));
    }
  }, [word, studyMode, setTypingFeedback]);

  // Handle typed answer changes
  const handleTypedAnswerChange = React.useCallback((value) => {
    if (setTypedAnswer) {
      setTypedAnswer(value);
    } else {
      setActivityState(prev => ({ ...prev, typedAnswer: value }));
    }
  }, [setTypedAnswer]);

  // Handle next card navigation
  const handleNextCard = React.useCallback(() => {
    // Clear any auto-advance timer
    if (activityState.autoAdvanceTimer) {
      clearTimeout(activityState.autoAdvanceTimer);
      setActivityState(prev => ({ ...prev, autoAdvanceTimer: null }));
    }
    nextCard();
  }, [nextCard, activityState.autoAdvanceTimer]);

  const question = getQuestionText(word, studyMode);
  const answer = getCorrectAnswer(word, studyMode);
  
  // Generate prompt text based on study mode
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
