import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings';  // This is the correct syntax for now; it is awkward and possibly should be updated.
import { useFullscreen } from './useFullscreen';
import AudioButton from './AudioButton';
import DeclensionTable from './DeclensionTable';
import ConjugationTable from './ConjugationTable';
import VocabularyList from './VocabularyList';
import TypingMode from './TypingMode';
import StatsDisplay from './StatsDisplay';
import FlashCardMode from './FlashCardMode';
import ListeningMode from './ListeningMode';
import MultipleChoiceMode from './MultipleChoiceMode';
import StudyMaterialsSelector from './StudyMaterialsSelector';
import StudyModeSelector from './StudyModeSelector';
import ConjugationsMode from './ConjugationsMode';
import DeclensionsMode from './DeclensionsMode';
import WordListManager from './WordListManager';

// Use the namespaced lithuanianApi from window
// These are provided by the script tag in widget.html: <script src="/js/lithuanianApi.js"></script>
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

// Helper function to safely access localStorage
const safeStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }
};

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
  const [showCorpora, setShowCorpora] = useState(false);
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
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [loadingDeclensions, setLoadingDeclensions] = useState(false);
  const [selectedVocabGroup, setSelectedVocabGroup] = useState(null);
  const [vocabGroupOptions, setVocabGroupOptions] = useState([]);
  const [vocabListWords, setVocabListWords] = useState([]);

  // Use global settings for audio and auto-advance
  const audioEnabled = settings.audioEnabled;
  const autoAdvance = settings.autoAdvance;
  const defaultDelay = settings.defaultDelay;

  // Setup WordListManager callback
  useEffect(() => {
    wordListManager.setStateChangeCallback(setWordListState);
    wordListManager.settings = settings; // Update settings reference
  }, [wordListManager, settings]);
  
  

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
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
        if (voices.length > 0) {
          setSelectedVoice(voices[0]);
        }
        const corporaStructures = {};
        // Only set default groups if we don't have any saved in localStorage
        const useDefaults = Object.keys(selectedGroups).length === 0;
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
  }, []);

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
          // Reset selected verb when corpus changes
          setSelectedVerb(null);
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
    await audioManager.preloadMultipleAudio(wordListState.multipleChoiceOptions, selectedVoice);
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

  

  const resetAllSettings = () => {
    // Clear localStorage items
    safeStorage.removeItem('flashcard-selected-groups');
    safeStorage.removeItem('flashcard-study-mode');
    safeStorage.removeItem('flashcard-quiz-mode');

    // Reset state to defaults
    setStudyMode('english-to-lithuanian');
    setQuizMode('flashcard');

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
  const markCorrect = () => wordListManager.markCorrect(autoAdvance, defaultDelay);
  const markIncorrect = () => wordListManager.markIncorrect(autoAdvance, defaultDelay);
  const handleMultipleChoiceAnswer = (selectedOption) => wordListManager.handleMultipleChoiceAnswer(selectedOption, studyMode, quizMode, autoAdvance, defaultDelay);

  const playAudio = async (word, onlyCached = false) => {
    audioManager.playAudio(word, selectedVoice, audioEnabled, onlyCached);
  };

  const handleHoverStart = (word) => {
    if (!audioEnabled || !selectedVoice) return;
    const timeout = setTimeout(() => {
      playAudio(word, onlyCached =true); // Only play if cached
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

  // Count total selected words
  const totalSelectedWords = wordListManager.getTotalWords();


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
  // Don't show this message in conjugations mode since it doesn't need word lists
  const showNoGroupsMessage = !currentWord && totalSelectedWords === 0 && quizMode !== 'conjugations';

  return (
    <div ref={containerRef} className={`w-container ${isFullscreen ? 'w-fullscreen' : ''}`}>
      <style>{`
        .answer-text {
          font-size: 1.5rem;
          color: var(--color-text-secondary);
          margin-top: var(--spacing-base);
          display: flex;
          align-items: center;
          gap: var(--spacing-small);
          justify-content: center;
        }
        .choice-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-small);
          justify-content: center;
        }
        .corpus-section {
          margin-bottom: var(--spacing-base);
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius);
          padding: var(--spacing-base);
        }
        .corpus-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-small);
          cursor: pointer;
          font-weight: bold;
          color: var(--color-primary);
        }
        .group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-small);
          margin-top: var(--spacing-small);
        }
        .group-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-small);
          padding: var(--spacing-small);
          background: var(--color-annotation-bg);
          border-radius: var(--border-radius);
        }
        .corpus-toggle {
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--border-radius);
          padding: var(--spacing-small) var(--spacing-base);
          cursor: pointer;
          color: var(--color-text);
          font-size: 0.8rem;
        }
        .corpus-toggle:hover {
          background: var(--color-annotation-bg);
        }
      `}</style>

      <button className="w-fullscreen-toggle" onClick={toggleFullscreen}>
        {isFullscreen ? '🗗' : '⛶'}
      </button>

      {!isFullscreen && <h1>🇱🇹 Lithuanian Vocabulary Flash Cards</h1>}

      {!isFullscreen && (
        <StudyMaterialsSelector 
          showCorpora={showCorpora}
          setShowCorpora={setShowCorpora}
          totalSelectedWords={totalSelectedWords}
          availableCorpora={availableCorpora}
          corporaData={corporaData}
          selectedGroups={selectedGroups}
          setSelectedGroups={setSelectedGroups}
          safeStorage={safeStorage}
        />
      )}

      <StudyModeSelector
        quizMode={quizMode}
        setQuizMode={setQuizMode}
        grammarMode={grammarMode}
        setGrammarMode={setGrammarMode}
        studyMode={studyMode}
        setStudyMode={setStudyMode}
        safeStorage={safeStorage}
        resetAllSettings={resetAllSettings}
        SettingsToggle={SettingsToggle}
        audioEnabled={audioEnabled}
        availableVoices={availableVoices}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        isFullscreen={isFullscreen}
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
      ) : (
        <div className="w-card">
          <div style={{ textAlign: 'center', padding: 'var(--spacing-large)' }}>
            <div>Loading word...</div>
          </div>
        </div>
      )}

      {/* Navigation controls */}
      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && (
        <div className="w-nav-controls">
          <button className="w-button" onClick={prevCard}>← Previous</button>
          <div className="w-nav-center"></div>
          <button className="w-button" onClick={nextCard}>Next →</button>
        </div>
      )}

      {/* Stats with Reset button */}
      {!showNoGroupsMessage && quizMode !== 'conjugations' && quizMode !== 'declensions' && (
        <StatsDisplay stats={wordListState.stats} onReset={resetCards} />
      )}

      <SettingsModal />
    </div>
  );
};

export default FlashCardApp;