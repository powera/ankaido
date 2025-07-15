import { useState, useEffect, useRef, useCallback } from 'react';

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Custom hook for fullscreen functionality
 * 
 * @returns {UseFullscreenReturn} Object containing:
 *   - isFullscreen: boolean indicating if currently in fullscreen
 *   - toggleFullscreen: function to toggle fullscreen mode
 *   - containerRef: ref to attach to the element that should go fullscreen
 * 
 * @example
 * const MyWidget = () => {
 *   const { isFullscreen, toggleFullscreen, containerRef } = useFullscreen();
 *   
 *   return (
 *     <div ref={containerRef} className={isFullscreen ? 'w-fullscreen' : 'w-container'}>
 *       <button onClick={toggleFullscreen}>
 *         {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
 *       </button>
 *     </div>
 *   );
 * };
 */
export const useFullscreen = (): UseFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen mode
        const element = containerRef.current || document.documentElement;
        
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen mode
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    containerRef
  };
};

export default useFullscreen;