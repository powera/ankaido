/**
 * Shared utility functions for activity components
 */

export interface Word {
  english: string;
  lithuanian: string;
  [key: string]: string;
}

export type StudyMode =
  | 'english-to-lithuanian'
  | 'lithuanian-to-english'
  | 'lithuanian-to-lithuanian';

export interface ActivityState {
  showAnswer: boolean;
  selectedAnswer: string | null;
  typedAnswer: string;
  typingFeedback: string;
  autoAdvanceTimer: NodeJS.Timeout | null;
}

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
    case 'english-to-lithuanian':
      return word.lithuanian;
    case 'lithuanian-to-english':
      return word.english;
    case 'lithuanian-to-lithuanian':
      return word.lithuanian;
    default:
      console.warn(`Unknown study mode in getCorrectAnswer: ${studyMode}`);
      return word.lithuanian; // Default fallback
  }
};

/**
 * Determines the question text based on study mode and word
 */
export const getQuestionText = (word: Word, studyMode: StudyMode): string => {
  switch (studyMode) {
    case 'english-to-lithuanian':
      return word.english;
    case 'lithuanian-to-english':
      return word.lithuanian;
    case 'lithuanian-to-lithuanian':
      return word.lithuanian;
    default:
      console.warn(`Unknown study mode in getQuestionText: ${studyMode}`);
      return word.english; // Default fallback
  }
};

export interface ActivityStatsManager {
  updateWordStats: (word: Word, statsMode: StudyMode, isCorrect: boolean) => Promise<void>;
}

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