import React from 'react';

interface SplashScreenProps {
  requiresInteraction?: boolean;
  onContinue?: (() => void) | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ requiresInteraction = false, onContinue = null }) => {
  const handleClick = () => {
    if (requiresInteraction && onContinue) {
      onContinue();
    }
  };

  return (
    <div className="w-container">
      <div className="w-card w-splash-card">
        <div className="w-splash-content">
          <h1 className="w-splash-title">
            🇱🇹 Trakaido
          </h1>
          <p className="w-splash-subtitle">
            Learn Lithuanian
          </p>
        </div>
        {requiresInteraction && (
          <div className="w-splash-interaction">
            <button 
              className="w-button w-button-primary w-mb-medium"
              onClick={handleClick}
            >
              Continue Learning
            </button>
          </div>
        )}
        <div className="w-splash-footer">
          © 2025 Yevaud Platforms LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;