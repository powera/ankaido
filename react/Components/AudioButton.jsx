
import React from 'react';

const AudioButton = ({ word, size = 'normal', audioEnabled, playAudio, asSpan = false }) => {
  // Define styles based on size
  const buttonStyle = {
    fontSize: size === 'small' ? '0.8rem' : size === 'large' ? '1.5rem' : '1rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  // If audio is disabled, show muted icon
  if (!audioEnabled) {
    return (
      <span 
        className="w-audio-button w-audio-disabled"
        title="Audio is disabled in settings"
        style={{
          ...buttonStyle,
          opacity: 0.5
        }}
      >
        🔇
      </span>
    );
  }
  
  const handleAudioClick = async (e) => {
    e.stopPropagation();
    try {
      const success = await playAudio(word);
      if (!success) {
        // Visual feedback for failed audio
        e.target.style.opacity = '0.5';
        setTimeout(() => {
          if (e.target) e.target.style.opacity = '1';
        }, 1000);
      }
    } catch (error) {
      console.warn('Audio button click failed:', error);
    }
  };

  // If asSpan is true, render as span (for use inside buttons)
  if (asSpan) {
    return (
      <span 
        className="w-audio-button"
        onClick={handleAudioClick}
        title="Play pronunciation"
        style={buttonStyle}
      >
        🔊
      </span>
    );
  }
  
  return (
    <button 
      className="w-audio-button"
      onClick={handleAudioClick}
      title="Play pronunciation"
      style={buttonStyle}
    >
      🔊
    </button>
  );
};

export default AudioButton;
