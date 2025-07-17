
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import activityStatsManager from '../Managers/activityStatsManager';
import audioManager from '../Managers/audioManager';
import { getQuestionText, getCorrectAnswer } from '../Utilities/activityHelpers';
import { invalidateWordWeightCache } from '../Utilities/activitySelection';

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

  // Mark new words as exposed when they are first shown and auto-play audio
  React.useEffect(() => {
    if (isNewWord && currentWord) {
      const markAsExposed = async () => {
        try {
          await activityStatsManager.updateWordStatsDirectly(currentWord, { exposed: true });
          // Invalidate weight cache for this word since stats changed
          invalidateWordWeightCache(currentWord);
        } catch (error) {
          console.error('Error marking word as exposed in FlashCardActivity:', error);
        }
      };
      markAsExposed();

      // Auto-play audio for new words if audio is enabled
      if (audioEnabled) {
        // Small delay to ensure the component is fully rendered
        setTimeout(() => {
          audioManager.playAudio(currentWord.lithuanian).catch(error => {
            console.warn('Failed to auto-play audio for new word:', error);
          });
        }, 100);
      }
    }
  }, [isNewWord, currentWord, audioEnabled]);

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
