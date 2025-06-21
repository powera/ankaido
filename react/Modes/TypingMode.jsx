
import React from 'react';
import WordDisplayCard from '../Components/WordDisplayCard';

const TypingMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  nextCard,
  audioEnabled,
  playAudio,
  autoAdvance,
  defaultDelay
}) => {
  const currentWord = wordListManager.getCurrentWord();

  // Handle checking typed answer - always check against Lithuanian word
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentWord || wordListState.showAnswer) return;

    const correctAnswer = studyMode === 'english-to-lithuanian' ? 
      currentWord.lithuanian : currentWord.english;

    const isCorrect = wordListState.typedAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    if (isCorrect) {
      wordListManager.setTypingFeedback('✅ Correct!');
      wordListManager.updateStatsCorrect();
    } else {
      wordListManager.setTypingFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
      wordListManager.updateStatsIncorrect();
    }

    wordListManager.setShowAnswer(true);
  };

  if (!currentWord) {
    return (
      <div className="w-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
          <div>Loading word...</div>
        </div>
      </div>
    );
  }

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;
  const answer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
  const promptText = studyMode === 'english-to-lithuanian' ? 
    'Type the Lithuanian word (with proper accents)' : 
    'Type the English word';

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText={question}
        answerText={answer}
        showAnswer={wordListState.showAnswer}
        promptText={promptText}
        isClickable={false}
      />

      {/* Display feedback when answer is shown */}
      {wordListState.showAnswer && (
        <div 
          className="w-feedback" 
          style={{ 
            padding: 'var(--spacing-base)',
            marginBottom: 'var(--spacing-base)',
            borderRadius: 'var(--border-radius)',
            backgroundColor: wordListState.typingFeedback === '✅ Correct!' ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
            border: `1px solid ${wordListState.typingFeedback === '✅ Correct!' ? 'green' : 'red'}`
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: 'var(--spacing-small)',
            color: wordListState.typingFeedback === '✅ Correct!' ? 'green' : 'red' 
          }}>
            {wordListState.typingFeedback}
            {wordListState.typingFeedback === '✅ Correct!' && autoAdvance && wordListState.autoAdvanceTimer && (
              <span style={{ marginLeft: '1rem', fontSize: '0.9rem', fontWeight: 'normal' }}>
                (Next card in {defaultDelay}s...)
              </span>
            )}
          </div>
          <div>
            <strong>Your answer:</strong> {wordListState.typedAnswer}
          </div>
          {wordListState.typingFeedback !== '✅ Correct!' && (
            <div>
              <strong>Correct answer:</strong> {answer}
            </div>
          )}
        </div>
      )}

      {/* Input field for typing the answer */}
      <div className="w-typing-area" style={{ marginBottom: 'var(--spacing-base)' }}>
        {!wordListState.showAnswer ? (
          <div>
            <div style={{ display: 'flex', gap: 'var(--spacing-small)' }}>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={wordListState.typedAnswer}
                  onChange={(e) => wordListManager.setTypedAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="w-typing-input"
                  disabled={wordListState.showAnswer}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="w-button w-button-primary"
                  disabled={wordListState.showAnswer || !wordListState.typedAnswer.trim()}
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
                  {['ą', 'č', 'ę', 'ė', 'į', 'š', 'ų', 'ū', 'ž'].map(char => (
                    <button
                      key={char}
                      className="w-special-char"
                      onClick={() => wordListManager.setTypedAnswer(wordListState.typedAnswer + char)}
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
          <button 
            className="w-button"
            onClick={nextCard}
            style={{ width: '100%' }}
          >
            Next Word →
          </button>
        )}
      </div>
    </div>
  );
};

export default TypingMode;
