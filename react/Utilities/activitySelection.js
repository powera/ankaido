/**
 * Activity selection utilities for Journey Mode and Drill Mode
 */

import { WeightedSelectionTree } from './weightedSelectionTree';

/**
 * Maps difficulty levels to exposure-based tiers for drill mode
 */
export const DIFFICULTY_MAPPINGS = {
  easy: { exposureRange: [0, 3], tier: 1 },    // Similar to Tier 1 (exposures < 4)
  medium: { exposureRange: [4, 8], tier: 2 },  // Similar to Tier 2 (exposures < 9)
  hard: { exposureRange: [9, Infinity], tier: 3 } // Similar to Tier 3 (exposures >= 9)
};

/**
 * Activity selection probabilities for each difficulty/tier
 */
export const ACTIVITY_PROBABILITIES = {
  // Tier 1: exposures < 4 (Easy)
  1: {
    'multiple-choice': 50,
    'listening': 50,
    'typing': 0
  },
  // Tier 2: exposures < 9 (Medium)
  2: {
    'multiple-choice': 40,
    'listening': 40,
    'typing': 20
  },
  // Tier 3: exposures >= 9 (Hard)
  3: {
    'multiple-choice': 20,
    'listening': 20,
    'typing': 60
  }
};

/**
 * Attempt to select an activity for a specific word based on exposure count
 * @param {Object} selectedWord - The word object
 * @param {number} exposures - Number of correct exposures for this word
 * @param {boolean} audioEnabled - Whether audio is enabled
 * @param {number} forcedTier - Optional forced tier (for drill mode)
 * @returns {Object|null} Activity object or null if no valid activity found
 */
export const attemptActivitySelection = (selectedWord, exposures, audioEnabled, forcedTier = null) => {
  const random = Math.random() * 100;
  
  // Determine tier based on exposures or forced tier
  let tier;
  if (forcedTier) {
    tier = forcedTier;
  } else if (exposures < 4) {
    tier = 1;
  } else if (exposures < 9) {
    tier = 2;
  } else {
    tier = 3;
  }

  const probabilities = ACTIVITY_PROBABILITIES[tier];
  
  // Calculate cumulative probabilities
  let cumulativeProb = 0;
  const activities = [];
  
  for (const [activityType, prob] of Object.entries(probabilities)) {
    if (prob > 0) {
      cumulativeProb += prob;
      activities.push({ type: activityType, threshold: cumulativeProb });
    }
  }

  // Select activity based on random number
  for (const activity of activities) {
    if (random < activity.threshold) {
      return createActivityResult(activity.type, selectedWord, audioEnabled, tier);
    }
  }

  // Fallback to multiple-choice if no activity was selected
  return createActivityResult('multiple-choice', selectedWord, audioEnabled, tier);
};

/**
 * Create an activity result object
 * @param {string} activityType - Type of activity
 * @param {Object} selectedWord - The word object
 * @param {boolean} audioEnabled - Whether audio is enabled
 * @param {number} tier - Current tier (1, 2, or 3) for difficulty constraints
 * @returns {Object|null} Activity result or null if not valid
 */
const createActivityResult = (activityType, selectedWord, audioEnabled, tier = null) => {
  switch (activityType) {
    case 'multiple-choice':
      const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
      return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
      
    case 'listening':
      // Listening requires audio
      if (!audioEnabled) return null;
      
      // Choose listening mode based on complexity and tier constraints
      let listeningMode;
      if (tier === 1) {
        // Tier 1: always easy
        listeningMode = 'easy';
      } else if (tier === 2) {
        // Tier 2: 60% easy / 40% hard
        listeningMode = Math.random() < 0.6 ? 'easy' : 'hard';
      } else {
        // Tier 3: 30% easy / 70% hard
        listeningMode = Math.random() < 0.3 ? 'easy' : 'hard';
      }
      
      return { 
        type: 'listening', 
        word: selectedWord,
        mode: listeningMode
      };
      
    case 'typing':
      const typingMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
      return { type: 'typing', word: selectedWord, mode: typingMode };
      
    default:
      return null;
  }
};

