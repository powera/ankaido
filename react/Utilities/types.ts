/**
 * Shared type definitions for the Utilities directory
 * This file consolidates common types to avoid redundancy and ensure consistency
 */

// Core Word interface - unified definition used across all utilities
export interface Word {
  lithuanian: string;
  english: string;
  corpus?: string;
  [key: string]: any;
}

// Word statistics interface
export interface WordStats {
  lastSeen?: number;
  [key: string]: any;
}

// Activity types - core activity categories
export type ActivityType = 'multiple-choice' | 'listening' | 'typing';

// Extended activity types including special activities
export type ExtendedActivityType = ActivityType | 'motivational-break' | 'new-word' | 'grammar-break' | 'multi-word-sequence';

// Study modes - unified naming convention
export type StudyMode = 
  | 'english-to-lithuanian'
  | 'lithuanian-to-english' 
  | 'lithuanian-to-lithuanian';

// Activity modes - used for activity-specific configurations
export type ActivityMode = 'en-to-lt' | 'lt-to-en' | 'easy' | 'hard';

// Difficulty levels
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

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