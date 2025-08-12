
import React, { useEffect, useState } from 'react';
import { STORAGE_MODES } from '../Managers/storageConfigManager';

interface UserInfo {
  authenticated: boolean;
  can_save_journey_stats: boolean;
  has_corpus_choice_file?: boolean;
}

interface WelcomeScreenProps {
  onComplete: (storage: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState<boolean>(true);
  const [hasExistingData, setHasExistingData] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/trakaido/userinfo/');
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
          
          // Check if user has existing corpus choice data
          const hasData = data.has_corpus_choice_file === true;
          setHasExistingData(hasData);
          
          // If user has existing data, auto-select remote storage
          if (hasData && data.authenticated && data.can_save_journey_stats) {
            setSelectedStorage(STORAGE_MODES.REMOTE);
          }
        } else {
          setUserInfo({ authenticated: false, can_save_journey_stats: false });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setUserInfo({ authenticated: false, can_save_journey_stats: false });
      } finally {
        setLoadingUserInfo(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleContinue = () => {
    if (selectedStorage) {
      onComplete(selectedStorage);
    }
  };

  const canUseRemoteStorage = userInfo && userInfo.authenticated && userInfo.can_save_journey_stats;

  return (
    <div className="w-container">
      <div className="w-card w-welcome-card">
        <div className="w-welcome-header">
          <h1 className="w-welcome-title">
            📚 Welcome to Ankaido!
          </h1>
          <p className="w-welcome-subtitle">
            The Flashcard App
          </p>
        </div>

        <div className="w-welcome-features">
          <h3 className="w-welcome-features-title">What can you do with Ankaido?</h3>
          <ul className="w-welcome-features-list">
            <li className="w-welcome-feature-item">📚 <strong>Flash Cards:</strong> Learn with interactive cards</li>
            <li className="w-welcome-feature-item">✏️ <strong>Multiple Choice:</strong> Test your knowledge with quizzes</li>
            <li className="w-welcome-feature-item">⌨️ <strong>Typing Practice:</strong> Improve spelling and recall</li>
            <li className="w-welcome-feature-item">🎧 <strong>Listening Mode:</strong> Train your ear with audio</li>

            <li className="w-welcome-feature-item">📑 <strong>Card Collections:</strong> Browse and study card sets</li>
          </ul>
        </div>

        {hasExistingData && (
          <div className="w-welcome-section">
            <div className="w-welcome-existing-data">
              <h3 className="w-welcome-section-title">Welcome back! 👋</h3>
              <p className="w-welcome-existing-message">
                We found your existing learning data on the server. You can continue where you left off!
              </p>
            </div>
          </div>
        )}

        <div className="w-welcome-section">
          <h3 className="w-welcome-section-title">Where would you like to store your progress?</h3>
          {loadingUserInfo && (
            <div className="w-welcome-loading">
              Checking authentication status...
            </div>
          )}
          <div className="w-welcome-options w-welcome-storage-options">
            <label className={`w-welcome-option w-welcome-storage-option ${selectedStorage === STORAGE_MODES.LOCAL ? 'w-welcome-option-selected' : ''}`}>
              <input
                type="radio"
                name="storage"
                value={STORAGE_MODES.LOCAL}
                checked={selectedStorage === STORAGE_MODES.LOCAL}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedStorage(e.target.value)}
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
            
            <label className={`w-welcome-option w-welcome-storage-option ${selectedStorage === STORAGE_MODES.REMOTE ? 'w-welcome-option-selected' : ''} ${!canUseRemoteStorage ? 'w-welcome-option-disabled' : ''}`}>
              <input
                type="radio"
                name="storage"
                value={STORAGE_MODES.REMOTE}
                checked={selectedStorage === STORAGE_MODES.REMOTE}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => canUseRemoteStorage && setSelectedStorage(e.target.value)}
                className="w-welcome-radio"
                disabled={!canUseRemoteStorage}
              />
              <div className="w-welcome-storage-content">
                <div className="w-welcome-storage-title">
                  ☁️ <strong>Remote Storage</strong>
                </div>
                <div className="w-welcome-storage-description">
                  {canUseRemoteStorage ? (
                    "Data stored on server. Syncs between devices but requires server connection."
                  ) : (
                    "You must log in to store data remotely."
                  )}
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedStorage}
          className={`w-button w-welcome-button ${!selectedStorage ? 'w-button-disabled' : ''}`}
        >
          {hasExistingData ? 'Continue Learning! 🚀' : 'Let\'s Start Learning! 🚀'}
        </button>

        <div className="w-splash-footer">
          © 2025 Yevaud Platforms LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
