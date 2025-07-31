
import DataTable, { TableColumn, TableRowData } from '../Components/shared/DataTable';
import audioManager from '../Managers/audioManager';

interface CaseData {
  question: string;
  form: string;
  sentence_lithuanian: string;
  sentence_english: string;
}

interface NounData {
  english: string;
  gender: string;
  declension_type: string;
  cases: {
    [caseName: string]: CaseData;
  };
}

interface DeclensionTableProps {
  noun: string;
  declensions: {
    [noun: string]: NounData;
  };
  audioEnabled: boolean;
}

interface TableRow extends TableRowData {
  caseName: string;
  question: string;
  form: string;
  example: React.JSX.Element;
}

const DeclensionTable = ({ noun, declensions, audioEnabled }: DeclensionTableProps) => {
  const nounData = declensions[noun];
  if (!nounData) return null;

  const cases: string[] = ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'locative', 'vocative'];

  // Convert to data array
  const tableData: TableRow[] = cases
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

  const columns: TableColumn[] = [
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
      audioSize: 'small' as const,
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
          audioManager={audioManager}
          maxHeight="none"
          stickyHeader={false}
        />
      </div>
    </div>
  );
};

export default DeclensionTable;
