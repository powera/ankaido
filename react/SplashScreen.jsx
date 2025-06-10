import React from 'react';

const SplashScreen = () => {
  return (
    <div className="w-container">
      <div className="w-card" style={{ 
        textAlign: 'center', 
        padding: 'var(--spacing-xlarge, 3rem)',
        marginTop: '20vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '2px solid #dee2e6',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 'var(--spacing-large, 2rem)' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            margin: '0 0 0.5rem 0', 
            color: '#2c3e50',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
            🇱🇹 Trakaido
          </h1>
          <p style={{ 
            fontSize: '1.5rem', 
            margin: '0', 
            color: '#6c757d',
            fontWeight: '300'
          }}>
            Learn Lithuanian
          </p>
        </div>
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

export default SplashScreen;