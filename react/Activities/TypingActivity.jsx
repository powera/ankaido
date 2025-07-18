
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import TypingResponse from '../Components/TypingResponse';
import audioManager from '../Managers/audioManager';
import { createInitialActivityState, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';

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
    
    // Determine what field to check based on study mode
    const targetField = studyMode === 'english-to-lithuanian' ? 'lithuanian' : 'english';
    
    // Find a word where the typed answer matches the target translation
    const matchingWord = allWords.find(word => {
      // Skip the current word
      if (word === currentWord || 
          (word.lithuanian === currentWord?.lithuanian && word.english === currentWord?.english)) {
        return false;
      }
      
      // Check if typed answer matches this word's translation
      const wordTranslation = word[targetField];
      const normalizedTranslation = normalizeForComparison(wordTranslation);
      
      return normalizedTyped === normalizedTranslation;
    });
    
    return matchingWord;
  }, [normalizeForComparison]);

  // Handle typed answer submission
  const handleSubmit = React.useCallback(async (typedAnswer) => {
    const correctAnswer = getCorrectAnswer(word, studyMode);
    
    // Normalize both answers for comparison
    const normalizedTyped = normalizeForComparison(typedAnswer);
    const normalizedCorrect = normalizeForComparison(correctAnswer);
    const isCorrect = normalizedTyped === normalizedCorrect;

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
        
        feedback = `❌ Incorrect. That's the translation for "${sourceWord}". Correct answer: ${correctAnswer}`;
      } else {
        feedback = `❌ Incorrect. Correct answer: ${correctAnswer}`;
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
  }, [word, studyMode, onSubmit, findMatchingWord, allWords, normalizeForComparison]);

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
