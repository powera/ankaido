import React from 'react';
import AudioButton from './AudioButton';

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
      wordListManager.markCorrect(autoAdvance, defaultDelay);
    } else {
      wordListManager.setTypingFeedback(`❌ Incorrect. The answer is: ${correctAnswer}`);
      wordListManager.markIncorrect(autoAdvance, defaultDelay);
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

  return (
    <div className="w-card">
      <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>

      {/* Always display both English and Lithuanian */}
      <div className="w-word-display" style={{ marginBottom: 'var(--spacing-base)' }}>
        <div className="w-question" style={{ marginBottom: 'var(--spacing-small)' }}>
          <span style={{ fontWeight: 'bold' }}>English:</span> {currentWord.english}
        </div>

        {wordListState.showAnswer ? (
          <div className="w-answer" style={{ marginBottom: 'var(--spacing-base)' }}>
            <span style={{ fontWeight: 'bold' }}>Lithuanian:</span> {currentWord.lithuanian}
            <span style={{ marginLeft: '0.5rem' }}>
              <AudioButton 
                word={currentWord.lithuanian} 
                audioEnabled={audioEnabled}
                playAudio={playAudio}
              />
            </span>
          </div>
        ) : (
          <div className="w-prompt" style={{ 
            marginBottom: 'var(--spacing-base)', 
            color: 'var(--color-text-muted)',
            fontStyle: 'italic'
          }}>
            Type the Lithuanian word (with proper accents)
          </div>
        )}
      </div>

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
              <strong>Correct answer:</strong> {currentWord.lithuanian}
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