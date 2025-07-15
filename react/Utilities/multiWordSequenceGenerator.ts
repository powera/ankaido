/**
 * Utility for generating multi-word sequence activities
 * Supports 2, 3, or 4 word sequences
 * Requires at least 20 words from the same corpus to ensure sufficient options
 */

import { 
  Word, 
  MultiWordSequenceSettings, 
  MultiWordSequenceActivity, 
  CorpusStats, 
  MultiWordSequenceStats 
} from './types';

/**
 * Generate a multi-word sequence activity data
 * @param {Word[]} allWords - All available words
 * @param {MultiWordSequenceSettings} settings - Activity settings (sequenceLength: 2-4, default: 4)
 * @returns {MultiWordSequenceActivity | null} Activity data with sequence and options
 */
export const generateMultiWordSequence = (
  allWords: Word[],
  settings: MultiWordSequenceSettings = {}
): MultiWordSequenceActivity | null => {
  const sequenceLength = Math.max(2, Math.min(4, settings.sequenceLength || 4)); // Default to 4, clamp between 2-4
  const minWordsRequired = sequenceLength * 2; // Need at least double the sequence length for distractors

  if (!allWords || allWords.length < Math.max(20, minWordsRequired)) {
    return null; // Not enough words for this activity
  }

  // Group words by corpus
  const wordsByCorpus: Record<string, Word[]> = {};
  allWords.forEach(word => {
    // Skip words without a corpus
    if (!word.corpus) {
      return;
    }
    if (!wordsByCorpus[word.corpus]) {
      wordsByCorpus[word.corpus] = [];
    }
    wordsByCorpus[word.corpus].push(word);
  });

  // Find a corpus with at least the minimum required words
  const minRequired = Math.max(20, minWordsRequired);
  const eligibleCorpora = Object.entries(wordsByCorpus)
    .filter(([_, words]) => words.length >= minRequired);

  if (eligibleCorpora.length === 0) {
    return null; // No corpus has enough words
  }

  // Select a random eligible corpus
  const [selectedCorpus, corpusWords] = eligibleCorpora[
    Math.floor(Math.random() * eligibleCorpora.length)
  ];

  // Shuffle the corpus words
  const shuffledWords = [...corpusWords].sort(() => Math.random() - 0.5);

  // Select words for the sequence
  const sequence = shuffledWords.slice(0, sequenceLength);

  // Select equal number of additional words as distractors (not in the sequence)
  const distractors = shuffledWords.slice(sequenceLength, sequenceLength * 2);

  // Combine sequence and distractors, then shuffle for the options
  const allOptions = [...sequence, ...distractors].sort(() => Math.random() - 0.5);

  return {
    sequence,
    options: allOptions,
    corpus: selectedCorpus,
    type: 'multi-word-sequence',
    sequenceLength
  };
};

/**
 * Check if multi-word sequence activity is available for the given word list
 * @param {Word[]} allWords - All available words
 * @param {number} sequenceLength - Length of sequence (2-4, default: 4)
 * @returns {boolean} Whether the activity can be generated
 */
export const canGenerateMultiWordSequence = (
  allWords: Word[],
  sequenceLength: number = 4
): boolean => {
  const clampedLength = Math.max(2, Math.min(4, sequenceLength));
  const minWordsRequired = clampedLength * 2;

  if (!allWords || allWords.length < Math.max(20, minWordsRequired)) {
    return false;
  }

  // Group words by corpus and check if any corpus has at least the minimum required words
  const wordsByCorpus: Record<string, Word[]> = {};
  allWords.forEach(word => {
    // Skip words without a corpus
    if (!word.corpus) {
      return;
    }
    if (!wordsByCorpus[word.corpus]) {
      wordsByCorpus[word.corpus] = [];
    }
    wordsByCorpus[word.corpus].push(word);
  });

  const minRequired = Math.max(20, minWordsRequired);
  return Object.values(wordsByCorpus).some(words => words.length >= minRequired);
};

/**
 * Get corpus statistics for multi-word sequence eligibility
 * @param {Word[]} allWords - All available words
 * @param {number} sequenceLength - Length of sequence (2-4, default: 4)
 * @returns {MultiWordSequenceStats} Statistics about corpus eligibility
 */
export const getMultiWordSequenceStats = (
  allWords: Word[],
  sequenceLength: number = 4
): MultiWordSequenceStats => {
  if (!allWords) {
    return { eligible: [], ineligible: [], totalWords: 0, sequenceLength, minRequired: Math.max(20, sequenceLength * 2) };
  }

  const clampedLength = Math.max(2, Math.min(4, sequenceLength));
  const minWordsRequired = clampedLength * 2;
  const minRequired = Math.max(20, minWordsRequired);

  const wordsByCorpus: Record<string, Word[]> = {};
  allWords.forEach(word => {
    // Skip words without a corpus
    if (!word.corpus) {
      return;
    }
    if (!wordsByCorpus[word.corpus]) {
      wordsByCorpus[word.corpus] = [];
    }
    wordsByCorpus[word.corpus].push(word);
  });

  const eligible: CorpusStats[] = [];
  const ineligible: CorpusStats[] = [];

  Object.entries(wordsByCorpus).forEach(([corpus, words]) => {
    const corpusInfo: CorpusStats = { corpus, wordCount: words.length, minRequired };
    if (words.length >= minRequired) {
      eligible.push(corpusInfo);
    } else {
      ineligible.push(corpusInfo);
    }
  });

  return {
    eligible,
    ineligible,
    totalWords: allWords.length,
    sequenceLength: clampedLength,
    minRequired
  };
};