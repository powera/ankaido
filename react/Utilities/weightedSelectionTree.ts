// filepath: /Users/powera/repo/trakaido/react/Utilities/weightedSelectionTree.ts
/**
 * Binary Indexed Tree (Fenwick Tree) for efficient weighted random selection
 * Provides O(log N) updates and O(log N) queries instead of O(N)
 * 
 * This data structure is optimized for:
 * - Updating individual weights: O(log N)
 * - Querying prefix sums: O(log N)
 * - Weighted random selection: O(log N)
 */

import { Word, WordStats } from './types';

export class WeightedSelectionTree {
  private tree: number[];
  private words: Word[];
  private wordToIndex: Map<string, number>;
  private size: number;

  constructor() {
    this.tree = [];
    this.words = [];
    this.wordToIndex = new Map();
    this.size = 0;
  }

  /**
   * Initialize or resize the tree for a given number of words
   */
  resize(newSize: number): void {
    if (newSize === this.size) return;
    
    this.size = newSize;
    this.tree = new Array(newSize + 1).fill(0);
    this.words = new Array(newSize);
    this.wordToIndex.clear();
  }

  /**
   * Update weight for a word at given index (1-indexed for BIT)
   */
  updateWeight(index: number, newWeight: number): void {
    const oldWeight = this.getWeight(index);
    const delta = newWeight - oldWeight;
    
    // Update BIT with the weight difference
    for (let i = index; i <= this.size; i += i & (-i)) {
      this.tree[i] += delta;
    }
  }

  /**
   * Get current weight for a word at given index
   */
  getWeight(index: number): number {
    if (index === 1) {
      return this.tree[1] - this.getPrefixSum(0);
    }
    return this.getPrefixSum(index) - this.getPrefixSum(index - 1);
  }

  /**
   * Get prefix sum up to index (inclusive)
   */
  getPrefixSum(index: number): number {
    let sum = 0;
    for (let i = index; i > 0; i -= i & (-i)) {
      sum += this.tree[i];
    }
    return sum;
  }

  /**
   * Get total weight of all words
   */
  getTotalWeight(): number {
    return this.getPrefixSum(this.size);
  }

  /**
   * Find word index by cumulative weight using binary search - O(log N)
   */
  selectByWeight(targetWeight: number): number {
    let left = 1, right = this.size;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.getPrefixSum(mid) < targetWeight) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }

  /**
   * Set word at index and update mapping
   */
  setWord(index: number, word: Word): void {
    this.words[index - 1] = word; // Convert to 0-indexed for array
    if (!word.guid) {
      throw new Error(`Word is missing required GUID: ${word.lithuanian || 'unknown'}-${word.english || 'unknown'}`);
    }
    this.wordToIndex.set(word.guid, index);
  }

  /**
   * Get word at index
   */
  getWord(index: number): Word | undefined {
    return this.words[index - 1]; // Convert to 0-indexed for array
  }

  /**
   * Get index for a word
   */
  getWordIndex(word: Word): number | undefined {
    if (!word.guid) {
      throw new Error(`Word is missing required GUID: ${word.lithuanian || 'unknown'}-${word.english || 'unknown'}`);
    }
    return this.wordToIndex.get(word.guid);
  }

  /**
   * Get the current size of the tree
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.tree = [];
    this.words = [];
    this.wordToIndex.clear();
    this.size = 0;
  }

  /**
   * Get statistics about the tree for debugging
   */
  getStats(): {
    size: number;
    totalWeight: number;
    wordCount: number;
    mappingCount: number;
  } {
    return {
      size: this.size,
      totalWeight: this.getTotalWeight(),
      wordCount: this.words.length,
      mappingCount: this.wordToIndex.size
    };
  }
}

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
    if (!word.guid) {
      throw new Error(`Word is missing required GUID: ${word.lithuanian || 'unknown'}-${word.english || 'unknown'}`);
    }
    return word.guid;
  }

  isCacheValid(wordKey: string): boolean {
    const lastUpdated = this.lastUpdated.get(wordKey);
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < this.cacheValidityMs;
  }

  getWordWeight(
    word: Word,
    getWeightForWord: (word: Word) => number
  ): number {
    const wordKey = this.getWordKey(word);

    if (this.isCacheValid(wordKey)) {
      return this.weights.get(wordKey) ?? 0;
    }

    const weight = getWeightForWord(word);

    this.weights.set(wordKey, weight);
    this.lastUpdated.set(wordKey, Date.now());

    return weight;
  }

  buildSelectionTree(
    words: Word[],
    getWeightForWord: (word: Word) => number
  ): void {
    this.selectionTree.resize(words.length);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const weight = this.getWordWeight(word, getWeightForWord);

      this.selectionTree.setWord(i + 1, word);
      this.selectionTree.updateWeight(i + 1, weight);
    }

    this.currentWordList = words;
    this.treeNeedsRebuild = false;
  }

  updateWordInTree(
    word: Word,
    getWeightForWord: (word: Word) => number
  ): void {
    if (!this.currentWordList || this.treeNeedsRebuild) return;

    const index = this.selectionTree.getWordIndex(word);
    if (index) {
      const newWeight = this.getWordWeight(word, getWeightForWord);
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

export { WordWeightCache };