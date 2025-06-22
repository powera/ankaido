
import React, { useState } from 'react';
import { STORAGE_MODES } from '../Managers/storageConfigManager';

const WelcomeScreen = ({ onComplete }) => {
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');

  const handleContinue = () => {
    if (selectedLevel && selectedStorage) {
      onComplete(selectedLevel, selectedStorage);
    }
  };

  return (
    <div className="w-container">
      <div className="w-card w-welcome-card">
        <div className="w-welcome-header">
          <h1 className="w-welcome-title">
            🇱🇹 Welcome to Trakaido!
          </h1>
          <p className="w-welcome-subtitle">
            Your Lithuanian Learning Companion
          </p>
        </div>

        <div className="w-welcome-features">
          <h3 className="w-welcome-features-title">What can you do with Trakaido?</h3>
          <ul className="w-welcome-features-list">
            <li className="w-welcome-feature-item">📚 <strong>Flash Cards:</strong> Learn vocabulary with interactive cards</li>
            <li className="w-welcome-feature-item">✏️ <strong>Multiple Choice:</strong> Test your knowledge with quizzes</li>
            <li className="w-welcome-feature-item">⌨️ <strong>Typing Practice:</strong> Improve spelling and recall</li>
            <li className="w-welcome-feature-item">🎧 <strong>Listening Mode:</strong> Train your ear with audio</li>
            <li className="w-welcome-feature-item">📖 <strong>Grammar:</strong> Study verb conjugations and noun declensions</li>
            <li className="w-welcome-feature-item">📑 <strong>Vocabulary Lists:</strong> Browse and study word collections</li>
          </ul>
        </div>

        <div className="w-welcome-section">
          <h3 className="w-welcome-section-title">What's your Lithuanian level?</h3>
          <div className="w-welcome-options">
            <label className={`w-welcome-option ${selectedLevel === 'beginner' ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="level"
                value="beginner"
                checked={selectedLevel === 'beginner'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-welcome-radio"
              />
              <span>🌱 <strong>Completely new to Lithuanian</strong></span>
            </label>
            
            <label className={`w-welcome-option ${selectedLevel === 'intermediate' ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="level"
                value="intermediate"
                checked={selectedLevel === 'intermediate'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-welcome-radio"
              />
              <span>📚 <strong>Have some skill</strong></span>
            </label>
            
            <label className={`w-welcome-option ${selectedLevel === 'expert' ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="level"
                value="expert"
                checked={selectedLevel === 'expert'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-welcome-radio"
              />
              <span>🎓 <strong>Expert</strong></span>
            </label>
          </div>
        </div>

        <div className="w-welcome-section">
          <h3 className="w-welcome-section-title">Where would you like to store your progress?</h3>
          <div className="w-welcome-options w-welcome-storage-options">
            <label className={`w-welcome-option w-welcome-storage-option ${selectedStorage === STORAGE_MODES.LOCAL ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="storage"
                value={STORAGE_MODES.LOCAL}
                checked={selectedStorage === STORAGE_MODES.LOCAL}
                onChange={(e) => setSelectedStorage(e.target.value)}
                className="w-welcome-radio"
              />
              <div className="w-welcome-storage-content">
                <div className="w-welcome-storage-title">
                  💾 <strong>Local Storage</strong>
                </div>
                <div className="w-welcome-storage-description">
                  Data stored on this device only. Private but doesn't sync between devices.
                </div>
              </div>
            </label>
            
            <label className={`w-welcome-option w-welcome-storage-option ${selectedStorage === STORAGE_MODES.REMOTE ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="storage"
                value={STORAGE_MODES.REMOTE}
                checked={selectedStorage === STORAGE_MODES.REMOTE}
                onChange={(e) => setSelectedStorage(e.target.value)}
                className="w-welcome-radio"
              />
              <div className="w-welcome-storage-content">
                <div className="w-welcome-storage-title">
                  ☁️ <strong>Remote Storage</strong>
                </div>
                <div className="w-welcome-storage-description">
                  Data stored on server. Syncs between devices but requires server connection.
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedLevel || !selectedStorage}
          className={`w-button w-welcome-button ${(!selectedLevel || !selectedStorage) ? 'w-button-disabled' : ''}`}
        >
          Let's Start Learning! 🚀
        </button>

        <div className="w-splash-footer">
          © 2025 Yevaud Platforms LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
