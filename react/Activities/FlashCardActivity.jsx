
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';

const FlashCardActivity = ({ 
  currentWord, 
  showAnswer, 
  setShowAnswer, 
  studyMode, 
  audioEnabled, 
  playAudio, 
  handleHoverStart, 
  handleHoverEnd,
  isNewWord = false,
  onComplete = null // Optional callback for activity completion
}) => {
  if (!currentWord) return null;

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
  
  // Determine whether to show the answer based on showAnswer state or isNewWord prop
  const shouldShowAnswer = showAnswer || isNewWord;

  const handleClick = () => {
    const newShowAnswer = !showAnswer;
    setShowAnswer(newShowAnswer);
    
    // If we have a completion callback and we're showing the answer, call it
    if (onComplete && newShowAnswer) {
      onComplete();
    }
  };

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
      onClick={handleClick}
    />
  );
};

export default FlashCardActivity;
