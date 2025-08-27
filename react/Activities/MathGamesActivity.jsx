// Import all available mini-games
import ApproximationGame from './MiniGames/ApproximationGame';
import FractionsGame from './MiniGames/FractionsGame';
import LithuanianCitiesGame from './MiniGames/LithuanianCitiesGame';
import MultipleFinderGame from './MiniGames/MultipleFinderGame';
import RectangleCountingGame from './MiniGames/RectangleCountingGame';
import ShapeGame from './MiniGames/ShapeGame';
import TemperatureGame from './MiniGames/TemperatureGame';

// Main Math Games Activity component
// This component renders the selected mini-game and handles the game interface
const MathGamesActivity = ({ 
  onBackToGames,     // Function to return to game selection screen
  selectedGame,      // Game ID from MathGamesMode selection
  gameStats,         // Current game statistics (correct/total)
  onUpdateStats      // Function to update stats when answer is given
}) => {
  // Handle answer from any mini-game and pass to parent for stats tracking
  const handleAnswer = (isCorrect) => {
    onUpdateStats(isCorrect);
  };

  // Render the appropriate mini-game based on selectedGame ID
  // Game IDs must match those defined in MathGamesMode.jsx
  const renderGame = () => {
    switch (selectedGame) {
      case 'approximation':
        return <ApproximationGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'rectangles':
        return <RectangleCountingGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'temperature':
        return <TemperatureGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'lithuanianCities':
        return <LithuanianCitiesGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'multipleFinder':
        return <MultipleFinderGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'shapes':
        return <ShapeGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'fractions':
        return <FractionsGame onAnswer={handleAnswer} gameStats={gameStats} />;
      default:
        return <div>Game not found</div>;
    }
  };

  return (
    <div>
      <div className="w-nav-controls">
        <button className="w-button" onClick={onBackToGames}>
          ← Back to Games
        </button>
        <div className="w-nav-center"></div>
        <div className="w-stats-mini">
          Score: {gameStats.correct}/{gameStats.total}
        </div>
      </div>
      
      {renderGame()}
    </div>
  );
};

export default MathGamesActivity;