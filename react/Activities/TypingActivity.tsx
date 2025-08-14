
import React from 'react';
import TypingResponse from '../Components/TypingResponse';
import WordDisplayCard from '../Components/WordDisplayCard';
import ttsAudioManager from '../Managers/ttsAudioManager';
import { createInitialActivityState, getAllValidAnswers, getCorrectAnswer, getQuestionText } from '../Utilities/activityHelpers';
import { StudyMode, Word, WordListState } from '../Utilities/types';
import { getTypingDirectionsForCorpus } from '../Utilities/apiClient';

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
  
  const [typingDirections, setTypingDirections] = React.useState<string>('Type the term');

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

  // Fetch typing directions when word changes
  React.useEffect(() => {
    if (word && word.corpus) {
      getTypingDirectionsForCorpus(word.corpus).then(directions => {
        setTypingDirections(directions);
      });
    }
  }, [word]);

  // Auto-play audio for typing mode (play the definition, user types the term)
  React.useEffect(() => {
    if (audioEnabled && word) {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        // Play the definition
        ttsAudioManager.playAudio(word.definition || word.english);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [word, audioEnabled]);

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
    allWords?: Word[]
  ): Word | null => {
    if (!allWords || !Array.isArray(allWords)) return null;
    
    const normalizedTyped = normalizeForComparison(typedAnswer);
    
    // Find a word where the typed answer matches any of its valid translations
    const matchingWord = allWords.find(word => {
      // Skip the current word
      if (word === currentWord || 
          ((word.term || word.lithuanian) === (currentWord?.term || currentWord?.lithuanian) && 
           (word.definition || word.english) === (currentWord?.definition || currentWord?.english))) {
        return false;
      }
      
      // Get all valid answers for this word (always terms in typing mode)
      const wordValidAnswers = getAllValidAnswers(word, 'english-to-source');
      return wordValidAnswers.some(validAnswer => 
        normalizeForComparison(validAnswer) === normalizedTyped
      );
    });
    
    return matchingWord || null;
  }, [normalizeForComparison, getAllValidAnswers]);

  // Handle typed answer submission
  const handleSubmit = React.useCallback(async (typedAnswer: string): Promise<void> => {
    if (!word) return;
    
    // Always use english-to-source mode for typing (definition -> term)
    const correctAnswer = getCorrectAnswer(word, 'english-to-source');
    const allValidAnswers = getAllValidAnswers(word, 'english-to-source');
    
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
      const matchingWord = findMatchingWord(typedAnswer, word, allWords);
      
      if (matchingWord) {
        // Always show the definition for the matching word
        const sourceWord = matchingWord.definition || matchingWord.english;
        
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
  }, [word, onSubmit, findMatchingWord, allWords, normalizeForComparison, getAllValidAnswers]);

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

  // Always show definition as question and ask for term as answer
  const question: string = word.definition || word.english;  // This contains the definition
  const answer: string = word.term || word.lithuanian;  // This contains the term
  
  // Use dynamic typing directions based on corpus
  const promptText: string = typingDirections;

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
        audioManager={ttsAudioManager}
        onSubmit={handleSubmit}
        showAnswer={activityState.showAnswer}
        feedback={activityState.typingFeedback}
        typedAnswer={activityState.typedAnswer}
        onTypedAnswerChange={handleTypedAnswerChange}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
        autoAdvanceTimer={autoAdvanceTimer}
        promptText={promptText}
      />
    </div>
  );
};

export default TypingActivity;