/**
 * Select an activity for drill mode with specific difficulty
 * @param {Object} selectedWord - The word object
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {boolean} audioEnabled - Whether audio is enabled
 * @param {function} getTotalCorrectForWord - Function to get total correct exposures for a word
 * @returns {Object} Activity object
 */
export const selectDrillActivity = (selectedWord, difficulty, audioEnabled, getTotalCorrectForWord) => {
  const exposures = getTotalCorrectForWord ? getTotalCorrectForWord(selectedWord) : 0;
  const difficultyMapping = DIFFICULTY_MAPPINGS[difficulty];
  
  if (!difficultyMapping) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  const tier = difficultyMapping.tier;
  
  // Keep trying until we get a valid activity (handles audio disabled scenarios)
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loops
  
  while (attempts < maxAttempts) {
    const activityResult = attemptActivitySelection(selectedWord, exposures, audioEnabled, tier);
    
    if (activityResult !== null) {
      return activityResult;
    }
    
    attempts++;
  }

  // Fallback: always return multiple-choice if we can't find a valid activity
  const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
  return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
};

/**
 * Journey mode activity selection probabilities
 */
const JOURNEY_PROBABILITIES = {
  motivationalBreak: 3,    // 3% chance for motivational break
  newWordIntroduction: 15  // 15% chance for new word introduction
};

/**
 * Enhanced word weight cache with efficient tree-based selection
 * Combines caching with O(log N) weighted selection
 */
class WordWeightCache {
  constructor() {
    this.weights = new Map(); // word key -> weight
    this.lastUpdated = new Map(); // word key -> timestamp when weight was calculated
    this.cacheValidityMs = 5 * 60 * 1000; // 5 minutes cache validity
    this.selectionTree = new WeightedSelectionTree();
    this.currentWordList = null; // Track current word list to detect changes
    this.treeNeedsRebuild = true;
  }

  /**
   * Get the cache key for a word
   */
  getWordKey(word) {
    return `${word.lithuanian}-${word.english}`;
  }

  /**
   * Check if cached weight is still valid
   */
  isCacheValid(wordKey) {
    const lastUpdated = this.lastUpdated.get(wordKey);
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < this.cacheValidityMs;
  }

  /**
   * Calculate weight for a word based on exposures and time since last seen
   */
  calculateWordWeight(word, getTotalCorrectForWord, getWordStats) {
    const exposures = getTotalCorrectForWord(word);
    const stats = getWordStats(word);
    
    // Base weight calculation (inverse of mastery level)
    let baseWeight = 1.0;
    
    // Reduce weight for well-learned words (similar to original filtering logic)
    if (exposures >= 15) {
      baseWeight = 0.2; // 80% reduction (was 80% chance to exclude)
    } else if (exposures >= 8) {
      baseWeight = 0.5; // 50% reduction (was 50% chance to exclude)
    }
    
    // Time-based boosting: 3x weight if not seen in 2 weeks
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds
    const now = Date.now();
    const lastSeen = stats.lastSeen;
    
    let timeMultiplier = 1.0;
    if (lastSeen && (now - lastSeen) > twoWeeksMs) {
      timeMultiplier = 3.0; // 3x more likely to be selected
    }
    
    return baseWeight * timeMultiplier;
  }

  /**
   * Get weight for a word, using cache if valid
   */
  getWordWeight(word, getTotalCorrectForWord, getWordStats) {
    const wordKey = this.getWordKey(word);
    
    // Return cached weight if still valid
    if (this.isCacheValid(wordKey)) {
      return this.weights.get(wordKey);
    }
    
    // Calculate new weight
    const weight = this.calculateWordWeight(word, getTotalCorrectForWord, getWordStats);
    
    // Update cache
    this.weights.set(wordKey, weight);
    this.lastUpdated.set(wordKey, Date.now());
    
    return weight;
  }

  /**
   * Build or rebuild the selection tree for a word list - O(N log N)
   */
  buildSelectionTree(words, getTotalCorrectForWord, getWordStats) {
    this.selectionTree.resize(words.length);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = this.getWordWeight(word, getTotalCorrectForWord, getWordStats);
      
      this.selectionTree.setWord(i + 1, word); // BIT is 1-indexed
      this.selectionTree.updateWeight(i + 1, weight);
    }
    
