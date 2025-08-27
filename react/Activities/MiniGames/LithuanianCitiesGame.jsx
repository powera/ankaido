import { useCallback, useEffect, useState } from 'react';

const LithuanianCitiesGame = ({ onAnswer, gameStats }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // City data with corrected coordinates (relative to the map image)
  // Note: Coordinates are percentages relative to the specific map image used (/images/lithuania-map.png)
  // Map boundaries: N: 57.2°, S: 53.2°, E: 27.6°, W: 20.2° (includes margins around Lithuania)
  // Actual Lithuania boundaries: N: 56.5975°, S: 54.9547°, E: 24.95°, W: 21.98°
  const cities = [
    { 
      id: 'vilnius', 
      name: 'Vilnius',
      x: 68, // (25.2797 - 20.2) / 7.4 * 100 = 68.6%
      y: 63, // (57.2 - 54.6872) / 4.0 * 100 = 62.8%
      // lat: 54.6872°N, lon: 25.2797°E
    },
    { 
      id: 'kaunas', 
      name: 'Kaunas',
      x: 50, // (23.9036 - 20.2) / 7.4 * 100 = 50.0%
      y: 58, // (57.2 - 54.8985) / 4.0 * 100 = 57.5%
      // lat: 54.8985°N, lon: 23.9036°E
    },
    { 
      id: 'klaipeda', 
      name: 'Klaipėda',
      x: 13, // (21.1443 - 20.2) / 7.4 * 100 = 12.8%
      y: 37, // (57.2 - 55.7033) / 4.0 * 100 = 37.4%
      // lat: 55.7033°N, lon: 21.1443°E
    },
    { 
      id: 'siauliai', 
      name: 'Šiauliai',
      x: 42, // (23.3141 - 20.2) / 7.4 * 100 = 42.1%
      y: 32, // (57.2 - 55.9349) / 4.0 * 100 = 31.6%
      // lat: 55.9349°N, lon: 23.3141°E
    },
    { 
      id: 'panevezys', 
      name: 'Panevėžys',
      x: 56, // (24.3608 - 20.2) / 7.4 * 100 = 56.2%
      y: 37, // (57.2 - 55.7322) / 4.0 * 100 = 36.7%
      // lat: 55.7322°N, lon: 24.3608°E
    },
    { 
      id: 'alytus', 
      name: 'Alytus',
      x: 52, // (24.05 - 20.2) / 7.4 * 100 = 52.0%
      y: 79, // (57.2 - 54.05) / 4.0 * 100 = 78.8%
      // lat: 54.05°N, lon: 24.05°E
    },
    { 
      id: 'marijampole', 
      name: 'Marijampolė',
      x: 42, // (23.3 - 20.2) / 7.4 * 100 = 41.9%
      y: 65, // (57.2 - 54.6) / 4.0 * 100 = 65.0%
      // lat: 54.6°N, lon: 23.3°E
    },
    { 
      id: 'mazeikiai', 
      name: 'Mažeikiai',
      x: 28, // (22.3 - 20.2) / 7.4 * 100 = 28.4%
      y: 23, // (57.2 - 56.3) / 4.0 * 100 = 22.5%
      // lat: 56.3°N, lon: 22.3°E
    }
  ];

  const generateQuestion = useCallback(() => {
    // Select a random city
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    // Create 4 answer options including the correct one
    const correctAnswer = randomCity;
    const wrongAnswers = cities
      .filter(city => city.id !== correctAnswer.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const allOptions = [correctAnswer, ...wrongAnswers]
      .sort(() => 0.5 - Math.random());
    
    setCurrentQuestion({ 
      correctCity: correctAnswer, 
      options: allOptions 
    });
    setSelectedAnswer(null);
    setShowAnswer(false);
  }, []);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswerClick = (selectedCity) => {
    setSelectedAnswer(selectedCity);
    setShowAnswer(true);
    const isCorrect = selectedCity.id === currentQuestion.correctCity.id;
    onAnswer(isCorrect);
    
    // Auto-generate new question after a delay
    setTimeout(() => {
      generateQuestion();
    }, 2500);
  };

  if (!currentQuestion) return <div>Loading...</div>;

  return (
    <div className="w-card">
      <h3>Which Lithuanian City?</h3>
      <p>Look at the map and identify the city:</p>
      
      {/* Lithuania Map with Star */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '500px', 
        margin: '20px auto',
        border: '2px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Using the bundled Lithuania map */}
        <img 
          src="/images/lithuania-map.png"
          alt="Lithuania map"
          style={{ 
            width: '100%', 
            height: 'auto',
            display: 'block'
          }}
        />
        
        {/* Star marker for the city */}
        <div style={{
          position: 'absolute',
          left: `${currentQuestion.correctCity.x}%`,
          top: `${currentQuestion.correctCity.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: '24px',
          color: '#ff4444',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          ⭐
        </div>
      </div>
      
      <p><strong>Which city is marked with a star?</strong></p>
      
      {/* Multiple choice options */}
      <div className="w-multiple-choice">
        {currentQuestion.options.map((city) => (
          <button
            key={city.id}
            className={`w-choice-option ${
              selectedAnswer?.id === city.id ? 
                (city.id === currentQuestion.correctCity.id ? 'w-correct' : 'w-incorrect') : 
                ''
            }`}
            onClick={() => handleAnswerClick(city)}
            disabled={showAnswer}
          >
            {city.name}
          </button>
        ))}
      </div>
      
      {showAnswer && (
        <div className={`w-feedback ${
          selectedAnswer?.id === currentQuestion.correctCity.id ? 
          'w-success' : 'w-error'
        }`}>
          {selectedAnswer?.id === currentQuestion.correctCity.id ? 
            "Correct! You know Lithuanian cities well!" : 
            `Not quite right. Try again! Correct answer: ${currentQuestion.correctCity.name}`
          }
        </div>
      )}
    </div>
  );
};

export default LithuanianCitiesGame;