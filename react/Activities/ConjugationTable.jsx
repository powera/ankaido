
import AudioButton from '../Components/AudioButton';
import DataTable from '../Components/shared/DataTable';
import audioManager from '../Managers/audioManager';

const ConjugationTable = ({ verb, conjugations, audioEnabled, compact = false, hideHeader = false }) => {
  const conjugationList = conjugations[verb];
  if (!conjugationList) return null;

  // Use the global audio manager instance (already imported as singleton)

  if (compact) {
    return <CompactConjugationTable verb={verb} conjugationList={conjugationList} audioEnabled={audioEnabled} hideHeader={hideHeader} />;
  }

  // Create a 3x3 grid for conjugations
  const conjugationGrid = {
    'I': null, 'you(s.)': null, 'he': null,
    'she': null, 'it': null, 'we': null,
    'you(pl.)': null, 'they(m.)': null, 'they(f.)': null
  };

  conjugationList.forEach(conj => {
    const pronoun = conj.english.split(' ')[0];
    conjugationGrid[pronoun] = conj;
  });

  // Convert to data array, filtering out null entries
  const tableData = Object.entries(conjugationGrid)
    .filter(([_, conj]) => conj !== null)
    .map(([pronoun, conj]) => ({
      pronoun,
      english: conj.english,
      lithuanian: conj.lithuanian
    }));

  const columns = [
    {
      header: 'Person',
      accessor: 'pronoun',
      bold: true
    },
    {
      header: 'English',
      accessor: 'english'
    },
    {
      header: 'Lithuanian',
      accessor: 'lithuanian'
    },
    {
      header: 'Audio',
      type: 'audio',
      audioWord: 'lithuanian',
      audioSize: 'small',
      align: 'center'
    }
  ];

  return (
    <div style={{ marginTop: 'var(--spacing-base)' }}>
      <h4>Conjugation Table for "{verb}"</h4>
      <div style={{ marginTop: 'var(--spacing-small)' }}>
        <DataTable
          columns={columns}
          data={tableData}
          audioEnabled={audioEnabled}
          playAudio={audioManager.playAudio.bind(audioManager)}
          maxHeight="none"
          stickyHeader={false}
        />
      </div>
    </div>
  );
};

const CompactConjugationTable = ({ verb, conjugationList, audioEnabled, hideHeader = false }) => {
  // Create a mapping from the conjugation keys to the data
  const conjugationMap = {};
  conjugationList.forEach(conj => {
    // Extract the pronoun from the english text, similar to non-compact version
    const pronoun = conj.english.split(' ')[0];
    if (pronoun === 'I') conjugationMap['1s'] = conj;
    else if (pronoun === 'you(s.)') conjugationMap['2s'] = conj;
    else if (pronoun === 'he') conjugationMap['3s-m'] = conj;
    else if (pronoun === 'she') conjugationMap['3s-f'] = conj;
    else if (pronoun === 'it') conjugationMap['3s-n'] = conj;
    else if (pronoun === 'we') conjugationMap['1p'] = conj;
    else if (pronoun === 'you(pl.)') conjugationMap['2p'] = conj;
    else if (pronoun === 'they(m.)') conjugationMap['3p-m'] = conj;
    else if (pronoun === 'they(f.)') conjugationMap['3p-f'] = conj;
  });

  const cellStyle = {
    border: '1px solid var(--color-border)',
    padding: 'var(--spacing-small)',
    textAlign: 'center',
    verticalAlign: 'middle',
    minWidth: '120px'
  };

  const headerStyle = {
    ...cellStyle,
    background: 'var(--color-annotation-bg)',
    fontWeight: 'bold'
  };

  const tableStyle = {
    borderCollapse: 'collapse',
    margin: '0 auto',
    border: '1px solid var(--color-border)'
  };

  const renderCell = (singularKey, pluralKey) => {
    const singular = conjugationMap[singularKey];
    const plural = conjugationMap[pluralKey];
    
    if (!singular && !plural) return null;

    return (
      <tr key={`${singularKey}-${pluralKey}`}>
        {/* Singular column */}
        <td style={cellStyle}>
          {singular && (
            <div>
              <div style={{ fontSize: '0.9em', marginBottom: '2px' }}>
                {singular.english}
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {singular.lithuanian}
              </div>
              {audioEnabled && (
                <div style={{ marginTop: '4px' }}>
                  <AudioButton 
                    word={singular.lithuanian}
                    size="small"
                    audioEnabled={audioEnabled}
                    playAudio={audioManager.playAudio.bind(audioManager)}
                  />
                </div>
              )}
            </div>
          )}
        </td>
        
        {/* Plural column */}
        <td style={cellStyle}>
          {plural && (
            <div>
              <div style={{ fontSize: '0.9em', marginBottom: '2px' }}>
                {plural.english}
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {plural.lithuanian}
              </div>
              {audioEnabled && (
                <div style={{ marginTop: '4px' }}>
                  <AudioButton 
                    word={plural.lithuanian}
                    size="small"
                    audioEnabled={audioEnabled}
                    playAudio={audioManager.playAudio.bind(audioManager)}
                  />
                </div>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ marginTop: 'var(--spacing-base)' }}>
      {!hideHeader && <h4>Compact Conjugation Table for "{verb}"</h4>}
      <div style={{ marginTop: 'var(--spacing-small)', display: 'flex', justifyContent: 'center' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerStyle}>Singular</th>
              <th style={headerStyle}>Plural</th>
            </tr>
          </thead>
          <tbody>
            {renderCell('1s', '1p')}
            {renderCell('2s', '2p')}
            {renderCell('3s-m', '3p-m')}
            {renderCell('3s-f', '3p-f')}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConjugationTable;
