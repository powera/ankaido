import React from 'react';
import { AudioManager, StudyMode, Word } from '../Utilities/types';

interface TypingResponseProps {
  currentWord: Word | null;
  studyMode: StudyMode;
  audioEnabled: boolean;
  audioManager?: AudioManager;
  onSubmit: (answer: string) => void;
  showAnswer: boolean;
  feedback: string;
  typedAnswer: string;
  onTypedAnswerChange: (value: string) => void;
  autoAdvance?: boolean;
  defaultDelay?: number;
  onNext?: () => void;
  autoAdvanceTimer?: NodeJS.Timeout | null;
  promptText?: string;
}

const TypingResponse: React.FC<TypingResponseProps> = ({
  currentWord,
  studyMode,
  audioEnabled,
  audioManager,
  onSubmit,
  showAnswer,
  feedback,
  typedAnswer,
  onTypedAnswerChange,
  autoAdvance,
  defaultDelay,
  onNext,
  autoAdvanceTimer,
  promptText
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentWord || showAnswer) return;
    onSubmit(typedAnswer);
  };

  const correctAnswer = studyMode === 'english-to-lithuanian' ? 
    (currentWord?.term || currentWord?.lithuanian) : (currentWord?.definition || currentWord?.english);

  // Use provided promptText or fallback to default based on study mode
  const finalPromptText = promptText || (studyMode === 'english-to-lithuanian' ? 
    'Type the Lithuanian word (with proper accents)' : 
    'Type the English word');

  return (
    <div>
      {/* Display feedback when answer is shown */}
      {showAnswer && feedback && (
        <div 
          className="w-feedback" 
          style={{ 
            padding: 'var(--spacing-base)',
            marginBottom: 'var(--spacing-base)',
            borderRadius: 'var(--border-radius)',
            backgroundColor: feedback.includes('✅') ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
            border: `1px solid ${feedback.includes('✅') ? 'green' : 'red'}`
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: 'var(--spacing-small)',
            color: feedback.includes('✅') ? 'green' : 'red' 
          }}>
            {feedback}
            {feedback.includes('✅') && autoAdvance && autoAdvanceTimer && defaultDelay && (
              <span style={{ marginLeft: '1rem', fontSize: '0.9rem', fontWeight: 'normal' }}>
                (Next card in {defaultDelay}s...)
              </span>
            )}
          </div>
          <div>
            <strong>Your answer:</strong> {typedAnswer}
          </div>
        </div>
      )}

      {/* Input field for typing the answer */}
      <div className="w-typing-area" style={{ marginBottom: 'var(--spacing-base)' }}>
        {!showAnswer ? (
          <div>
            {/* Prominent typing directions */}
            <div style={{ 
              marginBottom: 'var(--spacing-base)', 
              padding: 'var(--spacing-small)',
              backgroundColor: 'var(--color-primary-light, rgba(0, 123, 255, 0.1))',
              border: '1px solid var(--color-primary, #007bff)',
              borderRadius: 'var(--border-radius)',
              textAlign: 'center',
              fontWeight: 'bold',
              color: 'var(--color-primary, #007bff)'
            }}>
              {finalPromptText}
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-small)' }}>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => onTypedAnswerChange(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-typing-input"
                  disabled={showAnswer}
                  autoFocus
                  lang={studyMode === 'english-to-lithuanian' ? 'lt' : 'en'}
                />
                <button 
                  type="submit" 
                  className="w-button w-button-primary"
                  disabled={showAnswer || !typedAnswer.trim()}
                >
                  Submit
                </button>
              </form>
            </div>

            {/* Special character buttons to help with typing Lithuanian characters */}
            {studyMode === 'english-to-lithuanian' && (
              <div className="w-character-helpers" style={{ marginTop: 'var(--spacing-small)' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-small)', fontSize: '0.9rem' }}>
                  Special characters:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['ą', 'č', 'ę', 'ė', 'į', 'š', 'ų', 'ū', 'ž'].map((char: string) => (
                    <button
                      key={char}
                      className="w-special-char"
                      onClick={() => onTypedAnswerChange(typedAnswer + char)}
                      style={{
                        padding: '0.5rem 0.7rem',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-card-bg)',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        minWidth: '2.5rem'
                      }}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
          </>
        )}
      </div>
    </div>
  );
};

export default TypingResponse;