import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import { getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';

/**
 * Typing Activity Component
 * Presents a word and requires user to type the translation
 */
const TypingActivity = ({ 
  currentWord,
  studyMode,
  audioEnabled,
  playAudio,
  // Controlled props from Mode
  showAnswer,
  typedAnswer,
  typingFeedback,
  onTypedAnswerChange,
  onSubmit,
  // Auto-advance props
  autoAdvance,
  defaultDelay,
  onNext,
  autoAdvanceTimer
}) => {
  // Auto-play audio for LT->EN typing (Lithuanian prompt, player types English answer)
  React.useEffect(() => {
    if (audioEnabled && currentWord && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, studyMode, audioEnabled, playAudio]);

  // Early return after all hooks
  if (!currentWord) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  const question = getQuestionText(currentWord, studyMode);
  const answer = getCorrectAnswer(currentWord, studyMode);

  // Generate prompt text based on study mode
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
        showAnswer={showAnswer}
        promptText={promptText}
        isClickable={false}
      />

      <TypingResponse
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={onSubmit}
        showAnswer={showAnswer}
        feedback={typingFeedback}
        typedAnswer={typedAnswer}
        onTypedAnswerChange={onTypedAnswerChange}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={onNext}
        autoAdvanceTimer={autoAdvanceTimer}
      />
    </div>
  );
};

export default TypingActivity;