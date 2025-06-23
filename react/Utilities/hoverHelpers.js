
import audioManager from '../Managers/audioManager';

/**
 * Hover utilities for audio preview functionality
 */

/**
 * Creates hover handlers for audio preview
 * @param {boolean} audioEnabled - Whether audio is enabled
 * @returns {Object} Object with handleHoverStart and handleHoverEnd functions
 */
export const createHoverHandlers = (audioEnabled) => {
  let hoverTimeout = null;

  const handleHoverStart = (word) => {
    if (!audioEnabled) return;
    
    const timeout = setTimeout(() => {
      audioManager.playAudio(word, true); // Only play if cached
    }, 900);
    
    hoverTimeout = timeout;
  };

  const handleHoverEnd = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  };

  return {
    handleHoverStart,
    handleHoverEnd
  };
};
