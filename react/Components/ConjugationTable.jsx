
import React from 'react';
import AudioButton from './AudioButton';

const ConjugationTable = ({ verb, conjugations, audioEnabled, playAudio, handleHoverStart, handleHoverEnd }) => {
  const conjugationList = conjugations[verb];
  if (!conjugationList) return null;

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

  return (
    <div style={{ marginTop: 'var(--spacing-base)' }}>
      <h4>Conjugation Table for "{verb}"</h4>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid var(--color-border)',
        marginTop: 'var(--spacing-small)'
      }}>
        <thead>
          <tr style={{ background: 'var(--color-annotation-bg)' }}>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Person</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>English</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Lithuanian</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Audio</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(conjugationGrid).map(([pronoun, conj]) => {
            if (!conj) return null;
            return (
              <tr key={pronoun}>
                <td style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)', fontWeight: 'bold' }}>
                  {pronoun}
                </td>
                <td style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>
                  {conj.english}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-small)', 
                  border: '1px solid var(--color-border)',
                  cursor: audioEnabled ? 'pointer' : 'default'
                }}
                onMouseEnter={() => audioEnabled && handleHoverStart(conj.lithuanian)}
                onMouseLeave={handleHoverEnd}
                >
                  {conj.lithuanian}
                </td>
                <td style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <AudioButton 
                    word={conj.lithuanian}
                    size="small"
                    audioEnabled={audioEnabled}
                    playAudio={playAudio}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ConjugationTable;
