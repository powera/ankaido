// filepath: /Users/powera/repo/trakaido/react/Utilities/activitySelection.ts
/**
 * Activity selection utilities for Journey Mode and Drill Mode
 */

import { JourneyModeState } from '../Managers/journeyModeManager';

import {
  ActivityResult,
  ActivityType,
  DifficultyLevel,
  DifficultyMapping,
  JourneyFocusMode,
  Word,
  WordStats
} from './types';
import { WordWeightCache } from './weightedSelectionTree';

interface TierConfig {
  correctAnswersRange: [number, number];
  activityProbabilities: Record<ActivityType, number>;
  baseWeight: number;
}

export const TIER_CONFIGS: Record<number, TierConfig> = {
  1: {
    correctAnswersRange: [0, 3],
    activityProbabilities: {
      'multiple-choice': 50,
      'listening': 50,
      'typing': 0
    },
    baseWeight: 1.0
  },
  2: {
    correctAnswersRange: [4, 7],
    activityProbabilities: {
      'multiple-choice': 40,
      'listening': 40,
      'typing': 20
    },
    baseWeight: 0.85
  },
  3: {
    correctAnswersRange: [8, 14],
    activityProbabilities: {
      'multiple-choice': 30,
      'listening': 30,
      'typing': 40
    },
    baseWeight: 0.6
  },
  4: {
    correctAnswersRange: [15, Infinity],
    activityProbabilities: {
      'multiple-choice': 0,
      'listening': 25,
      'typing': 75
    },
    baseWeight: 0.25
  }
};

/**
 * Maps correct answers count to tier number
 */
export const getWordTier = (correctAnswers: number): number => {
  if (correctAnswers < 4) {
    return 1;
  } else if (correctAnswers < 8) {
    return 2;
  } else if (correctAnswers < 15) {
    return 3;
  } else {
    return 4;
  }
};

export const DIFFICULTY_MAPPINGS: Record<DifficultyLevel, DifficultyMapping> = {
  easy: { correctAnswersRange: [0, 3], tier: 1 },    // Tier 1 (correctAnswers < 4)
  medium: { correctAnswersRange: [4, 14], tier: 3 },  // Tier 3 (correctAnswers < 15)
  hard: { correctAnswersRange: [15, Infinity], tier: 4 } // Tier 4 (correctAnswers >= 15)
};

export const attemptActivitySelection = (
  selectedWord: Word,
  correctAnswers: number,
  audioEnabled: boolean,
  forcedTier: number | null = null
): ActivityResult => {
  const random = Math.random() * 100;

  const tier = forcedTier ?? getWordTier(correctAnswers);

  const tierConfig = TIER_CONFIGS[tier];
  let probabilities = { ...tierConfig.activityProbabilities };

  // Remove listening activities if audio is disabled
  if (!audioEnabled) {
    probabilities.listening = 0;
  }

  // Filter out activities with 0 probability and recalculate total
  const validActivities = Object.entries(probabilities).filter(([_, prob]) => prob > 0);
  const totalProb = validActivities.reduce((sum, [_, prob]) => sum + prob, 0);

  // If no valid activities, fall back to multiple-choice
  if (totalProb === 0) {
    return createActivityResult('multiple-choice', selectedWord, audioEnabled, tier)!;
  }

  // Normalize probabilities to 100%
  let cumulativeProb = 0;
  const activities: { type: ActivityType; threshold: number }[] = [];

  for (const [activityType, prob] of validActivities as [ActivityType, number][]) {
    cumulativeProb += (prob / totalProb) * 100;
    activities.push({ type: activityType, threshold: cumulativeProb });
  }

  for (const activity of activities) {
    if (random < activity.threshold) {
      return createActivityResult(activity.type, selectedWord, audioEnabled, tier)!;
    }
  }

  // Fallback (should never reach here, but just in case)
  return createActivityResult('multiple-choice', selectedWord, audioEnabled, tier)!;
};

