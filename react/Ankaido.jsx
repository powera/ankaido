import { useEffect, useState } from 'react';
import TypingMode from './Modes/TypingMode.jsx';
import VocabularyListMode from './Modes/VocabularyListMode.jsx';
import { useFullscreen } from './Utilities/useFullscreen';

import ActivityStatsModal from './Components/ActivityStatsModal.jsx';
import BlitzModeSelector from './Components/BlitzModeSelector.jsx';
import DrillModeSelector from './Components/DrillModeSelector.jsx';

import SplashScreen from './Components/SplashScreen.jsx';
import StudyMaterialsModal from './Components/StudyMaterialsModal.jsx';
import AppSettingsPanel from './Components/AppSettingsPanel.jsx';
import safeStorage from './DataStorage/safeStorage';
import activityStatsManager from './Managers/activityStatsManager';
import audioManager from './Managers/audioManager';
import corpusChoicesManager from './Managers/corpusChoicesManager';
import storageConfigManager, { STORAGE_MODES } from './Managers/storageConfigManager';
import WordListManager from './Managers/wordListManager';
import BlitzMode from './Modes/BlitzMode.jsx';
import ConjugationsMode from './Modes/ConjugationsMode.jsx';
import DrillMode from './Modes/DrillMode.jsx';
import FlashCardMode from './Modes/FlashCardMode.jsx';
import JourneyMode from './Modes/JourneyMode.jsx';
import ListeningMode from './Modes/ListeningMode.jsx';
import MultipleChoiceMode from './Modes/MultipleChoiceMode.jsx';
import MultiWordSequenceMode from './Modes/MultiWordSequenceMode.jsx';
import {
    fetchAllWordlists,
    fetchAvailableVoices
} from './Utilities/apiClient.js';