    this.currentWordList = words;
    this.treeNeedsRebuild = false;
  }

  /**
   * Update weight for a specific word in the tree - O(log N)
   */
  updateWordInTree(word, getTotalCorrectForWord, getWordStats) {
    if (!this.currentWordList || this.treeNeedsRebuild) return;
    
    const index = this.selectionTree.getWordIndex(word);
    if (index) {
      const newWeight = this.getWordWeight(word, getTotalCorrectForWord, getWordStats);
      this.selectionTree.updateWeight(index, newWeight);
    }
  }

  /**
   * Select a word using weighted random selection - O(log N)
   */
  selectWordFromTree() {
    if (this.treeNeedsRebuild || !this.currentWordList) {
      return null;
    }

    const totalWeight = this.selectionTree.getTotalWeight();
    if (totalWeight === 0) {
      // Fallback to random selection if all weights are 0
      const randomIndex = Math.floor(Math.random() * this.currentWordList.length);
      return this.currentWordList[randomIndex];
    }

    const randomWeight = Math.random() * totalWeight;
    const selectedIndex = this.selectionTree.selectByWeight(randomWeight);
    return this.selectionTree.getWord(selectedIndex);
  }

  /**
   * Check if word list has changed and tree needs rebuilding
   */
  needsRebuild(words) {
    if (!this.currentWordList || this.treeNeedsRebuild) return true;
    if (words.length !== this.currentWordList.length) return true;
    
    // Quick check: compare first and last words
    if (words.length > 0) {
      const firstMatch = this.getWordKey(words[0]) === this.getWordKey(this.currentWordList[0]);
      const lastMatch = this.getWordKey(words[words.length - 1]) === this.getWordKey(this.currentWordList[this.currentWordList.length - 1]);
      if (!firstMatch || !lastMatch) return true;
    }
    
    return false;
  }

  /**
   * Invalidate cache for a specific word (call when word stats change)
   */
  invalidateWord(word) {
    const wordKey = this.getWordKey(word);
    this.weights.delete(wordKey);
    this.lastUpdated.delete(wordKey);
    
    // Update the tree if it exists and contains this word
    // This is still O(log N) instead of O(N)
    if (!this.treeNeedsRebuild && this.currentWordList) {
      // We'll mark for rebuild on next selection to keep this operation fast
      // Alternatively, we could update the tree here, but that requires the callback functions
      this.treeNeedsRebuild = true;
    }
  }

  /**
   * Clear all cached weights
   */
  clearCache() {
    this.weights.clear();
    this.lastUpdated.clear();
    this.treeNeedsRebuild = true;
    this.currentWordList = null;
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      totalEntries: this.weights.size,
      validEntries: Array.from(this.lastUpdated.entries()).filter(
        ([_, timestamp]) => (Date.now() - timestamp) < this.cacheValidityMs
      ).length,
      treeSize: this.selectionTree.size,
      treeNeedsRebuild: this.treeNeedsRebuild
    };
  }
}

// Global weight cache instance
const globalWordWeightCache = new WordWeightCache();

/**
 * Select a word from a list using efficient weighted random selection - O(log N)
 * @param {Array} words - Array of words to select from
 * @param {function} getTotalCorrectForWord - Function to get exposure count
 * @param {function} getWordStats - Function to get word statistics
 * @returns {Object} Selected word
 */
export const selectWordByWeight = (words, getTotalCorrectForWord, getWordStats) => {
  if (words.length === 0) return null;
  if (words.length === 1) return words[0];

  // Check if we need to rebuild the selection tree
  if (globalWordWeightCache.needsRebuild(words)) {
    globalWordWeightCache.buildSelectionTree(words, getTotalCorrectForWord, getWordStats);
  }

  // Use O(log N) tree-based selection
  const selectedWord = globalWordWeightCache.selectWordFromTree();
  
  // Fallback to old method if tree selection fails
  if (!selectedWord) {
    console.warn('Tree selection failed, falling back to O(N) method');
    
    // Calculate weights for all words (O(N) fallback)
    const wordWeights = words.map(word => ({
      word,
      weight: globalWordWeightCache.getWordWeight(word, getTotalCorrectForWord, getWordStats)
    }));

    // Calculate total weight
    const totalWeight = wordWeights.reduce((sum, item) => sum + item.weight, 0);
    
    // Handle edge case where all weights are 0
    if (totalWeight === 0) {
      return words[Math.floor(Math.random() * words.length)];
    }

    // Weighted random selection
    let random = Math.random() * totalWeight;
    
    for (const item of wordWeights) {
      random -= item.weight;
      if (random <= 0) {
        return item.word;
      }
    }

    // Final fallback
    return words[words.length - 1];
  }

  return selectedWord;
};

