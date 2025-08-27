import React, { useEffect, useState } from 'react';

// Type definitions
interface ShapeGameProps {
  onAnswer?: (isCorrect: boolean) => void;
  gameStats?: {
    correct: number;
    total: number;
  };
}

const ShapeGame: React.FC<ShapeGameProps> = ({ onAnswer, gameStats }) => {
  const shapes = [
    'rectangle',
    'trapezoid',
    'right triangle',
    'equilateral triangle',
    'hexagon',
    'octagon',
    'circle',
    'star',
    'square',
    'pentagon',
    'semicircle',
    'heart',
    'ellipse',
    'parallelogram'
  ];

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#ef4444', // red
    '#8b5cf6', // purple
    '#f59e0b', // yellow
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6'  // teal
  ];

  const [currentShape, setCurrentShape] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);
  const [mode, setMode] = useState<'word-to-shape' | 'shape-to-word'>('word-to-shape');
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [round, setRound] = useState<number>(0);
  const [colorOffset, setColorOffset] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  const getShapeComponent = (shapeName: string, index: number, size: 'small' | 'medium' | 'large' = 'medium'): React.JSX.Element => {
    // Add random offset to break up the predictable color pattern
    const colorIndex = (index + colorOffset) % colors.length;
    const color = colors[colorIndex];
    
    const sizeClass = size === 'large' ? 'w-40 h-40' : size === 'medium' ? 'w-16 h-16' : 'w-12 h-12';
    const viewBoxSize = size === 'large' ? '0 0 200 200' : '0 0 100 100';
    
    return (
      <svg className={`${sizeClass} mx-auto`} viewBox={viewBoxSize}>
        {(() => {
          const scale = size === 'large' ? 2 : 1;
          const scaleCoord = (coord: number) => coord * scale;
          const scalePoints = (points: string) => {
            return points.split(' ').map(point => {
              const [x, y] = point.split(',').map(Number);
              return `${scaleCoord(x)},${scaleCoord(y)}`;
            }).join(' ');
          };
          
          switch(shapeName) {
            case 'rectangle':
              return <rect x={scaleCoord(10)} y={scaleCoord(20)} width={scaleCoord(80)} height={scaleCoord(60)} fill={color} />;
            case 'square':
              return <rect x={scaleCoord(20)} y={scaleCoord(20)} width={scaleCoord(60)} height={scaleCoord(60)} fill={color} />;
            case 'circle':
              return <circle cx={scaleCoord(50)} cy={scaleCoord(50)} r={scaleCoord(40)} fill={color} />;
            case 'right triangle':
              return <polygon points={scalePoints("10,80 90,80 10,20")} fill={color} />;
            case 'equilateral triangle':
              return <polygon points={scalePoints("50,10 85,80 15,80")} fill={color} />;
            case 'trapezoid':
              return <polygon points={scalePoints("12.5,25 87.5,25 97.5,75 2.5,75")} fill={color} />;
            case 'hexagon':
              return <polygon points={scalePoints("50,10 85,30 85,70 50,90 15,70 15,30")} fill={color} />;
            case 'octagon':
              return <polygon points={scalePoints("30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30")} fill={color} />;
            case 'star':
              return <polygon points={scalePoints("50,5 61,35 95,35 69,57 80,87 50,70 20,87 31,57 5,35 39,35")} fill={color} />;
            case 'pentagon':
              return <polygon points={scalePoints("50,10 85,35 72,80 28,80 15,35")} fill={color} />;
            case 'semicircle':
              return <path d={`M ${scaleCoord(10)} ${scaleCoord(65)} A ${scaleCoord(40)} ${scaleCoord(40)} 0 0 1 ${scaleCoord(90)} ${scaleCoord(65)} Z`} fill={color} />;
            case 'heart':
              return <path d={`M ${scaleCoord(50)},${scaleCoord(25)} C ${scaleCoord(35)},${scaleCoord(5)} ${scaleCoord(10)},${scaleCoord(10)} ${scaleCoord(10)},${scaleCoord(30)} C ${scaleCoord(10)},${scaleCoord(50)} ${scaleCoord(50)},${scaleCoord(85)} ${scaleCoord(50)},${scaleCoord(85)} C ${scaleCoord(50)},${scaleCoord(85)} ${scaleCoord(90)},${scaleCoord(50)} ${scaleCoord(90)},${scaleCoord(30)} C ${scaleCoord(90)},${scaleCoord(10)} ${scaleCoord(65)},${scaleCoord(5)} ${scaleCoord(50)},${scaleCoord(25)} Z`} fill={color} />;
            case 'ellipse':
              return <ellipse cx={scaleCoord(50)} cy={scaleCoord(50)} rx={scaleCoord(40)} ry={scaleCoord(25)} fill={color} />;
            case 'parallelogram':
              return <polygon points={scalePoints("5,75 30,25 95,25 70,75")} fill={color} />;
            default:
              return <rect x={scaleCoord(20)} y={scaleCoord(20)} width={scaleCoord(60)} height={scaleCoord(60)} fill={color} />;
          }
        })()}
      </svg>
    );
  };

  const startNewRound = (): void => {
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    setCurrentShape(randomShape);
    
    // Filter out shapes that shouldn't appear together
    let availableShapes = shapes.filter(s => s !== randomShape);
    
    // Exclude confusingly similar shapes
    if (randomShape === 'square') {
      availableShapes = availableShapes.filter(s => s !== 'rectangle');
    } else if (randomShape === 'rectangle') {
      availableShapes = availableShapes.filter(s => s !== 'square');
    } else if (randomShape === 'circle') {
      availableShapes = availableShapes.filter(s => s !== 'ellipse');
    } else if (randomShape === 'ellipse') {
      availableShapes = availableShapes.filter(s => s !== 'circle');
    } else if (randomShape === 'equilateral triangle') {
      availableShapes = availableShapes.filter(s => s !== 'right triangle');
    } else if (randomShape === 'right triangle') {
      availableShapes = availableShapes.filter(s => s !== 'equilateral triangle');
    }

    const wrongOptions = availableShapes
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allOptions = [...wrongOptions, randomShape].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback('');
    setShowFeedback(false);
    setRound(round + 1);
    
    // Randomize color starting point for more variety
    setColorOffset(Math.floor(Math.random() * colors.length));
  };

  useEffect(() => {
    startNewRound();
  }, []);

  const handleAnswer = (selectedShape: string): void => {
    if (showFeedback) return; // Already answered

    const correct = selectedShape === currentShape;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setScore(score + 1);
      setFeedback('Great job! That\'s correct! 🎉');
    } else {
      setFeedback('Oops! Try again! 🤔');
    }

    // Call the parent's onAnswer callback if provided
    if (onAnswer) {
      onAnswer(correct);
    }

    // Auto-advance after 2 seconds
    setTimeout(() => {
      startNewRound();
    }, 2000);
  };

  const toggleMode = (): void => {
    setMode(mode === 'word-to-shape' ? 'shape-to-word' : 'word-to-shape');
    startNewRound();
  };

  return (
    <div className="w-card">
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h3>Choose the Shape! 🔷</h3>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontSize: '18px', color: '#6B7280' }}>
            Score: {gameStats?.correct || score} ⭐
          </p>
          <button
            onClick={toggleMode}
            className="w-button"
            style={{ 
              marginTop: '10px',
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            Switch to {mode === 'word-to-shape' ? 'Shape → Word' : 'Word → Shape'}
          </button>
        </div>
      </div>

      {mode === 'word-to-shape' ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1E40AF',
              marginBottom: '20px'
            }}>
              Find the {currentShape}
            </h2>
          </div>
          <div className="mg-multiple-choice">
            {options.map((shape, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(shape)}
                disabled={showFeedback}
                className={`mg-choice-option ${
                  showFeedback && shape === currentShape ? 'w-correct' : ''
                } ${
                  showFeedback && shape !== currentShape && isCorrect === false ? 'w-incorrect' : ''
                }`}
              >
                {getShapeComponent(shape, index)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#1E40AF',
              marginBottom: '15px'
            }}>
              What shape is this?
            </h2>
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              display: 'inline-block',
              marginBottom: '30px'
            }}>
              {getShapeComponent(currentShape, round % colors.length, 'large')}
            </div>
          </div>
          <div className="mg-multiple-choice">
            {options.map((shape, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(shape)}
                disabled={showFeedback}
                className={`mg-choice-option ${
                  showFeedback && shape === currentShape ? 'w-correct' : ''
                } ${
                  showFeedback && shape !== currentShape && isCorrect === false ? 'w-incorrect' : ''
                }`}
                style={{ minHeight: '80px' }}
              >
                <span className="mg-choice-text" style={{ textTransform: 'capitalize' }}>
                  {shape}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className={`w-feedback ${isCorrect ? 'w-success' : 'w-error'}`}>
          {isCorrect ? (
            <p>Great job! That's correct! 🎉</p>
          ) : (
            <p>Oops! The correct answer is "{currentShape}" 🤔</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShapeGame;