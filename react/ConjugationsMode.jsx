
import React from 'react';
import ConjugationTable from './ConjugationTable';

const ConjugationsMode = ({
  selectedVerbCorpus,
  setSelectedVerbCorpus,
  availableVerbCorpuses,
  loadingConjugations,
  selectedVerb,
  setSelectedVerb,
  availableVerbs,
  conjugations,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd
}) => {
  return (
    <div className="w-card">
      <h3>Lithuanian Verb Conjugations</h3>

      {/* Corpus selector */}
      <div style={{ marginBottom: 'var(--spacing-base)' }}>
        <label htmlFor="corpus-select" style={{ marginRight: 'var(--spacing-small)' }}>
          Verb tense:
        </label>
        <select 
          id="corpus-select"
          value={selectedVerbCorpus} 
          onChange={(e) => setSelectedVerbCorpus(e.target.value)}
          disabled={loadingConjugations}
          className="w-mode-option"
          style={{ minWidth: '150px', marginRight: 'var(--spacing-base)' }}
        >
          {availableVerbCorpuses.map(corpus => (
            <option key={corpus} value={corpus}>
              {corpus === 'verbs_present' ? 'Present Tense' : 
               corpus === 'verbs_past' ? 'Past Tense' : 
               corpus.replace('verbs_', '').replace('_', ' ')}
            </option>
          ))}
        </select>
        {loadingConjugations && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Loading...</span>}
      </div>

      {/* Verb selector */}
      <div style={{ marginBottom: 'var(--spacing-base)' }}>
        <label htmlFor="verb-select" style={{ marginRight: 'var(--spacing-small)' }}>
          Select a verb:
        </label>
        <select 
          id="verb-select"
          value={selectedVerb || ''} 
          onChange={(e) => setSelectedVerb(e.target.value)}
          disabled={loadingConjugations || availableVerbs.length === 0}
          className="w-mode-option"
          style={{ minWidth: '150px' }}
        >
          <option value="">Choose a verb...</option>
          {availableVerbs.map(verb => (
            <option key={verb} value={verb}>
              {verb}
            </option>
          ))}
        </select>
      </div>

      {selectedVerb && (
        <ConjugationTable 
          verb={selectedVerb}
          conjugations={conjugations}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
        />
      )}
    </div>
  );
};

export default ConjugationsMode;