const FlashCardApp = () => {
  // Audio settings - simple local state
  const [audioEnabled, setAudioEnabled] = useState(() => {
    const stored = localStorage.getItem('ankaido_audio_enabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  // Fullscreen functionality
  const { isFullscreen, toggleFullscreen, containerRef } = useFullscreen();

  const [corporaData, setCorporaData] = useState({}); // Cache for corpus structures
  const [availableCorpora, setAvailableCorpora] = useState([]);
  // Initialize selectedGroups - will be loaded from corpus choices manager
  const [selectedGroups, setSelectedGroups] = useState({}); // {corpus: [group1, group2]}

  // Fixed study mode - always source language questions with English answers
  const studyMode = 'source-to-english';

  const [quizMode, setQuizMode] = useState(() => {
    return safeStorage?.getItem('ankaido-quiz-mode') || 'journey';
  });


  // Journey focus mode state - always defaults to normal, no persistence
  const [journeyFocusMode, setJourneyFocusMode] = useState('normal');

  // WordListManager state
  const [wordListState, setWordListState] = useState({
    allWords: [],
    currentCard: 0,
    showAnswer: false,
    selectedAnswer: null,
    typedAnswer: '',
    typingFeedback: '',
    stats: { correct: 0, incorrect: 0, total: 0 },
    autoAdvanceTimer: null
  });

  const [wordListManager] = useState(() => new WordListManager(safeStorage, {}));
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return safeStorage?.getItem('ankaido-selected-voice') || 'random';
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    // Only check storage configuration - no more onboarding flow
    const storageConfigured = storageConfigManager.isConfigured();
    return !storageConfigured;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudyMaterialsModal, setShowStudyMaterialsModal] = useState(false);
  const [showActivityStatsModal, setShowActivityStatsModal] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [selectedVocabGroup, setSelectedVocabGroup] = useState(null);
  const [vocabGroupOptions, setVocabGroupOptions] = useState([]);
  const [vocabListWords, setVocabListWords] = useState([]);
  const [activityStats, setActivityStats] = useState({});

  // Drill mode state
  const [showDrillModeSelector, setShowDrillModeSelector] = useState(false);
  const [drillConfig, setDrillConfig] = useState(null); // { corpus, group, difficulty }

  // Blitz mode state
  const [showBlitzModeSelector, setShowBlitzModeSelector] = useState(false);
  const [blitzConfig, setBlitzConfig] = useState(null); // { corpus }

  // Save audio setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ankaido_audio_enabled', JSON.stringify(audioEnabled));
  }, [audioEnabled]);

  // Save selected voice to storage when it changes
  useEffect(() => {
    if (selectedVoice) {
      safeStorage?.setItem('ankaido-selected-voice', selectedVoice);
    }
  }, [selectedVoice]);

  // Toggle audio function
  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
  };

  // Handle splash screen timing
  useEffect(() => {
    // For users without storage config (showWelcome = true), auto-advance after 2 seconds
    // For returning users (showWelcome = false), require user interaction
    if (showWelcome) {
      const splashTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2000); // Show splash for 2 seconds for users without storage config

      return () => clearTimeout(splashTimer);
    }
    // For returning users, splash will remain until user clicks
  }, [showWelcome]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Don't start loading until splash is done
      if (showSplash) return;

      setLoading(true);
      setError(null);
      try {
        const [allWords, voices] = await Promise.all([
          fetchAllWordlists(),
          fetchAvailableVoices()
        ]);
        
        // Extract corpora from words
        const corpora = [...new Set(allWords.map(word => word.corpus))].sort();
        setAvailableCorpora(corpora);
        setAvailableVoices(voices);
        
        // Initialize audioManager with available voices
        await audioManager.initialize(voices);
        
        // Build corpus structures from all words
        const corporaStructures = {};
        corpora.forEach(corpus => {
          const corpusWords = allWords.filter(word => word.corpus === corpus);
          const groups = {};
          corpusWords.forEach(word => {
            if (!groups[word.group]) {
              groups[word.group] = [];
            }
            groups[word.group].push(word);
          });
          corporaStructures[corpus] = { groups };
        });
        setCorporaData(corporaStructures);

        // Initialize corpus choices manager - this will handle defaults
        try {
          await corpusChoicesManager.initialize();
          const currentChoices = corpusChoicesManager.getAllChoices();

          // Set defaults if user has no choices (first time or after reset)
          const shouldSetDefaults = Object.keys(currentChoices).length === 0;

          if (shouldSetDefaults) {
            const defaultSelectedGroups = {};
            Object.keys(corporaStructures).forEach(corpus => {
              const groups = Object.keys(corporaStructures[corpus]?.groups || {});
              defaultSelectedGroups[corpus] = groups;
            });
            await corpusChoicesManager.setAllChoices(defaultSelectedGroups);
          }
        } catch (error) {
          console.error('Error initializing corpus choices during startup:', error);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError('Failed to load vocabulary data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [showSplash]);

  // Comprehensive WordListManager update handler
  useEffect(() => {
    // Initialize callback if not already set
    wordListManager.setStateChangeCallback(setWordListState);
    
    // Update settings reference (empty object since we removed global settings)
    wordListManager.settings = {};
    
    // Generate words list when data is available and not loading
    if (!loading && Object.keys(selectedGroups).length > 0 && Object.keys(corporaData).length > 0) {
      wordListManager.generateWordsList(selectedGroups, corporaData);
    }
  }, [wordListManager, selectedGroups, loading, corporaData]);

  // Load journey stats using activityStatsManager
  useEffect(() => {
    let handleStatsChange = null;

    const loadActivityStats = async () => {
      try {
        const stats = await activityStatsManager.initialize();
        setActivityStats(stats);

        // Journey stats are now managed separately by activityStatsManager

        // Listen for stats changes
        handleStatsChange = (updatedStats) => {
          setActivityStats(updatedStats);
        };

        activityStatsManager.addListener(handleStatsChange);
      } catch (error) {
        console.error('Error loading journey stats:', error);
        setActivityStats({});
      }
    };

    loadActivityStats();

    // Cleanup listener on unmount
    return () => {
      if (handleStatsChange) {
        activityStatsManager.removeListener(handleStatsChange);
      }
    };
  }, [wordListManager]);

  // Load corpus choices using corpusChoicesManager
  useEffect(() => {
    let handleChoicesChange = null;

    const loadCorpusChoices = async () => {
      try {
        const choices = await corpusChoicesManager.initialize();
        setSelectedGroups(choices);

        // Listen for choices changes
        handleChoicesChange = (updatedChoices) => {
          setSelectedGroups(updatedChoices);
        };

        corpusChoicesManager.addListener(handleChoicesChange);
      } catch (error) {
        console.error('Error loading corpus choices:', error);
        setSelectedGroups({});
      }
    };

    loadCorpusChoices();

    // Cleanup listener on unmount
    return () => {
      if (handleChoicesChange) {
        corpusChoicesManager.removeListener(handleChoicesChange);
      }
    };
  }, []);

  // Combined localStorage persistence
  useEffect(() => {
    const persistenceUpdates = {
      'ankaido-quiz-mode': quizMode
    };

    Object.entries(persistenceUpdates).forEach(([key, value]) => {
      safeStorage.setItem(key, value);
    });
  }, [quizMode]);


  // Generate all available groups from all corpuses
  useEffect(() => {
    if (Object.keys(corporaData).length === 0) return;

    const options = [];
    // Iterate through all corpuses and their groups
    Object.entries(corporaData).forEach(([corpus, data]) => {
      Object.keys(data.groups || {}).forEach(group => {
        options.push({
          corpus,
          group,
          displayName: `${corpus} - ${group}`,
          wordCount: data.groups[group]?.length || 0
        });
      });
    });

    // Sort alphabetically by display name
    options.sort((a, b) => a.displayName.localeCompare(b.displayName));
    setVocabGroupOptions(options);
  }, [corporaData]);


  const handleStorageSetup = async (storageMode = STORAGE_MODES.LOCAL) => {
    try {
      // Set storage configuration
      storageConfigManager.setStorageMode(storageMode);

      // Initialize storage managers with the new configuration
      await corpusChoicesManager.forceReinitialize();
      await activityStatsManager.forceReinitialize();

      // Set default corpus selection (all groups enabled)
      const defaultSelectedGroups = {};
      Object.keys(corporaData).forEach(corpus => {
        defaultSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
      });
      await corpusChoicesManager.setAllChoices(defaultSelectedGroups);

      setShowWelcome(false);
    } catch (error) {
      console.error('Error setting up storage:', error);
      // Still close welcome screen even if there's an error
      setShowWelcome(false);
    }
  };

  const resetAllSettings = async () => {
    try {
      // Clear localStorage items
      safeStorage.removeItem('ankaido-quiz-mode');
      safeStorage.removeItem('ankaido-selected-voice');

      // Reset storage configuration
      storageConfigManager.reset();

      // Clear data from storage managers
      await corpusChoicesManager.clearAllChoices();
      await activityStatsManager.forceReinitialize();

      // Reset state to defaults
      setQuizMode('flashcard');
      // selectedGroups will be updated by the corpus choices manager listener
      setShowWelcome(true);
    } catch (error) {
      console.error('Error resetting settings:', error);
      // Still show welcome screen even if there's an error
      setShowWelcome(true);
    }
  };

  // Drill mode handlers
  const handleStartDrill = (config) => {
    setDrillConfig(config);
    setQuizMode('drill');
    setShowDrillModeSelector(false);
  };

  const handleExitDrill = () => {
    setDrillConfig(null);
    setShowDrillModeSelector(false);
    setQuizMode('journey'); // Default back to journey mode
  };

  const handleBackToDrillSelector = () => {
    setDrillConfig(null);
    setShowDrillModeSelector(true);
    // Keep quizMode as 'drill' to stay in drill mode
  };

  const handleCancelDrill = () => {
    setShowDrillModeSelector(false);
    setQuizMode('journey'); // Reset back to journey mode when canceling
  };

  // Blitz mode handlers
  const handleStartBlitz = (config) => {
    setBlitzConfig(config);
    setQuizMode('blitz');
    setShowBlitzModeSelector(false);
  };

  const handleExitBlitz = () => {
    setBlitzConfig(null);
    setShowBlitzModeSelector(false);
    setQuizMode('journey'); // Default back to journey mode
  };

  const handleBackToBlitzSelector = () => {
    setBlitzConfig(null);
    setShowBlitzModeSelector(true);
    // Keep quizMode as 'blitz' to stay in blitz mode
  };

  const handleCancelBlitz = () => {
    setShowBlitzModeSelector(false);
    setQuizMode('journey'); // Reset back to journey mode when canceling
  };

  const handleSplashContinue = () => {
    setShowSplash(false);
  };

  const currentWord = wordListManager.getCurrentWord();
  const totalSelectedWords = wordListManager.getTotalWords();

  // Splash screen
  if (showSplash) {
    return (
      <SplashScreen 
        requiresInteraction={!showWelcome} 
        onContinue={handleSplashContinue}
      />
    );
  }

  // Storage setup for new users
  if (showWelcome && !loading && !error) {
    return (
      <div className="w-container">
        <h1>📚 Vocabulary Flash Cards</h1>
        <div className="w-card">
          <div className="w-text-center w-mb-large">
            <div className="w-question w-mb-large">Welcome!</div>
            <div className="w-stat-label w-mb-large">Setting up your vocabulary learning experience...</div>
            <button 
              className="w-button" 
              onClick={() => handleStorageSetup(STORAGE_MODES.LOCAL)}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-container">
        <h1>📚 Vocabulary Flash Cards</h1>
        <div className="w-card">
          <div className="w-text-center w-mb-large">
            <div className="w-question w-mb-large">Loading vocabulary data...</div>
            <div className="w-stat-label">This may take a moment</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-container">
        <h1>📚 Vocabulary Flash Cards</h1>
        <div className="w-card">
          <div className="w-text-center w-mb-large">
            <div className="w-feedback w-error">⚠️ Error</div>
            <div className="w-mb-large">{error}</div>
            <button className="w-button" onClick={() => window.location.reload()}>🔄 Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // Show "no groups selected" message but keep the Study Materials section visible
  // Don't show this message in conjugations/journey/drill/blitz mode since they don't need word lists or handle them differently
  const showNoGroupsMessage = !currentWord && totalSelectedWords === 0 && quizMode !== 'conjugations' && quizMode !== 'journey' && quizMode !== 'drill' && quizMode !== 'blitz';

  return (
    <div ref={containerRef} className={`w-container ${isFullscreen ? 'w-fullscreen' : ''}`}>

      {!isFullscreen && <h1>🇱🇹 Ankaido!</h1>}

      <AppSettingsPanel
        quizMode={quizMode}
        setQuizMode={setQuizMode}
        journeyFocusMode={journeyFocusMode}
        setJourneyFocusMode={setJourneyFocusMode}
        safeStorage={safeStorage}
        audioEnabled={audioEnabled}
        toggleAudio={toggleAudio}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        totalSelectedWords={totalSelectedWords}
        onOpenStudyMaterials={() => setShowStudyMaterialsModal(true)}
        onOpenActivityStats={() => setShowActivityStatsModal(true)}
        onOpenDrillMode={() => setShowDrillModeSelector(true)}
        onOpenBlitzMode={() => setShowBlitzModeSelector(true)}
        activityStats={activityStats}
      />

      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'journey' && quizMode !== 'drill' && quizMode !== 'blitz' && quizMode !== 'multi-word-sequence' && (
        <div className="w-progress">
          Card {wordListState.currentCard + 1} of {wordListState.allWords.length}
        </div>
      )}

      {showNoGroupsMessage ? (
        <div className="w-card">
          <div className="w-text-center w-mb-large">
            <div className="w-question w-mb-large">📭 No Words Available</div>
            <div>No vocabulary words found for the selected groups. Please try selecting different groups.</div>
          </div>
        </div>
      ) : quizMode === 'conjugations' ? (
        <ConjugationsMode 
          audioEnabled={audioEnabled}
        />
      ) : quizMode === 'vocabulary-list' ? (
        <VocabularyListMode 
          selectedVocabGroup={selectedVocabGroup}
          setSelectedVocabGroup={setSelectedVocabGroup}
          vocabGroupOptions={vocabGroupOptions}
          vocabListWords={vocabListWords}
          setVocabListWords={setVocabListWords}
          corporaData={corporaData}
          audioEnabled={audioEnabled}
          audioManager={audioManager}
        />
      ) : quizMode === 'journey' ? (
        <JourneyMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          autoAdvance={true}
          defaultDelay={3}
          safeStorage={safeStorage}
          setActivityStats={setActivityStats}
          journeyFocusMode={journeyFocusMode}
          setJourneyFocusMode={setJourneyFocusMode}
        />
      ) : quizMode === 'drill' ? (
        showDrillModeSelector || !drillConfig ? (
          <DrillModeSelector
            availableCorpora={availableCorpora}
            corporaData={corporaData}
            onStartDrill={handleStartDrill}
            onCancel={handleCancelDrill}
          />
        ) : (
          <DrillMode
            wordListManager={wordListManager}
            wordListState={wordListState}
            studyMode={studyMode}
            audioEnabled={audioEnabled}
            autoAdvance={true}
            defaultDelay={2}
            safeStorage={safeStorage}
            drillConfig={drillConfig}
            corporaData={corporaData}
            onExitDrill={handleExitDrill}
            onBackToDrillSelector={handleBackToDrillSelector}
          />
        )
      ) : quizMode === 'flashcard' ? (
        <FlashCardMode 
          currentWord={currentWord}
          showAnswer={wordListState.showAnswer}
          setShowAnswer={(value) => setWordListState(prev => ({ ...prev, showAnswer: value }))}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          wordListManager={wordListManager}
        />
      ) : quizMode === 'typing' ? (
        <TypingMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          autoAdvance={false}
          defaultDelay={5}
        />
      ) : quizMode === 'listening' && currentWord ? (
        <ListeningMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          autoAdvance={false}
          defaultDelay={5}
        />
      ) : quizMode === 'multiple-choice' && currentWord ? (
        <MultipleChoiceMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          autoAdvance={false}
          defaultDelay={5}
        />
      ) : quizMode === 'blitz' ? (
        showBlitzModeSelector || !blitzConfig ? (
          <BlitzModeSelector
            availableCorpora={availableCorpora}
            corporaData={corporaData}
            selectedGroups={selectedGroups}
            onStartBlitz={handleStartBlitz}
            onCancel={handleCancelBlitz}
          />
        ) : (
          <BlitzMode 
            wordListManager={wordListManager}
            wordListState={wordListState}
            studyMode={studyMode}
            audioEnabled={audioEnabled}
            blitzConfig={blitzConfig}
            corporaData={corporaData}
            selectedGroups={selectedGroups}
            onExitBlitz={handleExitBlitz}
            onBackToBlitzSelector={handleBackToBlitzSelector}
          />
        )
      ) : quizMode === 'multi-word-sequence' ? (
        <MultiWordSequenceMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          autoAdvance={true}
          defaultDelay={10}
          settings={{}}
        />
      ) : (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div>Loading word...</div>
          </div>
        </div>
      )}



      <StudyMaterialsModal
        isOpen={showStudyMaterialsModal}
        onClose={() => setShowStudyMaterialsModal(false)}
        totalSelectedWords={totalSelectedWords}
        availableCorpora={availableCorpora}
        corporaData={corporaData}
        selectedGroups={selectedGroups}
        resetAllSettings={resetAllSettings}
        safeStorage={safeStorage}
      />
      <ActivityStatsModal
        isOpen={showActivityStatsModal}
        onClose={() => setShowActivityStatsModal(false)}
        corporaData={corporaData}
        selectedGroups={selectedGroups}
      />
    </div>
  );
};

export default FlashCardApp;