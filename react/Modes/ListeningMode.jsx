
import React from 'react';
import ListeningActivity from '../Activities/ListeningActivity';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer
}) => {
  return (
    <ListeningActivity
      wordListManager={wordListManager}
      wordListState={wordListState}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
    />
  );
};

export default ListeningMode;
