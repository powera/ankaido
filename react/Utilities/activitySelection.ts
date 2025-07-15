// filepath: /Users/powera/repo/trakaido/react/Utilities/activitySelection.ts
/**
 * Activity selection utilities for Journey Mode and Drill Mode
 */

import { WeightedSelectionTree } from './weightedSelectionTree';

export type ActivityType = 'multiple-choice' | 'listening' | 'typing';
export type ActivityMode = 'en-to-lt' | 'lt-to-en' | 'easy' | 'hard';

export interface Word {
  lithuanian: string;
  english: string;
  [key: string]: any;
}

export interface WordStats {
  lastSeen?: number;
  [key: string]: any;
}

export interface ActivityResult {
  type: ActivityType | 'motivational-break' | 'new-word' | 'grammar-break';
  word: Word | null;
  mode?: ActivityMode;
}

export interface DifficultyMapping {
  exposureRange: [number, number];
  tier: number;
}

export const DIFFICULTY_MAPPINGS: Record<'easy' | 'medium' | 'hard', DifficultyMapping> = {
  easy: { exposureRange: [0, 3], tier: 1 },    // Similar to Tier 1 (exposures < 4)
  medium: { exposureRange: [4, 8], tier: 2 },  // Similar to Tier 2 (exposures < 9)
  hard: { exposureRange: [9, Infinity], tier: 3 } // Similar to Tier 3 (exposures >= 9)
};

export const ACTIVITY_PROBABILITIES: Record<number, Record<ActivityType, number>> = {
  1: {
    'multiple-choice': 50,
    'listening': 50,
    'typing': 0
  },
  2: {
    'multiple-choice': 40,
    'listening': 40,
    'typing': 20
  },
  3: {
    'multiple-choice': 20,
    'listening': 20,
    'typing': 60
  }
};

export const attemptActivitySelection = (
  selectedWord: Word,
  exposures: number,
  audioEnabled: boolean,
  forcedTier: number | null = null
): ActivityResult | null => {
  const random = Math.random() * 100;

  let tier: number;
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

  let cumulativeProb = 0;
  const activities: { type: ActivityType; threshold: number }[] = [];

  for (const [activityType, prob] of Object.entries(probabilities) as [ActivityType, number][]) {
    if (prob > 0) {
      cumulativeProb += prob;
      activities.push({ type: activityType, threshold: cumulativeProb });
    }
  }

  for (const activity of activities) {
    if (random < activity.threshold) {
      return createActivityResult(activity.type, selectedWord, audioEnabled, tier);
    }
  }

  return createActivityResult('multiple-choice', selectedWord, audioEnabled, tier);
};

const createActivityResult = (
  activityType: ActivityType,
  selectedWord: Word,
  audioEnabled: boolean,
  tier: number | null = null
): ActivityResult | null => {
  switch (activityType) {
    case 'multiple-choice': {
      const mcMode: ActivityMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
      return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
    }
    case 'listening': {
      if (!audioEnabled) return null;
      let listeningMode: ActivityMode;
      if (tier === 1) {
        listeningMode = 'easy';
      } else if (tier === 2) {
        listeningMode = Math.random() < 0.6 ? 'easy' : 'hard';
      } else {
        listeningMode = Math.random() < 0.3 ? 'easy' : 'hard';
      }
      return {
        type: 'listening',
        word: selectedWord,
        mode: listeningMode
      };
    }
    case 'typing': {
      const typingMode: ActivityMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
      return { type: 'typing', word: selectedWord, mode: typingMode };
    }
    default:
      return null;
  }
};

export const selectDrillActivity = (
  selectedWord: Word,
  difficulty: 'easy' | 'medium' | 'hard',
  audioEnabled: boolean,
  getTotalCorrectForWord: (word: Word) => number
): ActivityResult => {
  const exposures = getTotalCorrectForWord ? getTotalCorrectForWord(selectedWord) : 0;
  const difficultyMapping = DIFFICULTY_MAPPINGS[difficulty];

  if (!difficultyMapping) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  const tier = difficultyMapping.tier;

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const activityResult = attemptActivitySelection(selectedWord, exposures, audioEnabled, tier);

    if (activityResult !== null) {
      return activityResult;
    }

    attempts++;
  }

  const mcMode: ActivityMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
  return { type: 'multiple-choice', word: selectedWord, mode: mcMode };
};

const JOURNEY_PROBABILITIES = {
  motivationalBreak: 3,
  newWordIntroduction: 15
};

class WordWeightCache {
  private weights: Map<string, number>;
  private lastUpdated: Map<string, number>;
  private cacheValidityMs: number;
  private selectionTree: WeightedSelectionTree;
  private currentWordList: Word[] | null;
  private treeNeedsRebuild: boolean;

  constructor() {
    this.weights = new Map();
    this.lastUpdated = new Map();
    this.cacheValidityMs = 5 * 60 * 1000;
    this.selectionTree = new WeightedSelectionTree();
    this.currentWordList = null;
    this.treeNeedsRebuild = true;
  }

  getWordKey(word: Word): string {
    return `${word.lithuanian}-${word.english}`;
  }

