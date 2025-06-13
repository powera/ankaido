
import React, { useState } from 'react';

const WelcomeScreen = ({ onComplete }) => {
  const [selectedLevel, setSelectedLevel] = useState('');

  const handleContinue = () => {
    if (selectedLevel) {
      onComplete(selectedLevel);
    }
  };

  return (
    <div className="w-container">
      <div className="w-card" style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-xlarge, 3rem)',
        marginTop: '10vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '2px solid #dee2e6',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 'var(--spacing-large, 2rem)' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            margin: '0 0 0.5rem 0', 
            color: '#2c3e50',
            fontWeight: 'bold'
          }}>
            🇱🇹 Welcome to Trakaido!
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            margin: '0 0 2rem 0', 
            color: '#6c757d',
            fontWeight: '300'
          }}>
            Your Lithuanian Learning Companion
          </p>
        </div>

        <div style={{ 
          textAlign: 'left', 
          marginBottom: 'var(--spacing-large, 2rem)',
          padding: '0 1rem'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>What can you do with Trakaido?</h3>
          <ul style={{ 
            fontSize: '1.1rem', 
            lineHeight: '1.6',
            color: '#495057',
            listStyle: 'none',
            padding: 0
          }}>
            <li style={{ marginBottom: '0.5rem' }}>📚 <strong>Flash Cards:</strong> Learn vocabulary with interactive cards</li>
            <li style={{ marginBottom: '0.5rem' }}>✏️ <strong>Multiple Choice:</strong> Test your knowledge with quizzes</li>
            <li style={{ marginBottom: '0.5rem' }}>⌨️ <strong>Typing Practice:</strong> Improve spelling and recall</li>
            <li style={{ marginBottom: '0.5rem' }}>🎧 <strong>Listening Mode:</strong> Train your ear with audio</li>
            <li style={{ marginBottom: '0.5rem' }}>📖 <strong>Grammar:</strong> Study verb conjugations and noun declensions</li>
            <li style={{ marginBottom: '0.5rem' }}>📑 <strong>Vocabulary Lists:</strong> Browse and study word collections</li>
          </ul>
        </div>

        <div style={{ marginBottom: 'var(--spacing-large, 2rem)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>What's your Lithuanian level?</h3>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              border: `2px solid ${selectedLevel === 'beginner' ? '#007bff' : '#dee2e6'}`,
              borderRadius: 'var(--border-radius)',
              background: selectedLevel === 'beginner' ? '#f8f9ff' : 'white',
              width: '300px',
              fontSize: '1.1rem'
            }}>
              <input
                type="radio"
                name="level"
                value="beginner"
                checked={selectedLevel === 'beginner'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ marginRight: '0.75rem' }}
              />
              <span>🌱 <strong>Completely new to Lithuanian</strong></span>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              border: `2px solid ${selectedLevel === 'intermediate' ? '#007bff' : '#dee2e6'}`,
              borderRadius: 'var(--border-radius)',
              background: selectedLevel === 'intermediate' ? '#f8f9ff' : 'white',
              width: '300px',
              fontSize: '1.1rem'
            }}>
              <input
                type="radio"
                name="level"
                value="intermediate"
                checked={selectedLevel === 'intermediate'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ marginRight: '0.75rem' }}
              />
              <span>📚 <strong>Have some skill</strong></span>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              border: `2px solid ${selectedLevel === 'expert' ? '#007bff' : '#dee2e6'}`,
              borderRadius: 'var(--border-radius)',
              background: selectedLevel === 'expert' ? '#f8f9ff' : 'white',
              width: '300px',
              fontSize: '1.1rem'
            }}>
              <input
                type="radio"
                name="level"
                value="expert"
                checked={selectedLevel === 'expert'}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ marginRight: '0.75rem' }}
              />
              <span>🎓 <strong>Expert</strong></span>
            </label>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedLevel}
          className="w-button"
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            background: selectedLevel ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--border-radius)',
            cursor: selectedLevel ? 'pointer' : 'not-allowed',
            minWidth: '200px'
          }}
        >
          Let's Start Learning! 🚀
        </button>

        <div style={{ 
          fontSize: '0.8rem', 
          color: '#adb5bd',
          marginTop: 'var(--spacing-large, 2rem)'
        }}>
          © 2025 Yevaud Platforms LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
