import { useEffect, useRef, useState } from 'react';

interface Problem {
  num1: number;
  num2: number;
  operation: string;
  answer: number;
  roundedAnswer: number;
}

interface Feedback {
  correct: boolean;
  message: string;
}

interface ApproximationGameProps {
  onAnswer?: (isCorrect: boolean) => void;
  gameStats?: {
    correct: number;
    total: number;
  };
}

export default function ApproximationGame({ onAnswer, gameStats }: ApproximationGameProps): React.JSX.Element {
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [candidates, setCandidates] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isEasyMode, setIsEasyMode] = useState<boolean>(true);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Generate a new problem
  const generateProblem = (): Problem => {
    while (true) {
      const isAddition = Math.random() < 0.5;
      const minDigits = 2;
      const maxDigits = 4;
      const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
      
      let num1: number, num2: number;
      
      if (digits === 2) {
        num1 = Math.floor(Math.random() * 90) + 10;
        num2 = Math.floor(Math.random() * 90) + 10;
      } else if (digits === 3) {
        num1 = Math.floor(Math.random() * 900) + 100;
        num2 = Math.floor(Math.random() * 900) + 100;
      } else {
        num1 = Math.floor(Math.random() * 9000) + 1000;
        num2 = Math.floor(Math.random() * 9000) + 1000;
      }
      
      // For subtraction, ensure result is positive
      if (!isAddition && num2 > num1) {
        [num1, num2] = [num2, num1];
      }
      
      const answer = isAddition ? num1 + num2 : num1 - num2;
      const operation = isAddition ? '+' : '−';
      
      // Only accept problems with answers >= 10
      if (answer >= 10) {
        // Find a round number within 15% of the answer
        const roundedAnswer = getRoundedAnswer(answer);
        
        return { num1, num2, operation, answer, roundedAnswer };
      }
    }
  };

  // Get a rounded answer within 9% of the actual answer
  const getRoundedAnswer = (answer: number): number => {
    // Try different rounding strategies from coarse to fine
    const roundingFactors = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
    
    for (const factor of roundingFactors) {
      const rounded = Math.round(answer / factor) * factor;
      if (rounded > 0) {
        const percentDiff = Math.abs(rounded - answer) / answer;
        if (percentDiff <= 0.09) {
          return rounded;
        }
      }
    }
    
    // If we still can't find a good rounding, try intermediate values
    const magnitude = Math.pow(10, Math.floor(Math.log10(answer)));
    const tryFactors = [magnitude, magnitude/2, magnitude/5, magnitude/10];
    
    for (const factor of tryFactors) {
      const rounded = Math.round(answer / factor) * factor;
      if (rounded > 0) {
        const percentDiff = Math.abs(rounded - answer) / answer;
        if (percentDiff <= 0.09) {
          return rounded;
        }
      }
    }
    
    // Last resort: round to nearest 5% of the magnitude
    return Math.round(answer / magnitude * 20) / 20 * magnitude;
  };

  // Generate easy mode candidates (often factors of 10 apart)
  const generateEasyCandidates = (correctRounded: number): number[] => {
    const candidates = [correctRounded];
    
    // 70% chance of factor-of-10 pattern
    const useFactorOf10 = Math.random() < 0.7;
    
    if (useFactorOf10) {
      // Simple factor of 10 pattern
      const multipliers = [0.1, 0.01, 10, 100];
      
      for (const mult of multipliers) {
        const decoy = Math.round(correctRounded * mult);
        if (decoy > 0 && decoy !== correctRounded && !candidates.includes(decoy)) {
          candidates.push(decoy);
        }
      }
    } else {
      // Mix it up a bit for variety
      const multipliers = [0.3, 0.1, 3, 10];
      
      for (const mult of multipliers) {
        const decoy = Math.round(correctRounded * mult);
        if (decoy > 0 && decoy !== correctRounded && !candidates.includes(decoy)) {
          candidates.push(decoy);
        }
      }
    }
    
    // Fill if needed
    if (candidates.length < 4) {
      const backupMultipliers = [0.05, 0.2, 5, 20, 50];
      for (const mult of backupMultipliers) {
        if (candidates.length >= 4) break;
        const decoy = Math.round(correctRounded * mult);
        if (decoy > 0 && !candidates.includes(decoy)) {
          candidates.push(decoy);
        }
      }
    }
    
    return Array.from(new Set(candidates)).slice(0, 4).sort((a, b) => a - b);
  };

  // Generate candidates based on the correct answer
  const generateCandidates = (correctRounded: number): number[] => {
    const candidates = [correctRounded];
    
    // Randomly decide the pattern:
    // 0: Mix of larger and smaller
    // 1: All decoys larger than correct
    // 2: All decoys smaller than correct
    // 3: Mostly smaller with one larger
    // 4: Mostly larger with one smaller
    const pattern = Math.floor(Math.random() * 5);
    
    let multipliers;
    if (pattern === 0) {
      // Mix of larger and smaller
      multipliers = [0.1, 0.3, 3, 10];
    } else if (pattern === 1) {
      // All decoys larger
      multipliers = [3, 5, 10, 30];
    } else if (pattern === 2) {
      // All decoys smaller
      multipliers = [0.03, 0.1, 0.2, 0.3];
    } else if (pattern === 3) {
      // Mostly smaller with one larger (correct will often be position 2)
      multipliers = [0.1, 0.3, 0.5, 3];
    } else {
      // Mostly larger with one smaller (correct will often be position 2)
      multipliers = [0.3, 2, 5, 10];
    }
    
    for (const mult of multipliers) {
      const decoy = Math.round(correctRounded * mult);
      if (decoy > 0 && decoy !== correctRounded && !candidates.includes(decoy)) {
        candidates.push(decoy);
      }
    }
    
    // If we don't have enough candidates, add more with same pattern
    if (candidates.length < 4) {
      let additionalMultipliers;
      if (pattern === 0) {
        additionalMultipliers = [0.03, 0.05, 5, 30, 100];
      } else if (pattern === 1) {
        additionalMultipliers = [2, 7, 15, 50, 100];
      } else if (pattern === 2) {
        additionalMultipliers = [0.01, 0.05, 0.15, 0.25, 0.4];
      } else if (pattern === 3) {
        additionalMultipliers = [0.2, 0.4, 0.6, 2, 5];
      } else {
        additionalMultipliers = [0.2, 1.5, 3, 7, 15];
      }
      
      for (const mult of additionalMultipliers) {
        if (candidates.length >= 4) break;
        const decoy = Math.round(correctRounded * mult);
        if (decoy > 0 && !candidates.includes(decoy)) {
          candidates.push(decoy);
        }
      }
    }
    
    // Ensure we have exactly 4 unique candidates, sorted
    return Array.from(new Set(candidates)).slice(0, 4).sort((a, b) => a - b);
  };

  // Check if answer is correct
  const isCorrectAnswer = (selected: number, roundedAnswer: number): boolean => {
    return selected === roundedAnswer;
  };

  // Handle answer selection
  const handleAnswer = (selected: number): void => {
    if (selectedAnswer !== null || !currentProblem) return; // Already answered or no problem
    
    setSelectedAnswer(selected);
    const correct = isCorrectAnswer(selected, currentProblem.roundedAnswer);
    
    // Call the parent's onAnswer callback if provided
    if (onAnswer) {
      onAnswer(correct);
    }

    if (correct) {
      setScore(score + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Switch to normal mode at streak 10
      if (newStreak >= 10 && isEasyMode) {
        setIsEasyMode(false);
      }
      
      setFeedback({ correct: true, message: "Great job! That's the right approximation!" });
    } else {
      setStreak(0);
      setFeedback({ correct: false, message: "Not quite. Try again next time!" });
    }
    
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  // Move to next question
  const nextQuestion = (): void => {
    setFeedback(null);
    setSelectedAnswer(null);
    
    // Remove focus from all buttons
    buttonsRef.current.forEach(button => {
      if (button) button.blur();
    });
    
    // Generate new problem and candidates
    const problem = generateProblem();
    setCurrentProblem(problem);
    setCandidates(isEasyMode ? generateEasyCandidates(problem.roundedAnswer) : generateCandidates(problem.roundedAnswer));
  };

  // Initialize game
  useEffect(() => {
    const problem = generateProblem();
    setCurrentProblem(problem);
    setCandidates(generateEasyCandidates(problem.roundedAnswer));
  }, []);

  // Reset game
  const resetGame = (): void => {
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setSelectedAnswer(null);
    setIsEasyMode(true);  // Reset to easy mode
    
    const problem = generateProblem();
    setCurrentProblem(problem);
    setCandidates(generateEasyCandidates(problem.roundedAnswer));
  };

  if (!currentProblem || candidates.length === 0) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with scores */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Math Approximation Game</h1>
              <p className="text-gray-600">Pick the closest answer!</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-blue-600">Score: {score}</div>
              <div className="text-lg text-purple-600">Streak: {streak}</div>
              {isEasyMode && <div className="text-sm text-green-600 mt-1">Easy Mode</div>}
              {!isEasyMode && <div className="text-sm text-orange-600 mt-1">Challenge Mode</div>}
            </div>
          </div>
        </div>

        {/* Problem display */}
        <div className="w-card p-8 mb-6">
          <div className="text-center mb-12">
            <div className="inline-block text-right">
              <div className="text-6xl font-bold text-gray-800 mb-2">
                {currentProblem.num1.toLocaleString()}
              </div>
              <div className="text-6xl font-bold text-gray-800 mb-2 flex items-end">
                <span className="mr-3">{currentProblem.operation}</span>
                <span>{currentProblem.num2.toLocaleString()}</span>
              </div>
              <div className="border-t-4 border-gray-800 pt-3">
                <span className="text-6xl font-bold text-gray-800">?</span>
              </div>
            </div>
            <p className="text-gray-600 mt-6 text-lg">Choose the closest answer below</p>
          </div>

          {/* Answer choices */}
          <div className="mg-multiple-choice">
            {candidates.map((candidate, index) => (
              <button
                key={candidate}
                ref={el => { buttonsRef.current[index] = el; }}
                onClick={() => handleAnswer(candidate)}
                disabled={selectedAnswer !== null}
                className={`mg-choice-option ${
                  selectedAnswer === candidate
                    ? feedback?.correct
                      ? 'w-correct'
                      : 'w-incorrect'
                    : selectedAnswer !== null
                      ? 'w-unselected'
                      : ''
                }`}
              >
                <span className="mg-choice-number">{candidate.toLocaleString()}</span>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`w-feedback ${feedback.correct ? 'w-success' : 'w-error'} mt-6 text-center`}>
              <div className="flex items-center justify-center gap-2">
                {feedback.correct ? (
                  <span className="text-2xl">✅</span>
                ) : (
                  <span className="text-2xl">❌</span>
                )}
                <span className="text-lg font-semibold">
                  {feedback.message}
                </span>
              </div>
              {selectedAnswer !== null && currentProblem && (
                <p className="text-gray-600 mt-2">
                  Exact answer: {currentProblem.answer.toLocaleString()} 
                  (Rounded to: {currentProblem.roundedAnswer.toLocaleString()})
                </p>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}