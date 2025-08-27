import { useCallback, useEffect, useState } from 'react';

const RectangleCountingGame = ({ onAnswer, gameStats }) => {
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [options, setOptions] = useState([]);

  // Number words for multiple choice options
  const numberWords = {
    0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty"
  };

  // Generate a rectangle counting puzzle with standalone rectangles
  const generatePuzzle = useCallback(() => {
    const canvasWidth = 400;
    const canvasHeight = 300;
    const rectangles = [];
    const numRectangles = Math.floor(Math.random() * 6) + 2; // 2-7 rectangles
    
    // Generate non-overlapping rectangles
    for (let i = 0; i < numRectangles; i++) {
      let attempts = 0;
      let newRect;
      
      do {
        const width = Math.floor(Math.random() * 60) + 40; // 40-100px width
        const height = Math.floor(Math.random() * 40) + 30; // 30-70px height
        const x = Math.floor(Math.random() * (canvasWidth - width - 20)) + 10;
        const y = Math.floor(Math.random() * (canvasHeight - height - 20)) + 10;
        
        newRect = { x, y, width, height };
        attempts++;
      } while (attempts < 50 && rectangles.some(rect => rectanglesOverlap(rect, newRect)));
      
      // Only add if we found a non-overlapping position
      if (attempts < 50) {
        rectangles.push(newRect);
      }
    }
    
    const actualCount = rectangles.length;
    
    // Generate multiple choice options
    const correctAnswer = actualCount;
    const wrongOptions = [];
    
    // Add some wrong options
    for (let i = 0; i < 3; i++) {
      let wrongAnswer;
      do {
        wrongAnswer = Math.max(0, correctAnswer + Math.floor(Math.random() * 6) - 3);
      } while (wrongAnswer === correctAnswer || wrongOptions.includes(wrongAnswer));
      wrongOptions.push(wrongAnswer);
    }
    
    // Sort options numerically (don't shuffle)
    const allOptions = [correctAnswer, ...wrongOptions].sort((a, b) => a - b);
    
    setCurrentPuzzle({ rectangles, correctAnswer, canvasWidth, canvasHeight });
    setOptions(allOptions.map(num => ({
      value: num,
      text: numberWords[num] || num.toString()
    })));
    setSelectedAnswer(null);
    setShowAnswer(false);
  }, []);

  // Helper function to check if two rectangles overlap
  const rectanglesOverlap = (rect1, rect2) => {
    const margin = 10; // Add some margin between rectangles
    return !(rect1.x + rect1.width + margin < rect2.x || 
             rect2.x + rect2.width + margin < rect1.x || 
             rect1.y + rect1.height + margin < rect2.y || 
             rect2.y + rect2.height + margin < rect1.y);
  };

  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  const handleAnswerClick = (option) => {
    setSelectedAnswer(option);
    setShowAnswer(true);
    const isCorrect = option.value === currentPuzzle.correctAnswer;
    onAnswer(isCorrect);
    
    // Auto-generate new puzzle after a delay
    setTimeout(() => {
      generatePuzzle();
    }, 2000);
  };

  if (!currentPuzzle) return <div>Loading...</div>;

  return (
    <div className="w-card">
      <h3>Kiek stačiakampių?</h3>
      <p>Count all the rectangles:</p>
      
      {/* Canvas-like display for rectangles */}
      <div style={{ 
        position: 'relative',
        width: `${currentPuzzle.canvasWidth}px`,
        height: `${currentPuzzle.canvasHeight}px`,
        border: '2px solid #ccc',
        margin: '20px auto',
        backgroundColor: '#f9f9f9'
      }}>
        {currentPuzzle.rectangles.map((rect, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: '#4CAF50',
              border: '2px solid #2E7D32',
              borderRadius: '4px'
            }}
          />
        ))}
      </div>
      
      <p><strong>How many rectangles can you see?</strong></p>
      
      {/* Multiple choice options */}
      <div className="w-multiple-choice-options">
        {options.map((option, index) => (
          <button
            key={index}
            className={`w-multiple-choice-option ${
              selectedAnswer === option ? 
                (option.value === currentPuzzle.correctAnswer ? 'w-correct' : 'w-incorrect') : 
                ''
            }`}
            onClick={() => handleAnswerClick(option)}
            disabled={showAnswer}
          >
            {option.text}
          </button>
        ))}
      </div>
      
      {showAnswer && (
        <div className={`w-feedback ${selectedAnswer.value === currentPuzzle.correctAnswer ? 'w-correct' : 'w-incorrect'}`}>
          {selectedAnswer.value === currentPuzzle.correctAnswer ? 
            "Correct! Well done!" : 
            "Not quite right. Try again!"
          }
        </div>
      )}
    </div>
  );
};

export default RectangleCountingGame;