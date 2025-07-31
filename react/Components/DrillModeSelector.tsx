import React from 'react';

// Type definitions
interface DrillConfig {
  corpus: string;
  group: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CorporaGroup {
  [key: string]: any; // You can make this more specific based on your group data structure
}

interface CorporaData {
  [corpusName: string]: {
    groups?: CorporaGroup;
    [key: string]: any; // Additional corpus properties
  };
}

interface DifficultyOption {
  value: 'easy' | 'medium' | 'hard';
  label: string;
  description: string;
}

interface DrillModeSelectorProps {
  availableCorpora: string[];
  corporaData: CorporaData;
  onStartDrill: (config: DrillConfig) => void;
  onCancel: () => void;
}

const DrillModeSelector: React.FC<DrillModeSelectorProps> = ({
  availableCorpora,
  corporaData,
  onStartDrill,
  onCancel
}) => {
  const [selectedCorpus, setSelectedCorpus] = React.useState<string>('');
  const [selectedGroup, setSelectedGroup] = React.useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'easy' | 'medium' | 'hard'>('easy');

  // Get available groups for selected corpus
  const availableGroups = React.useMemo((): string[] => {
    if (!selectedCorpus || !corporaData[selectedCorpus]) {
      return [];
    }
    return Object.keys(corporaData[selectedCorpus].groups || {});
  }, [selectedCorpus, corporaData]);

  // Reset group when corpus changes
  React.useEffect(() => {
    setSelectedGroup('');
  }, [selectedCorpus]);

  const handleStartDrill = (): void => {
    if (selectedCorpus && selectedGroup && selectedDifficulty) {
      onStartDrill({
        corpus: selectedCorpus,
        group: selectedGroup,
        difficulty: selectedDifficulty
      });
    }
  };

  const isStartEnabled: boolean = Boolean(selectedCorpus && selectedGroup && selectedDifficulty);

  const difficultyOptions: DifficultyOption[] = [
    { value: 'easy', label: '🟢 Easy', description: 'Multiple choice & easy listening' },
    { value: 'medium', label: '🟡 Medium', description: 'Mixed activities with some typing' },
    { value: 'hard', label: '🔴 Hard', description: 'Mostly typing with advanced listening' }
  ];

  return (
    <div className="w-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
          🎯 Drill Mode Setup
        </h2>
        <p style={{ margin: '0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Choose a specific vocabulary group and difficulty level to practice
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Corpus Selection */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: 'var(--color-text)'
          }}>
            📚 Vocabulary Source:
          </label>
          <select 
            value={selectedCorpus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCorpus(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card-bg)',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="">Select a vocabulary source...</option>
            {availableCorpora.map((corpus: string) => (
              <option key={corpus} value={corpus}>
                {corpus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Group Selection */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: 'var(--color-text)'
          }}>
            📝 Vocabulary Group:
          </label>
          <select 
            value={selectedGroup}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGroup(e.target.value)}
            disabled={!selectedCorpus}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: selectedCorpus ? 'var(--color-card-bg)' : 'var(--color-background)',
              fontSize: '1rem',
              cursor: selectedCorpus ? 'pointer' : 'not-allowed',
              opacity: selectedCorpus ? 1 : 0.6
            }}
          >
            <option value="">
              {selectedCorpus ? 'Select a vocabulary group...' : 'First select a vocabulary source'}
            </option>
            {availableGroups.map((group: string) => (
              <option key={group} value={group}>
                {group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Selection */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: 'var(--color-text)'
          }}>
            🎚️ Difficulty Level:
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {difficultyOptions.map((difficulty: DifficultyOption) => (
              <label key={difficulty.value} style={{ 
                flex: '1', 
                minWidth: '150px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1rem',
                border: `2px solid ${selectedDifficulty === difficulty.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--border-radius)',
                background: selectedDifficulty === difficulty.value ? 'var(--color-primary-light)' : 'var(--color-card-bg)',
                transition: 'all 0.2s ease'
              }}>
                <input 
                  type="radio"
                  name="difficulty"
                  value={difficulty.value}
                  checked={selectedDifficulty === difficulty.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {difficulty.label}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--color-text-secondary)', 
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}>
                  {difficulty.description}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          marginTop: '1rem'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-card-bg)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLButtonElement).style.background = 'var(--color-background)';
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              (e.target as HTMLButtonElement).style.background = 'var(--color-card-bg)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStartDrill}
            disabled={!isStartEnabled}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: 'var(--border-radius)',
              border: 'none',
              background: isStartEnabled ? 'var(--color-primary)' : 'var(--color-border)',
              color: isStartEnabled ? 'white' : 'var(--color-text-secondary)',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: isStartEnabled ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (isStartEnabled) {
                (e.target as HTMLButtonElement).style.background = 'var(--color-primary-dark)';
              }
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (isStartEnabled) {
                (e.target as HTMLButtonElement).style.background = 'var(--color-primary)';
              }
            }}
          >
            🚀 Start Drill
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrillModeSelector;