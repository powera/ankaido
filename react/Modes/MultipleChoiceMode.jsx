import React from 'react';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
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
        'multiple-choice',
        wordListState,
        settings
      );
      setMultipleChoiceOptions(options);
    }
  }, [currentWord, studyMode, wordListState, settings?.difficulty]);

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <MultipleChoiceActivity
      currentWord={currentWord}
      multipleChoiceOptions={multipleChoiceOptions}
      studyMode={studyMode}
      audioEnabled={audioEnabled}
      playAudio={playAudio}
      handleHoverStart={handleHoverStart}
      handleHoverEnd={handleHoverEnd}
      handleMultipleChoiceAnswer={handleMultipleChoiceAnswer}
      settings={settings}
    />
  );
};

export default MultipleChoiceMode;