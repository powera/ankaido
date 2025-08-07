/**
 * Shared utility functions for activity components
 */

import { ActivityState, ActivityStatsManager, StudyMode, Word } from './types';

/**
 * Creates initial activity state object
 */
export const createInitialActivityState = (
  showAnswer: boolean = false,
  selectedAnswer: string | null = null,
  typedAnswer: string = '',
  typingFeedback: string = ''
): ActivityState => ({
  showAnswer,
  selectedAnswer,
  typedAnswer,
  typingFeedback,
  autoAdvanceTimer: null
});

/**
 * Determines the correct answer based on study mode and word
 */
export const getCorrectAnswer = (word: Word, studyMode: StudyMode): string => {
  switch (studyMode) {
    case 'english-to-source':
      return word.lithuanian;
    case 'source-to-english':
      return word.english;
    case 'source-to-source':
      return word.lithuanian;
    default:
      console.warn(`Unknown study mode in getCorrectAnswer: ${studyMode}`);
      return word.lithuanian; // Default fallback
  }
};

/**
 * Gets all valid answers for a word including alternatives
 */
export const getAllValidAnswers = (word: Word, studyMode: StudyMode): string[] => {
  const primaryAnswer = getCorrectAnswer(word, studyMode);
  const validAnswers = [primaryAnswer];
  
  // Add alternatives based on study mode
  if (word.alternatives) {
    switch (studyMode) {
      case 'english-to-source':
        if (word.alternatives.lithuanian && Array.isArray(word.alternatives.lithuanian)) {
          validAnswers.push(...word.alternatives.lithuanian);
        }
        break;
      case 'source-to-english':
        if (word.alternatives.english && Array.isArray(word.alternatives.english)) {
          validAnswers.push(...word.alternatives.english);
        }
        break;
      case 'source-to-source':
        if (word.alternatives.lithuanian && Array.isArray(word.alternatives.lithuanian)) {
          validAnswers.push(...word.alternatives.lithuanian);
        }
        break;
    }
  }
  
  // Remove duplicates and empty strings
  return [...new Set(validAnswers.filter(answer => answer && answer.trim()))];
};

/**
 * Determines the question text based on study mode and word
 */
export const getQuestionText = (word: Word, studyMode: StudyMode): string => {
  switch (studyMode) {
    case 'english-to-source':
      return word.english;
    case 'source-to-english':
      return word.lithuanian;
    case 'source-to-source':
      return word.lithuanian;
    default:
      console.warn(`Unknown study mode in getQuestionText: ${studyMode}`);
      return word.english; // Default fallback
  }
};

/**
 * Creates a stats update handler that wraps the original handler
 */
export const createStatsHandler = (
  activityStatsManager: ActivityStatsManager,
  word: Word,
  statsMode: StudyMode,
  originalHandler?: (selectedOption: string) => void
) => {
  return async (selectedOption: string) => {
    const correctAnswer = getCorrectAnswer(word, statsMode);
    const isCorrect = selectedOption === correctAnswer;

    try {
      await activityStatsManager.updateWordStats(word, statsMode, isCorrect);
    } catch (error) {
      console.error(`Error updating activity stats in ${statsMode}:`, error);
    }

    if (originalHandler) {
      originalHandler(selectedOption);
    }

    return { isCorrect, correctAnswer };
  };
};