const createActivityResult = (
  activityType: ActivityType,
  selectedWord: Word,
  audioEnabled: boolean,
  tier: number | null = null
): ActivityResult | null => {
  switch (activityType) {
    case 'multiple-choice': {
      // Multiple choice is always LT->EN: Lithuanian prompt, English answers
      return { type: 'multiple-choice', word: selectedWord };
    }
    case 'listening': {
      if (!audioEnabled) return null;
      // Listening is always "hard mode": Lithuanian audio, English answers
      return {
        type: 'listening',
        word: selectedWord
      };
    }
    case 'typing': {
      // Typing is always LT->EN: Lithuanian prompt, type English answer
      return { type: 'typing', word: selectedWord };
    }
    default:
      return null;
  }
};

export const selectDrillActivity = (
  selectedWord: Word,
  difficulty: DifficultyLevel,
  audioEnabled: boolean,
  getTotalCorrectForWord: (word: Word) => number
): ActivityResult => {
  const correctAnswers = getTotalCorrectForWord ? getTotalCorrectForWord(selectedWord) : 0;
  const difficultyMapping = DIFFICULTY_MAPPINGS[difficulty];

  if (!difficultyMapping) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  const tier = difficultyMapping.tier;

  return attemptActivitySelection(selectedWord, correctAnswers, audioEnabled, tier);
};

export const JOURNEY_FOCUS_PROBABILITIES = {
  'normal': {
    motivationalBreak: 3,
    newWordIntroduction: 15
  },
  'new-words': {
    motivationalBreak: 1.5,
    newWordIntroduction: 25 // Increased from 15% to 25%
  },
  'review-words': {
    motivationalBreak: 5,
    newWordIntroduction: 0 // No new words for review mode
  }
};

const globalWordWeightCache = new WordWeightCache();

/**
 * Determines the appropriate threshold for review-words mode based on available words
 * Returns the highest threshold that provides sufficient words (at least 25% of total words or minimum 10 words)
 */
const getReviewModeThreshold = (
  words: Word[],
  getTotalCorrectForWord: (word: Word) => number
): number => {
  if (words.length === 0) return 0;
  
  const minWordsNeeded = Math.max(10, Math.floor(words.length * 0.25));
  
  // Try threshold 6 first (original)
  const wordsWithSixPlus = words.filter(word => getTotalCorrectForWord(word) >= 6);
  if (wordsWithSixPlus.length >= minWordsNeeded) {
    return 6;
  }
  
  // Try threshold 3
  const wordsWithThreePlus = words.filter(word => getTotalCorrectForWord(word) >= 3);
  if (wordsWithThreePlus.length >= minWordsNeeded) {
    return 3;
  }
  
  // Use all words (threshold 0)
  return 0;
};

/**
 * Calculate the complete weight for a word including tier-based base weight and time multiplier
 */
const calculateCompleteWordWeight = (
  word: Word,
  getTotalCorrectForWord: (word: Word) => number,
  getWordStats: (word: Word) => WordStats,
  focusMode: JourneyFocusMode = 'normal',
  reviewModeThreshold?: number
): number => {
  const correctAnswers = getTotalCorrectForWord(word);
  const stats = getWordStats(word);
  
  // Get tier-based base weight
  const tier = getWordTier(correctAnswers);
  let baseWeight = TIER_CONFIGS[tier]?.baseWeight ?? 1.0;
  
  // Apply focus mode adjustments
  if (focusMode === 'new-words') {
    // For new words focus: reduce weight for words with many correct answers
    if (correctAnswers >= 10) {
      baseWeight *= 0.1; // 10% as likely for words with 10+ correct answers
    } else if (correctAnswers >= 5) {
      baseWeight *= 0.4; // 40% as likely for words with 5-9 correct answers
    }
    // Words with < 5 correct answers keep normal weight
  } else if (focusMode === 'review-words') {
    // For review words focus: use dynamic threshold based on available words
    const threshold = reviewModeThreshold ?? 6; // Default to 6 if not provided
    if (correctAnswers < threshold) {
      return 0; // Exclude words with fewer than threshold correct answers
    }
  }
  
  // Apply time-based multiplier
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastSeen = stats.lastSeen;

  let timeMultiplier = 1.0;
  if (lastSeen && (now - lastSeen) > twoWeeksMs) {
    timeMultiplier = 3.0;
  }

  return baseWeight * timeMultiplier;
};

