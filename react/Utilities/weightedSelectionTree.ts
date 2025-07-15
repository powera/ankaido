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

export interface Word {
  lithuanian: string;
  english: string;
  [key: string]: any;
}

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
    const wordKey = `${word.lithuanian}-${word.english}`;
    this.wordToIndex.set(wordKey, index);
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
    const wordKey = `${word.lithuanian}-${word.english}`;
    return this.wordToIndex.get(wordKey);
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

export default WeightedSelectionTree;