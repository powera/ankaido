import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings.jsx';
import { useFullscreen } from './useFullscreen.js';
import VocabularyList from './Components/VocabularyList.jsx';
import TypingMode from './Modes/TypingMode.jsx';

import FlashCardMode from './Modes/FlashCardMode.jsx';
import ListeningMode from './Modes/ListeningMode.jsx';
import MultipleChoiceMode from './Modes/MultipleChoiceMode.jsx';
import StudyMaterialsModal from './Components/StudyMaterialsModal.jsx';
import StudyModeSelector from './Components/StudyModeSelector.jsx';
import ExposureStatsModal from './Components/ExposureStatsModal.jsx';
import ConjugationsMode from './Modes/ConjugationsMode.jsx';
import DeclensionsMode from './Modes/DeclensionsMode.jsx';
import JourneyMode from './Modes/JourneyMode.jsx';
import DrillMode from './Modes/DrillMode.jsx';
import DrillModeSelector from './Components/DrillModeSelector.jsx';
import safeStorage from './DataStorage/safeStorage';
import WordListManager from './Managers/WordListManager';
import SplashScreen from './Components/SplashScreen.jsx';
import WelcomeScreen from './Components/WelcomeScreen.jsx';
import storageConfigManager from './Managers/storageConfigManager';
import journeyStatsManager from './Managers/journeyStatsManager';
import corpusChoicesManager from './Managers/corpusChoicesManager';
// Use the namespaced lithuanianApi from window
// These are provided by the script tag in widget.html: /js/lithuanianApi.js
const { 
  fetchCorpora, 
  fetchCorpusStructure, 
  fetchAvailableVoices, 
  AudioManager
} = window.lithuanianApi;

// The CSS classes available are primarily in widget_tools.css .

