
import React from 'react';
import MultipleChoiceOptions from '../Components/MultipleChoiceOptions';
import WordDisplayCard from '../Components/WordDisplayCard';
import journeyStatsManager from '../Managers/journeyStatsManager';

const ListeningActivity = ({ 
  wordListManager, // Optional - for ListeningMode compatibility
  wordListState, // Optional - for ListeningMode compatibility
  currentWord, // Accept currentWord as prop
  showAnswer, // Accept showAnswer as prop
  selectedAnswer, // Accept selectedAnswer as prop
  multipleChoiceOptions, // Accept multipleChoiceOptions as prop (from DrillMode)
  studyMode,
  audioEnabled,
  playAudio,
  handleMultipleChoiceAnswer,
  settings
}) => {
  const [preventAutoPlay, setPreventAutoPlay] = React.useState(false);
  const [activityState, setActivityState] = React.useState({
    showAnswer: showAnswer || false,
    selectedAnswer: selectedAnswer || null,
    multipleChoiceOptions: multipleChoiceOptions || [],
    autoAdvanceTimer: null
  });

  // Use currentWord from props, fallback to wordListManager if available (for ListeningMode)
  const word = currentWord || (wordListManager?.getCurrentWord ? wordListManager.getCurrentWord() : null);
  
  if (!word) return null;

  // Initialize journey stats manager on first render
  React.useEffect(() => {
    journeyStatsManager.initialize();
  }, []);

  // Reset prevent auto-play flag when word changes
  React.useEffect(() => {
    setPreventAutoPlay(false);
  }, [word]);

  // Generate multiple choice options when word changes (only if not provided as prop)
  React.useEffect(() => {
    if (word && !multipleChoiceOptions && !activityState.multipleChoiceOptions.length) {
      generateMultipleChoiceOptions();
    }
  }, [word, studyMode, settings?.difficulty, multipleChoiceOptions]);

  const generateMultipleChoiceOptions = React.useCallback(() => {
    if (!word) return;

    // For listening mode, determine correct answer based on listening mode type
    let correctAnswer;
    let answerField;
    
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = word.lithuanian;
      answerField = 'lithuanian';
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? word.english : word.lithuanian;
      answerField = studyMode === 'lithuanian-to-english' ? 'english' : 'lithuanian';
    }

    // Determine number of options based on difficulty
    const numOptions = settings?.difficulty === 'easy' ? 4 : settings?.difficulty === 'medium' ? 6 : 8;
    const numWrongAnswers = numOptions - 1;

    // Use wordListState if available, otherwise create minimal options
    const allWords = wordListState?.allWords || [];
    const sameCorpusWords = allWords.filter(w => 
      w.corpus === word.corpus && 
      w[answerField] !== correctAnswer
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
      const fallbackWords = allWords
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
  }, [word, studyMode, settings?.difficulty, wordListState?.allWords]);

  // Enhanced listening handler that updates Journey stats
  const handleListeningWithStats = React.useCallback(async (selectedOption) => {
    // Prevent auto-play when an answer is selected
    setPreventAutoPlay(true);
    
    // Determine correct answer based on study mode for listening
    let correctAnswer;
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = word.lithuanian;
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? word.english : word.lithuanian;
    }

    const isCorrect = selectedOption === correctAnswer;

    // Update local state
    setActivityState(prev => ({
      ...prev,
      selectedAnswer: selectedOption,
      showAnswer: true
    }));

    // Determine stats mode based on difficulty
    const statsMode = studyMode === 'lithuanian-to-lithuanian' ? 'listeningEasy' : 'listeningHard';

    // Update Journey stats with appropriate mode
    try {
      await journeyStatsManager.updateWordStats(word, statsMode, isCorrect);
    } catch (error) {
      console.error('Error updating journey stats in ListeningMode:', error);
    }

    // Call the original handler for UI updates and flow control
    if (handleMultipleChoiceAnswer) {
      handleMultipleChoiceAnswer(selectedOption);
    }
  }, [word, studyMode, handleMultipleChoiceAnswer]);

  // Reset state when word changes
  React.useEffect(() => {
    setActivityState(prev => ({
      ...prev,
      showAnswer: false,
      selectedAnswer: null
    }));
  }, [word]);

  const instructionText = studyMode === 'lithuanian-to-english' 
    ? 'Choose the English translation:'
    : studyMode === 'lithuanian-to-lithuanian'
      ? 'Choose the matching Lithuanian word:'
      : 'Choose the matching Lithuanian word:';

  // Determine which options to use: prop-provided or self-generated
  const optionsToUse = multipleChoiceOptions || activityState.multipleChoiceOptions;
  const showAnswerToUse = showAnswer !== undefined ? showAnswer : activityState.showAnswer;
  const selectedAnswerToUse = selectedAnswer !== undefined ? selectedAnswer : activityState.selectedAnswer;

  return (
    <div>
      <WordDisplayCard
        currentWord={word}
        studyMode="listening"
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        questionText="🎧 Listen and choose the correct answer:"
        showAudioButton={true}
        promptText={instructionText}
        isClickable={false}
      />
      <MultipleChoiceOptions
        currentWord={word}
        studyMode={studyMode}
        quizMode="listening"
        handleMultipleChoiceAnswer={handleListeningWithStats}
        audioEnabled={audioEnabled}
        playAudio={playAudio}
        multipleChoiceOptions={optionsToUse}
        selectedAnswer={selectedAnswerToUse}
        showAnswer={showAnswerToUse}
        allWords={wordListState?.allWords}
      />
    </div>
  );
};

export default ListeningActivity;
