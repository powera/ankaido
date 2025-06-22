
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const MultipleChoiceActivity = ({ 
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
  const [activityState, setActivityState] = React.useState({
    showAnswer: false,
    selectedAnswer: null,
    multipleChoiceOptions: [],
    autoAdvanceTimer: null
  });

  const currentWord = wordListManager.getCurrentWord();
  
  if (!currentWord) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Generate multiple choice options when word changes
  React.useEffect(() => {
    if (currentWord) {
      generateMultipleChoiceOptions();
    }
  }, [currentWord, studyMode, settings?.difficulty]);

  const generateMultipleChoiceOptions = React.useCallback(() => {
    if (!currentWord) return;

    const correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    const answerField = studyMode === 'english-to-lithuanian' ? 'lithuanian' : 'english';

    // Determine number of options based on difficulty
    const numOptions = settings?.difficulty === 'easy' ? 4 : settings?.difficulty === 'medium' ? 6 : 8;
    const numWrongAnswers = numOptions - 1;

    const sameCorpusWords = wordListState.allWords.filter(word => 
      word.corpus === currentWord.corpus && 
      word[answerField] !== correctAnswer
    );
    const wrongAnswersSet = new Set();
    const wrongAnswers = [];
    
    // Gather wrong answers from same corpus - shuffle first to get random decoys
    const shuffledSameCorpusWords = [...sameCorpusWords].sort(() => Math.random() - 0.5);
    for (const word of shuffledSameCorpusWords) {
      const answer = word[answerField];
      if (answer !== correctAnswer && !wrongAnswersSet.has(answer)) {
        wrongAnswersSet.add(answer);
        wrongAnswers.push(answer);
        if (wrongAnswers.length >= numWrongAnswers) break;
      }
    }
    
    // Pad with any other words if needed
    if (wrongAnswers.length < numWrongAnswers) {
      const fallbackWords = wordListState.allWords
        .map(w => w[answerField])
        .filter(ans => ans !== correctAnswer && !wrongAnswersSet.has(ans))
        .sort(() => Math.random() - 0.5);
      while (wrongAnswers.length < numWrongAnswers && fallbackWords.length > 0) {
        const randIdx = Math.floor(Math.random() * fallbackWords.length);
        const fallback = fallbackWords.splice(randIdx, 1)[0];
        wrongAnswers.push(fallback);
      }
    }

    let options = [correctAnswer, ...wrongAnswers];

    // Sort alphabetically for medium and hard difficulty, otherwise shuffle
    if (settings?.difficulty === 'medium' || settings?.difficulty === 'hard') {
      options = options.sort();
      // Rearrange to fill columns first
      const rearranged = [];
      const half = Math.ceil(options.length / 2);
      for (let i = 0; i < half; i++) {
        rearranged.push(options[i]);
        if (i + half < options.length) {
          rearranged.push(options[i + half]);
        }
      }
      options = rearranged;
    } else {
      options = options.sort(() => Math.random() - 0.5);
    }

    setActivityState(prev => ({ ...prev, multipleChoiceOptions: options }));
  }, [currentWord, studyMode, settings?.difficulty, wordListState.allWords]);

  // Enhanced multiple choice handler that updates Journey stats and manages state
  const handleMultipleChoiceWithStats = React.useCallback(async (selectedOption) => {
    const correctAnswer = studyMode === 'english-to-lithuanian' ? currentWord.lithuanian : currentWord.english;
    const isCorrect = selectedOption === correctAnswer;

    // Update local state
    setActivityState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Update Journey stats
    try {
      await journeyStatsManager.updateWordStats(currentWord, 'multipleChoice', isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in MultipleChoiceMode:', error);
    }

    // Call the original handler for UI updates and flow control
    if (handleMultipleChoiceAnswer) {
      handleMultipleChoiceAnswer(selectedOption);
    }
  }, [currentWord, studyMode, handleMultipleChoiceAnswer]);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      selectedAnswer: null
    }));
  }, [currentWord]);

  const question = studyMode === 'english-to-lithuanian' ? currentWord.english : currentWord.lithuanian;

  // Create enhanced state object for MultipleChoiceOptions
  const enhancedWordListState = React.useMemo(() => ({
    ...wordListState,
    ...activityState
  }), [wordListState, activityState]);

  return (
    <div>
      <WordDisplayCard
        currentWord={currentWord}
        studyMode={studyMode}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        questionText={question}
        showHints={true}
        hintText="Choose the correct answer"
        style={{ padding: 'min(var(--spacing-large), 1rem)' }}
      />
      <MultipleChoiceOptions
        wordListManager={wordListManager}
        wordListState={enhancedWordListState}
        studyMode={studyMode}
        quizMode="multiple-choice"
        handleMultipleChoiceAnswer={handleMultipleChoiceWithStats}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
      />
    </div>
  );
};

export default MultipleChoiceActivity;
