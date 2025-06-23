import React from 'react';
import FlashCardActivity from '../Activities/FlashCardActivity';

const FlashCardMode = ({ 
  currentWord, 
  showAnswer, 
  setShowAnswer, 
  studyMode, 
  audioEnabled,
  wordListManager
}) => {
  return (
    <>
      <FlashCardActivity
        currentWord={currentWord}
        showAnswer={showAnswer}
        setShowAnswer={setShowAnswer}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        isNewWord={false} // Never mark as new in FlashCardMode
      />
      {currentWord && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={() => wordListManager.prevCard()}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={() => wordListManager.nextCard()}>Next →</button>
        </div>
      )}
    </>
  );
};

export default FlashCardMode;