/**
 * Invalidate weight cache for a word (call when word stats are updated)
 * @param {Object} word - The word whose cache should be invalidated
 */
export const invalidateWordWeightCache = (word) => {
  globalWordWeightCache.invalidateWord(word);
};

/**
 * Clear the entire word weight cache
 */
export const clearWordWeightCache = () => {
  globalWordWeightCache.clearCache();
};

/**
 * Get word weight cache statistics for debugging
 */
export const getWordWeightCacheStats = () => {
  return globalWordWeightCache.getCacheStats();
};

/**
 * Journey mode state management for activity constraints
 * 
 * Journey Mode Features:
 * - Prevents consecutive new words (blocks next 2 items after new word)
 * - Prevents consecutive motivational breaks (blocks next 5 items after break)
 * - 18% chance to revisit oldest newly introduced word from this session
 */
export class JourneyModeState {
  constructor() {
    this.consecutiveNewWordPrevention = 0; // Counter for preventing consecutive new words
    this.motivationalBreakPrevention = 0;  // Counter for preventing consecutive motivational breaks
    this.newWordsIntroducedThisSession = []; // Array of newly introduced words (oldest first)
  }

  /**
   * Check if new word introduction should be blocked
   * @returns {boolean} True if new words should be blocked
   */
  shouldBlockNewWords() {
    return this.consecutiveNewWordPrevention > 0;
  }

  /**
   * Check if motivational breaks should be blocked
   * @returns {boolean} True if motivational breaks should be blocked
   */
  shouldBlockMotivationalBreaks() {
    return this.motivationalBreakPrevention > 0;
  }

  /**
   * Record that a new word was introduced
   * @param {Object} word - The word that was introduced
   */
  recordNewWordIntroduced(word) {
    this.consecutiveNewWordPrevention = 2; // Block next 2 items from being new words
    this.newWordsIntroducedThisSession.push(word); // Add to end (newest)
  }

  /**
   * Record that a motivational break occurred
   */
  recordMotivationalBreak() {
    this.motivationalBreakPrevention = 5; // Block next 5 items from being motivational breaks
  }

  /**
   * Get the oldest new word introduced this session and remove it from tracking
   * @returns {Object|null} The oldest new word, or null if none available
   */
  getAndRemoveOldestNewWord() {
    if (this.newWordsIntroducedThisSession.length === 0) {
      return null;
    }
    return this.newWordsIntroducedThisSession.shift(); // Remove and return first (oldest)
  }

  /**
   * Check if there are any new words from this session available
   * @returns {boolean} True if there are tracked new words
   */
  hasNewWordsFromSession() {
    return this.newWordsIntroducedThisSession.length > 0;
  }

  /**
   * Update state after any activity is selected
   */
  updateAfterActivity() {
    // Decrement prevention counters
    if (this.consecutiveNewWordPrevention > 0) {
      this.consecutiveNewWordPrevention--;
    }
    if (this.motivationalBreakPrevention > 0) {
      this.motivationalBreakPrevention--;
    }
  }
}

/**
 * Create a new Journey Mode state instance
 * @returns {JourneyModeState} New state instance
 */
export const createJourneyModeState = () => {
  return new JourneyModeState();
};

/**
 * Select the next activity for Journey Mode based on learning algorithm
 * @param {function} getExposedWordsList - Function to get words with exposures
 * @param {function} getNewWordsList - Function to get unexposed words
 * @param {Array} allWords - All available words
 * @param {Object} wordListManager - Word list manager instance
 * @param {function} getTotalCorrectForWord - Function to get exposure count for a word
 * @param {boolean} audioEnabled - Whether audio is enabled
 * @param {JourneyModeState} [journeyState] - Optional journey mode state for tracking constraints
 * @param {function} [getWordWeights] - Function to get word statistics (for weight calculation)
 * @returns {Object} Activity selection result
 */
