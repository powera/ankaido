import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiWordSequenceActivity from '../Activities/MultiWordSequenceActivity';
import { generateMultiWordSequence, canGenerateMultiWordSequence } from '../Utilities/multiWordSequenceGenerator';

// Mock audioManager
jest.mock('../Managers/audioManager', () => ({
  playAudio: jest.fn().mockResolvedValue(true)
}));

// Mock AudioButton component
jest.mock('../Components/AudioButton', () => {
  return function MockAudioButton({ word, onClick }) {
    return <button data-testid={`audio-${word}`} onClick={onClick}>🔊</button>;
  };
});

describe('MultiWordSequenceActivity', () => {
  const mockWords = [
    { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
    { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
    { lithuanian: 'paukštis', english: 'bird', corpus: 'animals' },
    { lithuanian: 'žuvis', english: 'fish', corpus: 'animals' },
    { lithuanian: 'arklys', english: 'horse', corpus: 'animals' },
    { lithuanian: 'kiaulė', english: 'pig', corpus: 'animals' },
    { lithuanian: 'avis', english: 'sheep', corpus: 'animals' },
    { lithuanian: 'ožka', english: 'goat', corpus: 'animals' },
    { lithuanian: 'triušis', english: 'rabbit', corpus: 'animals' },
    { lithuanian: 'pelė', english: 'mouse', corpus: 'animals' },
    { lithuanian: 'dramblys', english: 'elephant', corpus: 'animals' },
    { lithuanian: 'liūtas', english: 'lion', corpus: 'animals' },
    { lithuanian: 'tigras', english: 'tiger', corpus: 'animals' },
    { lithuanian: 'meška', english: 'bear', corpus: 'animals' },
    { lithuanian: 'vilkas', english: 'wolf', corpus: 'animals' },
    { lithuanian: 'lapė', english: 'fox', corpus: 'animals' },
    { lithuanian: 'zuikis', english: 'hare', corpus: 'animals' },
    { lithuanian: 'voverė', english: 'squirrel', corpus: 'animals' },
    { lithuanian: 'ežys', english: 'hedgehog', corpus: 'animals' },
    { lithuanian: 'šikšnosparnis', english: 'bat', corpus: 'animals' },
    { lithuanian: 'gyvatė', english: 'snake', corpus: 'animals' },
    { lithuanian: 'varlė', english: 'frog', corpus: 'animals' }
  ];

  const mockSequenceData = generateMultiWordSequence(mockWords);

  const defaultProps = {
    currentWord: mockSequenceData,
    showAnswer: false,
    selectedAnswers: [],
    sequenceOptions: mockSequenceData?.options || [],
    audioEnabled: true,
    onAnswerClick: jest.fn(),
    settings: {},
    allWords: mockWords,
    autoAdvance: false,
    defaultDelay: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders activity with sequence options', () => {
    render(<MultiWordSequenceActivity {...defaultProps} />);
    
    const sequenceLength = mockSequenceData?.sequence?.length || 4;
    expect(screen.getByText(`🎧 Listen to the sequence of ${sequenceLength} words`)).toBeInTheDocument();
    expect(screen.getByText('🔄 Replay Sequence')).toBeInTheDocument();
    expect(screen.getByText(`Select the ${sequenceLength} words you heard in the sequence`)).toBeInTheDocument();
    
    // Should show options (sequence length * 2)
    const options = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('sequence-option')
    );
    expect(options).toHaveLength(sequenceLength * 2);
  });

  test('replay button triggers sequence playback', async () => {
    const audioManager = require('../Managers/audioManager').default;
    render(<MultiWordSequenceActivity {...defaultProps} />);
    
    const replayButton = screen.getByText('🔄 Replay Sequence');
    fireEvent.click(replayButton);
    
    // Should call playAudio for each word in sequence
    const sequenceLength = mockSequenceData?.sequence?.length || 4;
    await waitFor(() => {
      expect(audioManager.playAudio).toHaveBeenCalledTimes(sequenceLength);
    });
  });

  test('handles option selection', () => {
    const mockOnAnswerClick = jest.fn();
    render(<MultiWordSequenceActivity {...defaultProps} onAnswerClick={mockOnAnswerClick} />);
    
    const options = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('sequence-option')
    );
    
    fireEvent.click(options[0]);
    
    expect(mockOnAnswerClick).toHaveBeenCalledWith(
      0, // option index
      expect.any(Boolean), // isCorrect
      expect.any(Object) // option object
    );
  });

  test('shows answer reveal when showAnswer is true', () => {
    const sequenceLength = mockSequenceData?.sequence?.length || 4;
    const propsWithAnswer = {
      ...defaultProps,
      showAnswer: true,
      selectedAnswers: Array.from({ length: sequenceLength }, (_, i) => i)
    };
    
    render(<MultiWordSequenceActivity {...propsWithAnswer} />);
    
    expect(screen.getByText('The correct sequence was:')).toBeInTheDocument();
    
    // Should show numbered sequence for each word
    for (let i = 1; i <= sequenceLength; i++) {
      expect(screen.getByText(`${i}.`)).toBeInTheDocument();
    }
  });

  test('disables options when answer is shown', () => {
    const propsWithAnswer = {
      ...defaultProps,
      showAnswer: true
    };
    
    render(<MultiWordSequenceActivity {...propsWithAnswer} />);
    
    const options = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('sequence-option')
    );
    
    options.forEach(option => {
      expect(option).toBeDisabled();
    });
  });
});

