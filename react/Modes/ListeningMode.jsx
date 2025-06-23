
import React from 'react';
import ListeningActivity from '../Activities/ListeningActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import StatsDisplay from '../Components/StatsDisplay';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  onAdvanceToNext,
  settings,
  autoAdvance,
  defaultDelay
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

  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <>
      <ListeningActivity
        currentWord={currentWord}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        onAdvanceToNext={onAdvanceToNext}
        settings={settings}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
      />
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
    </>
  );
};

export default ListeningMode;
