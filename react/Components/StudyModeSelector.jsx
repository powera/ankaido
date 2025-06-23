import React from 'react';
import { journeyStatsManager } from '../Managers/journeyStatsManager';
import { corpusChoicesManager } from '../Managers/corpusChoicesManager';
import { storageConfigManager, STORAGE_MODES } from '../Managers/storageConfigManager';
import audioManager from '../Managers/audioManager';

// API Configuration - using Vite proxy
const API_BASE_URL = '/api/trakaido/journeystats';

const StudyModeSelector = ({
  quizMode,
  setQuizMode,
  grammarMode,
  setGrammarMode,
  studyMode,
  setStudyMode,
  safeStorage,
  SettingsToggle,
  audioEnabled,
  selectedVoice,
  setSelectedVoice,
  isFullscreen,
  toggleFullscreen,
  totalSelectedWords,
  onOpenStudyMaterials,
  onOpenExposureStats,
  onOpenDrillMode,
  journeyStats
}) => {
  const [isServerStorage, setIsServerStorage] = React.useState(storageConfigManager.isRemoteStorage());
  const [isSwitching, setIsSwitching] = React.useState(false);

  // Keep local state in sync with global storage mode
  React.useEffect(() => {
    const handleStorageModeChange = (newMode) => {
      setIsServerStorage(newMode === STORAGE_MODES.REMOTE);
    };

    // Set initial state
    setIsServerStorage(storageConfigManager.isRemoteStorage());

    // Listen for changes
    storageConfigManager.addListener(handleStorageModeChange);

    // Cleanup
    return () => storageConfigManager.removeListener(handleStorageModeChange);
  }, []);

  const handleStorageSwitch = async () => {
    if (isSwitching) return;

    setIsSwitching(true);
    try {
      const newMode = isServerStorage ? STORAGE_MODES.LOCAL : STORAGE_MODES.REMOTE;

      if (newMode === STORAGE_MODES.REMOTE) {
        // Switching to server storage - save current local data to server first
        console.log('Switching to server storage, saving local data...');

        // Get current local data before switching
        const currentStats = journeyStatsManager.getAllStats();
        const currentCorpusChoices = corpusChoicesManager.getAllChoices();

        // Switch to server mode first
        storageConfigManager.setStorageMode(STORAGE_MODES.REMOTE);

        // Force reinitialize managers with new storage mode
        await journeyStatsManager.forceReinitialize();
        await corpusChoicesManager.forceReinitialize();

        // If we have local data, explicitly save it to server
        if (Object.keys(currentStats).length > 0) {
          try {
            // Use the API client to save all stats to server
            const response = await fetch(`${API_BASE_URL}/`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ stats: currentStats }),
            });

            if (response.ok) {
              console.log('Local journey stats successfully saved to server');
            } else {
              console.warn('Failed to save local journey stats to server');
            }
          } catch (saveError) {
            console.error('Error saving local journey stats to server:', saveError);
          }
        }

        // Save corpus choices to server
        if (Object.keys(currentCorpusChoices).length > 0) {
          try {
            const response = await fetch('/api/trakaido/corpuschoices/', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ choices: currentCorpusChoices }),
            });

            if (response.ok) {
              console.log('Local corpus choices successfully saved to server');
            } else {
              console.warn('Failed to save local corpus choices to server');
            }
          } catch (saveError) {
            console.error('Error saving local corpus choices to server:', saveError);
          }
        }

        alert('Local data successfully transferred to server storage!');
      } else {
        // Switching to local storage
        console.log('Switching to local storage...');
        storageConfigManager.setStorageMode(STORAGE_MODES.LOCAL);

        // Force reinitialize managers with new storage mode
        await journeyStatsManager.forceReinitialize();
        await corpusChoicesManager.forceReinitialize();
      }

      // State will be updated by the listener
    } catch (error) {
      console.error('Error switching storage mode:', error);
      alert('Failed to switch storage mode. Please try again.');
    } finally {
      setIsSwitching(false);
    }
  };
  return (
    <div className="w-mode-selector">
      <div className="w-dropdown-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        margin: '0 0.5rem'
      }}>
        <label className="w-hide-mobile" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Mode:</label>
        <select 
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-card-bg)',
            minHeight: '44px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
          value={quizMode === 'conjugations' || quizMode === 'declensions' ? 'grammar' : quizMode}
          onChange={(e) => {
            const selectedMode = e.target.value;
            if (selectedMode === 'grammar') {
              setQuizMode(grammarMode);
            } else if (selectedMode === 'drill') {
              // For drill mode, we need to open the drill mode selector
              // Temporarily set the quiz mode to show the selector
              setQuizMode('drill');
              onOpenDrillMode();
            } else {
              setQuizMode(selectedMode);
            }
            safeStorage.setItem('flashcard-quiz-mode', selectedMode === 'grammar' ? grammarMode : selectedMode);
          }}
        >
          <option value="flashcard">Flash Cards</option>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="typing">⌨️ Typing</option>
          <option value="listening">🎧 Listening</option>
          <option value="vocabulary-list">📑 Vocabulary List</option>
          <option value="journey">🚀 Journey Mode</option>
          <option value="drill">🎯 Drill Mode</option>
          <option value="grammar">Grammar</option>
        </select>
      </div>

      {/* Hide direction/grammar selector for Journey and Drill modes */}
      {quizMode !== 'journey' && quizMode !== 'drill' && (
        <div className="w-dropdown-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          margin: '0 0.5rem'
        }}>
          {(quizMode === 'conjugations' || quizMode === 'declensions') ? (
            <>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                <span className="w-hide-mobile">Grammar Type:</span>
                <span className="w-show-mobile">Grammar:</span>
              </label>
              <select 
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-card-bg)',
                  minHeight: '44px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                value={quizMode}
                onChange={(e) => {
                  const selectedGrammarMode = e.target.value;
                  setQuizMode(selectedGrammarMode);
                  setGrammarMode(selectedGrammarMode);
                  safeStorage.setItem('flashcard-quiz-mode', selectedGrammarMode);
                }}
              >
                <option value="conjugations">📖 Conjugations</option>
                <option value="declensions">📋 Declensions</option>
              </select>
            </>
          ) : (
            <>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                <span className="w-hide-mobile">Direction:</span>
                <span className="w-show-mobile" style={{ display: 'none' }}>Direction:</span>
              </label>
              <select 
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-card-bg)',
                  minHeight: '44px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                value={studyMode}
                onChange={(e) => {
                  setStudyMode(e.target.value);
                  safeStorage.setItem('flashcard-study-mode', e.target.value);
                }}
              >
                <option value="english-to-lithuanian">
                  🇺🇸 → 🇱🇹
                </option>
                <option value="lithuanian-to-english">
                  🇱🇹 → 🇺🇸
                </option>
              </select>
            </>
          )}
        </div>
      )}

      <div className="w-button-group-mobile">
        <button
          className="w-mode-option w-compact-button"
          onClick={onOpenStudyMaterials}
          title="Select study materials and vocabulary groups"
        >
          <span className="w-hide-mobile">📚 Study Materials</span>
          <span className="w-show-mobile">📚 Materials</span>
        </button>
        {quizMode === 'journey' && (
          <>
            <button
              className="w-mode-option w-compact-button"
              onClick={onOpenExposureStats}
              title="View exposure statistics for journey mode"
            >
              <span className="w-hide-mobile">📊 Exposure Stats</span>
              <span className="w-show-mobile">📊 Stats</span>
            </button>
          </>
        )}
        <SettingsToggle className="w-mode-option w-compact-button" title="Settings">
          <span className="w-hide-mobile">Settings</span>
          <span className="w-show-mobile">⚙️</span>
        </SettingsToggle>
        <button className="w-hide-mobile w-mode-option w-compact-button" onClick={toggleFullscreen}>
          {isFullscreen ? '🗗 Close Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>
      {audioEnabled && audioManager.getAvailableVoices().length > 0 && (
        <div className="w-hide-mobile" style={{ marginTop: '0.5rem' }}>
          <select 
            value={selectedVoice || ''} 
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-mode-option"
            style={{ width: '100%', maxWidth: '200px' }}
          >
            <option value="random">🎲 Random Voice</option>
            {audioManager.getAvailableVoices().map(voice => (
              <option key={voice} value={voice}>
                🎤 {voice}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default StudyModeSelector;