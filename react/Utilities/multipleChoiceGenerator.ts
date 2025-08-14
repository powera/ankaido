/**
 * Utility for generating multiple choice options across different activities
 */

import { MultipleChoiceSettings, Word, WordListState } from './types';

export const generateMultipleChoiceOptions = (
  word: Word | undefined,
  studyMode: string,
  quizMode: string,
  wordListState?: WordListState,
  settings: MultipleChoiceSettings = {}
): string[] => {
  if (!word) return [];

  // Determine correct answer and answer field based on mode
  let correctAnswer: string;
  let answerField: string;
  
  if (quizMode === 'listening') {
    if (studyMode === 'source-to-source') {
      correctAnswer = word.term || word.lithuanian;
      answerField = 'term';
    } else {
      correctAnswer = studyMode === 'source-to-english' ? (word.definition || word.english) : (word.term || word.lithuanian);
      answerField = studyMode === 'source-to-english' ? 'definition' : 'term';
    }
  } else {
    // Multiple choice mode
    correctAnswer = studyMode === 'english-to-source' ? (word.term || word.lithuanian) : (word.definition || word.english);
    answerField = studyMode === 'english-to-source' ? 'term' : 'definition';
  }

  // Use provided number of options, default to 4
  const numOptions = settings.numOptions || 4;
  const numWrongAnswers = numOptions - 1;

  // Use wordListState if available, otherwise create minimal options
  const allWords = wordListState?.allWords || [];
  const sameCorpusWords = allWords.filter(w => {
    const wordAnswer = answerField === 'term' ? (w.term || w.lithuanian) : (w.definition || w.english);
    return w.corpus === word.corpus && wordAnswer !== correctAnswer;
  });
  const wrongAnswersSet = new Set<string>();
  const wrongAnswers: string[] = [];
  
  // Gather wrong answers from same corpus - shuffle first to get random decoys
  const shuffledSameCorpusWords = [...sameCorpusWords].sort(() => Math.random() - 0.5);
  for (const wrongWord of shuffledSameCorpusWords) {
    const answer = answerField === 'term' ? (wrongWord.term || wrongWord.lithuanian) : (wrongWord.definition || wrongWord.english);
    if (answer !== correctAnswer && !wrongAnswersSet.has(answer)) {
      wrongAnswersSet.add(answer);
      wrongAnswers.push(answer);
      if (wrongAnswers.length >= numWrongAnswers) break;
    }
  }
  
  // Pad with any other words if needed
  if (wrongAnswers.length < numWrongAnswers) {
    const fallbackWords = allWords
      .map(w => answerField === 'term' ? (w.term || w.lithuanian) : (w.definition || w.english))
      .filter(ans => ans !== correctAnswer && !wrongAnswersSet.has(ans))
      .sort(() => Math.random() - 0.5);
    while (wrongAnswers.length < numWrongAnswers && fallbackWords.length > 0) {
      const randIdx = Math.floor(Math.random() * fallbackWords.length);
      const fallback = fallbackWords.splice(randIdx, 1)[0];
      wrongAnswers.push(fallback);
    }
  }

  let options = [correctAnswer, ...wrongAnswers];

  // Sort alphabetically for 6+ options, otherwise shuffle
  if (numOptions >= 6) {
    // Use default alphabetical sorting for all words
    options = options.sort();
    
    // Rearrange to fill columns first
    const rearranged: string[] = [];
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