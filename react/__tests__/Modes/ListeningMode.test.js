import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListeningMode from '../../Modes/ListeningMode';

// Mock ListeningActivity component
jest.mock('../../Activities/ListeningActivity', () => {
  return function MockListeningActivity(props) {
    return (
      <div data-testid="listening-activity">
        <div data-testid="current-word">{props.currentWord?.lithuanian}</div>
        <div data-testid="study-mode">{props.studyMode}</div>
        <div data-testid="audio-enabled">{props.audioEnabled?.toString()}</div>
        <div data-testid="show-answer">{props.showAnswer?.toString()}</div>
        <div data-testid="auto-advance">{props.autoAdvance?.toString()}</div>
        <div data-testid="default-delay">{props.defaultDelay}</div>
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
        <button data-testid="reset-button" onClick={onReset}>Reset</button>
      </div>
    );
  };
});

// Mock multipleChoiceGenerator
jest.mock('../../Utilities/multipleChoiceGenerator', () => ({
  generateMultipleChoiceOptions: jest.fn(() => [
    { text: 'Option 1', isCorrect: false },
    { text: 'Option 2', isCorrect: true },
    { text: 'Option 3', isCorrect: false },
    { text: 'Option 4', isCorrect: false }
  ])
}));

// Mock activityStatsManager
jest.mock('../../Managers/activityStatsManager', () => ({
  activityStatsManager: {
    updateWordStats: jest.fn().mockResolvedValue(true)
  }
}));

describe('ListeningMode - Smoke Tests', () => {
  const mockWord = {
    lithuanian: 'katė',
    english: 'cat',
    corpus: 'animals'
  };

  const mockWordListManager = {
    getCurrentWord: jest.fn(() => mockWord),
    updateSessionStats: jest.fn(),
    resetSessionStats: jest.fn(),
    nextCard: jest.fn(),
    prevCard: jest.fn()
  };

  const mockWordListState = {
    allWords: [mockWord],
    stats: {
      correct: 5,
      incorrect: 2,
      total: 7
    }
  };

  const defaultProps = {
    wordListManager: mockWordListManager,
    wordListState: mockWordListState,
    studyMode: 'source-to-english',
    audioEnabled: true,
    autoAdvance: false,
    defaultDelay: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with minimal required props', () => {
    render(<ListeningMode {...defaultProps} />);
    
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
    expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    expect(screen.getByText('← Previous')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
  });

  test('renders with source-to-english study mode', () => {
    render(<ListeningMode {...defaultProps} studyMode="source-to-english" />);
    
    expect(screen.getByTestId('study-mode')).toHaveTextContent('source-to-english');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with english-to-source study mode', () => {
    render(<ListeningMode {...defaultProps} studyMode="english-to-source" />);
    
    expect(screen.getByTestId('study-mode')).toHaveTextContent('english-to-source');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with source-to-source study mode', () => {
    render(<ListeningMode {...defaultProps} studyMode="source-to-source" />);
    
    expect(screen.getByTestId('study-mode')).toHaveTextContent('source-to-source');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with audio enabled', () => {
    render(<ListeningMode {...defaultProps} audioEnabled={true} />);
    
    expect(screen.getByTestId('audio-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with audio disabled', () => {
    render(<ListeningMode {...defaultProps} audioEnabled={false} />);
    
    expect(screen.getByTestId('audio-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with auto advance enabled', () => {
    render(<ListeningMode {...defaultProps} autoAdvance={true} />);
    
    expect(screen.getByTestId('auto-advance')).toHaveTextContent('true');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with auto advance disabled', () => {
    render(<ListeningMode {...defaultProps} autoAdvance={false} />);
    
    expect(screen.getByTestId('auto-advance')).toHaveTextContent('false');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with custom default delay', () => {
    render(<ListeningMode {...defaultProps} defaultDelay={5} />);
    
    expect(screen.getByTestId('default-delay')).toHaveTextContent('5');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with zero default delay', () => {
    render(<ListeningMode {...defaultProps} defaultDelay={0} />);
    
    expect(screen.getByTestId('default-delay')).toHaveTextContent('0');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });

  test('renders with empty word list state', () => {
    const emptyWordListState = {
      allWords: [],
      stats: {
        correct: 0,
        incorrect: 0,
        total: 0
      }
    };
    
    render(<ListeningMode {...defaultProps} wordListState={emptyWordListState} />);
    
    expect(screen.getByTestId('stats-correct')).toHaveTextContent('0');
    expect(screen.getByTestId('stats-incorrect')).toHaveTextContent('0');
    expect(screen.getByTestId('stats-total')).toHaveTextContent('0');
  });

  test('renders with no current word (null)', () => {
    const mockWordListManagerNoWord = {
      ...mockWordListManager,
      getCurrentWord: jest.fn(() => null)
    };
    
    const { container } = render(<ListeningMode {...defaultProps} wordListManager={mockWordListManagerNoWord} />);
    
    // Should render nothing when there's no current word
    expect(container.firstChild).toBeNull();
  });

  test('renders with undefined wordListManager', () => {
    const { container } = render(<ListeningMode {...defaultProps} wordListManager={undefined} />);
    
    // Should render nothing when wordListManager is undefined
    expect(container.firstChild).toBeNull();
  });

  test('renders with null wordListManager', () => {
    const { container } = render(<ListeningMode {...defaultProps} wordListManager={null} />);
    
    // Should render nothing when wordListManager is null
    expect(container.firstChild).toBeNull();
  });

  test('renders navigation controls when word is present', () => {
    render(<ListeningMode {...defaultProps} />);
    
    expect(screen.getByText('← Previous')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('← Previous')).toHaveClass('w-button');
    expect(screen.getByText('Next →')).toHaveClass('w-button');
  });

  test('renders stats display with correct stats', () => {
    const statsWordListState = {
      allWords: [mockWord],
      stats: {
        correct: 10,
        incorrect: 5,
        total: 15
      }
    };
    
    render(<ListeningMode {...defaultProps} wordListState={statsWordListState} />);
    
    expect(screen.getByTestId('stats-correct')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-incorrect')).toHaveTextContent('5');
    expect(screen.getByTestId('stats-total')).toHaveTextContent('15');
  });

  test('renders with multiple words in wordListState', () => {
    const multipleWordsState = {
      allWords: [
        { lithuanian: 'katė', english: 'cat', corpus: 'animals' },
        { lithuanian: 'šuo', english: 'dog', corpus: 'animals' },
        { lithuanian: 'paukštis', english: 'bird', corpus: 'animals' }
      ],
      stats: {
        correct: 3,
        incorrect: 1,
        total: 4
      }
    };
    
    render(<ListeningMode {...defaultProps} wordListState={multipleWordsState} />);
    
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
    expect(screen.getByTestId('stats-display')).toBeInTheDocument();
  });

  test('renders with word containing special characters', () => {
    const specialWord = {
      lithuanian: 'šiukšlė',
      english: 'garbage',
      corpus: 'household'
    };
    
    const mockWordListManagerSpecial = {
      ...mockWordListManager,
      getCurrentWord: jest.fn(() => specialWord)
    };
    
    render(<ListeningMode {...defaultProps} wordListManager={mockWordListManagerSpecial} />);
    
    expect(screen.getByTestId('current-word')).toHaveTextContent('šiukšlė');
    expect(screen.getByTestId('listening-activity')).toBeInTheDocument();
  });
});