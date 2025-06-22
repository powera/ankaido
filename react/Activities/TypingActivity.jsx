
import React from 'react';
import TypingResponse from '../Components/TypingResponse';
import AudioButton from '../Components/AudioButton';

const TypingActivity = ({ 
  currentWord,
  studyMode,
  audioEnabled,
  playAudio,
  onComplete,
  autoAdvance = false,
  defaultDelay = 2,
  onNext = null
}) => {
  const [typedAnswer, setTypedAnswer] = React.useState('');
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  // Reset state when currentWord changes
  React.useEffect(() => {
    setTypedAnswer('');
    setShowAnswer(false);
    setFeedback('');
  }, [currentWord]);

  if (!currentWord) return null;

  const handleSubmit = (answer) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      currentWord.lithuanian : currentWord.english;

    const isCorrect = answer.trim().toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) {
      setFeedback('✅ Correct!');
    } else {
      setFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
    }

    setShowAnswer(true);
    
    if (onComplete) {
      onComplete(isCorrect);
    }
  };

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;

  return (
    <div className="w-card">
      <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>

      <div className="w-question w-mb-large">
        <div>{question}</div>
        {audioEnabled && studyMode === 'lithuanian-to-english' && (
          <div style={{ marginTop: 'var(--spacing-base)' }}>
            <AudioButton 
              word={question}
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
          </div>
        )}
      </div>

      <TypingResponse
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={handleSubmit}
        showAnswer={showAnswer}
        feedback={feedback}
        typedAnswer={typedAnswer}
        onTypedAnswerChange={setTypedAnswer}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={onNext}
        autoAdvanceTimer={false}
      />
    </div>
  );
};

export default TypingActivity;
