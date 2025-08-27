import React, { useEffect, useState } from 'react';

// Type definitions
interface MultipleFinderGameProps {
  onAnswer?: (isCorrect: boolean) => void;
  gameStats?: {
    correct: number;
    total: number;
  };
}

const MultipleFinderGame: React.FC<MultipleFinderGameProps> = ({ onAnswer, gameStats }) => {
  const [n, setN] = useState<number>(6);
  const [sequence, setSequence] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [choices, setChoices] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  // Generate a new problem
  const generateProblem = (): void => {
    // Pick a random N between 3 and 12
    const newN = Math.floor(Math.random() * 10) + 3;
    setN(newN);
    
    // Generate 3 consecutive multiples
    const startMultiplier = Math.floor(Math.random() * 5) + 2; // Start from 2x to 6x
    const mult1 = startMultiplier * newN;
    const mult2 = (startMultiplier + 1) * newN;
    const mult3 = (startMultiplier + 2) * newN;
    setSequence([mult1, mult2, mult3]);
    
    // The correct answer is the next multiple
    const correct = (startMultiplier + 3) * newN;
    setCorrectAnswer(correct);
    
    // Generate answer choices
    const wrongAnswers: number[] = [];
    
    // Add some close multiples
    const possibleWrong = [
      correct - newN, // Previous multiple
      correct + newN, // Next multiple after correct
      correct + (2 * newN), // Two multiples ahead
      correct - 1, // Just below
      correct + 1, // Just above
      correct + Math.floor(Math.random() * 5) + 2, // Random offset
      Math.floor((correct + newN/2) / newN) * newN // Nearest multiple
    ];
    
    // Filter out invalid choices and duplicates
    const validWrong = possibleWrong.filter(num => 
      num > mult3 && // Must be larger than the last number shown
      num !== correct && // Not the correct answer
      num > 0 // Positive numbers only
    );
    
    // Randomly select 3 wrong answers
    while (wrongAnswers.length < 3 && validWrong.length > 0) {
      const index = Math.floor(Math.random() * validWrong.length);
      const wrongAnswer = validWrong[index];
      if (!wrongAnswers.includes(wrongAnswer)) {
        wrongAnswers.push(wrongAnswer);
      }
      validWrong.splice(index, 1);
    }
    
    // If we don't have enough wrong answers, generate some
    while (wrongAnswers.length < 3) {
      const offset = Math.floor(Math.random() * 10) + 1;
      const wrongAnswer = correct + offset;
      if (!wrongAnswers.includes(wrongAnswer) && wrongAnswer > mult3) {
        wrongAnswers.push(wrongAnswer);
      }
    }
    
    // Mix correct answer with wrong ones
    const allChoices = [...wrongAnswers, correct];
    allChoices.sort((a, b) => a - b); // Sort numerically
    setChoices(allChoices);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  // Handle answer selection
  const handleAnswer = (answer: number): void => {
    if (showFeedback) return; // Already answered
    
    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setScore(score + 1);
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }

    // Call the parent's onAnswer callback if provided
    if (onAnswer) {
      onAnswer(correct);
    }
    
    // Auto-advance after 2 seconds
    setTimeout(() => {
      generateProblem();
    }, 2000);
  };

  // Initialize first problem
  useEffect(() => {
    generateProblem();
  }, []);

  return (
    <div className="w-card">
      <h3>Find the Next Multiple!</h3>
      
      {/* Problem */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '18px', marginBottom: '15px' }}>
          Looking at multiples of <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B46C1' }}>{n}</span>
        </p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px', 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '15px'
        }}>
          {sequence.map((num, idx) => (
            <div 
              key={idx} 
              style={{
                backgroundColor: '#E0E7FF',
                borderRadius: '8px',
                padding: '12px 20px',
                border: '2px solid #6B46C1'
              }}
            >
              {num}
            </div>
          ))}
          <div style={{
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            padding: '12px 20px',
            border: '2px solid #9CA3AF',
            color: '#6B7280'
          }}>
            ?
          </div>
        </div>
        <p style={{ fontSize: '20px', fontWeight: 'bold' }}>What comes next?</p>
      </div>
      
      {/* Answer choices */}
      <div className="mg-multiple-choice">
        {choices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(choice)}
            disabled={showFeedback}
            className={`mg-choice-option ${
              showFeedback && choice === selectedAnswer ? 
                (isCorrect ? 'w-correct' : 'w-incorrect') : 
                ''
            } ${
              showFeedback && choice === correctAnswer && choice !== selectedAnswer ? 'w-correct' : ''
            }`}
          >
            <span className="mg-choice-number">{choice}</span>
          </button>
        ))}
      </div>
      
      {/* Feedback */}
      {showFeedback && (
        <div className={`w-feedback ${isCorrect ? 'w-success' : 'w-error'}`}>
          {isCorrect ? (
            <div>
              <p>Great job! 🎉</p>
              <p style={{ fontSize: '16px', fontWeight: 'normal', marginTop: '8px' }}>
                {correctAnswer} = {n} × {correctAnswer / n}
              </p>
            </div>
          ) : (
            <div>
              <p>Not quite. The answer is {correctAnswer}</p>
              <p style={{ fontSize: '16px', fontWeight: 'normal', marginTop: '8px' }}>
                {correctAnswer} = {n} × {correctAnswer / n}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Score and Streak */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        backgroundColor: '#F3F4F6', 
        padding: '15px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6B7280' }}>Total Score</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: '5px 0' }}>
            {gameStats?.correct || score}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6B7280' }}>Current Streak</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1F2937', margin: '5px 0' }}>
            {streak} 🔥
          </p>
        </div>
      </div>
      
      {/* Streak celebration */}
      {streak >= 3 && showFeedback && isCorrect && (
        <div style={{ textAlign: 'center', marginTop: '15px', color: '#1F2937' }}>
          <p style={{ fontSize: '24px' }}>🔥 {streak} in a row! Keep it up!</p>
        </div>
      )}
    </div>
  );
};

export default MultipleFinderGame;