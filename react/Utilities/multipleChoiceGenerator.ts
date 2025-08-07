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
      correctAnswer = word.lithuanian;
      answerField = 'lithuanian';
    } else {
      correctAnswer = studyMode === 'source-to-english' ? word.english : word.lithuanian;
      answerField = studyMode === 'source-to-english' ? 'english' : 'lithuanian';
    }
  } else {
    // Multiple choice mode
    correctAnswer = studyMode === 'english-to-source' ? word.lithuanian : word.english;
    answerField = studyMode === 'english-to-source' ? 'lithuanian' : 'english';
  }

  // Use provided number of options, default to 4
  const numOptions = settings.numOptions || 4;
  const numWrongAnswers = numOptions - 1;

  // Use wordListState if available, otherwise create minimal options
  const allWords = wordListState?.allWords || [];
  const sameCorpusWords = allWords.filter(w => 
    w.corpus === word.corpus && 
    w[answerField] !== correctAnswer
  );
  const wrongAnswersSet = new Set<string>();
  const wrongAnswers: string[] = [];
  
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

  // Sort alphabetically for 6+ options, otherwise shuffle
  if (numOptions >= 6) {
    // Use Lithuanian locale for proper alphabetical sorting when sorting Lithuanian words
    const isLithuanianTarget = answerField === 'lithuanian';
    
    if (isLithuanianTarget) {
      const lithuanianCollator = new Intl.Collator('lt', { 
        sensitivity: 'base',
        numeric: true 
      });
      options = options.sort(lithuanianCollator.compare);
    } else {
      // Use default English sorting for English words
      options = options.sort();
    }
    
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