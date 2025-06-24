
import React from 'react';
import DataTable from '../Components/shared/DataTable';
import { createHoverHandlers } from '../Utilities/hoverHelpers';
import audioManager from '../Managers/audioManager';

const ConjugationTable = ({ verb, conjugations, audioEnabled }) => {
  const conjugationList = conjugations[verb];
  if (!conjugationList) return null;

  // Use the global audio manager instance (already imported as singleton)

  // Create hover handlers
  const { handleHoverStart, handleHoverEnd } = createHoverHandlers(audioEnabled);

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
      accessor: 'lithuanian',
      hoverable: true,
      hoverValue: 'lithuanian'
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
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          maxHeight="none"
          stickyHeader={false}
        />
      </div>
    </div>
  );
};

export default ConjugationTable;
