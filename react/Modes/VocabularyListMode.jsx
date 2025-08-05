import VocabularyListActivity from '../Activities/VocabularyListActivity';

const VocabularyListMode = ({ 
  selectedVocabGroup,
  setSelectedVocabGroup,
  vocabGroupOptions,
  vocabListWords,
  setVocabListWords,
  corporaData,
  audioEnabled,
  audioManager
}) => {
  return (
    <VocabularyListActivity
      selectedVocabGroup={selectedVocabGroup}
      setSelectedVocabGroup={setSelectedVocabGroup}
      vocabGroupOptions={vocabGroupOptions}
      vocabListWords={vocabListWords}
      setVocabListWords={setVocabListWords}
      corporaData={corporaData}
      audioEnabled={audioEnabled}
      audioManager={audioManager}
    />
  );
};

export default VocabularyListMode;