export const selectJourneyActivity = (
  getExposedWordsList,
  getNewWordsList, 
  allWords,
  wordListManager,
  getTotalCorrectForWord,
  audioEnabled,
  journeyState,
  getWordWeights = null
) => {
  const exposedWords = getExposedWordsList();
  const newWords = getNewWordsList();

  // Safety check: if no words available, get current word
  if (allWords.length === 0) {
    const result = { type: 'new-word', word: wordListManager.getCurrentWord() };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // Early learning phase: if fewer than 10 known words, prioritize new words
  if (exposedWords.length < 10 && newWords.length > 0) {
    const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
    const result = { type: 'new-word', word: randomNewWord };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // Random chance for motivational break (3% probability)
  // Only if not blocked by prevention counter
  let random = Math.random() * 100;
  if (random < JOURNEY_PROBABILITIES.motivationalBreak && 
      (!journeyState || !journeyState.shouldBlockMotivationalBreaks())) {
    const result = { type: 'motivational-break', word: null };
    if (journeyState) {
      journeyState.recordMotivationalBreak();
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // Random chance for new word introduction (15% probability)
  // Only if not blocked by prevention counter
  random = Math.random() * 100;
  if (random < JOURNEY_PROBABILITIES.newWordIntroduction && newWords.length > 0 && 
      (!journeyState || !journeyState.shouldBlockNewWords())) {
    const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
    const result = { type: 'new-word', word: randomNewWord };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // No exposed words available - fallback logic
  if (exposedWords.length === 0) {
    if (newWords.length > 0 && (!journeyState || !journeyState.shouldBlockNewWords())) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      const result = { type: 'new-word', word: randomNewWord };
      if (journeyState) {
        journeyState.recordNewWordIntroduced(result.word);
        journeyState.updateAfterActivity();
      }
      return result;
    }
    const result = { type: 'grammar-break', word: null };
    if (journeyState) {
      journeyState.updateAfterActivity();
    }
    return result;
  }

  // 18% chance to select oldest newly introduced word from this session
  let selectedWord;
  if (journeyState && journeyState.hasNewWordsFromSession() && Math.random() < 0.18) {
    selectedWord = journeyState.getAndRemoveOldestNewWord();
  } else {
    // Use weight-based selection if getWordWeights is available, otherwise fall back to old method
    if (getWordWeights) {
      // Weight-based selection with time boosting and mastery consideration
      selectedWord = selectWordByWeight(exposedWords, getTotalCorrectForWord, getWordWeights);
    } else {
      // Fallback to original filtering logic for backward compatibility
      let filteredWords = [...exposedWords];

      // Apply spaced repetition: for exposed words (8+ exposures), 
      // reduce selection probability by 50% to focus on less familiar words
      // Reduce by 80% if there are 15+ exposures
      if (filteredWords.some(word => getTotalCorrectForWord(word) >= 10)) {
        filteredWords = filteredWords.filter(word => {
          const exposures = getTotalCorrectForWord(word);
          if (exposures >= 15) {
            // 80% chance to exclude well-learned words from selection
            return Math.random() > 0.8;
          } else if (exposures >= 8) {
            // 50% chance to exclude well-learned words from selection
            return Math.random() > 0.5;
          }
          return true;
        });

        // Safety net: if all words were filtered out, use original list
        if (filteredWords.length === 0) {
          filteredWords = [...exposedWords];
        }
      }

      // Select a random word from the filtered pool
      selectedWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    }
  }
  const exposures = getTotalCorrectForWord(selectedWord);

  // Attempt activity selection with retry logic
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const activityResult = attemptActivitySelection(selectedWord, exposures, audioEnabled);
    
    if (activityResult !== null) {
      if (journeyState) {
        journeyState.updateAfterActivity();
      }
      return activityResult;
    }
    
    attempts++;
  }

  // Ultimate fallback: multiple-choice activity
  const mcMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
  const result = { type: 'multiple-choice', word: selectedWord, mode: mcMode };
  if (journeyState) {
    journeyState.updateAfterActivity();
  }
  return result;
};