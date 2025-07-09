
import React from 'react';
import DataTable from '../Components/shared/DataTable';
import audioManager from '../Managers/audioManager';

const DeclensionTable = ({ noun, declensions, audioEnabled }) => {
  const nounData = declensions[noun];
  if (!nounData) return null;

  // Use the global audio manager instance (already imported as singleton)

  const cases = ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'locative', 'vocative'];

  // Convert to data array
  const tableData = cases
    .filter(caseName => nounData.cases[caseName])
    .map(caseName => {
      const caseData = nounData.cases[caseName];
      return {
        caseName,
        question: caseData.question,
        form: caseData.form,
        example: (
          <div>
            <div style={{ marginBottom: '2px' }}>
              <strong>LT:</strong> {caseData.sentence_lithuanian}
            </div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              <strong>EN:</strong> {caseData.sentence_english}
            </div>
          </div>
        )
      };
    });

  const columns = [
    {
      header: 'Case',
      accessor: 'caseName',
      bold: true,
      textTransform: 'capitalize'
    },
    {
      header: 'Question',
      accessor: 'question',
      fontSize: '0.85rem',
      italic: true
    },
    {
      header: 'Form',
      accessor: 'form',
      bold: true
    },
    {
      header: 'Example',
      accessor: 'example',
      fontSize: '0.9rem'
    },
    {
      header: 'Audio',
      type: 'audio',
      audioWord: 'form',
      audioSize: 'small',
      align: 'center'
    }
  ];

  return (
    <div style={{ marginTop: 'var(--spacing-base)' }}>
      <h4>Declension Table for "{noun}" ({nounData.english})</h4>
      <div style={{ 
        fontSize: '0.9rem', 
        color: 'var(--color-text-muted)', 
        marginBottom: 'var(--spacing-small)' 
      }}>
        Gender: {nounData.gender} | Type: {nounData.declension_type}
      </div>
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

export default DeclensionTable;
