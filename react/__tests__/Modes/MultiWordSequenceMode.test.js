import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiWordSequenceMode from '../../Modes/MultiWordSequenceMode';

// Mock MultiWordSequenceActivity component
jest.mock('../../Activities/MultiWordSequenceActivity', () => {
  return function MockMultiWordSequenceActivity(props) {
    return (
      <div data-testid="multi-word-sequence-activity">
        <div data-testid="sequence-length">{props.currentWord?.sequenceLength || 0}</div>
        <div data-testid="sequence-options-count">{props.sequenceOptions?.length || 0}</div>
        <div data-testid="audio-enabled">{props.audioEnabled?.toString()}</div>
        <div data-testid="show-answer">{props.showAnswer?.toString()}</div>
        <div data-testid="selected-answers">{JSON.stringify(props.selectedAnswers || [])}</div>
        <div data-testid="auto-advance">{props.autoAdvance?.toString()}</div>
        <div data-testid="default-delay">{props.defaultDelay}</div>
        <button 
          data-testid="mock-answer-button" 
          onClick={() => props.onAnswerClick(0, true, props.sequenceOptions?.[0])}
        >
          Mock Answer
        </button>
        <button 
          data-testid="mock-reset-button" 
          onClick={props.onResetAnswers}
        >
          Reset Answers
        </button>
      </div>
    );
  };
});

// Mock StatsDisplay component
jest.mock('../../Components/StatsDisplay', () => {
  return function MockStatsDisplay({ stats, onReset }) {
    return (
      <div data-testid="stats-display">
        <div data-testid="stats-correct">{stats?.correct || 0}</div>
        <div data-testid="stats-incorrect">{stats?.incorrect || 0}</div>
        <div data-testid="stats-total">{stats?.total || 0}</div>
        <button data-testid="reset-stats-button" onClick={onReset}>Reset Stats</button>
      </div>
    );
  };
});

// Mock multiWordSequenceGenerator
jest.mock('../../Utilities/multiWordSequenceGenerator', () => ({
  generateMultiWordSequence: jest.fn(),
  canGenerateMultiWordSequence: jest.fn()
}));

// Import the mocked functions
import { generateMultiWordSequence, canGenerateMultiWordSequence } from '../../Utilities/multiWordSequenceGenerator';

