/**
 * Utility functions for study materials modal and level organization
 */

// Types for the utility functions
export interface LevelItem {
  corpus: string;
  group: string;
}

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

export interface LevelsData {
  [levelKey: string]: LevelItem[];
}

export interface OrganizedLevel {
  levelKey: string;
  level: string;
  description: string;
  preview: string;
  selectedWords: number;
  totalWords: number;
  isSelected: boolean;
}

export interface CorpusGroup {
  corpus: string;
  groups: string[];
}

export interface OrganizedCorpusLevel {
  level: string;
  corpusGroups: CorpusGroup[];
}

/**
 * Convert group names to meta-categories for better user understanding
 * @param groupName - The original group name
 * @returns A more user-friendly category name
 */
export const getMetaCategory = (groupName: string): string => {
  if (groupName.includes('Food') || groupName.includes('Drink')) return 'Food & Drink';
  if (groupName.includes('Clothing') || groupName.includes('Accessory')) return 'Clothing';
  if (groupName.includes('Building') || groupName.includes('Structure')) return 'Buildings';
  if (groupName.includes('Tool') || groupName.includes('Machine')) return 'Tools';
  if (groupName.includes('Animal')) return 'Animals';
  if (groupName.includes('Plant')) return 'Plants';
  if (groupName.includes('Color')) return 'Colors';
  if (groupName.includes('Shape')) return 'Shapes';
  if (groupName.includes('Quality')) return 'Qualities';
  if (groupName.includes('Quantity')) return 'Quantities';
  if (groupName.includes('Human') || groupName.includes('Personal')) return 'People';
  if (groupName.includes('Body')) return 'Body Parts';
  if (groupName.includes('Emotion') || groupName.includes('Feeling')) return 'Emotions';
  if (groupName.includes('Mental') || groupName.includes('Learning')) return 'Mental Actions';
  if (groupName.includes('Actions') || groupName.includes('Transactions')) return 'Actions';
  if (groupName.includes('Movement') || groupName.includes('Travel')) return 'Movement';
  if (groupName.includes('Sensory') || groupName.includes('Perception')) return 'Senses';
  if (groupName.includes('Basic Needs') || groupName.includes('Daily Life')) return 'Daily Life';
  if (groupName.includes('Greetings')) return 'Greetings';
  if (groupName.includes('Directions')) return 'Directions';
  if (groupName.includes('Restaurant')) return 'Restaurant';
  if (groupName.includes('Transportation')) return 'Transportation';
  if (groupName.includes('Pronoun')) return 'Pronouns';
  if (groupName.includes('Conjunction')) return 'Grammar';
  if (groupName.includes('Place') || groupName.includes('Location')) return 'Places';
  if (groupName.includes('Natural Feature')) return 'Geography';
  if (groupName.includes('Nationality')) return 'Nationalities';
  if (groupName.includes('Concept') || groupName.includes('Idea')) return 'Concepts';
  if (groupName.includes('Style')) return 'Styles';
  if (groupName.includes('Temporal')) return 'Time';
  if (groupName.includes('Material') || groupName.includes('Substance')) return 'Materials';
  if (groupName.includes('Unit Of Measurement')) return 'Measurements';
  if (groupName.includes('Small Movable Object')) return 'Objects';
  if (groupName.includes('Noun Other')) return 'Nouns';
  
  // Fallback to the original group name
  return groupName;
};

/**
 * Generate level description from group names based on word count
 * @param levelItems - Array of level items containing corpus and group information
 * @param availableCorpora - Array of available corpus names
 * @param corporaData - The corpora data structure
 * @returns A user-friendly description of the level content
 */
