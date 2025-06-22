
/**
 * Utility for generating multiple choice options across different activities
 */

export const generateMultipleChoiceOptions = (word, studyMode, quizMode, wordListState, settings) => {
  if (!word) return [];

  // Determine correct answer and answer field based on mode
  let correctAnswer;
  let answerField;
  
  if (quizMode === 'listening') {
    if (studyMode === 'lithuanian-to-lithuanian') {
      correctAnswer = word.lithuanian;
      answerField = 'lithuanian';
    } else {
      correctAnswer = studyMode === 'lithuanian-to-english' ? word.english : word.lithuanian;
      answerField = studyMode === 'lithuanian-to-english' ? 'english' : 'lithuanian';
    }
  } else {
    // Multiple choice mode
    correctAnswer = studyMode === 'english-to-lithuanian' ? word.lithuanian : word.english;
    answerField = studyMode === 'english-to-lithuanian' ? 'lithuanian' : 'english';
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
  for (const wrongWord of shuffledSameCorpusWords) {
    const answer = wrongWord[answerField];
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

  return options;
};
