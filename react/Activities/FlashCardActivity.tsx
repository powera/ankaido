
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import activityStatsManager from '../Managers/activityStatsManager';
import ttsAudioManager from '../Managers/ttsAudioManager';
import { getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';
import { invalidateWordWeightCache } from '../Utilities/activitySelection';
import { StudyMode, Word } from '../Utilities/types';

/**
 * Props interface for FlashCardActivity component
 */
interface FlashCardActivityProps {
  currentWord: Word | null;
  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;
  studyMode: StudyMode;
  audioEnabled: boolean;
  isNewWord?: boolean;
}

/**
 * Flash Card Activity Component
 * Displays a word with clickable reveal functionality
 * Optionally marks new words as exposed for tracking purposes
 */
const FlashCardActivity: React.FC<FlashCardActivityProps> = ({ 
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
        } catch (error: unknown) {
          console.error('Error marking word as exposed in FlashCardActivity:', error);
        }
      };
      markAsExposed();

      // Auto-play audio for new words if audio is enabled
      if (audioEnabled) {
        // Small delay to ensure the component is fully rendered
        setTimeout(() => {
          ttsAudioManager.playAudio(currentWord.lithuanian).catch((error: unknown) => {
            console.warn('Failed to auto-play audio for new word:', error);
          });
        }, 100);
      }
    }
  }, [isNewWord, currentWord, audioEnabled]);

  // Early return after all hooks
  if (!currentWord) return null;

  const question: string = getQuestionText(currentWord, studyMode);
  const answer: string = getCorrectAnswer(currentWord, studyMode);
  
  // Determine whether to show the answer based on showAnswer state or isNewWord prop
  const shouldShowAnswer: boolean = showAnswer || isNewWord;

  return (
    <WordDisplayCard
      currentWord={currentWord}
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
