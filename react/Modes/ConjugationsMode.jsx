import { useEffect, useState } from 'react';
import ConjugationTable from '../Activities/ConjugationTable';
import { fetchConjugations, fetchVerbCorpuses } from '../Utilities/apiClient.js';

const ConjugationsMode = ({
  audioEnabled
}) => {
  // Internal state for conjugations mode
  const [availableVerbCorpuses, setAvailableVerbCorpuses] = useState([]);
  const [selectedVerbCorpus, setSelectedVerbCorpus] = useState('verbs_present');
  const [loadingConjugations, setLoadingConjugations] = useState(false);
  const [selectedVerb, setSelectedVerb] = useState(null);
  const [availableVerbs, setAvailableVerbs] = useState([]);
  const [conjugations, setConjugations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grammarMode, setGrammarMode] = useState('full');

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [verbCorpuses, conjugationData] = await Promise.all([
          fetchVerbCorpuses(),
          fetchConjugations('verbs_present') // Load default corpus
        ]);
        setAvailableVerbCorpuses(verbCorpuses);
        setConjugations(conjugationData.conjugations);
        setAvailableVerbs(conjugationData.verbs);
      } catch (err) {
        console.error('Failed to load conjugations data:', err);
        setError('Failed to load conjugations data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

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
  }, [selectedVerbCorpus, loading, selectedVerb]);

  if (loading) {
    return (
      <div className="w-card">
        <h3>Lithuanian Verb Conjugations</h3>
        <div>Loading conjugations data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-card">
        <h3>Lithuanian Verb Conjugations</h3>
        <div style={{ color: 'var(--color-error)' }}>{error}</div>
      </div>
    );
  }
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

      {/* Grammar mode selector */}
      <div style={{ marginBottom: 'var(--spacing-base)' }}>
        <label htmlFor="grammar-mode-select" style={{ marginRight: 'var(--spacing-small)' }}>
          Table format:
        </label>
        <select 
          id="grammar-mode-select"
          value={grammarMode} 
          onChange={(e) => setGrammarMode(e.target.value)}
          className="w-mode-option"
          style={{ minWidth: '150px' }}
        >
          <option value="full">Full Table</option>
          <option value="compact">Compact Table</option>
        </select>
      </div>

      {selectedVerb && (
        <ConjugationTable 
          verb={selectedVerb}
          conjugations={conjugations}
          audioEnabled={audioEnabled}
          compact={grammarMode === 'compact'}
        />
      )}
    </div>
  );
};

export default ConjugationsMode;