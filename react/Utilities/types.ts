/**
 * Shared type definitions for the Utilities directory
 * This file consolidates common types to avoid redundancy and ensure consistency
 */

// Core Word interface - unified definition used across all utilities
export interface Word {
  lithuanian: string;
  english: string;
  corpus: string;
  group: string;
  guid: string;
  levels: string[];
  alternatives: {
    english: string[];
    lithuanian: string[];
  };
  metadata: {
    difficulty_level: number | null;
    frequency_rank: number;
    notes: string;
    tags: string[];
  };
  [key: string]: any;
}

// Mode statistics for activity tracking
export interface ModeStats {
  correct: number;
  incorrect: number;
}

// Stat modes for different activity types
export type StatMode = 'multipleChoice' | 'listeningEasy' | 'listeningHard' | 'typing';

// Word statistics interface for activity tracking
export interface WordStats {
  exposed: boolean;
  multipleChoice: ModeStats;
  listeningEasy: ModeStats;
  listeningHard: ModeStats;
  typing: ModeStats;
  lastSeen: number | null;
  lastCorrectAnswer: number | null;
  lastIncorrectAnswer: number | null;
  [key: string]: any; // For possible extra properties
}

// Collection of word statistics
export type Stats = Record<string, WordStats>;

// Session statistics for word list practice
export interface SessionStats {
  correct: number;
  incorrect: number;
  total: number;
}

// Activity types - core activity categories
export type ActivityType = 'multiple-choice' | 'listening' | 'typing';

// Extended activity types including special activities
export type ExtendedActivityType = ActivityType | 'motivational-break' | 'new-word' | 'grammar-break' | 'multi-word-sequence' | 'welcome-interstitial' | 'conjugation-table';

// Study modes - unified naming convention
export type StudyMode = 
  | 'english-to-lithuanian'
  | 'lithuanian-to-english' 
  | 'lithuanian-to-lithuanian';

// Activity modes - used for activity-specific configurations
export type ActivityMode = 'en-to-lt' | 'lt-to-en' | 'easy' | 'hard';

// Difficulty levels
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Sort direction for tables and lists
export type SortDirection = 'asc' | 'desc';

// Journey focus modes
export type JourneyFocusMode = 'normal' | 'new-words' | 'review-words';

// Activity result interface
export interface ActivityResult {
  type: ExtendedActivityType;
  word: Word | null;
  mode?: ActivityMode;
}

// Activity state interface for UI components
export interface ActivityState {
  showAnswer: boolean;
  selectedAnswer: string | null;
  typedAnswer: string;
  typingFeedback: string;
  autoAdvanceTimer: NodeJS.Timeout | null;
}

// Difficulty mapping interface
export interface DifficultyMapping {
  correctAnswersRange: [number, number];
  tier: number;
}

// Word list state interface
export interface WordListState {
  allWords: Word[];
  [key: string]: any;
}

// Settings interfaces
export interface MultipleChoiceSettings {
  numOptions?: number;
  [key: string]: any;
}

export interface MultiWordSequenceSettings {
  sequenceLength?: number;
}

// Multi-word sequence specific interfaces
export interface MultiWordSequenceActivity {
  sequence: Word[];
  options: Word[];
  corpus: string;
  type: 'multi-word-sequence';
  sequenceLength: number;
}

export interface CorpusStats {
  corpus: string;
  wordCount: number;
  minRequired: number;
}

export interface MultiWordSequenceStats {
  eligible: CorpusStats[];
  ineligible: CorpusStats[];
  totalWords: number;
  sequenceLength: number;
  minRequired: number;
}

// Stats manager interface
export interface ActivityStatsManager {
  updateWordStats: (word: Word, statsMode: StudyMode, isCorrect: boolean) => Promise<void>;
}

// Audio manager interface for audio playback functionality
export interface AudioManager {
  playAudio: (word: string, onlyCached?: boolean, sequential?: boolean) => Promise<void>;
  stopCurrentAudio: () => Promise<void>;
  stopAllAudio: () => Promise<void>;
  preloadAudio: (word: string) => Promise<boolean>;
  hasInCache: (word: string) => boolean;
  initialize: (voices?: string[]) => Promise<AudioManager>;
  setAvailableVoices: (voices: string[]) => void;
  getAvailableVoices: () => string[];
  getSelectedVoice: () => string | null;
}