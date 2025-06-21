import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
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
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        questionText={question}
        showHints={true}
        hintText="Choose the correct answer"
        style={{ padding: 'min(var(--spacing-large), 1rem)' }}
      />
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