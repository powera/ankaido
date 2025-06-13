
import React from 'react';
import AudioButton from './AudioButton';

const DeclensionTable = ({ noun, declensions, audioEnabled, playAudio, handleHoverStart, handleHoverEnd }) => {
  const nounData = declensions[noun];
  if (!nounData) return null;

  const cases = ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'locative', 'vocative'];

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
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid var(--color-border)',
        marginTop: 'var(--spacing-small)'
      }}>
        <thead>
          <tr style={{ background: 'var(--color-annotation-bg)' }}>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Case</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Question</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Form</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Example</th>
            <th style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)' }}>Audio</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(caseName => {
            const caseData = nounData.cases[caseName];
            if (!caseData) return null;
            return (
              <tr key={caseName}>
                <td style={{ 
                  padding: 'var(--spacing-small)', 
                  border: '1px solid var(--color-border)', 
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}>
                  {caseName}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-small)', 
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  fontStyle: 'italic'
                }}>
                  {caseData.question}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-small)', 
                  border: '1px solid var(--color-border)',
                  fontWeight: 'bold',
                  cursor: audioEnabled ? 'pointer' : 'default'
                }}
                onMouseEnter={() => audioEnabled && handleHoverStart(caseData.form)}
                onMouseLeave={handleHoverEnd}
                >
                  {caseData.form}
                </td>
                <td style={{ 
                  padding: 'var(--spacing-small)', 
                  border: '1px solid var(--color-border)',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>LT:</strong> {caseData.sentence_lithuanian}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    <strong>EN:</strong> {caseData.sentence_english}
                  </div>
                </td>
                <td style={{ padding: 'var(--spacing-small)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <AudioButton 
                    word={caseData.form}
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

export default DeclensionTable;
