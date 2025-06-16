import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings.jsx';
import { useFullscreen } from './useFullscreen.js';
import VocabularyList from './Components/VocabularyList.jsx';
import TypingMode from './Modes/TypingMode.jsx';
import StatsDisplay from './Components/StatsDisplay.jsx';
import FlashCardMode from './Modes/FlashCardMode.jsx';
import ListeningMode from './Modes/ListeningMode.jsx';
import MultipleChoiceMode from './Modes/MultipleChoiceMode.jsx';
import StudyMaterialsModal from './Components/StudyMaterialsModal.jsx';
import StudyModeSelector from './Components/StudyModeSelector.jsx';
import ExposureStatsModal from './Components/ExposureStatsModal.jsx';
import ConjugationsMode from './Modes/ConjugationsMode.jsx';
import DeclensionsMode from './Modes/DeclensionsMode.jsx';
import WordListManager from './WordListManager.js';
import SplashScreen from './Components/SplashScreen.jsx';
import WelcomeScreen from './Components/WelcomeScreen.jsx';
import JourneyMode from './Modes/JourneyMode.jsx';
import safeStorage from './safeStorage.js';
import indexedDBManager from './indexedDBManager';

// Import CSS modules for better organization
import './styles/mobile.css';

// Use the namespaced lithuanianApi from window
// These are provided by the script tag in widget.html: /js/lithuanianApi.js
const { 
  fetchCorpora, 
  fetchCorpusStructure, 
  fetchAvailableVoices, 
  fetchVerbCorpuses, 
  fetchConjugations, 
  fetchDeclensions,
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
  // Initialize selectedGroups from localStorage if available
  const [selectedGroups, setSelectedGroups] = useState(() => {
    const savedGroups = safeStorage?.getItem('flashcard-selected-groups');
    try {
      return savedGroups ? JSON.parse(savedGroups) : {};
    } catch (error) {
      console.error('Error parsing saved corpus groups:', error);
      return {};
    }
  }); // {corpus: [group1, group2]}

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
    multipleChoiceOptions: [],
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
    return !safeStorage?.getItem('trakaido-has-seen-intro');
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudyMaterialsModal, setShowStudyMaterialsModal] = useState(false);
  const [showExposureStatsModal, setShowExposureStatsModal] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [conjugations, setConjugations] = useState({});
  const [availableVerbs, setAvailableVerbs] = useState([]);
  const [selectedVerb, setSelectedVerb] = useState(null);
  const [loadingConjugations, setLoadingConjugations] = useState(false);
  const [availableVerbCorpuses, setAvailableVerbCorpuses] = useState([]);
  const [selectedVerbCorpus, setSelectedVerbCorpus] = useState('verbs_present');
  const [declensions, setDeclensions] = useState({});
  const [availableNouns, setAvailableNouns] = useState([]);
  const [selectedNoun, setSelectedNoun] = useState(null);
  const [selectedVocabGroup, setSelectedVocabGroup] = useState(null);
  const [vocabGroupOptions, setVocabGroupOptions] = useState([]);
  const [vocabListWords, setVocabListWords] = useState([]);
  const [journeyStats, setJourneyStats] = useState({});

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
        const [corpora, voices, verbCorpuses, conjugationData, declensionData] = await Promise.all([
          fetchCorpora(),
          fetchAvailableVoices(),
          fetchVerbCorpuses(),
          fetchConjugations(),
          fetchDeclensions()
        ]);
        setAvailableCorpora(corpora);
        setAvailableVoices(voices);
        setAvailableVerbCorpuses(verbCorpuses);
        setConjugations(conjugationData.conjugations);
        setAvailableVerbs(conjugationData.verbs);
        setDeclensions(declensionData.declensions);
        setAvailableNouns(declensionData.available_nouns);
        if (voices.length > 0 && !selectedVoice) {
          setSelectedVoice('random');
        }
        const corporaStructures = {};
        // Only set default groups if we don't have any saved in localStorage AND user has seen intro
        const hasSeenIntro = safeStorage?.getItem('trakaido-has-seen-intro');
        const useDefaults = Object.keys(selectedGroups).length === 0 && hasSeenIntro;
        const defaultSelectedGroups = useDefaults ? {} : null;

        for (const corpus of corpora) {
          try {
            const structure = await fetchCorpusStructure(corpus);
            corporaStructures[corpus] = structure;

            // If we're using defaults, set all groups as selected
            if (useDefaults) {
              const groups = Object.keys(structure.groups);
              defaultSelectedGroups[corpus] = groups;
            }
          } catch (err) {
            console.warn(`Failed to load structure for corpus: ${corpus}`, err);
          }
        }
        setCorporaData(corporaStructures);

        // Only update selectedGroups if we're using defaults
        if (useDefaults) {
          setSelectedGroups(defaultSelectedGroups);
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

  // Load journey stats from IndexedDB
  useEffect(() => {
    const loadJourneyStats = async () => {
      try {
        const stats = await indexedDBManager.loadJourneyStats();
        setJourneyStats(stats);

        // Update wordListManager with journey stats
        if (wordListManager) {
          wordListManager.journeyStats = stats;
          wordListManager.notifyStateChange();
        }
      } catch (error) {
        console.error('Error loading journey stats:', error);
        setJourneyStats({});
      }
    };

    loadJourneyStats();
  }, [wordListManager]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    safeStorage.setItem('flashcard-selected-groups', JSON.stringify(selectedGroups));
  }, [selectedGroups]);

  useEffect(() => {
    safeStorage.setItem('flashcard-study-mode', studyMode);
  }, [studyMode]);

  useEffect(() => {
    safeStorage.setItem('flashcard-quiz-mode', quizMode);
  }, [quizMode]);

  useEffect(() => {
    if (selectedVoice) {
      safeStorage.setItem('flashcard-selected-voice', selectedVoice);
    }
  }, [selectedVoice]);

  // Generate words list when selected groups change
  useEffect(() => {
    if (!loading) {
      wordListManager.generateWordsList(selectedGroups, corporaData);
    }
  }, [selectedGroups, loading, corporaData, wordListManager]);

  // Generate multiple choice options when card changes or mode changes
  useEffect(() => {
    if ((quizMode === 'multiple-choice' || quizMode === 'listening') && wordListState.allWords.length > 0) {
      wordListManager.generateMultipleChoiceOptions(studyMode, quizMode);
    }
  }, [wordListState.currentCard, quizMode, wordListState.allWords, studyMode, settings.difficulty, wordListManager]);

  // Pre-load audio for multiple choice options when audio is enabled
  useEffect(() => {
    if (audioEnabled && (quizMode === 'multiple-choice' || quizMode === 'listening') && wordListState.multipleChoiceOptions.length > 0) {
      preloadMultipleChoiceAudio();
    }
  }, [audioEnabled, quizMode, studyMode, wordListState.multipleChoiceOptions, selectedVoice]);

  // Auto-play audio in listening mode when card changes
  useEffect(() => {
    if (quizMode === 'listening' && audioEnabled && wordListState.allWords.length > 0 && wordListState.allWords[wordListState.currentCard]) {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        playAudio(wordListState.allWords[wordListState.currentCard].lithuanian);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [wordListState.currentCard, quizMode, audioEnabled, wordListState.allWords]);

  // Reload conjugations when verb corpus changes
  useEffect(() => {
    const loadConjugationsForCorpus = async () => {
      if (selectedVerbCorpus && !loading) {
        setLoadingConjugations(true);
        try {
          const conjugationData = await fetchConjugations(selectedVerbCorpus);
          setConjugations(conjugationData.conjugations);
          setAvailableVerbs(conjugationData.verbs);
          // Only reset selected verb if it doesn't exist in the new corpus
          if (selectedVerb && !conjugationData.verbs.includes(selectedVerb)) {
            setSelectedVerb(null);
          }
        } catch (error) {
          console.error('Failed to load conjugations for corpus:', selectedVerbCorpus, error);
        } finally {
          setLoadingConjugations(false);
        }
      }
    };
    loadConjugationsForCorpus();
  }, [selectedVerbCorpus, loading]);

  const preloadMultipleChoiceAudio = async () => {
    if (!selectedVoice) return;

    if (selectedVoice === 'random') {
      // When random is selected, preload for all available voices
      for (const voice of availableVoices) {
        await audioManager.preloadMultipleAudio(wordListState.multipleChoiceOptions, voice);
      }
    } else {
      await audioManager.preloadMultipleAudio(wordListState.multipleChoiceOptions, selectedVoice);
    }
  };

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


  const handleWelcomeComplete = (skillLevel) => {
    // Mark that user has seen the intro
    safeStorage.setItem('trakaido-has-seen-intro', 'true');

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

    setSelectedGroups(initialSelectedGroups);
    setShowWelcome(false);
  };

  const resetAllSettings = () => {
    // Clear localStorage items
    safeStorage.removeItem('flashcard-selected-groups');
    safeStorage.removeItem('flashcard-study-mode');
    safeStorage.removeItem('flashcard-quiz-mode');
    safeStorage.removeItem('flashcard-selected-voice');
    safeStorage.removeItem('trakaido-has-seen-intro');

    // Reset state to defaults
    setStudyMode('english-to-lithuanian');
    setQuizMode('flashcard');
    setSelectedVoice('random');
    setShowWelcome(true);

    // For corpus groups, we need to reset to all groups
    const defaultSelectedGroups = {};
    Object.keys(corporaData).forEach(corpus => {
      defaultSelectedGroups[corpus] = Object.keys(corporaData[corpus]?.groups || {});
    });
    setSelectedGroups(defaultSelectedGroups);
  };

  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  const resetCards = () => wordListManager.resetCards();
  const handleMultipleChoiceAnswer = (selectedOption) => wordListManager.handleMultipleChoiceAnswer(selectedOption, studyMode, quizMode, autoAdvance, defaultDelay);

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
  // Don't show this message in conjugations/declensions/journey mode since they don't need word lists or handle them differently
  const showNoGroupsMessage = !currentWord && totalSelectedWords === 0 && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey';

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
        journeyStats={journeyStats}
      />

      {!showNoGroupsMessage && (
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
          selectedVerbCorpus={selectedVerbCorpus}
          setSelectedVerbCorpus={setSelectedVerbCorpus}
          availableVerbCorpuses={availableVerbCorpuses}
          loadingConjugations={loadingConjugations}
          selectedVerb={selectedVerb}
          setSelectedVerb={setSelectedVerb}
          availableVerbs={availableVerbs}
          conjugations={conjugations}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      ) : quizMode === 'declensions' ? (
        <DeclensionsMode 
          selectedNoun={selectedNoun}
          setSelectedNoun={setSelectedNoun}
          availableNouns={availableNouns}
          declensions={declensions}
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
      ) : quizMode === 'flashcard' ? (
        <FlashCardMode 
          currentWord={currentWord}
          showAnswer={wordListState.showAnswer}
          setShowAnswer={(value) => wordListManager.setShowAnswer(value)}
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
        />
      ) : (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div>Loading word...</div>
          </div>
        </div>
      )}

      {/* Navigation controls */}
      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey' && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={prevCard}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={nextCard}>Next →</button>
        </div>
      )}

      {/* Stats with Reset button */}
      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && quizMode !== 'journey' && (
        <StatsDisplay stats={wordListState.stats} onReset={resetCards} />
      )}

      <SettingsModal />
      <StudyMaterialsModal
        isOpen={showStudyMaterialsModal}
        onClose={() => setShowStudyMaterialsModal(false)}
        totalSelectedWords={totalSelectedWords}
        availableCorpora={availableCorpora}
        corporaData={corporaData}
        selectedGroups={selectedGroups}
        setSelectedGroups={setSelectedGroups}
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