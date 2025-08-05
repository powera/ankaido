import React, { useCallback, useEffect, useState } from 'react';
import safeStorage from '../DataStorage/safeStorage';
import audioManager from '../Managers/audioManager';

// Type definitions
interface Word {
  lithuanian: string;
  english: string;
}

interface SequenceData {
  sequence: Word[];
}

interface MultiWordSequenceActivityProps {
  currentWord: SequenceData; // This will contain the sequence data
  showAnswer: boolean;
  selectedAnswers: number[]; // Array of selected word indices
  sequenceOptions: Word[]; // Array of options (sequence words + equal number of distractors)
  audioEnabled: boolean;
  onAnswerClick: (optionIndex: number, isCorrectForPosition: boolean, option: Word) => void;
  onResetAnswers: () => void; // New prop for resetting answers
  allWords: Word[];
  autoAdvance: boolean;
  defaultDelay: number;
}

/**
 * Multi Word Sequence Activity Component
 * Plays 2-4 words in sequence with 0.2s pause between them.
 * User must identify the words from multiple options (sequence length + equal number of distractors).
 * All words must be from the same corpus with at least 20 enabled words.
 */
const MultiWordSequenceActivity: React.FC<MultiWordSequenceActivityProps> = ({
  currentWord, // This will contain the sequence data
  showAnswer,
  selectedAnswers, // Array of selected word indices
  sequenceOptions, // Array of options (sequence words + equal number of distractors)
  audioEnabled,
  onAnswerClick,
  onResetAnswers, // New prop for resetting answers
  allWords,
  autoAdvance,
  defaultDelay
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasPlayedInitial, setHasPlayedInitial] = useState<boolean>(false);
  const [questionVoice, setQuestionVoice] = useState<string | null>(null); // Voice for this specific question

  // Play the multi-word sequence with 0.2s pauses using the selected voice for this question
  const playSequence = useCallback(async () => {
    if (!audioEnabled || !currentWord?.sequence || isPlaying || !questionVoice) return;

    setIsPlaying(true);
    
    // Temporarily set the voice for this sequence
    const originalVoiceSetting = safeStorage?.getItem('flashcard-selected-voice');
    if (questionVoice && originalVoiceSetting === 'random') {
      safeStorage?.setItem('flashcard-selected-voice', questionVoice);
    }

    try {
      for (let i = 0; i < currentWord.sequence.length; i++) {
        const word = currentWord.sequence[i];
        // Use sequential=true to allow multiple audio files to play in sequence
        await audioManager.playAudio(word.lithuanian, false, true);
        
        // Add 0.2s pause between words (except after the last word)
        if (i < currentWord.sequence.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.warn('Failed to play sequence:', error);
    } finally {
      // Restore the original voice setting
      if (originalVoiceSetting === 'random') {
        safeStorage?.setItem('flashcard-selected-voice', 'random');
      }
      setIsPlaying(false);
    }
  }, [audioEnabled, currentWord, isPlaying, questionVoice]);

  // Select a random voice for this question when currentWord changes
  useEffect(() => {
    if (currentWord?.sequence) {
      const selectedVoiceSetting = safeStorage?.getItem('ankaido-selected-voice') || 'random';
      
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
  }, [currentWord, audioEnabled, hasPlayedInitial, questionVoice, playSequence]);

  // Reset hasPlayedInitial when word changes and stop any playing audio
  useEffect(() => {
    setHasPlayedInitial(false);
    // Stop any currently playing audio when the word changes
    audioManager.stopCurrentAudio();
  }, [currentWord]);

  // Cleanup: stop audio when component unmounts
  useEffect(() => {
    return () => {
      // Stop all audio playback and clear queue when component unmounts
      audioManager.stopAllAudio();
      setIsPlaying(false);
    };
  }, []);

  // Handle option click - check for correct sequence order
  const handleOptionClick = useCallback((optionIndex: number) => {
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
  const getHintText = (): string => {
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
        {sequenceOptions.map((option: Word, index: number) => {
          const isSelected: boolean = selectedAnswers?.includes(index);
          const selectionPosition: number = selectedAnswers?.indexOf(index) + 1; // 1-based position
          
          // Check if this option is correct for any position in the sequence
          const isCorrectOption: boolean = currentWord.sequence.some((seqWord: Word) => 
            seqWord.lithuanian === option.lithuanian && seqWord.english === option.english
          );
          
          // Check if this option was selected in the correct position
          const isCorrectPosition: boolean = isSelected && selectedAnswers && 
            selectedAnswers.findIndex((answerIndex: number) => answerIndex === index) !== -1 &&
            currentWord.sequence[selectedAnswers.indexOf(index)] &&
            currentWord.sequence[selectedAnswers.indexOf(index)].lithuanian === option.lithuanian &&
            currentWord.sequence[selectedAnswers.indexOf(index)].english === option.english;
          
          let className: string = 'sequence-option';
          
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
          const isDisabled: boolean = showAnswer || isSelected;

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
            {currentWord.sequence.map((word: Word, index: number) => (
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