describe('multiWordSequenceGenerator', () => {
  const mockWords = [
    { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
    { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
    // ... (would include all 22 words from above)
  ];

  test('canGenerateMultiWordSequence returns true for sufficient words', () => {
    const fullMockWords = Array.from({ length: 25 }, (_, i) => ({
      lithuanian: `word${i}`,
      english: `word${i}`,
      corpus: 'test'
    }));
    
    expect(canGenerateMultiWordSequence(fullMockWords, 4)).toBe(true);
    expect(canGenerateMultiWordSequence(fullMockWords, 3)).toBe(true);
    expect(canGenerateMultiWordSequence(fullMockWords, 2)).toBe(true);
  });

  test('canGenerateMultiWordSequence returns false for insufficient words', () => {
    const fewWords = Array.from({ length: 15 }, (_, i) => ({
      lithuanian: `word${i}`,
      english: `word${i}`,
      corpus: 'test'
    }));
    
    expect(canGenerateMultiWordSequence(fewWords, 4)).toBe(false);
    expect(canGenerateMultiWordSequence(fewWords, 3)).toBe(false);
    expect(canGenerateMultiWordSequence(fewWords, 2)).toBe(false);
  });

  test('generateMultiWordSequence creates valid sequence data for different lengths', () => {
    const fullMockWords = Array.from({ length: 25 }, (_, i) => ({
      lithuanian: `word${i}`,
      english: `word${i}`,
      corpus: 'test'
    }));
    
    // Test 4-word sequence
    const result4 = generateMultiWordSequence(fullMockWords, { sequenceLength: 4 });
    expect(result4).toBeTruthy();
    expect(result4.sequence).toHaveLength(4);
    expect(result4.options).toHaveLength(8);
    expect(result4.corpus).toBe('test');
    expect(result4.type).toBe('multi-word-sequence');
    expect(result4.sequenceLength).toBe(4);
    
    // Test 3-word sequence
    const result3 = generateMultiWordSequence(fullMockWords, { sequenceLength: 3 });
    expect(result3).toBeTruthy();
    expect(result3.sequence).toHaveLength(3);
    expect(result3.options).toHaveLength(6);
    expect(result3.sequenceLength).toBe(3);
    
    // Test 2-word sequence
    const result2 = generateMultiWordSequence(fullMockWords, { sequenceLength: 2 });
    expect(result2).toBeTruthy();
    expect(result2.sequence).toHaveLength(2);
    expect(result2.options).toHaveLength(4);
    expect(result2.sequenceLength).toBe(2);
    
    // All sequence words should be in options for each test
    [result4, result3, result2].forEach(result => {
      result.sequence.forEach(seqWord => {
        expect(result.options).toContainEqual(seqWord);
      });
    });
  });

  test('generateMultiWordSequence returns null for insufficient words', () => {
    const fewWords = Array.from({ length: 15 }, (_, i) => ({
      lithuanian: `word${i}`,
      english: `word${i}`,
      corpus: 'test'
    }));
    
    const result = generateMultiWordSequence(fewWords);
    expect(result).toBeNull();
  });
});