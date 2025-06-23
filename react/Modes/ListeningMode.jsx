
import React from 'react';
import ListeningActivity from '../Activities/ListeningActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer,
  settings
}) => {
  const [multipleChoiceOptions, setMultipleChoiceOptions] = React.useState([]);
  const currentWord = wordListManager?.getCurrentWord();

  // Generate options when word changes
  React.useEffect(() => {
    if (currentWord) {
      const options = generateMultipleChoiceOptions(
        currentWord,
        studyMode,
        'listening',
        wordListState,
        settings
      );
      setMultipleChoiceOptions(options);
    }
  }, [currentWord, studyMode, wordListState, settings?.difficulty]);

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <ListeningActivity
      currentWord={currentWord}
      multipleChoiceOptions={multipleChoiceOptions}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
      settings={settings}
    />
  );
};

export default ListeningMode;
