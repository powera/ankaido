
import React from 'react';
import TypingResponse from '../Components/TypingResponse';
import WordDisplayCard from '../Components/WordDisplayCard';
import audioManager from '../Managers/audioManager';
import { createInitialActivityState, getAllValidAnswers, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';
import { StudyMode, Word, WordListState } from '../Utilities/types';

// WordListManager interface - based on the actual implementation
interface WordListManager {
  getCurrentWord(): Word | undefined;
  [key: string]: any;
}

// Props interface for TypingActivity component
export interface TypingActivityProps {
  wordListManager?: WordListManager;
  wordListState?: WordListState;
  currentWord?: Word | null;
  studyMode: StudyMode;
  onSubmit?: (typedAnswer: string, isCorrect: boolean) => void;
  audioEnabled: boolean;
  autoAdvance?: boolean;
  defaultDelay?: number;
  autoAdvanceTimer?: NodeJS.Timeout | null;
  allWords?: Word[];
}

/**
 * Typing Activity Component
 * Presents a word and requires user to type the translation
 */
const TypingActivity: React.FC<TypingActivityProps> = ({ 
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
  const word: Word | null = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null) || null;

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      typedAnswer: '',
      typingFeedback: ''
    }));
  }, [word]);

  // Auto-play audio for source->EN typing (source language prompt, player types English answer)
  React.useEffect(() => {
    if (audioEnabled && word && studyMode === 'source-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        audioManager.playAudio(word.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word, studyMode, audioEnabled, audioManager]);

  // Helper function to normalize text for comparison
  const normalizeForComparison = (text: string): string => {
    return text
      .replace(/\([^)]*\)/g, '') // Remove text in parentheses
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim()
      .toLowerCase();
  };

  // Helper function to find if typed answer matches a different word's translation
  const findMatchingWord = React.useCallback((
    typedAnswer: string, 
    currentWord: Word | null, 
    studyMode: StudyMode, 
    allWords?: Word[]
  ): Word | null => {
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
    
    return matchingWord || null;
  }, [normalizeForComparison, getAllValidAnswers]);

  // Handle typed answer submission
  const handleSubmit = React.useCallback(async (typedAnswer: string): Promise<void> => {
    if (!word) return;
    
    const correctAnswer = getCorrectAnswer(word, studyMode);
    const allValidAnswers = getAllValidAnswers(word, studyMode);
    
    // Normalize typed answer for comparison
    const normalizedTyped = normalizeForComparison(typedAnswer);
    
    // Check if typed answer matches any of the valid answers
    const isCorrect = allValidAnswers.some(validAnswer => 
      normalizeForComparison(validAnswer) === normalizedTyped
    );

    // Generate feedback message
    let feedback: string;
    if (isCorrect) {
      feedback = '✅ Correct!';
    } else {
      // Check if the typed answer matches a different word's translation
      const matchingWord = findMatchingWord(typedAnswer, word, studyMode, allWords);
      
      if (matchingWord) {
        // Determine which word field to show based on study mode
        const sourceField = studyMode === 'english-to-source' ? 'english' : 'lithuanian';
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
  const handleTypedAnswerChange = React.useCallback((value: string): void => {
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

  const question: string = getQuestionText(word, studyMode);
  const answer: string = getCorrectAnswer(word, studyMode);
  
  // Generate prompt text based on study mode
  // TODO: re-display this or remove it
  const promptText: string = studyMode === 'english-to-source' ? 
    'Type the source language word (with proper accents)' : 
    'Type the English word';

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
        audioEnabled={audioEnabled}
        questionText={question}
        answerText={answer}
        showAnswer={activityState.showAnswer}
        isClickable={false}
      />

      <TypingResponse
        currentWord={word}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        audioManager={audioManager}
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
