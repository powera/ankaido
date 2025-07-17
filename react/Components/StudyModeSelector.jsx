import React from 'react';
import { activityStatsManager } from '../Managers/activityStatsManager';
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
  journeyFocusMode,
  setJourneyFocusMode,
  safeStorage,
  audioEnabled,
  toggleAudio,
  selectedVoice,
  setSelectedVoice,
  isFullscreen,
  toggleFullscreen,
  totalSelectedWords,
  onOpenStudyMaterials,
  onOpenActivityStats,
  onOpenDrillMode,
  onOpenBlitzMode,
  activityStats
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
        const currentStats = activityStatsManager.getAllStats();
        const currentCorpusChoices = corpusChoicesManager.getAllChoices();

        // Switch to server mode first
        storageConfigManager.setStorageMode(STORAGE_MODES.REMOTE);

        // Force reinitialize managers with new storage mode
        await activityStatsManager.forceReinitialize();
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
        await activityStatsManager.forceReinitialize();
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
      <div className="w-dropdown-container">
        <label className="w-hide-mobile">Mode:</label>
        <select 
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
            } else if (selectedMode === 'blitz') {
              // For blitz mode, we need to open the blitz mode selector
              // Temporarily set the quiz mode to show the selector
              setQuizMode('blitz');
              onOpenBlitzMode();
            } else {
              setQuizMode(selectedMode);
            }
            safeStorage.setItem('flashcard-quiz-mode', selectedMode === 'grammar' ? grammarMode : selectedMode);
          }}
        >
          <option value="journey">🚀 Journey Mode</option>
          <option value="drill">🎯 Drill Mode</option>
          <option value="blitz">⚡ Blitz Mode</option>
          <option value="multi-word-sequence">🎵 Multi-Word Sequence</option>
          <option value="multiple-choice">🎯 Multiple Choice</option>
          <option value="listening">🎧 Listening</option>
          <option value="typing">⌨️ Typing</option>
          <option value="flashcard">🃏 Flash Cards</option>
          <option value="vocabulary-list">📑 Vocabulary List</option>
          <option value="grammar">📚 Grammar</option>
          <option value="math-games">🔢 Math Games</option>
        </select>
      </div>

      {/* Journey Focus Mode selector - only show for Journey Mode */}
      {quizMode === 'journey' && (
        <div className="w-dropdown-container">
          <label>
            <span className="w-hide-mobile">Focus:</span>
            <span className="w-show-mobile">Focus:</span>
          </label>
          <select 
            value={journeyFocusMode}
            onChange={(e) => {
              setJourneyFocusMode(e.target.value);
              safeStorage.setItem('flashcard-journey-focus-mode', e.target.value);
            }}
          >
            <option value="normal">🎯 Normal</option>
            <option value="new-words">🌱 New Words</option>
            <option value="review-words">📚 Review Words</option>
          </select>
        </div>
      )}

      {/* Hide direction/grammar selector for Journey, Drill, and Math Games modes */}
      {quizMode !== 'journey' && quizMode !== 'drill' && quizMode !== 'math-games' && (
        (quizMode === 'conjugations' || quizMode === 'declensions') ? (
          <div className="w-dropdown-container">
            <label>
              <span className="w-hide-mobile">Grammar Type:</span>
              <span className="w-show-mobile">Grammar:</span>
            </label>
            <select 
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
          </div>
        ) : (
          <div className="w-dropdown-container">
            <label>
              <span className="w-hide-mobile">Direction:</span>
              <span className="w-show-mobile" style={{ display: 'none' }}>Direction:</span>
            </label>
            <select 
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
          </div>
        )
        
      )}

      <div className="w-button-group-mobile">
        <button
          className="w-mode-option w-compact-button"
          onClick={onOpenStudyMaterials}
          title="Select study materials and vocabulary groups"
        >
          <span>📚 Materials</span>
        </button>
        <button
          className="w-mode-option w-compact-button"
          onClick={onOpenActivityStats}
          title="View activity statistics for journey mode"
        >
          <span>📊 Stats</span>
        </button>
        <button 
          className="w-mode-option w-compact-button" 
          onClick={toggleAudio}
          title={audioEnabled ? "Disable audio" : "Enable audio"}
        >
          <span className="w-hide-mobile">{audioEnabled ? "🔊 Audio On" : "🔇 Audio Off"}</span>
          <span className="w-show-mobile">{audioEnabled ? "🔊" : "🔇"}</span>
        </button>
        <button className="w-hide-mobile w-mode-option w-compact-button" onClick={toggleFullscreen}>
          {isFullscreen ? '🗗 Close Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>
      {audioEnabled && audioManager.getAvailableVoices().length > 0 && (
        <div className="w-hide-mobile w-voice-selector">
          <select 
            value={selectedVoice || ''} 
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-mode-option"
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