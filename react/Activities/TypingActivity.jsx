
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import journeyStatsManager from '../Managers/journeyStatsManager';
import audioManager from '../Managers/audioManager';
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
  onSubmit,
  audioEnabled
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
      typingFeedback: typingFeedback || ''
    }));
  }, [word, typedAnswer, typingFeedback]);

  // Auto-play audio for LT->EN typing (Lithuanian prompt, player types English answer)
  React.useEffect(() => {
    if (audioEnabled && word && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        audioManager.playAudio(word.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word, studyMode, audioEnabled, audioManager]);

  // Handle typed answer submission
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    const correctAnswer = getCorrectAnswer(word, studyMode);
    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    // Generate feedback message
    const feedback = isCorrect ? '✅ Correct!' : `❌ Incorrect. Correct answer: ${correctAnswer}`;
    
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

    // Call external submit handler if provided
    if (onSubmit) {
      onSubmit(typedAnswer, isCorrect);
    }
  }, [word, studyMode, setTypingFeedback, onSubmit]);

  // Handle typed answer changes
  const handleTypedAnswerChange = React.useCallback((value) => {
    if (setTypedAnswer) {
      setTypedAnswer(value);
    } else {
      setActivityState(prev => ({ ...prev, typedAnswer: value }));
    }
  }, [setTypedAnswer]);

  

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
        playAudio={audioManager.playAudio.bind(audioManager)}
        onSubmit={handleSubmit}
        showAnswer={activityState.showAnswer}
        feedback={typingFeedback || activityState.typingFeedback}
        typedAnswer={typedAnswer || activityState.typedAnswer}
        onTypedAnswerChange={handleTypedAnswerChange}
      />
    </div>
  );
};

export default TypingActivity;
