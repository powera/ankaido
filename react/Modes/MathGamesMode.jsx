import { useState } from 'react';
import MathGamesActivity from '../Activities/MathGamesActivity';

// Math Games Mode - Main component that handles game selection and stats
// Shows a grid of available games, then renders the selected game via MathGamesActivity
const MathGamesMode = () => {
  const [selectedGame, setSelectedGame] = useState(null); // Currently selected game ID
  const [gameStats, setGameStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  });

  // Available games - IDs must match cases in MathGamesActivity.jsx
  const availableGames = [
    // Implemented games (have corresponding components in MiniGames folder)
    { id: 'rectangles', name: 'Kiek stačiakampių?', implemented: true },
    { id: 'temperature', name: 'How Hot Is It?', implemented: true },
    { id: 'lithuanianCities', name: 'Which Lithuanian City?', implemented: true },
    { id: 'multipleFinder', name: 'Find the Next Multiple', implemented: true },
    { id: 'shapes', name: 'Choose the Shape!', implemented: true },
    { id: 'fractions', name: 'Identify Fractions', implemented: true },
    { id: 'approximation', name: 'Approximation Game', implemented: true },
    
    // Planned games (not yet implemented)
    { id: 'multiplication', name: 'Times Tables', implemented: false },
    { id: 'measurement', name: 'Measurement', implemented: false },
    { id: 'time', name: 'Tell the Time', implemented: false },
    { id: 'money', name: 'Count Money', implemented: false },
    { id: 'patterns', name: 'Number Patterns', implemented: false }
  ];

  // Handle game selection from the grid
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

  // Return to game selection screen
  const handleBackToGames = () => {
    setSelectedGame(null);
  };

  // Update game statistics when player answers a question
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
      <h2>Math Games</h2>
      <p>Select a Math Game</p>
      
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