export const generateLevelDescription = (
  levelItems: LevelItem[] | null | undefined,
  availableCorpora: string[],
  corporaData: CorporaData
): string => {
  if (!levelItems || !Array.isArray(levelItems)) return '';
  
  // Calculate word count for each group and sort by size
  const groupWordCounts = levelItems
    .filter(item => availableCorpora.includes(item.corpus))
    .map(item => {
      const corporaStructure = corporaData[item.corpus];
      const wordCount = corporaStructure?.groups[item.group]?.length || 0;
      return { group: item.group, wordCount };
    })
    .reduce((acc, { group, wordCount }) => {
      // Sum up word counts for duplicate groups
      acc[group] = (acc[group] || 0) + wordCount;
      return acc;
    }, {} as Record<string, number>);

  // Sort groups by word count (descending) and get unique group names
  const sortedGroups = Object.entries(groupWordCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([group]) => group);

  const metaCategories = sortedGroups.map(getMetaCategory);

  if (metaCategories.length === 0) return 'No Content';
  if (metaCategories.length === 1) return metaCategories[0];
  if (metaCategories.length === 2) return `${metaCategories[0]} & ${metaCategories[1]}`;
  
  // For 3+ groups, show top 2 with "etc."
  return `${metaCategories[0]}, ${metaCategories[1]}, etc.`;
};

/**
 * Generate content preview from group names
 * @param levelItems - Array of level items containing corpus and group information
 * @returns A preview string showing the first few groups
 */
export const generateContentPreview = (levelItems: LevelItem[] | null | undefined): string => {
  if (!levelItems || !Array.isArray(levelItems)) return '';
  
  const groups = [...new Set(levelItems.map(item => item.group))];
  return groups.slice(0, 4).join(', ') + (groups.length > 4 ? '...' : '');
};

/**
 * Calculate total selected words based on selected groups
 * @param selectedGroups - Object mapping corpus to selected groups
 * @param corporaData - The corpora data structure
 * @returns Total number of selected words
 */
export const calculateTotalSelectedWords = (
  selectedGroups: SelectedGroups,
  corporaData: CorporaData
): number => {
  return Object.entries(selectedGroups).reduce((total, [corpus, groups]) => {
    const corporaStructure = corporaData[corpus];
    if (!corporaStructure) return total;

    return total + groups.reduce((corpusTotal, group) => {
      return corpusTotal + (corporaStructure.groups[group]?.length || 0);
    }, 0);
  }, 0);
};

/**
 * Get word count for a specific level
 * @param levelKey - The level key (e.g., 'level_1')
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @param corporaData - The corpora data structure
 * @param selectedGroups - Object mapping corpus to selected groups
 * @returns Number of selected words in this level
 */
export const getLevelWordCount = (
  levelKey: string,
  levelsData: LevelsData,
  availableCorpora: string[],
  corporaData: CorporaData,
  selectedGroups: SelectedGroups
): number => {
  const levelItems = levelsData[levelKey];
  if (!levelItems || !Array.isArray(levelItems)) return 0;

  return levelItems.reduce((total, item) => {
    if (availableCorpora.includes(item.corpus)) {
      const corporaStructure = corporaData[item.corpus];
      if (corporaStructure && corporaStructure.groups[item.group]) {
        const currentGroups = selectedGroups[item.corpus] || [];
        if (currentGroups.includes(item.group)) {
          return total + corporaStructure.groups[item.group].length;
        }
      }
    }
    return total;
  }, 0);
};

/**
 * Get total available word count for a specific level
 * @param levelKey - The level key (e.g., 'level_1')
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @param corporaData - The corpora data structure
 * @returns Total number of words available in this level
 */
export const getLevelTotalWordCount = (
  levelKey: string,
  levelsData: LevelsData,
  availableCorpora: string[],
  corporaData: CorporaData
): number => {
  const levelItems = levelsData[levelKey];
  if (!levelItems || !Array.isArray(levelItems)) return 0;

  return levelItems.reduce((total, item) => {
    if (availableCorpora.includes(item.corpus)) {
      const corporaStructure = corporaData[item.corpus];
      if (corporaStructure && corporaStructure.groups[item.group]) {
        return total + corporaStructure.groups[item.group].length;
      }
    }
    return total;
  }, 0);
};

/**
 * Check if a level is fully selected
 * @param levelKey - The level key (e.g., 'level_1')
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @param selectedGroups - Object mapping corpus to selected groups
 * @returns True if all groups in the level are selected
 */
