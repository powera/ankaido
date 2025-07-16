import React, { useState } from 'react';
import MathGamesActivity from '../Activities/MathGamesActivity';
import mathGamesStringsLT from '../Strings/mathGamesStrings.lt';

const MathGamesMode = () => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameStats, setGameStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  });

  // Available games - only first two are implemented
  const availableGames = [
    { id: 'rectangles', name: mathGamesStringsLT.gameButtons.rectangles, implemented: true },
    { id: 'temperature', name: mathGamesStringsLT.gameButtons.temperature, implemented: true },
    { id: 'addition', name: mathGamesStringsLT.gameButtons.addition, implemented: false },
    { id: 'subtraction', name: mathGamesStringsLT.gameButtons.subtraction, implemented: false },
    { id: 'multiplication', name: mathGamesStringsLT.gameButtons.multiplication, implemented: false },
    { id: 'division', name: mathGamesStringsLT.gameButtons.division, implemented: false },
    { id: 'fractions', name: mathGamesStringsLT.gameButtons.fractions, implemented: false },
    { id: 'geometry', name: mathGamesStringsLT.gameButtons.geometry, implemented: false },
    { id: 'measurement', name: mathGamesStringsLT.gameButtons.measurement, implemented: false },
    { id: 'time', name: mathGamesStringsLT.gameButtons.time, implemented: false },
    { id: 'money', name: mathGamesStringsLT.gameButtons.money, implemented: false },
    { id: 'patterns', name: mathGamesStringsLT.gameButtons.patterns, implemented: false }
  ];

  const handleGameSelect = (gameId) => {
    const game = availableGames.find(g => g.id === gameId);
    if (game && game.implemented) {
      setSelectedGame(gameId);
      // Reset stats when starting a new game
      setGameStats({
        correct: 0,
        incorrect: 0,
        total: 0
      });
    }
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
  };

  const handleUpdateStats = (isCorrect) => {
    setGameStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      total: prev.total + 1
    }));
  };

  // If a game is selected, show the game activity
  if (selectedGame) {
    return (
      <MathGamesActivity
        selectedGame={selectedGame}
        onBackToGames={handleBackToGames}
        gameStats={gameStats}
        onUpdateStats={handleUpdateStats}
      />
    );
  }

  // Show game selection screen
  return (
    <div className="w-card">
      <h2>{mathGamesStringsLT.modeTitle}</h2>
      <p>{mathGamesStringsLT.selectGame}</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginTop: '20px',
        maxWidth: '800px',
        margin: '20px auto'
      }}>
        {availableGames.slice(0, 12).map((game) => (
          <button
            key={game.id}
            className={`w-button ${!game.implemented ? 'w-button-disabled' : ''}`}
            onClick={() => handleGameSelect(game.id)}
            disabled={!game.implemented}
            style={{
              padding: '15px',
              fontSize: '14px',
              textAlign: 'center',
              minHeight: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: game.implemented ? 1 : 0.5,
              cursor: game.implemented ? 'pointer' : 'not-allowed'
            }}
            title={!game.implemented ? 'Coming soon!' : ''}
          >
            {game.name}
          </button>
        ))}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#666' }}>
        More games coming soon!
      </div>
    </div>
  );
};

export default MathGamesMode;