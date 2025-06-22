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
  isNewWord = false
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
      isNewWord={isNewWord}
    />
  );
};

export default FlashCardMode;