export const isLevelSelected = (
  levelKey: string,
  levelsData: LevelsData,
  availableCorpora: string[],
  selectedGroups: SelectedGroups
): boolean => {
  const levelItems = levelsData[levelKey];
  if (!levelItems || !Array.isArray(levelItems)) return false;

  // Group items by corpus
  const corpusGroupsMap: Record<string, string[]> = {};
  levelItems.forEach(item => {
    if (availableCorpora.includes(item.corpus)) {
      if (!corpusGroupsMap[item.corpus]) {
        corpusGroupsMap[item.corpus] = [];
      }
      corpusGroupsMap[item.corpus].push(item.group);
    }
  });

  // Check if all groups are selected
  return Object.entries(corpusGroupsMap).every(([corpus, groups]) => {
    const currentGroups = selectedGroups[corpus] || [];
    return groups.every(g => currentGroups.includes(g));
  });
};

/**
 * Sort level keys numerically
 * @param levelKeys - Array of level keys (e.g., ['level_1', 'level_2'])
 * @returns Sorted array of level keys
 */
export const sortLevelKeys = (levelKeys: string[]): string[] => {
  return levelKeys.sort((a, b) => {
    const levelA = parseInt(a.replace('level_', ''));
    const levelB = parseInt(b.replace('level_', ''));
    return levelA - levelB;
  });
};

/**
 * Get groups that are in levels data
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @returns Set of corpus:group combinations that are in levels
 */
export const getGroupsInLevels = (
  levelsData: LevelsData,
  availableCorpora: string[]
): Set<string> => {
  const groupsInLevels = new Set<string>();
  Object.values(levelsData).forEach(levelItems => {
    if (Array.isArray(levelItems)) {
      levelItems.forEach(item => {
        if (availableCorpora.includes(item.corpus)) {
          groupsInLevels.add(`${item.corpus}:${item.group}`);
        }
      });
    }
  });
  return groupsInLevels;
};

/**
 * Organize levels for display in the main UI
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @param corporaData - The corpora data structure
 * @param selectedGroups - Object mapping corpus to selected groups
 * @returns Array of organized levels for display
 */
export const organizeLevelsForDisplay = (
  levelsData: LevelsData,
  availableCorpora: string[],
  corporaData: CorporaData,
  selectedGroups: SelectedGroups
): OrganizedLevel[] => {
  if (Object.keys(levelsData).length === 0) {
    // Fallback to original behavior if levels data is not available
    const totalWords = calculateTotalSelectedWords(selectedGroups, corporaData);

    const totalAvailable = availableCorpora.reduce((total, corpus) => {
      const corporaStructure = corporaData[corpus];
      if (!corporaStructure) return total;
      return total + Object.values(corporaStructure.groups).reduce((corpusTotal, groupWords) => {
        return corpusTotal + (groupWords?.length || 0);
      }, 0);
    }, 0);

    return [{
      levelKey: 'all',
      level: 'All Materials',
      description: 'All Available Content',
      preview: 'Complete vocabulary collection',
      selectedWords: totalWords,
      totalWords: totalAvailable,
      isSelected: false // Can't easily determine this for fallback
    }];
  }

  const levelOrder = sortLevelKeys(Object.keys(levelsData));

  const organizedLevels = levelOrder.map(levelKey => {
    const levelNum = levelKey.replace('level_', '');
    const levelItems = levelsData[levelKey];
    
    return {
      levelKey,
      level: `Level ${levelNum}`,
      description: generateLevelDescription(levelItems, availableCorpora, corporaData),
      preview: generateContentPreview(levelItems),
      selectedWords: getLevelWordCount(levelKey, levelsData, availableCorpora, corporaData, selectedGroups),
      totalWords: getLevelTotalWordCount(levelKey, levelsData, availableCorpora, corporaData),
      isSelected: isLevelSelected(levelKey, levelsData, availableCorpora, selectedGroups)
    };
  });

  // Add uncategorized materials
  const groupsInLevels = getGroupsInLevels(levelsData, availableCorpora);
  
  let uncategorizedWords = 0;
  let uncategorizedTotal = 0;
  availableCorpora.forEach(corpus => {
    const corporaStructure = corporaData[corpus];
    if (!corporaStructure) return;
    
    const allGroups = Object.keys(corporaStructure.groups);
    const uncategorizedGroups = allGroups.filter(group => 
      !groupsInLevels.has(`${corpus}:${group}`)
    );
    
    const selectedCorpusGroups = selectedGroups[corpus] || [];
    uncategorizedGroups.forEach(group => {
      const groupWords = corporaStructure.groups[group]?.length || 0;
      uncategorizedTotal += groupWords;
      if (selectedCorpusGroups.includes(group)) {
        uncategorizedWords += groupWords;
      }
    });
  });
  
  if (uncategorizedTotal > 0) {
    organizedLevels.push({
      levelKey: 'other',
      level: 'Other Materials',
      description: 'Additional Content',
      preview: 'Uncategorized vocabulary',
      selectedWords: uncategorizedWords,
      totalWords: uncategorizedTotal,
      isSelected: false // Complex to determine for mixed content
    });
  }

  return organizedLevels.filter(level => level.totalWords > 0);
};

