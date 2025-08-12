import VocabularyListActivity from '../Activities/VocabularyListActivity';

const VocabularyListMode = ({ 
  selectedVocabGroup,
  setSelectedVocabGroup,
  vocabGroupOptions,
  vocabListWords,
  setVocabListWords,
  corporaData,
  audioEnabled,
  audioManager,
  activityStatsManager
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
      activityStatsManager={activityStatsManager}
    />
  );
};

export default VocabularyListMode;