export const selectWordByWeight = (
  words: Word[],
  getTotalCorrectForWord: (word: Word) => number,
  getWordStats: (word: Word) => WordStats,
  focusMode: JourneyFocusMode = 'normal'
): Word | null => {
  if (words.length === 0) return null;
  if (words.length === 1) return words[0];

  // Calculate dynamic threshold for review-words mode
  const reviewModeThreshold = focusMode === 'review-words' 
    ? getReviewModeThreshold(words, getTotalCorrectForWord)
    : undefined;

  const getWeightForWord = (word: Word): number => {
    return calculateCompleteWordWeight(word, getTotalCorrectForWord, getWordStats, focusMode, reviewModeThreshold);
  };

  // Filter out words with zero weight (for review-words mode)
  const eligibleWords = words.filter(word => getWeightForWord(word) > 0);
  
  if (eligibleWords.length === 0) return null;
  if (eligibleWords.length === 1) return eligibleWords[0];

  if (globalWordWeightCache.needsRebuild(eligibleWords)) {
    globalWordWeightCache.buildSelectionTree(eligibleWords, getWeightForWord);
  }

  const selectedWord = globalWordWeightCache.selectWordFromTree();

  if (!selectedWord) {
    console.warn('Tree selection failed, falling back to random selection');
    return eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
  }

  return selectedWord;
};

export const invalidateWordWeightCache = (word: Word): void => {
  globalWordWeightCache.invalidateWord(word);
};

export const clearWordWeightCache = (): void => {
  globalWordWeightCache.clearCache();
};

export const getWordWeightCacheStats = (): {
  totalEntries: number;
  validEntries: number;
  treeSize: number;
  treeNeedsRebuild: boolean;
} => {
  return globalWordWeightCache.getCacheStats();
};



/**
 * Select a new word randomly
 * @param newWords - Array of new/unknown words
 * @returns Selected word
 */
const selectNewWordRandomly = (newWords: Word[]): Word => {
  return newWords[Math.floor(Math.random() * newWords.length)];
};

