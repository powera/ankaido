import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import journeyStatsManager from '../Managers/journeyStatsManager';
import { createInitialActivityState, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';
import { createStatsHandler } from '../Utilities/statsHelper';

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

  // Auto-play audio for LT->EN typing (Lithuanian prompt, player types English answer)
  React.useEffect(() => {
    if (audioEnabled && word && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playAudio(word.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word, studyMode, audioEnabled, playAudio]);

  // Handle typing submission with stats tracking
  const handleTypingSubmit = React.useCallback(
    createStatsHandler(
      journeyStatsManager,
      word,
      'typing',
      (typedAnswer) => {
        // Prevent double submission
        if (activityState.showAnswer) return;

        // Custom logic for typing mode
        const correctAnswer = studyMode === 'english-to-lithuanian' ? 
          word.lithuanian : word.english;

        const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const feedback = isCorrect ? 
          '✅ Correct!' : 
          `❌ Incorrect. The correct answer is: ${correctAnswer}`;

        // Update local state
        setActivityState(prev => ({
          ...prev,
          showAnswer: true,
          typingFeedback: feedback
        }));

        // Update external state if setters are provided
        if (setTypingFeedback) setTypingFeedback(feedback);

        // Set up auto-advance if enabled
        if (autoAdvance && defaultDelay > 0) {
          const timer = setTimeout(() => {
            if (nextCard) nextCard();
          }, defaultDelay * 1000);
          setActivityState(prev => ({ ...prev, autoAdvanceTimer: timer }));
        }

        return { selectedAnswer: typedAnswer, feedback, isCorrect };
      }
    ),
    [word, studyMode, setTypingFeedback, autoAdvance, defaultDelay, nextCard, activityState.showAnswer]
  );

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

  // Clean up timer on unmount or word change
  React.useEffect(() => {
    return () => {
      if (activityState.autoAdvanceTimer) {
        clearTimeout(activityState.autoAdvanceTimer);
      }
    };
  }, [activityState.autoAdvanceTimer]);

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
        onSubmit={handleTypingSubmit}
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