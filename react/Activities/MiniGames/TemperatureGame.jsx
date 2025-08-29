import { useCallback, useEffect, useState } from 'react';

const TemperatureGame = ({ onAnswer, gameStats }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const generateQuestion = useCallback(() => {
    // Generate a random temperature between -20°C and 40°C
    const temperature = Math.floor(Math.random() * 61) - 20;
    
    // Determine if it's hot or cold (threshold around 15°C)
    const isHot = temperature >= 15;
    
    setCurrentQuestion({ temperature, isHot });
    setSelectedAnswer(null);
    setShowAnswer(false);
  }, []);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswerClick = (answer) => {
    setSelectedAnswer(answer);
    setShowAnswer(true);
    const isCorrect = (answer === 'hot' && currentQuestion.isHot) || 
                     (answer === 'cold' && !currentQuestion.isHot);
    onAnswer(isCorrect);
    
    // Auto-generate new question after a delay
    setTimeout(() => {
      generateQuestion();
    }, 2000);
  };

  if (!currentQuestion) return <div>Loading...</div>;

  return (
    <div className="w-card">
      <h3>How Hot Is It?</h3>
      <p>Look at the temperature and decide:</p>
      
      {/* Temperature display */}
      <div style={{ 
        fontSize: '3rem', 
        textAlign: 'center', 
        margin: '30px 0',
        color: currentQuestion.isHot ? '#ff4444' : '#4444ff',
        fontWeight: 'bold'
      }}>
        {currentQuestion.temperature}°C
      </div>
      
      <p><strong>Is this temperature hot or cold?</strong></p>
      
      {/* Hot/Cold options */}
      <div className="w-multiple-choice-options">
        <button
          className={`w-multiple-choice-option ${
            selectedAnswer === 'hot' ? 
              (currentQuestion.isHot ? 'w-correct' : 'w-incorrect') : 
              ''
          }`}
          onClick={() => handleAnswerClick('hot')}
          disabled={showAnswer}
        >
          🔥 Hot
        </button>
        <button
          className={`w-multiple-choice-option ${
            selectedAnswer === 'cold' ? 
              (!currentQuestion.isHot ? 'w-correct' : 'w-incorrect') : 
              ''
          }`}
          onClick={() => handleAnswerClick('cold')}
          disabled={showAnswer}
        >
          ❄️ Cold
        </button>
      </div>
      
      {showAnswer && (
        <div className={`w-feedback ${
          (selectedAnswer === 'hot' && currentQuestion.isHot) || 
          (selectedAnswer === 'cold' && !currentQuestion.isHot) ? 
          'w-correct' : 'w-incorrect'
        }`}>
          {(selectedAnswer === 'hot' && currentQuestion.isHot) || 
           (selectedAnswer === 'cold' && !currentQuestion.isHot) ? 
            "Correct! Good job!" : 
            "Not quite right. Try again!"
          }
        </div>
      )}
    </div>
  );
};

export default TemperatureGame;