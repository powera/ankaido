import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';

const FlashCardMode = ({ 
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
  return (
    <FlashCardActivity
      currentWord={currentWord}
      showAnswer={showAnswer}
      setShowAnswer={setShowAnswer}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleHoverStart={handleHoverStart}
      handleHoverEnd={handleHoverEnd}
      isNewWord={isNewWord} // Pass the new word prop
    />
  );
};

export default FlashCardMode;