  isCacheValid(wordKey: string): boolean {
    const lastUpdated = this.lastUpdated.get(wordKey);
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < this.cacheValidityMs;
  }

  calculateWordWeight(
    word: Word,
    getTotalCorrectForWord: (word: Word) => number,
    getWordStats: (word: Word) => WordStats
  ): number {
    const exposures = getTotalCorrectForWord(word);
    const stats = getWordStats(word);

    let baseWeight = 1.0;

    if (exposures >= 15) {
      baseWeight = 0.2;
    } else if (exposures >= 8) {
      baseWeight = 0.5;
    }

    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSeen = stats.lastSeen;

    let timeMultiplier = 1.0;
    if (lastSeen && (now - lastSeen) > twoWeeksMs) {
      timeMultiplier = 3.0;
    }

    return baseWeight * timeMultiplier;
  }

  getWordWeight(
    word: Word,
    getTotalCorrectForWord: (word: Word) => number,
    getWordStats: (word: Word) => WordStats
  ): number {
    const wordKey = this.getWordKey(word);

    if (this.isCacheValid(wordKey)) {
      return this.weights.get(wordKey) ?? 0;
    }

    const weight = this.calculateWordWeight(word, getTotalCorrectForWord, getWordStats);

    this.weights.set(wordKey, weight);
    this.lastUpdated.set(wordKey, Date.now());

    return weight;
  }

  buildSelectionTree(
    words: Word[],
    getTotalCorrectForWord: (word: Word) => number,
    getWordStats: (word: Word) => WordStats
  ): void {
    this.selectionTree.resize(words.length);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = this.getWordWeight(word, getTotalCorrectForWord, getWordStats);

      this.selectionTree.setWord(i + 1, word);
      this.selectionTree.updateWeight(i + 1, weight);
    }

    this.currentWordList = words;
    this.treeNeedsRebuild = false;
  }

  updateWordInTree(
    word: Word,
    getTotalCorrectForWord: (word: Word) => number,
    getWordStats: (word: Word) => WordStats
  ): void {
    if (!this.currentWordList || this.treeNeedsRebuild) return;

    const index = this.selectionTree.getWordIndex(word);
    if (index) {
      const newWeight = this.getWordWeight(word, getTotalCorrectForWord, getWordStats);
      this.selectionTree.updateWeight(index, newWeight);
    }
  }

  selectWordFromTree(): Word | null {
    if (this.treeNeedsRebuild || !this.currentWordList) {
      return null;
    }

    const totalWeight = this.selectionTree.getTotalWeight();
    if (totalWeight === 0) {
      const randomIndex = Math.floor(Math.random() * this.currentWordList.length);
      return this.currentWordList[randomIndex];
    }

    const randomWeight = Math.random() * totalWeight;
    const selectedIndex = this.selectionTree.selectByWeight(randomWeight);
    const word = this.selectionTree.getWord(selectedIndex);
    return word === undefined ? null : word;
  }

  needsRebuild(words: Word[]): boolean {
    if (!this.currentWordList || this.treeNeedsRebuild) return true;
    if (words.length !== this.currentWordList.length) return true;

    if (words.length > 0) {
      const firstMatch = this.getWordKey(words[0]) === this.getWordKey(this.currentWordList[0]);
      const lastMatch = this.getWordKey(words[words.length - 1]) === this.getWordKey(this.currentWordList[this.currentWordList.length - 1]);
      if (!firstMatch || !lastMatch) return true;
    }

    return false;
  }

  invalidateWord(word: Word): void {
    const wordKey = this.getWordKey(word);
    this.weights.delete(wordKey);
    this.lastUpdated.delete(wordKey);

    if (!this.treeNeedsRebuild && this.currentWordList) {
      this.treeNeedsRebuild = true;
    }
  }

  clearCache(): void {
    this.weights.clear();
    this.lastUpdated.clear();
    this.treeNeedsRebuild = true;
    this.currentWordList = null;
  }

  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    treeSize: number;
    treeNeedsRebuild: boolean;
  } {
    return {
      totalEntries: this.weights.size,
      validEntries: Array.from(this.lastUpdated.entries()).filter(
        ([_, timestamp]) => (Date.now() - timestamp) < this.cacheValidityMs
      ).length,
      treeSize: this.selectionTree.getSize(),
      treeNeedsRebuild: this.treeNeedsRebuild
    };
  }
}

const globalWordWeightCache = new WordWeightCache();

