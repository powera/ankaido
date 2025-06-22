import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const FlashCardActivity = ({ 
  currentWord, 
  showAnswer, 
  setShowAnswer, 
  studyMode, 
  audioEnabled, 
  playAudio, 
  handleHoverStart, 
  handleHoverEnd,
  isNewWord = false // Prop to indicate if this is a new word being introduced
}) => {
  if (!currentWord) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Mark new words as exposed when they are first shown
  React.useEffect(() => {
    if (isNewWord && currentWord) {
      const markAsExposed = async () => {
        try {
          await journeyStatsManager.updateWordStatsDirectly(currentWord, { exposed: true });
        } catch (error) {
          console.error('Error marking word as exposed in FlashCardActivity:', error);
        }
      };
      markAsExposed();
    }
  }, [isNewWord, currentWord]);

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
  
  // Determine whether to show the answer based on showAnswer state or isNewWord prop
  const shouldShowAnswer = showAnswer || isNewWord;

  return (
    <WordDisplayCard
      currentWord={currentWord}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleHoverStart={handleHoverStart}
      handleHoverEnd={handleHoverEnd}
      questionText={question}
      answerText={answer}
      showAnswer={shouldShowAnswer}
      isClickable={true}
      onClick={() => setShowAnswer(!showAnswer)}
    />
  );
};

export default FlashCardActivity;
