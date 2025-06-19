
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import AudioButton from '../Components/AudioButton';
import journeyStatsManager from '../journeyStatsManager';

const ListeningMode = ({ 
  wordListManager,
  wordListState,
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer
}) => {
  const currentWord = wordListManager.getCurrentWord();
  if (!currentWord) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Enhanced listening handler that updates Journey stats
  const handleListeningWithStats = React.useCallback(async (selectedOption) => {
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

  return (
    <div>
      <div className="w-card">
        <div className="w-badge">{currentWord.corpus} → {currentWord.group}</div>
        <div className="w-question w-text-center">
          <div className="w-mb-large">
            🎧 Listen and choose the correct answer:
          </div>
          <div style={{ marginBottom: 'var(--spacing-base)' }}>
            <AudioButton 
              word={currentWord.lithuanian}
              size="large"
              audioEnabled={audioEnabled}
              playAudio={playAudio}
            />
            <span style={{ marginLeft: '0.5rem', fontSize: '1.2rem' }}>Play Audio</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            {studyMode === 'lithuanian-to-english' 
              ? 'Choose the English translation:'
              : studyMode === 'lithuanian-to-lithuanian'
                ? 'Choose the matching Lithuanian word:'
                : 'Choose the matching Lithuanian word:'}
          </div>
        </div>
      </div>
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
