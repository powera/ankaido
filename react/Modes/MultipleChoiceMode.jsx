import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import journeyStatsManager from '../journeyStatsManager';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
  handleMultipleChoiceAnswer
}) => {
  const currentWord = wordListManager.getCurrentWord();
  if (!currentWord) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Enhanced multiple choice handler that updates Journey stats
  const handleMultipleChoiceWithStats = React.useCallback(async (selectedOption) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    const isCorrect = selectedOption === correctAnswer;

    // Update Journey stats
    try {
      await journeyStatsManager.updateWordStats(currentWord, 'multipleChoice', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in MultipleChoiceMode:', error);
    }

    // Call the original handler for UI updates and flow control
    handleMultipleChoiceAnswer(selectedOption);
  }, [currentWord, studyMode, handleMultipleChoiceAnswer]);

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;

  return (
    <div>
      <div className="w-card" style={{ padding: 'min(var(--spacing-large), 1rem)' }}>
        <div className="w-badge w-hide-mobile">{currentWord.corpus} → {currentWord.group}</div>
        <div 
          className="w-question"
          onMouseEnter={() => audioEnabled && studyMode === 'lithuanian-to-english' && handleHoverStart(question)}
          onMouseLeave={handleHoverEnd}
          style={{ 
            cursor: audioEnabled && studyMode === 'lithuanian-to-english' ? 'pointer' : 'default',
            fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
            marginBottom: 'clamp(1rem, 3vw, var(--spacing-large))'
          }}
        >
          {question}
        </div>
        <div className="w-hide-mobile" style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: '0.9rem', 
          marginTop: 'var(--spacing-base)',
          textAlign: 'center'
        }}>
          Choose the correct answer
        </div>
      </div>
      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleMultipleChoiceWithStats}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
      />
    </div>
  );
};

export default MultipleChoiceMode;