export const selectJourneyActivity = (
  getExposedWordsList: () => Word[],
  getNewWordsList: () => Word[],
  allWords: Word[],
  wordListManager: { getCurrentWord: () => Word },
  getTotalCorrectForWord: (word: Word) => number,
  audioEnabled: boolean,
  journeyState?: JourneyModeState,
  getWordStats: ((word: Word) => WordStats) | null = null,
  focusMode: JourneyFocusMode = 'normal',
  isFirstActivityOrModeChange: boolean = false
): ActivityResult => {
  const exposedWords = getExposedWordsList();
  const newWords = getNewWordsList();

  // Check for manually added words first (highest priority)
  if (journeyState && journeyState.hasManuallyAddedWords()) {
    const manuallyAddedWord = journeyState.getNextManuallyAddedWord();
    if (manuallyAddedWord) {
      const result: ActivityResult = { type: 'new-word', word: manuallyAddedWord };
      journeyState.recordNewWordIntroduced(manuallyAddedWord);
      journeyState.updateAfterActivity();
      return result;
    }
  }

  // Get focus-specific probabilities
  const focusProbabilities = JOURNEY_FOCUS_PROBABILITIES[focusMode];

  if (allWords.length === 0) {
    // For the very first activity with no words, show welcome interstitial
    if (isFirstActivityOrModeChange) {
      const result: ActivityResult = { type: 'welcome-interstitial', word: null };
      if (journeyState) {
        journeyState.updateAfterActivity();
      }
      return result;
    }
    
    const result: ActivityResult = { type: 'new-word', word: wordListManager.getCurrentWord() };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word!);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // Handle the case where we have few exposed words but it's the first activity or after mode change
  if (isFirstActivityOrModeChange && exposedWords.length < 10 && newWords.length > 0) {
    // Show welcome interstitial first, then new words will follow
    const result: ActivityResult = { type: 'welcome-interstitial', word: null };
    if (journeyState) {
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // Skip New Word and Motivational Break activities for first activity or after mode change
  if (!isFirstActivityOrModeChange) {
    // For review-words mode, skip new word introduction if we have no new words to introduce
    if (focusMode === 'review-words' && exposedWords.length < 10 && newWords.length > 0) {
      // Skip new word introduction for review-words mode
    } else if (exposedWords.length < 10 && newWords.length > 0) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      const result: ActivityResult = { type: 'new-word', word: randomNewWord };
      if (journeyState) {
        journeyState.recordNewWordIntroduced(result.word!);
        journeyState.updateAfterActivity();
      }
      return result;
    }

    let random = Math.random() * 100;
    if (
      random < focusProbabilities.motivationalBreak &&
      (!journeyState || !journeyState.shouldBlockMotivationalBreaks())
    ) {
      const result: ActivityResult = { type: 'motivational-break', word: null };
      if (journeyState) {
        journeyState.recordMotivationalBreak();
        journeyState.updateAfterActivity();
      }
      return result;
    }

    random = Math.random() * 100;
    if (
      random < focusProbabilities.newWordIntroduction &&
      newWords.length > 0 &&
      (!journeyState || !journeyState.shouldBlockNewWords())
    ) {
      const selectedNewWord = selectNewWordRandomly(newWords);
      const result: ActivityResult = { type: 'new-word', word: selectedNewWord };
      if (journeyState) {
        journeyState.recordNewWordIntroduced(result.word!);
        journeyState.updateAfterActivity();
      }
      return result;
    }


  }

  // If we reach here and have no exposed words, fall back to motivational break
  if (exposedWords.length === 0) {
    const result: ActivityResult = { type: 'motivational-break', word: null };
    if (journeyState) {
      journeyState.recordMotivationalBreak();
      journeyState.updateAfterActivity();
    }
    return result;
  }

  let selectedWord: Word;
  // Some chance (18%) to select a recently introduced new word
  if (journeyState && journeyState.hasNewWordsFromSession() && Math.random() < 0.18) {
    selectedWord = journeyState.getAndRemoveOldestNewWord()!;
  } else {
    // Always use weighted selection if getWordStats is available, otherwise fallback to random
    if (getWordStats) {
      const weightedWord = selectWordByWeight(exposedWords, getTotalCorrectForWord, getWordStats, focusMode);
      if (!weightedWord) {
        // No eligible words found, fallback to motivational break
        const result: ActivityResult = { type: 'motivational-break', word: null };
        if (journeyState) {
          journeyState.recordMotivationalBreak();
          journeyState.updateAfterActivity();
        }
        return result;
      }
      selectedWord = weightedWord;
    } else {
      // Simple fallback: random selection from exposed words
      // For review-words mode, filter exposed words using dynamic threshold
      let eligibleWords = exposedWords;
      if (focusMode === 'review-words') {
        const threshold = getReviewModeThreshold(exposedWords, getTotalCorrectForWord);
        eligibleWords = exposedWords.filter(word => getTotalCorrectForWord(word) >= threshold);
      }
      
      if (eligibleWords.length === 0) {
        // Fallback to motivational break if no eligible words
        const result: ActivityResult = { type: 'motivational-break', word: null };
        if (journeyState) {
          journeyState.recordMotivationalBreak();
          journeyState.updateAfterActivity();
        }
        return result;
      }
      
      selectedWord = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
    }
  }
  const correctAnswers = getTotalCorrectForWord(selectedWord);

  const activityResult = attemptActivitySelection(selectedWord, correctAnswers, audioEnabled);
  
  if (journeyState) {
    journeyState.updateAfterActivity();
  }
  return activityResult;
};