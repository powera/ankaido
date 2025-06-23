
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';
import audioManager from '../Managers/audioManager';
import { getQuestionText, getCorrectAnswer } from '../Utilities/activityHelpers';

/**
 * Flash Card Activity Component
 * Displays a word with clickable reveal functionality
 * Optionally marks new words as exposed for tracking purposes
 */
const FlashCardActivity = ({ 
  currentWord, 
  showAnswer, 
  setShowAnswer, 
  studyMode, 
  audioEnabled, 
  isNewWord = false
}) => {

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

  // Early return after all hooks
  if (!currentWord) return null;

  const question = getQuestionText(currentWord, studyMode);
  const answer = getCorrectAnswer(currentWord, studyMode);
  
  // Determine whether to show the answer based on showAnswer state or isNewWord prop
  const shouldShowAnswer = showAnswer || isNewWord;

  return (
    <WordDisplayCard
      currentWord={currentWord}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      questionText={question}
      answerText={answer}
      showAnswer={shouldShowAnswer}
      isClickable={true}
      onClick={() => setShowAnswer(!showAnswer)}
    />
  );
};

export default FlashCardActivity;
