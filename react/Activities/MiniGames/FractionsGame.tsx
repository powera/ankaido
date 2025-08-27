import React, { useEffect, useState } from 'react';

// Type definitions
interface Fraction {
  num: number;
  den: number;
  value: number; // Calculated decimal value for comparison logic
}

interface Question {
  question: Fraction;
  answers: Fraction[];
  correctIndex: number;
}

interface FractionsGameProps {
  onAnswer?: (isCorrect: boolean) => void;
  gameStats?: {
    correct: number;
    total: number;
  };
}

const FractionsGame: React.FC<FractionsGameProps> = ({ onAnswer, gameStats }) => {
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Define possible fractions for questions and answers
  const fractions: Fraction[] = [
    { num: 1, den: 2, value: 0.5 },
    { num: 1, den: 3, value: 0.333 },
    { num: 1, den: 4, value: 0.25 },
    { num: 1, den: 5, value: 0.2 },
    { num: 1, den: 6, value: 0.167 },
    { num: 1, den: 8, value: 0.125 },
    { num: 1, den: 10, value: 0.1 },
    { num: 2, den: 3, value: 0.667 },
    { num: 3, den: 4, value: 0.75 },
    { num: 2, den: 5, value: 0.4 },
    { num: 3, den: 5, value: 0.6 },
    { num: 4, den: 5, value: 0.8 },
    { num: 5, den: 6, value: 0.833 },
    { num: 3, den: 8, value: 0.375 },
    { num: 5, den: 8, value: 0.625 },
    { num: 7, den: 8, value: 0.875 },
    { num: 3, den: 10, value: 0.3 },
    { num: 5, den: 10, value: 0.5 },
    { num: 7, den: 10, value: 0.7 },
    { num: 9, den: 10, value: 0.9 }
  ];

  // Generate a new question
  const generateQuestion = (): void => {
    const question = fractions[Math.floor(Math.random() * fractions.length)];
    
    // Generate wrong answers that are not within 0.05 of the correct answer
    let answers: Fraction[] = [question];
    const wrongAnswers = fractions.filter(f => Math.abs(f.value - question.value) > 0.05);
    
    while (answers.length < 4 && wrongAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * wrongAnswers.length);
      const wrongAnswer = wrongAnswers[randomIndex];
      if (!answers.some(a => a.num === wrongAnswer.num && a.den === wrongAnswer.den)) {
        answers.push(wrongAnswer);
        wrongAnswers.splice(randomIndex, 1);
      }
    }
    
    // Shuffle answers
    answers = answers.sort(() => Math.random() - 0.5);
    
    setCurrentQuestion({
      question: question,
      answers: answers,
      correctIndex: answers.findIndex(a => a.num === question.num && a.den === question.den)
    });
    setFeedback('');
    setSelectedAnswer(null);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleAnswer = (index: number): void => {
    if (selectedAnswer !== null) return; // Already answered
    
    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion?.correctIndex;
    
    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      setFeedback('Great job! That\'s correct! 🎉');
    } else {
      setStreak(0);
      setFeedback('Not quite. Try again! 💪');
    }

    // Call the parent's onAnswer callback if provided
    if (onAnswer) {
      onAnswer(isCorrect);
    }

    // Generate new question after a delay
    setTimeout(() => {
      generateQuestion();
    }, 2000);
  };

  // SVG circle drawing function - creates visual fraction representations
  // Each circle is 150x150px with a 60px radius, centered at (75,75)
  const drawCircle = (fraction: Fraction, isCorrect: boolean, isSelected: boolean): React.JSX.Element => {
    const { num, den } = fraction;
    const radius = 60;  // Circle radius in pixels
    const cx = 75;      // Center X coordinate (half of 150px width)
    const cy = 75;      // Center Y coordinate (half of 150px height)
    
    // Calculate angle for the filled portion
    const angle = (num / den) * 360;
    const radians = (angle - 90) * (Math.PI / 180);
    
    // Calculate end point for the arc
    const x = cx + radius * Math.cos(radians);
    const y = cy + radius * Math.sin(radians);
    
    // Determine if we need a large arc
    const largeArc = angle > 180 ? 1 : 0;

    return (
      <svg width="150" height="150" className={`border-4 rounded-lg ${
        isSelected ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-300'
      }`}>
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="#f0f0f0" stroke="#333" strokeWidth="2" />
        
        {/* Filled portion */}
        {num > 0 && (
          <path
            d={`M ${cx} ${cy} L ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`}
            fill="#4F46E5"
            stroke="#333"
            strokeWidth="2"
          />
        )}
        
        {/* Divider lines */}
        {Array.from({ length: den }, (_, i) => {
          const dividerAngle = (i * 360 / den - 90) * (Math.PI / 180);
          const x1 = cx + radius * Math.cos(dividerAngle);
          const y1 = cy + radius * Math.sin(dividerAngle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x1}
              y2={y1}
              stroke="#333"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    );
  };

  if (!currentQuestion) return <div>Loading...</div>;

  return (
    <>
      {/* 
        MAIN LAYOUT STRUCTURE - Full Screen Layout Description:
        
        1. CONTAINER (max-w-4xl): Centers content with max width, takes ~60-80% of screen width
        2. HEADER SECTION (~10% of screen height): Game title at top
        3. QUESTION SECTION (~20% of screen height): Blue box showing target fraction
        4. ANSWER GRID (~40% of screen height): 2x2 grid of interactive circle buttons  
        5. FEEDBACK SECTION (~10% of screen height): Dynamic success/error messages
        6. STATS SECTION (~20% of screen height): Score and streak display at bottom
      */}
      <div className="max-w-4xl mx-auto p-6">
      {/* HEADER SECTION - Top 10% of screen: Game title and branding */}
      <h1 className="text-3xl font-bold text-center mb-8 text-purple-700">
        Identify Fractions Game! 🎯
      </h1>
      
      {/* QUESTION SECTION - Upper 20% of screen: Target fraction display */}
      <div className="bg-blue-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold text-center mb-4">
          Find the circle that shows:
        </h2>
        {/* Visual fraction representation using CSS borders for fraction line */}
        <div className="text-center">
          <div className="inline-block text-5xl font-bold">
            <div>{currentQuestion.question.num}</div>
            <div className="border-t-4 border-black w-16 mx-auto"></div>
            <div>{currentQuestion.question.den}</div>
          </div>
        </div>
      </div>
      
      {/* ANSWER GRID SECTION - Middle 40% of screen: 2x2 grid of clickable fraction circles */}
      <div className="mg-multiple-choice">
        {currentQuestion.answers.map((answer, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedAnswer !== null}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0',
              cursor: selectedAnswer !== null ? 'default' : 'pointer',
              transform: selectedAnswer === index || (selectedAnswer !== null && index === currentQuestion.correctIndex) ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedAnswer === null) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAnswer === null) {
                e.currentTarget.style.transform = 'scale(1)';
              } else if (selectedAnswer === index || (selectedAnswer !== null && index === currentQuestion.correctIndex)) {
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
          >
            {/* Each button contains a 150x150px SVG circle showing the fraction visually */}
            {drawCircle(
              answer, 
              index === currentQuestion.correctIndex,
              selectedAnswer === index
            )}
          </button>
        ))}
      </div>
      
      {/* FEEDBACK SECTION - Middle 10% of screen: Dynamic response messages */}
      {feedback && (
        <div className={`w-feedback ${
          feedback.includes('correct') ? 'w-success' : 'w-error'
        }`}>
          {feedback}
        </div>
      )}
      
      {/* STATS SECTION - Bottom 20% of screen: Score tracking in horizontal layout */}
      <div className="flex justify-around bg-gray-100 p-4 rounded-lg">
        <div className="text-center">
          <p className="text-lg font-semibold">Total Score</p>
          <p className="text-3xl font-bold text-blue-600">{gameStats?.correct || score}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">Current Streak</p>
          <p className="text-3xl font-bold text-green-600">{streak} 🔥</p>
        </div>
      </div>
      </div>
    </>
  );
};

export default FractionsGame;