/**
 * Organize corpus by level for advanced users
 * @param levelsData - The levels data structure
 * @param availableCorpora - Array of available corpus names
 * @param corporaData - The corpora data structure
 * @returns Array of organized corpus levels for advanced display
 */
export const organizeCorpusByLevel = (
  levelsData: LevelsData,
  availableCorpora: string[],
  corporaData: CorporaData
): OrganizedCorpusLevel[] => {
  if (Object.keys(levelsData).length === 0) {
    // Fallback to original behavior if levels data is not available
    return [{ 
      level: 'All Materials', 
      corpusGroups: availableCorpora.map(corpus => ({
        corpus,
        groups: Object.keys(corporaData[corpus]?.groups || {})
      }))
    }];
  }

  const levelOrder = sortLevelKeys(Object.keys(levelsData));

  const organizedLevels = levelOrder.map(levelKey => {
    const levelNum = levelKey.replace('level_', '');
    
    // Group by corpus, collecting only the groups that belong to this level
    const corpusGroupsMap: Record<string, string[]> = {};
    const levelItems = levelsData[levelKey];
    
    if (levelItems && Array.isArray(levelItems)) {
      levelItems.forEach(item => {
        if (availableCorpora.includes(item.corpus)) {
          if (!corpusGroupsMap[item.corpus]) {
            corpusGroupsMap[item.corpus] = [];
          }
          corpusGroupsMap[item.corpus].push(item.group);
        }
      });
    } else if (levelItems) {
      console.warn(`Level data for ${levelKey} is not an array:`, levelItems);
    }
    
    const corpusGroups = Object.entries(corpusGroupsMap).map(([corpus, groups]) => ({
      corpus,
      groups
    }));
    
    return {
      level: `Level ${levelNum}`,
      corpusGroups
    };
  });

  // Add any groups that aren't in the levels data
  const groupsInLevels = getGroupsInLevels(levelsData, availableCorpora);
  
  const uncategorizedCorpusGroups: CorpusGroup[] = [];
  availableCorpora.forEach(corpus => {
    const allGroups = Object.keys(corporaData[corpus]?.groups || {});
    const uncategorizedGroups = allGroups.filter(group => 
      !groupsInLevels.has(`${corpus}:${group}`)
    );
    
    if (uncategorizedGroups.length > 0) {
      uncategorizedCorpusGroups.push({
        corpus,
        groups: uncategorizedGroups
      });
    }
  });
  
  if (uncategorizedCorpusGroups.length > 0) {
    organizedLevels.push({
      level: 'Other Materials',
      corpusGroups: uncategorizedCorpusGroups
    });
  }

  return organizedLevels.filter(level => level.corpusGroups.length > 0);
};