export const selectWordByWeight = (
  words: Word[],
  getTotalCorrectForWord: (word: Word) => number,
  getWordStats: (word: Word) => WordStats
): Word | null => {
  if (words.length === 0) return null;
  if (words.length === 1) return words[0];

  if (globalWordWeightCache.needsRebuild(words)) {
    globalWordWeightCache.buildSelectionTree(words, getTotalCorrectForWord, getWordStats);
  }

  const selectedWord = globalWordWeightCache.selectWordFromTree();

  if (!selectedWord) {
    console.warn('Tree selection failed, falling back to O(N) method');

    const wordWeights = words.map(word => ({
      word,
      weight: globalWordWeightCache.getWordWeight(word, getTotalCorrectForWord, getWordStats)
    }));

    const totalWeight = wordWeights.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) {
      return words[Math.floor(Math.random() * words.length)];
    }

    let random = Math.random() * totalWeight;

    for (const item of wordWeights) {
      random -= item.weight;
      if (random <= 0) {
        return item.word;
      }
    }

    return words[words.length - 1];
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

export class JourneyModeState {
  private consecutiveNewWordPrevention: number;
  private motivationalBreakPrevention: number;
  private newWordsIntroducedThisSession: Word[];

  constructor() {
    this.consecutiveNewWordPrevention = 0;
    this.motivationalBreakPrevention = 0;
    this.newWordsIntroducedThisSession = [];
  }

  shouldBlockNewWords(): boolean {
    return this.consecutiveNewWordPrevention > 0;
  }

  shouldBlockMotivationalBreaks(): boolean {
    return this.motivationalBreakPrevention > 0;
  }

  recordNewWordIntroduced(word: Word): void {
    this.consecutiveNewWordPrevention = 2;
    this.newWordsIntroducedThisSession.push(word);
  }

  recordMotivationalBreak(): void {
    this.motivationalBreakPrevention = 5;
  }

  getAndRemoveOldestNewWord(): Word | null {
    if (this.newWordsIntroducedThisSession.length === 0) {
      return null;
    }
    return this.newWordsIntroducedThisSession.shift() ?? null;
  }

  hasNewWordsFromSession(): boolean {
    return this.newWordsIntroducedThisSession.length > 0;
  }

  updateAfterActivity(): void {
    if (this.consecutiveNewWordPrevention > 0) {
      this.consecutiveNewWordPrevention--;
    }
    if (this.motivationalBreakPrevention > 0) {
      this.motivationalBreakPrevention--;
    }
  }
}

export const createJourneyModeState = (): JourneyModeState => {
  return new JourneyModeState();
};

export const selectJourneyActivity = (
  getExposedWordsList: () => Word[],
  getNewWordsList: () => Word[],
  allWords: Word[],
  wordListManager: { getCurrentWord: () => Word },
  getTotalCorrectForWord: (word: Word) => number,
  audioEnabled: boolean,
  journeyState?: JourneyModeState,
  getWordWeights: ((word: Word) => WordStats) | null = null
): ActivityResult => {
  const exposedWords = getExposedWordsList();
  const newWords = getNewWordsList();

  if (allWords.length === 0) {
    const result: ActivityResult = { type: 'new-word', word: wordListManager.getCurrentWord() };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word!);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  if (exposedWords.length < 10 && newWords.length > 0) {
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
    random < JOURNEY_PROBABILITIES.motivationalBreak &&
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
    random < JOURNEY_PROBABILITIES.newWordIntroduction &&
    newWords.length > 0 &&
    (!journeyState || !journeyState.shouldBlockNewWords())
  ) {
    const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
    const result: ActivityResult = { type: 'new-word', word: randomNewWord };
    if (journeyState) {
      journeyState.recordNewWordIntroduced(result.word!);
      journeyState.updateAfterActivity();
    }
    return result;
  }

  if (exposedWords.length === 0) {
    if (newWords.length > 0 && (!journeyState || !journeyState.shouldBlockNewWords())) {
      const randomNewWord = newWords[Math.floor(Math.random() * newWords.length)];
      const result: ActivityResult = { type: 'new-word', word: randomNewWord };
      if (journeyState) {
        journeyState.recordNewWordIntroduced(result.word!);
        journeyState.updateAfterActivity();
      }
      return result;
    }
    const result: ActivityResult = { type: 'grammar-break', word: null };
    if (journeyState) {
      journeyState.updateAfterActivity();
    }
    return result;
  }

  let selectedWord: Word;
  if (journeyState && journeyState.hasNewWordsFromSession() && Math.random() < 0.18) {
    selectedWord = journeyState.getAndRemoveOldestNewWord()!;
  } else {
    if (getWordWeights) {
      selectedWord = selectWordByWeight(exposedWords, getTotalCorrectForWord, getWordWeights)!;
    } else {
      let filteredWords = [...exposedWords];

      if (filteredWords.some(word => getTotalCorrectForWord(word) >= 10)) {
        filteredWords = filteredWords.filter(word => {
          const exposures = getTotalCorrectForWord(word);
          if (exposures >= 15) {
            return Math.random() > 0.8;
          } else if (exposures >= 8) {
            return Math.random() > 0.5;
          }
          return true;
        });

        if (filteredWords.length === 0) {
          filteredWords = [...exposedWords];
        }
      }

      selectedWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    }
  }
  const exposures = getTotalCorrectForWord(selectedWord);

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

  const mcMode: ActivityMode = Math.random() < 0.5 ? 'en-to-lt' : 'lt-to-en';
  const result: ActivityResult = { type: 'multiple-choice', word: selectedWord, mode: mcMode };
  if (journeyState) {
    journeyState.updateAfterActivity();
  }
  return result;
};