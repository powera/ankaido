import React from 'react';
import { AudioManager } from '../Utilities/types';

// Props interface for AudioButton component
export interface AudioButtonProps {
  word: string;
  size?: 'small' | 'normal' | 'large';
  audioEnabled: boolean;
  playAudio?: (word: string) => Promise<boolean>;
  audioManager?: AudioManager;
  asSpan?: boolean;
}

const AudioButton: React.FC<AudioButtonProps> = ({ 
  word, 
  size = 'normal', 
  audioEnabled, 
  playAudio, 
  audioManager,
  asSpan = false 
}) => {
  // Define styles based on size
  const buttonStyle: React.CSSProperties = {
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
  
  const handleAudioClick = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent any default behavior
    
    // Validate that either playAudio or audioManager is provided
    if (!playAudio && !audioManager) {
      console.warn('AudioButton: Neither playAudio nor audioManager provided');
      return;
    }
    
    try {
      let success = true;
      
      if (audioManager) {
        // Use audioManager.playAudio (returns Promise<void>)
        await audioManager.playAudio(word);
      } else if (playAudio) {
        // Use playAudio function (returns Promise<boolean>)
        success = await playAudio(word);
      }
      
      if (!success) {
        // Visual feedback for failed audio
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
        setTimeout(() => {
          if (target) target.style.opacity = '1';
        }, 1000);
      }
    } catch (error) {
      console.warn('Audio button click failed:', error);
      // Visual feedback for error
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
      setTimeout(() => {
        if (target) target.style.opacity = '1';
      }, 1000);
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