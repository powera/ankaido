import React from 'react';
import RectangleCountingGame from './MiniGames/RectangleCountingGame';
import TemperatureGame from './MiniGames/TemperatureGame';
import mathGamesStringsLT from '../Strings/mathGamesStrings.lt';

// Main Math Games Activity component
const MathGamesActivity = ({ 
  onBackToGames,
  selectedGame,
  gameStats,
  onUpdateStats
}) => {
  const handleAnswer = (isCorrect) => {
    onUpdateStats(isCorrect);
  };

  const renderGame = () => {
    switch (selectedGame) {
      case 'rectangles':
        return <RectangleCountingGame onAnswer={handleAnswer} gameStats={gameStats} />;
      case 'temperature':
        return <TemperatureGame onAnswer={handleAnswer} gameStats={gameStats} />;
      default:
        return <div>Game not found</div>;
    }
  };

  return (
    <div>
      <div className="w-nav-controls">
        <button className="w-button" onClick={onBackToGames}>
          {mathGamesStringsLT.backToGames}
        </button>
        <div className="w-nav-center"></div>
        <div className="w-stats-mini">
          {mathGamesStringsLT.ui.score}: {gameStats.correct}/{gameStats.total}
        </div>
      </div>
      
      {renderGame()}
    </div>
  );
};

export default MathGamesActivity;