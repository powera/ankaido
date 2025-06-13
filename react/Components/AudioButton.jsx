
import React from 'react';

const AudioButton = ({ word, size = 'normal', audioEnabled, playAudio }) => {
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
  
  return (
    <button 
      className="w-audio-button"
      onClick={(e) => {
        e.stopPropagation();
        playAudio(word);
      }}
      title="Play pronunciation"
      style={buttonStyle}
    >
      🔊
    </button>
  );
};

export default AudioButton;
