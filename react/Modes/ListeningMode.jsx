
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);
  const currentWord = wordListManager.getCurrentWord();
  if (!currentWord) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [currentWord]);

  // Enhanced listening handler that updates Journey stats
  const handleListeningWithStats = React.useCallback(async (selectedOption) => {
    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);
    
    // Determine correct answer based on study mode for listening
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = currentWord.lithuanian;
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? currentWord.english : currentWord.lithuanian;
    }

    const isCorrect = selectedOption === correctAnswer;

    // Determine stats mode based on difficulty
    // listeningEasy: listen to LT, choose LT word (lithuanian-to-lithuanian)
    // listeningHard: listen to LT, choose EN word (lithuanian-to-english)
    const statsMode = studyMode === 'lithuanian-to-lithuanian' ? 'listeningEasy' : 'listeningHard';

    // Update Journey stats with appropriate mode
    try {
      await journeyStatsManager.updateWordStats(currentWord, statsMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in ListeningMode:', error);
    }

    // Call the original handler for UI updates and flow control
    handleMultipleChoiceAnswer(selectedOption);
  }, [currentWord, studyMode, handleMultipleChoiceAnswer]);

  const instructionText = studyMode === 'lithuanian-to-english' 
    ? 'Choose the English translation:'
    : studyMode === 'lithuanian-to-lithuanian'
      ? 'Choose the matching Lithuanian word:'
      : 'Choose the matching Lithuanian word:';

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode="listening"
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText="🎧 Listen and choose the correct answer:"
        showAudioButton={true}
        promptText={instructionText}
        isClickable={false}
      />
      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={wordListState}
        studyMode={studyMode}
        quizMode="listening"
        handleMultipleChoiceAnswer={handleListeningWithStats}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
      />
    </div>
  );
};

export default ListeningMode;
