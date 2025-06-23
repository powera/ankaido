
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

  const nextCard = () => wordListManager.nextCard();
  const prevCard = () => wordListManager.prevCard();
  
  const handleReset = () => {
    wordListManager.resetSessionStats();
  };

  const handleAdvanceWithStats = (selectedOption) => {
    // Determine correct answer based on listening mode
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
    }
    
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
      <ListeningActivity
        currentWord={currentWord}
        multipleChoiceOptions={multipleChoiceOptions}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
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

export default ListeningMode;