describe('MultiWordSequenceMode - Smoke Tests', () => {
  const mockWords = [
    { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
    { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
    { lithuanian: 'paukštis', english: 'bird', corpus: 'animals' },
    { lithuanian: 'žuvis', english: 'fish', corpus: 'animals' },
    { lithuanian: 'arklys', english: 'horse', corpus: 'animals' },
    { lithuanian: 'kiaulė', english: 'pig', corpus: 'animals' },
    { lithuanian: 'avis', english: 'sheep', corpus: 'animals' },
    { lithuanian: 'ožka', english: 'goat', corpus: 'animals' },
    { lithuanian: 'višta', english: 'chicken', corpus: 'animals' },
    { lithuanian: 'antis', english: 'duck', corpus: 'animals' },
    { lithuanian: 'žąsis', english: 'goose', corpus: 'animals' },
    { lithuanian: 'triušis', english: 'rabbit', corpus: 'animals' },
    { lithuanian: 'lapė', english: 'fox', corpus: 'animals' },
    { lithuanian: 'vilkas', english: 'wolf', corpus: 'animals' },
    { lithuanian: 'lokys', english: 'bear', corpus: 'animals' },
    { lithuanian: 'elnias', english: 'deer', corpus: 'animals' },
    { lithuanian: 'stirna', english: 'roe deer', corpus: 'animals' },
    { lithuanian: 'taurė', english: 'stag', corpus: 'animals' },
    { lithuanian: 'briedis', english: 'elk', corpus: 'animals' },
    { lithuanian: 'šeškas', english: 'ferret', corpus: 'animals' },
    { lithuanian: 'voverė', english: 'squirrel', corpus: 'animals' }
  ];

  const mockSequenceData = {
    sequence: [
      { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
      { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
      { lithuanian: 'paukštis', english: 'bird', corpus: 'animals' },
      { lithuanian: 'žuvis', english: 'fish', corpus: 'animals' }
    ],
    options: [
      { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
      { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
      { lithuanian: 'paukštis', english: 'bird', corpus: 'animals' },
      { lithuanian: 'žuvis', english: 'fish', corpus: 'animals' },
      { lithuanian: 'arklys', english: 'horse', corpus: 'animals' },
      { lithuanian: 'kiaulė', english: 'pig', corpus: 'animals' },
      { lithuanian: 'avis', english: 'sheep', corpus: 'animals' },
      { lithuanian: 'ožka', english: 'goat', corpus: 'animals' }
    ],
    corpus: 'animals',
    type: 'multi-word-sequence',
    sequenceLength: 4
  };

  const mockWordListManager = {
    getCurrentWord: jest.fn(() => mockWords[0]),
    updateSessionStats: jest.fn(),
    resetSessionStats: jest.fn(),
    nextCard: jest.fn()
  };

  const mockWordListState = {
    allWords: mockWords,
    stats: {
      correct: 5,
      incorrect: 2,
      total: 7
    }
  };

  const defaultProps = {
    wordListManager: mockWordListManager,
    wordListState: mockWordListState,
    studyMode: 'lithuanian-to-english',
    audioEnabled: true,
    autoAdvance: false,
    defaultDelay: 3,
    settings: {
      sequenceLength: 4
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    canGenerateMultiWordSequence.mockReturnValue(true);
    generateMultiWordSequence.mockReturnValue(mockSequenceData);
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders with sufficient words for sequence generation', () => {
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
    expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
  });

  test('renders error message when insufficient words', () => {
    canGenerateMultiWordSequence.mockReturnValue(false);
    
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    expect(screen.getByText('Multi-Word Sequence Mode Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/This mode requires at least 20 words/)).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByTestId('stats-display')).toBeInTheDocument();
  });

  test('renders with empty word list', () => {
    const emptyWordListState = {
      allWords: [],
      stats: { correct: 0, incorrect: 0, total: 0 }
    };
    
    canGenerateMultiWordSequence.mockReturnValue(false);
    
    render(<MultiWordSequenceMode {...defaultProps} wordListState={emptyWordListState} />);
    
    expect(screen.getByText('Multi-Word Sequence Mode Unavailable')).toBeInTheDocument();
  });

  test('renders with null word list', () => {
    const nullWordListState = {
      allWords: null,
      stats: { correct: 0, incorrect: 0, total: 0 }
    };
    
    canGenerateMultiWordSequence.mockReturnValue(false);
    
    const { container } = render(<MultiWordSequenceMode {...defaultProps} wordListState={nullWordListState} />);
    
    // When allWords is null, the useEffect doesn't run and sequenceData remains null
    // The component should render nothing (returns null)
    expect(container.firstChild).toBeNull();
  });

  test('renders with undefined word list', () => {
    const undefinedWordListState = {
      allWords: undefined,
      stats: { correct: 0, incorrect: 0, total: 0 }
    };
    
    canGenerateMultiWordSequence.mockReturnValue(false);
    
    const { container } = render(<MultiWordSequenceMode {...defaultProps} wordListState={undefinedWordListState} />);
    
    // When allWords is undefined, the useEffect doesn't run and sequenceData remains null
    // The component should render nothing (returns null)
    expect(container.firstChild).toBeNull();
  });

  test('renders with audio enabled', () => {
    render(<MultiWordSequenceMode {...defaultProps} audioEnabled={true} />);
    
    expect(screen.getByTestId('audio-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with audio disabled', () => {
    render(<MultiWordSequenceMode {...defaultProps} audioEnabled={false} />);
    
    expect(screen.getByTestId('audio-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with auto advance enabled', () => {
    render(<MultiWordSequenceMode {...defaultProps} autoAdvance={true} />);
    
    expect(screen.getByTestId('auto-advance')).toHaveTextContent('true');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with auto advance disabled', () => {
    render(<MultiWordSequenceMode {...defaultProps} autoAdvance={false} />);
    
    expect(screen.getByTestId('auto-advance')).toHaveTextContent('false');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with custom sequence length setting', () => {
    const customSettings = { sequenceLength: 3 };
    generateMultiWordSequence.mockReturnValue({
      ...mockSequenceData,
      sequenceLength: 3
    });
    
    render(<MultiWordSequenceMode {...defaultProps} settings={customSettings} />);
    
    expect(screen.getByTestId('sequence-length')).toHaveTextContent('3');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with default sequence length when no settings', () => {
    render(<MultiWordSequenceMode {...defaultProps} settings={null} />);
    
    expect(screen.getByTestId('sequence-length')).toHaveTextContent('4');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with custom default delay', () => {
    render(<MultiWordSequenceMode {...defaultProps} defaultDelay={5} />);
    
    expect(screen.getByTestId('default-delay')).toHaveTextContent('5');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with zero default delay', () => {
    render(<MultiWordSequenceMode {...defaultProps} defaultDelay={0} />);
    
    expect(screen.getByTestId('default-delay')).toHaveTextContent('0');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders stats display with correct stats', () => {
    const statsWordListState = {
      allWords: mockWords,
      stats: {
        correct: 10,
        incorrect: 3,
        total: 13
      }
    };
    
    render(<MultiWordSequenceMode {...defaultProps} wordListState={statsWordListState} />);
    
    expect(screen.getByTestId('stats-correct')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-incorrect')).toHaveTextContent('3');
    expect(screen.getByTestId('stats-total')).toHaveTextContent('13');
  });

  test('renders with null wordListManager', () => {
    const { container } = render(<MultiWordSequenceMode {...defaultProps} wordListManager={null} />);
    
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  test('renders with undefined wordListManager', () => {
    const { container } = render(<MultiWordSequenceMode {...defaultProps} wordListManager={undefined} />);
    
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  test('renders sequence data with correct options count', () => {
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    expect(screen.getByTestId('sequence-options-count')).toHaveTextContent('8');
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders initially with empty selected answers', () => {
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    expect(screen.getByTestId('selected-answers')).toHaveTextContent('[]');
    expect(screen.getByTestId('show-answer')).toHaveTextContent('false');
  });

  test('renders with different study modes', () => {
    const studyModes = ['lithuanian-to-english', 'english-to-lithuanian', 'lithuanian-to-lithuanian'];
    
    studyModes.forEach(mode => {
      const { rerender } = render(<MultiWordSequenceMode {...defaultProps} studyMode={mode} />);
      
      expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
      expect(screen.getByTestId('stats-display')).toBeInTheDocument();
      
      rerender(<div />); // Clear for next iteration
    });
  });

  test('handles sequence generation failure gracefully', () => {
    generateMultiWordSequence.mockReturnValue(null);
    
    const { container } = render(<MultiWordSequenceMode {...defaultProps} />);
    
    expect(screen.queryByTestId('multi-word-sequence-activity')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  test('resets state when word changes', () => {
    const { rerender } = render(<MultiWordSequenceMode {...defaultProps} />);
    
    // Change the current word
    const updatedWordListManager = {
      ...mockWordListManager,
      getCurrentWord: jest.fn(() => mockWords[1])
    };
    
    rerender(<MultiWordSequenceMode {...defaultProps} wordListManager={updatedWordListManager} />);
    
    expect(screen.getByTestId('selected-answers')).toHaveTextContent('[]');
    expect(screen.getByTestId('show-answer')).toHaveTextContent('false');
  });

  test('navigation controls work correctly', () => {
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);
    
    expect(mockWordListManager.nextCard).toHaveBeenCalledTimes(1);
  });

  test('stats reset functionality works', () => {
    render(<MultiWordSequenceMode {...defaultProps} />);
    
    const resetButton = screen.getByTestId('reset-stats-button');
    fireEvent.click(resetButton);
    
    expect(mockWordListManager.resetSessionStats).toHaveBeenCalledTimes(1);
  });

  test('renders with minimum word count scenarios', () => {
    const minimalWords = mockWords.slice(0, 20); // Exactly 20 words
    const minimalWordListState = {
      allWords: minimalWords,
      stats: { correct: 0, incorrect: 0, total: 0 }
    };
    
    render(<MultiWordSequenceMode {...defaultProps} wordListState={minimalWordListState} />);
    
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });

  test('renders with words from mixed corpora', () => {
    const mixedWords = [
      ...mockWords.slice(0, 10), // 10 animals
      { lithuanian: 'stalas', english: 'table', corpus: 'furniture' },
      { lithuanian: 'kėdė', english: 'chair', corpus: 'furniture' },
      { lithuanian: 'lova', english: 'bed', corpus: 'furniture' },
      { lithuanian: 'spinta', english: 'closet', corpus: 'furniture' },
      { lithuanian: 'veidrodis', english: 'mirror', corpus: 'furniture' },
      { lithuanian: 'komodas', english: 'dresser', corpus: 'furniture' },
      { lithuanian: 'šaldytuvas', english: 'refrigerator', corpus: 'furniture' },
      { lithuanian: 'virtuvė', english: 'kitchen', corpus: 'furniture' },
      { lithuanian: 'vonios', english: 'bathroom', corpus: 'furniture' },
      { lithuanian: 'miegamasis', english: 'bedroom', corpus: 'furniture' },
      { lithuanian: 'svetainė', english: 'living room', corpus: 'furniture' }
    ];
    
    const mixedWordListState = {
      allWords: mixedWords,
      stats: { correct: 1, incorrect: 0, total: 1 }
    };
    
    render(<MultiWordSequenceMode {...defaultProps} wordListState={mixedWordListState} />);
    
    expect(screen.getByTestId('multi-word-sequence-activity')).toBeInTheDocument();
  });
});