const FlashCardApp = () => {
  // Global settings integration
  const { 
    settings, 
    SettingsModal, 
    SettingsToggle 
  } = useGlobalSettings({
    usedSettings: ['audioEnabled', 'soundVolume', 'autoAdvance', 'defaultDelay', 'difficulty']
  });

  // Fullscreen functionality
  const { isFullscreen, toggleFullscreen, containerRef } = useFullscreen();

  const [corporaData, setCorporaData] = useState({}); // Cache for corpus structures
  const [availableCorpora, setAvailableCorpora] = useState([]);
  // Initialize selectedGroups - will be loaded from corpus choices manager
  const [selectedGroups, setSelectedGroups] = useState({}); // {corpus: [group1, group2]}

  // Initialize local settings from localStorage where available
  const [studyMode, setStudyMode] = useState(() => {
    return safeStorage?.getItem('flashcard-study-mode') || 'english-to-lithuanian';
  });

  const [quizMode, setQuizMode] = useState(() => {
    return safeStorage?.getItem('flashcard-quiz-mode') || 'flashcard';
  });
  const [grammarMode, setGrammarMode] = useState('conjugations');

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

  const [audioManager] = useState(() => new AudioManager());
  const [wordListManager] = useState(() => new WordListManager(safeStorage, settings));
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return safeStorage?.getItem('flashcard-selected-voice') || null;
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    // Check both intro and storage configuration
    const hasSeenIntro = safeStorage?.getItem('trakaido-has-seen-intro');
    const storageConfigured = storageConfigManager.isConfigured();
    return !hasSeenIntro || !storageConfigured;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudyMaterialsModal, setShowStudyMaterialsModal] = useState(false);
  const [showExposureStatsModal, setShowExposureStatsModal] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [selectedVocabGroup, setSelectedVocabGroup] = useState(null);
  const [vocabGroupOptions, setVocabGroupOptions] = useState([]);
  const [vocabListWords, setVocabListWords] = useState([]);
  const [journeyStats, setJourneyStats] = useState({});
  
  // Drill mode state
  const [showDrillModeSelector, setShowDrillModeSelector] = useState(false);
  const [drillConfig, setDrillConfig] = useState(null); // { corpus, group, difficulty }

  // Use global settings for audio and auto-advance
  const audioEnabled = settings.audioEnabled;
  const autoAdvance = settings.autoAdvance;
  const defaultDelay = settings.defaultDelay;

  // Setup WordListManager callback
  useEffect(() => {
    wordListManager.setStateChangeCallback(setWordListState);
    wordListManager.settings = settings; // Update settings reference
  }, [wordListManager, settings]);

  // Handle splash screen timing
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(splashTimer);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Don't start loading until splash is done
      if (showSplash) return;

      setLoading(true);
      setError(null);
      try {
        const [corpora, voices] = await Promise.all([
          fetchCorpora(),
          fetchAvailableVoices()
        ]);
        setAvailableCorpora(corpora);
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          setSelectedVoice('random');
        }
        const corporaStructures = {};
        // Load corpus structures
        for (const corpus of corpora) {
          try {
            const structure = await fetchCorpusStructure(corpus);
            corporaStructures[corpus] = structure;
          } catch (err) {
            console.warn(`Failed to load structure for corpus: ${corpus}`, err);
          }
        }
        setCorporaData(corporaStructures);

        // Initialize corpus choices manager - this will handle defaults
        try {
          await corpusChoicesManager.initialize();
          const currentChoices = corpusChoicesManager.getAllChoices();

          // Only set defaults if user has seen intro but has no choices
          const hasSeenIntro = safeStorage?.getItem('trakaido-has-seen-intro');
          const shouldSetDefaults = Object.keys(currentChoices).length === 0 && hasSeenIntro;

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

  // Initialize word list manager with settings
  useEffect(() => {
    wordListManager.settings = settings; // Update settings reference
  }, [wordListManager, settings]);

  // Load journey stats using journeyStatsManager
  useEffect(() => {
    const loadJourneyStats = async () => {
      try {
        const stats = await journeyStatsManager.initialize();
        setJourneyStats(stats);

        // Journey stats are now managed separately by journeyStatsManager

        // Listen for stats changes
        const handleStatsChange = (updatedStats) => {
          setJourneyStats(updatedStats);
        };

        journeyStatsManager.addListener(handleStatsChange);

        // Cleanup listener on unmount
        return () => journeyStatsManager.removeListener(handleStatsChange);
      } catch (error) {
        console.error('Error loading journey stats:', error);
        setJourneyStats({});
      }
    };

    loadJourneyStats();
  }, [wordListManager]);

  // Load corpus choices using corpusChoicesManager
  useEffect(() => {
    const loadCorpusChoices = async () => {
      try {
        const choices = await corpusChoicesManager.initialize();
        setSelectedGroups(choices);

        // Listen for choices changes
        const handleChoicesChange = (updatedChoices) => {
          setSelectedGroups(updatedChoices);
        };

        corpusChoicesManager.addListener(handleChoicesChange);

        // Cleanup listener on unmount
        return () => corpusChoicesManager.removeListener(handleChoicesChange);
      } catch (error) {
        console.error('Error loading corpus choices:', error);
        setSelectedGroups({});
      }
    };

    loadCorpusChoices();
  }, []);

  // Combined localStorage persistence
  useEffect(() => {
    const persistenceUpdates = {
      'flashcard-study-mode': studyMode,
      'flashcard-quiz-mode': quizMode,
      ...(selectedVoice && { 'flashcard-selected-voice': selectedVoice })
    };

    Object.entries(persistenceUpdates).forEach(([key, value]) => {
      safeStorage.setItem(key, value);
    });
  }, [studyMode, quizMode, selectedVoice]);

  // Generate words list when selected groups change
  useEffect(() => {
    if (!loading) {
      wordListManager.generateWordsList(selectedGroups, corporaData);
    }
  }, [selectedGroups, loading, corporaData, wordListManager]);

  



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


  const handleWelcomeComplete = async (skillLevel, storageMode) => {
    try {
      // Mark that user has seen the intro
      safeStorage.setItem('trakaido-has-seen-intro', 'true');

      // Set storage configuration
      storageConfigManager.setStorageMode(storageMode);

      // Initialize storage managers with the new configuration
      await corpusChoicesManager.forceReinitialize();
      await journeyStatsManager.forceReinitialize();

      // Set initial corpus selection based on skill level
      const initialSelectedGroups = {};
      if (skillLevel === 'beginner') {
        // For beginners, only enable nouns_one corpus
        if (corporaData['nouns_one']) {
          initialSelectedGroups['nouns_one'] = Object.keys(corporaData['nouns_one']?.groups || {});
        }
      } else if (skillLevel === 'intermediate') {
        // For intermediate, enable a moderate selection
        ['nouns_one', 'nouns_two', 'verbs_present'].forEach(corpus => {
          if (corporaData[corpus]) {
            initialSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
          }
        });
      } else {
        // For experts, enable all groups (same as current default)
        Object.keys(corporaData).forEach(corpus => {
          initialSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
        });
      }

      // Update corpus choices using the manager - this will notify listeners and update state
      await corpusChoicesManager.setAllChoices(initialSelectedGroups);
      setShowWelcome(false);
    } catch (error) {
      console.error('Error completing welcome setup:', error);
      // Still close welcome screen even if there's an error
      setShowWelcome(false);
    }
  };

  const resetAllSettings = async () => {
    try {
      // Clear localStorage items
      safeStorage.removeItem('flashcard-study-mode');
      safeStorage.removeItem('flashcard-quiz-mode');
      safeStorage.removeItem('flashcard-selected-voice');
      safeStorage.removeItem('trakaido-has-seen-intro');

      // Reset storage configuration
      storageConfigManager.reset();

      // Clear data from storage managers
      await corpusChoicesManager.clearAllChoices();
      await journeyStatsManager.forceReinitialize();

      // Reset state to defaults
      setStudyMode('english-to-lithuanian');
      setQuizMode('flashcard');
      setSelectedVoice('random');
      // selectedGroups will be updated by the corpus choices manager listener
      setShowWelcome(true);
    } catch (error) {
      console.error('Error resetting settings:', error);
      // Still show welcome screen even if there's an error
      setShowWelcome(true);
    }
  };

  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  const resetCards = () => wordListManager.resetCards();
  const handleMultipleChoiceAnswer = (selectedOption) => {
    // Activities now handle their own stats tracking and auto-advance logic
    // This handler just manages UI flow for manual advancement
    nextCard();
  };

  // Helper function to get a random voice from available voices
  const getRandomVoice = () => {
    if (availableVoices.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableVoices.length);
    return availableVoices[randomIndex];
  };

  // Helper function to get the actual voice to use (handles random selection)
  const getVoiceToUse = () => {
    if (selectedVoice === 'random') {
      return getRandomVoice();
    }
    return selectedVoice;
  };

  const playAudio = async (word, onlyCached = false) => {
    const voiceToUse = getVoiceToUse();
    audioManager.playAudio(word, voiceToUse, audioEnabled, onlyCached);
  };

  const handleHoverStart = (word) => {
    if (!audioEnabled || !selectedVoice) return;
    const timeout = setTimeout(() => {
      playAudio(word, true); // Only play if cached
    }, 900);
    setHoverTimeout(timeout);
  };

  const handleHoverEnd = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
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
    setQuizMode('flashcard'); // Default back to flashcard mode
  };

  const handleCancelDrill = () => {
    setShowDrillModeSelector(false);
    setQuizMode('flashcard'); // Reset back to flashcard mode when canceling
  };

  const currentWord = wordListManager.getCurrentWord();
  const totalSelectedWords = wordListManager.getTotalWords();

  // Splash screen
  if (showSplash) {
    return <SplashScreen />;
  }

  // Welcome screen for new users
  if (showWelcome && !loading && !error) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-container">
        <h1>🇱🇹 Lithuanian Vocabulary Flash Cards</h1>
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
        <h1>🇱🇹 Lithuanian Vocabulary Flash Cards</h1>
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
  // Don't show this message in conjugations/declensions/journey/drill mode since they don't need word lists or handle them differently
  const showNoGroupsMessage = !currentWord && totalSelectedWords === 0 && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey' && quizMode !== 'drill';

  return (
    <div ref={containerRef} className={`w-container ${isFullscreen ? 'w-fullscreen' : ''}`}>

      {!isFullscreen && <h1>🇱🇹 Trakaido!</h1>}

      <StudyModeSelector
        quizMode={quizMode}
        setQuizMode={setQuizMode}
        grammarMode={grammarMode}
        setGrammarMode={setGrammarMode}
        studyMode={studyMode}
        setStudyMode={setStudyMode}
        safeStorage={safeStorage}
        SettingsToggle={SettingsToggle}
        audioEnabled={audioEnabled}
        availableVoices={availableVoices}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        totalSelectedWords={totalSelectedWords}
        onOpenStudyMaterials={() => setShowStudyMaterialsModal(true)}
        onOpenExposureStats={() => setShowExposureStatsModal(true)}
        onOpenDrillMode={() => setShowDrillModeSelector(true)}
        journeyStats={journeyStats}
      />

      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey' && quizMode !== 'drill' && (
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
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      ) : quizMode === 'declensions' ? (
        <DeclensionsMode 
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      ) : quizMode === 'vocabulary-list' ? (
        <VocabularyList 
          selectedVocabGroup={selectedVocabGroup}
          setSelectedVocabGroup={setSelectedVocabGroup}
          vocabGroupOptions={vocabGroupOptions}
          vocabListWords={vocabListWords}
          setVocabListWords={setVocabListWords}
          corporaData={corporaData}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
        />
      ) : quizMode === 'journey' ? (
        <JourneyMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
          nextCard={nextCard}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
          safeStorage={safeStorage}
          setJourneyStats={setJourneyStats}
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
            playAudio={playAudio}
            handleHoverStart={handleHoverStart}
            handleHoverEnd={handleHoverEnd}
            handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
            nextCard={nextCard}
            autoAdvance={autoAdvance}
            defaultDelay={defaultDelay}
            safeStorage={safeStorage}
            drillConfig={drillConfig}
            corporaData={corporaData}
            onExitDrill={handleExitDrill}
          />
        )
      ) : quizMode === 'flashcard' ? (
        <FlashCardMode 
          currentWord={currentWord}
          showAnswer={wordListState.showAnswer}
          setShowAnswer={(value) => setWordListState(prev => ({ ...prev, showAnswer: value }))}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      ) : quizMode === 'typing' ? (
        <TypingMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          nextCard={nextCard}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
        />
      ) : quizMode === 'listening' && currentWord ? (
        <ListeningMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
        />
      ) : quizMode === 'multiple-choice' && currentWord ? (
        <MultipleChoiceMode 
          wordListManager={wordListManager}
          wordListState={wordListState}
          studyMode={studyMode}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
          autoAdvance={autoAdvance}
          defaultDelay={defaultDelay}
        />
      ) : (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div>Loading word...</div>
          </div>
        </div>
      )}

      {/* Navigation controls */}
      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey' && quizMode !== 'drill' && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={prevCard}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={nextCard}>Next →</button>
        </div>
      )}

      

      <SettingsModal />
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
      <ExposureStatsModal
        isOpen={showExposureStatsModal}
        onClose={() => setShowExposureStatsModal(false)}
      />
    </div>
  );
};

export default FlashCardApp;