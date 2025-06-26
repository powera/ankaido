import React from 'react';
import VocabularyListActivity from '../Activities/VocabularyListActivity';

const VocabularyListMode = ({ 
  selectedVocabGroup,
  setSelectedVocabGroup,
  vocabGroupOptions,
  vocabListWords,
  setVocabListWords,
  corporaData,
  audioEnabled,
  playAudio
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
      playAudio={playAudio}
    />
  );
};

export default VocabularyListMode;