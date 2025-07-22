import activityStatsManager from '../Managers/activityStatsManager';
import corpusChoicesManager from '../Managers/corpusChoicesManager';
import storageConfigManager from '../Managers/storageConfigManager';
import { fetchLevels } from './apiClient';
import { getCorpusGroupsUpToLevel } from './levelUtils';

/**
 * Handles the complete onboarding setup process including storage configuration
 * and initial corpus selection based on skill level
 */
export const handleOnboardingSetup = async (
  skillLevel: string | null,
  storageMode: string,
  corporaData: Record<string, any>,
  setShowWelcome: (show: boolean) => void
): Promise<void> => {
  try {
    // If called without parameters, it means onboarding is complete
    if (skillLevel === undefined && storageMode === undefined) {
      setShowWelcome(false);
      return;
    }

    // Don't mark intro as seen yet - wait until entire onboarding is complete

    // Set storage configuration
    storageConfigManager.setStorageMode(storageMode);

    // Initialize storage managers with the new configuration
    await corpusChoicesManager.forceReinitialize();
    await activityStatsManager.forceReinitialize();

    // Only set initial corpus selection for new users (when skillLevel is not null)
    if (skillLevel !== null) {
      const initialSelectedGroups: Record<string, string[]> = {};
      
      if (skillLevel === 'beginner') {
        // For beginners, only enable Level 1 groups
        try {
          const levelsData = await fetchLevels();
          if (!levelsData || !levelsData.level_1) {
            throw new Error('Level 1 data not available');
          }
          
          // Use levelUtils to get Level 1 groups by corpus
          const level1GroupsByCorpus = getCorpusGroupsUpToLevel(levelsData, corporaData, 1);
          Object.assign(initialSelectedGroups, level1GroupsByCorpus);
        } catch (error) {
          console.error('Failed to fetch levels data for beginner setup:', error);
          // Fallback to nouns_one
          if (corporaData['nouns_one']) {
            initialSelectedGroups['nouns_one'] = Object.keys(corporaData['nouns_one']?.groups || {});
          }
        }
      } else if (skillLevel === 'intermediate') {
        // For intermediate, enable levels 1-8
        try {
          const levelsData = await fetchLevels();
          if (!levelsData) {
            throw new Error('Levels data not available');
          }
          
          // Use levelUtils to get levels 1-8 groups by corpus
          const intermediateLevelsByCorpus = getCorpusGroupsUpToLevel(levelsData, corporaData, 8);
          Object.assign(initialSelectedGroups, intermediateLevelsByCorpus);
        } catch (error) {
          console.error('Failed to fetch levels data for intermediate setup:', error);
          // Fallback to original intermediate selection
          ['nouns_one', 'nouns_two', 'verbs_present'].forEach(corpus => {
            if (corporaData[corpus]) {
              initialSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
            }
          });
        }
      } else if (skillLevel === 'expert') {
        // For experts, enable all groups (same as current default)
        Object.keys(corporaData).forEach(corpus => {
          initialSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
        });
      }

      // Update corpus choices using the manager - this will notify listeners and update state
      await corpusChoicesManager.setAllChoices(initialSelectedGroups);
    }
    // For users with existing data (skillLevel === null), we don't modify their corpus choices

    setShowWelcome(false);
  } catch (error) {
    console.error('Error completing welcome setup:', error);
    // Still close welcome screen even if there's an error
    setShowWelcome(false);
  }
};