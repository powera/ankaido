// levelUtils.ts - Utilities for working with word levels

import { LevelsResponse } from './apiClient';

type LevelsData = LevelsResponse['levels'];

export interface WordWithLevel {
  lithuanian: string;
  english: string;
  corpus: string;
  group: string;
  level?: string;
}

/**
 * Get the level for a specific corpus and group combination
 * @param corpus - The corpus name
 * @param group - The group name
 * @param levelsData - The levels data from the API
 * @returns The level string (e.g., "Level 1") or "Other" if not found
 */
export const getWordLevel = (corpus: string, group: string, levelsData: LevelsData): string => {
  if (!levelsData || Object.keys(levelsData).length === 0) {
    return 'Other';
  }

  // Search through all levels to find the corpus/group combination
  for (const [levelKey, levelItems] of Object.entries(levelsData)) {
    // Defensive check: ensure levelItems is an array
    if (Array.isArray(levelItems)) {
      const found = levelItems.find(item => item.corpus === corpus && item.group === group);
      if (found) {
        const levelNum = levelKey.replace('level_', '');
        return `Level ${levelNum}`;
      }
    }
  }

  return 'Other';
};

/**
 * Add level information to an array of words
 * @param words - Array of words with corpus and group information
 * @param levelsData - The levels data from the API
 * @returns Array of words with level information added
 */
export const addLevelToWords = <T extends { corpus: string; group: string }>(
  words: T[], 
  levelsData: LevelsData
): (T & { level: string })[] => {
  return words.map(word => ({
    ...word,
    level: getWordLevel(word.corpus, word.group, levelsData)
  }));
};

/**
 * Get all available levels from levels data, sorted numerically
 * @param levelsData - The levels data from the API
 * @returns Array of level strings (e.g., ["Level 1", "Level 2", ...])
 */
export const getAvailableLevels = (levelsData: LevelsData): string[] => {
  if (!levelsData || Object.keys(levelsData).length === 0) {
    return [];
  }

  const levelKeys = Object.keys(levelsData).filter(key => 
    key.startsWith('level_') && Array.isArray(levelsData[key])
  );
  const sortedKeys = levelKeys.sort((a, b) => {
    const levelA = parseInt(a.replace('level_', ''));
    const levelB = parseInt(b.replace('level_', ''));
    return levelA - levelB;
  });

  return sortedKeys.map(key => {
    const levelNum = key.replace('level_', '');
    return `Level ${levelNum}`;
  });
};

/**
 * Group words by their level
 * @param words - Array of words with level information
 * @returns Object with levels as keys and arrays of words as values
 */
export const groupWordsByLevel = <T extends { level: string }>(words: T[]): Record<string, T[]> => {
  return words.reduce((groups, word) => {
    const level = word.level;
    if (!groups[level]) {
      groups[level] = [];
    }
    groups[level].push(word);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Get corpus groups organized by level for onboarding setup
 * @param levelsData - The levels data from the API
 * @param corporaData - The available corpora data
 * @param maxLevel - Maximum level to include (e.g., 1 for beginners, 8 for intermediate)
 * @returns Object with corpus as keys and arrays of groups as values
 */
export const getCorpusGroupsUpToLevel = (
  levelsData: LevelsData, 
  corporaData: any, 
  maxLevel: number
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  
  // Collect groups from levels 1 to maxLevel
  for (let level = 1; level <= maxLevel; level++) {
    const levelKey = `level_${level}`;
    const levelItems = levelsData[levelKey];
    
    // Defensive check: ensure levelItems exists and is an array
    if (levelItems && Array.isArray(levelItems)) {
      levelItems.forEach(item => {
        // Only include corpuses that exist in corporaData
        if (corporaData[item.corpus]) {
          if (!result[item.corpus]) {
            result[item.corpus] = [];
          }
          // Avoid duplicates
          if (!result[item.corpus].includes(item.group)) {
            result[item.corpus].push(item.group);
          }
        }
      });
    } else if (levelItems) {
      console.warn(`Level data for ${levelKey} is not an array:`, levelItems);
    }
  }
  
  return result;
};

/**
 * Filter words by their level, returning words grouped by level sorted from lowest to highest
 * @param words - Array of words with corpus and group information
 * @param levelsData - The levels data from the API
 * @returns Object with level strings as keys (e.g., "Level 1", "Level 2") and arrays of words as values.
 *          Only levels that contain words are included (no empty arrays).
 *          Keys are processed in numerical order (Level 1, Level 2, etc.) but object key order isn't guaranteed.
 *          Use Object.keys(result) and sort them if you need guaranteed order.
 */
export const filterWordsByLevel = <T extends { corpus?: string; group?: string; [key: string]: any }>(
  words: T[], 
  levelsData: LevelsData
): Record<string, T[]> => {
  if (words.length === 0 || !levelsData) return {};
  
  // Filter words that have both corpus and group properties
  const wordsWithCorpusAndGroup = words.filter(word => 
    word.corpus && word.group
  ) as (T & { corpus: string; group: string })[];
  
  if (wordsWithCorpusAndGroup.length === 0) return {};
  
  // Add level information to words
  const wordsWithLevels = addLevelToWords(wordsWithCorpusAndGroup, levelsData);
  
  // Group words by level
  const wordsByLevel = groupWordsByLevel(wordsWithLevels);
  
  // Filter to only include levels that start with "Level " and have words, sorted by level number
  const filteredLevels: Record<string, T[]> = {};
  
  const sortedLevels = Object.keys(wordsByLevel)
    .filter(level => level.startsWith('Level ') && wordsByLevel[level].length > 0)
    .sort((a, b) => {
      const levelA = parseInt(a.replace('Level ', ''));
      const levelB = parseInt(b.replace('Level ', ''));
      return levelA - levelB;
    });
  
  // Build result object in sorted order
  sortedLevels.forEach(level => {
    filteredLevels[level] = wordsByLevel[level];
  });
  
  return filteredLevels;
};