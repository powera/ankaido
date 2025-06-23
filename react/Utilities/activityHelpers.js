
/**
 * Shared utility functions for activity components
 */

/**
 * Creates initial activity state object
 */
export const createInitialActivityState = (showAnswer = false, selectedAnswer = null, typedAnswer = '', typingFeedback = '') => ({
  showAnswer,
  selectedAnswer,
  typedAnswer,
  typingFeedback,
  autoAdvanceTimer: null
});

/**
 * Determines the correct answer based on study mode and word
 */
export const getCorrectAnswer = (word, studyMode) => {
  return studyMode === 'english-to-lithuanian' ? word.lithuanian : word.english;
};

/**
 * Determines the question text based on study mode and word
 */
export const getQuestionText = (word, studyMode) => {
  return studyMode === 'english-to-lithuanian' ? word.english : word.lithuanian;
};

/**
 * Creates a stats update handler that wraps the original handler
 */
export const createStatsHandler = (journeyStatsManager, word, statsMode, originalHandler) => {
  return async (selectedOption) => {
    const correctAnswer = getCorrectAnswer(word, statsMode);
    const isCorrect = selectedOption === correctAnswer;

    try {
      await journeyStatsManager.updateWordStats(word, statsMode, isCorrect);
    } catch (error) {
      console.error(`Error updating journey stats in ${statsMode}:`, error);
    }

    if (originalHandler) {
      originalHandler(selectedOption);
    }

    return { isCorrect, correctAnswer };
  };
};
