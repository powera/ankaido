import React, { useState, useEffect, useCallback } from 'react';
import AudioButton from '../Components/AudioButton';
import audioManager from '../Managers/audioManager';
import safeStorage from '../DataStorage/safeStorage';

/**
 * Multi Word Sequence Activity Component
 * Plays 2-4 words in sequence with 0.2s pause between them.
 * User must identify the words from multiple options (sequence length + equal number of distractors).
 * All words must be from the same corpus with at least 20 enabled words.
 */
const MultiWordSequenceActivity = ({
  currentWord, // This will contain the sequence data
  showAnswer,
  selectedAnswers, // Array of selected word indices
  sequenceOptions, // Array of options (sequence words + equal number of distractors)
  audioEnabled,
  onAnswerClick,
  onResetAnswers, // New prop for resetting answers
  settings,
  allWords,
  autoAdvance,
  defaultDelay
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedInitial, setHasPlayedInitial] = useState(false);
  const [questionVoice, setQuestionVoice] = useState(null); // Voice for this specific question

  // Select a random voice for this question when currentWord changes
  useEffect(() => {
    if (currentWord?.sequence) {
      const selectedVoiceSetting = safeStorage?.getItem('flashcard-selected-voice') || 'random';
      
      if (selectedVoiceSetting === 'random') {
        // For random voice, select one and stick with it for this question
        const availableVoices = audioManager.getAvailableVoices();
        if (availableVoices.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableVoices.length);
          setQuestionVoice(availableVoices[randomIndex]);
        }
      } else {
        // Use the specific voice selected
        setQuestionVoice(selectedVoiceSetting);
      }
    }
  }, [currentWord]);

  // Auto-play the sequence when the activity loads
  useEffect(() => {
    if (audioEnabled && currentWord?.sequence && !hasPlayedInitial && questionVoice) {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playSequence();
        setHasPlayedInitial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentWord, audioEnabled, hasPlayedInitial, questionVoice]);

  // Reset hasPlayedInitial when word changes
  useEffect(() => {
    setHasPlayedInitial(false);
  }, [currentWord]);

  // Play the multi-word sequence with 0.2s pauses using the selected voice for this question
  const playSequence = useCallback(async () => {
    if (!audioEnabled || !currentWord?.sequence || isPlaying || !questionVoice) return;

    setIsPlaying(true);
    try {
      // Ensure audio context is initialized on first interaction
      if (!audioManager.isInitialized) {
        await audioManager.initializeAudioContext();
      }

      for (let i = 0; i < currentWord.sequence.length; i++) {
        const word = currentWord.sequence[i];
        // Use the specific voice selected for this question
        await audioManager.playAudio(word.lithuanian, false, true);
        
        // Add 0.2s pause between words (except after the last word)
        if (i < currentWord.sequence.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.warn('Failed to play sequence:', error);
    } finally {
      setIsPlaying(false);
    }
  }, [audioEnabled, currentWord, isPlaying, questionVoice]);

  // Handle option click - check for correct sequence order
  const handleOptionClick = useCallback((optionIndex) => {
    if (showAnswer) return;

    const option = sequenceOptions[optionIndex];
    const currentSelectionIndex = selectedAnswers.length; // This is the position we're trying to fill
    
    // Check if this option matches the word at the current position in the sequence
    const expectedWord = currentWord?.sequence?.[currentSelectionIndex];
    const isCorrectForPosition = expectedWord && 
      expectedWord.lithuanian === option.lithuanian && 
      expectedWord.english === option.english;

    if (onAnswerClick) {
      onAnswerClick(optionIndex, isCorrectForPosition, option);
    }
  }, [showAnswer, sequenceOptions, currentWord, selectedAnswers, onAnswerClick]);

  // Generate hint text based on answer state
  const getHintText = () => {
    const sequenceLength = currentWord?.sequence?.length || 0;
    const currentPosition = selectedAnswers.length + 1;
    
    if (!showAnswer) {
      if (selectedAnswers.length === 0) {
        return `Select the ${sequenceLength} words you heard in the correct order`;
      } else {
        return `Select word ${currentPosition} of ${sequenceLength} (in sequence order)`;
      }
    }

    // Calculate how many were correct in the right positions
    const correctCount = selectedAnswers?.filter((answerIndex, position) => {
      const option = sequenceOptions[answerIndex];
      const expectedWord = currentWord?.sequence?.[position];
      return expectedWord && 
        expectedWord.lithuanian === option.lithuanian && 
        expectedWord.english === option.english;
    }).length || 0;

    let hintText = `You got ${correctCount} out of ${sequenceLength} words in the correct order`;
    
    // Add auto-advance information if enabled
    if (autoAdvance && defaultDelay) {
      hintText += ` - will advance after ${defaultDelay} second${defaultDelay !== 1 ? 's' : ''}`;
    }
    
    return hintText;
  };

  // Early return after all hooks
  if (!currentWord?.sequence || !sequenceOptions?.length) return null;

  const sequenceLength = currentWord?.sequence?.length || 0;

  return (
    <div className="multi-word-sequence-activity">
      {/* Header with instructions and replay button */}
      <div className="sequence-header">
        <div className="sequence-instructions">
          <h3>🎧 Listen to the sequence of {sequenceLength} words</h3>
          <p className="sequence-hint">{getHintText()}</p>
        </div>
        
        <div className="sequence-controls">
          <button
            className="w-button"
            onClick={playSequence}
            disabled={!audioEnabled || isPlaying}
            title="Replay the sequence"
          >
            {isPlaying ? '⏳' : '🔄'} {isPlaying ? 'Playing...' : 'Replay Sequence'}
          </button>
          <button
            className="w-button w-button-secondary"
            onClick={onResetAnswers}
            disabled={showAnswer || selectedAnswers.length === 0}
            title="Reset your answers"
          >
            🔄 Reset Answers
          </button>
        </div>
      </div>

      {/* Word options grid */}
      <div className="sequence-options-grid">
        {sequenceOptions.map((option, index) => {
          const isSelected = selectedAnswers?.includes(index);
          const selectionPosition = selectedAnswers?.indexOf(index) + 1; // 1-based position
          
          // Check if this option is correct for any position in the sequence
          const isCorrectOption = currentWord.sequence.some(seqWord => 
            seqWord.lithuanian === option.lithuanian && seqWord.english === option.english
          );
          
          // Check if this option was selected in the correct position
          const isCorrectPosition = isSelected && selectedAnswers && 
            selectedAnswers.findIndex(answerIndex => answerIndex === index) !== -1 &&
            currentWord.sequence[selectedAnswers.indexOf(index)] &&
            currentWord.sequence[selectedAnswers.indexOf(index)].lithuanian === option.lithuanian &&
            currentWord.sequence[selectedAnswers.indexOf(index)].english === option.english;
          
          let className = 'sequence-option';
          
          if (showAnswer) {
            if (isCorrectPosition) {
              className += ' sequence-correct';
            } else if (isSelected && !isCorrectPosition) {
              className += ' sequence-incorrect';
            } else if (!isSelected && isCorrectOption) {
              className += ' sequence-missed'; // Correct option that wasn't selected
            } else {
              className += ' sequence-unselected';
            }
          } else if (isSelected) {
            className += ' sequence-selected';
          }

          // Disable options that are already selected or if we're showing answers
          const isDisabled = showAnswer || isSelected;

          return (
            <button
              key={index}
              className={className}
              onClick={() => handleOptionClick(index)}
              disabled={isDisabled}
            >
              <div className="sequence-option-content">
                {isSelected && !showAnswer && (
                  <div className="sequence-selection-number">{selectionPosition}</div>
                )}
                <div className="sequence-option-text">
                  <div className="sequence-option-lithuanian">{option.lithuanian}</div>
                  <div className="sequence-option-english">({option.english})</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show the correct sequence when answer is revealed */}
      {showAnswer && (
        <div className="sequence-answer-reveal">
          <h4>The correct sequence was:</h4>
          <div className="sequence-correct-order">
            {currentWord.sequence.map((word, index) => (
              <div key={index} className="sequence-correct-word">
                <span className="sequence-word-number">{index + 1}.</span>
                <span className="sequence-word-text">
                  {word.lithuanian} ({word.english})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiWordSequenceActivity;