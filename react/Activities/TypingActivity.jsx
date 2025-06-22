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
  const currentWord = wordListManager.getCurrentWord();

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

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

    if (isCorrect) {
      wordListManager.setTypingFeedback('✅ Correct!');
      wordListManager.updateStatsCorrect();
    } else {
      wordListManager.setTypingFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
      wordListManager.updateStatsIncorrect();
    }

    wordListManager.setShowAnswer(true);
  }, [currentWord, studyMode, wordListManager]);

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