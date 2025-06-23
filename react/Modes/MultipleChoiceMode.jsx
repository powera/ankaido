import React from 'react';
import MultipleChoiceActivity from '../Activities/MultipleChoiceActivity';
import { generateMultipleChoiceOptions } from '../Utilities/multipleChoiceGenerator';
import StatsDisplay from '../Components/StatsDisplay';

const MultipleChoiceMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleHoverStart,
  handleHoverEnd,
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
        'multiple-choice',
        wordListState,
        settings
      );
      setMultipleChoiceOptions(options);
    }
  }, [currentWord, studyMode, wordListState, settings?.difficulty]);

  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  const handleAdvanceWithStats = (selectedOption) => {
    // Determine correct answer based on mode
    const correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    const isCorrect = selectedOption === correctAnswer;

    // Update session stats in WordListManager
    if (isCorrect) {
      wordListManager.updateSessionStatsCorrect();
    } else {
      wordListManager.updateSessionStatsIncorrect();
    }

    // Call the original handler if provided
    if (onAdvanceToNext) {
      onAdvanceToNext(selectedOption);
    }
  };

  if (!currentWord || !multipleChoiceOptions.length) return null;

  return (
    <>
      <MultipleChoiceActivity
        currentWord={currentWord}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        onAdvanceToNext={handleAdvanceWithStats}
        settings={settings}
        autoAdvance={autoAdvance}
        defaultDelay={defaultDelay}
      />
      <StatsDisplay stats={wordListState.stats} onReset={handleReset} />
      
      {/* Navigation controls */}
      <div className="w-nav-controls">
        <button className="w-button" onClick={prevCard}>← Previous</button>
        <div className="w-nav-center"></div>
        <button className="w-button" onClick={nextCard}>Next →</button>
      </div>
    </>
  );
};

export default MultipleChoiceMode;