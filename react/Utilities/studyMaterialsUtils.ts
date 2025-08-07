/**
 * Utility functions for study materials modal and corpus organization
 */

// Types for the utility functions
export interface CorporaData {
  [corpus: string]: {
    groups: {
      [group: string]: any[];
    };
  };
}

export interface SelectedGroups {
  [corpus: string]: string[];
}

/**
 * Convert group names to meta-categories for better user understanding
 * @param groupName - The original group name
 * @returns A more user-friendly category name
 */
export const convertGroupToCategory = (groupName: string): string => {
  // Convert underscores to spaces and capitalize
  return groupName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Calculate total selected words across all corpora
 * @param selectedGroups - Object mapping corpus to selected groups
 * @param corporaData - The corpora data structure
 * @returns Total number of selected words
 */
export const calculateTotalSelectedWords = (
  selectedGroups: SelectedGroups,
  corporaData: CorporaData
): number => {
  let totalWords = 0;
  
  Object.entries(selectedGroups).forEach(([corpus, groups]) => {
    const corporaStructure = corporaData[corpus];
    if (!corporaStructure) return;
    
    groups.forEach(group => {
      const groupWords = corporaStructure.groups[group];
      if (groupWords) {
        totalWords += groupWords.length;
      }
    });
  });
  
  return totalWords;
};

/**
 * Get all available groups for a corpus
 * @param corpus - The corpus name
 * @param corporaData - The corpora data structure
 * @returns Array of group names
 */
export const getCorpusGroups = (
  corpus: string,
  corporaData: CorporaData
): string[] => {
  const corporaStructure = corporaData[corpus];
  if (!corporaStructure) return [];
  return Object.keys(corporaStructure.groups || {});
};

/**
 * Get word count for a specific corpus and groups
 * @param corpus - The corpus name
 * @param groups - Array of group names (if empty, uses all groups)
 * @param corporaData - The corpora data structure
 * @returns Total word count
 */
export const getCorpusWordCount = (
  corpus: string,
  groups: string[],
  corporaData: CorporaData
): number => {
  const corporaStructure = corporaData[corpus];
  if (!corporaStructure) return 0;
  
  const targetGroups = groups.length > 0 ? groups : Object.keys(corporaStructure.groups || {});
  
  return targetGroups.reduce((total, group) => {
    const groupWords = corporaStructure.groups[group];
    return total + (groupWords?.length || 0);
  }, 0);
};