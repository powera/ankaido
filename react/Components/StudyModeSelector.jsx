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
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  isFullscreen,
  toggleFullscreen,
  totalSelectedWords,
  onOpenStudyMaterials
}) => {
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
          <option value="grammar">Grammar</option>
        </select>
      </div>

      <div className="w-dropdown-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        margin: '0 0.5rem'
      }}>
        <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
          {(quizMode === 'conjugations' || quizMode === 'declensions') ? (
            <>
              <span className="w-hide-mobile">Grammar Type:</span>
              <span className="w-show-mobile">Grammar:</span>
            </>
          ) : (
            <>
              <span className="w-hide-mobile">Direction:</span>
              <span className="w-show-mobile" style={{ display: 'none' }}>Direction:</span>
            </>
          )}
        </label>
        {(quizMode === 'conjugations' || quizMode === 'declensions') ? (
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
        ) : (
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
        )}
      </div>

      <div className="w-button-group-mobile">
        <button
          className="w-mode-option w-compact-button"
          onClick={onOpenStudyMaterials}
          title="Select study materials and vocabulary groups"
        >
          <span className="w-hide-mobile">📚 Study Materials</span>
          <span className="w-show-mobile">📚 Materials</span>
        </button>
        <SettingsToggle className="w-mode-option w-compact-button" title="Settings">
          <span className="w-hide-mobile">Settings</span>
        </SettingsToggle>
        <button className="w-hide-mobile w-mode-option w-compact-button" onClick={toggleFullscreen}>
          {isFullscreen ? '🗗 Close Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>
      {audioEnabled && availableVoices.length > 0 && (
        <select 
          value={selectedVoice || ''} 
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-mode-option"
        >
          <option value="random">🎲 Random Voice</option>
          {availableVoices.map(voice => (
            <option key={voice} value={voice}>
              🎤 {voice}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default StudyModeSelector;