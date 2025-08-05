import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';
import audioManager from '../Managers/audioManager';
import { getQuestionText } from '../Utilities/activityHelpers';
import { StudyMode, Word } from '../Utilities/types';

// Type definitions

interface BlitzActivityProps {
  currentWord: Word | null;
  showAnswer: boolean;
  selectedAnswer: string | null;
  multipleChoiceOptions: string[];
  studyMode: StudyMode;
  audioEnabled: boolean;
  onAnswerClick?: (selectedOption: string, isCorrect: boolean) => void;
  questionsAnswered: number;
  totalQuestions: number;
  score: number;
  isGameComplete: boolean;
  targetWordIndex: number;
  onExitBlitz?: () => void;
}

/**
 * Blitz Activity Component
 * Presents a word and 8 multiple choice options in a fast-paced format
 */
const BlitzActivity: React.FC<BlitzActivityProps> = ({ 
  currentWord,
  showAnswer,
  selectedAnswer,
  multipleChoiceOptions,
  studyMode,
  audioEnabled,
  onAnswerClick,
  questionsAnswered,
  totalQuestions,
  score,
  isGameComplete,
  targetWordIndex,
  onExitBlitz
}) => {
  // Auto-play audio for LT->EN blitz (Lithuanian prompt, player chooses English answer)
  React.useEffect(() => {
    if (audioEnabled && currentWord && studyMode === 'lithuanian-to-english') {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        audioManager.playAudio(currentWord.lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentWord, studyMode, audioEnabled]);

  // Handle answer click with correctness determination
  const handleAnswerClick = React.useCallback((selectedOption: string) => {
    if (showAnswer || isGameComplete) return; // Prevent clicking during feedback or when game is complete
    
    // Find which index was clicked
    const selectedIndex: number = multipleChoiceOptions.indexOf(selectedOption);
    const isCorrect: boolean = selectedIndex === targetWordIndex;
    
    // Call the onAnswerClick callback with correctness information
    if (onAnswerClick) {
      onAnswerClick(selectedOption, isCorrect);
    }
  }, [onAnswerClick, multipleChoiceOptions, targetWordIndex, showAnswer, isGameComplete]);

  // Early return after all hooks
  if (!currentWord) return null;

  const question: string = getQuestionText(currentWord, studyMode);

  // Generate hint text based on answer state
  const getHintText = (): string => {
    if (isGameComplete) {
      return `Game Complete! Final Score: ${score}/${totalQuestions}`;
    }
    
    if (!showAnswer) {
      return `Question ${questionsAnswered + 1}/${totalQuestions} - Choose the correct answer`;
    }
    
    // Determine if the selected answer was correct
    const selectedIndex: number = selectedAnswer ? multipleChoiceOptions.indexOf(selectedAnswer) : -1;
    const isCorrect: boolean = selectedIndex === targetWordIndex;
    
    return isCorrect ? "Correct! ✓" : "Incorrect ✗";
  };

  // Generate progress bar
  const progressPercentage: number = (questionsAnswered / totalQuestions) * 100;

  return (
    <div>
      {/* Progress bar and exit button */}
      <div className="w-blitz-progress" style={{ marginBottom: 'var(--spacing-medium)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div className="w-blitz-progress-bar" style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: '#4CAF50',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          {onExitBlitz && (
            <button 
              className="w-button"
              onClick={onExitBlitz}
              style={{ 
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                marginLeft: 'var(--spacing-small)'
              }}
            >
              ← Exit
            </button>
          )}
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '4px',
          fontSize: '0.9em',
          color: '#666'
        }}>
          <span>Score: {score}/{questionsAnswered}</span>
          <span>{questionsAnswered}/{totalQuestions}</span>
        </div>
      </div>

      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        questionText={question}
        showHints={true}
        hintText={getHintText()}
        style={{ padding: 'min(var(--spacing-large), 1rem)' }}
      />
      
      {/* 8-option multiple choice grid */}
      <div className="w-blitz-options" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--spacing-small)',
        marginTop: 'var(--spacing-medium)'
      }}>
        {multipleChoiceOptions.map((option: string, index: number) => {
          const isCorrect: boolean = index === targetWordIndex;
          const isSelected: boolean = selectedAnswer === option;
          
          let buttonClass: string = 'w-button w-blitz-option';
          let buttonStyle: React.CSSProperties = {
            padding: 'var(--spacing-small)',
            fontSize: '0.9em',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: (showAnswer || isGameComplete) ? 'default' : 'pointer',
            opacity: (showAnswer || isGameComplete) ? 0.7 : 1,
            // Add a subtle highlight for the target word position when not showing answer
            border: !showAnswer && isCorrect ? '2px solid #2196F3' : '1px solid #ddd'
          };
          
          if (showAnswer) {
            if (isSelected) {
              buttonClass += isCorrect ? ' w-correct' : ' w-incorrect';
              buttonStyle.backgroundColor = isCorrect ? '#4CAF50' : '#f44336';
              buttonStyle.color = 'white';
            } else if (isCorrect) {
              buttonClass += ' w-correct-highlight';
              buttonStyle.backgroundColor = '#81C784';
              buttonStyle.color = 'white';
            }
          }
          
          return (
            <button
              key={index}
              className={buttonClass}
              style={buttonStyle}
              onClick={() => handleAnswerClick(option)}
              disabled={showAnswer || isGameComplete}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BlitzActivity;