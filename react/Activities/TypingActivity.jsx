
import React from 'react';
import TypingResponse from '../Components/TypingResponse';
import WordDisplayCard from '../Components/WordDisplayCard';
import audioManager from '../Managers/audioManager';
import { createInitialActivityState, getAllValidAnswers, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';

/**
 * Typing Activity Component
 * Presents a word and requires user to type the translation
 */
const TypingActivity = ({ 
  wordListManager,
  wordListState,
  currentWord,
  studyMode,
  onSubmit,
  audioEnabled,
  autoAdvance,
  defaultDelay,
  autoAdvanceTimer,
  allWords
}) => {
  const [activityState, setActivityState] = React.useState(() =>
    createInitialActivityState(false, null, '', '')
  );

  // Use currentWord from props, fallback to wordListManager if available
  const word = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      typedAnswer: '',
      typingFeedback: ''
    }));
  }, [word]);

  // Auto-play audio for LT->EN typing (Lithuanian prompt, player types English answer)
  React.useEffect(() => {
    if (audioEnabled && word && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        audioManager.playAudio(word.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word, studyMode, audioEnabled, audioManager]);

  // Helper function to normalize text for comparison
  const normalizeForComparison = (text) => {
    return text
      .replace(/\([^)]*\)/g, '') // Remove text in parentheses
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim()
      .toLowerCase();
  };

  // Helper function to find if typed answer matches a different word's translation
  const findMatchingWord = React.useCallback((typedAnswer, currentWord, studyMode, allWords) => {
    if (!allWords || !Array.isArray(allWords)) return null;
    
    const normalizedTyped = normalizeForComparison(typedAnswer);
    
    // Find a word where the typed answer matches any of its valid translations
    const matchingWord = allWords.find(word => {
      // Skip the current word
      if (word === currentWord || 
          (word.lithuanian === currentWord?.lithuanian && word.english === currentWord?.english)) {
        return false;
      }
      
      // Get all valid answers for this word and check if any match
      const wordValidAnswers = getAllValidAnswers(word, studyMode);
      return wordValidAnswers.some(validAnswer => 
        normalizeForComparison(validAnswer) === normalizedTyped
      );
    });
    
    return matchingWord;
  }, [normalizeForComparison, getAllValidAnswers]);

  // Handle typed answer submission
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    const correctAnswer = getCorrectAnswer(word, studyMode);
    const allValidAnswers = getAllValidAnswers(word, studyMode);
    
    // Normalize typed answer for comparison
    const normalizedTyped = normalizeForComparison(typedAnswer);
    
    // Check if typed answer matches any of the valid answers
    const isCorrect = allValidAnswers.some(validAnswer => 
      normalizeForComparison(validAnswer) === normalizedTyped
    );

    // Generate feedback message
    let feedback;
    if (isCorrect) {
      feedback = '✅ Correct!';
    } else {
      // Check if the typed answer matches a different word's translation
      const matchingWord = findMatchingWord(typedAnswer, word, studyMode, allWords);
      
      if (matchingWord) {
        // Determine which word field to show based on study mode
        const sourceField = studyMode === 'english-to-lithuanian' ? 'english' : 'lithuanian';
        const sourceWord = matchingWord[sourceField];
        
        // Show all valid answers
        const validAnswersText = allValidAnswers.length > 1 
          ? `Correct answers: ${allValidAnswers.join(', ')}`
          : `Correct answer: ${correctAnswer}`;
        
        feedback = `❌ Incorrect. That's the translation for "${sourceWord}". ${validAnswersText}`;
      } else {
        // Show all valid answers
        const validAnswersText = allValidAnswers.length > 1 
          ? `Correct answers: ${allValidAnswers.join(', ')}`
          : `Correct answer: ${correctAnswer}`;
        
        feedback = `❌ Incorrect. ${validAnswersText}`;
      }
    }
    
    // Update local state with feedback
    setActivityState(prev => ({
      ...prev,
      typingFeedback: feedback,
      showAnswer: true
    }));

    // Call external submit handler if provided
    if (onSubmit) {
      onSubmit(typedAnswer, isCorrect);
    }
  }, [word, studyMode, onSubmit, findMatchingWord, allWords, normalizeForComparison, getAllValidAnswers]);

  // Handle typed answer changes
  const handleTypedAnswerChange = React.useCallback((value) => {
    setActivityState(prev => ({ ...prev, typedAnswer: value }));
  }, []);

  // Early return after all hooks
  if (!word) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  const question = getQuestionText(word, studyMode);
  const answer = getCorrectAnswer(word, studyMode);
  
  // Generate prompt text based on study mode
  const promptText = studyMode === 'english-to-lithuanian' ? 
    'Type the Lithuanian word (with proper accents)' : 
    'Type the English word';

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        questionText={question}
        answerText={answer}
        showAnswer={activityState.showAnswer}
        promptText={promptText}
        isClickable={false}
      />

      <TypingResponse
        currentWord={word}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={audioManager.playAudio.bind(audioManager)}
        onSubmit={handleSubmit}
        showAnswer={activityState.showAnswer}
        feedback={activityState.typingFeedback}
        typedAnswer={activityState.typedAnswer}
        onTypedAnswerChange={handleTypedAnswerChange}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        autoAdvanceTimer={autoAdvanceTimer}
      />
    </div>
  );
};

export default TypingActivity;
