
import React from 'react';
import AudioButton from '../Components/AudioButton';
import DataTable, { TableColumn, TableRowData } from '../Components/shared/DataTable';
import audioManager from '../Managers/audioManager';

// Interface for individual conjugation entry
export interface ConjugationEntry {
  english: string;
  lithuanian: string;
}

// Interface for conjugations data structure
export interface ConjugationsData {
  [verb: string]: ConjugationEntry[];
}

// Props interface for ConjugationTable component
export interface ConjugationTableProps {
  verb: string;
  conjugations: ConjugationsData;
  audioEnabled: boolean;
  compact?: boolean;
  hideHeader?: boolean;
}

const ConjugationTable: React.FC<ConjugationTableProps> = ({ 
  verb, 
  conjugations, 
  audioEnabled, 
  compact = false, 
  hideHeader = false 
}) => {
  const conjugationList = conjugations[verb];
  if (!conjugationList) return null;



  if (compact) {
    return <CompactConjugationTable verb={verb} conjugationList={conjugationList} audioEnabled={audioEnabled} hideHeader={hideHeader} />;
  }

  // Create a 3x3 grid for conjugations
  const conjugationGrid: Record<string, ConjugationEntry | null> = {
    'I': null, 'you(s.)': null, 'he': null,
    'she': null, 'it': null, 'we': null,
    'you(pl.)': null, 'they(m.)': null, 'they(f.)': null
  };

  conjugationList.forEach((conj: ConjugationEntry) => {
    const pronoun = conj.english.split(' ')[0];
    conjugationGrid[pronoun] = conj;
  });

  // Convert to data array, filtering out null entries
  const tableData: TableRowData[] = Object.entries(conjugationGrid)
    .filter(([_, conj]) => conj !== null)
    .map(([pronoun, conj]) => ({
      pronoun,
      english: (conj as ConjugationEntry).english,
      lithuanian: (conj as ConjugationEntry).lithuanian
    }));

  const columns: TableColumn[] = [
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
      header: 'Source Language',
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
          audioManager={audioManager}
          maxHeight="none"
          stickyHeader={false}
        />
      </div>
    </div>
  );
};

// Props interface for CompactConjugationTable component
interface CompactConjugationTableProps {
  verb: string;
  conjugationList: ConjugationEntry[];
  audioEnabled: boolean;
  hideHeader?: boolean;
}

const CompactConjugationTable: React.FC<CompactConjugationTableProps> = ({ 
  verb, 
  conjugationList, 
  audioEnabled, 
  hideHeader = false 
}) => {


  // Create a mapping from the conjugation keys to the data
  const conjugationMap: Record<string, ConjugationEntry> = {};
  conjugationList.forEach((conj: ConjugationEntry) => {
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

  const cellStyle: React.CSSProperties = {
    border: '1px solid var(--color-border)',
    padding: 'var(--spacing-small)',
    textAlign: 'center',
    verticalAlign: 'middle',
    minWidth: '120px'
  };

  const headerStyle: React.CSSProperties = {
    ...cellStyle,
    background: 'var(--color-annotation-bg)',
    fontWeight: 'bold'
  };

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    margin: '0 auto',
    border: '1px solid var(--color-border)'
  };

  const renderCell = (singularKey: string, pluralKey: string): React.ReactNode => {
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
                    audioManager={audioManager}
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
                    audioManager={audioManager}
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
