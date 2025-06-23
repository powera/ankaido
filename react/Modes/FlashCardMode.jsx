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
  wordListManager
}) => {
  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();

  return (
    <>
      <FlashCardActivity
        currentWord={currentWord}
        showAnswer={showAnswer}
        setShowAnswer={setShowAnswer}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        isNewWord={false} // Never mark as new in FlashCardMode
      />
      
      {/* Navigation controls */}
      <div className="w-nav-controls">
        <button className="w-button" onClick={prevCard}>← Previous</button>
        <div className="w-nav-center"></div>
        <button className="w-button" onClick={nextCard}>Next →</button>
      </div>
    </>
  );
};

export default FlashCardMode;
