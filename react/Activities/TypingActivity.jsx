import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';

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
  const currentWord = wordListManager.getCurrentWord();

  // Handle checking typed answer
  const handleSubmit = (typedAnswer) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      currentWord.lithuanian : currentWord.english;

    const isCorrect = typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) {
      wordListManager.setTypingFeedback('✅ Correct!');
      wordListManager.updateStatsCorrect();
    } else {
      wordListManager.setTypingFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
      wordListManager.updateStatsIncorrect();
    }

    wordListManager.setShowAnswer(true);
  };

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
        showAnswer={wordListState.showAnswer}
        promptText={promptText}
        isClickable={false}
      />

      <TypingResponse
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onSubmit={handleSubmit}
        showAnswer={wordListState.showAnswer}
        feedback={wordListState.typingFeedback}
        typedAnswer={wordListState.typedAnswer}
        onTypedAnswerChange={(value) => wordListManager.setTypedAnswer(value)}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        onNext={nextCard}
        autoAdvanceTimer={wordListState.autoAdvanceTimer}
      />
    </div>
  );
};

export default TypingActivity;